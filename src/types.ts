// Symbol used to signal breaking from all handler pipeline in queue
export const Break_Pipeline = Symbol("Break_Pipeline");
// Symbol used to signal breaking from current handler pipe in queue but not others
export const Break_Pipe = Symbol("Break_Pipe");

export type HttpMethod =
  | "Head"
  | "Get"
  | "Post"
  | "Put"
  | "Patch"
  | "Delete"
  | "Options"
  | "Trace"
  | "Connect";

export type HttpMethodLower =
  | "head"
  | "get"
  | "post"
  | "put"
  | "patch"
  | "delete"
  | "options"
  | "trace"
  | "connect";

export type HttpMethodUpper =
  | "HEAD"
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "OPTIONS"
  | "TRACE"
  | "CONNECT";

export type HandlerType =
  | "handler"
  | "filter"
  | "fallback"
  | "after"
  | "catcher";

export type MimeType =
  | "audio/aac"
  | "application/x-abiword"
  | "image/apng"
  | "application/x-freearc"
  | "image/avif"
  | "video/x-msvideo"
  | "application/vnd.amazon.ebook"
  | "application/octet-stream"
  | "image/bmp"
  | "application/x-bzip"
  | "application/x-bzip2"
  | "application/x-cdf"
  | "application/x-csh"
  | "text/css"
  | "text/csv"
  | "application/msword"
  | "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  | "application/vnd.ms-fontobject"
  | "application/epub+zip"
  | "application/gzip"
  | "image/gif"
  | "text/html"
  | "text/html"
  | "image/vnd.microsoft.icon"
  | "text/calendar"
  | "application/java-archive"
  | "image/jpeg"
  | "image/jpeg"
  | "text/javascript"
  | "application/json"
  | "application/ld+json"
  | "text/markdown"
  | "audio/midi"
  | "audio/midi"
  | "text/javascript"
  | "audio/mp4"
  | "audio/mpeg"
  | "video/mp4"
  | "video/mpeg"
  | "application/vnd.apple.installer+xml"
  | "application/vnd.oasis.opendocument.presentation"
  | "application/vnd.oasis.opendocument.spreadsheet"
  | "application/vnd.oasis.opendocument.text"
  | "audio/ogg"
  | "video/ogg"
  | "application/ogg"
  | "audio/ogg"
  | "font/otf"
  | "image/png"
  | "application/pdf"
  | "application/x-httpd-php"
  | "application/vnd.ms-powerpoint"
  | "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  | "application/vnd.rar"
  | "application/rtf"
  | "application/x-sh"
  | "image/svg+xml"
  | "application/x-tar"
  | "image/tiff"
  | "image/tiff"
  | "video/mp2t"
  | "font/ttf"
  | "text/plain"
  | "application/vnd.visio"
  | "audio/wav"
  | "audio/webm"
  | "video/webm"
  | "application/manifest+json"
  | "image/webp"
  | "font/woff"
  | "font/woff2"
  | "application/xhtml+xml"
  | "application/vnd.ms-excel"
  | "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  | "application/xml"
  | "application/vnd.mozilla.xul+xml"
  | "application/zip"
  | "video/3gpp"
  | "video/3gpp2"
  | "application/x-7z-compressed";

export const MIME_TYPES = new Map<string, MimeType>([
  ["aac", "audio/aac"],
  ["abw", "application/x-abiword"],
  ["apng", "image/apng"],
  ["arc", "application/x-freearc"],
  ["avif", "image/avif"],
  ["avi", "video/x-msvideo"],
  ["azw", "application/vnd.amazon.ebook"],
  ["bin", "application/octet-stream"],
  ["bmp", "image/bmp"],
  ["bz", "application/x-bzip"],
  ["bz2", "application/x-bzip2"],
  ["cda", "application/x-cdf"],
  ["csh", "application/x-csh"],
  ["css", "text/css"],
  ["csv", "text/csv"],
  ["doc", "application/msword"],
  [
    "docx",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  ["eot", "application/vnd.ms-fontobject"],
  ["epub", "application/epub+zip"],
  ["gz", "application/gzip"],
  ["gif", "image/gif"],
  ["htm", "text/html"],
  ["html", "text/html"],
  ["ico", "image/vnd.microsoft.icon"],
  ["ics", "text/calendar"],
  ["jar", "application/java-archive"],
  ["jpeg", "image/jpeg"],
  ["jpg", "image/jpeg"],
  ["js", "text/javascript"],
  ["json", "application/json"],
  ["jsonld", "application/ld+json"],
  ["md", "text/markdown"],
  ["mid", "audio/midi"],
  ["midi", "audio/midi"],
  ["mjs", "text/javascript"],
  ["m4a", "audio/mp4"],
  ["mp3", "audio/mpeg"],
  ["mp4", "video/mp4"],
  ["mpeg", "video/mpeg"],
  ["mpkg", "application/vnd.apple.installer+xml"],
  ["odp", "application/vnd.oasis.opendocument.presentation"],
  ["ods", "application/vnd.oasis.opendocument.spreadsheet"],
  ["odt", "application/vnd.oasis.opendocument.text"],
  ["oga", "audio/ogg"],
  ["ogv", "video/ogg"],
  ["ogx", "application/ogg"],
  ["opus", "audio/ogg"],
  ["otf", "font/otf"],
  ["png", "image/png"],
  ["pdf", "application/pdf"],
  ["php", "application/x-httpd-php"],
  ["ppt", "application/vnd.ms-powerpoint"],
  [
    "pptx",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ],
  ["rar", "application/vnd.rar"],
  ["rtf", "application/rtf"],
  ["sh", "application/x-sh"],
  ["svg", "image/svg+xml"],
  ["tar", "application/x-tar"],
  ["tif", "image/tiff"],
  ["tiff", "image/tiff"],
  ["ts", "video/mp2t"],
  ["ttf", "font/ttf"],
  ["txt", "text/plain"],
  ["vsd", "application/vnd.visio"],
  ["wav", "audio/wav"],
  ["weba", "audio/webm"],
  ["webm", "video/webm"],
  ["webmanifest", "application/manifest+json"],
  ["webp", "image/webp"],
  ["woff", "font/woff"],
  ["woff2", "font/woff2"],
  ["xhtml", "application/xhtml+xml"],
  ["xls", "application/vnd.ms-excel"],
  ["xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  ["xml", "application/xml"],
  ["xul", "application/vnd.mozilla.xul+xml"],
  ["zip", "application/zip"],
  ["3gp", "video/3gpp"],
  ["3g2", "video/3gpp2"],
  ["7z", "application/x-7z-compressed"],
]);

// Basic pathname type
export type Path = `/${string}`;

// Basic Method Path type
export type MethodPath = `${HttpMethod} ${Path}`;

/**
 * Helper type to split a path into segments
 *
 * @template {string} P pathname.
 */
type _SplitPathSegments<P extends string> =
  P extends `${infer Segment}/${infer Rest}`
    ? [Segment, ..._SplitPathSegments<Rest>]
    : [P];

/**
 * Helper type to split a path into segments
 *
 * @template {string} P pathname. /api/v1/users/:userId/posts/:postId
 */
export type SplitPathSegments<P extends string> = P extends `/${infer Rest}`
  ? _SplitPathSegments<Rest>
  : [];

/**
 * Helper type to extract parameter names from a path segment
 *
 * @template {string} P pathname.
 */
export type ExtractParamName<S extends string> = S extends `::${infer Name}`
  ? Name
  : S extends `:${infer Name}`
    ? Name
    : never;

/**
 * Gives parameters from path segments /a/:id/b/:n -> 'id'|'n'
 *
 * @template {string} P pathname. /api/v1/users/:userId/posts/:postId
 */
export type ExtractParams<P extends string> = ExtractParamName<
  SplitPathSegments<P>[number]
>;

export type EmptyRecord = Record<string, unknown>;

export type BaseContext = {
  router: any;
  url: URL;
  request: Request;
  headers: Headers;
  params: Record<string, string>;
  pathname: string;
  $pathname: string[];
  timestamps: { request: number; response: number };
};

export type Context<
  ExtendContext extends Record<string, unknown> = Record<string, never>,
> = BaseContext & ExtendContext;

export type CTError = { error: Error | HttpError };
export type CTResponse = { response: Response };

export type RespondContext<
  ExtendContext extends Record<string, unknown> = Record<string, never>,
> = Partial<Pick<BaseContext, "headers">> & ExtendContext;

export type RouterConfig<
  ExtendContext extends Record<string, unknown> = Record<string, never>,
> = {
  maxPath: number;
  enable?: Partial<Record<Exclude<HandlerType, "handlers">, boolean>>;
  defaultFilter?: Handler<Context<ExtendContext>>;
  defaultFallback?: Handler<Context<ExtendContext>>;
  defaultCatcher?: Handler<Context<CTError & ExtendContext>>;
  defaultAfter?: Handler<Context<CTResponse & ExtendContext>>;
};

export interface RouteEntry<
  ExtendContext extends Record<string, unknown> = Record<string, never>,
> {
  parseParams: (
    pathname: string,
    parts: string[],
  ) => Record<string, string> | undefined;
  params?: Array<[number, string]>;
  pipe: Pipe<ExtendContext>;
  originalPath: string;
  standardPath: string;
  openApiPath: string;
  path: string;
  pathParts: string[];
}

export type HandlerRouteEntry<
  ExtendContext extends Record<string, unknown> = Record<string, never>,
> = RouteEntry<ExtendContext> & {
  openApi?: OpenApiDesc;
};

export interface RouteEntries<
  ExtendContext extends Record<string, unknown> = Record<string, never>,
> {
  method: HttpMethodUpper;
  entries: Array<Map<string, RouteEntry<ExtendContext>>>;
  globs: Array<Map<string, RouteEntry<ExtendContext>>>;
  superGlobs: Array<Map<string, RouteEntry<ExtendContext>>>;
}

export interface HandlerRouteEntries<
  ExtendContext extends Record<string, unknown> = Record<string, never>,
> {
  method: HttpMethodUpper;
  entries: Array<Map<string, HandlerRouteEntry<ExtendContext>>>;
  globs: Array<Map<string, HandlerRouteEntry<ExtendContext>>>;
  superGlobs: Array<Map<string, HandlerRouteEntry<ExtendContext>>>;
}

export type HandlerReturn =
  | Response
  | typeof Break_Pipeline
  | typeof Break_Pipe
  | void;

export type Handler<
  ExtendContext extends Record<string, unknown> = Record<string, never>,
> = (ctx: Context<ExtendContext>) => Promise<HandlerReturn> | HandlerReturn;

export type Pipe<
  ExtendContext extends Record<string, unknown> = Record<string, never>,
> = Array<Handler<ExtendContext>>;

export type RegisterPiplineOptions = {
  overwrite?: boolean;
};

export type HandlerRegisterPiplineOptions = {
  overwrite?: boolean;
  openApi?: OpenApiDesc;
};

export type HandlerDef<
  ExtendContext extends Record<string, unknown> = Record<string, never>,
> = Handler<ExtendContext> | Pipe<ExtendContext>;

export type PipeDef<
  ExtendContext extends Record<string, unknown> = Record<string, never>,
> = {
  pipe: Handler<ExtendContext> | Pipe<ExtendContext>;
} & HandlerRegisterPiplineOptions;

export class RouterError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
  }
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
  }
}

export type OpenApiDesc = {
  summary?: string;
  description?: string;
  tags?: string[];
  operationId?: string;
  parameters?: OpenApiParameter[];
  requestBody?: {
    required?: boolean;
    content: Record<
      string,
      {
        schema: OpenApiSchema;
      }
    >;
  };
  responses?: Record<
    string,
    {
      description: string;
      content?: Record<
        string,
        {
          schema: OpenApiSchema;
          example?: any;
        }
      >;
    }
  >;
  security?: Array<Record<string, string[]>>;
};

export type OpenApiPathItem = {
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: OpenApiParameter[];
  requestBody?: OpenApiRequestBody;
  responses: Record<string, OpenApiResponse>;
  security?: Array<Record<string, string[]>>;
  operationId?: string;
};

export type OpenApiRequestBody = {
  required?: boolean;
  content: Record<
    string,
    {
      schema: OpenApiSchema;
      examples?: Record<string, { value: any; summary?: string }>;
    }
  >;
};

export type OpenApiResponse = {
  description: string;
  content?: Record<
    string,
    {
      schema: OpenApiSchema;
      examples?: Record<string, { value: any; summary?: string }>;
    }
  >;
  headers?: Record<
    string,
    {
      description?: string;
      schema: OpenApiSchema;
    }
  >;
};

export type OpenApiSecurityScheme = {
  type: "apiKey" | "http" | "oauth2" | "openIdConnect";
  description?: string;
  name?: string;
  in?: "query" | "header" | "cookie";
  scheme?: string;
  bearerFormat?: string;
  flows?: {
    implicit?: { authorizationUrl: string; scopes: Record<string, string> };
    password?: { tokenUrl: string; scopes: Record<string, string> };
    clientCredentials?: { tokenUrl: string; scopes: Record<string, string> };
    authorizationCode?: {
      authorizationUrl: string;
      tokenUrl: string;
      scopes: Record<string, string>;
    };
  };
  openIdConnectUrl?: string;
};

export type OpenApiParameter = {
  name: string;
  in: "query" | "header" | "path" | "cookie";
  required?: boolean;
  schema: OpenApiSchema;
};

export type OpenApiSchema = {
  type: "string" | "number" | "integer" | "boolean" | "array" | "object";
  properties?: Record<string, OpenApiSchema>;
  items?: OpenApiSchema;
  required?: string[];
  enum?: string[];
};
