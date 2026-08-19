// src/helpers.ts

import Router from "./router.ts";
import { getHttpStatusText } from "./status.ts";
import type {
  ContentSecurityPolicyArrayParams,
  ContentSecurityPolicyFetchDirectiveType,
  ContentSecurityPolicyParams,
  ContentSecurityPolicySource,
  Context,
  Handler,
  HttpMethod,
  StrictTransportSecurityParams,
} from "./types.ts";

const VALID_CSP_DIRS = new Set([
  "default-src",
  "script-src",
  "style-src",
  "img-src",
  "font-src",
  "connect-src",
  "media-src",
  "object-src",
  "frame-src",
  "worker-src",
  "manifest-src",
  "base-uri",
  "form-action",
  "frame-ancestors",
  "trusted-types",
]);

/**
 * Builds and returns a Content-Security-Policy response header value from params.
 *
 * @param {ContentSecurityPolicyParams} policy CSP params
 * @returns {string} The built Content-Security-Policy value
 */
export const buildContentSecurityPolicy = (
  policy:
    | ContentSecurityPolicyArrayParams
    | ContentSecurityPolicyParams
    | (ContentSecurityPolicyParams & {
        [K in string as K extends
          | keyof ContentSecurityPolicyFetchDirectiveType
          | "upgrade-insecure-requests"
          | "trusted-types"
          ? never
          : K]: ContentSecurityPolicySource | ContentSecurityPolicySource[];
      }),
): string => {
  const policyIsArray = Array.isArray(policy);
  const directives: string[] = [];
  const entries = policyIsArray ? policy : Object.entries(policy);
  for (const [keys_, ...source] of entries) {
    const keys = keys_.trim();
    if (keys === "upgrade-insecure-requests") {
      if (source) {
        directives.push("upgrade-insecure-requests");
      }
      continue;
    }
    const splitKeys = keys
      .split(" ")
      .filter(Boolean)
      .map((k) => k.toLowerCase());
    for (const key of splitKeys) {
      if (!VALID_CSP_DIRS.has(key)) {
        throw new Error(`Invalid Content-Security-Policy directive '${key}'`);
      }
      directives.push(
        Array.isArray(source)
          ? source.length > 0
            ? `${key} ${source.join(" ")}`
            : key
          : `${key} ${source}`,
      );
    }
  }
  return directives.join("; ");
};

/**
 * Builds and returns a Strict-Transport-Security(HSTS) response header value from params.
 *
 * @param {StrictTransportSecurityParams} strictTransportSecurity HSTS params
 * @returns {string} The built Strict-Transport-Security value
 */
export const buildStrictTransportSecurity = (
  strictTransportSecurity: StrictTransportSecurityParams,
): string => {
  const {
    maxAge = 31536000,
    includeSubDomains,
    preload,
  } = strictTransportSecurity;
  if (!Number.isInteger(maxAge) || maxAge < 0) {
    throw new RangeError("HSTS maxAge must be a positive whole number");
  }
  let hstsVal = `max-age=${maxAge}`;
  if (includeSubDomains) {
    hstsVal += "; includeSubDomains";
  }
  if (preload) {
    hstsVal += "; preload";
  }
  return hstsVal;
};

/**
 * Creates a Response with the specified status code.
 * Defaults to 'text/plain; charset=utf-8' content-type if not provided in init.headers.
 * @param {number} status - The HTTP status code
 * @param {string|null} [content] - The response body content
 * @param {ResponseInit} [init] - Additional response initialization options
 * @returns {Response} A Response object
 * @example
 * status(200, "Success");
 * status(404, "Not Found");
 * status(204, null); // No content response
 */
export const status = (
  status: number,
  content?: string | null,
  init?: ResponseInit,
): Response => {
  const statusText = init?.statusText ?? getHttpStatusText(status);
  const headers = new Headers(init?.headers);
  if (content !== null && !headers.has("content-type")) {
    headers.set("content-type", "text/plain; charset=utf-8");
  }
  return new Response(content !== undefined ? content : statusText, {
    ...init,
    status,
    statusText,
    headers,
  });
};

/**
 * Creates a redirect Response.
 * Defaults to 302 Found unless another status is provided.
 * @param {string} location - The URL to redirect to
 * @param {ResponseInit} [init] - Additional response initialization options
 * @returns {Response} A Response object with Location header
 */
export const redirect = (location: string, init?: ResponseInit): Response => {
  const status = init?.status ?? 302;
  const statusText = init?.statusText ?? getHttpStatusText(status);
  const headers = new Headers(init?.headers);
  headers.set("Location", location);
  return new Response(null, {
    ...init,
    status,
    statusText,
    headers,
  });
};

/**
 * Creates a redirect Response.
 * Forces a status of 302 Found.
 * @param {string} location - The URL to redirect to
 * @param {Omit<ResponseInit,"status"|"statusText">} [init] - Additional response initialization options
 * @returns {Response} A Response object with Location header
 */
export const redirectTemporary = (
  location: string,
  init?: Omit<ResponseInit, "status" | "statusText">,
): Response => {
  const status = 302;
  const statusText = getHttpStatusText(status);
  const headers = new Headers(init?.headers);
  headers.set("Location", location);
  return new Response(null, {
    ...init,
    status,
    statusText,
    headers,
  });
};

/**
 * Creates a redirect Response.
 * Forces a status of 301 Permanent Redirect.
 * @param {string} location - The URL to redirect to
 * @param {Omit<ResponseInit,"status">} [init] - Additional response initialization options
 * @returns {Response} A Response object with Location header
 */
export const redirectPermanent = (
  location: string,
  init?: Omit<ResponseInit, "status" | "statusText">,
): Response => {
  const status = 301;
  const statusText = getHttpStatusText(status);
  const headers = new Headers(init?.headers);
  headers.set("Location", location);
  return new Response(null, {
    ...init,
    status,
    statusText,
    headers,
  });
};

/**
 * Creates a redirect Response.
 * Forces a status of 307 Temporary Redirect with preserved method and body.
 *
 * @param {string} location - The URL to redirect to
 * @param {Omit<ResponseInit,"status">} [init] - Additional response initialization options
 * @returns {Response} A Response object with Location header
 */
export const redirectTemporaryPreserve = (
  location: string,
  init?: Omit<ResponseInit, "status" | "statusText">,
): Response => {
  const status = 307;
  const statusText = getHttpStatusText(status);
  const headers = new Headers(init?.headers);
  headers.set("Location", location);
  return new Response(null, {
    ...init,
    status,
    statusText,
    headers,
  });
};

/**
 * Creates a redirect Response.
 * Forces a status of 308 Permanent Redirect with preserved method and body.
 *
 * @param {string} location - The URL to redirect to
 * @param {Omit<ResponseInit,"status">} [init] - Additional response initialization options
 * @returns {Response} A Response object with Location header
 */
export const redirectPermanentPreserve = (
  location: string,
  init?: Omit<ResponseInit, "status" | "statusText">,
): Response => {
  const status = 308;
  const statusText = getHttpStatusText(status);
  const headers = new Headers(init?.headers);
  headers.set("Location", location);
  return new Response(null, {
    ...init,
    status,
    statusText,
    headers,
  });
};

/**
 * Forwards the request to another route internally.
 * Does not send a redirect to the client but changes the path and method,
 * adds X-Forwarded-[Method|Path] and X-Original-Path headers and calls
 * `(this as Router).respond(newReq, ctx)`.
 * NOTE: parse body only once at the first handler using `parseBody({once: true})`
 *   as the body will be consumed at the first parseBody call.
 * @param {Router<ExtendContext>} router - The router instance to forward to
 * @param {string} path - The new path to forward to
 * @returns {Response} A Response object with the forwarded request's response
 */
export const forward = <
  ExtendContext extends Record<string, unknown> = Record<string, never>,
>(
  router: Router<ExtendContext>,
  path: `/${string}`,
  options?: {
    method?: HttpMethod;
  },
): Handler<ExtendContext> => {
  return async function (ctx: Context<ExtendContext>) {
    const { request } = ctx;
    const method = options?.method ?? request.method;
    const headers = new Headers(request.headers);
    const body = request.body ? request.clone().body : undefined;
    const url = new URL(request.url);
    const originalPathname = url.pathname;
    url.pathname = path;
    if (method != request.method)
      headers.set("X-Forwarded-Method", request.method);
    headers.set("X-Forwarded-Path", originalPathname);
    if (!request.headers.has("X-Original-Path")) {
      headers.set("X-Original-Path", originalPathname);
    }
    const newReq = new Request(url.toString(), { method, headers, body });
    return router.respond(newReq, ctx);
  };
};

/**
 * Creates a text/plain Response.
 * Defaults to status 200 and 'text/plain; charset=utf-8' content-type if not specified.
 * @param {string} content - The text content to return
 * @param {ResponseInit} [init] - Additional response initialization options
 * @returns {Response} A Response object with text/plain content-type
 * @example
 * text("Hello, world!");
 * text("Error occurred", { status: 500 });
 */
export const text = (content: string, init?: ResponseInit): Response => {
  const status = init?.status ?? 200;
  const statusText = init?.statusText ?? getHttpStatusText(status);
  const headers = new Headers(init?.headers);
  if (!headers.has("content-type")) {
    headers.set("content-type", "text/plain; charset=utf-8");
  }
  return new Response(content, {
    ...init,
    status,
    statusText,
    headers,
  });
};

/**
 * Creates an HTML Response.
 * Defaults to status 200 and text/html content-type if not specified.
 * @param {string} content - The HTML content to return
 * @param {ResponseInit} [init] - Additional response initialization options
 * @returns {Response} A Response object with text/html content-type
 * @example
 * html("<h1>Hello</h1>");
 * html("<p>Not Found</p>", { status: 404 });
 */
export const html = (content: string, init?: ResponseInit): Response => {
  const status = init?.status ?? 200;
  const statusText = init?.statusText ?? getHttpStatusText(status);
  const headers = new Headers(init?.headers);
  if (!headers.has("content-type")) {
    headers.set("content-type", "text/html; charset=utf-8");
  }
  return new Response(content, {
    ...init,
    status,
    statusText,
    headers,
  });
};

/**
 * Creates a JSON Response.
 * Defaults to status 200 and 'application/json; charset=utf-8' content-type if not specified.
 * Uses Response.json() internally which automatically serializes the body.
 * @param {any} body - The data to serialize as JSON
 * @param {ResponseInit} [init] - Additional response initialization options
 * @returns {Response} A Response object with application/json content-type
 * @example
 * json({ message: "Success" });
 * json({ error: "Not found" }, { status: 404 });
 */
export const json = (body: any, init?: ResponseInit): Response => {
  const status = init?.status ?? 200;
  const statusText = init?.statusText ?? getHttpStatusText(status);
  const headers = new Headers(init?.headers);
  if (!headers.has("content-type")) {
    headers.set("content-type", "application/json; charset=utf-8");
  }
  return Response.json(body, {
    ...init,
    status,
    statusText,
    headers,
  });
};

/**
 * Creates a Response from a Blob.
 * Automatically sets content-type from blob.type or defaults to application/octet-stream.
 * Also sets content-length header.
 * @param {Blob} blob - The blob data to return
 * @param {ResponseInit} [init] - Additional response initialization options
 * @returns {Response} A Response object with appropriate content-type
 * @example
 * const blob = new Blob(["file content"], { type: "text/plain" });
 * blob(blob);
 */
export const blob = (blob: Blob, init?: ResponseInit): Response => {
  const status = init?.status ?? 200;
  const statusText = init?.statusText ?? getHttpStatusText(status);
  const headers = new Headers(init?.headers);
  if (!headers.has("content-type")) {
    headers.set("content-type", blob.type || "application/octet-stream");
  }
  headers.set("content-length", blob.size.toFixed());
  return new Response(blob, {
    ...init,
    status,
    statusText,
    headers,
  });
};

/**
 * Creates a Response from a Blob or ArrayBuffer with application/octet-stream content-type.
 * Forces octet-stream content-type.
 * Also sets content-length header.
 * @param {Blob|ArrayBuffer} octetStream - The blob data to return
 * @param {ResponseInit} [init] - Additional response initialization options
 * @returns {Response} A Response object with application/octet-stream content-type
 * @example
 * const blob = new Blob([binaryData]);
 * octetStream(blob);
 */
export const octetStream = (
  octet: Blob | ArrayBuffer | ReadableStream,
  init?: ResponseInit,
): Response => {
  const status = init?.status ?? 200;
  const statusText = init?.statusText ?? getHttpStatusText(status);
  const headers = new Headers(init?.headers);
  if (!headers.has("content-type")) {
    headers.set("content-type", "application/octet-stream");
  }
  if (!(octet instanceof ReadableStream)) {
    headers.set(
      "content-length",
      (octet instanceof Blob ? octet.size : octet.byteLength).toFixed(),
    );
  }
  return new Response(octet, {
    ...init,
    status,
    statusText,
    headers,
  });
};

/**
 * Creates a Response from FormData.
 * @param {FormData} [formData] - The form data to return
 * @param {ResponseInit} [init] - Additional response initialization options
 * @returns {Response} A Response object
 * @example
 * const form = new FormData();
 * form.append("key", "value");
 * formData(form);
 */
export const formData = (
  formData?: FormData,
  init?: ResponseInit,
): Response => {
  const status = init?.status ?? 200;
  const statusText = init?.statusText ?? getHttpStatusText(status);
  return new Response(formData, {
    ...init,
    status,
    statusText,
  });
};

/**
 * Creates a Response from URLSearchParams with application/x-www-form-urlencoded content-type.
 * @param {URLSearchParams} [usp] - The URL search parameters to return
 * @param {ResponseInit} [init] - Additional response initialization options
 * @returns {Response} A Response object with application/x-www-form-urlencoded content-type
 * @example
 * const params = new URLSearchParams({ q: "search term" });
 * usp(params);
 */
export const usp = (usp?: URLSearchParams, init?: ResponseInit): Response => {
  const status = init?.status ?? 200;
  const statusText = init?.statusText ?? getHttpStatusText(status);
  const headers = new Headers(init?.headers);
  if (!headers.has("content-type")) {
    headers.set("content-type", "application/x-www-form-urlencoded");
  }
  return new Response(usp, {
    ...init,
    status,
    statusText,
    headers,
  });
};

/**
 * Creates a Response from various body types with automatic content-type detection.
 * Supports strings, objects (JSON), Blobs, ArrayBuffers, FormData, URLSearchParams, and ReadableStreams.
 * @param {BodyInit|Record<string, unknown>} [body] - The body content to return
 * @param {ResponseInit} [init] - Additional response initialization options
 * @returns {Response} A Response object with appropriate content-type
 * @example
 * send("text"); // text/plain
 * send({ message: "success" }); // application/json; charset=utf-8
 * send(new Blob([])); // blob.type || application/octet-stream
 * send(new FormData()); // multipart/form-data
 * send(new URLSearchParams()); // application/x-www-form-urlencoded
 */
export const send = (
  body?: BodyInit | Record<string, unknown>,
  init?: ResponseInit,
): Response => {
  const status = init?.status ?? 200;
  const statusText = init?.statusText ?? getHttpStatusText(status);
  const headers = new Headers(init?.headers);
  const isContentTypeNotSet = !headers.has("content-type");
  if (body instanceof URLSearchParams) {
    if (isContentTypeNotSet) {
      headers.set("content-type", "application/x-www-form-urlencoded");
    }
  } else if (body instanceof FormData) {
    // content type will be generated
  } else if (typeof body === "string") {
    if (isContentTypeNotSet) {
      headers.set("content-type", "text/plain; charset=utf-8");
    }
  } else if (body instanceof Blob) {
    if (isContentTypeNotSet) {
      headers.set("content-type", body.type || "application/octet-stream");
    }
  } else if (
    body instanceof ArrayBuffer ||
    ArrayBuffer.isView(body) ||
    body instanceof ReadableStream
  ) {
    if (isContentTypeNotSet) {
      headers.set("content-type", "application/octet-stream");
    }
  } else if (body != null) {
    if (isContentTypeNotSet) {
      headers.set("content-type", "application/json; charset=utf-8");
    }
    return Response.json(body, {
      ...init,
      status,
      statusText,
      headers,
    });
  }
  return new Response(body, {
    ...init,
    status,
    statusText,
    headers,
  });
};

/**
 * Options for setting cookies.
 * @type {Object} CookieOptions
 * @property {string} [path] - The path for which the cookie is valid
 * @property {string} [domain] - The domain for which the cookie is valid
 * @property {Date|number|string} [expires] - Expiration date of the cookie
 * @property {number} [maxAge] - Maximum age of the cookie in seconds
 * @property {boolean} [httpOnly] - If true, the cookie is not accessible via JavaScript
 * @property {boolean} [secure] - If true, the cookie is only sent over HTTPS
 * @property {"Strict"|"Lax"|"None"} [sameSite] - SameSite attribute for the cookie
 */
export interface CookieOptions {
  path?: string;
  domain?: string;
  expires?: Date | number | string;
  maxAge?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "Strict" | "Lax" | "None";
}

/**
 * Tuple representing a cookie header (key-value pair for Set-Cookie header).
 * @type {[string, string]} CookieTuple
 */
type CookieTuple = [string, string];

/**
 * Creates a Set-Cookie header tuple with the given name, value, and options.
 * @param {string} name - The name of the cookie
 * @param {string} value - The value of the cookie
 * @param {CookieOptions} [options] - Cookie configuration options
 * @returns {CookieTuple} A tuple containing the header name "Set-Cookie" and the cookie string
 * @example
 * const cookie = setCookie("session", "abc123", { httpOnly: true, secure: true });
 * // Returns: ["Set-Cookie", "session=abc123; HttpOnly; Secure"]
 */
export const setCookie = (
  name: string,
  value: string,
  options?: CookieOptions,
): CookieTuple => {
  const parts = [`${name}=${value}`];
  if (options) {
    if (options.path) parts.push(`Path=${options.path}`);
    if (options.domain) parts.push(`Domain=${options.domain}`);
    if (options.expires)
      parts.push(`Expires=${new Date(options.expires).toUTCString()}`);
    if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);
    if (options.httpOnly) parts.push(`HttpOnly`);
    if (options.secure) parts.push(`Secure`);
    if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
  }
  const cookie = parts.join("; ");
  return ["Set-Cookie", cookie];
};

/**
 * Creates a Set-Cookie header tuple to clear/remove a cookie.
 * Sets the cookie with an empty value and an expired date.
 * @param {string} name - The name of the cookie to clear
 * @param {CookieOptions} [options] - Cookie configuration options (path/domain must match original cookie)
 * @returns {CookieTuple} A tuple containing the header name "Set-Cookie" and the cookie clearing string
 * @example
 * const cookie = clearCookie("session", { path: "/" });
 * // Returns: ["Set-Cookie", "session=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/"]
 */
export const clearCookie = (
  name: string,
  options?: CookieOptions,
): CookieTuple => {
  const parts = [`${name}=`];
  const expires = options?.expires
    ? new Date(options.expires).toUTCString()
    : "Thu, 01 Jan 1970 00:00:00 GMT";
  if (options) {
    if (options.path) parts.push(`Path=${options.path}`);
    if (options.domain) parts.push(`Domain=${options.domain}`);
    if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);
    if (options.httpOnly) parts.push(`HttpOnly`);
    if (options.secure) parts.push(`Secure`);
    if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
  }
  if (expires) parts.push(`Expires=${expires}`);
  const cookie = parts.join("; ");
  return ["Set-Cookie", cookie];
};
