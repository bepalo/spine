"use strict";
// src/cache.ts
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var _Cache_instances, _Cache_usedMemory, _Cache_maxMemory, _Cache_stats, _Cache_map, _Cache_lru, _Cache_onMiss, _Cache_onHit, _Cache_onEvict, _Cache_freeMemoryLRUInternal;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Cache = exports.CacheError = void 0;
const node_util_1 = require("node:util");
const linked_list_1 = require("./linked-list");
const types_1 = require("./types");
class CacheError extends Error {
    constructor(message, options) {
        super(message, options);
    }
}
exports.CacheError = CacheError;
class Cache {
    get size() {
        return __classPrivateFieldGet(this, _Cache_lru, "f").size;
    }
    get usedMemory() {
        return __classPrivateFieldGet(this, _Cache_usedMemory, "f");
    }
    get maxMemory() {
        return __classPrivateFieldGet(this, _Cache_maxMemory, "f");
    }
    get stats() {
        return Object.assign({}, __classPrivateFieldGet(this, _Cache_stats, "f"));
    }
    resetStats() {
        __classPrivateFieldGet(this, _Cache_stats, "f").hits = 0;
        __classPrivateFieldGet(this, _Cache_stats, "f").misses = 0;
        __classPrivateFieldGet(this, _Cache_stats, "f").evictions = 0;
        __classPrivateFieldGet(this, _Cache_stats, "f").sets = 0;
        __classPrivateFieldGet(this, _Cache_stats, "f").gets = 0;
        __classPrivateFieldGet(this, _Cache_stats, "f").peeks = 0;
        __classPrivateFieldGet(this, _Cache_stats, "f").checks = 0;
        __classPrivateFieldGet(this, _Cache_stats, "f").updates = 0;
    }
    constructor(options) {
        _Cache_instances.add(this);
        _Cache_usedMemory.set(this, 0);
        _Cache_maxMemory.set(this, void 0);
        _Cache_stats.set(this, void 0);
        _Cache_map.set(this, new Map());
        _Cache_lru.set(this, new linked_list_1.LinkedList());
        _Cache_onMiss.set(this, undefined);
        _Cache_onHit.set(this, undefined);
        _Cache_onEvict.set(this, void 0);
        const { maxMemory, onMiss, onHit, onEvict } = options !== null && options !== void 0 ? options : Object.create(null);
        if (!Number.isFinite(maxMemory) || maxMemory <= 0) {
            throw new CacheError("Invalid Cache option value for maxMemory");
        }
        __classPrivateFieldSet(this, _Cache_maxMemory, maxMemory, "f");
        __classPrivateFieldSet(this, _Cache_onHit, onHit, "f");
        __classPrivateFieldSet(this, _Cache_onMiss, onMiss, "f");
        __classPrivateFieldSet(this, _Cache_onEvict, onEvict, "f");
        __classPrivateFieldSet(this, _Cache_stats, {
            hits: 0,
            misses: 0,
            evictions: 0,
            sets: 0,
            gets: 0,
            peeks: 0,
            checks: 0,
            updates: 0,
        }, "f");
    }
    has(key) {
        __classPrivateFieldGet(this, _Cache_stats, "f").checks++;
        const node = __classPrivateFieldGet(this, _Cache_map, "f").get(key);
        if (node === undefined)
            return false;
        return true;
    }
    peek(key) {
        __classPrivateFieldGet(this, _Cache_stats, "f").peeks++;
        const node = __classPrivateFieldGet(this, _Cache_map, "f").get(key);
        return node === null || node === void 0 ? void 0 : node.data.value;
    }
    get(key) {
        var _a, _b, _c;
        __classPrivateFieldGet(this, _Cache_stats, "f").gets++;
        const node = __classPrivateFieldGet(this, _Cache_map, "f").get(key);
        if (node !== undefined) {
            const { data: { key, value, size }, } = node;
            __classPrivateFieldGet(this, _Cache_stats, "f").hits++;
            __classPrivateFieldGet(this, _Cache_lru, "f").moveToStart(node);
            (_a = __classPrivateFieldGet(this, _Cache_onHit, "f")) === null || _a === void 0 ? void 0 : _a.call(this, key, node.data, this);
            return value;
        }
        __classPrivateFieldGet(this, _Cache_stats, "f").misses++;
        const getAgain = (_b = __classPrivateFieldGet(this, _Cache_onMiss, "f")) === null || _b === void 0 ? void 0 : _b.call(this, key, undefined, this);
        if (getAgain) {
            const node = __classPrivateFieldGet(this, _Cache_map, "f").get(key);
            if (node !== undefined) {
                __classPrivateFieldGet(this, _Cache_stats, "f").hits++;
                __classPrivateFieldGet(this, _Cache_lru, "f").moveToStart(node);
                (_c = __classPrivateFieldGet(this, _Cache_onHit, "f")) === null || _c === void 0 ? void 0 : _c.call(this, key, node.data, this);
                return node.data.value;
            }
            else {
                return undefined;
            }
        }
        return undefined;
    }
    set(key, value, size) {
        var _a;
        // check if size is within bounds
        if (!Number.isFinite(size) || size < 0) {
            throw new CacheError("Invalid Cache entry size");
        }
        if (__classPrivateFieldGet(this, _Cache_maxMemory, "f") !== undefined && size > __classPrivateFieldGet(this, _Cache_maxMemory, "f")) {
            throw new CacheError("Cache size overflow");
        }
        __classPrivateFieldGet(this, _Cache_stats, "f").sets++;
        // remove existing node
        const existingNode = __classPrivateFieldGet(this, _Cache_map, "f").get(key);
        if (existingNode !== undefined) {
            __classPrivateFieldGet(this, _Cache_stats, "f").evictions++;
            __classPrivateFieldGet(this, _Cache_map, "f").delete(key);
            __classPrivateFieldGet(this, _Cache_lru, "f").remove(existingNode);
            __classPrivateFieldSet(this, _Cache_usedMemory, __classPrivateFieldGet(this, _Cache_usedMemory, "f") - existingNode.data.size, "f");
            (_a = __classPrivateFieldGet(this, _Cache_onEvict, "f")) === null || _a === void 0 ? void 0 : _a.call(this, key, existingNode.data, types_1.EvictionReason.Replaced, this);
        }
        // check available memory
        // evict least-recently-used if overflown
        const newMemoryUsage = __classPrivateFieldGet(this, _Cache_usedMemory, "f") + size;
        if (__classPrivateFieldGet(this, _Cache_maxMemory, "f") !== undefined && newMemoryUsage > __classPrivateFieldGet(this, _Cache_maxMemory, "f")) {
            const requiredSize = newMemoryUsage - __classPrivateFieldGet(this, _Cache_maxMemory, "f");
            __classPrivateFieldGet(this, _Cache_instances, "m", _Cache_freeMemoryLRUInternal).call(this, requiredSize);
        }
        // insert new node
        const node = __classPrivateFieldGet(this, _Cache_lru, "f").insertStart({ key, value, size });
        __classPrivateFieldGet(this, _Cache_map, "f").set(key, node);
        __classPrivateFieldSet(this, _Cache_usedMemory, __classPrivateFieldGet(this, _Cache_usedMemory, "f") + size, "f");
        return this;
    }
    update(key, value, size) {
        if (!Number.isFinite(size) || size < 0) {
            throw new CacheError("Invalid Cache entry size");
        }
        __classPrivateFieldGet(this, _Cache_stats, "f").updates++;
        const node = __classPrivateFieldGet(this, _Cache_map, "f").get(key);
        if (node !== undefined) {
            const prevSize = node.data.size;
            if (__classPrivateFieldGet(this, _Cache_maxMemory, "f") !== undefined && size > __classPrivateFieldGet(this, _Cache_maxMemory, "f")) {
                throw new CacheError("Cache size overflow");
            }
            const newMemoryUsage = __classPrivateFieldGet(this, _Cache_usedMemory, "f") + size - prevSize;
            if (__classPrivateFieldGet(this, _Cache_maxMemory, "f") !== undefined && newMemoryUsage > __classPrivateFieldGet(this, _Cache_maxMemory, "f")) {
                const requiredSize = newMemoryUsage - __classPrivateFieldGet(this, _Cache_maxMemory, "f");
                __classPrivateFieldGet(this, _Cache_instances, "m", _Cache_freeMemoryLRUInternal).call(this, requiredSize, node);
            }
            else {
                __classPrivateFieldGet(this, _Cache_lru, "f").moveToStart(node);
            }
            node.data.value = value;
            node.data.size = size;
            __classPrivateFieldSet(this, _Cache_usedMemory, __classPrivateFieldGet(this, _Cache_usedMemory, "f") + (size - prevSize), "f");
            return node.data.value;
        }
        return undefined;
    }
    delete(key) {
        var _a;
        const node = __classPrivateFieldGet(this, _Cache_map, "f").get(key);
        if (node !== undefined) {
            __classPrivateFieldGet(this, _Cache_stats, "f").evictions++;
            __classPrivateFieldGet(this, _Cache_map, "f").delete(key);
            __classPrivateFieldGet(this, _Cache_lru, "f").remove(node);
            __classPrivateFieldSet(this, _Cache_usedMemory, __classPrivateFieldGet(this, _Cache_usedMemory, "f") - node.data.size, "f");
            (_a = __classPrivateFieldGet(this, _Cache_onEvict, "f")) === null || _a === void 0 ? void 0 : _a.call(this, key, node.data, types_1.EvictionReason.Manual, this);
            return node.data.value;
        }
        return undefined;
    }
    evictLRU(count) {
        var _a;
        let node = __classPrivateFieldGet(this, _Cache_lru, "f").last;
        let i = 0;
        for (; node !== undefined && i < count; node = node.prev, i++) {
            __classPrivateFieldGet(this, _Cache_stats, "f").evictions++;
            const { key, size } = node.data;
            __classPrivateFieldGet(this, _Cache_map, "f").delete(key);
            __classPrivateFieldSet(this, _Cache_usedMemory, __classPrivateFieldGet(this, _Cache_usedMemory, "f") - size, "f");
            (_a = __classPrivateFieldGet(this, _Cache_onEvict, "f")) === null || _a === void 0 ? void 0 : _a.call(this, key, node.data, types_1.EvictionReason.Manual, this);
        }
        if (node == undefined) {
            // clear all
            __classPrivateFieldGet(this, _Cache_lru, "f").clear();
        }
        else {
            __classPrivateFieldGet(this, _Cache_lru, "f").cutEnd(node, i);
        }
        return i;
    }
    evictMRU(count) {
        var _a;
        let node = __classPrivateFieldGet(this, _Cache_lru, "f").first;
        let i = 0;
        for (; node !== undefined && i < count; node = node.next, i++) {
            __classPrivateFieldGet(this, _Cache_stats, "f").evictions++;
            const { key, size } = node.data;
            __classPrivateFieldGet(this, _Cache_map, "f").delete(key);
            __classPrivateFieldSet(this, _Cache_usedMemory, __classPrivateFieldGet(this, _Cache_usedMemory, "f") - size, "f");
            (_a = __classPrivateFieldGet(this, _Cache_onEvict, "f")) === null || _a === void 0 ? void 0 : _a.call(this, key, node.data, types_1.EvictionReason.Manual, this);
        }
        if (node == undefined) {
            // clear all
            __classPrivateFieldGet(this, _Cache_lru, "f").clear();
        }
        else {
            __classPrivateFieldGet(this, _Cache_lru, "f").cutStart(node, i);
        }
        return i;
    }
    evictAll() {
        var _a;
        let node = __classPrivateFieldGet(this, _Cache_lru, "f").last;
        let i = 0;
        for (; node !== undefined; i++) {
            __classPrivateFieldGet(this, _Cache_stats, "f").evictions++;
            const { prev, data } = node;
            const { key, size } = data;
            __classPrivateFieldGet(this, _Cache_map, "f").delete(key);
            __classPrivateFieldSet(this, _Cache_usedMemory, __classPrivateFieldGet(this, _Cache_usedMemory, "f") - size, "f");
            (_a = __classPrivateFieldGet(this, _Cache_onEvict, "f")) === null || _a === void 0 ? void 0 : _a.call(this, key, data, types_1.EvictionReason.Manual, this);
            node = prev;
        }
        __classPrivateFieldGet(this, _Cache_lru, "f").clear();
        __classPrivateFieldGet(this, _Cache_map, "f").clear();
        __classPrivateFieldSet(this, _Cache_usedMemory, 0, "f");
        return i;
    }
    clear() {
        __classPrivateFieldGet(this, _Cache_map, "f").clear();
        __classPrivateFieldGet(this, _Cache_lru, "f").clear();
        __classPrivateFieldSet(this, _Cache_usedMemory, 0, "f");
    }
    freeMemoryLRU(requiredSize) {
        var _a;
        if (!Number.isFinite(requiredSize) || requiredSize <= 0) {
            throw new CacheError("Invalid Cache size");
        }
        if (__classPrivateFieldGet(this, _Cache_maxMemory, "f") !== undefined) {
            if (requiredSize > __classPrivateFieldGet(this, _Cache_maxMemory, "f")) {
                throw new CacheError("Cache size overflow");
            }
        }
        let truncSize = 0;
        let node = __classPrivateFieldGet(this, _Cache_lru, "f").last;
        let i = 0;
        for (; node !== undefined; node = node.prev, i++) {
            __classPrivateFieldGet(this, _Cache_stats, "f").evictions++;
            const { key, size } = node.data;
            truncSize += size;
            __classPrivateFieldGet(this, _Cache_map, "f").delete(key);
            (_a = __classPrivateFieldGet(this, _Cache_onEvict, "f")) === null || _a === void 0 ? void 0 : _a.call(this, key, node.data, types_1.EvictionReason.LRU, this);
            if (truncSize >= requiredSize) {
                break;
            }
        }
        if (node !== undefined) {
            __classPrivateFieldGet(this, _Cache_lru, "f").cutLeft(node, i + 1);
            __classPrivateFieldSet(this, _Cache_usedMemory, __classPrivateFieldGet(this, _Cache_usedMemory, "f") - truncSize, "f");
        }
        else {
            __classPrivateFieldGet(this, _Cache_map, "f").clear();
            __classPrivateFieldGet(this, _Cache_lru, "f").clear();
            __classPrivateFieldSet(this, _Cache_usedMemory, 0, "f");
        }
        return truncSize;
    }
    *[(_Cache_usedMemory = new WeakMap(), _Cache_maxMemory = new WeakMap(), _Cache_stats = new WeakMap(), _Cache_map = new WeakMap(), _Cache_lru = new WeakMap(), _Cache_onMiss = new WeakMap(), _Cache_onHit = new WeakMap(), _Cache_onEvict = new WeakMap(), _Cache_instances = new WeakSet(), _Cache_freeMemoryLRUInternal = function _Cache_freeMemoryLRUInternal(requiredSize, forNode) {
        var _a;
        let truncSize = 0;
        let node = __classPrivateFieldGet(this, _Cache_lru, "f").last;
        let i = 0;
        for (; node !== undefined; node = node.prev) {
            const { key, size } = node.data;
            if (node === forNode) {
                continue;
            }
            __classPrivateFieldGet(this, _Cache_stats, "f").evictions++;
            truncSize += size;
            __classPrivateFieldGet(this, _Cache_map, "f").delete(key);
            (_a = __classPrivateFieldGet(this, _Cache_onEvict, "f")) === null || _a === void 0 ? void 0 : _a.call(this, key, node.data, types_1.EvictionReason.LRU, this);
            if (truncSize >= requiredSize) {
                break;
            }
            i++;
        }
        if (forNode !== undefined) {
            __classPrivateFieldGet(this, _Cache_lru, "f").moveToStart(forNode);
        }
        if (node !== undefined) {
            __classPrivateFieldGet(this, _Cache_lru, "f").cutLeft(node, i + 1);
            __classPrivateFieldSet(this, _Cache_usedMemory, __classPrivateFieldGet(this, _Cache_usedMemory, "f") - truncSize, "f");
        }
        else if (forNode === undefined) {
            __classPrivateFieldGet(this, _Cache_map, "f").clear();
            __classPrivateFieldGet(this, _Cache_lru, "f").clear();
            __classPrivateFieldSet(this, _Cache_usedMemory, 0, "f");
        }
        return truncSize;
    }, Symbol.iterator)]() {
        for (let node = __classPrivateFieldGet(this, _Cache_lru, "f").first; node !== undefined; node = node.next) {
            const { key, value, size } = node.data;
            yield [key, value, size];
        }
    }
    *entries() {
        for (let node = __classPrivateFieldGet(this, _Cache_lru, "f").first; node !== undefined; node = node.next) {
            const { key, value, size } = node.data;
            yield [key, value, size];
        }
    }
    *keys() {
        for (let node = __classPrivateFieldGet(this, _Cache_lru, "f").first; node !== undefined; node = node.next) {
            yield node.data.key;
        }
    }
    *values() {
        for (let node = __classPrivateFieldGet(this, _Cache_lru, "f").first; node !== undefined; node = node.next) {
            yield node.data.value;
        }
    }
    *sizes() {
        for (let node = __classPrivateFieldGet(this, _Cache_lru, "f").first; node !== undefined; node = node.next) {
            yield node.data.size;
        }
    }
    [node_util_1.inspect.custom](depth, options) {
        return {
            size: this.size,
            usedMemory: __classPrivateFieldGet(this, _Cache_usedMemory, "f"),
            maxMemory: __classPrivateFieldGet(this, _Cache_maxMemory, "f"),
            entries: [...this],
        };
    }
    toJSON() {
        const rec = {};
        for (let node = __classPrivateFieldGet(this, _Cache_lru, "f").first; node !== undefined; node = node.next) {
            const { value, size } = node.data;
            rec[String(node.data.key)] = { value, size };
        }
        return rec;
    }
    forEach(callback) {
        return __awaiter(this, void 0, void 0, function* () {
            for (let node = __classPrivateFieldGet(this, _Cache_lru, "f").first; node !== undefined; node = node.next) {
                const { value, size, key } = node.data;
                yield callback(value, size, key);
            }
            return this;
        });
    }
    forEachSync(callback) {
        for (let node = __classPrivateFieldGet(this, _Cache_lru, "f").first; node !== undefined; node = node.next) {
            const { value, size, key } = node.data;
            callback(value, size, key);
        }
        return this;
    }
}
exports.Cache = Cache;
//# sourceMappingURL=cache.js.map