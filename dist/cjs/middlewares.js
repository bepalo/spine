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
exports.validate = exports.cors = exports.limitRate = exports.securityHeaders = exports.forceHttps = exports.logRequestsWithColor = exports.logRequests = exports.COLORS = void 0;
const helpers_ts_1 = require("./helpers.js");
const parsers_ts_1 = require("./parsers.js");
const status_ts_1 = require("./status.js");
const types_ts_1 = require("./types.js");
const utils_ts_1 = require("./utils.js");
exports.COLORS = {
    reset: "\x1b[0m",
    dim: "\x1b[2m",
    bold: "\x1b[1m",
    black: "\x1b[30m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    magenta: "\x1b[35m",
    cyan: "\x1b[36m",
    white: "\x1b[37m",
    method: {
        HEAD: "\x1b[36m", // cyan
        GET: "\x1b[36m",
        QUERY: "\x1b[34m", // blue
        POST: "\x1b[32m", // green
        PUT: "\x1b[33m", // yellow
        PATCH: "\x1b[33m",
        DELETE: "\x1b[31m", // red
        OPTIONS: "\x1b[35m", // magenta
        TRACE: "\x1b[35m",
        CONNECT: "\x1b[35m",
    },
    status: (status) => {
        if (status >= 500)
            return "\x1b[31m"; // red
        if (status >= 400)
            return "\x1b[33m"; // yellow
        if (status >= 300)
            return "\x1b[36m"; // cyan
        return "\x1b[32m"; // green
    },
};
/**
 * Log requests with no color
 *
 * @param options Log requests options
 */
const logRequests = (options) => {
    const { logger = console.log, enable, enclosure, indent, pad, } = options !== null && options !== void 0 ? options : {};
    const { requestTime: enReqTime = true, duration: enDur = true, status: enStatus = "status", search: enSearch = "multiline", } = enable !== null && enable !== void 0 ? enable : {};
    const { requestTime: encReqTime = ["", " "], duration: encDur = ["[", "]"], status: encStatus = ["(", ")"], } = enclosure !== null && enclosure !== void 0 ? enclosure : {};
    const [encReqTime0, encReqTime1] = encReqTime;
    const [encDur0, encDur1] = encDur;
    const [encStatus0, encStatus1] = encStatus;
    const { search: indSearch = "    " } = indent !== null && indent !== void 0 ? indent : {};
    const { duration: padDur = -7, status: padStatus = 0, method: padMethod = 0, } = pad !== null && pad !== void 0 ? pad : {};
    let statusType;
    switch (enStatus) {
        case "status":
            statusType = 1;
            break;
        case "status-text":
            statusType = 2;
            break;
        case "with-status-text":
            statusType = 3;
            break;
        default:
            statusType = 0;
            break;
    }
    const searchType = enSearch === "multiline" ? 2 : enSearch === "singleline" ? 1 : 0;
    ////////////////////////////////////////////////////////////////////////////
    return ({ request, response, url, timestamps: { epoch, start, end } }) => {
        // Status Str
        let statusStr;
        switch (statusType) {
            case 1:
                statusStr = response.status.toString();
                break;
            case 2:
                statusStr = response.statusText;
                break;
            case 3:
                statusStr = `${response.status} ${response.statusText}`;
                break;
            default:
                statusStr = "";
                break;
        }
        // Search Str
        let searchStr;
        switch (searchType) {
            case 2: {
                const len = url.searchParams.size;
                if (len > 0) {
                    searchStr = "?\n";
                    let i = 0;
                    for (const [key, value] of url.searchParams) {
                        searchStr += `${indSearch}${key}=${value}${++i < len ? " &\n" : ""}`;
                    }
                }
                else {
                    searchStr = "";
                }
                break;
            }
            case 1:
                searchStr = url.search;
                break;
            default:
                searchStr = "";
                break;
        }
        logger(`${enReqTime ? `${encReqTime0}${epoch}${encReqTime1}` : ""}${enDur
            ? `${encDur0}${(0, utils_ts_1.padStr)((0, utils_ts_1.formatDuration)(end - start), padDur)}${encDur1}`
            : ""}${!enStatus
            ? ""
            : `${encStatus0}${(0, utils_ts_1.padStr)(statusStr, padStatus)}${encStatus1}`} ${(0, utils_ts_1.padStr)(request.method, padMethod)} ${url.pathname}${searchStr}`);
    };
};
exports.logRequests = logRequests;
/**
 * Log requests with color
 *
 * @param options Log requests options
 */
const logRequestsWithColor = (options) => {
    const { logger = console.log, enable, enclosure, indent, pad, reqTime, duration, status, method, pathname, search, } = options !== null && options !== void 0 ? options : {};
    const { requestTime: enReqTime = true, duration: enDur = true, status: enStatus = "status", search: enSearch = "multiline", } = enable !== null && enable !== void 0 ? enable : {};
    const { requestTime: encReqTime = ["", " "], duration: encDur = ["[", "]"], status: encStatus = ["(", ")"], } = enclosure !== null && enclosure !== void 0 ? enclosure : {};
    const [encReqTime0, encReqTime1] = encReqTime;
    const [encDur0, encDur1] = encDur;
    const [encStatus0, encStatus1] = encStatus;
    const { search: indSearch = "    " } = indent !== null && indent !== void 0 ? indent : {};
    const { duration: padDur = -7, status: padStatus = 0, method: padMethod = 0, } = pad !== null && pad !== void 0 ? pad : {};
    const { color: reqTimeColor = null, bold: reqTimeBold = false, dim: reqTimeDim = false, } = reqTime !== null && reqTime !== void 0 ? reqTime : {};
    const { color: durColor = null, bold: durBold = false, dim: durDim = true, } = duration !== null && duration !== void 0 ? duration : {};
    const { color: statusColor = "auto", bold: statusBold = true, dim: statusDim = false, } = status !== null && status !== void 0 ? status : {};
    const { color: methodColor = "auto", bold: methodBold = false, dim: methodDim = false, } = method !== null && method !== void 0 ? method : {};
    const { color: pathnameColor = null, bold: pathnameBold = false, dim: pathnameDim = false, } = pathname !== null && pathname !== void 0 ? pathname : {};
    const { color: searchColor = null, bold: searchBold = false, dim: searchDim = true, } = search !== null && search !== void 0 ? search : {};
    const reqTimeDimStr = reqTimeDim ? exports.COLORS.dim : "";
    const reqTimeColorStr = reqTimeColor ? exports.COLORS[reqTimeColor] : "";
    const reqTimeBoldStr = reqTimeBold ? exports.COLORS.bold : "";
    const reqTimeColorReset = reqTimeDim || reqTimeColor || reqTimeBold ? exports.COLORS.reset : "";
    const durDimStr = durDim ? exports.COLORS.dim : "";
    const durColorStr = durColor ? exports.COLORS[durColor] : "";
    const durBoldStr = durBold ? exports.COLORS.bold : "";
    const durColorReset = durDim || durColor || durBold ? exports.COLORS.reset : "";
    const statusDimStr = statusDim ? exports.COLORS.dim : "";
    // const statusColorStr = (status: number) => statusColor === "auto" ? COLORS.status(status) : statusColor ? COLORS[statusColor] : "";
    const statusBoldStr = statusBold ? exports.COLORS.bold : "";
    const statusColorReset = statusDim || statusColor || statusBold ? exports.COLORS.reset : "";
    const methodDimStr = methodDim ? exports.COLORS.dim : "";
    // const methodColorStr = methodColor === "auto" ? COLORS.status(method) : methodColor ? COLORS[methodColor] : "";
    const methodBoldStr = methodBold ? exports.COLORS.bold : "";
    const methodColorReset = methodDim || methodColor || methodBold ? exports.COLORS.reset : "";
    const pathnameDimStr = pathnameDim ? exports.COLORS.dim : "";
    const pathnameColorStr = pathnameColor ? exports.COLORS[pathnameColor] : "";
    const pathnameBoldStr = pathnameBold ? exports.COLORS.bold : "";
    const pathnameColorReset = pathnameDim || pathnameColor || pathnameBold ? exports.COLORS.reset : "";
    const searchDimStr = searchDim ? exports.COLORS.dim : "";
    const searchColorStr = searchColor ? exports.COLORS[searchColor] : "";
    const searchBoldStr = searchBold ? exports.COLORS.bold : "";
    const searchColorReset = searchDim || searchColor || searchBold ? exports.COLORS.reset : "";
    let statusType;
    switch (enStatus) {
        case "status":
            statusType = 1;
            break;
        case "status-text":
            statusType = 2;
            break;
        case "with-status-text":
            statusType = 3;
            break;
        default:
            statusType = 0;
            break;
    }
    const searchType = enSearch === "multiline" ? 2 : enSearch === "singleline" ? 1 : 0;
    ////////////////////////////////////////////////////////////////////////////
    return ({ request, response, url, timestamps: { epoch, start, end } }) => {
        var _a;
        // Status Str
        let statusStr;
        switch (statusType) {
            case 1:
                statusStr = response.status.toString();
                break;
            case 2:
                statusStr = response.statusText;
                break;
            case 3:
                statusStr = `${response.status} ${response.statusText}`;
                break;
            default:
                statusStr = "";
                break;
        }
        // Search Str
        let searchStr;
        switch (searchType) {
            case 2: {
                const len = url.searchParams.size;
                if (len > 0) {
                    searchStr = "?\n";
                    let i = 0;
                    for (const [key, value] of url.searchParams) {
                        searchStr += `${indSearch}${key}=${value}${++i < len ? " &\n" : ""}`;
                    }
                }
                else {
                    searchStr = "";
                }
                break;
            }
            case 1:
                searchStr = url.search;
                break;
            default:
                searchStr = "";
                break;
        }
        logger(`${enReqTime ? `${reqTimeDimStr}${reqTimeColorStr}${reqTimeBoldStr}${encReqTime0}${epoch}${encReqTime1}${reqTimeColorReset}` : ""}${enDur
            ? `${durDimStr}${durColorStr}${durBoldStr}${encDur0}${(0, utils_ts_1.padStr)((0, utils_ts_1.formatDuration)(end - start), padDur)}${encDur1}${durColorReset}`
            : ""}${!enStatus
            ? ""
            : `${statusDimStr}${statusColor === "auto" ? exports.COLORS.status(response.status) : statusColor ? exports.COLORS[statusColor] : ""}${statusBoldStr}${encStatus0}${(0, utils_ts_1.padStr)(statusStr, padStatus)}${encStatus1}${statusColorReset}`} ${methodDimStr}${methodColor === "auto" ? ((_a = exports.COLORS.method[request.method]) !== null && _a !== void 0 ? _a : "\x1b[37m") : methodColor ? exports.COLORS[methodColor] : ""}${methodBoldStr}${(0, utils_ts_1.padStr)(request.method, padMethod)}${methodColorReset} ${pathnameDimStr}${pathnameColorStr}${pathnameBoldStr}${url.pathname}${pathnameColorReset}${searchDimStr}${searchColorStr}${searchBoldStr}${searchStr}${searchColorReset}`);
    };
};
exports.logRequestsWithColor = logRequestsWithColor;
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
 * @template {Record<string, unknown>} ExtendContext Extend Router Context
 * @property {Object} config Rate limiting configuration
 * @property {Function} [config.key] Function to generate cache key from request and context
 * @property {number} [config.maxTokens] Maximum number of tokens in the bucket
 * @property {number} [config.refillInterval] Fixed interval in seconds for token refill
 * @property {number} [config.refillRate] Continuous refill rate in tokens per second
 * @property {number} [config.cleanUpInterval] Interval in seconds for cleanup timer
 * @property {number} [config.cleanUpIdleDelay] Time in seconds to delay cleanup of filled token buckets
 * @property {boolean} [config.setXRateLimitHeaders=false] Whether to set X-RateLimit headers in response
 * @property {boolean} [config.breakPipeline=false] If true, returns Break_Pipeline
 * @property {"status"|"text"|"json"} [config.responseType="text"] Response type
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
    const { key, maxTokens, refillInterval, refillRate, cleanUpInterval, setXRateLimitHeaders = false, breakPipeline = false, responseType = "text", } = config;
    const respond = responseType === "json"
        ? (code, content, key, tag, init) => (0, helpers_ts_1.json)({ [key]: `${tag}: ${content}`, tag }, Object.assign(Object.assign({}, init), { status: code }))
        : responseType === "text"
            ? (code, content, key, tag, init) => (0, helpers_ts_1.text)(`[${key}] ${tag}: ${content}`, Object.assign(Object.assign({}, init), { status: code }))
            : (code, _content, _key, _tag, init) => (0, helpers_ts_1.status)(code, null, init);
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
                    return respond(status_ts_1.Status._429_TooManyRequests, "Too Many Requests", "message", "rate-limit");
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
                    return respond(status_ts_1.Status._429_TooManyRequests, "Too Many Requests", "message", "rate-limit");
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
 * @template {Record<string, unknown>} ExtendContext Extend Router Context
 * @param {Object} [config] CORS configuration
 * @param {string|string[]|"*"} [config.origins="*"] Allowed origins (wildcard "*", single origin, or array)
 * @param {(HttpMethod|HttpMethodUpper|HttpMethodLower)[]} [config.methods=["Get","Head","Put","Patch","Post","Delete"]] Allowed HTTP methods
 * @param {string[]} [config.allowedHeaders=["Content-Type","Authorization"]] Allowed request headers
 * @param {string[]} [config.exposedHeaders] Headers exposed to the browser
 * @param {boolean} [config.credentials=false] Allow credentials (cookies, authorization headers)
 * @param {number} [config.maxAge=86400] Maximum age for preflight cache in seconds
 * @param {boolean} [config.varyOrigin=true] Add Vary: Origin header for caching
 * @param {boolean} [config.breakPipeline=false] If true, returns Break_Pipeline
 * @param {"status"|"text"|"json"} [config.responseType="text"] Response type
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
    const { origins = "*", methods: methods_ = ["Get", "Head", "Put", "Patch", "Post", "Delete"], allowedHeaders = ["Content-Type", "Authorization"], exposedHeaders, credentials = false, maxAge = 86400, varyOrigin = true, breakPipeline = false, responseType = "text", } = config !== null && config !== void 0 ? config : {};
    const respond = responseType === "json"
        ? (code, content, key, tag, init) => (0, helpers_ts_1.json)({ [key]: `${tag}: ${content}`, tag }, Object.assign(Object.assign({}, init), { status: code }))
        : responseType === "text"
            ? (code, content, key, tag, init) => (0, helpers_ts_1.text)(`[${key}] ${tag}: ${content}`, Object.assign(Object.assign({}, init), { status: code }))
            : (code, _content, _key, _tag, init) => (0, helpers_ts_1.status)(code, null, init);
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
                throw new types_ts_1.HttpError(status_ts_1.Status._403_Forbidden, "CORS: Cannot use credentials with wildcard origin");
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
                    return respond(status_ts_1.Status._405_MethodNotAllowed, "Method not allowed", "message", "CORS");
                }
                headers.set("Access-Control-Allow-Methods", methods.join(", "));
            }
            if (allowedHeaders && allowedHeaders.length > 0) {
                headers.set("Access-Control-Allow-Headers", allowedHeaders.join(", "));
            }
            if (maxAge != null) {
                headers.set("Access-Control-Max-Age", maxAge.toString());
            }
            return (0, helpers_ts_1.status)(status_ts_1.Status._204_NoContent, null);
        }
        if (breakPipeline) {
            return types_ts_1.Break_Pipeline;
        }
    };
};
exports.cors = cors;
/**
 * Creates a request params, query and body validator middleware function
 *
 * @param {Validator<Record<string, string>,ExtendContext>} [config.params] Parameters validator
 * @param {CustomErrorType} [config.paramsErrors] Parameters validator's expected error instance types other than Error derivatives
 * @param {boolean|ValidateQueryParser<ExtendContext>} [config.queryParse] Parse query before validation. 'true' for default parser or provide a custom parser
 * @param {Validator<Record<string, string>,ExtendContext>} [config.query] Query validator
 * @param {CustomErrorType} [config.queryErrors] Query validator's expected error instance types other than Error derivatives
 * @param {boolean|ValidateCookieParser<ExtendContext>} [config.cookieParse] Parse cookie before validation. 'true' for default parser or provide a custom parser
 * @param {Validator<Record<string, string>,ExtendContext>} [config.cookie] Cookie validator
 * @param {CustomErrorType} [config.cookieErrors] Cookie validator's expected error instance types other than Error derivatives
 * @param {ParseBodyOptions} [config.bodyParseOptions] Body parser options
 * @param {boolean|ValidateBodyParser<ExtendContext>} [config.bodyParse] Parse body before validation. 'true' for default parser or provide a custom parser
 * @param {ValidatorFnIt<ParsedBody,ExtendContext>|Array<ValidatorIt<ParsedBody,ExtendContext>>} [config.body] Body validator
 * @param {CustomErrorType} [config.bodyErrors] Body validator's expected error instance types other than Error derivatives
 * @param {Array<CustomErrorType>} [config.errors] All validator's expected error instance types other than Error derivatives. Can be overridden.
 * @param {boolean} [config.paramsMutation] Modify object with validated return value of the params validator function
 * @param {boolean} [config.queryMutation] Modify object with validated return value of the query validator function
 * @param {boolean} [config.cookieMutation] Modify object with validated return value of the cookie validator function
 * @param {boolean} [config.bodyMutation] Modify object with validated return value of the body validator function
 * @param {boolean|{<Target extends Record<string, unknown>>(target: Target,key: string,):void|any;}} [config.strangeParams] Handle strange or unexpected properties.
 *     - If false excludes strange properties from the mutated object.
 * @param {boolean|{<Target extends Record<string, unknown>>(target: Target,key: string,):void|any;}} [config.strangeQuery] Handle strange or unexpected properties.
 *     - If false excludes strange properties from the mutated object.
 * @param {boolean|{<Target extends Record<string, unknown>>(target: Target,key: string,):void|any;}} [config.strangeCookie] Handle strange or unexpected properties.
 *     - If false excludes strange properties from the mutated object.
 * @param {boolean|{<Target extends Record<string, unknown>>(target: Target,key: string,):void|any;}} [config.strangeBody] Handle strange or unexpected properties.
 *     - If false excludes strange properties from the mutated object.
 * @param {boolean|{<Target extends Record<string, unknown>>(target: Target,key: string,):void|any;}} [config.strange] A default common option to handle strange or unexpected properties.
 *     - If false excludes strange properties from the mutated object.
 * @param {"status"|"text"|"json"} [config.responseType="text"] Response type.
 *     - Note: 'status' type will omit content
 * @param {boolean} [config.breakPipeline=false] If true, returns Break_Pipeline
 * @returns {HandlerReturn}
 */
const validate = ({ responseType = "text", errors, paramsMutation = false, params: paramsValidator, paramsErrors, strangeParams, queryParse, queryMutation = false, query: queryValidator, queryErrors, strangeQuery, cookieParse, cookieMutation = false, cookie: cookieValidator, cookieErrors, strangeCookie, bodyParse, bodyParseOptions, bodyMutation = false, body: bodyValidator, bodyErrors, strangeBody, strange, breakPipeline = false, }) => {
    paramsErrors = paramsErrors !== null && paramsErrors !== void 0 ? paramsErrors : errors;
    queryErrors = queryErrors !== null && queryErrors !== void 0 ? queryErrors : errors;
    cookieErrors = cookieErrors !== null && cookieErrors !== void 0 ? cookieErrors : errors;
    bodyErrors = bodyErrors !== null && bodyErrors !== void 0 ? bodyErrors : errors;
    const errorMatches = (target, errors) => {
        for (const error of errors) {
            if (target instanceof error) {
                return true;
            }
        }
        return false;
    };
    // Validate error instance types
    if (errors) {
        for (let i = 0; i < errors.length; i++) {
            const error = errors[i];
            if (!(typeof error === "function")) {
                throw new TypeError(`Validator errors type at index ${i} is invalid`);
            }
        }
    }
    if (paramsErrors) {
        for (let i = 0; i < paramsErrors.length; i++) {
            const error = paramsErrors[i];
            if (!(typeof error === "function")) {
                throw new TypeError(`Validator paramsErrors type at index ${i} is invalid`);
            }
        }
    }
    if (queryErrors) {
        for (let i = 0; i < queryErrors.length; i++) {
            const error = queryErrors[i];
            if (!(typeof error === "function")) {
                throw new TypeError(`Validator queryErrors type at index ${i} is invalid`);
            }
        }
    }
    if (cookieErrors) {
        for (let i = 0; i < cookieErrors.length; i++) {
            const error = cookieErrors[i];
            if (!(typeof error === "function")) {
                throw new TypeError(`Validator cookieErrors type at index ${i} is invalid`);
            }
        }
    }
    if (bodyErrors) {
        for (let i = 0; i < bodyErrors.length; i++) {
            const error = bodyErrors[i];
            if (!(typeof error === "function")) {
                throw new TypeError(`Validator bodyErrors type at index ${i} is invalid`);
            }
        }
    }
    //
    strangeParams = strangeParams !== null && strangeParams !== void 0 ? strangeParams : strange;
    strangeQuery = strangeQuery !== null && strangeQuery !== void 0 ? strangeQuery : strange;
    strangeCookie = strangeCookie !== null && strangeCookie !== void 0 ? strangeCookie : strange;
    strangeBody = strangeBody !== null && strangeBody !== void 0 ? strangeBody : strange;
    // Validate strangeParams
    if (strangeParams != undefined &&
        typeof strangeParams !== "boolean" &&
        typeof strangeParams !== "function") {
        throw new TypeError("Validator strangeParams type must be either boolean, undefined or a function");
    }
    // Validate strangeQuery
    if (strangeQuery != undefined &&
        typeof strangeQuery !== "boolean" &&
        typeof strangeQuery !== "function") {
        throw new TypeError("Validator strangeQuery type must be either boolean, undefined or a function");
    }
    // Validate strangeCookie
    if (strangeCookie != undefined &&
        typeof strangeCookie !== "boolean" &&
        typeof strangeCookie !== "function") {
        throw new TypeError("Validator strangeCookie type must be either boolean, undefined or a function");
    }
    // Validate strangeBody
    if (strangeBody != undefined &&
        typeof strangeBody !== "boolean" &&
        typeof strangeBody !== "function") {
        throw new TypeError("Validator strangeBody type must be either boolean, undefined or a function");
    }
    // Validate query parser
    if (queryParse != undefined &&
        typeof queryParse !== "boolean" &&
        typeof queryParse !== "function") {
        throw new TypeError("Validator queryParse type must be either boolean, undefined or a function");
    }
    // Validate cookie parser
    if (cookieParse != undefined &&
        typeof cookieParse !== "boolean" &&
        typeof cookieParse !== "function") {
        throw new TypeError("Validator cookieParse type must be either boolean, undefined or a function");
    }
    // Validate body parser
    if (bodyParse != undefined &&
        typeof bodyParse !== "boolean" &&
        typeof bodyParse !== "function") {
        throw new TypeError("Validator bodyParse type must be either boolean, undefined or a function");
    }
    const respond = responseType === "json"
        ? (code, content, key, tag, init) => (0, helpers_ts_1.json)({ [key]: `${tag}: ${content}`, tag }, Object.assign(Object.assign({}, init), { status: code }))
        : responseType === "text"
            ? (code, content, key, tag, init) => (0, helpers_ts_1.text)(`[${key}] ${tag}: ${content}`, Object.assign(Object.assign({}, init), { status: code }))
            : (code, _content, _key, _tag, init) => (0, helpers_ts_1.status)(code, null, init);
    //
    // Prepare parsers
    //
    const queryParser = queryParse === true
        ? ((ctx) => {
            if (ctx.query == null) {
                ctx.query = {};
            }
            const searchParams = ctx.url.searchParams;
            for (const [key, value] of searchParams) {
                ctx.query[key] = value;
            }
        })
        : queryParse || undefined;
    const cookieParser = cookieParse === true
        ? ((ctx) => {
            if (ctx.cookie == null) {
                ctx.cookie = {};
            }
            (0, parsers_ts_1.parseCookieFromRequest)(ctx.request, ctx.cookie);
        })
        : cookieParse || undefined;
    const bodyParser = bodyParse === true
        ? (0, parsers_ts_1.parseBody)(bodyParseOptions)
        : bodyParse || undefined;
    ///////////////////////////////////////////////////////////////////////////
    // Validate params validators
    const paramsValidatorIsFunction = typeof paramsValidator === "function";
    const paramsValidatorIsObject = typeof paramsValidator === "object" && !Array.isArray(paramsValidator);
    if (paramsValidator) {
        if (!paramsValidatorIsFunction && !paramsValidatorIsObject) {
            throw new TypeError("Params validator type must be function or object");
        }
        else if (paramsValidatorIsObject) {
            for (const key of Object.keys(paramsValidator)) {
                if (typeof paramsValidator[key] !== "function") {
                    throw new TypeError(`Params validator property type must be function at '${key}'`);
                }
            }
        }
    }
    // Validate query validators
    const queryValidatorIsFunction = typeof queryValidator === "function";
    const queryValidatorIsObject = typeof queryValidator === "object" && !Array.isArray(queryValidator);
    if (queryValidator) {
        if (!queryValidatorIsFunction && !queryValidatorIsObject) {
            throw new TypeError("Query validator type must be function or object");
        }
        else if (queryValidatorIsObject) {
            for (const key of Object.keys(queryValidator)) {
                if (typeof queryValidator[key] !== "function") {
                    throw new TypeError(`Query validator property type must be function at '${key}'`);
                }
            }
        }
    }
    // Validate cookie validators
    const cookieValidatorIsFunction = typeof cookieValidator === "function";
    const cookieValidatorIsObject = typeof cookieValidator === "object" && !Array.isArray(cookieValidator);
    if (cookieValidator) {
        if (!cookieValidatorIsFunction && !cookieValidatorIsObject) {
            throw new TypeError("Cookie validator type must be function or object");
        }
        else if (cookieValidatorIsObject) {
            for (const key of Object.keys(cookieValidator)) {
                if (typeof cookieValidator[key] !== "function") {
                    throw new TypeError(`Cookie validator property type must be function at '${key}'`);
                }
            }
        }
    }
    // Validate body validators
    const bodyValidatorIsFunction = typeof bodyValidator === "function";
    const bodyValidatorIsArray = Array.isArray(bodyValidator);
    const bodyValidatorIsObject = typeof bodyValidator === "object" && !bodyValidatorIsArray;
    const bodyValidators = bodyValidator
        ? Array.isArray(bodyValidator)
            ? bodyValidator
            : [bodyValidator]
        : undefined;
    bodyParseOptions = Object.assign(Object.assign({}, bodyParseOptions), { responseType });
    if (bodyValidators) {
        if (!bodyValidatorIsFunction &&
            !bodyValidatorIsObject &&
            !bodyValidatorIsArray) {
            throw new TypeError("Body validator type must be function or object or array of objects");
        }
        else if (bodyValidatorIsArray && bodyValidators.length === 0) {
            throw new TypeError("Body validator must not be an empty array");
        }
        for (let i = 0; i < bodyValidators.length; i++) {
            const validator = bodyValidators[i];
            const bodyValidatorIsFunction = typeof validator === "function";
            const validatorIsObject = typeof validator === "object" && !Array.isArray(validator);
            if (!bodyValidatorIsFunction && !validatorIsObject) {
                throw new TypeError(bodyValidators.length > 0
                    ? `Body validator must be a valid function or object at ${i}`
                    : "Body validator must be a valid function or object");
            }
            else if (validatorIsObject) {
                for (const key of Object.keys(validator)) {
                    if (typeof validator[key] !== "function") {
                        throw new TypeError(bodyValidatorIsArray
                            ? `Body validator property type must be function at index ${i} '${key}'`
                            : `Body validator property type must be function at '${key}'`);
                    }
                }
            }
        }
    }
    ////////////////////////////////////////////////////////////////////////
    return (ctx) => __awaiter(void 0, void 0, void 0, function* () {
        const params = ctx.params;
        // Validate Params
        if (paramsValidatorIsFunction) {
            const result = paramsValidator.bind
                ? paramsValidator.bind(ctx)(params)
                : paramsValidator(params);
            if (result instanceof Error) {
                const status = result.status || status_ts_1.Status._400_BadRequest;
                return respond(status, result.message, status >= 500 ? "error" : "message", "params-validator");
            }
            else if (paramsErrors && errorMatches(result, paramsErrors)) {
                const status = result.status || status_ts_1.Status._400_BadRequest;
                return respond(status, String(result), status >= 500 ? "error" : "message", "params-validator");
            }
            else if (result instanceof Response ||
                result === types_ts_1.Break_Pipe ||
                result === types_ts_1.Break_Pipeline) {
                return result;
            }
            else if (paramsMutation) {
                ctx.params = result;
            }
        }
        else if (paramsValidator) {
            const keys = Object.keys(paramsValidator);
            for (const key of Object.keys(params)) {
                if (!(key in paramsValidator)) {
                    keys.push(key);
                }
            }
            for (const key of keys) {
                const validator = paramsValidator[key];
                if (validator == null && !strangeParams) {
                    continue;
                }
                const result = validator == null
                    ? typeof strangeParams === "function"
                        ? strangeParams(key, params)
                        : params[key]
                    : validator.bind
                        ? validator.bind(ctx)(params[key])
                        : validator(params[key]);
                if (result instanceof Error) {
                    const status = result.status || status_ts_1.Status._400_BadRequest;
                    return respond(status, result.message, status >= 500 ? "error" : "message", "params-validator");
                }
                else if (paramsErrors && errorMatches(result, paramsErrors)) {
                    const status = result.status || status_ts_1.Status._400_BadRequest;
                    return respond(status, String(result), status >= 500 ? "error" : "message", "params-validator");
                }
                else if (result instanceof Response ||
                    result === types_ts_1.Break_Pipe ||
                    result === types_ts_1.Break_Pipeline) {
                    return result;
                }
                else if (paramsMutation) {
                    params[key] = result;
                }
            }
        }
        // Parse query
        if (queryParser) {
            const response = yield queryParser(ctx);
            if (response instanceof Response) {
                return response;
            }
        }
        const query = ctx.query;
        // Validate Query
        if (queryValidatorIsFunction) {
            const result = queryValidator.bind
                ? queryValidator.bind(ctx)(query)
                : queryValidator(query);
            if (result instanceof Error) {
                const status = result.status || status_ts_1.Status._400_BadRequest;
                return respond(status, result.message, status >= 500 ? "error" : "message", "query-validator");
            }
            else if (queryErrors && errorMatches(result, queryErrors)) {
                const status = result.status || status_ts_1.Status._400_BadRequest;
                return respond(status, String(result), status >= 500 ? "error" : "message", "query-validator");
            }
            else if (result instanceof Response ||
                result === types_ts_1.Break_Pipe ||
                result === types_ts_1.Break_Pipeline) {
                return result;
            }
            else if (queryMutation) {
                ctx.query = result;
            }
        }
        else if (queryValidator) {
            const keys = Object.keys(queryValidator);
            for (const key of Object.keys(query)) {
                if (!(key in queryValidator)) {
                    keys.push(key);
                }
            }
            for (const key of keys) {
                const validator = queryValidator[key];
                if (validator == null && !strangeQuery) {
                    continue;
                }
                const result = validator == null
                    ? typeof strangeQuery === "function"
                        ? strangeQuery(key, query)
                        : query[key]
                    : validator.bind
                        ? validator.bind(ctx)(query[key])
                        : validator(query[key]);
                if (result instanceof Error) {
                    const status = result.status || status_ts_1.Status._400_BadRequest;
                    return respond(status, result.message, status >= 500 ? "error" : "message", "query-validator");
                }
                else if (queryErrors && errorMatches(result, queryErrors)) {
                    const status = result.status || status_ts_1.Status._400_BadRequest;
                    return respond(status, String(result), status >= 500 ? "error" : "message", "query-validator");
                }
                else if (result instanceof Response ||
                    result === types_ts_1.Break_Pipe ||
                    result === types_ts_1.Break_Pipeline) {
                    return result;
                }
                else if (queryMutation) {
                    query[key] = result;
                }
            }
        }
        // Parse cookie
        if (cookieParser) {
            const response = yield cookieParser(ctx);
            if (response instanceof Response) {
                return response;
            }
        }
        const cookie = ctx.cookie;
        // Validate Cookie
        if (cookieValidatorIsFunction) {
            const result = cookieValidator.bind
                ? cookieValidator.bind(ctx)(cookie)
                : cookieValidator(cookie);
            if (result instanceof Error) {
                const status = result.status || status_ts_1.Status._400_BadRequest;
                return respond(status, result.message, status >= 500 ? "error" : "message", "cookie-validator");
            }
            else if (cookieErrors && errorMatches(result, cookieErrors)) {
                const status = result.status || status_ts_1.Status._400_BadRequest;
                return respond(status, String(result), status >= 500 ? "error" : "message", "cookie-validator");
            }
            else if (result instanceof Response ||
                result === types_ts_1.Break_Pipe ||
                result === types_ts_1.Break_Pipeline) {
                return result;
            }
            else if (cookieMutation) {
                ctx.cookie = result;
            }
        }
        else if (cookieValidator) {
            const keys = Object.keys(cookieValidator);
            for (const key of Object.keys(cookie)) {
                if (!(key in cookieValidator)) {
                    keys.push(key);
                }
            }
            for (const key of keys) {
                const validator = cookieValidator[key];
                if (validator == null && !strangeCookie) {
                    continue;
                }
                const result = validator == null
                    ? typeof strangeCookie === "function"
                        ? strangeCookie(key, cookie)
                        : cookie[key]
                    : validator.bind
                        ? validator.bind(ctx)(cookie[key])
                        : validator(cookie[key]);
                if (result instanceof Error) {
                    const status = result.status || status_ts_1.Status._400_BadRequest;
                    return respond(status, result.message, status >= 500 ? "error" : "message", "cookie-validator");
                }
                else if (cookieErrors && errorMatches(result, cookieErrors)) {
                    const status = result.status || status_ts_1.Status._400_BadRequest;
                    return respond(status, String(result), status >= 500 ? "error" : "message", "cookie-validator");
                }
                else if (result instanceof Response ||
                    result === types_ts_1.Break_Pipe ||
                    result === types_ts_1.Break_Pipeline) {
                    return result;
                }
                else if (cookieMutation) {
                    cookie[key] = result;
                }
            }
        }
        // Parse body
        if (bodyParser) {
            const response = yield bodyParser(ctx);
            if (response instanceof Response) {
                return response;
            }
        }
        const body = ctx.body;
        // Validate Body
        if (bodyValidators) {
            const bodyIsArray = Array.isArray(body);
            if (bodyValidatorIsArray && !bodyIsArray) {
                const status = status_ts_1.Status._400_BadRequest;
                return respond(status, "array body type expected", status >= 500 ? "error" : "message", "body-validator");
            }
            else if (!bodyValidatorIsArray && bodyIsArray) {
                const status = status_ts_1.Status._400_BadRequest;
                return respond(status, "object body type expected", status >= 500 ? "error" : "message", "body-validator");
            }
            if (bodyIsArray) {
                for (let i = 0; i < body.length; i++) {
                    const validator = bodyValidators[i % bodyValidators.length];
                    const activeBody = body[i];
                    if (typeof validator === "function") {
                        const result = validator.bind
                            ? validator.bind(ctx)(activeBody, i)
                            : validator(activeBody, i);
                        if (result instanceof Error) {
                            const status = result.status || status_ts_1.Status._400_BadRequest;
                            return respond(status, result.message, status >= 500 ? "error" : "message", "body-validator");
                        }
                        else if (bodyErrors && errorMatches(result, bodyErrors)) {
                            const status = result.status || status_ts_1.Status._400_BadRequest;
                            return respond(status, String(result), status >= 500 ? "error" : "message", "body-validator");
                        }
                        else if (result instanceof Response ||
                            result === types_ts_1.Break_Pipe ||
                            result === types_ts_1.Break_Pipeline) {
                            return result;
                        }
                        else if (bodyMutation) {
                            body[i] = result;
                        }
                    }
                    else if (validator) {
                        if (activeBody &&
                            typeof activeBody === "object" &&
                            !Array.isArray(activeBody)) {
                            const keys = Object.keys(validator);
                            for (const key of Object.keys(activeBody)) {
                                if (!(key in validator)) {
                                    keys.push(key);
                                }
                            }
                            for (const key of keys) {
                                const propValidator = validator[key];
                                if (propValidator == null && !strangeBody) {
                                    if (bodyMutation) {
                                        delete activeBody[key];
                                    }
                                    continue;
                                }
                                const result = propValidator == null
                                    ? typeof strangeBody === "function"
                                        ? strangeBody(key, activeBody, i)
                                        : activeBody[key]
                                    : propValidator.bind
                                        ? propValidator.bind(ctx)(activeBody[key], i)
                                        : propValidator(activeBody[key], i);
                                if (result instanceof Error) {
                                    const status = result.status || status_ts_1.Status._400_BadRequest;
                                    return respond(status, result.message, status >= 500 ? "error" : "message", "body-validator");
                                }
                                else if (bodyErrors && errorMatches(result, bodyErrors)) {
                                    const status = result.status || status_ts_1.Status._400_BadRequest;
                                    return respond(status, String(result), status >= 500 ? "error" : "message", "body-validator");
                                }
                                else if (result instanceof Response ||
                                    result === types_ts_1.Break_Pipe ||
                                    result === types_ts_1.Break_Pipeline) {
                                    return result;
                                }
                                else if (bodyMutation) {
                                    activeBody[key] = result;
                                }
                            }
                        }
                        else {
                            return respond(status_ts_1.Status._400_BadRequest, `Invalid body type at index ${i}`, "message", "body-validator");
                        }
                    }
                }
            }
            else {
                const validator = bodyValidators[0];
                if (typeof validator === "function") {
                    const result = validator.bind
                        ? validator.bind(ctx)(body)
                        : validator(body);
                    if (result instanceof Error) {
                        const status = result.status || status_ts_1.Status._400_BadRequest;
                        return respond(status, result.message, status >= 500 ? "error" : "message", "body-validator");
                    }
                    else if (bodyErrors && errorMatches(result, bodyErrors)) {
                        const status = result.status || status_ts_1.Status._400_BadRequest;
                        return respond(status, String(result), status >= 500 ? "error" : "message", "body-validator");
                    }
                    else if (result instanceof Response ||
                        result === types_ts_1.Break_Pipe ||
                        result === types_ts_1.Break_Pipeline) {
                        return result;
                    }
                    else if (bodyMutation) {
                        ctx.body = result;
                    }
                }
                else if (validator) {
                    if (body && typeof body === "object" && !Array.isArray(body)) {
                        const keys = Object.keys(validator);
                        for (const key of Object.keys(body)) {
                            if (!(key in validator)) {
                                keys.push(key);
                            }
                        }
                        for (const key of keys) {
                            const propValidator = validator[key];
                            if (propValidator == null && !strangeBody) {
                                if (bodyMutation) {
                                    delete body[key];
                                }
                                continue;
                            }
                            const result = propValidator == null
                                ? typeof strangeBody === "function"
                                    ? strangeBody(key, body)
                                    : body[key]
                                : propValidator.bind
                                    ? propValidator.bind(ctx)(body[key])
                                    : propValidator(body[key]);
                            if (result instanceof Error) {
                                const status = result.status || status_ts_1.Status._400_BadRequest;
                                return respond(status, result.message, status >= 500 ? "error" : "message", "body-validator");
                            }
                            else if (bodyErrors && errorMatches(result, bodyErrors)) {
                                const status = result.status || status_ts_1.Status._400_BadRequest;
                                return respond(status, String(result), status >= 500 ? "error" : "message", "body-validator");
                            }
                            else if (result instanceof Response ||
                                result === types_ts_1.Break_Pipe ||
                                result === types_ts_1.Break_Pipeline) {
                                return result;
                            }
                            else if (bodyMutation) {
                                body[key] = result;
                            }
                        }
                    }
                    else {
                        return respond(status_ts_1.Status._400_BadRequest, "Invalid body type", "message", "body-validator");
                    }
                }
            }
        }
        if (breakPipeline) {
            return types_ts_1.Break_Pipeline;
        }
    });
};
exports.validate = validate;
//# sourceMappingURL=middlewares.js.map