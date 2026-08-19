"use strict";
// src/helpers.ts
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
exports.clearCookie = exports.setCookie = exports.send = exports.usp = exports.formData = exports.octetStream = exports.blob = exports.json = exports.html = exports.text = exports.forward = exports.redirectPermanentPreserve = exports.redirectTemporaryPreserve = exports.redirectPermanent = exports.redirectTemporary = exports.redirect = exports.status = exports.buildStrictTransportSecurity = exports.buildContentSecurityPolicy = void 0;
const status_ts_1 = require("./status.js");
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
const buildContentSecurityPolicy = (policy) => {
    const policyIsArray = Array.isArray(policy);
    const directives = [];
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
            directives.push(Array.isArray(source)
                ? source.length > 0
                    ? `${key} ${source.join(" ")}`
                    : key
                : `${key} ${source}`);
        }
    }
    return directives.join("; ");
};
exports.buildContentSecurityPolicy = buildContentSecurityPolicy;
/**
 * Builds and returns a Strict-Transport-Security(HSTS) response header value from params.
 *
 * @param {StrictTransportSecurityParams} strictTransportSecurity HSTS params
 * @returns {string} The built Strict-Transport-Security value
 */
const buildStrictTransportSecurity = (strictTransportSecurity) => {
    const { maxAge = 31536000, includeSubDomains, preload, } = strictTransportSecurity;
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
exports.buildStrictTransportSecurity = buildStrictTransportSecurity;
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
const status = (status, content, init) => {
    var _a;
    const statusText = (_a = init === null || init === void 0 ? void 0 : init.statusText) !== null && _a !== void 0 ? _a : (0, status_ts_1.getHttpStatusText)(status);
    const headers = new Headers(init === null || init === void 0 ? void 0 : init.headers);
    if (content !== null && !headers.has("content-type")) {
        headers.set("content-type", "text/plain; charset=utf-8");
    }
    return new Response(content !== undefined ? content : statusText, Object.assign(Object.assign({}, init), { status,
        statusText,
        headers }));
};
exports.status = status;
/**
 * Creates a redirect Response.
 * Defaults to 302 Found unless another status is provided.
 * @param {string} location - The URL to redirect to
 * @param {ResponseInit} [init] - Additional response initialization options
 * @returns {Response} A Response object with Location header
 */
const redirect = (location, init) => {
    var _a, _b;
    const status = (_a = init === null || init === void 0 ? void 0 : init.status) !== null && _a !== void 0 ? _a : 302;
    const statusText = (_b = init === null || init === void 0 ? void 0 : init.statusText) !== null && _b !== void 0 ? _b : (0, status_ts_1.getHttpStatusText)(status);
    const headers = new Headers(init === null || init === void 0 ? void 0 : init.headers);
    headers.set("Location", location);
    return new Response(null, Object.assign(Object.assign({}, init), { status,
        statusText,
        headers }));
};
exports.redirect = redirect;
/**
 * Creates a redirect Response.
 * Forces a status of 302 Found.
 * @param {string} location - The URL to redirect to
 * @param {Omit<ResponseInit,"status"|"statusText">} [init] - Additional response initialization options
 * @returns {Response} A Response object with Location header
 */
const redirectTemporary = (location, init) => {
    const status = 302;
    const statusText = (0, status_ts_1.getHttpStatusText)(status);
    const headers = new Headers(init === null || init === void 0 ? void 0 : init.headers);
    headers.set("Location", location);
    return new Response(null, Object.assign(Object.assign({}, init), { status,
        statusText,
        headers }));
};
exports.redirectTemporary = redirectTemporary;
/**
 * Creates a redirect Response.
 * Forces a status of 301 Permanent Redirect.
 * @param {string} location - The URL to redirect to
 * @param {Omit<ResponseInit,"status">} [init] - Additional response initialization options
 * @returns {Response} A Response object with Location header
 */
const redirectPermanent = (location, init) => {
    const status = 301;
    const statusText = (0, status_ts_1.getHttpStatusText)(status);
    const headers = new Headers(init === null || init === void 0 ? void 0 : init.headers);
    headers.set("Location", location);
    return new Response(null, Object.assign(Object.assign({}, init), { status,
        statusText,
        headers }));
};
exports.redirectPermanent = redirectPermanent;
/**
 * Creates a redirect Response.
 * Forces a status of 307 Temporary Redirect with preserved method and body.
 *
 * @param {string} location - The URL to redirect to
 * @param {Omit<ResponseInit,"status">} [init] - Additional response initialization options
 * @returns {Response} A Response object with Location header
 */
const redirectTemporaryPreserve = (location, init) => {
    const status = 307;
    const statusText = (0, status_ts_1.getHttpStatusText)(status);
    const headers = new Headers(init === null || init === void 0 ? void 0 : init.headers);
    headers.set("Location", location);
    return new Response(null, Object.assign(Object.assign({}, init), { status,
        statusText,
        headers }));
};
exports.redirectTemporaryPreserve = redirectTemporaryPreserve;
/**
 * Creates a redirect Response.
 * Forces a status of 308 Permanent Redirect with preserved method and body.
 *
 * @param {string} location - The URL to redirect to
 * @param {Omit<ResponseInit,"status">} [init] - Additional response initialization options
 * @returns {Response} A Response object with Location header
 */
const redirectPermanentPreserve = (location, init) => {
    const status = 308;
    const statusText = (0, status_ts_1.getHttpStatusText)(status);
    const headers = new Headers(init === null || init === void 0 ? void 0 : init.headers);
    headers.set("Location", location);
    return new Response(null, Object.assign(Object.assign({}, init), { status,
        statusText,
        headers }));
};
exports.redirectPermanentPreserve = redirectPermanentPreserve;
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
const forward = (router, path, options) => {
    return function (ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const { request } = ctx;
            const method = (_a = options === null || options === void 0 ? void 0 : options.method) !== null && _a !== void 0 ? _a : request.method;
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
        });
    };
};
exports.forward = forward;
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
const text = (content, init) => {
    var _a, _b;
    const status = (_a = init === null || init === void 0 ? void 0 : init.status) !== null && _a !== void 0 ? _a : 200;
    const statusText = (_b = init === null || init === void 0 ? void 0 : init.statusText) !== null && _b !== void 0 ? _b : (0, status_ts_1.getHttpStatusText)(status);
    const headers = new Headers(init === null || init === void 0 ? void 0 : init.headers);
    if (!headers.has("content-type")) {
        headers.set("content-type", "text/plain; charset=utf-8");
    }
    return new Response(content, Object.assign(Object.assign({}, init), { status,
        statusText,
        headers }));
};
exports.text = text;
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
const html = (content, init) => {
    var _a, _b;
    const status = (_a = init === null || init === void 0 ? void 0 : init.status) !== null && _a !== void 0 ? _a : 200;
    const statusText = (_b = init === null || init === void 0 ? void 0 : init.statusText) !== null && _b !== void 0 ? _b : (0, status_ts_1.getHttpStatusText)(status);
    const headers = new Headers(init === null || init === void 0 ? void 0 : init.headers);
    if (!headers.has("content-type")) {
        headers.set("content-type", "text/html; charset=utf-8");
    }
    return new Response(content, Object.assign(Object.assign({}, init), { status,
        statusText,
        headers }));
};
exports.html = html;
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
const json = (body, init) => {
    var _a, _b;
    const status = (_a = init === null || init === void 0 ? void 0 : init.status) !== null && _a !== void 0 ? _a : 200;
    const statusText = (_b = init === null || init === void 0 ? void 0 : init.statusText) !== null && _b !== void 0 ? _b : (0, status_ts_1.getHttpStatusText)(status);
    const headers = new Headers(init === null || init === void 0 ? void 0 : init.headers);
    if (!headers.has("content-type")) {
        headers.set("content-type", "application/json; charset=utf-8");
    }
    return Response.json(body, Object.assign(Object.assign({}, init), { status,
        statusText,
        headers }));
};
exports.json = json;
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
const blob = (blob, init) => {
    var _a, _b;
    const status = (_a = init === null || init === void 0 ? void 0 : init.status) !== null && _a !== void 0 ? _a : 200;
    const statusText = (_b = init === null || init === void 0 ? void 0 : init.statusText) !== null && _b !== void 0 ? _b : (0, status_ts_1.getHttpStatusText)(status);
    const headers = new Headers(init === null || init === void 0 ? void 0 : init.headers);
    if (!headers.has("content-type")) {
        headers.set("content-type", blob.type || "application/octet-stream");
    }
    headers.set("content-length", blob.size.toFixed());
    return new Response(blob, Object.assign(Object.assign({}, init), { status,
        statusText,
        headers }));
};
exports.blob = blob;
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
const octetStream = (octet, init) => {
    var _a, _b;
    const status = (_a = init === null || init === void 0 ? void 0 : init.status) !== null && _a !== void 0 ? _a : 200;
    const statusText = (_b = init === null || init === void 0 ? void 0 : init.statusText) !== null && _b !== void 0 ? _b : (0, status_ts_1.getHttpStatusText)(status);
    const headers = new Headers(init === null || init === void 0 ? void 0 : init.headers);
    if (!headers.has("content-type")) {
        headers.set("content-type", "application/octet-stream");
    }
    if (!(octet instanceof ReadableStream)) {
        headers.set("content-length", (octet instanceof Blob ? octet.size : octet.byteLength).toFixed());
    }
    return new Response(octet, Object.assign(Object.assign({}, init), { status,
        statusText,
        headers }));
};
exports.octetStream = octetStream;
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
const formData = (formData, init) => {
    var _a, _b;
    const status = (_a = init === null || init === void 0 ? void 0 : init.status) !== null && _a !== void 0 ? _a : 200;
    const statusText = (_b = init === null || init === void 0 ? void 0 : init.statusText) !== null && _b !== void 0 ? _b : (0, status_ts_1.getHttpStatusText)(status);
    return new Response(formData, Object.assign(Object.assign({}, init), { status,
        statusText }));
};
exports.formData = formData;
/**
 * Creates a Response from URLSearchParams with application/x-www-form-urlencoded content-type.
 * @param {URLSearchParams} [usp] - The URL search parameters to return
 * @param {ResponseInit} [init] - Additional response initialization options
 * @returns {Response} A Response object with application/x-www-form-urlencoded content-type
 * @example
 * const params = new URLSearchParams({ q: "search term" });
 * usp(params);
 */
const usp = (usp, init) => {
    var _a, _b;
    const status = (_a = init === null || init === void 0 ? void 0 : init.status) !== null && _a !== void 0 ? _a : 200;
    const statusText = (_b = init === null || init === void 0 ? void 0 : init.statusText) !== null && _b !== void 0 ? _b : (0, status_ts_1.getHttpStatusText)(status);
    const headers = new Headers(init === null || init === void 0 ? void 0 : init.headers);
    if (!headers.has("content-type")) {
        headers.set("content-type", "application/x-www-form-urlencoded");
    }
    return new Response(usp, Object.assign(Object.assign({}, init), { status,
        statusText,
        headers }));
};
exports.usp = usp;
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
const send = (body, init) => {
    var _a, _b;
    const status = (_a = init === null || init === void 0 ? void 0 : init.status) !== null && _a !== void 0 ? _a : 200;
    const statusText = (_b = init === null || init === void 0 ? void 0 : init.statusText) !== null && _b !== void 0 ? _b : (0, status_ts_1.getHttpStatusText)(status);
    const headers = new Headers(init === null || init === void 0 ? void 0 : init.headers);
    const isContentTypeNotSet = !headers.has("content-type");
    if (body instanceof URLSearchParams) {
        if (isContentTypeNotSet) {
            headers.set("content-type", "application/x-www-form-urlencoded");
        }
    }
    else if (body instanceof FormData) {
        // content type will be generated
    }
    else if (typeof body === "string") {
        if (isContentTypeNotSet) {
            headers.set("content-type", "text/plain; charset=utf-8");
        }
    }
    else if (body instanceof Blob) {
        if (isContentTypeNotSet) {
            headers.set("content-type", body.type || "application/octet-stream");
        }
    }
    else if (body instanceof ArrayBuffer ||
        ArrayBuffer.isView(body) ||
        body instanceof ReadableStream) {
        if (isContentTypeNotSet) {
            headers.set("content-type", "application/octet-stream");
        }
    }
    else if (body != null) {
        if (isContentTypeNotSet) {
            headers.set("content-type", "application/json; charset=utf-8");
        }
        return Response.json(body, Object.assign(Object.assign({}, init), { status,
            statusText,
            headers }));
    }
    return new Response(body, Object.assign(Object.assign({}, init), { status,
        statusText,
        headers }));
};
exports.send = send;
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
const setCookie = (name, value, options) => {
    const parts = [`${name}=${value}`];
    if (options) {
        if (options.path)
            parts.push(`Path=${options.path}`);
        if (options.domain)
            parts.push(`Domain=${options.domain}`);
        if (options.expires)
            parts.push(`Expires=${new Date(options.expires).toUTCString()}`);
        if (options.maxAge !== undefined)
            parts.push(`Max-Age=${options.maxAge}`);
        if (options.httpOnly)
            parts.push(`HttpOnly`);
        if (options.secure)
            parts.push(`Secure`);
        if (options.sameSite)
            parts.push(`SameSite=${options.sameSite}`);
    }
    const cookie = parts.join("; ");
    return ["Set-Cookie", cookie];
};
exports.setCookie = setCookie;
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
const clearCookie = (name, options) => {
    const parts = [`${name}=`];
    const expires = (options === null || options === void 0 ? void 0 : options.expires)
        ? new Date(options.expires).toUTCString()
        : "Thu, 01 Jan 1970 00:00:00 GMT";
    if (options) {
        if (options.path)
            parts.push(`Path=${options.path}`);
        if (options.domain)
            parts.push(`Domain=${options.domain}`);
        if (options.maxAge !== undefined)
            parts.push(`Max-Age=${options.maxAge}`);
        if (options.httpOnly)
            parts.push(`HttpOnly`);
        if (options.secure)
            parts.push(`Secure`);
        if (options.sameSite)
            parts.push(`SameSite=${options.sameSite}`);
    }
    if (expires)
        parts.push(`Expires=${expires}`);
    const cookie = parts.join("; ");
    return ["Set-Cookie", cookie];
};
exports.clearCookie = clearCookie;
//# sourceMappingURL=helpers.js.map