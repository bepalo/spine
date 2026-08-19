import { OpenApiDesc } from "./types.openapi.ts";
export declare const Break_Pipeline: unique symbol;
export declare const Break_Pipe: unique symbol;
export * from "./types.openapi.ts";
export type HashType = "md5" | "sha1" | "sha256" | "sha384" | "sha512" | "sha3-256" | "sha3-384" | "sha3-512" | "blake2b512" | "blake2s256";
export type HttpMethod = "Head" | "Get" | "Post" | "Put" | "Patch" | "Delete" | "Options" | "Trace" | "Connect";
export type HttpMethodLower = "head" | "get" | "post" | "put" | "patch" | "delete" | "options" | "trace" | "connect";
export type HttpMethodUpper = "HEAD" | "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "OPTIONS" | "TRACE" | "CONNECT";
export type HandlerType = "handler" | "filter" | "fallback" | "after" | "catcher";
export type CrossOriginOpenerPolicy = "unsafe-none" | "same-origin-allow-popups" | "same-origin" | "noopener-allow-popups";
export type CrossOriginEmbedderPolicyToken = "unsafe-none" | "require-corp" | "credentialless";
export type CrossOriginEmbedderPolicy = CrossOriginEmbedderPolicyToken | `${CrossOriginEmbedderPolicyToken}; report-to="` | `${CrossOriginEmbedderPolicyToken}; report-to="${string}"`;
export type CrossOriginResourcePolicy = "same-site" | "same-origin" | "cross-origin";
export type ReferrerPolicy = "no-referrer" | "no-referrer-when-downgrade" | "origin" | "origin-when-cross-origin" | "same-origin" | "strict-origin" | "strict-origin-when-cross-origin" | "unsafe-url";
export type XFrameOptions = "DENY" | "SAMEORIGIN";
type ContentSecurityPolicyCommonSource = "'self'" | "'none'" | "https:" | "http:" | "data:" | "blob:" | "*" | `${string}://${string}` | `${string}://*.${string}`;
type ContentSecurityPolicyScriptStyleSource = ContentSecurityPolicyCommonSource | "'unsafe-inline'" | "'unsafe-eval'" | "'strict-dynamic'" | "'report-sample'" | "'wasm-unsafe-eval'" | "'inline-speculation-rules'" | `'nonce-${string}'` | `'sha256-${string}'` | `'sha384-${string}'` | `'sha512-${string}'`;
type ContentSecurityPolicyScriptSource = ContentSecurityPolicyScriptStyleSource;
type ContentSecurityPolicyStyleSource = ContentSecurityPolicyCommonSource | "'unsafe-inline'" | "'report-sample'" | `'nonce-${string}'` | `'sha256-${string}'` | `'sha384-${string}'` | `'sha512-${string}'`;
type ContentSecurityPolicyConnectSource = "'self'" | "'none'" | "https:" | "http:" | "ws:" | "wss:" | `${string}://${string}` | `${string}://*.${string}`;
type ContentSecurityPolicyFontSource = ContentSecurityPolicyCommonSource;
type ContentSecurityPolicyImgSource = ContentSecurityPolicyCommonSource | "data:" | "blob:" | "'unsafe-inline'";
type ContentSecurityPolicyMediaSource = ContentSecurityPolicyCommonSource;
type ContentSecurityPolicyFrameSource = ContentSecurityPolicyCommonSource | "data:" | "blob:";
type ContentSecurityPolicyWorkerSource = ContentSecurityPolicyCommonSource | "blob:" | "data:";
type ContentSecurityPolicyManifestSource = ContentSecurityPolicyCommonSource;
type ContentSecurityPolicyObjectSource = "'none'" | "'self'" | "https:" | "http:" | `${string}://${string}`;
type ContentSecurityPolicyBaseUriSource = "'none'" | "'self'" | `${string}://${string}`;
type ContentSecurityPolicyFormActionSource = "'none'" | "'self'" | "https:" | "http:" | `${string}://${string}`;
type ContentSecurityPolicyFrameAncestorsSource = "'none'" | "'self'" | `${string}://${string}`;
export type ContentSecurityPolicySource = "'self'" | "'none'" | "'unsafe-inline'" | "'unsafe-eval'" | "'strict-dynamic'" | "'report-sample'" | "'wasm-unsafe-eval'" | "'inline-speculation-rules'" | "data:" | "blob:" | "https:" | "http:" | "ws:" | "wss:" | "*" | `'${"nonce" | "sha256" | "sha384" | "sha512"}'` | `'${"nonce-" | "sha256-" | "sha384-" | "sha512-"}${string}'` | `${"data:/" | "blob:/" | "https:/" | "http:/"}` | `${"data://" | "blob://" | "https://" | "http://"}${string}`;
export type ContentSecurityPolicyFetchDirectiveType = "default-src" | "script-src" | "style-src" | "img-src" | "font-src" | "connect-src" | "media-src" | "object-src" | "frame-src" | "worker-src" | "manifest-src" | "base-uri" | "form-action" | "frame-ancestors";
export type ContentSecurityPolicyFetchDirectives = `${ContentSecurityPolicyFetchDirectiveType} ` | `${ContentSecurityPolicyFetchDirectiveType} ${ContentSecurityPolicySource}` | `${ContentSecurityPolicyFetchDirectiveType} ` | `${ContentSecurityPolicyFetchDirectiveType}  ${string & {}}`;
export type ContentSecurityPolicyArrayParams = (["default-src", ...ContentSecurityPolicyCommonSource[]] | ["script-src", ...ContentSecurityPolicyScriptSource[]] | ["style-src", ...ContentSecurityPolicyStyleSource[]] | ["img-src", ...ContentSecurityPolicyImgSource[]] | ["font-src", ...ContentSecurityPolicyFontSource[]] | ["connect-src", ...ContentSecurityPolicyConnectSource[]] | ["media-src", ...ContentSecurityPolicyMediaSource[]] | ["object-src", ...ContentSecurityPolicyObjectSource[]] | ["frame-src", ...ContentSecurityPolicyFrameSource[]] | ["worker-src", ...ContentSecurityPolicyWorkerSource[]] | ["manifest-src", ...ContentSecurityPolicyManifestSource[]] | ["base-uri", ...ContentSecurityPolicyBaseUriSource[]] | ["form-action", ...ContentSecurityPolicyFormActionSource[]] | ["frame-ancestors", ...ContentSecurityPolicyFrameAncestorsSource[]] | ["upgrade-insecure-requests"] | [
    "trusted-types",
    "'none'" | ` ${string}` | ` ${string} ${string} 'allow-duplicates'`
] | [string, ...ContentSecurityPolicySource[]])[];
export type ContentSecurityPolicyParams = {
    "default-src"?: ContentSecurityPolicyCommonSource | ContentSecurityPolicyCommonSource[];
    "script-src"?: ContentSecurityPolicyScriptSource | ContentSecurityPolicyScriptSource[];
    "style-src"?: ContentSecurityPolicyStyleSource | ContentSecurityPolicyStyleSource[];
    "img-src"?: ContentSecurityPolicyImgSource | ContentSecurityPolicyImgSource[];
    "font-src"?: ContentSecurityPolicyFontSource | ContentSecurityPolicyFontSource[];
    "connect-src"?: ContentSecurityPolicyConnectSource | ContentSecurityPolicyConnectSource[];
    "media-src"?: ContentSecurityPolicyMediaSource | ContentSecurityPolicyMediaSource[];
    "object-src"?: ContentSecurityPolicyObjectSource | ContentSecurityPolicyObjectSource[];
    "frame-src"?: ContentSecurityPolicyFrameSource | ContentSecurityPolicyFrameSource[];
    "worker-src"?: ContentSecurityPolicyWorkerSource | ContentSecurityPolicyWorkerSource[];
    "manifest-src"?: ContentSecurityPolicyManifestSource | ContentSecurityPolicyManifestSource[];
    "base-uri"?: ContentSecurityPolicyBaseUriSource | ContentSecurityPolicyBaseUriSource[];
    "form-action"?: ContentSecurityPolicyFormActionSource | ContentSecurityPolicyFormActionSource[];
    "frame-ancestors"?: ContentSecurityPolicyFrameAncestorsSource | ContentSecurityPolicyFrameAncestorsSource[];
    "upgrade-insecure-requests"?: boolean;
    "trusted-types"?: "'none'" | ` ${string}` | ` ${string} ${string} 'allow-duplicates'`;
};
export type StrictTransportSecurity = `max-age=${31536000}${"; includeSubDomains" | "; includeSubDomains; preload" | ""}`;
export interface StrictTransportSecurityParams {
    /**
     * @default 31536000 1 year
     */
    maxAge?: number;
    includeSubDomains?: boolean;
    /**
     * @property {boolean} [preload] Include the preload directive.
     * Only enable this when the domain satisfies the requirements for HSTS
     * preload submission.
     */
    preload?: boolean;
}
export type MimeType = "audio/aac" | "application/x-abiword" | "image/apng" | "application/x-freearc" | "image/avif" | "video/x-msvideo" | "application/vnd.amazon.ebook" | "application/octet-stream" | "image/bmp" | "application/x-bzip" | "application/x-bzip2" | "application/x-cdf" | "application/x-csh" | "text/css" | "text/csv" | "application/msword" | "application/vnd.openxmlformats-officedocument.wordprocessingml.document" | "application/vnd.ms-fontobject" | "application/epub+zip" | "application/gzip" | "image/gif" | "text/html" | "text/html" | "image/vnd.microsoft.icon" | "text/calendar" | "application/java-archive" | "image/jpeg" | "image/jpeg" | "text/javascript" | "application/json" | "application/ld+json" | "text/markdown" | "audio/midi" | "audio/midi" | "text/javascript" | "audio/mp4" | "audio/mpeg" | "video/mp4" | "video/mpeg" | "application/vnd.apple.installer+xml" | "application/vnd.oasis.opendocument.presentation" | "application/vnd.oasis.opendocument.spreadsheet" | "application/vnd.oasis.opendocument.text" | "audio/ogg" | "video/ogg" | "application/ogg" | "audio/ogg" | "font/otf" | "image/png" | "application/pdf" | "application/x-httpd-php" | "application/vnd.ms-powerpoint" | "application/vnd.openxmlformats-officedocument.presentationml.presentation" | "application/vnd.rar" | "application/rtf" | "application/x-sh" | "image/svg+xml" | "application/x-tar" | "image/tiff" | "image/tiff" | "video/mp2t" | "font/ttf" | "text/plain" | "application/vnd.visio" | "audio/wav" | "audio/webm" | "video/webm" | "application/manifest+json" | "image/webp" | "font/woff" | "font/woff2" | "application/xhtml+xml" | "application/vnd.ms-excel" | "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" | "application/xml" | "application/vnd.mozilla.xul+xml" | "application/zip" | "video/3gpp" | "video/3gpp2" | "application/x-7z-compressed";
export declare const MIME_TYPES: Map<string, MimeType>;
export type Path = `/${string}`;
export type MethodPath = `${HttpMethod} ${Path}`;
/**
 * Helper type to split a path into segments
 *
 * @template {string} P pathname.
 */
type _SplitPathSegments<P extends string> = P extends `${infer Segment}/${infer Rest}` ? [Segment, ..._SplitPathSegments<Rest>] : [P];
/**
 * Helper type to split a path into segments
 *
 * @template {string} P pathname. /api/v1/users/:userId/posts/:postId
 */
export type SplitPathSegments<P extends string> = P extends `/${infer Rest}` ? _SplitPathSegments<Rest> : [];
/**
 * Helper type to extract parameter names from a path segment
 *
 * @template {string} P pathname.
 */
export type ExtractParamName<S extends string> = S extends `::${infer Name}` ? Name : S extends `:${infer Name}` ? Name : never;
/**
 * Gives parameters from path segments /a/:id/b/:n -> 'id'|'n'
 *
 * @template {string} P pathname. /api/v1/users/:userId/posts/:postId
 */
export type ExtractParams<P extends string> = ExtractParamName<SplitPathSegments<P>[number]>;
export type EmptyRecord = Record<string, unknown>;
export type BaseContext = {
    router: any;
    url: URL;
    request: Request;
    headers: Headers;
    params: Record<string, string>;
    pathname: string;
    $pathname: string[];
    timestamps: {
        request: number;
        start: number;
        end: number;
    };
};
export type Context<ExtendContext extends Record<string, unknown> = Record<string, never>> = BaseContext & ExtendContext;
export type CTError = {
    error: Error | HttpError;
};
export type CTResponse = {
    response: Response;
};
export type RespondContext<ExtendContext extends Record<string, unknown> = Record<string, never>> = Partial<Pick<BaseContext, "headers">> & ExtendContext;
export type RouterConfig<ExtendContext extends Record<string, unknown> = Record<string, never>> = {
    maxPath: number;
    enable?: Partial<Record<Exclude<HandlerType, "handler">, boolean>>;
    defaultFilter?: Handler<Context<ExtendContext>>;
    defaultFallback?: Handler<Context<ExtendContext>>;
    defaultCatcher?: Handler<Context<CTError & ExtendContext>>;
    defaultAfter?: Handler<Context<CTResponse & ExtendContext>>;
};
export interface RouteEntry<ExtendContext extends Record<string, unknown> = Record<string, never>> {
    parseParams: (pathname: string, parts: string[]) => Record<string, string> | undefined;
    params?: Array<[number, string]>;
    pipe: Pipe<ExtendContext>;
    originalPath: string;
    standardPath: string;
    openApiPath: string;
    path: string;
    pathParts: string[];
}
export type HandlerRouteEntry<ExtendContext extends Record<string, unknown> = Record<string, never>> = RouteEntry<ExtendContext> & {
    openApi?: OpenApiDesc | false;
};
export interface RouteEntries<ExtendContext extends Record<string, unknown> = Record<string, never>> {
    method: HttpMethodUpper;
    entries: Array<Map<string, RouteEntry<ExtendContext>>>;
    globs: Array<Map<string, RouteEntry<ExtendContext>>>;
    superGlobs: Array<Map<string, RouteEntry<ExtendContext>>>;
}
export interface HandlerRouteEntries<ExtendContext extends Record<string, unknown> = Record<string, never>> {
    method: HttpMethodUpper;
    entries: Array<Map<string, HandlerRouteEntry<ExtendContext>>>;
    globs: Array<Map<string, HandlerRouteEntry<ExtendContext>>>;
    superGlobs: Array<Map<string, HandlerRouteEntry<ExtendContext>>>;
}
export type HandlerReturn = Response | typeof Break_Pipeline | typeof Break_Pipe | void;
export type Handler<ExtendContext extends Record<string, unknown> = Record<string, never>> = (ctx: Context<ExtendContext>) => Promise<HandlerReturn> | HandlerReturn;
export type Pipe<ExtendContext extends Record<string, unknown> = Record<string, never>> = Array<Handler<ExtendContext>>;
export type RegisterPiplineOptions = {
    overwrite?: boolean;
};
export type HandlerRegisterPiplineOptions = {
    overwrite?: boolean;
    openApi?: OpenApiDesc | false;
};
export type HandlerDef<ExtendContext extends Record<string, unknown> = Record<string, never>> = Handler<ExtendContext> | Pipe<ExtendContext>;
export type PipeDef<ExtendContext extends Record<string, unknown> = Record<string, never>> = {
    pipe: Handler<ExtendContext> | Pipe<ExtendContext>;
} & HandlerRegisterPiplineOptions;
export declare class RouterError extends Error {
    constructor(message: string, options?: ErrorOptions);
}
export declare class HttpError extends Error {
    status: number;
    constructor(status: number, message: string, options?: ErrorOptions);
}
export declare enum MissReason {
    Miss = 0,
    Expired = 1
}
export declare enum EvictionReason {
    Manual = 0,
    LRU = 1,
    Expired = 2,
    Replaced = 3
}
//# sourceMappingURL=types.d.ts.map