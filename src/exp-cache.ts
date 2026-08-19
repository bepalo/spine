// src/exp-cache.ts

import { inspect } from "node:util";
import { LinkedList, LinkedListNode } from "./linked-list";
import { EvictionReason, MissReason } from "./types";

export class ExpCacheError extends Error {
  constructor(message?: string, options?: ErrorOptions) {
    super(message, options);
  }
}

export type ExpCacheEntry<K, V> = {
  key: K;
  value: V;
  size: number;
  exp?: number;
};

export interface ExpCacheStats {
  hits: number;
  misses: number;
  evictions: number;
  sets: number;
  gets: number;
  staleGets: number;
  peeks: number;
  checks: number;
  updates: number;
  expiryUpdates: number;
}

export class ExpCache<K = string, V = unknown> {
  #usedMemory: number = 0;
  #maxMemory?: number;
  #defaultTTL?: number;
  #stats: ExpCacheStats;
  #now: () => number;
  #map: Map<K, LinkedListNode<ExpCacheEntry<K, V>>> = new Map();
  #lru: LinkedList<ExpCacheEntry<K, V>> = new LinkedList();
  #onMiss?: (
    key: K,
    entry: ExpCacheEntry<K, V> | undefined,
    reason: MissReason.Miss | MissReason.Expired,
    cache: ExpCache<K, V>,
  ) => boolean | void = undefined;
  #onHit?: (key: K, entry: ExpCacheEntry<K, V>, cache: ExpCache<K, V>) => void =
    undefined;
  #onEvict?: (
    key: K,
    entry: ExpCacheEntry<K, V>,
    reason:
      | EvictionReason.Manual
      | EvictionReason.LRU
      | EvictionReason.Replaced
      | EvictionReason.Expired,
    cache: ExpCache<K, V>,
  ) => boolean | void;

  get size() {
    return this.#lru.size;
  }

  get usedMemory() {
    return this.#usedMemory;
  }

  get maxMemory() {
    return this.#maxMemory;
  }

  get defaultTTL() {
    return this.#defaultTTL;
  }

  get stats() {
    return { ...this.#stats };
  }

  resetStats(): void {
    this.#stats.hits = 0;
    this.#stats.misses = 0;
    this.#stats.evictions = 0;
    this.#stats.sets = 0;
    this.#stats.gets = 0;
    this.#stats.staleGets = 0;
    this.#stats.peeks = 0;
    this.#stats.checks = 0;
    this.#stats.updates = 0;
    this.#stats.expiryUpdates = 0;
  }

  now() {
    return this.#now();
  }

  ttl(ttl: number) {
    return this.#now() + ttl;
  }

  constructor(options?: {
    maxMemory?: number;
    defaultTTL?: number;
    onMiss?: (
      key: K,
      entry: ExpCacheEntry<K, V> | undefined,
      reason: MissReason.Miss | MissReason.Expired,
      cache: ExpCache<K, V>,
    ) => boolean | void;
    onHit?: (key: K, entry: ExpCacheEntry<K, V>, cache: ExpCache<K, V>) => void;
    onEvict?: (
      key: K,
      entry: ExpCacheEntry<K, V>,
      reason:
        | EvictionReason.Manual
        | EvictionReason.LRU
        | EvictionReason.Replaced
        | EvictionReason.Expired,
      cache: ExpCache<K, V>,
    ) => boolean | void;
    now?: () => number;
  }) {
    const {
      maxMemory,
      defaultTTL,
      onMiss,
      onHit,
      onEvict,
      now = Date.now,
    } = options ?? Object.create(null);
    if (!Number.isFinite(maxMemory) || maxMemory <= 0) {
      throw new ExpCacheError("Invalid ExpCache option value for maxMemory");
    }
    if (
      (defaultTTL !== undefined && !Number.isFinite(defaultTTL)) ||
      defaultTTL <= 0
    ) {
      throw new ExpCacheError("Invalid ExpCache option value for defaultTTL");
    }
    this.#maxMemory = maxMemory;
    this.#defaultTTL = defaultTTL;
    this.#onHit = onHit;
    this.#onMiss = onMiss;
    this.#onEvict = onEvict;
    this.#now = now;
    this.#stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      sets: 0,
      gets: 0,
      staleGets: 0,
      peeks: 0,
      checks: 0,
      updates: 0,
      expiryUpdates: 0,
    };
  }

  has(key: K): boolean {
    this.#stats.checks++;
    const node = this.#map.get(key);
    if (node === undefined) {
      return false;
    }
    const {
      data: { exp },
    } = node;
    if (exp !== undefined && exp <= this.#now()) {
      return false;
    }
    return true;
  }

  hasIncludeExpired(key: K): boolean {
    this.#stats.checks++;
    const node = this.#map.get(key);
    return node !== undefined;
  }

  peek(key: K): V | undefined {
    this.#stats.peeks++;
    const node = this.#map.get(key);
    if (node === undefined) {
      return undefined;
    }
    const {
      data: { exp },
    } = node;
    if (exp !== undefined && exp <= this.#now()) {
      return undefined;
    }
    return node.data.value;
  }

  peekIncludeExpired(key: K): V | undefined {
    this.#stats.peeks++;
    const node = this.#map.get(key);
    return node?.data.value;
  }

  get(key: K): V | undefined {
    this.#stats.gets++;
    const node = this.#map.get(key);
    if (node !== undefined) {
      const {
        data: { key, value, size, exp },
      } = node;
      if (exp !== undefined && exp <= this.#now()) {
        this.#stats.staleGets++;
        if (this.#onMiss !== undefined) {
          const getAgain = this.#onMiss(
            key,
            node.data,
            MissReason.Expired,
            this,
          );
          const currentNode = this.#map.get(key);
          if (getAgain && currentNode === node) {
            this.#stats.hits++;
            this.#lru.moveToStart(node);
            this.#onHit?.(key, currentNode.data, this);
            return currentNode.data.value;
          }
          if (currentNode !== node) {
            return undefined;
          }
        }
        this.#stats.evictions++;
        this.#map.delete(key);
        this.#lru.remove(node);
        this.#usedMemory -= size;
        this.#onEvict?.(key, node.data, EvictionReason.Expired, this);
        return undefined;
      }
      this.#stats.hits++;
      this.#lru.moveToStart(node);
      this.#onHit?.(key, node.data, this);
      return value;
    }
    this.#stats.misses++;
    if (this.#onMiss !== undefined) {
      const getAgain = this.#onMiss(key, undefined, MissReason.Miss, this);
      if (getAgain) {
        const node = this.#map.get(key);
        if (node !== undefined) {
          this.#stats.hits++;
          this.#lru.moveToStart(node);
          this.#onHit?.(key, node.data, this);
          return node.data.value;
        } else {
          return undefined;
        }
      }
    }
    return undefined;
  }

  getIncludeExpired(key: K): V | undefined {
    this.#stats.gets++;
    const node = this.#map.get(key);
    if (node !== undefined) {
      const { data } = node;
      this.#stats.hits++;
      this.#lru.moveToStart(node);
      this.#onHit?.(key, data, this);
      return data.value;
    }
    this.#stats.misses++;
    if (this.#onMiss !== undefined) {
      const getAgain = this.#onMiss(key, undefined, MissReason.Miss, this);
      if (getAgain) {
        const node = this.#map.get(key);
        if (node !== undefined) {
          this.#stats.hits++;
          this.#lru.moveToStart(node);
          this.#onHit?.(key, node.data, this);
          return node.data.value;
        } else {
          return undefined;
        }
      }
    }
    return undefined;
  }

  set(
    key: K,
    value: V,
    size: number,
    expiry?: { exp: number } | { ttl: number },
  ): ExpCache<K, V> {
    // check if size is within bounds
    if (!Number.isFinite(size) || size < 0) {
      throw new ExpCacheError("Invalid ExpCache entry size");
    }
    if (this.#maxMemory !== undefined && size > this.#maxMemory) {
      throw new ExpCacheError("ExpCache size overflow");
    }
    this.#stats.sets++;
    // remove existing node
    const existingNode = this.#map.get(key);
    if (existingNode !== undefined) {
      this.#stats.evictions++;
      this.#map.delete(key);
      this.#lru.remove(existingNode);
      this.#usedMemory -= existingNode.data.size;
      this.#onEvict?.(key, existingNode.data, EvictionReason.Replaced, this);
    }
    // check available memory
    // evict least-recently-used if overflown
    const newMemoryUsage = this.#usedMemory + size;
    if (this.#maxMemory !== undefined && newMemoryUsage > this.#maxMemory) {
      const requiredSize = newMemoryUsage - this.#maxMemory;
      this.#freeMemoryLRUInternal(requiredSize);
    }
    // insert new node
    const exp =
      expiry !== undefined
        ? (expiry as { ttl: number }).ttl !== undefined
          ? this.#now() + (expiry as { ttl: number }).ttl
          : (expiry as { exp: number }).exp
        : this.#defaultTTL !== undefined
          ? this.#now() + this.#defaultTTL
          : undefined;
    if (exp !== undefined && !Number.isFinite(exp)) {
      throw new ExpCacheError("Invalid ExpCache value for exp");
    }
    const node = this.#lru.insertStart({ key, value, size, exp });
    this.#map.set(key, node);
    this.#usedMemory += size;
    return this;
  }

  updateExpiry(key: K, expiry?: { exp: number } | { ttl: number }) {
    this.#stats.expiryUpdates++;
    const node = this.#map.get(key);
    if (node !== undefined) {
      const exp =
        expiry !== undefined
          ? (expiry as { ttl: number }).ttl !== undefined
            ? this.#now() + (expiry as { ttl: number }).ttl
            : (expiry as { exp: number }).exp
          : this.#defaultTTL !== undefined
            ? this.#now() + this.#defaultTTL
            : undefined;
      if (exp !== undefined && !Number.isFinite(exp)) {
        throw new ExpCacheError("Invalid ExpCache value for exp");
      }
      node.data.exp = exp;
      this.#lru.moveToStart(node);
      return node.data.exp;
    }
    return undefined;
  }

  update(
    key: K,
    value: V,
    size: number,
    expiry?: { exp: number } | { ttl: number },
  ) {
    if (!Number.isFinite(size) || size < 0) {
      throw new ExpCacheError("Invalid ExpCache entry size");
    }
    this.#stats.updates++;
    const node = this.#map.get(key);
    if (node !== undefined) {
      const prevSize = node.data.size;
      if (this.#maxMemory !== undefined && size > this.#maxMemory) {
        throw new ExpCacheError("ExpCache size overflow");
      }
      const newMemoryUsage = this.#usedMemory + size - prevSize;
      if (this.#maxMemory !== undefined && newMemoryUsage > this.#maxMemory) {
        const requiredSize = newMemoryUsage - this.#maxMemory;
        this.#freeMemoryLRUInternal(requiredSize, node);
      } else {
        this.#lru.moveToStart(node);
      }
      const exp =
        expiry !== undefined
          ? (expiry as { ttl: number }).ttl !== undefined
            ? this.#now() + (expiry as { ttl: number }).ttl
            : (expiry as { exp: number }).exp
          : this.#defaultTTL !== undefined
            ? this.#now() + this.#defaultTTL
            : undefined;
      if (exp !== undefined && !Number.isFinite(exp)) {
        throw new ExpCacheError("Invalid ExpCache value for exp");
      }
      if (exp !== undefined) {
        this.#stats.expiryUpdates++;
      }
      node.data.exp = exp;
      node.data.value = value;
      node.data.size = size;
      this.#usedMemory += size - prevSize;
      return node.data.value;
    }
    return undefined;
  }

  delete(key: K): V | undefined {
    const node = this.#map.get(key);
    if (node !== undefined) {
      this.#stats.evictions++;
      this.#map.delete(key);
      this.#lru.remove(node);
      this.#usedMemory -= node.data.size;
      this.#onEvict?.(key, node.data, EvictionReason.Manual, this);
      return node.data.value;
    }
    return undefined;
  }

  evictLRU(count: number): number {
    let node = this.#lru.last;
    let i = 0;
    for (; node !== undefined && i < count; node = node.prev, i++) {
      this.#stats.evictions++;
      const { key, size } = node.data;
      this.#map.delete(key);
      this.#usedMemory -= size;
      this.#onEvict?.(key, node.data, EvictionReason.Manual, this);
    }
    if (node == undefined) {
      // clear all
      this.#lru.clear();
    } else {
      this.#lru.cutEnd(node, i);
    }
    return i;
  }

  evictMRU(count: number): number {
    let node = this.#lru.first;
    let i = 0;
    for (; node !== undefined && i < count; node = node.next, i++) {
      this.#stats.evictions++;
      const { key, size } = node.data;
      this.#map.delete(key);
      this.#usedMemory -= size;
      this.#onEvict?.(key, node.data, EvictionReason.Manual, this);
    }
    if (node == undefined) {
      // clear all
      this.#lru.clear();
    } else {
      this.#lru.cutStart(node, i);
    }
    return i;
  }

  evictAll(): number {
    let node = this.#lru.last;
    let i = 0;
    for (; node !== undefined; i++) {
      this.#stats.evictions++;
      const { prev, data } = node;
      const { key, size } = data;
      this.#map.delete(key);
      this.#usedMemory -= size;
      this.#onEvict?.(key, data, EvictionReason.Manual, this);
      node = prev;
    }
    this.#lru.clear();
    this.#map.clear();
    this.#usedMemory = 0;
    return i;
  }

  evictExpired(): number {
    const now = this.#now();
    let i = 0;
    for (let node = this.#lru.last; node !== undefined; ) {
      const { prev, data } = node;
      const { key, exp, size } = data;
      if (exp !== undefined && exp <= now) {
        i++;
        this.#stats.evictions++;
        this.#map.delete(key);
        this.#lru.remove(node);
        this.#usedMemory -= size;
        this.#onEvict?.(key, data, EvictionReason.Expired, this);
      }
      node = prev;
    }
    return i;
  }

  clear() {
    this.#map.clear();
    this.#lru.clear();
    this.#usedMemory = 0;
  }

  freeMemoryLRU(requiredSize: number): number {
    if (!Number.isFinite(requiredSize) || requiredSize <= 0) {
      throw new ExpCacheError("Invalid ExpCache size");
    }
    if (this.#maxMemory !== undefined) {
      if (requiredSize > this.#maxMemory) {
        throw new ExpCacheError("ExpCache size overflow");
      }
    }
    let truncSize = 0;
    let node = this.#lru.last;
    let i = 0;
    for (; node !== undefined; node = node.prev, i++) {
      this.#stats.evictions++;
      const { key, size } = node.data;
      truncSize += size;
      this.#map.delete(key);
      this.#onEvict?.(key, node.data, EvictionReason.LRU, this);
      if (truncSize >= requiredSize) {
        break;
      }
    }
    if (node !== undefined) {
      this.#lru.cutLeft(node, i + 1);
      this.#usedMemory -= truncSize;
    } else {
      this.#map.clear();
      this.#lru.clear();
      this.#usedMemory = 0;
    }
    return truncSize;
  }

  #freeMemoryLRUInternal(
    requiredSize: number,
    forNode?: LinkedListNode<ExpCacheEntry<K, V>>,
  ): number {
    let truncSize = 0;
    let node = this.#lru.last;
    let i = 0;
    for (; node !== undefined; node = node.prev) {
      if (node === forNode) {
        continue;
      }
      this.#stats.evictions++;
      const { key, size } = node.data;
      truncSize += size;
      this.#map.delete(key);
      this.#onEvict?.(key, node.data, EvictionReason.LRU, this);
      if (truncSize >= requiredSize) {
        break;
      }
      i++;
    }
    if (forNode !== undefined) {
      this.#lru.moveToStart(forNode);
    }
    if (node !== undefined) {
      this.#lru.cutLeft(node, i + 1);
      this.#usedMemory -= truncSize;
    } else if (forNode === undefined) {
      this.#map.clear();
      this.#lru.clear();
      this.#usedMemory = 0;
    }
    return truncSize;
  }

  *[Symbol.iterator](): IterableIterator<[K, V, number, number | undefined]> {
    for (let node = this.#lru.first; node !== undefined; node = node.next) {
      const { key, value, size, exp } = node.data;
      yield [key, value, size, exp];
    }
  }

  *entries(): IterableIterator<[K, V, number, number | undefined]> {
    for (let node = this.#lru.first; node !== undefined; node = node.next) {
      const { key, value, size, exp } = node.data;
      yield [key, value, size, exp];
    }
  }

  *keys(): IterableIterator<K> {
    for (let node = this.#lru.first; node !== undefined; node = node.next) {
      yield node.data.key;
    }
  }

  *values(): IterableIterator<V> {
    for (let node = this.#lru.first; node !== undefined; node = node.next) {
      yield node.data.value;
    }
  }

  *sizes(): IterableIterator<number> {
    for (let node = this.#lru.first; node !== undefined; node = node.next) {
      yield node.data.size;
    }
  }

  *exps(): IterableIterator<number | undefined> {
    for (let node = this.#lru.first; node !== undefined; node = node.next) {
      yield node.data.exp;
    }
  }

  [inspect.custom](depth: number, options: Parameters<typeof inspect>[1]) {
    return {
      size: this.size,
      usedMemory: this.#usedMemory,
      maxMemory: this.#maxMemory,
      entries: [...this],
    };
  }

  toJSON(): Record<string, { value: V; size: number; exp: number | null }> {
    const rec: Record<string, { value: V; size: number; exp: number | null }> =
      {};
    for (let node = this.#lru.first; node !== undefined; node = node.next) {
      const { value, size, exp } = node.data;
      rec[String(node.data.key)] = { value, size, exp: exp ?? null };
    }
    return rec;
  }

  async forEach(
    callback: (
      value: V,
      size: number,
      exp: number | undefined,
      key: K,
    ) => Promise<void> | void,
  ): Promise<ExpCache<K, V>> {
    for (let node = this.#lru.first; node !== undefined; node = node.next) {
      const { value, size, exp, key } = node.data;
      await callback(value, size, exp, key);
    }
    return this;
  }

  forEachSync(
    callback: (value: V, size: number, exp: number | undefined, key: K) => void,
  ): ExpCache<K, V> {
    for (let node = this.#lru.first; node !== undefined; node = node.next) {
      const { value, size, exp, key } = node.data;
      callback(value, size, exp, key);
    }
    return this;
  }
}
