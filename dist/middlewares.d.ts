import type { HttpMethodLower, HttpMethodUpper, Context, Handler, HttpMethod, XFrameOptions, ReferrerPolicy, ContentSecurityPolicyParams, StrictTransportSecurityParams, CrossOriginOpenerPolicy, CrossOriginEmbedderPolicy, CrossOriginResourcePolicy, ContentSecurityPolicyArrayParams, StrictTransportSecurity, ContentSecurityPolicySource, ContentSecurityPolicyFetchDirectiveType } from "./types.ts";
/**
 * Force http into https
 *
 * @returns {Handler<ExtendContext>} Middleware function
 *
 */
export declare const forceHttps: <ExtendContext extends Record<string, unknown> = {}>(config?: {
    toPort?: number;
}) => Handler<ExtendContext>;
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
export declare const securityHeaders: <ExtendContext extends Record<string, unknown> = {}>(config?: {
    referrerPolicy?: ReferrerPolicy | null;
    xFrameOptions?: XFrameOptions | null;
    strictTransportSecurity?: StrictTransportSecurity | StrictTransportSecurityParams | boolean | null;
    /**
     * @property [config.contentSecurityPolicy] When using the array version
     *   please take note of whitespace usage to differentiate between some values.
     *   NOTE: Custom values require a preceding space.
     *
     * @example
     * contentSecurityPolicy: {
     *   "default-src": "'self'",
     *   "object-src": "'none'",
     *   "frame-ancestors": "'none'",
     *   "script-src style-src font-src": [
     *     "'self'",
     *     "https://unpkg.com",
     *     "'unsafe-inline'",
     *   ],
     *   "script-src": [
     *     "'self'",
     *     "'strict-dynamic'",
     *     `'nonce-${toBase64UUID(crypto.randomUUID())}'`,
     *     "'unsafe-inline'",
     *   ],
     *   "img-src": [ "'self'", "data:" ],
     *   "upgrade-insecure-requests": true,
     *   "trusted-types": " type-a type-b",
     *   // "trusted-types": "'none'",
     * }
     *
     * @example
     * contentSecurityPolicy: {
     *   [ "default-src", "'self'" ],
     *   [ "object-src", "'none'" ],
     *   [ "frame-ancestors", "'none'" ],
     *   [
     *     "script-src style-src font-src",
     *     "'self'",
     *     "https://unpkg.com",
     *     "'unsafe-inline'",
     *   ],
     *   [
     *     "script-src",
     *     "'self'",
     *     "'strict-dynamic'",
     *     `'nonce-${toBase64UUID(crypto.randomUUID())}'`,
     *     "'unsafe-inline'",
     *   ],
     *   [ "img-src", "'self'", "data:" ],
     *   [ "upgrade-insecure-requests" ],
     *   [ "trusted-types", " type-a type-b" ],
     *   // [ "trusted-types", "'none'" ],
     * }
     *
     */
    contentSecurityPolicy?: ContentSecurityPolicyArrayParams | ContentSecurityPolicyParams | (ContentSecurityPolicyParams & { [K in string as K extends keyof ContentSecurityPolicyFetchDirectiveType | "upgrade-insecure-requests" | "trusted-types" ? never : K]: ContentSecurityPolicySource | ContentSecurityPolicySource[]; }) | null;
    crossOriginOpenerPolicy?: CrossOriginOpenerPolicy;
    /**
     * @property
     */
    crossOriginEmbedderPolicy?: CrossOriginEmbedderPolicy;
    crossOriginResourcePolicy?: CrossOriginResourcePolicy;
    /**
     * @property [config.headers] Extra headers to set.
     */
    headers?: [string, string][] | Record<string, string>;
}) => Handler<ExtendContext>;
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
export declare const limitRate: <ExtendContext extends Record<string, unknown> = {}>(config: {
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
export declare const cors: <ExtendContext extends Record<string, unknown> = {}>(config?: {
    origins: "*" | string | string[];
    methods?: (HttpMethod | HttpMethodUpper | HttpMethodLower)[] | null;
    allowedHeaders?: string[] | null;
    exposedHeaders?: string[] | null;
    credentials?: boolean | null;
    maxAge?: number | null;
    varyOrigin?: boolean;
    breakPipeline?: boolean;
}) => Handler<ExtendContext>;
//# sourceMappingURL=middlewares.d.ts.map