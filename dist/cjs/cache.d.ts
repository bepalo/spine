import { inspect } from "node:util";
import { EvictionReason } from "./types";
export declare class CacheError extends Error {
    constructor(message?: string, options?: ErrorOptions);
}
export type CacheEntry<K, V> = {
    key: K;
    value: V;
    size: number;
};
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
export declare class Cache<K = string, V = unknown> {
    #private;
    get size(): number;
    get usedMemory(): number;
    get maxMemory(): number | undefined;
    get stats(): {
        hits: number;
        misses: number;
        evictions: number;
        sets: number;
        gets: number;
        peeks: number;
        checks: number;
        updates: number;
    };
    resetStats(): void;
    constructor(options?: {
        maxMemory?: number;
        onMiss?: (key: K, entry: CacheEntry<K, V> | undefined, cache: Cache<K, V>) => boolean | void;
        onHit?: (key: K, entry: CacheEntry<K, V>, cache: Cache<K, V>) => void;
        onEvict?: (key: K, entry: CacheEntry<K, V>, reason: EvictionReason.Manual | EvictionReason.LRU | EvictionReason.Replaced, cache: Cache<K, V>) => boolean | void;
    });
    has(key: K): boolean;
    peek(key: K): V | undefined;
    get(key: K): V | undefined;
    set(key: K, value: V, size: number): Cache<K, V>;
    update(key: K, value: V, size: number): V | undefined;
    delete(key: K): V | undefined;
    evictLRU(count: number): number;
    evictMRU(count: number): number;
    evictAll(): number;
    clear(): void;
    freeMemoryLRU(requiredSize: number): number;
    [Symbol.iterator](): IterableIterator<[K, V, number]>;
    entries(): IterableIterator<[K, V, number]>;
    keys(): IterableIterator<K>;
    values(): IterableIterator<V>;
    sizes(): IterableIterator<number>;
    [inspect.custom](depth: number, options: Parameters<typeof inspect>[1]): {
        size: number;
        usedMemory: number;
        maxMemory: number | undefined;
        entries: [K, V, number][];
    };
    toJSON(): Record<string, {
        value: V;
        size: number;
    }>;
    forEach(callback: (value: V, size: number, key: K) => Promise<void> | void): Promise<Cache<K, V>>;
    forEachSync(callback: (value: V, size: number, key: K) => void): Cache<K, V>;
}
//# sourceMappingURL=cache.d.ts.map