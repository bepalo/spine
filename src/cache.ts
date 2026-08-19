// src/cache.ts

import { inspect } from "node:util";
import { LinkedList, LinkedListNode } from "./linked-list";
import { EvictionReason } from "./types";

export class CacheError extends Error {
  constructor(message?: string, options?: ErrorOptions) {
    super(message, options);
  }
}

export type CacheEntry<K, V> = { key: K; value: V; size: number };

export interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  sets: number;
  gets: number;
  peeks: number;
  checks: number;
  updates: number;
}

export class Cache<K = string, V = unknown> {
  #usedMemory: number = 0;
  #maxMemory?: number;
  #stats: CacheStats;
  #map: Map<K, LinkedListNode<CacheEntry<K, V>>> = new Map();
  #lru: LinkedList<CacheEntry<K, V>> = new LinkedList();
  #onMiss?: (
    key: K,
    entry: CacheEntry<K, V> | undefined,
    cache: Cache<K, V>,
  ) => boolean | void = undefined;
  #onHit?: (key: K, entry: CacheEntry<K, V>, cache: Cache<K, V>) => void =
    undefined;
  #onEvict?: (
    key: K,
    entry: CacheEntry<K, V>,
    reason:
      | EvictionReason.Manual
      | EvictionReason.LRU
      | EvictionReason.Replaced,
    cache: Cache<K, V>,
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

  get stats() {
    return { ...this.#stats };
  }

  resetStats(): void {
    this.#stats.hits = 0;
    this.#stats.misses = 0;
    this.#stats.evictions = 0;
    this.#stats.sets = 0;
    this.#stats.gets = 0;
    this.#stats.peeks = 0;
    this.#stats.checks = 0;
    this.#stats.updates = 0;
  }

  constructor(options?: {
    maxMemory?: number;
    onMiss?: (
      key: K,
      entry: CacheEntry<K, V> | undefined,
      cache: Cache<K, V>,
    ) => boolean | void;
    onHit?: (key: K, entry: CacheEntry<K, V>, cache: Cache<K, V>) => void;
    onEvict?: (
      key: K,
      entry: CacheEntry<K, V>,
      reason:
        | EvictionReason.Manual
        | EvictionReason.LRU
        | EvictionReason.Replaced,
      cache: Cache<K, V>,
    ) => boolean | void;
  }) {
    const { maxMemory, onMiss, onHit, onEvict } =
      options ?? Object.create(null);
    if (!Number.isFinite(maxMemory) || maxMemory <= 0) {
      throw new CacheError("Invalid Cache option value for maxMemory");
    }
    this.#maxMemory = maxMemory;
    this.#onHit = onHit;
    this.#onMiss = onMiss;
    this.#onEvict = onEvict;
    this.#stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      sets: 0,
      gets: 0,
      peeks: 0,
      checks: 0,
      updates: 0,
    };
  }

  has(key: K): boolean {
    this.#stats.checks++;
    const node = this.#map.get(key);
    if (node === undefined) return false;
    return true;
  }

  peek(key: K): V | undefined {
    this.#stats.peeks++;
    const node = this.#map.get(key);
    return node?.data.value;
  }

  get(key: K): V | undefined {
    this.#stats.gets++;
    const node = this.#map.get(key);
    if (node !== undefined) {
      const {
        data: { key, value, size },
      } = node;
      this.#stats.hits++;
      this.#lru.moveToStart(node);
      this.#onHit?.(key, node.data, this);
      return value;
    }
    this.#stats.misses++;
    const getAgain = this.#onMiss?.(key, undefined, this);
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
    return undefined;
  }

  set(key: K, value: V, size: number): Cache<K, V> {
    // check if size is within bounds
    if (!Number.isFinite(size) || size < 0) {
      throw new CacheError("Invalid Cache entry size");
    }
    if (this.#maxMemory !== undefined && size > this.#maxMemory) {
      throw new CacheError("Cache size overflow");
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
    const node = this.#lru.insertStart({ key, value, size });
    this.#map.set(key, node);
    this.#usedMemory += size;
    return this;
  }

  update(key: K, value: V, size: number) {
    if (!Number.isFinite(size) || size < 0) {
      throw new CacheError("Invalid Cache entry size");
    }
    this.#stats.updates++;
    const node = this.#map.get(key);
    if (node !== undefined) {
      const prevSize = node.data.size;
      if (this.#maxMemory !== undefined && size > this.#maxMemory) {
        throw new CacheError("Cache size overflow");
      }
      const newMemoryUsage = this.#usedMemory + size - prevSize;
      if (this.#maxMemory !== undefined && newMemoryUsage > this.#maxMemory) {
        const requiredSize = newMemoryUsage - this.#maxMemory;
        this.#freeMemoryLRUInternal(requiredSize, node);
      } else {
        this.#lru.moveToStart(node);
      }
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

  clear() {
    this.#map.clear();
    this.#lru.clear();
    this.#usedMemory = 0;
  }

  freeMemoryLRU(requiredSize: number): number {
    if (!Number.isFinite(requiredSize) || requiredSize <= 0) {
      throw new CacheError("Invalid Cache size");
    }
    if (this.#maxMemory !== undefined) {
      if (requiredSize > this.#maxMemory) {
        throw new CacheError("Cache size overflow");
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
    forNode?: LinkedListNode<CacheEntry<K, V>>,
  ): number {
    let truncSize = 0;
    let node = this.#lru.last;
    let i = 0;
    for (; node !== undefined; node = node.prev) {
      const { key, size } = node.data;
      if (node === forNode) {
        continue;
      }
      this.#stats.evictions++;
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

  *[Symbol.iterator](): IterableIterator<[K, V, number]> {
    for (let node = this.#lru.first; node !== undefined; node = node.next) {
      const { key, value, size } = node.data;
      yield [key, value, size];
    }
  }

  *entries(): IterableIterator<[K, V, number]> {
    for (let node = this.#lru.first; node !== undefined; node = node.next) {
      const { key, value, size } = node.data;
      yield [key, value, size];
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

  [inspect.custom](depth: number, options: Parameters<typeof inspect>[1]) {
    return {
      size: this.size,
      usedMemory: this.#usedMemory,
      maxMemory: this.#maxMemory,
      entries: [...this],
    };
  }

  toJSON(): Record<string, { value: V; size: number }> {
    const rec: Record<string, { value: V; size: number }> = {};
    for (let node = this.#lru.first; node !== undefined; node = node.next) {
      const { value, size } = node.data;
      rec[String(node.data.key)] = { value, size };
    }
    return rec;
  }

  async forEach(
    callback: (value: V, size: number, key: K) => Promise<void> | void,
  ): Promise<Cache<K, V>> {
    for (let node = this.#lru.first; node !== undefined; node = node.next) {
      const { value, size, key } = node.data;
      await callback(value, size, key);
    }
    return this;
  }

  forEachSync(callback: (value: V, size: number, key: K) => void): Cache<K, V> {
    for (let node = this.#lru.first; node !== undefined; node = node.next) {
      const { value, size, key } = node.data;
      callback(value, size, key);
    }
    return this;
  }
}
