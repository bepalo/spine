import Router from "./router.ts";
import type { ContentSecurityPolicyArrayParams, ContentSecurityPolicyFetchDirectiveType, ContentSecurityPolicyParams, ContentSecurityPolicySource, Handler, HttpMethod, StrictTransportSecurityParams } from "./types.ts";
/**
 * Builds and returns a Content-Security-Policy response header value from params.
 *
 * @param {ContentSecurityPolicyParams} policy CSP params
 * @returns {string} The built Content-Security-Policy value
 */
export declare const buildContentSecurityPolicy: (policy: ContentSecurityPolicyArrayParams | ContentSecurityPolicyParams | (ContentSecurityPolicyParams & { [K in string as K extends keyof ContentSecurityPolicyFetchDirectiveType | "upgrade-insecure-requests" | "trusted-types" ? never : K]: ContentSecurityPolicySource | ContentSecurityPolicySource[]; })) => string;
/**
 * Builds and returns a Strict-Transport-Security(HSTS) response header value from params.
 *
 * @param {StrictTransportSecurityParams} strictTransportSecurity HSTS params
 * @returns {string} The built Strict-Transport-Security value
 */
export declare const buildStrictTransportSecurity: (strictTransportSecurity: StrictTransportSecurityParams) => string;
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
export declare const status: (status: number, content?: string | null, init?: ResponseInit) => Response;
/**
 * Creates a redirect Response.
 * Defaults to 302 Found unless another status is provided.
 * @param {string} location - The URL to redirect to
 * @param {ResponseInit} [init] - Additional response initialization options
 * @returns {Response} A Response object with Location header
 */
export declare const redirect: (location: string, init?: ResponseInit) => Response;
/**
 * Creates a redirect Response.
 * Forces a status of 302 Found.
 * @param {string} location - The URL to redirect to
 * @param {Omit<ResponseInit,"status"|"statusText">} [init] - Additional response initialization options
 * @returns {Response} A Response object with Location header
 */
export declare const redirectTemporary: (location: string, init?: Omit<ResponseInit, "status" | "statusText">) => Response;
/**
 * Creates a redirect Response.
 * Forces a status of 301 Permanent Redirect.
 * @param {string} location - The URL to redirect to
 * @param {Omit<ResponseInit,"status">} [init] - Additional response initialization options
 * @returns {Response} A Response object with Location header
 */
export declare const redirectPermanent: (location: string, init?: Omit<ResponseInit, "status" | "statusText">) => Response;
/**
 * Creates a redirect Response.
 * Forces a status of 307 Temporary Redirect with preserved method and body.
 *
 * @param {string} location - The URL to redirect to
 * @param {Omit<ResponseInit,"status">} [init] - Additional response initialization options
 * @returns {Response} A Response object with Location header
 */
export declare const redirectTemporaryPreserve: (location: string, init?: Omit<ResponseInit, "status" | "statusText">) => Response;
/**
 * Creates a redirect Response.
 * Forces a status of 308 Permanent Redirect with preserved method and body.
 *
 * @param {string} location - The URL to redirect to
 * @param {Omit<ResponseInit,"status">} [init] - Additional response initialization options
 * @returns {Response} A Response object with Location header
 */
export declare const redirectPermanentPreserve: (location: string, init?: Omit<ResponseInit, "status" | "statusText">) => Response;
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
export declare const forward: <ExtendContext extends Record<string, unknown> = Record<string, never>>(router: Router<ExtendContext>, path: `/${string}`, options?: {
    method?: HttpMethod;
}) => Handler<ExtendContext>;
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
export declare const text: (content: string, init?: ResponseInit) => Response;
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
export declare const html: (content: string, init?: ResponseInit) => Response;
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
export declare const json: (body: any, init?: ResponseInit) => Response;
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
export declare const blob: (blob: Blob, init?: ResponseInit) => Response;
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
export declare const octetStream: (octet: Blob | ArrayBuffer | ReadableStream, init?: ResponseInit) => Response;
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
export declare const formData: (formData?: FormData, init?: ResponseInit) => Response;
/**
 * Creates a Response from URLSearchParams with application/x-www-form-urlencoded content-type.
 * @param {URLSearchParams} [usp] - The URL search parameters to return
 * @param {ResponseInit} [init] - Additional response initialization options
 * @returns {Response} A Response object with application/x-www-form-urlencoded content-type
 * @example
 * const params = new URLSearchParams({ q: "search term" });
 * usp(params);
 */
export declare const usp: (usp?: URLSearchParams, init?: ResponseInit) => Response;
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
export declare const send: (body?: BodyInit | Record<string, unknown>, init?: ResponseInit) => Response;
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
export declare const setCookie: (name: string, value: string, options?: CookieOptions) => CookieTuple;
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
export declare const clearCookie: (name: string, options?: CookieOptions) => CookieTuple;
export {};
//# sourceMappingURL=helpers.d.ts.map