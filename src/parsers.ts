import { RJSON } from "@bepalo/rjson";
import {
  Break_Pipe,
  Break_Pipeline,
  HttpError,
  type Context,
  type EmptyRecord,
  type Handler,
  type MimeType,
} from "./types.ts";
import { status } from "./helpers.ts";
import { toBase64UUID } from "./utils.ts";

const CCColon = 58; // ":".charCodeAt(0);
const CCSemiColon = 59; // ";".charCodeAt(0);
const CCDQuote = 34; // '"'.charCodeAt(0);
const CCEqual = 61; // "=".charCodeAt(0);
const CCSpace = 32; // " ".charCodeAt(0);
const CCTab = 9; // "\t".charCodeAt(0);
const CCCR = 13; // "\r".charCodeAt(0);
const CCNL = 10; // "\n".charCodeAt(0);

/**
 * Parsed params.
 *
 * @type {Object} Params
 */
export type Params<
  Keys extends string = string,
  ExtendParams extends Record<Keys, string> | Record<string, string | unknown> =
    {},
> = Omit<Record<Keys, string>, keyof ExtendParams> & ExtendParams;

/**
 * Context object containing parsed params.
 *
 * @type {Object} CTParams
 * @property {Record<string, string>} params - Parsed params
 */
export type CTParams<
  Keys extends string = string,
  ExtendParams extends Record<Keys, string> | Record<string, string | unknown> =
    {},
> = {
  params: Params<Keys, ExtendParams>;
};

/**
 * Parsed query.
 *
 * @type {Object} Query
 */
export type Query<
  Keys extends string = string,
  ExtendQuery extends Record<Keys, string> | Record<string, string | unknown> =
    {},
> = Omit<Record<Keys, string>, keyof ExtendQuery> & ExtendQuery;

/**
 * Context object containing parsed query.
 *
 * @template {string} Keys - Keys to extend context Query. "q"|"search"
 * @template {Record<string, unknown>} ExtendQuery - Extend context Query
 *
 * @type {Object} CTQuery
 * @property {Record<string, string>} query - Parsed query
 */
export type CTQuery<
  Keys extends string = string,
  ExtendQuery extends Record<Keys, string> | Record<string, string | unknown> =
    {},
> = {
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
export const parseQuery = <
  Keys extends string = string,
  ExtendQuery extends Record<Keys, string> | Record<string, string | unknown> =
    {},
  ExtendContext extends Record<string, unknown> = EmptyRecord,
>(): Handler<ExtendContext & CTQuery<Keys, ExtendQuery>> => {
  return (ctx: Context<CTQuery<Keys, ExtendQuery> & ExtendContext>) => {
    if (ctx.query == null) {
      ctx.query = {} as Query<Keys, ExtendQuery>;
    }
    const searchParams = ctx.url.searchParams;
    for (const key of searchParams.keys()) {
      const values = searchParams.getAll(key);
      (ctx.query as any)[key] =
        values.length > 1 ? values[values.length - 1]! : values[0]!;
    }
  };
};

/**
 * Parses cookies from a Request object's Cookie header.
 * @template {Record<string, string>} Expected
 * @param {Request} req - The request object containing cookies
 * @returns {Expected|undefined} An object with cookie name-value pairs, or undefined if no cookies
 * @example
 * const cookies = parseCookieFromRequest(req);
 * // Returns: { session: "abc123", theme: "dark" }
 */
export const parseCookieFromRequest = <Expected extends Record<string, string>>(
  req: Request,
  cookies?: Expected,
): Expected | undefined => {
  const cookieHeader = req.headers.get("cookie");
  if (cookieHeader != null) {
    const _cookies: Record<string, string | unknown> = cookies ?? {};
    for (const pair of cookieHeader.split(";")) {
      const [rawName, rawValue, extra] = pair
        .trim()
        .split("=", 3)
        .map((token) => token.trim());
      if (
        rawName &&
        rawValue !== undefined &&
        rawValue !== "" &&
        extra === undefined
      ) {
        _cookies[rawName] = decodeURIComponent(rawValue);
      }
    }
    return _cookies as Expected;
  }
  return undefined;
};

/**
 * Parsed cookie.
 *
 * @type {Object} Cookies
 * @template {string} Keys - Keys to extend context Cookie. "session"|"geo"
 * @template {Record<string, string>} ExtendCookie - Extend context Cookie
 */
export type Cookies<
  Keys extends string = string,
  ExtendCookie extends Record<Keys, string> | Record<string, string | unknown> =
    {},
> = Omit<Record<Keys, string>, keyof ExtendCookie> & ExtendCookie;

/**
 * Context object containing parsed cookie.
 *
 * @type {Object} CTCookie
 * @property {Record<string, string|unknown>} cookie - Parsed cookie
 */
export type CTCookie<
  Keys extends string = string,
  ExtendCookie extends Record<Keys, string> | Record<string, string | unknown> =
    {},
> = {
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
export const parseCookie = <
  Keys extends string = string,
  ExtendCookie extends Record<Keys, string> | Record<string, string | unknown> =
    {},
  ExtendContext extends Record<string, unknown> = EmptyRecord,
>(): Handler<ExtendContext & CTCookie<Keys, ExtendCookie>> => {
  return (ctx: Context<CTCookie<Keys, ExtendCookie> & ExtendContext>) => {
    if (ctx.cookie == null) {
      ctx.cookie = {} as Cookies<Keys, ExtendCookie>;
    }
    parseCookieFromRequest(ctx.request, ctx.cookie);
  };
};

/**
 * Parsed body object types.
 * @type {Object|Array<unknown>|string|null|undefined} ParsedBody
 */
export type ParsedBody =
  | Record<string, unknown>
  | Array<unknown>
  | string
  | number
  | boolean
  | null
  | undefined;

/**
 * Context object containing parsed request body.
 *
 * @type {Object} CTBody
 * @template {any | ParsedBody} BodyType - Define body type
 * @property {ParsedBody} body - Parsed request body data
 */
export type CTBody<BodyType = ParsedBody> = {
  body: BodyType;
};

/**
 * Supported media types for request body parsing.
 * @type {"application/x-www-form-urlencoded"|"application/json"|"application/rjson"|"text/plain"} SupportedBodyMediaTypes
 */
export type SupportedBodyMediaTypes =
  | "application/x-www-form-urlencoded"
  | "application/json"
  | "application/rjson"
  | "text/plain";

/**
 * Fronzen Set of supported media types for request body parsing.
 */
export const SUPPORTED_MEDIA_TYPES = Object.freeze(
  new Set([
    "application/x-www-form-urlencoded",
    "application/json",
    "application/rjson",
    "text/plain",
  ]),
);

/**
 * Fronzen Array of supported media types for request body parsing.
 */
export const SUPPORTED_MEDIA_TYPES_LIST = Object.freeze(
  Array.from(SUPPORTED_MEDIA_TYPES.keys()),
);

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
export const parseBody = <
  ExtendContext extends Record<string, unknown> = EmptyRecord,
>(options?: {
  accept?: SupportedBodyMediaTypes | SupportedBodyMediaTypes[]; // defaults to all
  maxSize?: number; // in bytes
  once?: boolean;
  clone?: boolean;
}): Handler<ExtendContext & CTBody> => {
  const accept = new Set(
    options?.accept
      ? Array.isArray(options.accept)
        ? options.accept
        : [options.accept]
      : SUPPORTED_MEDIA_TYPES_LIST,
  );
  const maxSize = options?.maxSize ?? 1024 * 1024; // Default 1MB
  const once = options?.once;
  const clone = options?.clone;
  return async (ctx: Context<ExtendContext & CTBody>) => {
    if (once && ctx.body) return;
    const { request } = ctx;
    const contentType = request.headers.get("content-type")?.split(";", 2)[0];
    if (!(contentType && accept.has(contentType))) {
      await request.body?.cancel().catch(() => {});
      return status(415);
    }
    const req = clone ? request.clone() : request;
    try {
      const contentLengthHeader = req.headers.get("content-length");
      const contentLength = contentLengthHeader
        ? parseInt(contentLengthHeader)
        : undefined;
      if (contentLength === 0) {
        ctx.body = undefined;
        return;
      }
      if (contentLength !== undefined && contentLength > maxSize) {
        await request.body?.cancel().catch(() => {});
        if (clone) await req.body?.cancel().catch(() => {});
        return status(413);
      }
      switch (contentType) {
        case "application/x-www-form-urlencoded": {
          const searchParams = new URLSearchParams(await req.text());
          ctx.body = {} as Record<string, string>;
          for (const key of searchParams.keys()) {
            ctx.body[key] = searchParams.get(key);
          }
          break;
        }
        case "application/json":
          ctx.body = (await req.json()) as ParsedBody;
          break;
        case "application/rjson":
          ctx.body = RJSON.parse(await req.text()) as ParsedBody;
          break;
        case "text/plain":
          ctx.body = await req.text();
          break;
        default:
          ctx.body = undefined;
          break;
      }
    } catch {
      await request.body?.cancel().catch(() => {});
      if (clone) await req.body?.cancel().catch(() => {});
      return status(400, "Malformed Payload");
    }
  };
};

enum ParseHeaderState {
  FindingKeyStart = 0,
  FindingKeyEnd = 1,
  FindingValueStart = 2,
  FindingValueEnd = 3,
}

export const parseHeaders = (
  rawHeaders: Uint8Array,
  contentDisposition?: object,
): Headers => {
  const headers = new Headers();
  if (rawHeaders.length > 0) {
    const len_1 = rawHeaders.length - 1;
    const textDecoder = new TextDecoder();
    let keyStartIdx = 0;
    let keyEndIdx = -1;
    let valueStartIdx = -1;
    let valueEndIdx = -1;
    let key: string = "";
    let value: string = "";
    let parseHeaderState: number = ParseHeaderState.FindingKeyStart;
    let i = 0;
    over: while (i < rawHeaders.length) {
      switch (parseHeaderState) {
        case ParseHeaderState.FindingKeyStart: {
          free: for (; i < rawHeaders.length; i++) {
            const byte = rawHeaders[i];
            switch (byte) {
              case CCSpace:
              case CCTab:
                keyStartIdx = i + 1;
                continue;
              case CCColon: {
                keyStartIdx = i;
                keyEndIdx = i;
                key = "";
                parseHeaderState = ParseHeaderState.FindingValueStart;
                i++;
                break free;
              }
              case CCCR:
              case CCNL:
                throw new HttpError(400, "Invalid header");
              default:
                keyStartIdx = i;
                parseHeaderState = ParseHeaderState.FindingKeyEnd;
                i++;
                break free;
            }
          }
          break;
        }
        case ParseHeaderState.FindingKeyEnd: {
          free: for (; i < rawHeaders.length; i++) {
            const byte = rawHeaders[i];
            switch (byte) {
              case CCColon: {
                keyEndIdx = i;
                valueStartIdx = i + 1;
                parseHeaderState = ParseHeaderState.FindingValueStart;
                i++;
                break free;
              }
              case CCSpace:
              case CCTab: {
                keyEndIdx = i;
                parseHeaderState = ParseHeaderState.FindingValueStart;
                valueStartIdx = i + 1;
                i++;
                break free;
              }
              case CCCR:
              case CCNL:
                throw new HttpError(400, "Invalid header");
              default:
                keyEndIdx = i + 1;
                break;
            }
          }
          break;
        }
        case ParseHeaderState.FindingValueStart: {
          free: for (; i < rawHeaders.length; i++) {
            const byte = rawHeaders[i];
            switch (byte) {
              case CCColon:
              case CCSpace:
              case CCTab:
                valueStartIdx = i + 1;
                continue;
              default:
                valueStartIdx = i;
                parseHeaderState = ParseHeaderState.FindingValueEnd;
                i++;
                break free;
            }
          }
          break;
        }
        case ParseHeaderState.FindingValueEnd:
          free: for (; i < rawHeaders.length; i++) {
            const byte = rawHeaders[i];
            switch (byte) {
              case CCCR:
              case CCNL: {
                valueEndIdx = i;
                const keyChunk = rawHeaders.subarray(keyStartIdx, keyEndIdx);
                const valueChunk = rawHeaders.subarray(
                  valueStartIdx,
                  valueEndIdx,
                );
                key = textDecoder.decode(keyChunk);
                value = textDecoder.decode(valueChunk);
                parseHeaderState = ParseHeaderState.FindingKeyStart;
                if (key.length === 0) {
                  throw new HttpError(400, "Invalid header");
                }
                headers.append(key, value);
                // advance to new line
                if (i < len_1) {
                  const nextByte = rawHeaders[i + 1];
                  if (nextByte === CCNL || nextByte === CCCR) {
                    i++;
                  }
                }
                i++;
                key = "";
                value = "";
                keyStartIdx = i + 1;
                keyEndIdx = -1;
                valueStartIdx = -1;
                valueEndIdx = -1;
                break free;
              }
              default:
                valueEndIdx = i + 1;
                break;
            }
          }
          break;
        default:
          break over;
      }
    }
    if (
      parseHeaderState === ParseHeaderState.FindingValueStart ||
      parseHeaderState === ParseHeaderState.FindingValueEnd
    ) {
      valueEndIdx = rawHeaders.length;
      const keyChunk = rawHeaders.subarray(keyStartIdx, keyEndIdx);
      const valueChunk = rawHeaders.subarray(valueStartIdx, valueEndIdx);
      key = textDecoder.decode(keyChunk);
      value = textDecoder.decode(valueChunk);
      parseHeaderState = ParseHeaderState.FindingKeyStart;
      if (key.length === 0) {
        throw new HttpError(400, "Invalid header");
      }
      headers.append(key, value);
    }
  }
  if (contentDisposition != null && headers.has("content-disposition")) {
    const dispositionHeader = headers.get("content-disposition")!;
    let mode = 0;
    let keyIdx0 = -1;
    let keyIdx1 = -1;
    let valueIdx0 = -1;
    let valueIdx1 = -1;
    // skip until first key
    let i = 0;
    for (; i < dispositionHeader.length; i++) {
      const ch = dispositionHeader.charCodeAt(i);
      if (ch === CCSemiColon) {
        i++;
        break;
      }
    }
    // parse name and filename
    for (; i < dispositionHeader.length; i++) {
      const ch = dispositionHeader.charCodeAt(i);
      switch (ch) {
        case CCEqual:
          switch (mode) {
            case 1:
              keyIdx1 = i;
              mode = 2;
              break;
            default:
              throw new HttpError(400, "Invalid Content-Disposition header");
          }
          break;
        case CCDQuote:
          switch (mode) {
            case 2:
              valueIdx0 = i + 1;
              mode = 4;
              break;
            case 4:
              valueIdx1 = i;
              mode = 5;
              break;
            default:
              throw new HttpError(400, "Invalid Content-Disposition header");
          }
          break;
        case CCSemiColon:
          switch (mode) {
            case 3:
              valueIdx1 = i;
              mode = 5;
              break;
            case 0:
            case 5:
              break;
            case 4:
            default:
              throw new HttpError(400, "Invalid Content-Disposition header");
          }
          break;
        case CCSpace:
        case CCTab:
          break;
        case CCCR:
        case CCNL:
          throw new HttpError(400, "Invalid Content-Disposition header");
        default:
          switch (mode) {
            case 0:
              keyIdx0 = i;
              mode = 1;
              break;
            case 2:
              valueIdx0 = i;
              mode = 3;
              break;
            case 1:
            case 3:
            case 4:
              break;
            default:
              throw new HttpError(400, "Invalid Content-Disposition header");
          }
      }
      if (mode === 5) {
        if (keyIdx0 < 0 || keyIdx1 < 0 || valueIdx0 < 0 || valueIdx1 < 0) {
          throw new HttpError(400, "Invalid Content-Disposition header");
        }
        mode = 0;
        const key = dispositionHeader.substring(keyIdx0, keyIdx1);
        const value = dispositionHeader.substring(valueIdx0, valueIdx1);
        (contentDisposition as any)[key] = value;
      }
    }
  }
  return headers;
};

export type ParsedFormDataFile<
  ExtendParsedFormDataFile extends Record<string, unknown> = EmptyRecord,
> = {
  name: string;
  type: MimeType;
  size: number;
  totalSize?: number;
} & ExtendParsedFormDataFile;

export type CTFormData<
  ExtendParsedFormDataFile extends Record<string, unknown> = EmptyRecord,
> = {
  files: Map<string, ParsedFormDataFile<ExtendParsedFormDataFile>>;
  fields: Map<string, string | any>;
};

export type ParseMultipartCallbacksReturnType =
  | Response
  | typeof Break_Pipeline
  | typeof Break_Pipe
  | void
  | Promise<Response | typeof Break_Pipeline | typeof Break_Pipe | void>;

enum ParseMultipartState {
  Initializing = 0,
  FindingBoundary = 1,
  CheckingEndBoundary = 2,
  FindingCRLF = 3,
  ParsingHeaders = 4,
  ParsingChunk = 5,
  Done = 6,
}

export const parseMultipart = <
  ExtendContext extends Record<string, unknown> = EmptyRecord,
  ExtendParsedFormDataFile extends Record<string, unknown> = EmptyRecord,
>({
  idGenerator,
  onStart,
  onEnd,
  onHeader,
  onData,
  onDataCompletion,
}: {
  idGenerator?: (info: {
    headers: Headers;
    name: string;
    filename?: string;
  }) => string;
  onStart?: (
    ctx: Context<CTFormData<ExtendParsedFormDataFile> & ExtendContext>,
  ) => ParseMultipartCallbacksReturnType;
  onEnd?: (
    ctx: Context<CTFormData<ExtendParsedFormDataFile> & ExtendContext>,
    info: {
      success: boolean;
      error?: Error | HttpError;
    },
  ) => ParseMultipartCallbacksReturnType;
  onHeader?: (
    ctx: Context<CTFormData<ExtendParsedFormDataFile> & ExtendContext>,
    info: {
      headers: Headers;
      id: string;
      name: string;
      filename?: string;
      file?: ParsedFormDataFile<ExtendParsedFormDataFile>;
    },
  ) => ParseMultipartCallbacksReturnType;
  onData: (
    ctx: Context<CTFormData<ExtendParsedFormDataFile> & ExtendContext>,
    info: {
      chunk: Uint8Array;
      headers: Headers;
      id: string;
      name: string;
      filename?: string;
      file?: ParsedFormDataFile<ExtendParsedFormDataFile>;
    },
  ) => ParseMultipartCallbacksReturnType;
  onDataCompletion: (
    ctx: Context<CTFormData<ExtendParsedFormDataFile> & ExtendContext>,
    info: {
      headers: Headers;
      id: string;
      name: string;
      filename?: string;
      file?: ParsedFormDataFile<ExtendParsedFormDataFile>;
    },
  ) => ParseMultipartCallbacksReturnType;
}): Handler<CTFormData<ExtendParsedFormDataFile> & ExtendContext> => {
  const prefix = new TextEncoder().encode("--");
  const crlfPrefix = new TextEncoder().encode("\r\n--");
  const endSuffix = new TextEncoder().encode("--");
  const crlf1 = new Uint8Array(new TextEncoder().encode("\r\n"));
  const crlf2 = new Uint8Array(new TextEncoder().encode("\r\n\r\n"));

  return async (
    ctx: Context<CTFormData<ExtendParsedFormDataFile> & ExtendContext>,
  ) => {
    const { request } = ctx;
    const headers = request.headers;
    const contentTypeHedaer = headers.get("content-type")?.trim();
    let error: HttpError | undefined;
    let boundary = new Uint8Array();
    let boundaryPre = new Uint8Array();
    let boundaryPost = new Uint8Array();
    let response: Response | typeof Break_Pipeline | typeof Break_Pipe | void =
      undefined;
    if (request.body == null) {
      error = new HttpError(400, "Empty body");
    }
    if (
      error == null &&
      (contentTypeHedaer == null ||
        !(contentTypeHedaer.length === 19
          ? contentTypeHedaer.startsWith("multipart/form-data")
          : contentTypeHedaer.startsWith("multipart/form-data;")))
    ) {
      error = new HttpError(415, "Invalid header");
    }
    if (error == null && contentTypeHedaer != null) {
      const separatorIndex = contentTypeHedaer.indexOf(";");
      const boundaryHeader =
        separatorIndex != -1 &&
        contentTypeHedaer.substring(separatorIndex).trim();
      const equalsIndex = boundaryHeader && boundaryHeader.indexOf("=");
      const boundaryStr =
        equalsIndex &&
        equalsIndex > -1 &&
        boundaryHeader.substring(equalsIndex + 1).trim();
      if (!boundaryStr) {
        error = new HttpError(415, "Invalid boundary");
      } else {
        const boundaryBytes = new TextEncoder().encode(boundaryStr);
        const boundaryLen = boundaryBytes.length;
        const crlfPrefixLen = crlfPrefix.length;
        //
        boundary = new Uint8Array(prefix.length + boundaryLen);
        boundary.set(prefix, 0);
        boundary.set(boundaryBytes, prefix.length);
        //
        boundaryPre = new Uint8Array(crlfPrefixLen + boundaryLen);
        boundaryPre.set(crlfPrefix, 0);
        boundaryPre.set(boundaryBytes, crlfPrefixLen);
        //
        boundaryPost = new Uint8Array(
          prefix.length + boundaryLen + crlf1.length,
        );
        boundaryPost.set(prefix, 0);
        boundaryPost.set(boundaryBytes, prefix.length);
        boundaryPost.set(crlf1, prefix.length + boundaryLen);
      }
    }
    // initialize context
    ctx.fields = new Map();
    ctx.files = new Map();
    // start processing body as a stream of chunks
    if (error == null && response == null && onStart != null) {
      response = await onStart(ctx);
    }
    if (error == null && response == null) {
      const reader = request.body!.getReader();
      const crlf_len_1 = crlf2.length - 1;
      let parserState: number = ParseMultipartState.Initializing;
      let boundaryIdx = 0;
      let crlfIdx = 0;
      // find boundary starting from offset and based on boundaryIdx previously set
      const findBoundary = (
        chunk: Uint8Array,
        boundary: Uint8Array,
        offset: number = 0,
      ): [number, number, boolean, boolean] => {
        const boundary_len_1 = boundary.length - 1;
        let i = 0;
        let startIdx = -1;
        let matching = false;
        // check unfinished boundary
        if (boundaryIdx > 0) {
          for (i = offset; i < chunk.length; i++) {
            if (chunk[i] === boundary[boundaryIdx]) {
              if (!matching && boundaryIdx < boundary_len_1) {
                matching = true;
                startIdx = i;
              } else if (boundaryIdx === boundary_len_1) {
                boundaryIdx = 0;
                return [!matching ? 0 : startIdx, i + 1, true, false];
              }
              boundaryIdx++;
            } else if (matching) {
              boundaryIdx = 0;
              startIdx = -1;
              matching = false;
            }
          }
          // boundary spans whole chunk
          if (matching && i >= chunk.length) {
            return [startIdx < 0 ? 0 : startIdx, -1, false, true];
          } else {
            boundaryIdx = 0;
            matching = false;
          }
        }
        for (i = offset; i < chunk.length; i++) {
          if (chunk[i] === boundary[boundaryIdx]) {
            if (!matching) {
              matching = true;
              startIdx = i;
            } else if (boundaryIdx === boundary_len_1) {
              boundaryIdx = 0;
              return [startIdx, i + 1, false, false];
            }
            boundaryIdx++;
          } else if (matching) {
            boundaryIdx = 0;
            startIdx = -1;
            matching = false;
          }
        }
        return [startIdx, -1, false, false];
      };
      // find \r\n\r\n starting from offset and based on crlfIdx previously set
      const findCRLF = (
        chunk: Uint8Array,
        offset: number = 0,
      ): [number, number, boolean] => {
        let i = 0;
        let startIdx = -1;
        let matching = false;
        if (crlfIdx > 0) {
          for (i = offset; i < chunk.length; i++) {
            if (chunk[i] === crlf2[crlfIdx]) {
              if (!matching && crlfIdx < crlf_len_1) {
                matching = true;
                startIdx = i;
              } else if (crlfIdx === crlf_len_1) {
                crlfIdx = 0;
                return [!matching ? 0 : startIdx, i + 1, true];
              }
              crlfIdx++;
            } else if (matching) {
              crlfIdx = 0;
              startIdx = -1;
              matching = false;
            }
          }
          crlfIdx = 0;
          matching = false;
        }
        for (i = offset; i < chunk.length; i++) {
          if (chunk[i] === crlf2[crlfIdx]) {
            if (!matching) {
              matching = true;
              startIdx = i;
            } else if (crlfIdx === crlf_len_1) {
              crlfIdx = 0;
              return [startIdx, i + 1, false];
            }
            crlfIdx++;
          } else if (matching) {
            crlfIdx = 0;
            startIdx = -1;
            matching = false;
          }
        }
        return [startIdx, -1, false];
      };
      ////////////////////////
      let streamIsDone = false;
      const getNextChunk = async (): Promise<Uint8Array | undefined> => {
        const { done, value } = await reader.read();
        if (done) {
          streamIsDone = done;
        }
        return value;
      };
      ////////////////////////////
      let initializationStepDone = false;
      let activeHeaders: Headers | undefined = undefined;
      let activeId: string = "";
      let activeName: string = "";
      let activeFilename: string | undefined = undefined;
      let activeChunk: Uint8Array | undefined = undefined;
      let activeHeaderStart: number = -1;
      let activeHeaderEnd: number = -1;
      let activeBodyStart: number = -1;
      let activeBodyEnd: number = -1;
      let leftOverBoundary: Uint8Array | undefined = undefined;
      let leftOverHeader: Uint8Array | undefined = undefined;
      let expectBoundaryCRLF: number = 0;
      let headersChunks: Uint8Array[] = [];
      let fileInfo: ParsedFormDataFile<ExtendParsedFormDataFile> | undefined =
        undefined;
      ///////////////////////////////////////
      away: while (parserState !== ParseMultipartState.Done) {
        switch (parserState) {
          case ParseMultipartState.Initializing: {
            activeChunk = await getNextChunk();
            parserState = ParseMultipartState.FindingBoundary;
            activeHeaderStart = -1;
            activeHeaderEnd = -1;
            activeBodyStart = -1;
            activeBodyEnd = -1;
            break;
          }
          case ParseMultipartState.FindingBoundary: {
            if (activeChunk == null) {
              if (!streamIsDone) {
                error = new HttpError(400, "Invalid body");
              }
              break away;
            }
            // find start boundary
            const [
              boundaryStart,
              boundaryEnd,
              leftOverMatch,
              leftOverCompleteMatch,
            ] = findBoundary(
              activeChunk,
              initializationStepDone ? boundaryPre : boundary,
              activeHeaderEnd < 0 ? 0 : activeHeaderEnd + 2,
            );
            if (
              streamIsDone &&
              ((boundaryEnd != -1 &&
                activeChunk[boundaryEnd] === endSuffix[0] &&
                activeChunk[boundaryEnd + 1] === endSuffix[1]) ||
                boundaryStart + 2 >= boundaryEnd)
            ) {
              break away;
            }
            if (!initializationStepDone && boundaryStart < 0) {
              error = new HttpError(400, "Invalid body");
              break away;
            }
            // check for leftOverBoundary
            if (
              leftOverBoundary != null &&
              !leftOverMatch &&
              !leftOverCompleteMatch &&
              boundaryIdx === 0
            ) {
              if (fileInfo != null) {
                (fileInfo as any).size += leftOverBoundary.length;
              }
              response = await onData(ctx, {
                chunk: leftOverBoundary,
                headers: activeHeaders!,
                id: activeId,
                name: activeName,
                filename: activeFilename,
                file: fileInfo,
              });
              if (response != null) {
                break away;
              }
              leftOverBoundary = undefined;
            } else if (leftOverMatch) {
              if (initializationStepDone && onDataCompletion != null) {
                response = await onDataCompletion(ctx, {
                  headers: activeHeaders!,
                  id: activeId,
                  name: activeName,
                  filename: activeFilename,
                  file: fileInfo,
                });
                if (response != null) {
                  break away;
                }
              }
              leftOverBoundary = undefined;
            }
            if (leftOverCompleteMatch) {
              activeBodyEnd = -1;
              activeHeaderStart = -1;
            } else {
              activeBodyEnd = boundaryStart;
              activeHeaderStart = boundaryEnd + 2;
            }
            // keep looking if not found
            if (boundaryStart < 0) {
              if (streamIsDone) {
                error = new HttpError(400, "Invalid body");
                break away;
              }
              if (initializationStepDone && activeBodyStart != -1) {
                const chunk = activeChunk.subarray(
                  activeBodyStart,
                  activeChunk.length - boundaryIdx,
                );
                if (fileInfo != null) {
                  (fileInfo as any).size += chunk.length;
                }
                response = await onData(ctx, {
                  chunk,
                  headers: activeHeaders!,
                  id: activeId,
                  name: activeName,
                  filename: activeFilename,
                  file: fileInfo,
                });
                if (response != null) {
                  break away;
                }
              }
              activeChunk = await getNextChunk();
              activeHeaderStart = -1;
              activeHeaderEnd = -1;
              activeBodyStart = 0;
              activeBodyEnd = -1;
              continue;
            }
            // keep looking for the boundaryEnd in the next chunk
            if (boundaryEnd < 0) {
              if (streamIsDone) {
                error = new HttpError(400, "Invalid body");
                break away;
              }
              if (leftOverBoundary != null && boundaryStart !== -1) {
                const currentLeftOver = activeChunk.subarray(
                  boundaryStart,
                  activeChunk.length - boundaryStart,
                );
                const newLeftOver: Uint8Array = new Uint8Array(
                  leftOverBoundary.length + currentLeftOver.length,
                );
                newLeftOver.set(leftOverBoundary, 0);
                newLeftOver.set(currentLeftOver, leftOverBoundary.length);
                leftOverBoundary = newLeftOver;
              } else {
                leftOverBoundary = activeChunk.subarray(
                  activeChunk.length - boundaryIdx,
                );
              }
              if (!leftOverCompleteMatch && activeBodyEnd > 0) {
                const chunk = activeChunk.subarray(
                  activeBodyStart,
                  activeBodyEnd,
                );
                if (fileInfo != null) {
                  (fileInfo as any).size += chunk.length;
                }
                response = await onData(ctx, {
                  chunk,
                  headers: activeHeaders!,
                  id: activeId,
                  name: activeName,
                  filename: activeFilename,
                  file: fileInfo,
                });
                if (response != null) {
                  break away;
                }
              }
              activeChunk = await getNextChunk();
              activeHeaderStart = -1;
              activeHeaderEnd = -1;
              activeBodyStart = 0;
              activeBodyEnd = -1;
              continue;
            }
            if (
              !leftOverCompleteMatch &&
              boundaryEnd > activeChunk.length - crlf1.length
            ) {
              expectBoundaryCRLF =
                crlf1.length - (activeChunk.length - boundaryEnd);
            } else {
              expectBoundaryCRLF = 0;
            }
            parserState = initializationStepDone
              ? ParseMultipartState.ParsingChunk
              : ParseMultipartState.FindingCRLF;
            if (!initializationStepDone) {
              initializationStepDone = true;
            }
            break;
          }
          case ParseMultipartState.FindingCRLF: {
            if (activeChunk == null) {
              if (!streamIsDone) {
                error = new HttpError(400, "Invalid body");
              }
              break away;
            }
            if (activeHeaderStart < 0) {
              if (expectBoundaryCRLF > 0) {
                activeHeaderStart = expectBoundaryCRLF;
                expectBoundaryCRLF = 0;
              } else {
                activeHeaderStart = 0;
              }
            }
            // find crlf2
            const [crlfStart, crlfEnd, leftOverHeaderMatch] = findCRLF(
              activeChunk,
              activeHeaderStart,
            );
            // check for leftOverHeader
            if (leftOverHeader != null && !leftOverHeaderMatch) {
              headersChunks.push(leftOverHeader);
              leftOverHeader = undefined;
            }
            // keep looking if not found
            if (crlfStart < 0) {
              if (streamIsDone) {
                error = new HttpError(400, "Invalid body");
                break away;
              }
              const headerChunk = activeChunk.subarray(
                activeHeaderStart,
                activeChunk.length,
              );
              headersChunks.push(headerChunk);
              activeChunk = await getNextChunk();
              activeHeaderStart = -1;
              activeHeaderEnd = -1;
              activeBodyStart = -1;
              activeBodyEnd = -1;
              continue;
            }
            activeHeaderEnd = crlfStart;
            // keep looking for the crlfEnd in the next chunk
            if (crlfEnd < 0) {
              if (streamIsDone) {
                error = new HttpError(400, "Invalid body");
                break away;
              }
              if (leftOverHeader != null) {
                const currentLeftOver = activeChunk.subarray(activeHeaderEnd);
                const newLeftOver: Uint8Array = new Uint8Array(
                  leftOverHeader.length + currentLeftOver.length,
                );
                newLeftOver.set(leftOverHeader, 0);
                newLeftOver.set(currentLeftOver, leftOverHeader.length);
                leftOverBoundary = newLeftOver;
              } else {
                leftOverHeader = activeChunk.subarray(activeHeaderEnd);
              }
              const headerChunk = activeChunk.subarray(
                activeHeaderStart,
                activeHeaderEnd,
              );
              headersChunks.push(headerChunk);
              activeChunk = await getNextChunk();
              activeHeaderStart = 0;
              activeHeaderEnd = -1;
              activeBodyStart = -1;
              activeBodyEnd = -1;
              continue;
            }
            activeBodyStart = crlfEnd;
            if (activeHeaderStart != -1) {
              const headerChunk = activeChunk.subarray(
                activeHeaderStart,
                activeHeaderEnd,
              );
              headersChunks.push(headerChunk);
            }
            parserState = ParseMultipartState.ParsingHeaders;
            break;
          }
          case ParseMultipartState.ParsingHeaders: {
            if (activeChunk == null) {
              if (!streamIsDone) {
                error = new HttpError(400, "Invalid body");
              }
              break away;
            }
            let buffer =
              headersChunks.length === 1 ? headersChunks[0] : undefined;
            if (headersChunks.length > 1) {
              let requiredSize = 0;
              let bufferOffset = 0;
              for (const headerChunk of headersChunks) {
                requiredSize += headerChunk.length;
              }
              buffer = new Uint8Array(requiredSize);
              for (const headerChunk of headersChunks) {
                if (headerChunk.length === 0) {
                  continue;
                }
                buffer.set(headerChunk, bufferOffset);
                bufferOffset += headerChunk.length;
              }
            }
            headersChunks = [];
            leftOverHeader = undefined;
            const contentDisposition: any = {};
            activeHeaders = parseHeaders(
              new Uint8Array(buffer!),
              contentDisposition,
            );
            if (contentDisposition["name"] == null) {
              throw new HttpError(400, "Invalid Content-Disposition header");
            }
            // intialize for formdata part
            activeName = contentDisposition.name;
            activeFilename = contentDisposition.filename;
            activeId =
              idGenerator != null
                ? idGenerator({
                    headers: activeHeaders,
                    name: activeName,
                    filename: activeFilename,
                  })
                : toBase64UUID(crypto.randomUUID());
            if (activeFilename != null) {
              const contentTypeHeader = activeHeaders.get("content-type");
              const contentLengthHeader = activeHeaders.get("content-length");
              const size = 0;
              const totalSize = contentLengthHeader
                ? parseInt(contentLengthHeader)
                : null;
              const type = (
                contentTypeHeader
                  ? contentTypeHeader
                  : "application/octet-stream"
              ) as MimeType;
              fileInfo = {
                name: activeFilename,
                size,
                totalSize,
                type,
              } as ParsedFormDataFile<ExtendParsedFormDataFile>;
              ctx.files.set(activeId, fileInfo);
            } else {
              ctx.fields.set(activeName, null);
            }
            // invoke callback
            if (onHeader != null) {
              response = await onHeader(ctx, {
                headers: activeHeaders,
                id: activeId,
                name: activeName,
                filename: activeFilename,
                file: fileInfo,
              });
              if (response != null) {
                break away;
              }
            }
            parserState = ParseMultipartState.FindingBoundary;
            break;
          }
          case ParseMultipartState.ParsingChunk: {
            if (activeChunk == null) {
              if (!streamIsDone) {
                error = new HttpError(400, "Invalid body");
              }
              break away;
            }
            if (activeBodyStart != -1 && activeBodyStart < activeBodyEnd) {
              const chunk = activeChunk.subarray(
                activeBodyStart,
                activeBodyEnd,
              );
              if (fileInfo != null) {
                (fileInfo as any).size += chunk.length;
              }
              response = await onData(ctx, {
                chunk,
                headers: activeHeaders!,
                id: activeId,
                name: activeName,
                filename: activeFilename,
                file: fileInfo,
              });
              if (response != null) {
                break away;
              }
              if (onDataCompletion != null) {
                response = await onDataCompletion(ctx, {
                  headers: activeHeaders!,
                  id: activeId,
                  name: activeName,
                  filename: activeFilename,
                  file: fileInfo,
                });
                if (response != null) {
                  break away;
                }
              }
            }
            parserState = ParseMultipartState.FindingCRLF;
            break;
          }
        }
      }
    }
    // handle completion and return a response
    if (onEnd != null) {
      response = await onEnd(ctx, {
        success: error == null,
        error,
      });
    }
    if (response instanceof Response) {
      return response;
    } else if (response === Break_Pipe) {
      return Break_Pipe;
    } else if (response === Break_Pipeline) {
      return Break_Pipeline;
    }
    return error == null ? status(200) : status(error.status, error.message);
  };
};
