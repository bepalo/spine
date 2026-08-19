import { inspect } from "node:util";
import { EvictionReason, MissReason } from "./types";
export declare class ExpCacheError extends Error {
    constructor(message?: string, options?: ErrorOptions);
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
export declare class ExpCache<K = string, V = unknown> {
    #private;
    get size(): number;
    get usedMemory(): number;
    get maxMemory(): number | undefined;
    get defaultTTL(): number | undefined;
    get stats(): {
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
    };
    resetStats(): void;
    now(): number;
    ttl(ttl: number): number;
    constructor(options?: {
        maxMemory?: number;
        defaultTTL?: number;
        onMiss?: (key: K, entry: ExpCacheEntry<K, V> | undefined, reason: MissReason.Miss | MissReason.Expired, cache: ExpCache<K, V>) => boolean | void;
        onHit?: (key: K, entry: ExpCacheEntry<K, V>, cache: ExpCache<K, V>) => void;
        onEvict?: (key: K, entry: ExpCacheEntry<K, V>, reason: EvictionReason.Manual | EvictionReason.LRU | EvictionReason.Replaced | EvictionReason.Expired, cache: ExpCache<K, V>) => boolean | void;
        now?: () => number;
    });
    has(key: K): boolean;
    hasIncludeExpired(key: K): boolean;
    peek(key: K): V | undefined;
    peekIncludeExpired(key: K): V | undefined;
    get(key: K): V | undefined;
    getIncludeExpired(key: K): V | undefined;
    set(key: K, value: V, size: number, expiry?: {
        exp: number;
    } | {
        ttl: number;
    }): ExpCache<K, V>;
    updateExpiry(key: K, expiry?: {
        exp: number;
    } | {
        ttl: number;
    }): number | undefined;
    update(key: K, value: V, size: number, expiry?: {
        exp: number;
    } | {
        ttl: number;
    }): V | undefined;
    delete(key: K): V | undefined;
    evictLRU(count: number): number;
    evictMRU(count: number): number;
    evictAll(): number;
    evictExpired(): number;
    clear(): void;
    freeMemoryLRU(requiredSize: number): number;
    [Symbol.iterator](): IterableIterator<[K, V, number, number | undefined]>;
    entries(): IterableIterator<[K, V, number, number | undefined]>;
    keys(): IterableIterator<K>;
    values(): IterableIterator<V>;
    sizes(): IterableIterator<number>;
    exps(): IterableIterator<number | undefined>;
    [inspect.custom](depth: number, options: Parameters<typeof inspect>[1]): {
        size: number;
        usedMemory: number;
        maxMemory: number | undefined;
        entries: [K, V, number, number | undefined][];
    };
    toJSON(): Record<string, {
        value: V;
        size: number;
        exp: number | null;
    }>;
    forEach(callback: (value: V, size: number, exp: number | undefined, key: K) => Promise<void> | void): Promise<ExpCache<K, V>>;
    forEachSync(callback: (value: V, size: number, exp: number | undefined, key: K) => void): ExpCache<K, V>;
}
//# sourceMappingURL=exp-cache.d.ts.map