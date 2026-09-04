// src/middlewares.ts

import {
  buildContentSecurityPolicy,
  buildStrictTransportSecurity,
  json,
  redirectPermanentPreserve,
  status,
  text,
} from "./helpers.ts";
import {
  CTBody,
  CTCookie,
  CTParams,
  CTQuery,
  ParseBodyOptions,
  parseCookieFromRequest,
  ParsedBody,
  parseBody,
} from "./parsers.ts";
import { Status } from "./status.ts";
import { Break_Pipe, Break_Pipeline, HttpError } from "./types.ts";
import type {
  HttpMethodLower,
  HttpMethodUpper,
  Context,
  Handler,
  HttpMethod,
  XFrameOptions,
  ReferrerPolicy,
  ContentSecurityPolicyParams,
  StrictTransportSecurityParams,
  CrossOriginOpenerPolicy,
  CrossOriginEmbedderPolicy,
  CrossOriginResourcePolicy,
  ContentSecurityPolicyArrayParams,
  StrictTransportSecurity,
  ContentSecurityPolicySource,
  ContentSecurityPolicyFetchDirectiveType,
  HandlerReturn,
} from "./types.ts";

/**
 * Force http into https
 *
 * @returns {Handler<ExtendContext>} Middleware function
 *
 */
export const forceHttps = <
  ExtendContext extends Record<string, unknown> = {},
>(config?: {
  toPort?: number;
}): Handler<ExtendContext> => {
  const toPort = config?.toPort ?? 443;
  return function ({ url }: Context<ExtendContext>) {
    if (url.protocol === "http:") {
      const newUrl = new URL(url);
      newUrl.protocol = "https:";
      newUrl.port = toPort === 443 ? "" : String(toPort);
      return redirectPermanentPreserve(newUrl.toString());
    }
  };
};

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
export const securityHeaders = <
  ExtendContext extends Record<string, unknown> = {},
>(config?: {
  referrerPolicy?: ReferrerPolicy | null;
  xFrameOptions?: XFrameOptions | null;
  strictTransportSecurity?:
    | StrictTransportSecurity
    | StrictTransportSecurityParams
    | boolean
    | null;
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
  contentSecurityPolicy?:
    | ContentSecurityPolicyArrayParams
    | ContentSecurityPolicyParams
    | (ContentSecurityPolicyParams & {
        [K in string as K extends
          | keyof ContentSecurityPolicyFetchDirectiveType
          | "upgrade-insecure-requests"
          | "trusted-types"
          ? never
          : K]: ContentSecurityPolicySource | ContentSecurityPolicySource[];
      })
    | null;
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
}): Handler<ExtendContext> => {
  const {
    crossOriginOpenerPolicy,
    crossOriginEmbedderPolicy,
    crossOriginResourcePolicy,
    referrerPolicy,
    xFrameOptions = "DENY",
    strictTransportSecurity: hsts_,
    contentSecurityPolicy: csp_,
    headers,
  } = config ?? {};
  const hsts =
    hsts_ == null
      ? undefined
      : typeof hsts_ === "string"
        ? hsts_
        : typeof hsts_ === "boolean"
          ? hsts_
            ? buildStrictTransportSecurity({})
            : undefined
          : buildStrictTransportSecurity(hsts_);
  const contentSecurityPolicy =
    csp_ == null ? undefined : buildContentSecurityPolicy(csp_);
  /////////////////////////////////////////////
  const preparedHeaders: [string, string][] = [];
  if (headers != null) {
    if (Array.isArray(headers)) {
      for (const [key, value] of headers) {
        preparedHeaders.push([key, value]);
      }
    } else {
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
  return function ({ headers }: Context<ExtendContext>) {
    for (const [key, value] of preparedHeaders) {
      headers.set(key, value);
    }
  };
};

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
export const limitRate = <
  ExtendContext extends Record<string, unknown> = {},
>(config: {
  key: (ctx: Context<ExtendContext>) => string | Promise<string>;
  maxTokens: number;
  refillInterval?: number;
  refillRate?: number;
  cleanUpInterval?: number;
  cleanUpIdleDelay?: number;
  setXRateLimitHeaders?: boolean;
  breakPipeline?: boolean;
  responseType?: "text" | "status" | "json";
}): Handler<ExtendContext> => {
  type CacheEntry = {
    tokens: number;
    lastRefill: number;
  };
  const {
    key,
    maxTokens,
    refillInterval,
    refillRate,
    cleanUpInterval,
    setXRateLimitHeaders = false,
    breakPipeline = false,
    responseType = "text",
  } = config;
  const respond =
    responseType === "json"
      ? (
          code: number,
          content: string,
          key: string,
          tag: string,
          init?: ResponseInit,
        ) =>
          json({ [key]: `${tag}: ${content}`, tag }, { ...init, status: code })
      : responseType === "text"
        ? (
            code: number,
            content: string,
            key: string,
            tag: string,
            init?: ResponseInit,
          ) => text(`[${key}] ${tag}: ${content}`, { ...init, status: code })
        : (
            code: number,
            _content: string | undefined | null,
            _key: string,
            _tag: string,
            init?: ResponseInit,
          ) => status(code, null, init);
  const cleanUpIdleDelay = -(config.cleanUpIdleDelay ?? 0);
  const rateLimits: Map<string, CacheEntry> = new Map();
  const now = () => performance.now() / 1000;
  const getRateLimits = (id: string) => {
    let entry = rateLimits.get(id);
    if (entry == null) {
      entry = {
        tokens: maxTokens,
        lastRefill: now(),
      } as CacheEntry;
      rateLimits.set(id, entry);
    }
    return entry;
  };
  const timeToFill = (key: string) => {
    const entry = rateLimits.get(key);
    if (entry == null) {
      return undefined;
    }
    const timeElapsed = now() - entry.lastRefill;
    if (refillInterval != null) {
      const timeLeft =
        refillRate != null
          ? (maxTokens - entry.tokens) / (refillRate / refillInterval) -
            timeElapsed
          : refillInterval - timeElapsed;
      return timeLeft;
    } else if (refillRate != null) {
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
    return async function (ctx: Context<ExtendContext>) {
      const id = await key(ctx);
      const entry = getRateLimits(id);
      const timeElapsed = now() - entry.lastRefill;
      if (timeElapsed >= refillInterval) {
        if (refillRate != null) {
          const newTokens =
            entry.tokens +
            refillRate * Math.floor(timeElapsed / refillInterval);
          entry.tokens = Math.min(newTokens, maxTokens);
          entry.lastRefill = now();
        } else {
          entry.tokens = maxTokens;
          entry.lastRefill = now();
        }
      }
      if (entry.tokens <= 0) {
        ctx.headers.set(
          "Retry-After",
          Math.ceil(refillInterval - timeElapsed).toFixed(),
        );
        return respond(
          Status._429_TooManyRequests,
          "Rate Limited",
          "message",
          "rate-limit",
        );
      } else {
        entry.tokens--;
      }
      if (setXRateLimitHeaders) {
        ctx.headers.set("X-RateLimit-Limit", maxTokens.toFixed());
        ctx.headers.set("X-RateLimit-Remaining", entry.tokens.toFixed());
      }
      if (breakPipeline) {
        return Break_Pipeline;
      }
    };
  } else if (refillRate != null) {
    return async function (ctx: Context<ExtendContext>) {
      const id = await key(ctx);
      const entry = getRateLimits(id);
      const timeElapsed = now() - entry.lastRefill;
      const newTokens = entry.tokens + refillRate * timeElapsed;
      entry.tokens = Math.min(newTokens, maxTokens);
      entry.lastRefill = now();
      if (entry.tokens <= 0) {
        ctx.headers.set("Retry-After", Math.ceil(1 / refillRate).toFixed());
        return respond(
          Status._429_TooManyRequests,
          "Rate Limited",
          "message",
          "rate-limit",
        );
      } else {
        entry.tokens--;
      }
      if (setXRateLimitHeaders) {
        ctx.headers.set("X-RateLimit-Limit", maxTokens.toFixed());
        ctx.headers.set(
          "X-RateLimit-Remaining",
          Math.max(0, entry.tokens).toFixed(),
        );
      }
      if (breakPipeline) {
        return Break_Pipeline;
      }
    };
  }
  throw new Error(
    "LIMIT-RATE: `refillInterval` or `refillRate` or both should be set",
  );
};

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
export const cors = <
  ExtendContext extends Record<string, unknown> = {},
>(config?: {
  origins: "*" | string | string[];
  methods?: (HttpMethod | HttpMethodUpper | HttpMethodLower)[] | null;
  allowedHeaders?: string[] | null;
  exposedHeaders?: string[] | null;
  credentials?: boolean | null;
  maxAge?: number | null;
  varyOrigin?: boolean;
  breakPipeline?: boolean;
  responseType?: "text" | "status" | "json";
}): Handler<ExtendContext> => {
  const {
    origins = "*",
    methods: methods_ = ["Get", "Head", "Put", "Patch", "Post", "Delete"],
    allowedHeaders = ["Content-Type", "Authorization"],
    exposedHeaders,
    credentials = false,
    maxAge = 86400,
    varyOrigin = true,
    breakPipeline = false,
    responseType = "text",
  } = config ?? {};
  const respond =
    responseType === "json"
      ? (
          code: number,
          content: string,
          key: string,
          tag: string,
          init?: ResponseInit,
        ) =>
          json({ [key]: `${tag}: ${content}`, tag }, { ...init, status: code })
      : responseType === "text"
        ? (
            code: number,
            content: string,
            key: string,
            tag: string,
            init?: ResponseInit,
          ) => text(`[${key}] ${tag}: ${content}`, { ...init, status: code })
        : (
            code: number,
            _content: string | undefined | null,
            _key: string,
            _tag: string,
            init?: ResponseInit,
          ) => status(code, null, init);
  const globOrigin = origins === "*" ? "*" : null;
  const originsSet = new Set(
    origins === "*" ? [] : typeof origins === "string" ? [origins] : origins,
  );
  const methods = methods_?.map((m) => m.toUpperCase()) as HttpMethodUpper[];
  return function (ctx: Context<ExtendContext>) {
    const { request, headers } = ctx;
    const origin = request.headers.get("origin");
    let corsOrigin: string | null = null;
    if (!origin) {
      if (breakPipeline) {
        return Break_Pipeline;
      }
      return;
    }
    if (globOrigin) {
      corsOrigin = "*";
    } else {
      corsOrigin = originsSet.has(origin) ? origin : null;
    }
    if (!corsOrigin) {
      if (varyOrigin) {
        headers.append("Vary", "Origin");
      }
      if (breakPipeline) {
        return Break_Pipeline;
      }
      return;
    }
    headers.set("Access-Control-Allow-Origin", corsOrigin);
    if (credentials) {
      if (corsOrigin === "*")
        throw new HttpError(
          Status._403_Forbidden,
          "CORS: Cannot use credentials with wildcard origin",
        );
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
        const requestMethod = request.headers.get(
          "Access-Control-Request-Method",
        );
        if (
          requestMethod &&
          !methods.includes(requestMethod as HttpMethodUpper)
        ) {
          return respond(
            Status._405_MethodNotAllowed,
            `Method ${requestMethod} not allowed`,
            "error",
            "CORS",
          );
        }
        headers.set("Access-Control-Allow-Methods", methods.join(", "));
      }
      if (allowedHeaders && allowedHeaders.length > 0) {
        headers.set("Access-Control-Allow-Headers", allowedHeaders.join(", "));
      }
      if (maxAge != null) {
        headers.set("Access-Control-Max-Age", maxAge.toString());
      }
      return status(Status._204_NoContent, null);
    }
    if (breakPipeline) {
      return Break_Pipeline;
    }
  };
};

/**
 * Types used as validator target
 */
export type ValidateTargetTypes = {
  params: Record<string, string>;
  query: Record<string, string>;
  cookie: Record<string, string>;
  body: ParsedBody;
};

type CTFrom<
  ExtendContext extends Record<string, unknown> = {},
  Options extends Pick<
    ValidateOptions<ExtendContext>,
    "params" | "query" | "cookie" | "body"
  > = Pick<
    ValidateOptions<ExtendContext>,
    "params" | "query" | "cookie" | "body"
  >,
> = {
  [K in keyof Options as {} extends Options[K]
    ? K
    : never]: K extends keyof ValidateTargetTypes
    ? ValidateTargetTypes[K]
    : never;
};

// ArkType type forward declaration
declare type Type<t = unknown, $ = {}> = any;

// Custom error type
type CustomErrorType = abstract new (...args: any[]) => unknown;

export type ValidatorReturn<T = unknown> =
  | Exclude<HandlerReturn, void>
  | Error
  | HttpError
  | T;

export type ValidatorFn<
  Target,
  ExtendContext extends Record<string, unknown> = {},
> = Type<any, any> & {
  (target: Target): ValidatorReturn<Target>;
  (this: Context<ExtendContext>, target: Target): ValidatorReturn<Target>;
};

export type ValidatorFnIt<
  Target,
  ExtendContext extends Record<string, unknown> = {},
> = Type<any, any> & {
  (target: Target): ValidatorReturn<Target>;
  (target: Target, index: number): ValidatorReturn<Target>;
  (this: Context<ExtendContext>, target: Target): ValidatorReturn<Target>;
  (
    this: Context<ExtendContext>,
    target: Target,
    index: number,
  ): ValidatorReturn<Target>;
};

export type PropValidator<
  Target,
  ExtendContext extends Record<string, unknown> = {},
> = {
  (target: Target): ValidatorReturn<Target>;
  (this: Context<ExtendContext>, target: Target): ValidatorReturn<Target>;
};

export type PropValidatorIt<
  Target,
  ExtendContext extends Record<string, unknown> = {},
> = {
  (target: Target, index: number): ValidatorReturn<Target>;
  (
    this: Context<ExtendContext>,
    target: Target,
    index: number,
  ): ValidatorReturn<Target>;
};

export type Validator<
  Target,
  ExtendContext extends Record<string, unknown> = {},
> =
  | ValidatorFn<Target, ExtendContext>
  | (Target extends Record<string, unknown>
      ? { [K in keyof Target]: PropValidator<Target[K], ExtendContext> }
      : never);

export type ValidatorIt<
  Target,
  ExtendContext extends Record<string, unknown> = {},
> =
  | ValidatorFnIt<Target, ExtendContext>
  | (Target extends Record<string, unknown>
      ? { [K in keyof Target]: PropValidatorIt<Target[K], ExtendContext> }
      : never);

export type ValidateQueryParser<
  ExtendContext extends Record<string, unknown> = {},
> = {
  (ctx: Context<CTQuery & ExtendContext>): Promise<void> | void;
};

export type ValidateCookieParser<
  ExtendContext extends Record<string, unknown> = {},
> = {
  (ctx: Context<CTCookie & ExtendContext>): Promise<void> | void;
};

export type ValidateBodyParser<
  ExtendContext extends Record<string, unknown> = {},
> = {
  (ctx: Context<CTBody & ExtendContext>): Promise<void> | void;
};

export type ValidatorStrangeReturnType = Error | HttpError | unknown;

/**
 * Options type for validator middleware function.
 */
export interface ValidateOptions<
  ExtendContext extends
    | ({ params: Record<string, string> } & (
        | { query: Record<string, string> }
        | { cookie: Record<string, string> }
        | { body: ParsedBody }
        | { query: Record<string, string>; body: ParsedBody }
        | { query: Record<string, string>; cookie: Record<string, string> }
        | { cookie: Record<string, string>; body: ParsedBody }
        | {
            query: Record<string, string>;
            cookie: Record<string, string>;
            body: ParsedBody;
          }
      ))
    | Record<string, unknown> = {},
> {
  responseType?: "text" | "status" | "json";
  errors?: Array<CustomErrorType>;

  paramsMutation?: boolean;
  params?: Validator<Record<string, string>, ExtendContext>;
  paramsErrors?: Array<CustomErrorType>;
  strangeParams?:
    | boolean
    | {
        <Target extends Record<string, unknown> = {}>(
          key: string,
          target: Target,
        ): ValidatorStrangeReturnType;
      };

  queryParse?: boolean | ValidateQueryParser<ExtendContext>;
  queryMutation?: boolean;
  query?: Validator<Record<string, string>, ExtendContext>;
  queryErrors?: Array<CustomErrorType>;
  strangeQuery?:
    | boolean
    | {
        <Target extends Record<string, unknown> = {}>(
          key: string,
          target: Target,
        ): ValidatorStrangeReturnType;
      };

  cookieParse?: boolean | ValidateCookieParser<ExtendContext>;
  cookieMutation?: boolean;
  cookie?: Validator<Record<string, string>, ExtendContext>;
  cookieErrors?: Array<CustomErrorType>;
  strangeCookie?:
    | boolean
    | {
        <Target extends Record<string, unknown> = {}>(
          key: string,
          target: Target,
        ): ValidatorStrangeReturnType;
      };

  bodyParseOptions?: ParseBodyOptions;
  bodyParse?: boolean | ValidateBodyParser<ExtendContext>;
  bodyMutation?: boolean;
  body?:
    | Validator<ParsedBody, ExtendContext>
    | Array<ValidatorIt<ParsedBody, ExtendContext>>;
  bodyErrors?: Array<CustomErrorType>;
  strangeBody?:
    | boolean
    | {
        <Target extends Record<string, unknown> = {}>(
          key: string,
          target: Target,
          index?: number,
        ): ValidatorStrangeReturnType;
      };

  strange?:
    | boolean
    | {
        <Target extends Record<string, unknown> = {}>(
          key: string,
          target: Target,
        ): ValidatorStrangeReturnType;
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
export const validate = <
  ExtendContext extends Record<string, unknown> = {},
  Options extends ValidateOptions<ExtendContext> =
    ValidateOptions<ExtendContext>,
>({
  responseType = "text",
  errors,

  paramsMutation = false,
  params: paramsValidator,
  paramsErrors,
  strangeParams,

  queryParse,
  queryMutation = false,
  query: queryValidator,
  queryErrors,
  strangeQuery,

  cookieParse,
  cookieMutation = false,
  cookie: cookieValidator,
  cookieErrors,
  strangeCookie,

  bodyParse,
  bodyParseOptions,
  bodyMutation = false,
  body: bodyValidator,
  bodyErrors,
  strangeBody,

  strange,
  breakPipeline = false,
}: Options): Handler<ExtendContext & CTFrom<ExtendContext, Options>> => {
  paramsErrors = paramsErrors ?? errors;
  queryErrors = queryErrors ?? errors;
  cookieErrors = cookieErrors ?? errors;
  bodyErrors = bodyErrors ?? errors;
  const errorMatches = (target: unknown, errors: Array<CustomErrorType>) => {
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
        throw new TypeError(
          `Validator paramsErrors type at index ${i} is invalid`,
        );
      }
    }
  }
  if (queryErrors) {
    for (let i = 0; i < queryErrors.length; i++) {
      const error = queryErrors[i];
      if (!(typeof error === "function")) {
        throw new TypeError(
          `Validator queryErrors type at index ${i} is invalid`,
        );
      }
    }
  }
  if (cookieErrors) {
    for (let i = 0; i < cookieErrors.length; i++) {
      const error = cookieErrors[i];
      if (!(typeof error === "function")) {
        throw new TypeError(
          `Validator cookieErrors type at index ${i} is invalid`,
        );
      }
    }
  }
  if (bodyErrors) {
    for (let i = 0; i < bodyErrors.length; i++) {
      const error = bodyErrors[i];
      if (!(typeof error === "function")) {
        throw new TypeError(
          `Validator bodyErrors type at index ${i} is invalid`,
        );
      }
    }
  }
  //
  strangeParams = strangeParams ?? strange;
  strangeQuery = strangeQuery ?? strange;
  strangeCookie = strangeCookie ?? strange;
  strangeBody = strangeBody ?? strange;
  // Validate strangeParams
  if (
    strangeParams != undefined &&
    typeof strangeParams !== "boolean" &&
    typeof strangeParams !== "function"
  ) {
    throw new TypeError(
      "Validator strangeParams type must be either boolean, undefined or a function",
    );
  }
  // Validate strangeQuery
  if (
    strangeQuery != undefined &&
    typeof strangeQuery !== "boolean" &&
    typeof strangeQuery !== "function"
  ) {
    throw new TypeError(
      "Validator strangeQuery type must be either boolean, undefined or a function",
    );
  }
  // Validate strangeCookie
  if (
    strangeCookie != undefined &&
    typeof strangeCookie !== "boolean" &&
    typeof strangeCookie !== "function"
  ) {
    throw new TypeError(
      "Validator strangeCookie type must be either boolean, undefined or a function",
    );
  }
  // Validate strangeBody
  if (
    strangeBody != undefined &&
    typeof strangeBody !== "boolean" &&
    typeof strangeBody !== "function"
  ) {
    throw new TypeError(
      "Validator strangeBody type must be either boolean, undefined or a function",
    );
  }
  // Validate query parser
  if (
    queryParse != undefined &&
    typeof queryParse !== "boolean" &&
    typeof queryParse !== "function"
  ) {
    throw new TypeError(
      "Validator queryParse type must be either boolean, undefined or a function",
    );
  }
  // Validate cookie parser
  if (
    cookieParse != undefined &&
    typeof cookieParse !== "boolean" &&
    typeof cookieParse !== "function"
  ) {
    throw new TypeError(
      "Validator cookieParse type must be either boolean, undefined or a function",
    );
  }
  // Validate body parser
  if (
    bodyParse != undefined &&
    typeof bodyParse !== "boolean" &&
    typeof bodyParse !== "function"
  ) {
    throw new TypeError(
      "Validator bodyParse type must be either boolean, undefined or a function",
    );
  }
  const respond =
    responseType === "json"
      ? (
          code: number,
          content: string,
          key: string,
          tag: string,
          init?: ResponseInit,
        ) =>
          json({ [key]: `${tag}: ${content}`, tag }, { ...init, status: code })
      : responseType === "text"
        ? (
            code: number,
            content: string,
            key: string,
            tag: string,
            init?: ResponseInit,
          ) => text(`[${key}] ${tag}: ${content}`, { ...init, status: code })
        : (
            code: number,
            _content: string | undefined | null,
            _key: string,
            _tag: string,
            init?: ResponseInit,
          ) => status(code, null, init);
  //
  // Prepare parsers
  //
  const queryParser =
    queryParse === true
      ? (((ctx) => {
          if (ctx.query == null) {
            ctx.query = {};
          }
          const searchParams = ctx.url.searchParams;
          for (const key of searchParams.keys()) {
            const values = searchParams.getAll(key);
            (ctx.query as any)[key] =
              values.length > 1 ? values[values.length - 1]! : values[0]!;
          }
        }) as ValidateQueryParser<ExtendContext>)
      : queryParse || undefined;
  const cookieParser =
    cookieParse === true
      ? (((ctx) => {
          if (ctx.cookie == null) {
            ctx.cookie = {};
          }
          parseCookieFromRequest(ctx.request, ctx.cookie);
        }) as ValidateCookieParser<ExtendContext>)
      : cookieParse || undefined;
  const bodyParser =
    bodyParse === true
      ? (parseBody(bodyParseOptions) as ValidateBodyParser<ExtendContext>)
      : bodyParse || undefined;
  ///////////////////////////////////////////////////////////////////////////
  // Validate params validators
  const paramsValidatorIsFunction = typeof paramsValidator === "function";
  const paramsValidatorIsObject =
    typeof paramsValidator === "object" && !Array.isArray(paramsValidator);
  if (paramsValidator) {
    if (!paramsValidatorIsFunction && !paramsValidatorIsObject) {
      throw new TypeError("Params validator type must be function or object");
    } else if (paramsValidatorIsObject) {
      for (const key of Object.keys(paramsValidator)) {
        if (typeof paramsValidator[key] !== "function") {
          throw new TypeError(
            `Params validator property type must be function at '${key}'`,
          );
        }
      }
    }
  }
  // Validate query validators
  const queryValidatorIsFunction = typeof queryValidator === "function";
  const queryValidatorIsObject =
    typeof queryValidator === "object" && !Array.isArray(queryValidator);
  if (queryValidator) {
    if (!queryValidatorIsFunction && !queryValidatorIsObject) {
      throw new TypeError("Query validator type must be function or object");
    } else if (queryValidatorIsObject) {
      for (const key of Object.keys(queryValidator)) {
        if (typeof queryValidator[key] !== "function") {
          throw new TypeError(
            `Query validator property type must be function at '${key}'`,
          );
        }
      }
    }
  }
  // Validate cookie validators
  const cookieValidatorIsFunction = typeof cookieValidator === "function";
  const cookieValidatorIsObject =
    typeof cookieValidator === "object" && !Array.isArray(cookieValidator);
  if (cookieValidator) {
    if (!cookieValidatorIsFunction && !cookieValidatorIsObject) {
      throw new TypeError("Cookie validator type must be function or object");
    } else if (cookieValidatorIsObject) {
      for (const key of Object.keys(cookieValidator)) {
        if (typeof cookieValidator[key] !== "function") {
          throw new TypeError(
            `Cookie validator property type must be function at '${key}'`,
          );
        }
      }
    }
  }
  // Validate body validators
  const bodyValidatorIsFunction = typeof bodyValidator === "function";
  const bodyValidatorIsArray = Array.isArray(bodyValidator);
  const bodyValidatorIsObject =
    typeof bodyValidator === "object" && !bodyValidatorIsArray;
  const bodyValidators = bodyValidator
    ? Array.isArray(bodyValidator)
      ? bodyValidator
      : [bodyValidator]
    : undefined;
  if (bodyValidators) {
    if (
      !bodyValidatorIsFunction &&
      !bodyValidatorIsObject &&
      !bodyValidatorIsArray
    ) {
      throw new TypeError(
        "Body validator type must be function or object or array of objects",
      );
    } else if (bodyValidatorIsArray && bodyValidators.length === 0) {
      throw new TypeError("Body validator must not be an empty array");
    }
    for (let i = 0; i < bodyValidators.length; i++) {
      const validator = bodyValidators[i];
      const bodyValidatorIsFunction = typeof validator === "function";
      const validatorIsObject =
        typeof validator === "object" && !Array.isArray(validator);
      if (!bodyValidatorIsFunction && !validatorIsObject) {
        throw new TypeError(
          bodyValidators.length > 0
            ? `Body validator must be a valid function or object at ${i}`
            : "Body validator must be a valid function or object",
        );
      } else if (validatorIsObject) {
        for (const key of Object.keys(validator)) {
          if (typeof validator[key] !== "function") {
            throw new TypeError(
              bodyValidatorIsArray
                ? `Body validator property type must be function at index ${i} '${key}'`
                : `Body validator property type must be function at '${key}'`,
            );
          }
        }
      }
    }
  }
  ////////////////////////////////////////////////////////////////////////
  return async (
    ctx: Context<ExtendContext & CTFrom<ExtendContext, Options>>,
  ) => {
    const params = ctx.params as ValidateTargetTypes["params"];
    // Validate Params
    if (paramsValidatorIsFunction) {
      const result = paramsValidator.bind
        ? paramsValidator.bind(ctx)(params)
        : paramsValidator(params);
      if (result instanceof Error) {
        return respond(
          (result as HttpError).status || Status._400_BadRequest,
          result.message,
          "error",
          "params-validator",
        );
      } else if (paramsErrors && errorMatches(result, paramsErrors)) {
        return respond(
          (result as HttpError).status || Status._400_BadRequest,
          String(result),
          "error",
          "params-validator",
        );
      } else if (
        result instanceof Response ||
        result === Break_Pipe ||
        result === Break_Pipeline
      ) {
        return result;
      } else if (paramsMutation) {
        (ctx as Partial<CTParams>).params = result;
      }
    } else if (paramsValidator) {
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
        const result =
          validator == null
            ? typeof strangeParams === "function"
              ? strangeParams(key, params)
              : params[key]
            : validator.bind
              ? validator.bind(ctx)(params[key])
              : validator(params[key]);
        if (result instanceof Error) {
          return respond(
            (result as HttpError).status || Status._400_BadRequest,
            result.message,
            "error",
            "params-validator",
          );
        } else if (paramsErrors && errorMatches(result, paramsErrors)) {
          return respond(
            (result as HttpError).status || Status._400_BadRequest,
            String(result),
            "error",
            "params-validator",
          );
        } else if (
          result instanceof Response ||
          result === Break_Pipe ||
          result === Break_Pipeline
        ) {
          return result;
        } else if (paramsMutation) {
          (params as ValidateTargetTypes["params"])[key] = result;
        }
      }
    }

    // Parse query
    if (queryParser) {
      await queryParser(ctx as any);
    }
    const query = ctx.query as ValidateTargetTypes["query"];

    // Validate Query
    if (queryValidatorIsFunction) {
      const result = queryValidator.bind
        ? queryValidator.bind(ctx)(query)
        : queryValidator(query);
      if (result instanceof Error) {
        return respond(
          (result as HttpError).status || Status._400_BadRequest,
          result.message,
          "error",
          "query-validator",
        );
      } else if (queryErrors && errorMatches(result, queryErrors)) {
        return respond(
          (result as HttpError).status || Status._400_BadRequest,
          String(result),
          "error",
          "query-validator",
        );
      } else if (
        result instanceof Response ||
        result === Break_Pipe ||
        result === Break_Pipeline
      ) {
        return result;
      } else if (queryMutation) {
        (ctx as Partial<CTQuery>).query = result;
      }
    } else if (queryValidator) {
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
        const result =
          validator == null
            ? typeof strangeQuery === "function"
              ? strangeQuery(key, query)
              : query[key]
            : validator.bind
              ? validator.bind(ctx)(query[key])
              : validator(query[key]);
        if (result instanceof Error) {
          return respond(
            (result as HttpError).status || Status._400_BadRequest,
            result.message,
            "error",
            "query-validator",
          );
        } else if (queryErrors && errorMatches(result, queryErrors)) {
          return respond(
            (result as HttpError).status || Status._400_BadRequest,
            String(result),
            "error",
            "query-validator",
          );
        } else if (
          result instanceof Response ||
          result === Break_Pipe ||
          result === Break_Pipeline
        ) {
          return result;
        } else if (queryMutation) {
          (query as ValidateTargetTypes["query"])[key] = result;
        }
      }
    }

    // Parse cookie
    if (cookieParser) {
      await cookieParser(ctx as any);
    }
    const cookie = ctx.cookie as ValidateTargetTypes["cookie"];

    // Validate Cookie
    if (cookieValidatorIsFunction) {
      const result = cookieValidator.bind
        ? cookieValidator.bind(ctx)(cookie)
        : cookieValidator(cookie);
      if (result instanceof Error) {
        return respond(
          (result as HttpError).status || Status._400_BadRequest,
          result.message,
          "error",
          "cookie-validator",
        );
      } else if (cookieErrors && errorMatches(result, cookieErrors)) {
        return respond(
          (result as HttpError).status || Status._400_BadRequest,
          String(result),
          "error",
          "cookie-validator",
        );
      } else if (
        result instanceof Response ||
        result === Break_Pipe ||
        result === Break_Pipeline
      ) {
        return result;
      } else if (cookieMutation) {
        (ctx as Partial<CTCookie>).cookie = result;
      }
    } else if (cookieValidator) {
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
        const result =
          validator == null
            ? typeof strangeCookie === "function"
              ? strangeCookie(key, cookie)
              : cookie[key]
            : validator.bind
              ? validator.bind(ctx)(cookie[key])
              : validator(cookie[key]);
        if (result instanceof Error) {
          return respond(
            (result as HttpError).status || Status._400_BadRequest,
            result.message,
            "error",
            "cookie-validator",
          );
        } else if (cookieErrors && errorMatches(result, cookieErrors)) {
          return respond(
            (result as HttpError).status || Status._400_BadRequest,
            String(result),
            "error",
            "cookie-validator",
          );
        } else if (
          result instanceof Response ||
          result === Break_Pipe ||
          result === Break_Pipeline
        ) {
          return result;
        } else if (cookieMutation) {
          (cookie as ValidateTargetTypes["cookie"])[key] = result;
        }
      }
    }

    // Parse body
    if (bodyParser) {
      await bodyParser(ctx as any);
    }
    const body = ctx.body as ValidateTargetTypes["body"];
    // Validate Body
    if (bodyValidators) {
      const bodyIsArray = Array.isArray(body);
      if (bodyValidatorIsArray && !bodyIsArray) {
        return respond(
          Status._400_BadRequest,
          "array body type expected",
          "error",
          "body-validator",
        );
      } else if (!bodyValidatorIsArray && bodyIsArray) {
        return respond(
          Status._400_BadRequest,
          "object body type expected",
          "error",
          "body-validator",
        );
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
              return respond(
                (result as HttpError).status || Status._400_BadRequest,
                result.message,
                "error",
                "body-validator",
              );
            } else if (bodyErrors && errorMatches(result, bodyErrors)) {
              return respond(
                (result as HttpError).status || Status._400_BadRequest,
                String(result),
                "error",
                "body-validator",
              );
            } else if (
              result instanceof Response ||
              result === Break_Pipe ||
              result === Break_Pipeline
            ) {
              return result;
            } else if (bodyMutation) {
              body[i] = result;
            }
          } else if (validator) {
            if (
              activeBody &&
              typeof activeBody === "object" &&
              !Array.isArray(activeBody)
            ) {
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
                    delete (activeBody as Record<string, ParsedBody>)[key];
                  }
                  continue;
                }
                const result =
                  propValidator == null
                    ? typeof strangeBody === "function"
                      ? strangeBody(
                          key,
                          activeBody as Record<string, ParsedBody>,
                          i,
                        )
                      : (activeBody as Record<string, ParsedBody>)[key]
                    : propValidator.bind
                      ? propValidator.bind(ctx)(
                          (activeBody as Record<string, ParsedBody>)[key],
                          i,
                        )
                      : propValidator(
                          (activeBody as Record<string, ParsedBody>)[key],
                          i,
                        );
                if (result instanceof Error) {
                  return respond(
                    (result as HttpError).status || Status._400_BadRequest,
                    result.message,
                    "error",
                    "body-validator",
                  );
                } else if (bodyErrors && errorMatches(result, bodyErrors)) {
                  return respond(
                    (result as HttpError).status || Status._400_BadRequest,
                    String(result),
                    "error",
                    "body-validator",
                  );
                } else if (
                  result instanceof Response ||
                  result === Break_Pipe ||
                  result === Break_Pipeline
                ) {
                  return result;
                } else if (bodyMutation) {
                  (activeBody as Record<string, ParsedBody>)[key] = result;
                }
              }
            } else {
              return respond(
                Status._400_BadRequest,
                `Invalid body type at index ${i}`,
                "error",
                "body-validator",
              );
            }
          }
        }
      } else {
        const validator = bodyValidators[0];
        if (typeof validator === "function") {
          const result = validator.bind
            ? validator.bind(ctx)(body)
            : validator(body);
          if (result instanceof Error) {
            return respond(
              (result as HttpError).status || Status._400_BadRequest,
              result.message,
              "error",
              "body-validator",
            );
          } else if (bodyErrors && errorMatches(result, bodyErrors)) {
            return respond(
              (result as HttpError).status || Status._400_BadRequest,
              String(result),
              "error",
              "body-validator",
            );
          } else if (
            result instanceof Response ||
            result === Break_Pipe ||
            result === Break_Pipeline
          ) {
            return result;
          } else if (bodyMutation) {
            (ctx as Partial<CTBody>).body = result;
          }
        } else if (validator) {
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
                  delete (body as Record<string, ParsedBody>)[key];
                }
                continue;
              }
              const result =
                propValidator == null
                  ? typeof strangeBody === "function"
                    ? strangeBody(key, body)
                    : body[key]
                  : propValidator.bind
                    ? propValidator.bind(ctx)(body[key])
                    : propValidator(body[key]);
              if (result instanceof Error) {
                return respond(
                  (result as HttpError).status || Status._400_BadRequest,
                  result.message,
                  "error",
                  "body-validator",
                );
              } else if (bodyErrors && errorMatches(result, bodyErrors)) {
                return respond(
                  (result as HttpError).status || Status._400_BadRequest,
                  String(result),
                  "error",
                  "body-validator",
                );
              } else if (
                result instanceof Response ||
                result === Break_Pipe ||
                result === Break_Pipeline
              ) {
                return result;
              } else if (bodyMutation) {
                (body as Record<string, ParsedBody>)[key] = result as any;
              }
            }
          } else {
            return respond(
              Status._400_BadRequest,
              "Invalid body type",
              "error",
              "body-validator",
            );
          }
        }
      }
    }
    if (breakPipeline) {
      return Break_Pipeline;
    }
  };
};
