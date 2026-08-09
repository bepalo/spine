import { status } from "./helpers.ts";
import {
  Break_Pipeline,
  HttpError,
  HttpMethodUpper,
  RouterError,
  type Context,
  type Handler,
  type HttpMethod,
} from "./types.ts";

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
export const limitRate = <
  ExtendContext extends Record<string, unknown> = Record<string, never>,
>(config: {
  key: (ctx: Context<ExtendContext>) => string | Promise<string>;
  maxTokens: number;
  refillInterval?: number;
  refillRate?: number;
  cleanUpInterval?: number;
  cleanUpIdleDelay?: number;
  setXRateLimitHeaders?: boolean;
  breakPipeline?: boolean;
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
  } = config;
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
        return status(429);
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
        return status(429);
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
  throw new RouterError(
    "LIMIT-RATE: `refillInterval` or `refillRate` or both should be set",
  );
};

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
export const cors = <
  ExtendContext extends Record<string, unknown> = Record<string, never>,
>(config?: {
  origins: "*" | string | string[];
  methods?: HttpMethod[] | null;
  allowedHeaders?: string[] | null;
  exposedHeaders?: string[] | null;
  credentials?: boolean | null;
  maxAge?: number | null;
  varyOrigin?: boolean;
  breakPipeline?: boolean;
}): Handler<ExtendContext> => {
  const {
    origins = "*",
    methods = ["Get", "Head", "Put", "Patch", "Post", "Delete"],
    allowedHeaders = ["Content-Type", "Authorization"],
    exposedHeaders,
    credentials = false,
    maxAge = 86400,
    varyOrigin = false,
    breakPipeline = false,
  } = config ?? {};
  const globOrigin = origins === "*" ? "*" : null;
  const originsSet = new Set(
    typeof origins !== "string" ? origins : origins !== "*" ? [] : [origins],
  );
  if (methods != null) {
    for (let i = 0; i < methods.length; i++) {
      (methods as any)[i] = methods[i].toUpperCase() as HttpMethodUpper;
    }
  }
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
      if (varyOrigin) ctx.headers.append("Vary", "Origin");
      if (breakPipeline) {
        return Break_Pipeline;
      }
      return;
    }
    headers.set("Access-Control-Allow-Origin", corsOrigin);
    if (credentials) {
      if (corsOrigin === "*")
        throw new HttpError(
          403,
          "CORS: Cannot use credentials with wildcard origin",
        );
      headers.set("Access-Control-Allow-Credentials", "true");
    }
    if (exposedHeaders && exposedHeaders.length > 0) {
      headers.set("Access-Control-Expose-Headers", exposedHeaders.join(", "));
    }
    if (varyOrigin) {
      headers.append("Vary", "Origin");
    }
    if (request.method === "OPTIONS") {
      if (methods && methods.length > 0) {
        const requestMethod = request.headers.get(
          "Access-Control-Request-Method",
        );
        if (requestMethod && !methods.includes(requestMethod as HttpMethod)) {
          return status(405, `Method ${requestMethod} not allowed`);
        }
        headers.set("Access-Control-Allow-Methods", methods.join(", "));
      }
      if (allowedHeaders && allowedHeaders.length > 0) {
        headers.set("Access-Control-Allow-Headers", allowedHeaders.join(", "));
      }
      if (maxAge) {
        headers.set("Access-Control-Max-Age", maxAge.toString());
      }
      return status(204, null);
    }
    if (breakPipeline) {
      return Break_Pipeline;
    }
  };
};
