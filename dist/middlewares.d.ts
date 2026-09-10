import { CTBody, CTCookie, CTQuery, ParseBodyOptions, ParsedBody } from "./parsers.ts";
import { EndHandler, HttpError } from "./types.ts";
import { HttpMethodLower, HttpMethodUpper, Context, Handler, HttpMethod, XFrameOptions, ReferrerPolicy, ContentSecurityPolicyParams, StrictTransportSecurityParams, CrossOriginOpenerPolicy, CrossOriginEmbedderPolicy, CrossOriginResourcePolicy, ContentSecurityPolicyArrayParams, StrictTransportSecurity, ContentSecurityPolicySource, ContentSecurityPolicyFetchDirectiveType, HandlerReturn, Color } from "./types.ts";
export declare const COLORS: {
    reset: string;
    dim: string;
    bold: string;
    black: string;
    red: string;
    green: string;
    yellow: string;
    blue: string;
    magenta: string;
    cyan: string;
    white: string;
    method: {
        HEAD: string;
        GET: string;
        QUERY: string;
        POST: string;
        PUT: string;
        PATCH: string;
        DELETE: string;
        OPTIONS: string;
        TRACE: string;
        CONNECT: string;
    };
    status: (status: number) => "\u001B[31m" | "\u001B[32m" | "\u001B[33m" | "\u001B[36m";
};
/**
 * Log requests with no color
 *
 * @param options Log requests options
 */
export declare const logRequests: <ExtendContext extends Record<string, unknown> = {}>(options?: {
    logger?: (...args: any[]) => void;
    enable?: {
        requestTime?: boolean;
        duration?: boolean;
        status?: false | "status" | "status-text" | "with-status-text";
        search?: false | "singleline" | "multiline";
    };
    enclosure?: {
        requestTime?: [string, string];
        duration?: [string, string];
        status?: [string, string];
    };
    indent?: {
        search?: string;
    };
    pad?: {
        duration?: number;
        status?: number;
        method?: number;
    };
}) => EndHandler<ExtendContext>;
/**
 * Log requests with color
 *
 * @param options Log requests options
 */
export declare const logRequestsWithColor: <ExtendContext extends Record<string, unknown> = {}>(options?: {
    logger?: (...args: any[]) => void;
    enable?: {
        requestTime?: boolean;
        duration?: boolean;
        status?: false | "status" | "status-text" | "with-status-text";
        search?: false | "singleline" | "multiline";
    };
    enclosure?: {
        requestTime?: [string, string];
        duration?: [string, string];
        status?: [string, string];
    };
    indent?: {
        search?: string;
    };
    pad?: {
        duration?: number;
        status?: number;
        method?: number;
    };
    reqTime?: {
        color?: Color;
        bold?: boolean;
        dim?: boolean;
    };
    duration?: {
        color?: Color;
        bold?: boolean;
        dim?: boolean;
    };
    status?: {
        color?: Color | "auto";
        bold?: boolean;
        dim?: boolean;
    };
    method?: {
        color?: Color | "auto";
        bold?: boolean;
        dim?: boolean;
    };
    pathname?: {
        color?: Color;
        bold?: boolean;
        dim?: boolean;
    };
    search?: {
        color?: Color;
        bold?: boolean;
        dim?: boolean;
    };
}) => EndHandler<ExtendContext>;
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
export declare const limitRate: <ExtendContext extends Record<string, unknown> = {}>(config: {
    key: (ctx: Context<ExtendContext>) => string | Promise<string>;
    maxTokens: number;
    refillInterval?: number;
    refillRate?: number;
    cleanUpInterval?: number;
    cleanUpIdleDelay?: number;
    setXRateLimitHeaders?: boolean;
    breakPipeline?: boolean;
    responseType?: "text" | "status" | "json";
}) => Handler<ExtendContext>;
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
export declare const cors: <ExtendContext extends Record<string, unknown> = {}>(config?: {
    origins: "*" | string | string[];
    methods?: (HttpMethod | HttpMethodUpper | HttpMethodLower)[] | null;
    allowedHeaders?: string[] | null;
    exposedHeaders?: string[] | null;
    credentials?: boolean | null;
    maxAge?: number | null;
    varyOrigin?: boolean;
    breakPipeline?: boolean;
    responseType?: "text" | "status" | "json";
}) => Handler<ExtendContext>;
/**
 * Types used as validator target
 */
export type ValidateTargetTypes = {
    params: Record<string, string>;
    query: Record<string, string>;
    cookie: Record<string, string>;
    body: ParsedBody;
};
type CTFrom<ExtendContext extends Record<string, unknown> = {}, Options extends Pick<ValidateOptions<ExtendContext>, "params" | "query" | "cookie" | "body"> = Pick<ValidateOptions<ExtendContext>, "params" | "query" | "cookie" | "body">> = {
    [K in keyof Options as {} extends Options[K] ? K : never]: K extends keyof ValidateTargetTypes ? ValidateTargetTypes[K] : never;
};
declare type Type<t = unknown, $ = {}> = any;
type CustomErrorType = abstract new (...args: any[]) => unknown;
export type ValidatorReturn<T = unknown> = Exclude<HandlerReturn, void> | Error | HttpError | T;
export type ValidatorFn<Target, ExtendContext extends Record<string, unknown> = {}> = Type<any, any> & {
    (target: Target): ValidatorReturn<Target>;
    (this: Context<ExtendContext>, target: Target): ValidatorReturn<Target>;
};
export type ValidatorFnIt<Target, ExtendContext extends Record<string, unknown> = {}> = Type<any, any> & {
    (target: Target): ValidatorReturn<Target>;
    (target: Target, index: number): ValidatorReturn<Target>;
    (this: Context<ExtendContext>, target: Target): ValidatorReturn<Target>;
    (this: Context<ExtendContext>, target: Target, index: number): ValidatorReturn<Target>;
};
export type PropValidator<Target, ExtendContext extends Record<string, unknown> = {}> = {
    (target: Target): ValidatorReturn<Target>;
    (this: Context<ExtendContext>, target: Target): ValidatorReturn<Target>;
};
export type PropValidatorIt<Target, ExtendContext extends Record<string, unknown> = {}> = {
    (target: Target, index: number): ValidatorReturn<Target>;
    (this: Context<ExtendContext>, target: Target, index: number): ValidatorReturn<Target>;
};
export type Validator<Target, ExtendContext extends Record<string, unknown> = {}> = ValidatorFn<Target, ExtendContext> | (Target extends Record<string, unknown> ? {
    [K in keyof Target]: PropValidator<Target[K], ExtendContext>;
} : never);
export type ValidatorIt<Target, ExtendContext extends Record<string, unknown> = {}> = ValidatorFnIt<Target, ExtendContext> | (Target extends Record<string, unknown> ? {
    [K in keyof Target]: PropValidatorIt<Target[K], ExtendContext>;
} : never);
export type ValidateQueryParser<ExtendContext extends Record<string, unknown> = {}> = {
    (ctx: Context<CTQuery & ExtendContext>): Promise<Response | void> | Response | void;
};
export type ValidateCookieParser<ExtendContext extends Record<string, unknown> = {}> = {
    (ctx: Context<CTCookie & ExtendContext>): Promise<Response | void> | Response | void;
};
export type ValidateBodyParser<ExtendContext extends Record<string, unknown> = {}> = {
    (ctx: Context<CTBody & ExtendContext>): Promise<Response | void> | Response | void;
};
export type ValidatorStrangeReturnType = Error | HttpError | unknown;
/**
 * Options type for validator middleware function.
 */
export interface ValidateOptions<ExtendContext extends ({
    params: Record<string, string>;
} & ({
    query: Record<string, string>;
} | {
    cookie: Record<string, string>;
} | {
    body: ParsedBody;
} | {
    query: Record<string, string>;
    body: ParsedBody;
} | {
    query: Record<string, string>;
    cookie: Record<string, string>;
} | {
    cookie: Record<string, string>;
    body: ParsedBody;
} | {
    query: Record<string, string>;
    cookie: Record<string, string>;
    body: ParsedBody;
})) | Record<string, unknown> = {}> {
    responseType?: "text" | "status" | "json";
    errors?: Array<CustomErrorType>;
    paramsMutation?: boolean;
    params?: Validator<Record<string, string>, ExtendContext>;
    paramsErrors?: Array<CustomErrorType>;
    strangeParams?: boolean | {
        <Target extends Record<string, unknown> = {}>(key: string, target: Target): ValidatorStrangeReturnType;
    };
    queryParse?: boolean | ValidateQueryParser<ExtendContext>;
    queryMutation?: boolean;
    query?: Validator<Record<string, string>, ExtendContext>;
    queryErrors?: Array<CustomErrorType>;
    strangeQuery?: boolean | {
        <Target extends Record<string, unknown> = {}>(key: string, target: Target): ValidatorStrangeReturnType;
    };
    cookieParse?: boolean | ValidateCookieParser<ExtendContext>;
    cookieMutation?: boolean;
    cookie?: Validator<Record<string, string>, ExtendContext>;
    cookieErrors?: Array<CustomErrorType>;
    strangeCookie?: boolean | {
        <Target extends Record<string, unknown> = {}>(key: string, target: Target): ValidatorStrangeReturnType;
    };
    bodyParseOptions?: Pick<ParseBodyOptions, "accept" | "maxSize" | "clone" | "once">;
    bodyParse?: boolean | ValidateBodyParser<ExtendContext>;
    bodyMutation?: boolean;
    body?: Validator<ParsedBody, ExtendContext> | Array<ValidatorIt<ParsedBody, ExtendContext>>;
    bodyErrors?: Array<CustomErrorType>;
    strangeBody?: boolean | {
        <Target extends Record<string, unknown> = {}>(key: string, target: Target, index?: number): ValidatorStrangeReturnType;
    };
    strange?: boolean | {
        <Target extends Record<string, unknown> = {}>(key: string, target: Target): ValidatorStrangeReturnType;
    };
    breakPipeline?: boolean;
}
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
export declare const validate: <ExtendContext extends Record<string, unknown> = {}, Options extends ValidateOptions<ExtendContext> = ValidateOptions<ExtendContext>>({ responseType, errors, paramsMutation, params: paramsValidator, paramsErrors, strangeParams, queryParse, queryMutation, query: queryValidator, queryErrors, strangeQuery, cookieParse, cookieMutation, cookie: cookieValidator, cookieErrors, strangeCookie, bodyParse, bodyParseOptions, bodyMutation, body: bodyValidator, bodyErrors, strangeBody, strange, breakPipeline, }: Options) => Handler<ExtendContext & CTFrom<ExtendContext, Options>>;
export {};
//# sourceMappingURL=middlewares.d.ts.map