"use strict";
// src/exp-cache.ts
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
var _ExpCache_instances, _ExpCache_usedMemory, _ExpCache_maxMemory, _ExpCache_defaultTTL, _ExpCache_stats, _ExpCache_now, _ExpCache_map, _ExpCache_lru, _ExpCache_onMiss, _ExpCache_onHit, _ExpCache_onEvict, _ExpCache_freeMemoryLRUInternal;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExpCache = exports.ExpCacheError = void 0;
const node_util_1 = require("node:util");
const linked_list_1 = require("./linked-list");
const types_1 = require("./types");
class ExpCacheError extends Error {
    constructor(message, options) {
        super(message, options);
    }
}
exports.ExpCacheError = ExpCacheError;
class ExpCache {
    get size() {
        return __classPrivateFieldGet(this, _ExpCache_lru, "f").size;
    }
    get usedMemory() {
        return __classPrivateFieldGet(this, _ExpCache_usedMemory, "f");
    }
    get maxMemory() {
        return __classPrivateFieldGet(this, _ExpCache_maxMemory, "f");
    }
    get defaultTTL() {
        return __classPrivateFieldGet(this, _ExpCache_defaultTTL, "f");
    }
    get stats() {
        return Object.assign({}, __classPrivateFieldGet(this, _ExpCache_stats, "f"));
    }
    resetStats() {
        __classPrivateFieldGet(this, _ExpCache_stats, "f").hits = 0;
        __classPrivateFieldGet(this, _ExpCache_stats, "f").misses = 0;
        __classPrivateFieldGet(this, _ExpCache_stats, "f").evictions = 0;
        __classPrivateFieldGet(this, _ExpCache_stats, "f").sets = 0;
        __classPrivateFieldGet(this, _ExpCache_stats, "f").gets = 0;
        __classPrivateFieldGet(this, _ExpCache_stats, "f").staleGets = 0;
        __classPrivateFieldGet(this, _ExpCache_stats, "f").peeks = 0;
        __classPrivateFieldGet(this, _ExpCache_stats, "f").checks = 0;
        __classPrivateFieldGet(this, _ExpCache_stats, "f").updates = 0;
        __classPrivateFieldGet(this, _ExpCache_stats, "f").expiryUpdates = 0;
    }
    now() {
        return __classPrivateFieldGet(this, _ExpCache_now, "f").call(this);
    }
    ttl(ttl) {
        return __classPrivateFieldGet(this, _ExpCache_now, "f").call(this) + ttl;
    }
    constructor(options) {
        _ExpCache_instances.add(this);
        _ExpCache_usedMemory.set(this, 0);
        _ExpCache_maxMemory.set(this, void 0);
        _ExpCache_defaultTTL.set(this, void 0);
        _ExpCache_stats.set(this, void 0);
        _ExpCache_now.set(this, void 0);
        _ExpCache_map.set(this, new Map());
        _ExpCache_lru.set(this, new linked_list_1.LinkedList());
        _ExpCache_onMiss.set(this, undefined);
        _ExpCache_onHit.set(this, undefined);
        _ExpCache_onEvict.set(this, void 0);
        const { maxMemory, defaultTTL, onMiss, onHit, onEvict, now = Date.now, } = options !== null && options !== void 0 ? options : Object.create(null);
        if (!Number.isFinite(maxMemory) || maxMemory <= 0) {
            throw new ExpCacheError("Invalid ExpCache option value for maxMemory");
        }
        if ((defaultTTL !== undefined && !Number.isFinite(defaultTTL)) ||
            defaultTTL <= 0) {
            throw new ExpCacheError("Invalid ExpCache option value for defaultTTL");
        }
        __classPrivateFieldSet(this, _ExpCache_maxMemory, maxMemory, "f");
        __classPrivateFieldSet(this, _ExpCache_defaultTTL, defaultTTL, "f");
        __classPrivateFieldSet(this, _ExpCache_onHit, onHit, "f");
        __classPrivateFieldSet(this, _ExpCache_onMiss, onMiss, "f");
        __classPrivateFieldSet(this, _ExpCache_onEvict, onEvict, "f");
        __classPrivateFieldSet(this, _ExpCache_now, now, "f");
        __classPrivateFieldSet(this, _ExpCache_stats, {
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
        }, "f");
    }
    has(key) {
        __classPrivateFieldGet(this, _ExpCache_stats, "f").checks++;
        const node = __classPrivateFieldGet(this, _ExpCache_map, "f").get(key);
        if (node === undefined) {
            return false;
        }
        const { data: { exp }, } = node;
        if (exp !== undefined && exp <= __classPrivateFieldGet(this, _ExpCache_now, "f").call(this)) {
            return false;
        }
        return true;
    }
    hasIncludeExpired(key) {
        __classPrivateFieldGet(this, _ExpCache_stats, "f").checks++;
        const node = __classPrivateFieldGet(this, _ExpCache_map, "f").get(key);
        return node !== undefined;
    }
    peek(key) {
        __classPrivateFieldGet(this, _ExpCache_stats, "f").peeks++;
        const node = __classPrivateFieldGet(this, _ExpCache_map, "f").get(key);
        if (node === undefined) {
            return undefined;
        }
        const { data: { exp }, } = node;
        if (exp !== undefined && exp <= __classPrivateFieldGet(this, _ExpCache_now, "f").call(this)) {
            return undefined;
        }
        return node.data.value;
    }
    peekIncludeExpired(key) {
        __classPrivateFieldGet(this, _ExpCache_stats, "f").peeks++;
        const node = __classPrivateFieldGet(this, _ExpCache_map, "f").get(key);
        return node === null || node === void 0 ? void 0 : node.data.value;
    }
    get(key) {
        var _a, _b, _c, _d;
        __classPrivateFieldGet(this, _ExpCache_stats, "f").gets++;
        const node = __classPrivateFieldGet(this, _ExpCache_map, "f").get(key);
        if (node !== undefined) {
            const { data: { key, value, size, exp }, } = node;
            if (exp !== undefined && exp <= __classPrivateFieldGet(this, _ExpCache_now, "f").call(this)) {
                __classPrivateFieldGet(this, _ExpCache_stats, "f").staleGets++;
                if (__classPrivateFieldGet(this, _ExpCache_onMiss, "f") !== undefined) {
                    const getAgain = __classPrivateFieldGet(this, _ExpCache_onMiss, "f").call(this, key, node.data, types_1.MissReason.Expired, this);
                    const currentNode = __classPrivateFieldGet(this, _ExpCache_map, "f").get(key);
                    if (getAgain && currentNode === node) {
                        __classPrivateFieldGet(this, _ExpCache_stats, "f").hits++;
                        __classPrivateFieldGet(this, _ExpCache_lru, "f").moveToStart(node);
                        (_a = __classPrivateFieldGet(this, _ExpCache_onHit, "f")) === null || _a === void 0 ? void 0 : _a.call(this, key, currentNode.data, this);
                        return currentNode.data.value;
                    }
                    if (currentNode !== node) {
                        return undefined;
                    }
                }
                __classPrivateFieldGet(this, _ExpCache_stats, "f").evictions++;
                __classPrivateFieldGet(this, _ExpCache_map, "f").delete(key);
                __classPrivateFieldGet(this, _ExpCache_lru, "f").remove(node);
                __classPrivateFieldSet(this, _ExpCache_usedMemory, __classPrivateFieldGet(this, _ExpCache_usedMemory, "f") - size, "f");
                (_b = __classPrivateFieldGet(this, _ExpCache_onEvict, "f")) === null || _b === void 0 ? void 0 : _b.call(this, key, node.data, types_1.EvictionReason.Expired, this);
                return undefined;
            }
            __classPrivateFieldGet(this, _ExpCache_stats, "f").hits++;
            __classPrivateFieldGet(this, _ExpCache_lru, "f").moveToStart(node);
            (_c = __classPrivateFieldGet(this, _ExpCache_onHit, "f")) === null || _c === void 0 ? void 0 : _c.call(this, key, node.data, this);
            return value;
        }
        __classPrivateFieldGet(this, _ExpCache_stats, "f").misses++;
        if (__classPrivateFieldGet(this, _ExpCache_onMiss, "f") !== undefined) {
            const getAgain = __classPrivateFieldGet(this, _ExpCache_onMiss, "f").call(this, key, undefined, types_1.MissReason.Miss, this);
            if (getAgain) {
                const node = __classPrivateFieldGet(this, _ExpCache_map, "f").get(key);
                if (node !== undefined) {
                    __classPrivateFieldGet(this, _ExpCache_stats, "f").hits++;
                    __classPrivateFieldGet(this, _ExpCache_lru, "f").moveToStart(node);
                    (_d = __classPrivateFieldGet(this, _ExpCache_onHit, "f")) === null || _d === void 0 ? void 0 : _d.call(this, key, node.data, this);
                    return node.data.value;
                }
                else {
                    return undefined;
                }
            }
        }
        return undefined;
    }
    getIncludeExpired(key) {
        var _a, _b;
        __classPrivateFieldGet(this, _ExpCache_stats, "f").gets++;
        const node = __classPrivateFieldGet(this, _ExpCache_map, "f").get(key);
        if (node !== undefined) {
            const { data } = node;
            __classPrivateFieldGet(this, _ExpCache_stats, "f").hits++;
            __classPrivateFieldGet(this, _ExpCache_lru, "f").moveToStart(node);
            (_a = __classPrivateFieldGet(this, _ExpCache_onHit, "f")) === null || _a === void 0 ? void 0 : _a.call(this, key, data, this);
            return data.value;
        }
        __classPrivateFieldGet(this, _ExpCache_stats, "f").misses++;
        if (__classPrivateFieldGet(this, _ExpCache_onMiss, "f") !== undefined) {
            const getAgain = __classPrivateFieldGet(this, _ExpCache_onMiss, "f").call(this, key, undefined, types_1.MissReason.Miss, this);
            if (getAgain) {
                const node = __classPrivateFieldGet(this, _ExpCache_map, "f").get(key);
                if (node !== undefined) {
                    __classPrivateFieldGet(this, _ExpCache_stats, "f").hits++;
                    __classPrivateFieldGet(this, _ExpCache_lru, "f").moveToStart(node);
                    (_b = __classPrivateFieldGet(this, _ExpCache_onHit, "f")) === null || _b === void 0 ? void 0 : _b.call(this, key, node.data, this);
                    return node.data.value;
                }
                else {
                    return undefined;
                }
            }
        }
        return undefined;
    }
    set(key, value, size, expiry) {
        var _a;
        // check if size is within bounds
        if (!Number.isFinite(size) || size < 0) {
            throw new ExpCacheError("Invalid ExpCache entry size");
        }
        if (__classPrivateFieldGet(this, _ExpCache_maxMemory, "f") !== undefined && size > __classPrivateFieldGet(this, _ExpCache_maxMemory, "f")) {
            throw new ExpCacheError("ExpCache size overflow");
        }
        __classPrivateFieldGet(this, _ExpCache_stats, "f").sets++;
        // remove existing node
        const existingNode = __classPrivateFieldGet(this, _ExpCache_map, "f").get(key);
        if (existingNode !== undefined) {
            __classPrivateFieldGet(this, _ExpCache_stats, "f").evictions++;
            __classPrivateFieldGet(this, _ExpCache_map, "f").delete(key);
            __classPrivateFieldGet(this, _ExpCache_lru, "f").remove(existingNode);
            __classPrivateFieldSet(this, _ExpCache_usedMemory, __classPrivateFieldGet(this, _ExpCache_usedMemory, "f") - existingNode.data.size, "f");
            (_a = __classPrivateFieldGet(this, _ExpCache_onEvict, "f")) === null || _a === void 0 ? void 0 : _a.call(this, key, existingNode.data, types_1.EvictionReason.Replaced, this);
        }
        // check available memory
        // evict least-recently-used if overflown
        const newMemoryUsage = __classPrivateFieldGet(this, _ExpCache_usedMemory, "f") + size;
        if (__classPrivateFieldGet(this, _ExpCache_maxMemory, "f") !== undefined && newMemoryUsage > __classPrivateFieldGet(this, _ExpCache_maxMemory, "f")) {
            const requiredSize = newMemoryUsage - __classPrivateFieldGet(this, _ExpCache_maxMemory, "f");
            __classPrivateFieldGet(this, _ExpCache_instances, "m", _ExpCache_freeMemoryLRUInternal).call(this, requiredSize);
        }
        // insert new node
        const exp = expiry !== undefined
            ? expiry.ttl !== undefined
                ? __classPrivateFieldGet(this, _ExpCache_now, "f").call(this) + expiry.ttl
                : expiry.exp
            : __classPrivateFieldGet(this, _ExpCache_defaultTTL, "f") !== undefined
                ? __classPrivateFieldGet(this, _ExpCache_now, "f").call(this) + __classPrivateFieldGet(this, _ExpCache_defaultTTL, "f")
                : undefined;
        if (exp !== undefined && !Number.isFinite(exp)) {
            throw new ExpCacheError("Invalid ExpCache value for exp");
        }
        const node = __classPrivateFieldGet(this, _ExpCache_lru, "f").insertStart({ key, value, size, exp });
        __classPrivateFieldGet(this, _ExpCache_map, "f").set(key, node);
        __classPrivateFieldSet(this, _ExpCache_usedMemory, __classPrivateFieldGet(this, _ExpCache_usedMemory, "f") + size, "f");
        return this;
    }
    updateExpiry(key, expiry) {
        __classPrivateFieldGet(this, _ExpCache_stats, "f").expiryUpdates++;
        const node = __classPrivateFieldGet(this, _ExpCache_map, "f").get(key);
        if (node !== undefined) {
            const exp = expiry !== undefined
                ? expiry.ttl !== undefined
                    ? __classPrivateFieldGet(this, _ExpCache_now, "f").call(this) + expiry.ttl
                    : expiry.exp
                : __classPrivateFieldGet(this, _ExpCache_defaultTTL, "f") !== undefined
                    ? __classPrivateFieldGet(this, _ExpCache_now, "f").call(this) + __classPrivateFieldGet(this, _ExpCache_defaultTTL, "f")
                    : undefined;
            if (exp !== undefined && !Number.isFinite(exp)) {
                throw new ExpCacheError("Invalid ExpCache value for exp");
            }
            node.data.exp = exp;
            __classPrivateFieldGet(this, _ExpCache_lru, "f").moveToStart(node);
            return node.data.exp;
        }
        return undefined;
    }
    update(key, value, size, expiry) {
        if (!Number.isFinite(size) || size < 0) {
            throw new ExpCacheError("Invalid ExpCache entry size");
        }
        __classPrivateFieldGet(this, _ExpCache_stats, "f").updates++;
        const node = __classPrivateFieldGet(this, _ExpCache_map, "f").get(key);
        if (node !== undefined) {
            const prevSize = node.data.size;
            if (__classPrivateFieldGet(this, _ExpCache_maxMemory, "f") !== undefined && size > __classPrivateFieldGet(this, _ExpCache_maxMemory, "f")) {
                throw new ExpCacheError("ExpCache size overflow");
            }
            const newMemoryUsage = __classPrivateFieldGet(this, _ExpCache_usedMemory, "f") + size - prevSize;
            if (__classPrivateFieldGet(this, _ExpCache_maxMemory, "f") !== undefined && newMemoryUsage > __classPrivateFieldGet(this, _ExpCache_maxMemory, "f")) {
                const requiredSize = newMemoryUsage - __classPrivateFieldGet(this, _ExpCache_maxMemory, "f");
                __classPrivateFieldGet(this, _ExpCache_instances, "m", _ExpCache_freeMemoryLRUInternal).call(this, requiredSize, node);
            }
            else {
                __classPrivateFieldGet(this, _ExpCache_lru, "f").moveToStart(node);
            }
            const exp = expiry !== undefined
                ? expiry.ttl !== undefined
                    ? __classPrivateFieldGet(this, _ExpCache_now, "f").call(this) + expiry.ttl
                    : expiry.exp
                : __classPrivateFieldGet(this, _ExpCache_defaultTTL, "f") !== undefined
                    ? __classPrivateFieldGet(this, _ExpCache_now, "f").call(this) + __classPrivateFieldGet(this, _ExpCache_defaultTTL, "f")
                    : undefined;
            if (exp !== undefined && !Number.isFinite(exp)) {
                throw new ExpCacheError("Invalid ExpCache value for exp");
            }
            if (exp !== undefined) {
                __classPrivateFieldGet(this, _ExpCache_stats, "f").expiryUpdates++;
            }
            node.data.exp = exp;
            node.data.value = value;
            node.data.size = size;
            __classPrivateFieldSet(this, _ExpCache_usedMemory, __classPrivateFieldGet(this, _ExpCache_usedMemory, "f") + (size - prevSize), "f");
            return node.data.value;
        }
        return undefined;
    }
    delete(key) {
        var _a;
        const node = __classPrivateFieldGet(this, _ExpCache_map, "f").get(key);
        if (node !== undefined) {
            __classPrivateFieldGet(this, _ExpCache_stats, "f").evictions++;
            __classPrivateFieldGet(this, _ExpCache_map, "f").delete(key);
            __classPrivateFieldGet(this, _ExpCache_lru, "f").remove(node);
            __classPrivateFieldSet(this, _ExpCache_usedMemory, __classPrivateFieldGet(this, _ExpCache_usedMemory, "f") - node.data.size, "f");
            (_a = __classPrivateFieldGet(this, _ExpCache_onEvict, "f")) === null || _a === void 0 ? void 0 : _a.call(this, key, node.data, types_1.EvictionReason.Manual, this);
            return node.data.value;
        }
        return undefined;
    }
    evictLRU(count) {
        var _a;
        let node = __classPrivateFieldGet(this, _ExpCache_lru, "f").last;
        let i = 0;
        for (; node !== undefined && i < count; node = node.prev, i++) {
            __classPrivateFieldGet(this, _ExpCache_stats, "f").evictions++;
            const { key, size } = node.data;
            __classPrivateFieldGet(this, _ExpCache_map, "f").delete(key);
            __classPrivateFieldSet(this, _ExpCache_usedMemory, __classPrivateFieldGet(this, _ExpCache_usedMemory, "f") - size, "f");
            (_a = __classPrivateFieldGet(this, _ExpCache_onEvict, "f")) === null || _a === void 0 ? void 0 : _a.call(this, key, node.data, types_1.EvictionReason.Manual, this);
        }
        if (node == undefined) {
            // clear all
            __classPrivateFieldGet(this, _ExpCache_lru, "f").clear();
        }
        else {
            __classPrivateFieldGet(this, _ExpCache_lru, "f").cutEnd(node, i);
        }
        return i;
    }
    evictMRU(count) {
        var _a;
        let node = __classPrivateFieldGet(this, _ExpCache_lru, "f").first;
        let i = 0;
        for (; node !== undefined && i < count; node = node.next, i++) {
            __classPrivateFieldGet(this, _ExpCache_stats, "f").evictions++;
            const { key, size } = node.data;
            __classPrivateFieldGet(this, _ExpCache_map, "f").delete(key);
            __classPrivateFieldSet(this, _ExpCache_usedMemory, __classPrivateFieldGet(this, _ExpCache_usedMemory, "f") - size, "f");
            (_a = __classPrivateFieldGet(this, _ExpCache_onEvict, "f")) === null || _a === void 0 ? void 0 : _a.call(this, key, node.data, types_1.EvictionReason.Manual, this);
        }
        if (node == undefined) {
            // clear all
            __classPrivateFieldGet(this, _ExpCache_lru, "f").clear();
        }
        else {
            __classPrivateFieldGet(this, _ExpCache_lru, "f").cutStart(node, i);
        }
        return i;
    }
    evictAll() {
        var _a;
        let node = __classPrivateFieldGet(this, _ExpCache_lru, "f").last;
        let i = 0;
        for (; node !== undefined; i++) {
            __classPrivateFieldGet(this, _ExpCache_stats, "f").evictions++;
            const { prev, data } = node;
            const { key, size } = data;
            __classPrivateFieldGet(this, _ExpCache_map, "f").delete(key);
            __classPrivateFieldSet(this, _ExpCache_usedMemory, __classPrivateFieldGet(this, _ExpCache_usedMemory, "f") - size, "f");
            (_a = __classPrivateFieldGet(this, _ExpCache_onEvict, "f")) === null || _a === void 0 ? void 0 : _a.call(this, key, data, types_1.EvictionReason.Manual, this);
            node = prev;
        }
        __classPrivateFieldGet(this, _ExpCache_lru, "f").clear();
        __classPrivateFieldGet(this, _ExpCache_map, "f").clear();
        __classPrivateFieldSet(this, _ExpCache_usedMemory, 0, "f");
        return i;
    }
    evictExpired() {
        var _a;
        const now = __classPrivateFieldGet(this, _ExpCache_now, "f").call(this);
        let i = 0;
        for (let node = __classPrivateFieldGet(this, _ExpCache_lru, "f").last; node !== undefined;) {
            const { prev, data } = node;
            const { key, exp, size } = data;
            if (exp !== undefined && exp <= now) {
                i++;
                __classPrivateFieldGet(this, _ExpCache_stats, "f").evictions++;
                __classPrivateFieldGet(this, _ExpCache_map, "f").delete(key);
                __classPrivateFieldGet(this, _ExpCache_lru, "f").remove(node);
                __classPrivateFieldSet(this, _ExpCache_usedMemory, __classPrivateFieldGet(this, _ExpCache_usedMemory, "f") - size, "f");
                (_a = __classPrivateFieldGet(this, _ExpCache_onEvict, "f")) === null || _a === void 0 ? void 0 : _a.call(this, key, data, types_1.EvictionReason.Expired, this);
            }
            node = prev;
        }
        return i;
    }
    clear() {
        __classPrivateFieldGet(this, _ExpCache_map, "f").clear();
        __classPrivateFieldGet(this, _ExpCache_lru, "f").clear();
        __classPrivateFieldSet(this, _ExpCache_usedMemory, 0, "f");
    }
    freeMemoryLRU(requiredSize) {
        var _a;
        if (!Number.isFinite(requiredSize) || requiredSize <= 0) {
            throw new ExpCacheError("Invalid ExpCache size");
        }
        if (__classPrivateFieldGet(this, _ExpCache_maxMemory, "f") !== undefined) {
            if (requiredSize > __classPrivateFieldGet(this, _ExpCache_maxMemory, "f")) {
                throw new ExpCacheError("ExpCache size overflow");
            }
        }
        let truncSize = 0;
        let node = __classPrivateFieldGet(this, _ExpCache_lru, "f").last;
        let i = 0;
        for (; node !== undefined; node = node.prev, i++) {
            __classPrivateFieldGet(this, _ExpCache_stats, "f").evictions++;
            const { key, size } = node.data;
            truncSize += size;
            __classPrivateFieldGet(this, _ExpCache_map, "f").delete(key);
            (_a = __classPrivateFieldGet(this, _ExpCache_onEvict, "f")) === null || _a === void 0 ? void 0 : _a.call(this, key, node.data, types_1.EvictionReason.LRU, this);
            if (truncSize >= requiredSize) {
                break;
            }
        }
        if (node !== undefined) {
            __classPrivateFieldGet(this, _ExpCache_lru, "f").cutLeft(node, i + 1);
            __classPrivateFieldSet(this, _ExpCache_usedMemory, __classPrivateFieldGet(this, _ExpCache_usedMemory, "f") - truncSize, "f");
        }
        else {
            __classPrivateFieldGet(this, _ExpCache_map, "f").clear();
            __classPrivateFieldGet(this, _ExpCache_lru, "f").clear();
            __classPrivateFieldSet(this, _ExpCache_usedMemory, 0, "f");
        }
        return truncSize;
    }
    *[(_ExpCache_usedMemory = new WeakMap(), _ExpCache_maxMemory = new WeakMap(), _ExpCache_defaultTTL = new WeakMap(), _ExpCache_stats = new WeakMap(), _ExpCache_now = new WeakMap(), _ExpCache_map = new WeakMap(), _ExpCache_lru = new WeakMap(), _ExpCache_onMiss = new WeakMap(), _ExpCache_onHit = new WeakMap(), _ExpCache_onEvict = new WeakMap(), _ExpCache_instances = new WeakSet(), _ExpCache_freeMemoryLRUInternal = function _ExpCache_freeMemoryLRUInternal(requiredSize, forNode) {
        var _a;
        let truncSize = 0;
        let node = __classPrivateFieldGet(this, _ExpCache_lru, "f").last;
        let i = 0;
        for (; node !== undefined; node = node.prev) {
            if (node === forNode) {
                continue;
            }
            __classPrivateFieldGet(this, _ExpCache_stats, "f").evictions++;
            const { key, size } = node.data;
            truncSize += size;
            __classPrivateFieldGet(this, _ExpCache_map, "f").delete(key);
            (_a = __classPrivateFieldGet(this, _ExpCache_onEvict, "f")) === null || _a === void 0 ? void 0 : _a.call(this, key, node.data, types_1.EvictionReason.LRU, this);
            if (truncSize >= requiredSize) {
                break;
            }
            i++;
        }
        if (forNode !== undefined) {
            __classPrivateFieldGet(this, _ExpCache_lru, "f").moveToStart(forNode);
        }
        if (node !== undefined) {
            __classPrivateFieldGet(this, _ExpCache_lru, "f").cutLeft(node, i + 1);
            __classPrivateFieldSet(this, _ExpCache_usedMemory, __classPrivateFieldGet(this, _ExpCache_usedMemory, "f") - truncSize, "f");
        }
        else if (forNode === undefined) {
            __classPrivateFieldGet(this, _ExpCache_map, "f").clear();
            __classPrivateFieldGet(this, _ExpCache_lru, "f").clear();
            __classPrivateFieldSet(this, _ExpCache_usedMemory, 0, "f");
        }
        return truncSize;
    }, Symbol.iterator)]() {
        for (let node = __classPrivateFieldGet(this, _ExpCache_lru, "f").first; node !== undefined; node = node.next) {
            const { key, value, size, exp } = node.data;
            yield [key, value, size, exp];
        }
    }
    *entries() {
        for (let node = __classPrivateFieldGet(this, _ExpCache_lru, "f").first; node !== undefined; node = node.next) {
            const { key, value, size, exp } = node.data;
            yield [key, value, size, exp];
        }
    }
    *keys() {
        for (let node = __classPrivateFieldGet(this, _ExpCache_lru, "f").first; node !== undefined; node = node.next) {
            yield node.data.key;
        }
    }
    *values() {
        for (let node = __classPrivateFieldGet(this, _ExpCache_lru, "f").first; node !== undefined; node = node.next) {
            yield node.data.value;
        }
    }
    *sizes() {
        for (let node = __classPrivateFieldGet(this, _ExpCache_lru, "f").first; node !== undefined; node = node.next) {
            yield node.data.size;
        }
    }
    *exps() {
        for (let node = __classPrivateFieldGet(this, _ExpCache_lru, "f").first; node !== undefined; node = node.next) {
            yield node.data.exp;
        }
    }
    [node_util_1.inspect.custom](depth, options) {
        return {
            size: this.size,
            usedMemory: __classPrivateFieldGet(this, _ExpCache_usedMemory, "f"),
            maxMemory: __classPrivateFieldGet(this, _ExpCache_maxMemory, "f"),
            entries: [...this],
        };
    }
    toJSON() {
        const rec = {};
        for (let node = __classPrivateFieldGet(this, _ExpCache_lru, "f").first; node !== undefined; node = node.next) {
            const { value, size, exp } = node.data;
            rec[String(node.data.key)] = { value, size, exp: exp !== null && exp !== void 0 ? exp : null };
        }
        return rec;
    }
    forEach(callback) {
        return __awaiter(this, void 0, void 0, function* () {
            for (let node = __classPrivateFieldGet(this, _ExpCache_lru, "f").first; node !== undefined; node = node.next) {
                const { value, size, exp, key } = node.data;
                yield callback(value, size, exp, key);
            }
            return this;
        });
    }
    forEachSync(callback) {
        for (let node = __classPrivateFieldGet(this, _ExpCache_lru, "f").first; node !== undefined; node = node.next) {
            const { value, size, exp, key } = node.data;
            callback(value, size, exp, key);
        }
        return this;
    }
}
exports.ExpCache = ExpCache;
//# sourceMappingURL=exp-cache.js.map