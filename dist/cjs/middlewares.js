"use strict";
// src/middlewares.ts
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cors = exports.limitRate = exports.securityHeaders = exports.forceHttps = void 0;
const helpers_ts_1 = require("./helpers.js");
const types_ts_1 = require("./types.js");
/**
 * Force http into https
 *
 * @returns {Handler<ExtendContext>} Middleware function
 *
 */
const forceHttps = (config) => {
    var _a;
    const toPort = (_a = config === null || config === void 0 ? void 0 : config.toPort) !== null && _a !== void 0 ? _a : 443;
    return function ({ url }) {
        if (url.protocol === "http:") {
            const newUrl = new URL(url);
            newUrl.protocol = "https:";
            newUrl.port = toPort === 443 ? "" : String(toPort);
            return (0, helpers_ts_1.redirectPermanentPreserve)(newUrl.toString());
        }
    };
};
exports.forceHttps = forceHttps;
/**
 * Set security headers.
 *   - "X-Content-Type-Options": always "nosniff"
 *   - "X-Frame-Options": default "DENY"
 *   - "Referrer-Policy": from parameters
 *   - "Strict-Transport-Security": from parameters
 *   - "Content-Security-Policy": from parameters
 *
 * @returns {Handler<ExtendContext>} Middleware function
 *
 */
const securityHeaders = (config) => {
    const { crossOriginOpenerPolicy, crossOriginEmbedderPolicy, crossOriginResourcePolicy, referrerPolicy, xFrameOptions = "DENY", strictTransportSecurity: hsts_, contentSecurityPolicy: csp_, headers, } = config !== null && config !== void 0 ? config : {};
    const hsts = hsts_ == null
        ? undefined
        : typeof hsts_ === "string"
            ? hsts_
            : typeof hsts_ === "boolean"
                ? hsts_
                    ? (0, helpers_ts_1.buildStrictTransportSecurity)({})
                    : undefined
                : (0, helpers_ts_1.buildStrictTransportSecurity)(hsts_);
    const contentSecurityPolicy = csp_ == null ? undefined : (0, helpers_ts_1.buildContentSecurityPolicy)(csp_);
    /////////////////////////////////////////////
    const preparedHeaders = [];
    if (headers != null) {
        if (Array.isArray(headers)) {
            for (const [key, value] of headers) {
                preparedHeaders.push([key, value]);
            }
        }
        else {
            for (const key of Object.keys(headers)) {
                preparedHeaders.push([key, headers[key]]);
            }
        }
    }
    /////////////////////////////////////////////
    preparedHeaders.push(["X-Content-Type-Options", "nosniff"]);
    if (xFrameOptions != null) {
        preparedHeaders.push(["X-Frame-Options", xFrameOptions]);
    }
    if (referrerPolicy != undefined) {
        preparedHeaders.push(["Referrer-Policy", referrerPolicy]);
    }
    if (hsts != null) {
        preparedHeaders.push(["Strict-Transport-Security", hsts]);
    }
    if (contentSecurityPolicy != null) {
        preparedHeaders.push(["Content-Security-Policy", contentSecurityPolicy]);
    }
    if (crossOriginOpenerPolicy != null) {
        preparedHeaders.push([
            "Cross-Origin-Opener-Policy",
            crossOriginOpenerPolicy,
        ]);
    }
    if (crossOriginEmbedderPolicy != null) {
        preparedHeaders.push([
            "Cross-Origin-Embedder-Policy",
            crossOriginEmbedderPolicy,
        ]);
    }
    if (crossOriginResourcePolicy != null) {
        preparedHeaders.push([
            "Cross-Origin-Resource-Policy",
            crossOriginResourcePolicy,
        ]);
    }
    /////////////////////////////////////////////
    return function ({ headers }) {
        for (const [key, value] of preparedHeaders) {
            headers.set(key, value);
        }
    };
};
exports.securityHeaders = securityHeaders;
/**
 * Creates a rate limiting middleware using token bucket algorithm.
 * Supports both fixed interval refill and continuous rate-based refill.
 *
 * @template {Record<string, unknown>} ExtendContext - Extend Router Context
 * @param {Object} config - Rate limiting configuration
 * @param {Function} [config.key] - Function to generate cache key from request and context
 * @param {number} [config.maxTokens] - Maximum number of tokens in the bucket
 * @param {number} [config.refillInterval] - Fixed interval in seconds for token refill
 * @param {number} [config.refillRate] - Continuous refill rate in tokens per second
 * @param {number} [config.cleanUpInterval] - Interval in seconds for cleanup timer
 * @param {number} [config.cleanUpIdleDelay] - Time in seconds to delay cleanup of filled token buckets
 * @param {boolean} [config.setXRateLimitHeaders=false] - Whether to set X-RateLimit headers in response
 * @param {boolean} [config.breakPipeline=false] - If true, returns Break_Pipeline
 * @returns {Handler<ExtendContext>} Middleware function that enforces rate limits
 *
 * @example
 * // Fixed interval rate limiting (10 requests per minute)
 * const rateLimiter = limitRate({
 *   key: (ctx) => ctx.clientId, // IP-based limiting
 *   refillInterval: 60, // 1 minute
 *   refillRate: 10, // 10 tokens per interval
 *   maxTokens: 10,
 *   setXRateLimitHeaders: true
 * });
 *
 * @example
 * // Continuous rate limiting (100 requests per hour)
 * const rateLimiter = limitRate({
 *   key: (ctx) => ctx.clientId || 'anonymous',
 *   refillRate: 60, // 100 tokens per 60 seconds
 *   maxTokens: 100,
 * });
 *
 * @throws {Error} If neither refillInterval nor refillRate is provided
 */
const limitRate = (config) => {
    var _a;
    const { key, maxTokens, refillInterval, refillRate, cleanUpInterval, setXRateLimitHeaders = false, breakPipeline = false, } = config;
    const cleanUpIdleDelay = -((_a = config.cleanUpIdleDelay) !== null && _a !== void 0 ? _a : 0);
    const rateLimits = new Map();
    const now = () => performance.now() / 1000;
    const getRateLimits = (id) => {
        let entry = rateLimits.get(id);
        if (entry == null) {
            entry = {
                tokens: maxTokens,
                lastRefill: now(),
            };
            rateLimits.set(id, entry);
        }
        return entry;
    };
    const timeToFill = (key) => {
        const entry = rateLimits.get(key);
        if (entry == null) {
            return undefined;
        }
        const timeElapsed = now() - entry.lastRefill;
        if (refillInterval != null) {
            const timeLeft = refillRate != null
                ? (maxTokens - entry.tokens) / (refillRate / refillInterval) -
                    timeElapsed
                : refillInterval - timeElapsed;
            return timeLeft;
        }
        else if (refillRate != null) {
            const timeLeft = (maxTokens - entry.tokens) / refillRate - timeElapsed;
            return timeLeft;
        }
        return undefined;
    };
    const cleanUpRateLimits = () => {
        for (const key of rateLimits.keys()) {
            const timeLeft = timeToFill(key);
            if (timeLeft == null) {
                continue;
            }
            if (timeLeft <= cleanUpIdleDelay) {
                rateLimits.delete(key);
            }
        }
    };
    if (cleanUpInterval != null) {
        setInterval(cleanUpRateLimits, cleanUpInterval * 1000);
    }
    if (refillInterval != null) {
        return function (ctx) {
            return __awaiter(this, void 0, void 0, function* () {
                const id = yield key(ctx);
                const entry = getRateLimits(id);
                const timeElapsed = now() - entry.lastRefill;
                if (timeElapsed >= refillInterval) {
                    if (refillRate != null) {
                        const newTokens = entry.tokens +
                            refillRate * Math.floor(timeElapsed / refillInterval);
                        entry.tokens = Math.min(newTokens, maxTokens);
                        entry.lastRefill = now();
                    }
                    else {
                        entry.tokens = maxTokens;
                        entry.lastRefill = now();
                    }
                }
                if (entry.tokens <= 0) {
                    ctx.headers.set("Retry-After", Math.ceil(refillInterval - timeElapsed).toFixed());
                    return (0, helpers_ts_1.status)(429);
                }
                else {
                    entry.tokens--;
                }
                if (setXRateLimitHeaders) {
                    ctx.headers.set("X-RateLimit-Limit", maxTokens.toFixed());
                    ctx.headers.set("X-RateLimit-Remaining", entry.tokens.toFixed());
                }
                if (breakPipeline) {
                    return types_ts_1.Break_Pipeline;
                }
            });
        };
    }
    else if (refillRate != null) {
        return function (ctx) {
            return __awaiter(this, void 0, void 0, function* () {
                const id = yield key(ctx);
                const entry = getRateLimits(id);
                const timeElapsed = now() - entry.lastRefill;
                const newTokens = entry.tokens + refillRate * timeElapsed;
                entry.tokens = Math.min(newTokens, maxTokens);
                entry.lastRefill = now();
                if (entry.tokens <= 0) {
                    ctx.headers.set("Retry-After", Math.ceil(1 / refillRate).toFixed());
                    return (0, helpers_ts_1.status)(429);
                }
                else {
                    entry.tokens--;
                }
                if (setXRateLimitHeaders) {
                    ctx.headers.set("X-RateLimit-Limit", maxTokens.toFixed());
                    ctx.headers.set("X-RateLimit-Remaining", Math.max(0, entry.tokens).toFixed());
                }
                if (breakPipeline) {
                    return types_ts_1.Break_Pipeline;
                }
            });
        };
    }
    throw new Error("LIMIT-RATE: `refillInterval` or `refillRate` or both should be set");
};
exports.limitRate = limitRate;
/**
 * Creates a CORS (Cross-Origin Resource Sharing) middleware.
 * Supports preflight requests and configurable CORS headers.
 *
 * @template {Record<string, unknown>} ExtendContext - Extend Router Context
 * @param {Object} [config] - CORS configuration
 * @param {string|string[]|"*"} [config.origins="*"] - Allowed origins (wildcard "*", single origin, or array)
 * @param {(HttpMethod|HttpMethodUpper|HttpMethodLower)[]} [config.methods=["Get","Head","Put","Patch","Post","Delete"]] - Allowed HTTP methods
 * @param {string[]} [config.allowedHeaders=["Content-Type","Authorization"]] - Allowed request headers
 * @param {string[]} [config.exposedHeaders] - Headers exposed to the browser
 * @param {boolean} [config.credentials=false] - Allow credentials (cookies, authorization headers)
 * @param {number} [config.maxAge=86400] - Maximum age for preflight cache in seconds
 * @param {boolean} [config.varyOrigin=true] - Add Vary: Origin header for caching
 * @param {boolean} [config.breakPipeline=false] - If true, returns Break_Pipeline
 * @returns {Handler<ExtendContext>} Middleware function that handles CORS headers
 *
 * @throws {HttpError} If credentials is enabled with wildcard origin ("*")
 *
 * @example
 * // Basic CORS with all defaults
 * const corsMiddleware = cors();
 *
 * @example
 * // Specific origins with credentials
 * const corsMiddleware = cors({
 *   origins: ["https://example.com", "https://api.example.com"],
 *   credentials: true,
 *   methods: ["Get", "Post", "Put", "Delete"],
 *   allowedHeaders: ["Content-Type", "Authorization", "X-Custom-Header"]
 * });
 *
 */
const cors = (config) => {
    const { origins = "*", methods: methods_ = ["Get", "Head", "Put", "Patch", "Post", "Delete"], allowedHeaders = ["Content-Type", "Authorization"], exposedHeaders, credentials = false, maxAge = 86400, varyOrigin = true, breakPipeline = false, } = config !== null && config !== void 0 ? config : {};
    const globOrigin = origins === "*" ? "*" : null;
    const originsSet = new Set(origins === "*" ? [] : typeof origins === "string" ? [origins] : origins);
    const methods = methods_ === null || methods_ === void 0 ? void 0 : methods_.map((m) => m.toUpperCase());
    return function (ctx) {
        const { request, headers } = ctx;
        const origin = request.headers.get("origin");
        let corsOrigin = null;
        if (!origin) {
            if (breakPipeline) {
                return types_ts_1.Break_Pipeline;
            }
            return;
        }
        if (globOrigin) {
            corsOrigin = "*";
        }
        else {
            corsOrigin = originsSet.has(origin) ? origin : null;
        }
        if (!corsOrigin) {
            if (varyOrigin) {
                headers.append("Vary", "Origin");
            }
            if (breakPipeline) {
                return types_ts_1.Break_Pipeline;
            }
            return;
        }
        headers.set("Access-Control-Allow-Origin", corsOrigin);
        if (credentials) {
            if (corsOrigin === "*")
                throw new types_ts_1.HttpError(403, "CORS: Cannot use credentials with wildcard origin");
            headers.set("Access-Control-Allow-Credentials", "true");
        }
        if (exposedHeaders && exposedHeaders.length > 0) {
            headers.set("Access-Control-Expose-Headers", exposedHeaders.join(", "));
        }
        if (varyOrigin && origins !== "*") {
            headers.append("Vary", "Origin");
        }
        if (request.method === "OPTIONS") {
            if (methods && methods.length > 0) {
                const requestMethod = request.headers.get("Access-Control-Request-Method");
                if (requestMethod &&
                    !methods.includes(requestMethod)) {
                    return (0, helpers_ts_1.status)(405, `Method ${requestMethod} not allowed`);
                }
                headers.set("Access-Control-Allow-Methods", methods.join(", "));
            }
            if (allowedHeaders && allowedHeaders.length > 0) {
                headers.set("Access-Control-Allow-Headers", allowedHeaders.join(", "));
            }
            if (maxAge != null) {
                headers.set("Access-Control-Max-Age", maxAge.toString());
            }
            return (0, helpers_ts_1.status)(204, null);
        }
        if (breakPipeline) {
            return types_ts_1.Break_Pipeline;
        }
    };
};
exports.cors = cors;
//# sourceMappingURL=middlewares.js.map