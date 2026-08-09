import { type Context, type Handler, type HttpMethod } from "./types.ts";
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
 * @returns {Function} Middleware function that enforces rate limits
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
 * @throws {RouterError} If neither refillInterval nor refillRate is provided
 */
export declare const limitRate: <ExtendContext extends Record<string, unknown> = Record<string, never>>(config: {
    key: (ctx: Context<ExtendContext>) => string | Promise<string>;
    maxTokens: number;
    refillInterval?: number;
    refillRate?: number;
    cleanUpInterval?: number;
    cleanUpIdleDelay?: number;
    setXRateLimitHeaders?: boolean;
    breakPipeline?: boolean;
}) => Handler<ExtendContext>;
/**
 * Creates a CORS (Cross-Origin Resource Sharing) middleware.
 * Supports preflight requests and configurable CORS headers.
 *
 * @template {Record<string, unknown>} ExtendContext - Extend Router Context
 * @param {Object} [config] - CORS configuration
 * @param {string|string[]|"*"} [config.origins="*"] - Allowed origins (wildcard "*", single origin, or array)
 * @param {HttpMethod[]} [config.methods=["GET","HEAD","PUT","PATCH","POST","DELETE"]] - Allowed HTTP methods
 * @param {string[]} [config.allowedHeaders=["Content-Type","Authorization"]] - Allowed request headers
 * @param {string[]} [config.exposedHeaders] - Headers exposed to the browser
 * @param {boolean} [config.credentials=false] - Allow credentials (cookies, authorization headers)
 * @param {number} [config.maxAge=86400] - Maximum age for preflight cache in seconds
 * @param {boolean} [config.varyOrigin=false] - Add Vary: Origin header for caching
 * @param {boolean} [options.breakPipeline=false] - If true, stops only pipeline flow per handler type after success.
 * @returns {Function} Middleware function that handles CORS headers
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
 *   methods: ["GET", "POST", "PUT", "DELETE"],
 *   allowedHeaders: ["Content-Type", "Authorization", "X-Custom-Header"]
 * });
 *
 * @throws {HttpError} If credentials is true with wildcard origin ("*")
 */
export declare const cors: <ExtendContext extends Record<string, unknown> = Record<string, never>>(config?: {
    origins: "*" | string | string[];
    methods?: HttpMethod[] | null;
    allowedHeaders?: string[] | null;
    exposedHeaders?: string[] | null;
    credentials?: boolean | null;
    maxAge?: number | null;
    varyOrigin?: boolean;
    breakPipeline?: boolean;
}) => Handler<ExtendContext>;
//# sourceMappingURL=middlewares.d.ts.map