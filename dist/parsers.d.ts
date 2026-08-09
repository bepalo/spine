import { Break_Pipe, Break_Pipeline, HttpError, type Context, type EmptyRecord, type Handler, type MimeType } from "./types.ts";
/**
 * Parsed params.
 *
 * @type {Object} Params
 */
export type Params<Keys extends string = string, ExtendParams extends Record<Keys, string> | Record<string, string | unknown> = {}> = Omit<Record<Keys, string>, keyof ExtendParams> & ExtendParams;
/**
 * Context object containing parsed params.
 *
 * @type {Object} CTXParams
 * @property {Record<string, string>} params - Parsed params
 */
export type CTXParams<Keys extends string = string, ExtendParams extends Record<Keys, string> | Record<string, string | unknown> = {}> = {
    params: Params<Keys, ExtendParams>;
};
/**
 * Parsed query.
 *
 * @type {Object} Query
 */
export type Query<Keys extends string = string, ExtendQuery extends Record<Keys, string> | Record<string, string | unknown> = {}> = Omit<Record<Keys, string>, keyof ExtendQuery> & ExtendQuery;
/**
 * Context object containing parsed query.
 *
 * @template {string} Keys - Keys to extend context Query. "q"|"search"
 * @template {Record<string, unknown>} ExtendQuery - Extend context Query
 *
 * @type {Object} CTXQuery
 * @property {Record<string, string>} query - Parsed query
 */
export type CTXQuery<Keys extends string = string, ExtendQuery extends Record<Keys, string> | Record<string, string | unknown> = {}> = {
    query: Query<Keys, ExtendQuery>;
};
/**
 * Creates middleware that parses queries from the request url and adds them to the context.
 *
 * @template {string} Keys - Keys to extend context Query. "q"|"search"
 * @template {Record<string, unknown>} ExtendQuery - Extend context Query
 * @template {Record<string, unknown>} ExtendContext - Extend Router Context
 *
 * @returns {Function} A middleware function that adds parsed queries to context.query
 */
export declare const parseQuery: <Keys extends string = string, ExtendQuery extends Record<Keys, string> | Record<string, string | unknown> = {}, ExtendContext extends Record<string, unknown> = EmptyRecord>() => Handler<ExtendContext & CTXQuery<Keys, ExtendQuery>>;
/**
 * Parses cookies from a Request object's Cookie header.
 * @template {Record<string, string>} Expected
 * @param {Request} req - The request object containing cookies
 * @returns {Expected|undefined} An object with cookie name-value pairs, or undefined if no cookies
 * @example
 * const cookies = parseCookieFromRequest(req);
 * // Returns: { session: "abc123", theme: "dark" }
 */
export declare const parseCookieFromRequest: <Expected extends Record<string, string>>(req: Request, cookies?: Expected) => Expected | undefined;
/**
 * Parsed cookie.
 *
 * @type {Object} Cookies
 * @template {string} Keys - Keys to extend context Cookie. "session"|"geo"
 * @template {Record<string, string>} ExtendCookie - Extend context Cookie
 */
export type Cookies<Keys extends string = string, ExtendCookie extends Record<Keys, string> | Record<string, string | unknown> = {}> = Omit<Record<Keys, string>, keyof ExtendCookie> & ExtendCookie;
/**
 * Context object containing parsed cookie.
 *
 * @type {Object} CTXCookie
 * @property {Record<string, string|unknown>} cookie - Parsed cookie
 */
export type CTXCookie<Keys extends string = string, ExtendCookie extends Record<Keys, string> | Record<string, string | unknown> = {}> = {
    cookie: Cookies<Keys, ExtendCookie>;
};
/**
 * Creates middleware that parses cookies from the request and adds them to the context.
 *
 * @template {string} Keys - Keys to extend context Cookie. "session"|"geo"
 * @template {Record<string, string>} ExtendCookie - Extend context Cookie
 * @template {Record<string, string>} ExtendContext - Extend Router Context
 *
 * @returns {Function} A middleware function that adds parsed cookies to context.cookie
 */
export declare const parseCookie: <Keys extends string = string, ExtendCookie extends Record<Keys, string> | Record<string, string | unknown> = {}, ExtendContext extends Record<string, unknown> = EmptyRecord>() => Handler<ExtendContext & CTXCookie<Keys, ExtendCookie>>;
/**
 * Parsed body object types.
 * @type {Object|Array<unknown>|string|null|undefined} ParsedBody
 */
export type ParsedBody = Record<string, unknown> | Array<unknown> | string | number | boolean | null | undefined;
/**
 * Context object containing parsed request body.
 *
 * @type {Object} CTXBody
 * @template {any | ParsedBody} BodyType - Define body type
 * @property {ParsedBody} body - Parsed request body data
 */
export type CTXBody<BodyType = ParsedBody> = {
    body: BodyType;
};
/**
 * Supported media types for request body parsing.
 * @type {"application/x-www-form-urlencoded"|"application/json"|"application/rjson"|"text/plain"} SupportedBodyMediaTypes
 */
export type SupportedBodyMediaTypes = "application/x-www-form-urlencoded" | "application/json" | "application/rjson" | "text/plain";
/**
 * Fronzen Set of supported media types for request body parsing.
 */
export declare const SUPPORTED_MEDIA_TYPES: Readonly<Set<string>>;
/**
 * Fronzen Array of supported media types for request body parsing.
 */
export declare const SUPPORTED_MEDIA_TYPES_LIST: readonly string[];
/**
 * Creates middleware that parses the request body based on Content-Type.
 * Supports url-encoded forms, JSON, RJSON, and plain text.
 *
 * @template {Record<string, unknown>} ExtendContext - Extend Router Context
 * @param {Object} [options] - Configuration options for body parsing
 * @param {SupportedBodyMediaTypes|SupportedBodyMediaTypes[]} [options.accept] - Media types to accept (defaults to all supported)
 * @param {number} [options.maxSize] - Maximum body size in bytes (defaults to 1MB)
 * @param {number} [options.once] - Do not parse if parsed already. checks `ctx.body`
 * @param {number} [options.clone] - Clone request before parsing it. Useful for forwarding.
 * @returns {Function} A middleware function that adds parsed body to context.body
 * @returns {Response} Returns a 415 response if content-type is not accepted
 * @returns {Response} Returns a 413 response if body exceeds maxSize
 * @returns {Response} Returns a 400 response if body is malformed
 */
export declare const parseBody: <ExtendContext extends Record<string, unknown> = EmptyRecord>(options?: {
    accept?: SupportedBodyMediaTypes | SupportedBodyMediaTypes[];
    maxSize?: number;
    once?: boolean;
    clone?: boolean;
}) => Handler<ExtendContext & CTXBody>;
export declare const parseHeaders: (rawHeaders: Uint8Array, contentDisposition?: object) => Headers;
export type ParsedFormDataFile<ExtendParsedFormDataFile extends Record<string, unknown> = EmptyRecord> = {
    name: string;
    type: MimeType;
    size: number;
    totalSize?: number;
    $: Record<string, any>;
} & ExtendParsedFormDataFile;
export type CTXFormData<ExtendParsedFormDataFile extends Record<string, unknown> = EmptyRecord> = {
    files: Map<string, ParsedFormDataFile<ExtendParsedFormDataFile>>;
    fields: Map<string, string | any>;
};
export type ParseMultipartCallbacksReturnType = Response | typeof Break_Pipeline | typeof Break_Pipe | void | Promise<Response | typeof Break_Pipeline | typeof Break_Pipe | void>;
export declare const parseMultipart: <ExtendContext extends Record<string, unknown> = EmptyRecord, ExtendParsedFormDataFile extends Record<string, unknown> = EmptyRecord>({ idGenerator, onStart, onEnd, onHeader, onData, onDataCompletion, }: {
    idGenerator?: (info: {
        headers: Headers;
        name: string;
        filename?: string;
    }) => string;
    onStart?: (ctx: Context<CTXFormData<ExtendParsedFormDataFile> & ExtendContext>) => ParseMultipartCallbacksReturnType;
    onEnd?: (ctx: Context<CTXFormData<ExtendParsedFormDataFile> & ExtendContext>, info: {
        success: boolean;
        error?: Error | HttpError;
    }) => ParseMultipartCallbacksReturnType;
    onHeader?: (ctx: Context<CTXFormData<ExtendParsedFormDataFile> & ExtendContext>, info: {
        headers: Headers;
        id: string;
        name: string;
        filename?: string;
    }) => ParseMultipartCallbacksReturnType;
    onData: (ctx: Context<CTXFormData<ExtendParsedFormDataFile> & ExtendContext>, info: {
        chunk: Uint8Array;
        headers: Headers;
        id: string;
        name: string;
        filename?: string;
    }) => ParseMultipartCallbacksReturnType;
    onDataCompletion: (ctx: Context<CTXFormData<ExtendParsedFormDataFile> & ExtendContext>, info: {
        headers: Headers;
        id: string;
        name: string;
        filename?: string;
    }) => ParseMultipartCallbacksReturnType;
}) => Handler<CTXFormData<ExtendParsedFormDataFile> & ExtendContext>;
//# sourceMappingURL=parsers.d.ts.map