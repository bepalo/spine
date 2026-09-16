// src/router.ts

import { getHttpStatusText, Status } from "./status.ts";
import {
  Break_Pipe,
  Break_Pipeline,
  ExtractParams,
  HttpError,
  RouterError,
  type HttpMethodLower,
  type OpenApiOperation,
  type OpenApiParameter,
  type OpenApiResponse,
  type Context,
  type CTError,
  type CTResponse,
  type EmptyRecord,
  type Handler,
  type HandlerRouteEntries,
  type HandlerRouteEntry,
  type HandlerType,
  type HttpMethod,
  type HttpMethodUpper,
  type MethodPath,
  type Path,
  type Pipe,
  type RegisterPipelineOptions,
  type RespondContext,
  type RouteEntries,
  type RouteEntry,
  type RouterConfig,
  OpenApiSchema,
  OpenApiSecurityScheme,
  GenerateOpenApiInfo,
  GenerateOpenAPIOptions,
  GeneratedOpenApi,
  GenerateOpenAPISortParam,
  SORT_METHOD_PRIORITY_INDEX,
  EndHandler,
  EndPipe,
  ErrorHandler,
  ErrorPipe,
  ExtractMethodPathsParams,
} from "./types.ts";
import { CTParams } from "./parsers.ts";
import { walk, dynamicImport } from "./utils.node.ts";

export const EMPTY_PARAMS = Object.freeze({});

const W = "[\\p{L}\\p{M}\\p{N}\\p{S}\\p{P}_\\-\\s.]";
export const PATH_PART_REGEX = new RegExp(
  `^(?:#?${W}+|\\[(?:${W}*|#{1,2}|##\\s*${W}*\\s*|\\[##\\s*${W}*\\s*\\]|\\[${W}*(?:,${W}*)*\\](?:\\s*${W}*\\s*|\\[\\s*${W}*\\s*\\]))\\])$`,
  "u",
);

export const REGISTER_PATH_REGEX = new RegExp(
  `^(?:/(?:${W}*|${W}*(?:\\|${W}*)*:${W}*|\\*))+|(?:/${W}*)*(?:/\\.?\\*\\*)|(?:/${W}*)*(?:/::${W}*)$`,
  "u",
);

export const HTTP_METHODS = new Set<HttpMethod>([
  "Head",
  "Get",
  "Query",
  "Post",
  "Put",
  "Patch",
  "Delete",
  "Options",
  "Trace",
  "Connect",
]);

export const CRUD_METHODS = new Set<HttpMethod>([
  "Get",
  "Query",
  "Post",
  "Put",
  "Patch",
  "Delete",
]);

export const HTTP_METHODS_UPPER = new Set<HttpMethodUpper>([
  "HEAD",
  "GET",
  "QUERY",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "OPTIONS",
  "TRACE",
  "CONNECT",
]);

export const HANDLER_TYPES = new Set<HandlerType>([
  "handler",
  "filter",
  "fallback",
  "catcher",
  "after",
]);

/**
 * The Router class.
 *
 * @template {Record<string, unknown>} ExtendContext - Extend Router Context
 */
export class Router<
  _ExtendContext extends Record<string, unknown> = EmptyRecord,
  ExtendContext extends {
    router: Router<_ExtendContext, { router: any }>;
  } = _ExtendContext & {
    router: Router<_ExtendContext, { router: any }>;
  },
> {
  #config: Omit<RouterConfig<ExtendContext>, "maxPath" | "enable" | "disable"> &
    Required<Pick<RouterConfig<ExtendContext>, "maxPath" | "enable">>;
  #routes: Omit<
    Record<HandlerType, Record<HttpMethodUpper, RouteEntries<ExtendContext>>>,
    "handler"
  > &
    Record<
      Extract<HandlerType, "handler">,
      Record<HttpMethodUpper, HandlerRouteEntries<ExtendContext>>
    >;
  #setters: Array<{
    handlerType: HandlerType;
    methodPaths: MethodPath | Array<MethodPath>;
    pipe:
      | Handler<ExtendContext>
      | ErrorHandler<ExtendContext>
      | EndHandler<ExtendContext>
      | Pipe<ExtendContext>
      | ErrorPipe<ExtendContext>
      | EndPipe<ExtendContext>;
    options?: RegisterPipelineOptions | RegisterPipelineOptions;
  }> = [];

  get maxPath() {
    return this.#config.maxPath;
  }

  get enable() {
    return { ...this.#config.enable };
  }

  get doNotStoreSetters() {
    return this.#config.doNotStoreSetters;
  }

  get setters() {
    return [...this.#setters];
  }

  /**
   * Create a new Router
   *
   * @param {RouterConfig<ExtendContext>} config Router configs
   */
  constructor(config: RouterConfig<ExtendContext>) {
    const {
      maxPath,
      doNotStoreSetters,
      enable,
      disable,
      defaultFilter,
      defaultHandler,
      defaultFallback,
      defaultCatcher,
      defaultAfter,
      afterCatcher,
    } = config;
    if (typeof maxPath !== "number" || maxPath <= 0 || maxPath >= 1024) {
      throw new RouterError("Invalid maxPath. Use range 1 upto 1024");
    }
    this.#config = {
      maxPath,
      doNotStoreSetters: Boolean(doNotStoreSetters),
      enable: {
        filter: (!disable?.filter && enable?.filter) ?? true,
        fallback: (!disable?.fallback && enable?.fallback) ?? true,
        after: (!disable?.after && enable?.after) ?? true,
        catcher: (!disable?.catcher && enable?.catcher) ?? true,
      },
      defaultFilter,
      defaultHandler,
      defaultFallback,
      defaultCatcher,
      defaultAfter,
      afterCatcher,
    };
    this.#routes = this.#initRoutes();
  }

  /**
   * Respond to a request according to the defined routes.
   *
   * @param {Request} request An http request object
   * @param {RespondContext<_ExtendContext>} ctxInit Context pre-initialization.
   *     Only headers and timestamps are allowed.
   *     But timestamps properties will not be overridden but rather extended.
   * @returns {Response} An http response object
   */
  async respond(
    request: Request,
    ctxInit?: RespondContext<_ExtendContext>,
  ): Promise<Response> {
    const startTimestamp = performance.now();
    const requestTimestamp = Date.now();
    const method = request.method as HttpMethod;
    const url = new URL(request.url);
    let pathname!: string;
    let response: Response | undefined = undefined;
    try {
      pathname = decodeURIComponent(url.pathname);
    } catch {
      return new Response(null, {
        status: Status._400_BadRequest,
        statusText: getHttpStatusText(Status._400_BadRequest),
        headers: ctxInit?.headers,
      });
    }
    const parts: string[] = [];
    const ctx: Context<ExtendContext> = {
      ...ctxInit,
      router: this,
      url,
      request,
      headers: ctxInit?.headers ?? new Headers(),
      params: EMPTY_PARAMS,
      method,
      pathname,
      timestamps: {
        ...(ctxInit as any)?.timestamps,
        epoch: requestTimestamp,
        start: startTimestamp,
        end: startTimestamp,
      },
    } as Context<ExtendContext>;
    {
      const count = this.splitPath(pathname, parts, this.#config.maxPath);
      if (count < 0) {
        return count === -1
          ? new Response(null, {
              status: Status._400_BadRequest,
              statusText: getHttpStatusText(Status._400_BadRequest),
              headers: ctx.headers,
            })
          : new Response(null, {
              status: Status._414_URITooLong,
              statusText: getHttpStatusText(Status._414_URITooLong),
              headers: ctx.headers,
            });
      }
    }
    const enable = this.#config.enable;
    const found = {
      filter: 0,
      handler: 0,
      fallback: 0,
      after: 0,
      catcher: 0,
    } as Record<HandlerType, number>;
    const paramsRef: Record<string, unknown> = {};
    try {
      // filters
      if (enable?.filter) {
        const filterRoutes = this.#getRouteEntries(
          pathname,
          parts,
          this.#routes.filter[method as HttpMethodUpper],
          false,
        );
        found.filter = filterRoutes.length;
        away: for (const routeEntry of filterRoutes) {
          // parse params
          const params = routeEntry.parseParams(pathname, parts, paramsRef);
          ctx.params = params;
          // call request handlers
          for (const handler of routeEntry.pipe) {
            const resp = await handler.apply(this, [ctx]);
            if (resp instanceof Response) {
              response = resp;
              break away;
            } else if (resp === Break_Pipe) {
              break;
            } else if (resp === Break_Pipeline) {
              break away;
            }
          }
          // update params
          if (routeEntry.hasAnyGlob && params !== ctx.params) {
            const idxHash = routeEntry.hasSuperGlob ? "##" : "#";
            for (const [idx, paramId] of routeEntry.params!) {
              const key = paramId + idxHash + idx;
              paramsRef[key] = ctx.params[paramId];
            }
          }
        }
      }
      // default filter
      if (this.#config.defaultFilter && !(response instanceof Response)) {
        const resp = await this.#config.defaultFilter(ctx);
        if (resp instanceof Response) {
          response = resp;
        }
      }
      const handlerRoutes = this.#getRouteEntries(
        pathname,
        parts,
        this.#routes.handler[method as HttpMethodUpper],
        true,
      );
      // handlers
      if (handlerRoutes.length > 0 && !(response instanceof Response)) {
        found.handler = handlerRoutes.length;
        away: for (const routeEntry of handlerRoutes) {
          // parse params
          const params = routeEntry.parseParams(pathname, parts, paramsRef);
          ctx.params = params;
          // call request handlers
          for (const handler of routeEntry.pipe) {
            const resp = await handler(ctx);
            if (resp instanceof Response) {
              response = resp;
              break away;
            } else if (resp === Break_Pipe) {
              break;
            } else if (resp === Break_Pipeline) {
              break away;
            }
          }
          // update params
          if (routeEntry.hasAnyGlob && params !== ctx.params) {
            const idxHash = routeEntry.hasSuperGlob ? "##" : "#";
            for (const [idx, paramId] of routeEntry.params!) {
              const key = paramId + idxHash + idx;
              paramsRef[key] = ctx.params[paramId];
            }
          }
        }
      }
      // default handler
      if (this.#config.defaultHandler && !(response instanceof Response)) {
        const resp = await this.#config.defaultHandler(ctx);
        if (resp instanceof Response) {
          response = resp;
        }
      }
      // fallbacks
      if (enable.fallback && !(response instanceof Response)) {
        const fallbackRoutes = this.#getRouteEntries(
          pathname,
          parts,
          this.#routes.fallback[method as HttpMethodUpper],
          false,
        );
        found.fallback = fallbackRoutes.length;
        away: for (const routeEntry of fallbackRoutes) {
          // parse params
          const params = routeEntry.parseParams(pathname, parts, paramsRef);
          ctx.params = params;
          for (const handler of routeEntry.pipe) {
            const resp = await handler(ctx);
            if (resp instanceof Response) {
              response = resp;
              break away;
            } else if (resp === Break_Pipe) {
              break;
            } else if (resp === Break_Pipeline) {
              break away;
            }
          }
          // update params
          if (routeEntry.hasAnyGlob && params !== ctx.params) {
            const idxHash = routeEntry.hasSuperGlob ? "##" : "#";
            for (const [idx, paramId] of routeEntry.params!) {
              const key = paramId + idxHash + idx;
              paramsRef[key] = ctx.params[paramId];
            }
          }
        }
      }
      // default fallback
      if (this.#config.defaultFallback && !(response instanceof Response)) {
        const resp = await this.#config.defaultFallback(ctx);
        if (resp instanceof Response) {
          response = resp;
        }
      }
      // append headers
      if (response instanceof Response) {
        for (const [k, v] of ctx.headers) {
          response.headers.append(k, v);
        }
      }
      response =
        response instanceof Response
          ? response
          : found.handler + found.fallback > 0
            ? new Response(null, {
                status: Status._501_NotImplemented,
                statusText: getHttpStatusText(Status._501_NotImplemented),
                headers: ctx.headers,
              })
            : new Response(null, {
                status: Status._404_NotFound,
                statusText: getHttpStatusText(Status._404_NotFound),
                headers: ctx.headers,
              });
    } catch (_error) {
      const error =
        _error instanceof Error ? _error : (Error(String(_error)) as Error);
      (ctx as Context<CTError & ExtendContext>).error = error;
      // catchers
      if (enable.catcher) {
        const catcherRoutes = this.#getRouteEntries(
          pathname,
          parts,
          this.#routes.catcher[method as HttpMethodUpper],
          false,
        );
        found.catcher = catcherRoutes.length;
        away: for (const routeEntry of catcherRoutes) {
          // parse params
          const params = routeEntry.parseParams(pathname, parts, paramsRef);
          ctx.params = params;
          // call request handlers
          for (const handler of routeEntry.pipe) {
            const resp = await handler(ctx);
            if (resp instanceof Response) {
              response = resp;
              break away;
            } else if (resp === Break_Pipe) {
              break;
            } else if (resp === Break_Pipeline) {
              break away;
            }
          }
          // update params
          if (routeEntry.hasAnyGlob && params !== ctx.params) {
            const idxHash = routeEntry.hasSuperGlob ? "##" : "#";
            for (const [idx, paramId] of routeEntry.params!) {
              const key = paramId + idxHash + idx;
              paramsRef[key] = ctx.params[paramId];
            }
          }
        }
      }
      // default catcher
      if (this.#config.defaultCatcher && !(response instanceof Response)) {
        (ctx as Context<CTError & ExtendContext>).error = error;
        const resp = await this.#config.defaultCatcher(
          ctx as Context<CTError & ExtendContext>,
        );
        if (resp instanceof Response) {
          response = resp;
        }
      }
      if (!(response instanceof Response)) {
        const status =
          (ctx as Context<CTError & ExtendContext>).error &&
          (ctx as Context<CTError & ExtendContext>).error instanceof HttpError
            ? ((ctx as Context<CTError & ExtendContext>).error as HttpError)
                .status
            : Status._500_InternalServerError;
        response = new Response(null, {
          status,
          statusText: getHttpStatusText(status),
        });
      }
      // append headers
      if (response instanceof Response) {
        for (const [k, v] of ctx.headers) {
          response.headers.append(k, v);
        }
      }
    }
    (ctx as Context<CTResponse & ExtendContext>).response = response;
    ctx.timestamps.end = performance.now();
    try {
      // afters
      if (enable.after) {
        const afterRoutes = this.#getRouteEntries(
          pathname,
          parts,
          this.#routes.after[method as HttpMethodUpper],
          false,
        );
        found.after = afterRoutes.length;
        away: for (const routeEntry of afterRoutes) {
          // parse params
          const params = routeEntry.parseParams(pathname, parts, paramsRef);
          ctx.params = params;
          // call request handlers
          for (const handler of routeEntry.pipe) {
            const resp = await handler(ctx);
            if (resp === Break_Pipe) {
              break;
            } else if (resp === Break_Pipeline) {
              break away;
            }
          }
          // update params
          if (routeEntry.hasAnyGlob && params !== ctx.params) {
            const idxHash = routeEntry.hasSuperGlob ? "##" : "#";
            for (const [idx, paramId] of routeEntry.params!) {
              const key = paramId + idxHash + idx;
              paramsRef[key] = ctx.params[paramId];
            }
          }
        }
      }
      // default after
      if (this.#config.defaultAfter) {
        await this.#config.defaultAfter(
          ctx as Context<CTResponse & ExtendContext>,
        );
      }
    } catch (_error) {
      const error =
        _error instanceof Error ? _error : (Error(String(_error)) as Error);
      // after catcher
      if (this.#config.afterCatcher) {
        (ctx as Context<CTError & ExtendContext>).error = error;
        await this.#config.afterCatcher(
          ctx as Context<CTError & CTResponse & ExtendContext>,
        );
      }
    }
    return response;
  }

  /**
   *
   * @param {string} prefix Path prefix to prepend to paths.
   * @param {Router<_ExtendContext,ExtendContext>} router The router to append routes definitions from.
   * @param {{overwrite:boolean}} options Options to apply to each route definition.
   * @param {boolean} [options.overwrite] Overwrite each route definition. This overrides the route specific options.
   */
  appendTo(
    prefix: `/${string}`,
    router: Router<_ExtendContext, ExtendContext>,
    options?: {
      overwrite: boolean;
    },
  ) {
    const overwrite = options?.overwrite;
    for (const {
      handlerType,
      methodPaths,
      pipe,
      options: setterOptions,
    } of router.#setters) {
      if (Array.isArray(methodPaths)) {
        const appendedMethodPaths = methodPaths.map((methodPath) => {
          const [method, path] = methodPath.split(" ", 2);
          return `${method} ${prefix}${path}` as MethodPath;
        });
        this.register(handlerType, appendedMethodPaths, pipe, {
          ...setterOptions,
          overwrite: setterOptions?.overwrite || overwrite,
        });
      } else {
        const [method, path] = methodPaths.split(" ", 2);
        const appendedMethodPaths = `${method} ${prefix}${path}` as MethodPath;
        this.register(handlerType, appendedMethodPaths, pipe, {
          ...setterOptions,
          overwrite: setterOptions?.overwrite || overwrite,
        });
      }
    }
  }

  /**
   * Dynamically load route definition files
   *
   * @param options
   * @param {string} [options.routesPath] The root path of the route definitions
   * @param {RegExp} [options.pattern] Regex pattern to use for matching and filtering route definition files.
   * @param {RegExp} [options.dirPattern] Regex pattern to use for matching and filtering route definition folders.
   * @param {(name:string)=>string} [options.processName] Route file name processor to decide the route path from filename.
   *     This is used for removing filename extensions and other appendages.
   *     The default removes only file extension.
   *     You can override this to remove custom appendages like '.route.ts'
   */
  async load(options: {
    routesPath: string;
    pattern?: RegExp;
    dirPattern?: RegExp;
    processName?: (name: string) => string;
  }) {
    const {
      routesPath,
      pattern = /\.(js|ts|mjs|cjs)$/,
      dirPattern = /.*/,
      processName = (name: string) => name.substring(0, name.lastIndexOf(".")),
    } = options;
    for await (const node of walk(routesPath)) {
      if (node.type === "file") {
        if (!pattern.test(node.name)) {
          continue;
        }
        if (!dirPattern.test(node.parent)) {
          continue;
        }
        let handlersImp;
        try {
          handlersImp = (await dynamicImport(
            node.fullPath,
            `v=${node.mtimeMs}`,
          )) as unknown as Record<string, unknown>;
          const importPath = node.path;
          const processedName = decodeURIComponent(processName(node.name));
          const pathname = !node.parent
            ? `/${processedName}`
            : `/${node.parent}/${processedName}`;
          const path = translateRouteFilePath(pathname, this.#config.maxPath);
          for (const methodHandler of Object.keys(handlersImp)) {
            const [method_, handlerType_] = methodHandler.split("_", 2);
            const def = handlersImp[methodHandler];
            let method: HttpMethod | "All" | "Crud";
            let handlerType: HandlerType = "handler";
            const methodUpper = method_.toUpperCase() as
              | HttpMethodUpper
              | "ALL"
              | "CRUD";
            if (methodUpper === "ALL") {
              method = "All";
            } else if (methodUpper === "CRUD") {
              method = "Crud";
            } else if (HTTP_METHODS_UPPER.has(methodUpper)) {
              method = (method_.charAt(0).toUpperCase() +
                method_.substring(1).toLowerCase()) as HttpMethod;
            } else {
              continue;
            }
            if (
              handlerType_ &&
              HANDLER_TYPES.has(handlerType_.toLowerCase() as HandlerType)
            ) {
              handlerType = handlerType_.toLowerCase() as HandlerType;
            } else {
              continue;
            }
            const defIsObject = !Array.isArray(def) && typeof def === "object";
            // get pipe and any other options
            const pipe = defIsObject ? (def as any).pipe : def;
            const options: RegisterPipelineOptions | undefined = defIsObject
              ? {}
              : undefined;
            if (options != null) {
              options.openApi = (def as any).openApi;
              options.overwrite = (def as any).overwrite;
            }
            if (options?.openApi != null && handlerType !== "handler") {
              console.warn(
                `OpenApi definition will be ignored for \`${methodHandler}\` in '${importPath}'`,
              );
            }
            if (pipe == null) {
              throw new RouterError(
                `Undefined pipe for \`${methodHandler}\` in '${importPath}'`,
              );
            }
            if (
              !(
                (Array.isArray(pipe) &&
                  pipe.every((h) => typeof h === "function")) ||
                typeof pipe === "function"
              )
            ) {
              throw new RouterError(
                `Invalid pipe or handler type for \`${methodHandler}\` in '${importPath}'`,
              );
            }
            if (
              options?.openApi != null &&
              typeof options?.openApi !== "object"
            ) {
              throw new RouterError(
                `Invalid openApi type for \`${methodHandler}\` in '${importPath}'`,
              );
            }
            switch (handlerType) {
              case "filter":
                this[`filter${method}`](
                  pathname as Path,
                  pipe as Pipe,
                  options,
                );
                break;
              case "handler":
                this[`handle${method}`](
                  pathname as Path,
                  pipe as Pipe,
                  options,
                );
                break;
              case "fallback":
                this[`fallback${method}`](
                  pathname as Path,
                  pipe as Pipe,
                  options,
                );
                break;
              case "after":
                this[`after${method}`](
                  pathname as Path,
                  pipe as EndPipe,
                  options,
                );
                break;
              case "catcher":
                this[`catch${method}`](
                  pathname as Path,
                  pipe as ErrorPipe,
                  options,
                );
                break;
            }
            this.register(
              handlerType,
              `${method as HttpMethod} ${path as `/${string}`}`,
              pipe as Pipe<ExtendContext> | Handler<ExtendContext>,
              options as RegisterPipelineOptions,
            );
          }
        } catch (error) {
          console.error(`Failed to import route at '${node.fullPath}':`, error);
        }
      }
    }
  }

  /**
   * Generates an OpenAPI 3.0.0 specification document from the registered routes.
   *
   * This method scans all registered routes and builds a comprehensive OpenAPI specification
   * that can be used with Swagger UI, Redoc, or any OpenAPI-compatible tooling.
   *
   * @param info - Configuration for the OpenAPI document
   * @param info.title - API title (defaults to "API")
   * @param info.version - API version (defaults to "1.0.0")
   * @param info.description - API description
   * @param info.servers - Array of server URLs and descriptions
   * @param info.security - Global security requirements
   * @param info.components - Reusable components (schemas, securitySchemes, parameters, responses, examples)
   * @param info.termsOfService - URL to terms of service
   * @param info.contact - Contact information for the API
   * @param info.license - License information
   * @param info.tags - Global tags for grouping operations
   * @param info.externalDocs - External documentation reference
   *
   * @param options - Generation options
   * @param {Map<HttpMethodUpper,number>} options.sortMethodPriorityMap - Map method to priority for the default sorter.
   * @param {1|-1|undefined} options.sortPathnameOrder - Enable and define the pathname sort order for the default sorter.
   * @param {1|-1|undefined} options.sortMethodOrder - Enable and define the method sort order for the default sorter.
   * @param {1|-1|undefined} options.sortTagsOrder - Enable and define the tags sort order for the default sorter.
   * @param options.pick - Filter function to selectively include routes
   *   - Receives one `GenerateOpenAPISortParam` parameter: `{ method, path, parts, tags }`
   *   - Return true to include, false to exclude
   * @param options.routeSorter - Custom route sorter.
   *   - Receives two `GenerateOpenAPISortParam` parameters: `{ method, path, parts, tags }`
   *   - Return -1, 0, 1 
   * @param options.includeOperationId - Whether to generate operationId for each operation (default: true)
   * @param options.autoTag - Automatically tag operations based on path (default: true)
   *   - When `true`, uses the first path segment as the tag
   *   - When a function, allows custom tag generation
   * @param options.commonParameters - Parameters to apply to all operations
   * @param options.autoSummary - Generate summary from path when not provided (default: true)
   * @param options.cleanOperationId - Remove special characters from operation IDs (default: true)

   * @returns {Promise<GeneratedOpenApi>} A promise that resolves to the complete OpenAPI 3.0.0 specification
   *
   * @example
   * ```typescript
   * // Basic usage
   * const openapi = await router.generateOpenAPI({
   *   title: "My API",
   *   version: "2.0.0",
   *   description: "My awesome API",
   * });
   *
   * // With custom options
   * const openapi = await router.generateOpenAPI(
   *   { title: "My API", version: "1.0.0" },
   *   {
   *     pick: ({ tags, path, parts, method }) => {
   *       return path.startsWith('/api');
   *     },
   *     autoTag: ({ path }) => {
   *       const parts = path.split('/').filter(p => p && p !== "*");
   *       return parts.length > 0 ? [parts[0]] : ['default'];
   *     },
   *     commonParameters: [
   *       {
   *         name: 'X-Request-ID',
   *         in: 'header',
   *         schema: { type: 'string' },
   *         description: 'Request ID for tracing'
   *       }
   *     ]
   *   }
   * );
   *
   * // Write to file
   * await Deno.writeTextFile('./openapi.json', JSON.stringify(openapi, null, 2));
   * ```
   *
   * @remarks
   * - Routes with `openApi: false` in their definition are excluded from generation
   * - Super glob routes (`/**`) are automatically excluded
   * - Unnamed glob routes (`/*`) are named by their index like so 'glob1'
   * - Connect HTTP method is not supported
   * - Tags are only included if they are actually used by at least one operation
   * - Response schemas are only included when explicitly provided
   * - Path parameters are automatically extracted from route definitions and forced to `required: true`
   * - Operation IDs are guaranteed to be unique with collision detection
   *
   * @see {@link GenerateOpenApiInfo} for complete info options
   * @see {@link GenerateOpenAPIOptions} for complete generation options
   * @see {@link GeneratedOpenApi} for the return type structure
   */
  generateOpenAPI(
    info?: GenerateOpenApiInfo,
    options?: GenerateOpenAPIOptions<ExtendContext>,
  ): Promise<GeneratedOpenApi> {
    const {
      title = "API",
      version = "1.0.0",
      description,
      servers = [{ url: "/", description: "Current server" }],
      security,
      components: globalComponents,
      termsOfService,
      contact,
      license,
      tags: globalTags,
      externalDocs,
    } = info ?? Object.create(null);

    const sortMethodPriorityMap =
      options?.sortMethodPriorityMap ?? SORT_METHOD_PRIORITY_INDEX;
    const sortPathnameOrder =
      options?.sortPathnameOrder && options.sortPathnameOrder < 0 ? -1 : 1;
    const sortMethodOrder =
      options?.sortMethodOrder && options.sortMethodOrder < 0 ? -1 : 1;
    const sortTagsOrder =
      options?.sortTagsOrder && options.sortTagsOrder < 0 ? -1 : 1;
    const {
      pick,
      includeOperationId = true,
      autoTag = true,
      commonParameters = [],
      autoSummary = true,
      cleanOperationId = true,
      routeSorter = (
        a: GenerateOpenAPISortParam,
        b: GenerateOpenAPISortParam,
      ) => {
        // sort by tags
        if (options?.sortTagsOrder != null) {
          const minTagsLen = Math.min(a.tags.length, b.tags.length);
          for (let i = 0; i < minTagsLen; i++) {
            const comp = sortTagsOrder * a.tags[i].localeCompare(b.tags[i]);
            if (comp !== 0) {
              return comp;
            }
          }
          if (minTagsLen === 0 && a.tags.length !== b.tags.length) {
            const comp =
              sortTagsOrder * (a.tags.length < b.tags.length ? -1 : 1);
            if (comp !== 0) {
              return comp;
            }
          }
        }
        // sort by pathname parts
        if (options?.sortPathnameOrder != null) {
          const minLen = Math.min(a.parts.length, b.parts.length);
          for (let i = 0; i < minLen; i++) {
            let comp =
              sortPathnameOrder * a.parts[i]!.localeCompare(b.parts[i]!);
            if (comp !== 0) {
              return comp;
            }
          }
          if (a.parts.length != b.parts.length) {
            const comp =
              sortPathnameOrder * (a.parts.length < b.parts.length ? -1 : 1);
            if (comp !== 0) {
              return comp;
            }
          }
        }
        // sort by methods
        if (options?.sortMethodOrder != null) {
          if (a.method !== b.method) {
            const ma = sortMethodPriorityMap.get(a.method)!;
            const mb = sortMethodPriorityMap.get(b.method)!;
            return ma === mb
              ? sortMethodOrder * a.method.localeCompare(b.method)
              : sortMethodOrder * (ma - mb);
          }
        }
        return 0;
      },
    } = options ?? Object.create(null);

    return new Promise((resolve) => {
      const handlers = this.#routes.handler;
      const paths: Record<string, Record<string, OpenApiOperation>> = {};
      const schemas: Record<string, OpenApiSchema> = {};
      const securitySchemes: Record<string, OpenApiSecurityScheme> = {};
      const parameters: Record<string, OpenApiParameter> = {};
      const responses: Record<string, OpenApiResponse> = {};
      const examples: Record<string, { value: any; summary?: string }> = {};
      const usedTags = new Set<string>();
      const usedOperationIds = new Set<string>();
      const warnings: string[] = [];

      // Group routes by path
      const routeGroupsSorter: [
        GenerateOpenAPISortParam,
        { entry: HandlerRouteEntry<ExtendContext>; tags?: string[] },
      ][] = [];
      const routeGroups = Object.create(null) as Record<
        string,
        Record<
          HttpMethodUpper,
          { entry: HandlerRouteEntry<ExtendContext>; tags?: string[] }
        >
      >;

      // Collect all routes
      for (const method of Object.keys(handlers)) {
        const methodUpper = method.toUpperCase() as HttpMethodUpper;

        // Check if method is supported by OpenAPI
        if (methodUpper === "CONNECT") {
          continue;
        }

        const methodHandlers = handlers[methodUpper];
        if (!methodHandlers) continue;

        for (const entries of [
          methodHandlers.entries,
          methodHandlers.globs,
          methodHandlers.superGlobs,
        ]) {
          for (const bucket of entries) {
            if (bucket == null) continue;

            for (const [, entry] of bucket) {
              if (entry == null) continue;

              // Check openApi first
              if (entry.openApi === false) continue;

              // Skip super glob routes
              if (entry.path.endsWith("/**")) continue;

              let tags: string[] | undefined = entry.openApi?.tags;

              // Auto-tag based on path if no explicit tags and autoTag is enabled
              if (autoTag && !tags) {
                const pathParts = entry.pathParts.filter((p) => p && p !== "*");
                if (pathParts.length > 0) {
                  if (typeof autoTag === "function") {
                    tags = autoTag(entry);
                  } else {
                    const tag = pathParts[0] || "default";
                    tags = [tag];
                  }
                }
              }

              const sortEntry = Object.freeze({
                method: methodUpper,
                path: entry.path,
                parts: Object.freeze([...entry.pathParts]),
                tags:
                  entry.openApi && Array.isArray(tags) && tags.length > 0
                    ? Object.freeze([...tags].sort())
                    : Object.freeze([]),
              });

              // Apply pick filter
              if (typeof pick === "function" && !pick(sortEntry)) {
                continue;
              }

              routeGroupsSorter.push([sortEntry, { entry, tags }]);
            }
          }
        }
      }

      // Sort route groups
      routeGroupsSorter.sort(([a], [b]) => routeSorter(a, b));
      for (const [
        { method, path, parts },
        { entry, tags },
      ] of routeGroupsSorter) {
        let pathMethods = routeGroups[entry.openApiPath];
        if (!pathMethods) {
          pathMethods = Object.create(null);
          routeGroups[entry.openApiPath] = pathMethods;
        }
        if (pathMethods[method] != null) {
          console.warn(
            `Duplicate method found in ${entry.openApiPath}.${method}`,
          );
        }
        pathMethods[method] = { entry, tags };
        // Track all tags used by this operation
        if (tags) {
          for (const tag of tags) {
            usedTags.add(tag);
          }
        }
      }

      // Build paths
      for (const pathname of Object.keys(routeGroups)) {
        const methods = routeGroups[pathname];
        const pathItem: Record<string, OpenApiOperation> = {};
        paths[pathname] = pathItem;

        for (const method of Object.keys(methods)) {
          const { entry, tags } = methods[method as HttpMethodUpper];
          const openApi = entry.openApi || {};
          const methodLower = method.toLowerCase() as Exclude<
            HttpMethodLower,
            "connect"
          >;

          // Auto-summary from path - use the last meaningful part
          let summary = openApi.summary;
          if (autoSummary && !summary) {
            const pathParts = pathname
              .split("/")
              .filter((p, idx) => p && entry.pathParts[idx] !== "*");
            // Find the last non-parameter part or use the last part
            let resource =
              pathParts[pathParts.length - 1] || pathParts[0] || "root";
            // Remove OpenAPI parameter syntax for summary
            resource = resource.replace(/[{}]/g, "");
            const action = method.toLowerCase();
            summary = `${action} ${resource}`;
          }

          // Build parameters - router-derived path parameters MUST be required: true
          const entryParams: [number, string][] = [];
          let globIdx = 0;
          for (let i = 1; i < entry.pathParts.length; i++) {
            const part = entry.pathParts[i];
            if (part === "*") {
              const foundParam = entry.params?.find(
                ([idx, paramId]) => idx === i,
              );
              entryParams.push([
                i,
                foundParam ? foundParam[1] : `glob${++globIdx}`,
              ]);
            }
          }
          const pathParams: OpenApiParameter[] = [];
          if (entryParams.length > 0) {
            for (const [idx, paramId] of entryParams) {
              // Start with the router-derived parameter
              const baseParam: OpenApiParameter = {
                name: paramId,
                in: "path" as const,
                required: true,
                schema: { type: "string" as const },
              };

              // Check if user defined this parameter
              const userParam = (openApi.parameters ?? []).find(
                (p) => p.name === paramId && p.in === "path",
              );

              if (userParam) {
                // Merge user metadata while preserving required: true
                pathParams.push({
                  ...baseParam,
                  ...userParam,
                  required: true, // Force required: true for path params
                  in: "path" as const, // Force in: "path"
                });
              } else {
                pathParams.push(baseParam);
              }
            }
          }

          // Get user-defined parameters (non-path params)
          const userParams = (openApi.parameters ?? []).filter(
            (p) => p.in !== "path",
          );

          // Combine: common parameters + user params + path params
          // Path params come last so they take precedence for required: true
          const paramsRef = [...commonParameters, ...userParams, ...pathParams];

          // Remove duplicates (by name + in combination)
          const paramSet = new Set<string>();
          const finalParams: OpenApiParameter[] = [];
          for (const param of paramsRef) {
            const key = `${param.name}:${param.in}`;
            if (!paramSet.has(key)) {
              paramSet.add(key);
              finalParams.push(param);
            }
          }

          // Build request body
          const requestBody = openApi.requestBody;

          // Build responses - only use provided responses, no inference
          const responseObj: Record<string, OpenApiResponse> = {};
          if (openApi.responses) {
            Object.assign(responseObj, openApi.responses);
          } else {
            // Minimal default response - just a description
            responseObj["200"] = {
              description: "Successful response",
            };
          }

          // Build security
          let operationSecurity = openApi.security;
          if (!operationSecurity && security) {
            operationSecurity = security;
          }

          // Generate operation ID with uniqueness guarantee
          let operationId = openApi.operationId;
          if (operationId) {
            if (usedOperationIds.has(operationId)) {
              console.warn(
                `Duplicate OpenApi operationId '${operationId}' in  ${entry.openApiPath}.${method}`,
              );
            }
            usedOperationIds.add(operationId);
          } else if (includeOperationId) {
            operationId = this.#generateUniqueOperationId(
              method as HttpMethodUpper,
              pathname,
              cleanOperationId,
              usedOperationIds,
            );
          }

          // Build operation object
          const operation: OpenApiOperation = {
            summary: summary,
            description: openApi.description,
            tags: tags,
            parameters: finalParams.length > 0 ? finalParams : undefined,
            requestBody,
            responses: responseObj,
            security: operationSecurity,
            operationId,
          };

          // Remove undefined properties
          const cleanedOperation = Object.fromEntries(
            Object.entries(operation).filter(
              ([_, value]) => value !== undefined,
            ),
          ) as OpenApiOperation;

          pathItem[methodLower] = cleanedOperation;
        }
      }

      // Build components
      const components: any = {};

      // Merge global and collected schemas
      if (globalComponents?.schemas) {
        Object.assign(schemas, globalComponents.schemas);
      }
      if (Object.keys(schemas).length > 0) {
        components.schemas = schemas;
      }

      // Merge global and collected security schemes
      if (globalComponents?.securitySchemes) {
        Object.assign(securitySchemes, globalComponents.securitySchemes);
      }
      if (Object.keys(securitySchemes).length > 0) {
        components.securitySchemes = securitySchemes;
      }

      // Add global parameters
      if (globalComponents?.parameters) {
        Object.assign(parameters, globalComponents.parameters);
      }
      if (Object.keys(parameters).length > 0) {
        components.parameters = parameters;
      }

      // Add global responses
      if (globalComponents?.responses) {
        Object.assign(responses, globalComponents.responses);
      }
      if (Object.keys(responses).length > 0) {
        components.responses = responses;
      }

      // Add global examples
      if (globalComponents?.examples) {
        Object.assign(examples, globalComponents.examples);
      }
      if (Object.keys(examples).length > 0) {
        components.examples = examples;
      }

      // Build final result
      const result: any = {
        openapi: "3.0.0" as const,
        info: {
          title,
          version,
          ...(description && { description }),
          ...(termsOfService && { termsOfService }),
          ...(contact && { contact }),
          ...(license && { license }),
        },
        servers,
        paths,
      };

      // Add tags - ONLY include tags that are actually used by operations
      const allTags: Array<{
        name: string;
        description?: string;
        externalDocs?: any;
      }> = [];

      // Start with global tags that are actually used
      if (globalTags) {
        for (const tag of globalTags) {
          if (usedTags.has(tag.name)) {
            allTags.push(tag);
          }
        }
      }

      // Add auto-generated tags that aren't already in global tags
      for (const tag of usedTags) {
        if (!allTags.some((t) => t.name === tag)) {
          allTags.push({ name: tag });
        }
      }

      if (allTags.length > 0) {
        result.tags = allTags;
      }

      // Add external docs
      if (externalDocs) {
        result.externalDocs = externalDocs;
      }

      // Add components
      if (Object.keys(components).length > 0) {
        result.components = components;
      }

      // Add security
      if (security && security.length > 0) {
        result.security = security;
      }

      // Log warnings if any
      if (warnings.length > 0 && typeof console !== "undefined") {
        console.warn("OpenAPI Generation Warnings:", warnings.join("\n  "));
      }

      resolve(result);
    });
  }

  /**
   * Generates a unique operation ID with collision detection.
   */
  #generateUniqueOperationId(
    method: HttpMethodUpper,
    path: string,
    clean: boolean,
    usedIds: Set<string>,
  ): string {
    let baseId = generateOperationId(method, path, clean);
    let operationId = baseId;
    let counter = 1;

    // Ensure uniqueness
    while (usedIds.has(operationId)) {
      operationId = `${baseId}${counter}`;
      counter++;
    }

    usedIds.add(operationId);
    return operationId;
  }

  /**
   * Define handlers for all http methods ["Head","Get","Query","Post","Put","Patch","Delete","Options","Trace","Connect"] and the specified paths.
   *
   * @param {Path} paths One or more valid route paths
   * @param pipe One or more main handlers
   * @param {RegisterPipelineOptions} options Register pipeline options
   * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
   * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
   * @returns This router instance.
   */
  all<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: P | Array<P>,
    pipe:
      | Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: RegisterPipelineOptions,
  ): Router<_ExtendContext, ExtendContext> {
    paths = Array.isArray(paths) ? paths : [paths];
    const methodPaths: Array<MethodPath> = [];
    for (const p of paths) {
      for (const method of HTTP_METHODS.keys()) {
        methodPaths.push(`${method} ${p}`);
      }
    }
    return this.register(
      "handler",
      methodPaths,
      pipe as Handler<ExtendContext> | Pipe<ExtendContext>,
      options,
    );
  }

  /**
   * Define handlers for CRUD http methods ["Get","Query","Post","Put","Patch","Delete"] and the specified paths.
   *
   * @param {Path} paths One or more valid route paths
   * @param pipe One or more main handlers
   * @param {RegisterPipelineOptions} options Register pipeline options
   * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
   * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
   * @returns This router instance.
   */
  crud<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: P | Array<P>,
    pipe:
      | Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: RegisterPipelineOptions,
  ): Router<_ExtendContext, ExtendContext> {
    paths = Array.isArray(paths) ? paths : [paths];
    const methodPaths: Array<MethodPath> = [];
    for (const p of paths) {
      for (const method of CRUD_METHODS.keys()) {
        methodPaths.push(`${method} ${p}`);
      }
    }
    return this.register(
      "handler",
      methodPaths,
      pipe as Handler<ExtendContext> | Pipe<ExtendContext>,
      options,
    );
  }

  /**
   * Define handlers for Head http method and the specified paths.
   *
   * @param {Path} paths One or more valid route paths
   * @param pipe One or more main handlers
   * @param {RegisterPipelineOptions} options Register pipeline options
   * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
   * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
   * @returns This router instance.
   */
  head<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: P | Array<P>,
    pipe:
      | Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: RegisterPipelineOptions,
  ): Router<_ExtendContext, ExtendContext> {
    paths = Array.isArray(paths) ? paths : [paths];
    const methodPaths = paths.map(
      (p: string) => `Head ${p}`,
    ) as Array<MethodPath>;
    return this.register(
      "handler",
      methodPaths,
      pipe as Handler<ExtendContext> | Pipe<ExtendContext>,
      options,
    );
  }

  /**
   * Define handlers for Get http method and the specified paths.
   *
   * @param {Path} paths One or more valid route paths
   * @param pipe One or more main handlers
   * @param {RegisterPipelineOptions} options Register pipeline options
   * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
   * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
   * @returns This router instance.
   */
  get<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: P | Array<P>,
    pipe:
      | Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: RegisterPipelineOptions,
  ): Router<_ExtendContext, ExtendContext> {
    paths = Array.isArray(paths) ? paths : [paths];
    const methodPaths = paths.map(
      (p: string) => `Get ${p}`,
    ) as Array<MethodPath>;
    return this.register(
      "handler",
      methodPaths,
      pipe as Handler<ExtendContext> | Pipe<ExtendContext>,
      options,
    );
  }

  /**
   * Define handlers for Query http method and the specified paths.
   *
   * @param {Path} paths One or more valid route paths
   * @param pipe One or more main handlers
   * @param {RegisterPipelineOptions} options Register pipeline options
   * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
   * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
   * @returns This router instance.
   */
  query<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: P | Array<P>,
    pipe:
      | Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: RegisterPipelineOptions,
  ): Router<_ExtendContext, ExtendContext> {
    paths = Array.isArray(paths) ? paths : [paths];
    const methodPaths = paths.map(
      (p: string) => `Query ${p}`,
    ) as Array<MethodPath>;
    return this.register(
      "handler",
      methodPaths,
      pipe as Handler<ExtendContext> | Pipe<ExtendContext>,
      options,
    );
  }

  /**
   * Define handlers for Post http method and the specified paths.
   *
   * @param {Path} paths One or more valid route paths
   * @param pipe One or more main handlers
   * @param {RegisterPipelineOptions} options Register pipeline options
   * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
   * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
   * @returns This router instance.
   */
  post<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: P | Array<P>,
    pipe:
      | Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: RegisterPipelineOptions,
  ): Router<_ExtendContext, ExtendContext> {
    paths = Array.isArray(paths) ? paths : [paths];
    const methodPaths = paths.map(
      (p: string) => `Post ${p}`,
    ) as Array<MethodPath>;
    return this.register(
      "handler",
      methodPaths,
      pipe as Handler<ExtendContext> | Pipe<ExtendContext>,
      options,
    );
  }

  /**
   * Define handlers for Put http method and the specified paths.
   *
   * @param {Path} paths One or more valid route paths
   * @param pipe One or more main handlers
   * @param {RegisterPipelineOptions} options Register pipeline options
   * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
   * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
   * @returns This router instance.
   */
  put<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: P | Array<P>,
    pipe:
      | Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: RegisterPipelineOptions,
  ): Router<_ExtendContext, ExtendContext> {
    paths = Array.isArray(paths) ? paths : [paths];
    const methodPaths = paths.map(
      (p: string) => `Put ${p}`,
    ) as Array<MethodPath>;
    return this.register(
      "handler",
      methodPaths,
      pipe as Handler<ExtendContext> | Pipe<ExtendContext>,
      options,
    );
  }

  /**
   * Define handlers for Patch http method and the specified paths.
   *
   * @param {Path} paths One or more valid route paths
   * @param pipe One or more main handlers
   * @param {RegisterPipelineOptions} options Register pipeline options
   * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
   * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
   * @returns This router instance.
   */
  patch<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: P | Array<P>,
    pipe:
      | Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: RegisterPipelineOptions,
  ): Router<_ExtendContext, ExtendContext> {
    paths = Array.isArray(paths) ? paths : [paths];
    const methodPaths = paths.map(
      (p: string) => `Patch ${p}`,
    ) as Array<MethodPath>;
    return this.register(
      "handler",
      methodPaths,
      pipe as Handler<ExtendContext> | Pipe<ExtendContext>,
      options,
    );
  }

  /**
   * Define handlers for Head Delete method and the specified paths.
   *
   * @param {Path} paths One or more valid route paths
   * @param pipe One or more main handlers
   * @param {RegisterPipelineOptions} options Register pipeline options
   * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
   * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
   * @returns This router instance.
   */
  delete<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: P | Array<P>,
    pipe:
      | Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: RegisterPipelineOptions,
  ): Router<_ExtendContext, ExtendContext> {
    paths = Array.isArray(paths) ? paths : [paths];
    const methodPaths = paths.map(
      (p: string) => `Delete ${p}`,
    ) as Array<MethodPath>;
    return this.register(
      "handler",
      methodPaths,
      pipe as Handler<ExtendContext> | Pipe<ExtendContext>,
      options,
    );
  }

  /**
   * Define handlers for Options http method and the specified paths.
   *
   * @param {Path} paths One or more valid route paths
   * @param pipe One or more main handlers
   * @param {RegisterPipelineOptions} options Register pipeline options
   * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
   * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
   * @returns This router instance.
   */
  options<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: P | Array<P>,
    pipe:
      | Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: RegisterPipelineOptions,
  ): Router<_ExtendContext, ExtendContext> {
    paths = Array.isArray(paths) ? paths : [paths];
    const methodPaths = paths.map(
      (p: string) => `Options ${p}`,
    ) as Array<MethodPath>;
    return this.register(
      "handler",
      methodPaths,
      pipe as Handler<ExtendContext> | Pipe<ExtendContext>,
      options,
    );
  }

  /**
   * Define handlers for Trace http method and the specified paths.
   *
   * @param {Path} paths One or more valid route paths
   * @param pipe One or more main handlers
   * @param {RegisterPipelineOptions} options Register pipeline options
   * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
   * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
   * @returns This router instance.
   */
  trace<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: P | Array<P>,
    pipe:
      | Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: RegisterPipelineOptions,
  ): Router<_ExtendContext, ExtendContext> {
    paths = Array.isArray(paths) ? paths : [paths];
    const methodPaths = paths.map(
      (p: string) => `Trace ${p}`,
    ) as Array<MethodPath>;
    return this.register(
      "handler",
      methodPaths,
      pipe as Handler<ExtendContext> | Pipe<ExtendContext>,
      options,
    );
  }

  /**
   * Define handlers for Connect http method and the specified paths.
   *
   * @param {Path} paths One or more valid route paths
   * @param pipe One or more main handlers
   * @param {RegisterPipelineOptions} options Register pipeline options
   * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
   * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
   * @returns This router instance.
   */
  connect<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: P | Array<P>,
    pipe:
      | Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: RegisterPipelineOptions,
  ): Router<_ExtendContext, ExtendContext> {
    paths = Array.isArray(paths) ? paths : [paths];
    const methodPaths = paths.map(
      (p: string) => `Connect ${p}`,
    ) as Array<MethodPath>;
    return this.register(
      "handler",
      methodPaths,
      pipe as Handler<ExtendContext> | Pipe<ExtendContext>,
      options,
    );
  }

  /**
   * Define filters for all http methods ["Head","Get","Query","Post","Put","Patch","Delete","Options","Trace","Connect"] and the specified paths.
   *
   * @param {Path} paths One or more valid route paths
   * @param pipe One or more filtering handlers
   * @param {RegisterPipelineOptions} options Register pipeline options
   * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
   * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
   * @returns This router instance.
   */
  filterAll<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: P | Array<P>,
    pipe:
      | Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: RegisterPipelineOptions,
  ): Router<_ExtendContext, ExtendContext> {
    paths = Array.isArray(paths) ? paths : [paths];
    const methodPaths: Array<MethodPath> = [];
    for (const p of paths) {
      for (const method of HTTP_METHODS.keys()) {
        methodPaths.push(`${method} ${p}`);
      }
    }
    return this.register(
      "filter",
      methodPaths,
      pipe as Handler<ExtendContext> | Pipe<ExtendContext>,
      options,
    );
  }

  /**
   * Define filters for CRUD http methods ["Get","Query","Post","Put","Patch","Delete"] and the specified paths.
   *
   * @param {Path} paths One or more valid route paths
   * @param pipe One or more filtering handlers
   * @param {RegisterPipelineOptions} options Register pipeline options
   * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
   * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
   * @returns This router instance.
   */
  filterCrud<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: P | Array<P>,
    pipe:
      | Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: RegisterPipelineOptions,
  ): Router<_ExtendContext, ExtendContext> {
    paths = Array.isArray(paths) ? paths : [paths];
    const methodPaths: Array<MethodPath> = [];
    for (const p of paths) {
      for (const method of CRUD_METHODS.keys()) {
        methodPaths.push(`${method} ${p}`);
      }
    }
    return this.register(
      "filter",
      methodPaths,
      pipe as Handler<ExtendContext> | Pipe<ExtendContext>,
      options,
    );
  }

  /**
   * Define filters for Head http method and the specified paths.
   *
   * @param {Path} paths One or more valid route paths
   * @param pipe One or more filtering handlers
   * @param {RegisterPipelineOptions} options Register pipeline options
   * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
   * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
   * @returns This router instance.
   */
  filterHead<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: P | Array<P>,
    pipe:
      | Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: RegisterPipelineOptions,
  ): Router<_ExtendContext, ExtendContext> {
    paths = Array.isArray(paths) ? paths : [paths];
    const methodPaths = paths.map(
      (p: string) => `Head ${p}`,
    ) as Array<MethodPath>;
    return this.register(
      "filter",
      methodPaths,
      pipe as Handler<ExtendContext> | Pipe<ExtendContext>,
      options,
    );
  }

  /**
   * Define filters for Get http method and the specified paths.
   *
   * @param {Path} paths One or more valid route paths
   * @param pipe One or more filtering handlers
   * @param {RegisterPipelineOptions} options Register pipeline options
   * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
   * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
   * @returns This router instance.
   */
  filterGet<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: P | Array<P>,
    pipe:
      | Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: RegisterPipelineOptions,
  ): Router<_ExtendContext, ExtendContext> {
    paths = Array.isArray(paths) ? paths : [paths];
    const methodPaths = paths.map(
      (p: string) => `Get ${p}`,
    ) as Array<MethodPath>;
    return this.register(
      "filter",
      methodPaths,
      pipe as Handler<ExtendContext> | Pipe<ExtendContext>,
      options,
    );
  }

  /**
   * Define filters for Query http method and the specified paths.
   *
   * @param {Path} paths One or more valid route paths
   * @param pipe One or more filtering handlers
   * @param {RegisterPipelineOptions} options Register pipeline options
   * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
   * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
   * @returns This router instance.
   */
  filterQuery<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: P | Array<P>,
    pipe:
      | Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: RegisterPipelineOptions,
  ): Router<_ExtendContext, ExtendContext> {
    paths = Array.isArray(paths) ? paths : [paths];
    const methodPaths = paths.map(
      (p: string) => `Query ${p}`,
    ) as Array<MethodPath>;
    return this.register(
      "filter",
      methodPaths,
      pipe as Handler<ExtendContext> | Pipe<ExtendContext>,
      options,
    );
  }

  /**
   * Define filters for Post http method and the specified paths.
   *
   * @param {Path} paths One or more valid route paths
   * @param pipe One or more filtering handlers
   * @param {RegisterPipelineOptions} options Register pipeline options
   * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
   * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
   * @returns This router instance.
   */
  filterPost<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: P | Array<P>,
    pipe:
      | Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: RegisterPipelineOptions,
  ): Router<_ExtendContext, ExtendContext> {
    paths = Array.isArray(paths) ? paths : [paths];
    const methodPaths = paths.map(
      (p: string) => `Post ${p}`,
    ) as Array<MethodPath>;
    return this.register(
      "filter",
      methodPaths,
      pipe as Handler<ExtendContext> | Pipe<ExtendContext>,
      options,
    );
  }

  /**
   * Define filters for Put http method and the specified paths.
   *
   * @param {Path} paths One or more valid route paths
   * @param pipe One or more filtering handlers
   * @param {RegisterPipelineOptions} options Register pipeline options
   * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
   * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
   * @returns This router instance.
   */
  filterPut<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: P | Array<P>,
    pipe:
      | Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: RegisterPipelineOptions,
  ): Router<_ExtendContext, ExtendContext> {
    paths = Array.isArray(paths) ? paths : [paths];
    const methodPaths = paths.map(
      (p: string) => `Put ${p}`,
    ) as Array<MethodPath>;
    return this.register(
      "filter",
      methodPaths,
      pipe as Handler<ExtendContext> | Pipe<ExtendContext>,
      options,
    );
  }

  /**
   * Define filters for Patch http method and the specified paths.
   *
   * @param {Path} paths One or more valid route paths
   * @param pipe One or more filtering handlers
   * @param {RegisterPipelineOptions} options Register pipeline options
   * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
   * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
   * @returns This router instance.
   */
  filterPatch<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: P | Array<P>,
    pipe:
      | Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: RegisterPipelineOptions,
  ): Router<_ExtendContext, ExtendContext> {
    paths = Array.isArray(paths) ? paths : [paths];
    const methodPaths = paths.map(
      (p: string) => `Patch ${p}`,
    ) as Array<MethodPath>;
    return this.register(
      "filter",
      methodPaths,
      pipe as Handler<ExtendContext> | Pipe<ExtendContext>,
      options,
    );
  }

  /**
   * Define filters for Head Delete method and the specified paths.
   *
   * @param {Path} paths One or more valid route paths
   * @param pipe One or more filtering handlers
   * @param {RegisterPipelineOptions} options Register pipeline options
   * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
   * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
   * @returns This router instance.
   */
  filterDelete<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: P | Array<P>,
    pipe:
      | Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: RegisterPipelineOptions,
  ): Router<_ExtendContext, ExtendContext> {
    paths = Array.isArray(paths) ? paths : [paths];
    const methodPaths = paths.map(
      (p: string) => `Delete ${p}`,
    ) as Array<MethodPath>;
    return this.register(
      "filter",
      methodPaths,
      pipe as Handler<ExtendContext> | Pipe<ExtendContext>,
      options,
    );
  }

  /**
   * Define filters for Options http method and the specified paths.
   *
   * @param {Path} paths One or more valid route paths
   * @param pipe One or more filtering handlers
   * @param {RegisterPipelineOptions} options Register pipeline options
   * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
   * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
   * @returns This router instance.
   */
  filterOptions<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: P | Array<P>,
    pipe:
      | Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: RegisterPipelineOptions,
  ): Router<_ExtendContext, ExtendContext> {
    paths = Array.isArray(paths) ? paths : [paths];
    const methodPaths = paths.map(
      (p: string) => `Options ${p}`,
    ) as Array<MethodPath>;
    return this.register(
      "filter",
      methodPaths,
      pipe as Handler<ExtendContext> | Pipe<ExtendContext>,
      options,
    );
  }

  /**
   * Define filters for Trace http method and the specified paths.
   *
   * @param {Path} paths One or more valid route paths
   * @param pipe One or more filtering handlers
   * @param {RegisterPipelineOptions} options Register pipeline options
   * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
   * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
   * @returns This router instance.
   */
  filterTrace<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: P | Array<P>,
    pipe:
      | Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: RegisterPipelineOptions,
  ): Router<_ExtendContext, ExtendContext> {
    paths = Array.isArray(paths) ? paths : [paths];
    const methodPaths = paths.map(
      (p: string) => `Trace ${p}`,
    ) as Array<MethodPath>;
    return this.register(
      "filter",
      methodPaths,
      pipe as Handler<ExtendContext> | Pipe<ExtendContext>,
      options,
    );
  }

  /**
   * Define filters for Connect http method and the specified paths.
   *
   * @param {Path} paths One or more valid route paths
   * @param pipe One or more filtering handlers
   * @param {RegisterPipelineOptions} options Register pipeline options
   * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
   * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
   * @returns This router instance.
   */
  filterConnect<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: P | Array<P>,
    pipe:
      | Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: RegisterPipelineOptions,
  ): Router<_ExtendContext, ExtendContext> {
    paths = Array.isArray(paths) ? paths : [paths];
    const methodPaths = paths.map(
      (p: string) => `Connect ${p}`,
    ) as Array<MethodPath>;
    return this.register(
      "filter",
      methodPaths,
      pipe as Handler<ExtendContext> | Pipe<ExtendContext>,
      options,
    );
  }

  /**
   * Define handlers for all http methods ["Head","Get","Query","Post","Put","Patch","Delete","Options","Trace","Connect"] and the specified paths.
   *
   * @param {Path} paths One or more valid route paths
   * @param pipe One or more main handlers
   * @param {RegisterPipelineOptions} options Register pipeline options
   * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
   * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
   * @returns This router instance.
   */
  handleAll<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: P | Array<P>,
    pipe:
      | Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: RegisterPipelineOptions,
  ): Router<_ExtendContext, ExtendContext> {
    paths = Array.isArray(paths) ? paths : [paths];
    const methodPaths: Array<MethodPath> = [];
    for (const p of paths) {
      for (const method of HTTP_METHODS.keys()) {
        methodPaths.push(`${method} ${p}`);
      }
    }
    return this.register(
      "handler",
      methodPaths,
      pipe as Handler<ExtendContext> | Pipe<ExtendContext>,
      options,
    );
  }

  /**
   * Define handlers for CRUD http methods ["Get","Query","Post","Put","Patch","Delete"] and the specified paths.
   *
   * @param {Path} paths One or more valid route paths
   * @param pipe One or more main handlers
   * @param {RegisterPipelineOptions} options Register pipeline options
   * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
   * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
   * @returns This router instance.
   */
  handleCrud<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: P | Array<P>,
    pipe:
      | Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: RegisterPipelineOptions,
  ): Router<_ExtendContext, ExtendContext> {
    paths = Array.isArray(paths) ? paths : [paths];
    const methodPaths: Array<MethodPath> = [];
    for (const p of paths) {
      for (const method of CRUD_METHODS.keys()) {
        methodPaths.push(`${method} ${p}`);
      }
    }
    return this.register(
      "handler",
      methodPaths,
      pipe as Handler<ExtendContext> | Pipe<ExtendContext>,
      options,
    );
  }

  /**
   * Define handlers for Head http method and the specified paths.
   *
   * @param {Path} paths One or more valid route paths
   * @param pipe One or more main handlers
   * @param {RegisterPipelineOptions} options Register pipeline options
   * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
   * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
   * @returns This router instance.
   */
  handleHead<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: P | Array<P>,
    pipe:
      | Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: RegisterPipelineOptions,
  ): Router<_ExtendContext, ExtendContext> {
    paths = Array.isArray(paths) ? paths : [paths];
    const methodPaths = paths.map(
      (p: string) => `Head ${p}`,
    ) as Array<MethodPath>;
    return this.register(
      "handler",
      methodPaths,
      pipe as Handler<ExtendContext> | Pipe<ExtendContext>,
      options,
    );
  }

  /**
   * Define handlers for Get http method and the specified paths.
   *
   * @param {Path} paths One or more valid route paths
   * @param pipe One or more main handlers
   * @param {RegisterPipelineOptions} options Register pipeline options
   * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
   * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
   * @returns This router instance.
   */
  handleGet<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: P | Array<P>,
    pipe:
      | Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: RegisterPipelineOptions,
  ): Router<_ExtendContext, ExtendContext> {
    paths = Array.isArray(paths) ? paths : [paths];
    const methodPaths = paths.map(
      (p: string) => `Get ${p}`,
    ) as Array<MethodPath>;
    return this.register(
      "handler",
      methodPaths,
      pipe as Handler<ExtendContext> | Pipe<ExtendContext>,
      options,
    );
  }

  /**
   * Define handlers for Query http method and the specified paths.
   *
   * @param {Path} paths One or more valid route paths
   * @param pipe One or more main handlers
   * @param {RegisterPipelineOptions} options Register pipeline options
   * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
   * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
   * @returns This router instance.
   */
  handleQuery<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: P | Array<P>,
    pipe:
      | Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: RegisterPipelineOptions,
  ): Router<_ExtendContext, ExtendContext> {
    paths = Array.isArray(paths) ? paths : [paths];
    const methodPaths = paths.map(
      (p: string) => `Query ${p}`,
    ) as Array<MethodPath>;
    return this.register(
      "handler",
      methodPaths,
      pipe as Handler<ExtendContext> | Pipe<ExtendContext>,
      options,
    );
  }

  /**
   * Define handlers for Post http method and the specified paths.
   *
   * @param {Path} paths One or more valid route paths
   * @param pipe One or more main handlers
   * @param {RegisterPipelineOptions} options Register pipeline options
   * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
   * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
   * @returns This router instance.
   */
  handlePost<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: P | Array<P>,
    pipe:
      | Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: RegisterPipelineOptions,
  ): Router<_ExtendContext, ExtendContext> {
    paths = Array.isArray(paths) ? paths : [paths];
    const methodPaths = paths.map(
      (p: string) => `Post ${p}`,
    ) as Array<MethodPath>;
    return this.register(
      "handler",
      methodPaths,
      pipe as Handler<ExtendContext> | Pipe<ExtendContext>,
      options,
    );
  }

  /**
   * Define handlers for Put http method and the specified paths.
   *
   * @param {Path} paths One or more valid route paths
   * @param pipe One or more main handlers
   * @param {RegisterPipelineOptions} options Register pipeline options
   * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
   * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
   * @returns This router instance.
   */
  handlePut<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: P | Array<P>,
    pipe:
      | Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: RegisterPipelineOptions,
  ): Router<_ExtendContext, ExtendContext> {
    paths = Array.isArray(paths) ? paths : [paths];
    const methodPaths = paths.map(
      (p: string) => `Put ${p}`,
    ) as Array<MethodPath>;
    return this.register(
      "handler",
      methodPaths,
      pipe as Handler<ExtendContext> | Pipe<ExtendContext>,
      options,
    );
  }

  /**
   * Define handlers for Patch http method and the specified paths.
   *
   * @param {Path} paths One or more valid route paths
   * @param pipe One or more main handlers
   * @param {RegisterPipelineOptions} options Register pipeline options
   * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
   * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
   * @returns This router instance.
   */
  handlePatch<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: P | Array<P>,
    pipe:
      | Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: RegisterPipelineOptions,
  ): Router<_ExtendContext, ExtendContext> {
    paths = Array.isArray(paths) ? paths : [paths];
    const methodPaths = paths.map(
      (p: string) => `Patch ${p}`,
    ) as Array<MethodPath>;
    return this.register(
      "handler",
      methodPaths,
      pipe as Handler<ExtendContext> | Pipe<ExtendContext>,
      options,
    );
  }

  /**
   * Define handlers for Head Delete method and the specified paths.
   *
   * @param {Path} paths One or more valid route paths
   * @param pipe One or more main handlers
   * @param {RegisterPipelineOptions} options Register pipeline options
   * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
   * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
   * @returns This router instance.
   */
  handleDelete<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: P | Array<P>,
    pipe:
      | Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: RegisterPipelineOptions,
  ): Router<_ExtendContext, ExtendContext> {
    paths = Array.isArray(paths) ? paths : [paths];
    const methodPaths = paths.map(
      (p: string) => `Delete ${p}`,
    ) as Array<MethodPath>;
    return this.register(
      "handler",
      methodPaths,
      pipe as Handler<ExtendContext> | Pipe<ExtendContext>,
      options,
    );
  }

  /**
   * Define handlers for Options http method and the specified paths.
   *
   * @param {Path} paths One or more valid route paths
   * @param pipe One or more main handlers
   * @param {RegisterPipelineOptions} options Register pipeline options
   * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
   * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
   * @returns This router instance.
   */
  handleOptions<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: P | Array<P>,
    pipe:
      | Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: RegisterPipelineOptions,
  ): Router<_ExtendContext, ExtendContext> {
    paths = Array.isArray(paths) ? paths : [paths];
    const methodPaths = paths.map(
      (p: string) => `Options ${p}`,
    ) as Array<MethodPath>;
    return this.register(
      "handler",
      methodPaths,
      pipe as Handler<ExtendContext> | Pipe<ExtendContext>,
      options,
    );
  }

  /**
   * Define handlers for Trace http method and the specified paths.
   *
   * @param {Path} paths One or more valid route paths
   * @param pipe One or more main handlers
   * @param {RegisterPipelineOptions} options Register pipeline options
   * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
   * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
   * @returns This router instance.
   */
  handleTrace<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: P | Array<P>,
    pipe:
      | Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: RegisterPipelineOptions,
  ): Router<_ExtendContext, ExtendContext> {
    paths = Array.isArray(paths) ? paths : [paths];
    const methodPaths = paths.map(
      (p: string) => `Trace ${p}`,
    ) as Array<MethodPath>;
    return this.register(
      "handler",
      methodPaths,
      pipe as Handler<ExtendContext> | Pipe<ExtendContext>,
      options,
    );
  }

  /**
   * Define handlers for Connect http method and the specified paths.
   *
   * @param {Path} paths One or more valid route paths
   * @param pipe One or more main handlers
   * @param {RegisterPipelineOptions} options Register pipeline options
   * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
   * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
   * @returns This router instance.
   */
  handleConnect<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: P | Array<P>,
    pipe:
      | Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: RegisterPipelineOptions,
  ): Router<_ExtendContext, ExtendContext> {
    paths = Array.isArray(paths) ? paths : [paths];
    const methodPaths = paths.map(
      (p: string) => `Connect ${p}`,
    ) as Array<MethodPath>;
    return this.register(
      "handler",
      methodPaths,
      pipe as Handler<ExtendContext> | Pipe<ExtendContext>,
      options,
    );
  }

  /**
   * Define fallbacks for all http methods ["Head","Get","Query","Post","Put","Patch","Delete","Options","Trace","Connect"] and the specified paths.
   *
   * @param {Path} paths One or more valid route paths
   * @param pipe One or more fallback handlers
   * @param {RegisterPipelineOptions} options Register pipeline options
   * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
   * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
   * @returns This router instance.
   */
  fallbackAll<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: P | Array<P>,
    pipe:
      | Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: RegisterPipelineOptions,
  ): Router<_ExtendContext, ExtendContext> {
    paths = Array.isArray(paths) ? paths : [paths];
    const methodPaths: Array<MethodPath> = [];
    for (const p of paths) {
      for (const method of HTTP_METHODS.keys()) {
        methodPaths.push(`${method} ${p}`);
      }
    }
    return this.register(
      "fallback",
      methodPaths,
      pipe as Handler<ExtendContext> | Pipe<ExtendContext>,
      options,
    );
  }

  /**
   * Define fallbacks for CRUD http methods ["Get","Query","Post","Put","Patch","Delete"] and the specified paths.
   *
   * @param {Path} paths One or more valid route paths
   * @param pipe One or more fallback handlers
   * @param {RegisterPipelineOptions} options Register pipeline options
   * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
   * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
   * @returns This router instance.
   */
  fallbackCrud<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: P | Array<P>,
    pipe:
      | Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: RegisterPipelineOptions,
  ): Router<_ExtendContext, ExtendContext> {
    paths = Array.isArray(paths) ? paths : [paths];
    const methodPaths: Array<MethodPath> = [];
    for (const p of paths) {
      for (const method of CRUD_METHODS.keys()) {
        methodPaths.push(`${method} ${p}`);
      }
    }
    return this.register(
      "fallback",
      methodPaths,
      pipe as Handler<ExtendContext> | Pipe<ExtendContext>,
      options,
    );
  }

  /**
   * Define fallbacks for Head http method and the specified paths.
   *
   * @param {Path} paths One or more valid route paths
   * @param pipe One or more fallback handlers
   * @param {RegisterPipelineOptions} options Register pipeline options
   * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
   * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
   * @returns This router instance.
   */
  fallbackHead<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: P | Array<P>,
    pipe:
      | Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: RegisterPipelineOptions,
  ): Router<_ExtendContext, ExtendContext> {
    paths = Array.isArray(paths) ? paths : [paths];
    const methodPaths = paths.map(
      (p: string) => `Head ${p}`,
    ) as Array<MethodPath>;
    return this.register(
      "fallback",
      methodPaths,
      pipe as Handler<ExtendContext> | Pipe<ExtendContext>,
      options,
    );
  }

  /**
   * Define fallbacks for Get http method and the specified paths.
   *
   * @param {Path} paths One or more valid route paths
   * @param pipe One or more fallback handlers
   * @param {RegisterPipelineOptions} options Register pipeline options
   * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
   * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
   * @returns This router instance.
   */
  fallbackGet<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: P | Array<P>,
    pipe:
      | Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: RegisterPipelineOptions,
  ): Router<_ExtendContext, ExtendContext> {
    paths = Array.isArray(paths) ? paths : [paths];
    const methodPaths = paths.map(
      (p: string) => `Get ${p}`,
    ) as Array<MethodPath>;
    return this.register(
      "fallback",
      methodPaths,
      pipe as Handler<ExtendContext> | Pipe<ExtendContext>,
      options,
    );
  }

  /**
   * Define fallbacks for Query http method and the specified paths.
   *
   * @param {Path} paths One or more valid route paths
   * @param pipe One or more fallback handlers
   * @param {RegisterPipelineOptions} options Register pipeline options
   * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
   * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
   * @returns This router instance.
   */
  fallbackQuery<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: P | Array<P>,
    pipe:
      | Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: RegisterPipelineOptions,
  ): Router<_ExtendContext, ExtendContext> {
    paths = Array.isArray(paths) ? paths : [paths];
    const methodPaths = paths.map(
      (p: string) => `Query ${p}`,
    ) as Array<MethodPath>;
    return this.register(
      "fallback",
      methodPaths,
      pipe as Handler<ExtendContext> | Pipe<ExtendContext>,
      options,
    );
  }

  /**
   * Define fallbacks for Post http method and the specified paths.
   *
   * @param {Path} paths One or more valid route paths
   * @param pipe One or more fallback handlers
   * @param {RegisterPipelineOptions} options Register pipeline options
   * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
   * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
   * @returns This router instance.
   */
  fallbackPost<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: P | Array<P>,
    pipe:
      | Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: RegisterPipelineOptions,
  ): Router<_ExtendContext, ExtendContext> {
    paths = Array.isArray(paths) ? paths : [paths];
    const methodPaths = paths.map(
      (p: string) => `Post ${p}`,
    ) as Array<MethodPath>;
    return this.register(
      "fallback",
      methodPaths,
      pipe as Handler<ExtendContext> | Pipe<ExtendContext>,
      options,
    );
  }

  /**
   * Define fallbacks for Put http method and the specified paths.
   *
   * @param {Path} paths One or more valid route paths
   * @param pipe One or more fallback handlers
   * @param {RegisterPipelineOptions} options Register pipeline options
   * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
   * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
   * @returns This router instance.
   */
  fallbackPut<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: P | Array<P>,
    pipe:
      | Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: RegisterPipelineOptions,
  ): Router<_ExtendContext, ExtendContext> {
    paths = Array.isArray(paths) ? paths : [paths];
    const methodPaths = paths.map(
      (p: string) => `Put ${p}`,
    ) as Array<MethodPath>;
    return this.register(
      "fallback",
      methodPaths,
      pipe as Handler<ExtendContext> | Pipe<ExtendContext>,
      options,
    );
  }

  /**
   * Define fallbacks for Patch http method and the specified paths.
   *
   * @param {Path} paths One or more valid route paths
   * @param pipe One or more fallback handlers
   * @param {RegisterPipelineOptions} options Register pipeline options
   * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
   * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
   * @returns This router instance.
   */
  fallbackPatch<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: P | Array<P>,
    pipe:
      | Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: RegisterPipelineOptions,
  ): Router<_ExtendContext, ExtendContext> {
    paths = Array.isArray(paths) ? paths : [paths];
    const methodPaths = paths.map(
      (p: string) => `Patch ${p}`,
    ) as Array<MethodPath>;
    return this.register(
      "fallback",
      methodPaths,
      pipe as Handler<ExtendContext> | Pipe<ExtendContext>,
      options,
    );
  }

  /**
   * Define fallbacks for Head Delete method and the specified paths.
   *
   * @param {Path} paths One or more valid route paths
   * @param pipe One or more fallback handlers
   * @param {RegisterPipelineOptions} options Register pipeline options
   * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
   * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
   * @returns This router instance.
   */
  fallbackDelete<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: P | Array<P>,
    pipe:
      | Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: RegisterPipelineOptions,
  ): Router<_ExtendContext, ExtendContext> {
    paths = Array.isArray(paths) ? paths : [paths];
    const methodPaths = paths.map(
      (p: string) => `Delete ${p}`,
    ) as Array<MethodPath>;
    return this.register(
      "fallback",
      methodPaths,
      pipe as Handler<ExtendContext> | Pipe<ExtendContext>,
      options,
    );
  }

  /**
   * Define fallbacks for Options http method and the specified paths.
   *
   * @param {Path} paths One or more valid route paths
   * @param pipe One or more fallback handlers
   * @param {RegisterPipelineOptions} options Register pipeline options
   * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
   * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
   * @returns This router instance.
   */
  fallbackOptions<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: P | Array<P>,
    pipe:
      | Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: RegisterPipelineOptions,
  ): Router<_ExtendContext, ExtendContext> {
    paths = Array.isArray(paths) ? paths : [paths];
    const methodPaths = paths.map(
      (p: string) => `Options ${p}`,
    ) as Array<MethodPath>;
    return this.register(
      "fallback",
      methodPaths,
      pipe as Handler<ExtendContext> | Pipe<ExtendContext>,
      options,
    );
  }

  /**
   * Define fallbacks for Trace http method and the specified paths.
   *
   * @param {Path} paths One or more valid route paths
   * @param pipe One or more fallback handlers
   * @param {RegisterPipelineOptions} options Register pipeline options
   * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
   * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
   * @returns This router instance.
   */
  fallbackTrace<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: P | Array<P>,
    pipe:
      | Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: RegisterPipelineOptions,
  ): Router<_ExtendContext, ExtendContext> {
    paths = Array.isArray(paths) ? paths : [paths];
    const methodPaths = paths.map(
      (p: string) => `Trace ${p}`,
    ) as Array<MethodPath>;
    return this.register(
      "fallback",
      methodPaths,
      pipe as Handler<ExtendContext> | Pipe<ExtendContext>,
      options,
    );
  }

  /**
   * Define fallbacks for Connect http method and the specified paths.
   *
   * @param {Path} paths One or more valid route paths
   * @param pipe One or more fallback handlers
   * @param {RegisterPipelineOptions} options Register pipeline options
   * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
   * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
   * @returns This router instance.
   */
  fallbackConnect<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: P | Array<P>,
    pipe:
      | Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: RegisterPipelineOptions,
  ): Router<_ExtendContext, ExtendContext> {
    paths = Array.isArray(paths) ? paths : [paths];
    const methodPaths = paths.map(
      (p: string) => `Connect ${p}`,
    ) as Array<MethodPath>;
    return this.register(
      "fallback",
      methodPaths,
      pipe as Handler<ExtendContext> | Pipe<ExtendContext>,
      options,
    );
  }

  /**
   * Define afters for all http methods ["Head","Get","Query","Post","Put","Patch","Delete","Options","Trace","Connect"] and the specified paths.
   *
   * @param {Path} paths One or more valid route paths
   * @param pipe One or more after handlers
   * @param {RegisterPipelineOptions} options Register pipeline options
   * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
   * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
   * @returns This router instance.
   */
  afterAll<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: P | Array<P>,
    pipe:
      | EndHandler<
          CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore
        >
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: RegisterPipelineOptions,
  ): Router<_ExtendContext, ExtendContext> {
    paths = Array.isArray(paths) ? paths : [paths];
    const methodPaths: Array<MethodPath> = [];
    for (const p of paths) {
      for (const method of HTTP_METHODS.keys()) {
        methodPaths.push(`${method} ${p}`);
      }
    }
    return this.register(
      "after",
      methodPaths,
      pipe as EndHandler<ExtendContext> | Pipe<ExtendContext>,
      options,
    );
  }

  /**
   * Define afters for CRUD http methods ["Get","Query","Post","Put","Patch","Delete"] and the specified paths.
   *
   * @param {Path} paths One or more valid route paths
   * @param pipe One or more after handlers
   * @param {RegisterPipelineOptions} options Register pipeline options
   * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
   * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
   * @returns This router instance.
   */
  afterCrud<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: P | Array<P>,
    pipe:
      | EndHandler<
          CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore
        >
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: RegisterPipelineOptions,
  ): Router<_ExtendContext, ExtendContext> {
    paths = Array.isArray(paths) ? paths : [paths];
    const methodPaths: Array<MethodPath> = [];
    for (const p of paths) {
      for (const method of CRUD_METHODS.keys()) {
        methodPaths.push(`${method} ${p}`);
      }
    }
    return this.register(
      "after",
      methodPaths,
      pipe as EndHandler<ExtendContext> | Pipe<ExtendContext>,
      options,
    );
  }

  /**
   * Define afters for Head http method and the specified paths.
   *
   * @param {Path} paths One or more valid route paths
   * @param pipe One or more after handlers
   * @param {RegisterPipelineOptions} options Register pipeline options
   * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
   * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
   * @returns This router instance.
   */
  afterHead<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: P | Array<P>,
    pipe:
      | EndHandler<
          CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore
        >
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: RegisterPipelineOptions,
  ): Router<_ExtendContext, ExtendContext> {
    paths = Array.isArray(paths) ? paths : [paths];
    const methodPaths = paths.map(
      (p: string) => `Head ${p}`,
    ) as Array<MethodPath>;
    return this.register(
      "after",
      methodPaths,
      pipe as EndHandler<ExtendContext> | Pipe<ExtendContext>,
      options,
    );
  }

  /**
   * Define afters for Get http method and the specified paths.
   *
   * @param {Path} paths One or more valid route paths
   * @param pipe One or more after handlers
   * @param {RegisterPipelineOptions} options Register pipeline options
   * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
   * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
   * @returns This router instance.
   */
  afterGet<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: P | Array<P>,
    pipe:
      | EndHandler<
          CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore
        >
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: RegisterPipelineOptions,
  ): Router<_ExtendContext, ExtendContext> {
    paths = Array.isArray(paths) ? paths : [paths];
    const methodPaths = paths.map(
      (p: string) => `Get ${p}`,
    ) as Array<MethodPath>;
    return this.register(
      "after",
      methodPaths,
      pipe as EndHandler<ExtendContext> | Pipe<ExtendContext>,
      options,
    );
  }

  /**
   * Define afters for Query http method and the specified paths.
   *
   * @param {Path} paths One or more valid route paths
   * @param pipe One or more after handlers
   * @param {RegisterPipelineOptions} options Register pipeline options
   * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
   * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
   * @returns This router instance.
   */
  afterQuery<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: P | Array<P>,
    pipe:
      | EndHandler<
          CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore
        >
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: RegisterPipelineOptions,
  ): Router<_ExtendContext, ExtendContext> {
    paths = Array.isArray(paths) ? paths : [paths];
    const methodPaths = paths.map(
      (p: string) => `Query ${p}`,
    ) as Array<MethodPath>;
    return this.register(
      "after",
      methodPaths,
      pipe as EndHandler<ExtendContext> | Pipe<ExtendContext>,
      options,
    );
  }

  /**
   * Define afters for Post http method and the specified paths.
   *
   * @param {Path} paths One or more valid route paths
   * @param pipe One or more after handlers
   * @param {RegisterPipelineOptions} options Register pipeline options
   * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
   * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
   * @returns This router instance.
   */
  afterPost<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: P | Array<P>,
    pipe:
      | EndHandler<
          CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore
        >
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: RegisterPipelineOptions,
  ): Router<_ExtendContext, ExtendContext> {
    paths = Array.isArray(paths) ? paths : [paths];
    const methodPaths = paths.map(
      (p: string) => `Post ${p}`,
    ) as Array<MethodPath>;
    return this.register(
      "after",
      methodPaths,
      pipe as EndHandler<ExtendContext> | Pipe<ExtendContext>,
      options,
    );
  }

  /**
   * Define afters for Put http method and the specified paths.
   *
   * @param {Path} paths One or more valid route paths
   * @param pipe One or more after handlers
   * @param {RegisterPipelineOptions} options Register pipeline options
   * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
   * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
   * @returns This router instance.
   */
  afterPut<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: P | Array<P>,
    pipe:
      | EndHandler<
          CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore
        >
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: RegisterPipelineOptions,
  ): Router<_ExtendContext, ExtendContext> {
    paths = Array.isArray(paths) ? paths : [paths];
    const methodPaths = paths.map(
      (p: string) => `Put ${p}`,
    ) as Array<MethodPath>;
    return this.register(
      "after",
      methodPaths,
      pipe as EndHandler<ExtendContext> | Pipe<ExtendContext>,
      options,
    );
  }

  /**
   * Define afters for Patch http method and the specified paths.
   *
   * @param {Path} paths One or more valid route paths
   * @param pipe One or more after handlers
   * @param {RegisterPipelineOptions} options Register pipeline options
   * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
   * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
   * @returns This router instance.
   */
  afterPatch<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: P | Array<P>,
    pipe:
      | EndHandler<
          CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore
        >
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: RegisterPipelineOptions,
  ): Router<_ExtendContext, ExtendContext> {
    paths = Array.isArray(paths) ? paths : [paths];
    const methodPaths = paths.map(
      (p: string) => `Patch ${p}`,
    ) as Array<MethodPath>;
    return this.register(
      "after",
      methodPaths,
      pipe as EndHandler<ExtendContext> | Pipe<ExtendContext>,
      options,
    );
  }

  /**
   * Define afters for Head Delete method and the specified paths.
   *
   * @param {Path} paths One or more valid route paths
   * @param pipe One or more after handlers
   * @param {RegisterPipelineOptions} options Register pipeline options
   * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
   * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
   * @returns This router instance.
   */
  afterDelete<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: P | Array<P>,
    pipe:
      | EndHandler<
          CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore
        >
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: RegisterPipelineOptions,
  ): Router<_ExtendContext, ExtendContext> {
    paths = Array.isArray(paths) ? paths : [paths];
    const methodPaths = paths.map(
      (p: string) => `Delete ${p}`,
    ) as Array<MethodPath>;
    return this.register(
      "after",
      methodPaths,
      pipe as EndHandler<ExtendContext> | Pipe<ExtendContext>,
      options,
    );
  }

  /**
   * Define afters for Options http method and the specified paths.
   *
   * @param {Path} paths One or more valid route paths
   * @param pipe One or more after handlers
   * @param {RegisterPipelineOptions} options Register pipeline options
   * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
   * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
   * @returns This router instance.
   */
  afterOptions<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: P | Array<P>,
    pipe:
      | EndHandler<
          CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore
        >
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: RegisterPipelineOptions,
  ): Router<_ExtendContext, ExtendContext> {
    paths = Array.isArray(paths) ? paths : [paths];
    const methodPaths = paths.map(
      (p: string) => `Options ${p}`,
    ) as Array<MethodPath>;
    return this.register(
      "after",
      methodPaths,
      pipe as EndHandler<ExtendContext> | Pipe<ExtendContext>,
      options,
    );
  }

  /**
   * Define afters for Trace http method and the specified paths.
   *
   * @param {Path} paths One or more valid route paths
   * @param pipe One or more after handlers
   * @param {RegisterPipelineOptions} options Register pipeline options
   * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
   * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
   * @returns This router instance.
   */
  afterTrace<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: P | Array<P>,
    pipe:
      | EndHandler<
          CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore
        >
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: RegisterPipelineOptions,
  ): Router<_ExtendContext, ExtendContext> {
    paths = Array.isArray(paths) ? paths : [paths];
    const methodPaths = paths.map(
      (p: string) => `Trace ${p}`,
    ) as Array<MethodPath>;
    return this.register(
      "after",
      methodPaths,
      pipe as EndHandler<ExtendContext> | Pipe<ExtendContext>,
      options,
    );
  }

  /**
   * Define afters for Connect http method and the specified paths.
   *
   * @param {Path} paths One or more valid route paths
   * @param pipe One or more after handlers
   * @param {RegisterPipelineOptions} options Register pipeline options
   * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
   * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
   * @returns This router instance.
   */
  afterConnect<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: P | Array<P>,
    pipe:
      | EndHandler<
          CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore
        >
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: RegisterPipelineOptions,
  ): Router<_ExtendContext, ExtendContext> {
    paths = Array.isArray(paths) ? paths : [paths];
    const methodPaths = paths.map(
      (p: string) => `Connect ${p}`,
    ) as Array<MethodPath>;
    return this.register(
      "after",
      methodPaths,
      pipe as EndHandler<ExtendContext> | Pipe<ExtendContext>,
      options,
    );
  }

  /**
   * Define catchers for all http methods ["Head","Get","Query","Post","Put","Patch","Delete","Options","Trace","Connect"] and the specified paths.
   *
   * @param {Path} paths One or more valid route paths
   * @param pipe One or more error handlers
   * @param {RegisterPipelineOptions} options Register pipeline options
   * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
   * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
   * @returns This router instance.
   */
  catchAll<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: P | Array<P>,
    pipe:
      | ErrorHandler<
          CTParams<ExtractParams<P>> &
            CTError &
            ExtendContext &
            ExtendContextMore
        >
      | ErrorPipe<
          CTParams<ExtractParams<P>> &
            CTError &
            ExtendContext &
            ExtendContextMore
        >,
    options?: RegisterPipelineOptions,
  ): Router<_ExtendContext, ExtendContext> {
    paths = Array.isArray(paths) ? paths : [paths];
    const methodPaths: Array<MethodPath> = [];
    for (const p of paths) {
      for (const method of HTTP_METHODS.keys()) {
        methodPaths.push(`${method} ${p}`);
      }
    }
    return this.register(
      "catcher",
      methodPaths,
      pipe as ErrorHandler<ExtendContext> | ErrorPipe<ExtendContext>,
      options,
    );
  }

  /**
   * Define catchers for CRUD http methods ["Get","Query","Post","Put","Patch","Delete"] and the specified paths.
   *
   * @param {Path} paths One or more valid route paths
   * @param pipe One or more error handlers
   * @param {RegisterPipelineOptions} options Register pipeline options
   * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
   * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
   * @returns This router instance.
   */
  catchCrud<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: P | Array<P>,
    pipe:
      | ErrorHandler<
          CTParams<ExtractParams<P>> &
            CTError &
            ExtendContext &
            ExtendContextMore
        >
      | ErrorPipe<
          CTParams<ExtractParams<P>> &
            CTError &
            ExtendContext &
            ExtendContextMore
        >,
    options?: RegisterPipelineOptions,
  ): Router<_ExtendContext, ExtendContext> {
    paths = Array.isArray(paths) ? paths : [paths];
    const methodPaths: Array<MethodPath> = [];
    for (const p of paths) {
      for (const method of CRUD_METHODS.keys()) {
        methodPaths.push(`${method} ${p}`);
      }
    }
    return this.register(
      "catcher",
      methodPaths,
      pipe as ErrorHandler<ExtendContext> | ErrorPipe<ExtendContext>,
      options,
    );
  }

  /**
   * Define catchers for Head http method and the specified paths.
   *
   * @param {Path} paths One or more valid route paths
   * @param pipe One or more error handlers
   * @param {RegisterPipelineOptions} options Register pipeline options
   * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
   * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
   * @returns This router instance.
   */
  catchHead<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: P | Array<P>,
    pipe:
      | ErrorHandler<
          CTParams<ExtractParams<P>> &
            CTError &
            ExtendContext &
            ExtendContextMore
        >
      | ErrorPipe<
          CTParams<ExtractParams<P>> &
            CTError &
            ExtendContext &
            ExtendContextMore
        >,
    options?: RegisterPipelineOptions,
  ): Router<_ExtendContext, ExtendContext> {
    paths = Array.isArray(paths) ? paths : [paths];
    const methodPaths = paths.map(
      (p: string) => `Head ${p}`,
    ) as Array<MethodPath>;
    return this.register(
      "catcher",
      methodPaths,
      pipe as ErrorHandler<ExtendContext> | ErrorPipe<ExtendContext>,
      options,
    );
  }

  /**
   * Define catchers for Get http method and the specified paths.
   *
   * @param {Path} paths One or more valid route paths
   * @param pipe One or more error handlers
   * @param {RegisterPipelineOptions} options Register pipeline options
   * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
   * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
   * @returns This router instance.
   */
  catchGet<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: P | Array<P>,
    pipe:
      | ErrorHandler<
          CTParams<ExtractParams<P>> &
            CTError &
            ExtendContext &
            ExtendContextMore
        >
      | ErrorPipe<
          CTParams<ExtractParams<P>> &
            CTError &
            ExtendContext &
            ExtendContextMore
        >,
    options?: RegisterPipelineOptions,
  ): Router<_ExtendContext, ExtendContext> {
    paths = Array.isArray(paths) ? paths : [paths];
    const methodPaths = paths.map(
      (p: string) => `Get ${p}`,
    ) as Array<MethodPath>;
    return this.register(
      "catcher",
      methodPaths,
      pipe as ErrorHandler<ExtendContext> | ErrorPipe<ExtendContext>,
      options,
    );
  }

  /**
   * Define catchers for Query http method and the specified paths.
   *
   * @param {Path} paths One or more valid route paths
   * @param pipe One or more error handlers
   * @param {RegisterPipelineOptions} options Register pipeline options
   * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
   * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
   * @returns This router instance.
   */
  catchQuery<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: P | Array<P>,
    pipe:
      | ErrorHandler<
          CTParams<ExtractParams<P>> &
            CTError &
            ExtendContext &
            ExtendContextMore
        >
      | ErrorPipe<
          CTParams<ExtractParams<P>> &
            CTError &
            ExtendContext &
            ExtendContextMore
        >,
    options?: RegisterPipelineOptions,
  ): Router<_ExtendContext, ExtendContext> {
    paths = Array.isArray(paths) ? paths : [paths];
    const methodPaths = paths.map(
      (p: string) => `Query ${p}`,
    ) as Array<MethodPath>;
    return this.register(
      "catcher",
      methodPaths,
      pipe as ErrorHandler<ExtendContext> | ErrorPipe<ExtendContext>,
      options,
    );
  }

  /**
   * Define catchers for Post http method and the specified paths.
   *
   * @param {Path} paths One or more valid route paths
   * @param pipe One or more error handlers
   * @param {RegisterPipelineOptions} options Register pipeline options
   * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
   * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
   * @returns This router instance.
   */
  catchPost<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: P | Array<P>,
    pipe:
      | ErrorHandler<
          CTParams<ExtractParams<P>> &
            CTError &
            ExtendContext &
            ExtendContextMore
        >
      | ErrorPipe<
          CTParams<ExtractParams<P>> &
            CTError &
            ExtendContext &
            ExtendContextMore
        >,
    options?: RegisterPipelineOptions,
  ): Router<_ExtendContext, ExtendContext> {
    paths = Array.isArray(paths) ? paths : [paths];
    const methodPaths = paths.map(
      (p: string) => `Post ${p}`,
    ) as Array<MethodPath>;
    return this.register(
      "catcher",
      methodPaths,
      pipe as ErrorHandler<ExtendContext> | ErrorPipe<ExtendContext>,
      options,
    );
  }

  /**
   * Define catchers for Put http method and the specified paths.
   *
   * @param {Path} paths One or more valid route paths
   * @param pipe One or more error handlers
   * @param {RegisterPipelineOptions} options Register pipeline options
   * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
   * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
   * @returns This router instance.
   */
  catchPut<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: P | Array<P>,
    pipe:
      | ErrorHandler<
          CTParams<ExtractParams<P>> &
            CTError &
            ExtendContext &
            ExtendContextMore
        >
      | ErrorPipe<
          CTParams<ExtractParams<P>> &
            CTError &
            ExtendContext &
            ExtendContextMore
        >,
    options?: RegisterPipelineOptions,
  ): Router<_ExtendContext, ExtendContext> {
    paths = Array.isArray(paths) ? paths : [paths];
    const methodPaths = paths.map(
      (p: string) => `Put ${p}`,
    ) as Array<MethodPath>;
    return this.register(
      "catcher",
      methodPaths,
      pipe as ErrorHandler<ExtendContext> | ErrorPipe<ExtendContext>,
      options,
    );
  }

  /**
   * Define catchers for Patch http method and the specified paths.
   *
   * @param {Path} paths One or more valid route paths
   * @param pipe One or more error handlers
   * @param {RegisterPipelineOptions} options Register pipeline options
   * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
   * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
   * @returns This router instance.
   */
  catchPatch<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: P | Array<P>,
    pipe:
      | ErrorHandler<
          CTParams<ExtractParams<P>> &
            CTError &
            ExtendContext &
            ExtendContextMore
        >
      | ErrorPipe<
          CTParams<ExtractParams<P>> &
            CTError &
            ExtendContext &
            ExtendContextMore
        >,
    options?: RegisterPipelineOptions,
  ): Router<_ExtendContext, ExtendContext> {
    paths = Array.isArray(paths) ? paths : [paths];
    const methodPaths = paths.map(
      (p: string) => `Patch ${p}`,
    ) as Array<MethodPath>;
    return this.register(
      "catcher",
      methodPaths,
      pipe as ErrorHandler<ExtendContext> | ErrorPipe<ExtendContext>,
      options,
    );
  }

  /**
   * Define catchers for Head Delete method and the specified paths.
   *
   * @param {Path} paths One or more valid route paths
   * @param pipe One or more error handlers
   * @param {RegisterPipelineOptions} options Register pipeline options
   * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
   * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
   * @returns This router instance.
   */
  catchDelete<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: P | Array<P>,
    pipe:
      | ErrorHandler<
          CTParams<ExtractParams<P>> &
            CTError &
            ExtendContext &
            ExtendContextMore
        >
      | ErrorPipe<
          CTParams<ExtractParams<P>> &
            CTError &
            ExtendContext &
            ExtendContextMore
        >,
    options?: RegisterPipelineOptions,
  ): Router<_ExtendContext, ExtendContext> {
    paths = Array.isArray(paths) ? paths : [paths];
    const methodPaths = paths.map(
      (p: string) => `Delete ${p}`,
    ) as Array<MethodPath>;
    return this.register(
      "catcher",
      methodPaths,
      pipe as ErrorHandler<ExtendContext> | ErrorPipe<ExtendContext>,
      options,
    );
  }

  /**
   * Define catchers for Options http method and the specified paths.
   *
   * @param {Path} paths One or more valid route paths
   * @param pipe One or more error handlers
   * @param {RegisterPipelineOptions} options Register pipeline options
   * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
   * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
   * @returns This router instance.
   */
  catchOptions<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: P | Array<P>,
    pipe:
      | ErrorHandler<
          CTParams<ExtractParams<P>> &
            CTError &
            ExtendContext &
            ExtendContextMore
        >
      | ErrorPipe<
          CTParams<ExtractParams<P>> &
            CTError &
            ExtendContext &
            ExtendContextMore
        >,
    options?: RegisterPipelineOptions,
  ): Router<_ExtendContext, ExtendContext> {
    paths = Array.isArray(paths) ? paths : [paths];
    const methodPaths = paths.map(
      (p: string) => `Options ${p}`,
    ) as Array<MethodPath>;
    return this.register(
      "catcher",
      methodPaths,
      pipe as ErrorHandler<ExtendContext> | ErrorPipe<ExtendContext>,
      options,
    );
  }

  /**
   * Define catchers for Trace http method and the specified paths.
   *
   * @param {Path} paths One or more valid route paths
   * @param pipe One or more error handlers
   * @param {RegisterPipelineOptions} options Register pipeline options
   * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
   * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
   * @returns This router instance.
   */
  catchTrace<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: P | Array<P>,
    pipe:
      | ErrorHandler<
          CTParams<ExtractParams<P>> &
            CTError &
            ExtendContext &
            ExtendContextMore
        >
      | ErrorPipe<
          CTParams<ExtractParams<P>> &
            CTError &
            ExtendContext &
            ExtendContextMore
        >,
    options?: RegisterPipelineOptions,
  ): Router<_ExtendContext, ExtendContext> {
    paths = Array.isArray(paths) ? paths : [paths];
    const methodPaths = paths.map(
      (p: string) => `Trace ${p}`,
    ) as Array<MethodPath>;
    return this.register(
      "catcher",
      methodPaths,
      pipe as ErrorHandler<ExtendContext> | ErrorPipe<ExtendContext>,
      options,
    );
  }

  /**
   * Define catchers for Connect http method and the specified paths.
   *
   * @param {Path} paths One or more valid route paths
   * @param pipe One or more error handlers
   * @param {RegisterPipelineOptions} options Register pipeline options
   * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
   * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
   * @returns This router instance.
   */
  catchConnect<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: P | Array<P>,
    pipe:
      | ErrorHandler<
          CTParams<ExtractParams<P>> &
            CTError &
            ExtendContext &
            ExtendContextMore
        >
      | ErrorPipe<
          CTParams<ExtractParams<P>> &
            CTError &
            ExtendContext &
            ExtendContextMore
        >,
    options?: RegisterPipelineOptions,
  ): Router<_ExtendContext, ExtendContext> {
    paths = Array.isArray(paths) ? paths : [paths];
    const methodPaths = paths.map(
      (p: string) => `Connect ${p}`,
    ) as Array<MethodPath>;
    return this.register(
      "catcher",
      methodPaths,
      pipe as ErrorHandler<ExtendContext> | ErrorPipe<ExtendContext>,
      options,
    );
  }

  /**
   * Define filters for the specified method paths.
   *
   * @param {MethodPath|Array<MethodPath>} methodPaths Method-path definitions in the form of: `Method /Path`, or [`Method /Path`, ...] or [[`Method`, ...], `/Path`, ...]
   * @param pipe One or more filtering handlers
   * @param {RegisterPipelineOptions} options Register pipeline options
   * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
   * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
   * @returns This router instance.
   */
  filter<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    MP extends MethodPath = MethodPath,
    P extends Path = Path,
  >(
    methodPaths: MP | Array<MP> | [Array<HttpMethod>, ...Array<P>],
    pipe:
      | Handler<
          CTParams<ExtractMethodPathsParams<MP> | ExtractParams<P>> &
            ExtendContext &
            ExtendContextMore
        >
      | Pipe<
          CTParams<ExtractMethodPathsParams<MP> | ExtractParams<P>> &
            ExtendContext &
            ExtendContextMore
        >,
    options?: RegisterPipelineOptions,
  ): Router<_ExtendContext, ExtendContext> {
    const methodPathIsArray = Array.isArray(methodPaths);
    if (
      methodPathIsArray &&
      !methodPaths.slice(1).every((mp) => typeof mp === "string")
    ) {
      throw new RouterError(
        "Invalid path type. Allowed [[Methods...], ...Paths]",
      );
    }
    const firstElementIsArray =
      methodPathIsArray && Array.isArray(methodPaths[0]);
    if (
      firstElementIsArray &&
      !(methodPaths[0] as HttpMethod[]).every((mp) => typeof mp === "string")
    ) {
      throw new RouterError(
        "Invalid method type. Allowed [[Methods...], ...Paths]",
      );
    }
    if (firstElementIsArray && methodPaths[0].length === 0) {
      throw new RouterError("Empty method. Allowed [[Methods...], ...Paths]");
    }
    if (
      methodPathIsArray &&
      !firstElementIsArray &&
      !methodPaths.every((mp) => typeof mp === "string")
    ) {
      throw new RouterError("Invalid method type. Allowed [...MethodPaths]");
    }
    if (
      !methodPathIsArray &&
      !firstElementIsArray &&
      typeof methodPaths !== "string"
    ) {
      throw new RouterError("Invalid method type. Allowed MethodPath");
    }
    const methodPaths_ = methodPathIsArray
      ? Array.isArray(methodPaths[0])
        ? (methodPaths[0].flatMap((method) =>
            methodPaths
              .slice(1)
              .map((paths) => `${method} ${paths}` as MethodPath),
          ) as MethodPath[])
        : (methodPaths as MethodPath[])
      : methodPaths;
    return this.register(
      "filter",
      methodPaths_,
      pipe as Handler<ExtendContext> | Pipe<ExtendContext>,
      options,
    );
  }

  /**
   * Define handlers for the specified method paths.
   *
   * @param {MethodPath|Array<MethodPath>} methodPaths Method-path definitions in the form of: `Method /Path`, or [`Method /Path`, ...] or [[`Method`, ...], `/Path`, ...]
   * @param pipe One or more main handlers
   * @param {RegisterPipelineOptions} options Register pipeline options
   * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
   * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
   * @returns This router instance.
   */
  handle<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    MP extends MethodPath = MethodPath,
    P extends Path = Path,
  >(
    methodPaths: MP | Array<MP> | [Array<HttpMethod>, ...Array<P>],
    pipe:
      | Handler<
          CTParams<ExtractMethodPathsParams<MP> | ExtractParams<P>> &
            ExtendContext &
            ExtendContextMore
        >
      | Pipe<
          CTParams<ExtractMethodPathsParams<MP> | ExtractParams<P>> &
            ExtendContext &
            ExtendContextMore
        >,
    options?: RegisterPipelineOptions,
  ): Router<_ExtendContext, ExtendContext> {
    const methodPathIsArray = Array.isArray(methodPaths);
    if (
      methodPathIsArray &&
      !methodPaths.slice(1).every((mp) => typeof mp === "string")
    ) {
      throw new RouterError(
        "Invalid path type. Allowed [[Methods...], ...Paths]",
      );
    }
    const firstElementIsArray =
      methodPathIsArray && Array.isArray(methodPaths[0]);
    if (
      firstElementIsArray &&
      !(methodPaths[0] as HttpMethod[]).every((mp) => typeof mp === "string")
    ) {
      throw new RouterError(
        "Invalid method type. Allowed [[Methods...], ...Paths]",
      );
    }
    if (firstElementIsArray && methodPaths[0].length === 0) {
      throw new RouterError("Empty method. Allowed [[Methods...], ...Paths]");
    }
    if (
      methodPathIsArray &&
      !firstElementIsArray &&
      !methodPaths.every((mp) => typeof mp === "string")
    ) {
      throw new RouterError("Invalid method type. Allowed [...MethodPaths]");
    }
    if (
      !methodPathIsArray &&
      !firstElementIsArray &&
      typeof methodPaths !== "string"
    ) {
      throw new RouterError("Invalid method type. Allowed MethodPath");
    }
    const methodPaths_ = methodPathIsArray
      ? Array.isArray(methodPaths[0])
        ? (methodPaths[0].flatMap((method) =>
            methodPaths
              .slice(1)
              .map((paths) => `${method} ${paths}` as MethodPath),
          ) as MethodPath[])
        : (methodPaths as MethodPath[])
      : methodPaths;
    return this.register(
      "handler",
      methodPaths_,
      pipe as Handler<ExtendContext> | Pipe<ExtendContext>,
      options,
    );
  }

  /**
   * Define fallbacks for the specified method paths.
   *
   * @param {MethodPath|Array<MethodPath>} methodPaths Method-path definitions in the form of: `Method /Path`, or [`Method /Path`, ...] or [[`Method`, ...], `/Path`, ...]
   * @param pipe One or more fallback handlers
   * @param {RegisterPipelineOptions} options Register pipeline options
   * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
   * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
   * @returns This router instance.
   */
  fallback<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    MP extends MethodPath = MethodPath,
    P extends Path = Path,
  >(
    methodPaths: MP | Array<MP> | [Array<HttpMethod>, ...Array<P>],
    pipe:
      | Handler<
          CTParams<ExtractMethodPathsParams<MP> | ExtractParams<P>> &
            ExtendContext &
            ExtendContextMore
        >
      | Pipe<
          CTParams<ExtractMethodPathsParams<MP> | ExtractParams<P>> &
            ExtendContext &
            ExtendContextMore
        >,
    options?: RegisterPipelineOptions,
  ): Router<_ExtendContext, ExtendContext> {
    const methodPathIsArray = Array.isArray(methodPaths);
    if (
      methodPathIsArray &&
      !methodPaths.slice(1).every((mp) => typeof mp === "string")
    ) {
      throw new RouterError(
        "Invalid path type. Allowed [[Methods...], ...Paths]",
      );
    }
    const firstElementIsArray =
      methodPathIsArray && Array.isArray(methodPaths[0]);
    if (
      firstElementIsArray &&
      !(methodPaths[0] as HttpMethod[]).every((mp) => typeof mp === "string")
    ) {
      throw new RouterError(
        "Invalid method type. Allowed [[Methods...], ...Paths]",
      );
    }
    if (firstElementIsArray && methodPaths[0].length === 0) {
      throw new RouterError("Empty method. Allowed [[Methods...], ...Paths]");
    }
    if (
      methodPathIsArray &&
      !firstElementIsArray &&
      !methodPaths.every((mp) => typeof mp === "string")
    ) {
      throw new RouterError(
        "Invalid method-paths type. Allowed [...MethodPaths]",
      );
    }
    if (
      !methodPathIsArray &&
      !firstElementIsArray &&
      typeof methodPaths !== "string"
    ) {
      throw new RouterError("Invalid method-path type. Allowed MethodPath");
    }
    const methodPaths_ = methodPathIsArray
      ? Array.isArray(methodPaths[0])
        ? (methodPaths[0].flatMap((method) =>
            methodPaths
              .slice(1)
              .map((paths) => `${method} ${paths}` as MethodPath),
          ) as MethodPath[])
        : (methodPaths as MethodPath[])
      : methodPaths;
    return this.register(
      "fallback",
      methodPaths_,
      pipe as Handler<ExtendContext> | Pipe<ExtendContext>,
      options,
    );
  }

  /**
   * Define afters for the specified method paths.
   *
   * @param {MethodPath|Array<MethodPath>} methodPaths Method-path definitions in the form of: `Method /Path`, or [`Method /Path`, ...] or [[`Method`, ...], `/Path`, ...]
   * @param pipe One or more after handlers
   * @param {RegisterPipelineOptions} options Register pipeline options
   * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
   * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
   * @returns This router instance.
   */
  after<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    MP extends MethodPath = MethodPath,
    P extends Path = Path,
  >(
    methodPaths: MP | Array<MP> | [Array<HttpMethod>, ...Array<P>],
    pipe:
      | EndHandler<
          CTParams<ExtractMethodPathsParams<MP> | ExtractParams<P>> &
            ExtendContext &
            ExtendContextMore
        >
      | EndPipe<
          CTParams<ExtractMethodPathsParams<MP> | ExtractParams<P>> &
            ExtendContext &
            ExtendContextMore
        >,
    options?: RegisterPipelineOptions,
  ): Router<_ExtendContext, ExtendContext> {
    const methodPathIsArray = Array.isArray(methodPaths);
    if (
      methodPathIsArray &&
      !methodPaths.slice(1).every((mp) => typeof mp === "string")
    ) {
      throw new RouterError(
        "Invalid path type. Allowed [[Methods...], ...Paths]",
      );
    }
    const firstElementIsArray =
      methodPathIsArray && Array.isArray(methodPaths[0]);
    if (
      firstElementIsArray &&
      !(methodPaths[0] as HttpMethod[]).every((mp) => typeof mp === "string")
    ) {
      throw new RouterError(
        "Invalid method type. Allowed [[Methods...], ...Paths]",
      );
    }
    if (firstElementIsArray && methodPaths[0].length === 0) {
      throw new RouterError("Empty method. Allowed [[Methods...], ...Paths]");
    }
    if (
      methodPathIsArray &&
      !firstElementIsArray &&
      !methodPaths.every((mp) => typeof mp === "string")
    ) {
      throw new RouterError("Invalid method type. Allowed [...MethodPaths]");
    }
    if (
      !methodPathIsArray &&
      !firstElementIsArray &&
      typeof methodPaths !== "string"
    ) {
      throw new RouterError("Invalid method type. Allowed MethodPath");
    }
    const methodPaths_ = methodPathIsArray
      ? Array.isArray(methodPaths[0])
        ? (methodPaths[0].flatMap((method) =>
            methodPaths
              .slice(1)
              .map((paths) => `${method} ${paths}` as MethodPath),
          ) as MethodPath[])
        : (methodPaths as MethodPath[])
      : methodPaths;
    return this.register(
      "after",
      methodPaths_,
      pipe as EndHandler<ExtendContext> | EndPipe<ExtendContext>,
      options,
    );
  }

  /**
   * Define catchers for the specified method paths.
   *
   * @param {MethodPath|Array<MethodPath>} methodPaths Method-path definitions in the form of: `Method /Path`, or [`Method /Path`, ...] or [[`Method`, ...], `/Path`, ...]
   * @param pipe One or more error handlers
   * @param {RegisterPipelineOptions} options Register pipeline options
   * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
   * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
   * @returns This router instance.
   */
  catch<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    MP extends MethodPath = MethodPath,
    P extends Path = Path,
  >(
    methodPaths: MP | Array<MP> | [Array<HttpMethod>, ...Array<P>],
    pipe:
      | ErrorHandler<
          CTParams<ExtractMethodPathsParams<MP> | ExtractParams<P>> &
            ExtendContext &
            ExtendContextMore
        >
      | ErrorPipe<
          CTParams<ExtractMethodPathsParams<MP> | ExtractParams<P>> &
            ExtendContext &
            ExtendContextMore
        >,
    options?: RegisterPipelineOptions,
  ): Router<_ExtendContext, ExtendContext> {
    const methodPathIsArray = Array.isArray(methodPaths);
    if (
      methodPathIsArray &&
      !methodPaths.slice(1).every((mp) => typeof mp === "string")
    ) {
      throw new RouterError(
        "Invalid path type. Allowed [[Methods...], ...Paths]",
      );
    }
    const firstElementIsArray =
      methodPathIsArray && Array.isArray(methodPaths[0]);
    if (
      firstElementIsArray &&
      !(methodPaths[0] as HttpMethod[]).every((mp) => typeof mp === "string")
    ) {
      throw new RouterError(
        "Invalid method type. Allowed [[Methods...], ...Paths]",
      );
    }
    if (firstElementIsArray && methodPaths[0].length === 0) {
      throw new RouterError("Empty method. Allowed [[Methods...], ...Paths]");
    }
    if (
      methodPathIsArray &&
      !firstElementIsArray &&
      !methodPaths.every((mp) => typeof mp === "string")
    ) {
      throw new RouterError("Invalid method type. Allowed [...MethodPaths]");
    }
    if (
      !methodPathIsArray &&
      !firstElementIsArray &&
      typeof methodPaths !== "string"
    ) {
      throw new RouterError("Invalid method type. Allowed MethodPath");
    }
    const methodPaths_ = methodPathIsArray
      ? Array.isArray(methodPaths[0])
        ? (methodPaths[0].flatMap((method) =>
            methodPaths
              .slice(1)
              .map((paths) => `${method} ${paths}` as MethodPath),
          ) as MethodPath[])
        : (methodPaths as MethodPath[])
      : methodPaths;
    return this.register(
      "catcher",
      methodPaths_,
      pipe as ErrorHandler<ExtendContext> | ErrorPipe<ExtendContext>,
      options,
    );
  }

  /**
   * Register route handlers for the specified handler type and method paths.
   *
   * @param {HandlerType} handlerType Handler type. `"handler"`, `"filter"`, `"fallback"`, `"after"`, `"catcher"`
   * @param {MethodPath|Array<MethodPath>} methodPaths Method-path definitions in the form of: `Method /Path`, or [`Method /Path`, ...] or [[`Method`, ...], `/Path`, ...]
   * @param pipe One or more request handlers
   * @param {RegisterPipelineOptions} options Register pipeline options
   * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
   * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
   * @returns This router instance.
   */
  register<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    MP extends MethodPath = MethodPath,
    P extends Path = Path,
  >(
    handlerType: HandlerType,
    methodPaths: MP | Array<MP>,
    pipe:
      | Handler<
          CTParams<ExtractMethodPathsParams<MP> | ExtractParams<P>> &
            ExtendContext &
            ExtendContextMore
        >
      | Pipe<
          CTParams<ExtractMethodPathsParams<MP> | ExtractParams<P>> &
            ExtendContext &
            ExtendContextMore
        >
      | ErrorHandler<
          CTParams<ExtractMethodPathsParams<MP> | ExtractParams<P>> &
            ExtendContext &
            ExtendContextMore
        >
      | ErrorPipe<
          CTParams<ExtractMethodPathsParams<MP> | ExtractParams<P>> &
            ExtendContext &
            ExtendContextMore
        >
      | EndHandler<
          CTParams<ExtractMethodPathsParams<MP> | ExtractParams<P>> &
            ExtendContext &
            ExtendContextMore
        >
      | EndPipe<
          CTParams<ExtractMethodPathsParams<MP> | ExtractParams<P>> &
            ExtendContext &
            ExtendContextMore
        >,
    options?: RegisterPipelineOptions | RegisterPipelineOptions,
  ): Router<_ExtendContext, ExtendContext> {
    const overwrite = options?.overwrite === true;
    const methodPaths_ = Array.isArray(methodPaths)
      ? methodPaths
      : [methodPaths];
    const pipe_ = Array.isArray(pipe) ? pipe : [pipe];
    for (const methodPath of methodPaths_) {
      const separator1Idx = methodPath.indexOf(" ");
      const method = methodPath.substring(0, separator1Idx) as HttpMethod;
      const originalPath = methodPath.substring(separator1Idx + 1);
      {
        // check for optional glob in the middle
        const splitPaths = originalPath.split("/").map((part) => part.trim());
        for (let i = 1; i < splitPaths.length; i++) {
          if (splitPaths[i].endsWith("!") && i < splitPaths.length - 1) {
            throw new RouterError(
              `Glob routes with Optional Globs in the middle are not allowed. for (${method} ${originalPath})`,
            );
          }
        }
      }
      const processedPaths = this.#processPath(originalPath);
      const { params, paths } = processedPaths;
      const paramsCache = params ? new Map(params) : undefined;
      for (const path of paths) {
        const parts = path.split("/", this.#config.maxPath + 1);
        const containsParams = params || parts.some((p) => p === "*");
        const standardPath = containsParams
          ? parts
              .map((p, idx) =>
                p === "*"
                  ? paramsCache?.has(idx)
                    ? `:${paramsCache.get(idx)!}`
                    : "*"
                  : p,
              )
              .join("/")
          : path;
        let globIdx = 0;
        const openApiPath = containsParams
          ? path
              .split("/")
              .map((p, idx) =>
                p === "*"
                  ? `{${paramsCache?.get(idx) || `glob${++globIdx}`}}`
                  : p,
              )
              .join("/")
          : path;
        const upperMethod = method.toUpperCase() as HttpMethodUpper;
        if (!HTTP_METHODS_UPPER.has(upperMethod)) {
          throw new RouterError(`Unsupported HTTP Method ${method}`);
        }
        const routes = this.#routes[handlerType][upperMethod];
        if (!REGISTER_PATH_REGEX.test(path)) {
          throw new RouterError(
            `Invalid path for (${method} ${originalPath} -> ${path})`,
          );
        }
        if (parts.length - 1 > this.#config.maxPath) {
          throw new RouterError(
            `Path parts length limit exceeded ${this.#config.maxPath}`,
          );
        }
        const parts_len_1 = parts.length - 1;
        const hasGlob = parts.some((p) => p === "*");
        const superGlobIndex = path.endsWith("/**") ? path.length - 3 : -1;
        const hasSuperGlob = superGlobIndex >= 0;
        const entry = {
          parseParams: parseParams.bind(
            null,
            hasSuperGlob ? superGlobIndex + 1 : undefined,
            params,
          ),
          params,
          pipe: pipe_,
          originalPath,
          standardPath,
          openApiPath,
          path,
          pathParts: parts,
          openApi: (options as RegisterPipelineOptions)?.openApi,
          hasAnyGlob: hasSuperGlob || hasGlob,
          hasGlob,
          hasSuperGlob,
        } as HandlerRouteEntry<ExtendContext>;
        // check for super globs
        if (hasSuperGlob) {
          if (hasGlob) {
            throw new RouterError(
              `SuperGlob route with Globs are not allowed. for (${method} ${originalPath} -> ${path})`,
            );
          }
          let superGlobEntries = routes.superGlobs[parts_len_1];
          const basePath = path.substring(0, superGlobIndex + 1);
          if (
            !overwrite &&
            superGlobEntries &&
            superGlobEntries.has(basePath)
          ) {
            const superGlobEntry = superGlobEntries.get(basePath)!;
            throw new RouterError(
              `SuperGlob route collision for (${method} ${originalPath} -> ${path} with ${superGlobEntry.originalPath} at ${superGlobEntry.pathParts.join("/")})`,
            );
          }
          if (superGlobEntries == null) {
            superGlobEntries = new Map();
            routes.superGlobs[parts_len_1] = superGlobEntries;
            if (routes.superGlobsIndices.indexOf(parts_len_1) === -1) {
              routes.superGlobsIndices.push(parts_len_1);
            }
          }
          superGlobEntries.set(basePath, entry);
        } else if (hasGlob) {
          // check for globs
          let globEntries = routes.globs[parts.length];
          if (globEntries) {
            if (!overwrite && globEntries && globEntries.has(path)) {
              const globEntry = globEntries.get(path)!;
              throw new RouterError(
                `Glob route collision for (${method} ${originalPath} -> ${path} with ${globEntry.originalPath} at ${globEntry.pathParts.join("/")})`,
              );
            }
            // check for collision
            for (const globEntry of globEntries.values()) {
              let collision = -1;
              for (let i = 1; i < parts.length; i++) {
                if (parts[i] === "*" && globEntry.pathParts[i] === "*") {
                  collision = i;
                } else if (parts[i] !== globEntry.pathParts[i]) {
                  collision = -1;
                  break;
                }
              }
              if (collision >= 0 && !overwrite) {
                throw new RouterError(
                  `Route collision for (${method} ${originalPath} -> ${path} with ${globEntry.originalPath} at ${parts.slice(0, collision + 1).join("/")})`,
                );
              }
            }
          }
          if (globEntries == null) {
            globEntries = new Map();
            routes.globs[parts.length] = globEntries;
            if (routes.globsIndices.indexOf(parts.length) === -1) {
              routes.globsIndices.push(parts.length);
            }
          }
          globEntries.set(path, entry);
        } else {
          let entries = routes.entries[parts.length];
          if (!overwrite && entries && entries.has(path)) {
            throw new RouterError(
              `Route already set for (${method} ${originalPath} -> ${path})`,
            );
          }
          if (entries == null) {
            entries = new Map();
            routes.entries[parts.length] = entries;
            if (routes.entriesIndices.indexOf(parts.length) === -1) {
              routes.entriesIndices.push(parts.length);
            }
          }
          entries.set(path, entry);
        }
      }
    }
    // register setters for later use like append.
    if (!this.#config.doNotStoreSetters) {
      this.#setters.push(
        Object.freeze({
          handlerType,
          methodPaths: Array.isArray(methodPaths)
            ? Object.freeze(methodPaths)
            : methodPaths,
          pipe: Array.isArray(pipe) ? Object.freeze(pipe) : pipe,
          options:
            typeof options === "object" ? Object.freeze(options) : options,
        } as {
          handlerType: HandlerType;
          methodPaths: MethodPath | Array<MethodPath>;
          pipe:
            | Handler<ExtendContext>
            | ErrorHandler<ExtendContext>
            | EndHandler<ExtendContext>
            | Pipe<ExtendContext>
            | ErrorPipe<ExtendContext>
            | EndPipe<ExtendContext>;
          options?: RegisterPipelineOptions | RegisterPipelineOptions;
        }),
      );
    }
    return this;
  }

  /**
   *
   * @param pathname Valid url pathname
   * @param parts Destination parts array to push path parts to.
   * @param maxPath The max path part count limit.
   * @returns count of path parts if valid.
   * @returns -count if path parts are greater than maxPath.
   */
  splitPath(pathname: string, parts: string[], maxPath: number): number {
    const path_len_1 = pathname.length - 1;
    let count = 0;
    let lastI = 0;
    // parse pathname parts and check path length
    for (let i = 0; i < pathname.length; i++) {
      const cc = pathname.charCodeAt(i);
      if (cc === 47) {
        parts.push(pathname.substring(lastI, i));
        if (i === path_len_1) {
          parts.push("");
        }
        lastI = i + 1;
        count++;
        if (count > maxPath) {
          return -count;
        }
      }
      // null char
      else if (cc === 0) {
        return -1;
      }
    }
    if (lastI < pathname.length) {
      parts.push(pathname.substring(lastI));
    }
    return count;
  }

  /**
   * Generates a routes object keyed by pathname then by method then by handler-type.
   *
   * @returns Routes object
   */
  getRoutesByPathnameThenMethod(): Record<
    Path,
    Partial<
      Record<
        HttpMethodUpper,
        Partial<
          Record<HandlerType, Handler<ExtendContext> | Pipe<ExtendContext>>
        >
      >
    >
  > {
    const routes: Record<
      Path,
      Partial<
        Record<
          HttpMethodUpper,
          Partial<
            Record<HandlerType, Handler<ExtendContext> | Pipe<ExtendContext>>
          >
        >
      >
    > = {};
    for (const handlerType of Object.keys(this.#routes)) {
      const entry0 = this.#routes[handlerType as HandlerType];
      for (const methodUpper of Object.keys(entry0)) {
        const entry1 = entry0[methodUpper as HttpMethodUpper];
        // super-globs
        for (const superGlobEntryIdx of entry1.superGlobsIndices) {
          const superGlobEntries = entry1.superGlobs[superGlobEntryIdx];
          for (const [, entry] of superGlobEntries) {
            if (!entry.pipe) {
              continue;
            }
            if (!routes[entry.standardPath as Path]) {
              routes[entry.standardPath as Path] = {};
            }
            if (
              !routes[entry.standardPath as Path][
                methodUpper as HttpMethodUpper
              ]
            ) {
              routes[entry.standardPath as Path][
                methodUpper as HttpMethodUpper
              ] = {};
            }
            routes[entry.standardPath as Path][methodUpper as HttpMethodUpper]![
              handlerType as HandlerType
            ] = Array.isArray(entry.pipe) ? [...entry.pipe] : entry.pipe;
          }
        }
        // globs
        for (const globEntryIdx of entry1.globsIndices) {
          const globEntries = entry1.globs[globEntryIdx];
          for (const [, entry] of globEntries) {
            if (!entry.pipe) {
              continue;
            }
            if (!routes[entry.standardPath as Path]) {
              routes[entry.standardPath as Path] = {};
            }
            if (
              !routes[entry.standardPath as Path][
                methodUpper as HttpMethodUpper
              ]
            ) {
              routes[entry.standardPath as Path][
                methodUpper as HttpMethodUpper
              ] = {};
            }
            routes[entry.standardPath as Path][methodUpper as HttpMethodUpper]![
              handlerType as HandlerType
            ] = Array.isArray(entry.pipe) ? [...entry.pipe] : entry.pipe;
          }
        }
        // normal paths
        for (const entryIdx of entry1.entriesIndices) {
          const entries = entry1.entries[entryIdx];
          for (const [, entry] of entries) {
            if (!entry.pipe) {
              continue;
            }
            if (!routes[entry.standardPath as Path]) {
              routes[entry.standardPath as Path] = {};
            }
            if (
              !routes[entry.standardPath as Path][
                methodUpper as HttpMethodUpper
              ]
            ) {
              routes[entry.standardPath as Path][
                methodUpper as HttpMethodUpper
              ] = {};
            }
            routes[entry.standardPath as Path][methodUpper as HttpMethodUpper]![
              handlerType as HandlerType
            ] = Array.isArray(entry.pipe) ? [...entry.pipe] : entry.pipe;
          }
        }
      }
    }
    return routes;
  }

  /**
   * Generates a routes object keyed by pathname then by handler-type then by method.
   *
   * @returns Routes object
   */
  getRoutesByPathnameThenHandlerType(): Record<
    Path,
    Partial<
      Record<
        HandlerType,
        Partial<
          Record<HttpMethodUpper, Handler<ExtendContext> | Pipe<ExtendContext>>
        >
      >
    >
  > {
    const routes: Record<
      Path,
      Partial<
        Record<
          HandlerType,
          Partial<
            Record<
              HttpMethodUpper,
              Handler<ExtendContext> | Pipe<ExtendContext>
            >
          >
        >
      >
    > = {};
    for (const handlerType of Object.keys(this.#routes)) {
      const entry0 = this.#routes[handlerType as HandlerType];
      for (const methodUpper of Object.keys(entry0)) {
        const entry1 = entry0[methodUpper as HttpMethodUpper];
        // super-globs
        for (const superGlobEntryIdx of entry1.superGlobsIndices) {
          const superGlobEntries = entry1.superGlobs[superGlobEntryIdx];
          for (const [, entry] of superGlobEntries) {
            if (!entry.pipe) {
              continue;
            }
            if (!routes[entry.standardPath as Path]) {
              routes[entry.standardPath as Path] = {};
            }
            if (
              !routes[entry.standardPath as Path][handlerType as HandlerType]
            ) {
              routes[entry.standardPath as Path][handlerType as HandlerType] =
                {};
            }
            routes[entry.standardPath as Path][handlerType as HandlerType]![
              methodUpper as HttpMethodUpper
            ] = Array.isArray(entry.pipe) ? [...entry.pipe] : entry.pipe;
          }
        }
        // globs
        for (const globEntryIdx of entry1.globsIndices) {
          const globEntries = entry1.globs[globEntryIdx];
          for (const [, entry] of globEntries) {
            if (!entry.pipe) {
              continue;
            }
            if (!routes[entry.standardPath as Path]) {
              routes[entry.standardPath as Path] = {};
            }
            if (
              !routes[entry.standardPath as Path][handlerType as HandlerType]
            ) {
              routes[entry.standardPath as Path][handlerType as HandlerType] =
                {};
            }
            routes[entry.standardPath as Path][handlerType as HandlerType]![
              methodUpper as HttpMethodUpper
            ] = Array.isArray(entry.pipe) ? [...entry.pipe] : entry.pipe;
          }
        }
        // normal paths
        for (const entryIdx of entry1.entriesIndices) {
          const entries = entry1.entries[entryIdx];
          for (const [, entry] of entries) {
            if (!entry.pipe) {
              continue;
            }
            if (!routes[entry.standardPath as Path]) {
              routes[entry.standardPath as Path] = {};
            }
            if (
              !routes[entry.standardPath as Path][handlerType as HandlerType]
            ) {
              routes[entry.standardPath as Path][handlerType as HandlerType] =
                {};
            }
            routes[entry.standardPath as Path][handlerType as HandlerType]![
              methodUpper as HttpMethodUpper
            ] = Array.isArray(entry.pipe) ? [...entry.pipe] : entry.pipe;
          }
        }
      }
    }
    return routes;
  }

  /**
   * Generates a routes object keyed by method then by pathname then by handler-type.
   *
   * @returns Routes object
   */
  getRoutesByMethodThenPathname(): Partial<
    Record<
      HttpMethodUpper,
      Record<
        Path,
        Partial<
          Record<HandlerType, Handler<ExtendContext> | Pipe<ExtendContext>>
        >
      >
    >
  > {
    const routes: Partial<
      Record<
        HttpMethodUpper,
        Record<
          Path,
          Partial<
            Record<HandlerType, Handler<ExtendContext> | Pipe<ExtendContext>>
          >
        >
      >
    > = {};
    for (const handlerType of Object.keys(this.#routes)) {
      const entry0 = this.#routes[handlerType as HandlerType];
      for (const methodUpper of Object.keys(entry0)) {
        const entry1 = entry0[methodUpper as HttpMethodUpper];
        // super-globs
        for (const superGlobEntryIdx of entry1.superGlobsIndices) {
          const superGlobEntries = entry1.superGlobs[superGlobEntryIdx];
          for (const [, entry] of superGlobEntries) {
            if (!entry.pipe) {
              continue;
            }
            if (!routes[methodUpper as HttpMethodUpper]) {
              routes[methodUpper as HttpMethodUpper] = {};
            }
            if (
              !routes[methodUpper as HttpMethodUpper]![
                entry.standardPath as Path
              ]
            ) {
              routes[methodUpper as HttpMethodUpper]![
                entry.standardPath as Path
              ] = {};
            }
            routes[methodUpper as HttpMethodUpper]![
              entry.standardPath as Path
            ]![handlerType as HandlerType] = Array.isArray(entry.pipe)
              ? [...entry.pipe]
              : entry.pipe;
          }
        }
        // globs
        for (const globEntryIdx of entry1.globsIndices) {
          const globEntries = entry1.globs[globEntryIdx];
          for (const [, entry] of globEntries) {
            if (!entry.pipe) {
              continue;
            }
            if (!routes[methodUpper as HttpMethodUpper]) {
              routes[methodUpper as HttpMethodUpper] = {};
            }
            if (
              !routes[methodUpper as HttpMethodUpper]![
                entry.standardPath as Path
              ]
            ) {
              routes[methodUpper as HttpMethodUpper]![
                entry.standardPath as Path
              ] = {};
            }
            routes[methodUpper as HttpMethodUpper]![
              entry.standardPath as Path
            ]![handlerType as HandlerType] = Array.isArray(entry.pipe)
              ? [...entry.pipe]
              : entry.pipe;
          }
        }
        // normal paths
        for (const entryIdx of entry1.entriesIndices) {
          const entries = entry1.entries[entryIdx];
          for (const [, entry] of entries) {
            if (!entry.pipe) {
              continue;
            }
            if (!routes[methodUpper as HttpMethodUpper]) {
              routes[methodUpper as HttpMethodUpper] = {};
            }
            if (
              !routes[methodUpper as HttpMethodUpper]![
                entry.standardPath as Path
              ]
            ) {
              routes[methodUpper as HttpMethodUpper]![
                entry.standardPath as Path
              ] = {};
            }
            routes[methodUpper as HttpMethodUpper]![
              entry.standardPath as Path
            ]![handlerType as HandlerType] = Array.isArray(entry.pipe)
              ? [...entry.pipe]
              : entry.pipe;
          }
        }
      }
    }
    return routes;
  }

  /**
   * Generates a routes object keyed by method then by handler-type then by pathname.
   *
   * @returns Routes object
   */
  getRoutesByMethodThenHandlerType(): Partial<
    Record<
      HttpMethodUpper,
      Partial<
        Record<
          HandlerType,
          Record<Path, Handler<ExtendContext> | Pipe<ExtendContext>>
        >
      >
    >
  > {
    const routes: Partial<
      Record<
        HttpMethodUpper,
        Partial<
          Record<
            HandlerType,
            Record<Path, Handler<ExtendContext> | Pipe<ExtendContext>>
          >
        >
      >
    > = {};
    for (const handlerType of Object.keys(this.#routes)) {
      const entry0 = this.#routes[handlerType as HandlerType];
      for (const methodUpper of Object.keys(entry0)) {
        const entry1 = entry0[methodUpper as HttpMethodUpper];
        // super-globs
        for (const superGlobEntryIdx of entry1.superGlobsIndices) {
          const superGlobEntries = entry1.superGlobs[superGlobEntryIdx];
          for (const [, entry] of superGlobEntries) {
            if (!entry.pipe) {
              continue;
            }
            if (!routes[methodUpper as HttpMethodUpper]) {
              routes[methodUpper as HttpMethodUpper] = {};
            }
            if (
              !routes[methodUpper as HttpMethodUpper]![
                handlerType as HandlerType
              ]
            ) {
              routes[methodUpper as HttpMethodUpper]![
                handlerType as HandlerType
              ] = {};
            }
            routes[methodUpper as HttpMethodUpper]![
              handlerType as HandlerType
            ]![entry.standardPath as Path] = Array.isArray(entry.pipe)
              ? [...entry.pipe]
              : entry.pipe;
          }
        }
        // globs
        for (const globEntryIdx of entry1.globsIndices) {
          const globEntries = entry1.globs[globEntryIdx];
          for (const [, entry] of globEntries) {
            if (!entry.pipe) {
              continue;
            }
            if (!routes[methodUpper as HttpMethodUpper]) {
              routes[methodUpper as HttpMethodUpper] = {};
            }
            if (
              !routes[methodUpper as HttpMethodUpper]![
                handlerType as HandlerType
              ]
            ) {
              routes[methodUpper as HttpMethodUpper]![
                handlerType as HandlerType
              ] = {};
            }
            routes[methodUpper as HttpMethodUpper]![
              handlerType as HandlerType
            ]![entry.standardPath as Path] = Array.isArray(entry.pipe)
              ? [...entry.pipe]
              : entry.pipe;
          }
        }
        // normal paths
        for (const entryIdx of entry1.entriesIndices) {
          const entries = entry1.entries[entryIdx];
          for (const [, entry] of entries) {
            if (!entry.pipe) {
              continue;
            }
            if (!routes[methodUpper as HttpMethodUpper]) {
              routes[methodUpper as HttpMethodUpper] = {};
            }
            if (
              !routes[methodUpper as HttpMethodUpper]![
                handlerType as HandlerType
              ]
            ) {
              routes[methodUpper as HttpMethodUpper]![
                handlerType as HandlerType
              ] = {};
            }
            routes[methodUpper as HttpMethodUpper]![
              handlerType as HandlerType
            ]![entry.standardPath as Path] = Array.isArray(entry.pipe)
              ? [...entry.pipe]
              : entry.pipe;
          }
        }
      }
    }
    return routes;
  }

  /**
   * Generates a routes object keyed by handler-type then by method then by pathname.
   *
   * @returns Routes object
   */
  getRoutesByHandlerTypeThenMethod(): Partial<
    Record<
      HandlerType,
      Partial<
        Record<
          HttpMethodUpper,
          Record<Path, Handler<ExtendContext> | Pipe<ExtendContext>>
        >
      >
    >
  > {
    const routes: Partial<
      Record<
        HandlerType,
        Partial<
          Record<
            HttpMethodUpper,
            Record<Path, Handler<ExtendContext> | Pipe<ExtendContext>>
          >
        >
      >
    > = {};
    for (const handlerType of Object.keys(this.#routes)) {
      const entry0 = this.#routes[handlerType as HandlerType];
      for (const methodUpper of Object.keys(entry0)) {
        const entry1 = entry0[methodUpper as HttpMethodUpper];
        // super-globs
        for (const superGlobEntryIdx of entry1.superGlobsIndices) {
          const superGlobEntries = entry1.superGlobs[superGlobEntryIdx];
          for (const [, entry] of superGlobEntries) {
            if (!entry.pipe) {
              continue;
            }
            if (!routes[handlerType as HandlerType]) {
              routes[handlerType as HandlerType] = {};
            }
            if (
              !routes[handlerType as HandlerType]![
                methodUpper as HttpMethodUpper
              ]
            ) {
              routes[handlerType as HandlerType]![
                methodUpper as HttpMethodUpper
              ] = {};
            }
            routes[handlerType as HandlerType]![
              methodUpper as HttpMethodUpper
            ]![entry.standardPath as Path] = Array.isArray(entry.pipe)
              ? [...entry.pipe]
              : entry.pipe;
          }
        }
        // globs
        for (const globEntryIdx of entry1.globsIndices) {
          const globEntries = entry1.globs[globEntryIdx];
          for (const [, entry] of globEntries) {
            if (!entry.pipe) {
              continue;
            }
            if (!routes[handlerType as HandlerType]) {
              routes[handlerType as HandlerType] = {};
            }
            if (
              !routes[handlerType as HandlerType]![
                methodUpper as HttpMethodUpper
              ]
            ) {
              routes[handlerType as HandlerType]![
                methodUpper as HttpMethodUpper
              ] = {};
            }
            routes[handlerType as HandlerType]![
              methodUpper as HttpMethodUpper
            ]![entry.standardPath as Path] = Array.isArray(entry.pipe)
              ? [...entry.pipe]
              : entry.pipe;
          }
        }
        // normal paths
        for (const entryIdx of entry1.entriesIndices) {
          const entries = entry1.entries[entryIdx];
          for (const [, entry] of entries) {
            if (!entry.pipe) {
              continue;
            }
            if (!routes[handlerType as HandlerType]) {
              routes[handlerType as HandlerType] = {};
            }
            if (
              !routes[handlerType as HandlerType]![
                methodUpper as HttpMethodUpper
              ]
            ) {
              routes[handlerType as HandlerType]![
                methodUpper as HttpMethodUpper
              ] = {};
            }
            routes[handlerType as HandlerType]![
              methodUpper as HttpMethodUpper
            ]![entry.standardPath as Path] = Array.isArray(entry.pipe)
              ? [...entry.pipe]
              : entry.pipe;
          }
        }
      }
    }
    return routes;
  }

  /**
   * Generates a routes object keyed by handler-type then by pathname then by method.
   *
   * @returns Routes object
   */
  getRoutesByHandlerTypeThenPathname(): Partial<
    Record<
      HandlerType,
      Record<
        Path,
        Partial<
          Record<HttpMethodUpper, Handler<ExtendContext> | Pipe<ExtendContext>>
        >
      >
    >
  > {
    const routes: Partial<
      Record<
        HandlerType,
        Record<
          Path,
          Partial<
            Record<
              HttpMethodUpper,
              Handler<ExtendContext> | Pipe<ExtendContext>
            >
          >
        >
      >
    > = {};
    for (const handlerType of Object.keys(this.#routes)) {
      const entry0 = this.#routes[handlerType as HandlerType];
      for (const methodUpper of Object.keys(entry0)) {
        const entry1 = entry0[methodUpper as HttpMethodUpper];
        // super-globs
        for (const superGlobEntryIdx of entry1.superGlobsIndices) {
          const superGlobEntries = entry1.superGlobs[superGlobEntryIdx];
          for (const [, entry] of superGlobEntries) {
            if (!entry.pipe) {
              continue;
            }
            if (!routes[handlerType as HandlerType]) {
              routes[handlerType as HandlerType] = {};
            }
            if (
              !routes[handlerType as HandlerType]![entry.standardPath as Path]
            ) {
              routes[handlerType as HandlerType]![entry.standardPath as Path] =
                {};
            }
            routes[handlerType as HandlerType]![entry.standardPath as Path]![
              methodUpper as HttpMethodUpper
            ] = Array.isArray(entry.pipe) ? [...entry.pipe] : entry.pipe;
          }
        }
        // globs
        for (const globEntryIdx of entry1.globsIndices) {
          const globEntries = entry1.globs[globEntryIdx];
          for (const [, entry] of globEntries) {
            if (!entry.pipe) {
              continue;
            }
            if (!routes[handlerType as HandlerType]) {
              routes[handlerType as HandlerType] = {};
            }
            if (
              !routes[handlerType as HandlerType]![entry.standardPath as Path]
            ) {
              routes[handlerType as HandlerType]![entry.standardPath as Path] =
                {};
            }
            routes[handlerType as HandlerType]![entry.standardPath as Path]![
              methodUpper as HttpMethodUpper
            ] = Array.isArray(entry.pipe) ? [...entry.pipe] : entry.pipe;
          }
        }
        // normal paths
        for (const entryIdx of entry1.entriesIndices) {
          const entries = entry1.entries[entryIdx];
          for (const [, entry] of entries) {
            if (!entry.pipe) {
              continue;
            }
            if (!routes[handlerType as HandlerType]) {
              routes[handlerType as HandlerType] = {};
            }
            if (
              !routes[handlerType as HandlerType]![entry.standardPath as Path]
            ) {
              routes[handlerType as HandlerType]![entry.standardPath as Path] =
                {};
            }
            routes[handlerType as HandlerType]![entry.standardPath as Path]![
              methodUpper as HttpMethodUpper
            ] = Array.isArray(entry.pipe) ? [...entry.pipe] : entry.pipe;
          }
        }
      }
    }
    return routes;
  }

  #processPath(path: string): {
    paths: string[];
    params?: Array<[number, string]>;
  } {
    const processedPaths: {
      paths: string[];
      params?: Array<[number, string]>;
    } = {
      paths: [""],
    };
    const parts = path.split("/", this.#config.maxPath + 1);
    const parts_len_1 = parts.length - 1;
    for (let i = 1; i < parts.length; i++) {
      const part = parts[i] as string;
      const partIncludesPipe = part.includes("|");
      const partIncludesColon = part.includes(":");
      if (partIncludesPipe && !partIncludesColon) {
        const subParts = part.split("|") as string[];
        const prevProcessedPath = [...processedPaths.paths];
        for (let k = 0; k < processedPaths.paths.length; k++) {
          processedPaths.paths[k] += "/" + subParts[0];
        }
        for (let j = 1; j < subParts.length; j++) {
          for (let k = 0; k < prevProcessedPath.length; k++) {
            processedPaths.paths.push(prevProcessedPath[k] + "/" + subParts[j]);
          }
        }
      } else if (partIncludesColon && part.startsWith("::")) {
        // /::named-super-glob
        const endTokenIdx = part.lastIndexOf("!");
        const paramId =
          endTokenIdx > 0 ? part.substring(2, endTokenIdx) : part.substring(2);
        if (processedPaths.params == null) {
          processedPaths.params = [];
        }
        processedPaths.params.push([i, paramId]);
        if (endTokenIdx > 0) {
          const prevProcessedPath = [...processedPaths.paths];
          for (let k = 0; k < prevProcessedPath.length; k++) {
            processedPaths.paths.push(prevProcessedPath[k] + "/**");
          }
        } else {
          for (let j = 0; j < processedPaths.paths.length; j++) {
            processedPaths.paths[j] += "/**";
          }
        }
        break;
      } else if (partIncludesColon) {
        // /:param | /:param! | /a|b|c:certain-param
        if (processedPaths.params == null) {
          processedPaths.params = [];
        }
        const colonIdx = partIncludesPipe
          ? part.lastIndexOf(":")
          : part.indexOf(":");
        const subPartsStr = part.substring(0, colonIdx);
        const endTokenIdx = part.lastIndexOf("!");
        const paramId =
          endTokenIdx > 0
            ? part.substring(colonIdx + 1, endTokenIdx)
            : part.substring(colonIdx + 1);
        processedPaths.params.push([i, paramId]);
        if (colonIdx > 0) {
          const subParts = subPartsStr.split("|");
          const prevProcessedPath = [...processedPaths.paths];
          if (endTokenIdx < 0) {
            for (let k = 0; k < processedPaths.paths.length; k++) {
              processedPaths.paths[k] += "/" + subParts[0];
            }
            for (let j = 1; j < subParts.length; j++) {
              for (let k = 0; k < prevProcessedPath.length; k++) {
                processedPaths.paths.push(
                  prevProcessedPath[k] + "/" + subParts[j],
                );
              }
            }
          } else {
            for (let j = 0; j < subParts.length; j++) {
              for (let k = 0; k < prevProcessedPath.length; k++) {
                processedPaths.paths.push(
                  prevProcessedPath[k] + "/" + subParts[j],
                );
              }
            }
          }
        } else if (endTokenIdx > 0) {
          const prevProcessedPath = [...processedPaths.paths];
          for (let k = 0; k < prevProcessedPath.length; k++) {
            processedPaths.paths.push(prevProcessedPath[k] + "/*");
          }
        } else {
          for (let j = 0; j < processedPaths.paths.length; j++) {
            processedPaths.paths[j] += "/*";
          }
        }
      } else if (part === "*!" || (i >= parts_len_1 && part === "**!")) {
        const endTokenIdx = part.lastIndexOf("!");
        const globPath =
          "/" +
          (endTokenIdx > 0
            ? part.substring(0, endTokenIdx)
            : part.substring(0));
        const prevProcessedPath = [...processedPaths.paths];
        for (let k = 0; k < prevProcessedPath.length; k++) {
          processedPaths.paths.push(prevProcessedPath[k] + globPath);
        }
      } else {
        for (let j = 0; j < processedPaths.paths.length; j++) {
          processedPaths.paths[j] += "/" + part;
        }
      }
    }
    return processedPaths;
  }

  #getRouteEntries(
    pathname: string,
    parts: string[],
    routes?: RouteEntries<ExtendContext>,
    noBubble?: boolean,
  ): RouteEntry<ExtendContext>[] {
    if (routes == null) return [];
    const routeEntries: RouteEntry<ExtendContext>[] = [];
    const parts_len_1 = parts.length - 1;
    // match exact
    {
      const routeEntry = routes.entries[parts.length]?.get(pathname);
      if (routeEntry != null) {
        routeEntries.push(routeEntry);
        if (noBubble) {
          return routeEntries;
        }
      }
    }
    {
      // match globs *
      const globRoutes = routes.globs[parts.length];
      if (globRoutes != null) {
        let bestRoute = undefined;
        for (const entry of globRoutes.values()) {
          const entryPathParts = entry.pathParts;
          let matching = true;
          for (let i = 1; i < parts.length; i++) {
            const part = parts[i];
            const globPart = entryPathParts[i];
            const isGlob = globPart === "*";
            if (!isGlob && part !== globPart) {
              matching = false;
              break;
            }
            // check precedence by specificity with `bestRoute`
            if (bestRoute != null) {
              const bestRoutePathPart = bestRoute.pathParts[i];
              if (isGlob && bestRoutePathPart !== globPart) {
                matching = false;
                break;
              }
            }
          }
          if (matching) {
            bestRoute = entry;
          }
        }
        if (bestRoute != null) {
          routeEntries.push(bestRoute);
          if (noBubble) {
            return routeEntries;
          }
        }
      }
    }
    {
      // match super globs **
      let globPath =
        pathname.length > 1
          ? pathname.substring(
              0,
              pathname.lastIndexOf("/", pathname.length - 1) + 1,
            )
          : pathname;
      for (
        let i = parts_len_1;
        i > 0;
        i--,
          globPath = globPath.substring(
            0,
            globPath.lastIndexOf("/", globPath.length - 2) + 1,
          )
      ) {
        const superGlobRoutes = routes.superGlobs[i];
        if (superGlobRoutes != null) {
          const entry = superGlobRoutes.get(globPath);
          if (entry != null) {
            routeEntries.push(entry);
            if (noBubble) {
              break;
            }
          }
        }
      }
    }
    return routeEntries;
  }

  #InitEntries(method: HttpMethodUpper): RouteEntries<ExtendContext> {
    return {
      method,
      entries: new Array(this.#config.maxPath + 1),
      globs: new Array(this.#config.maxPath + 1),
      superGlobs: new Array(this.#config.maxPath + 1),
      entriesIndices: [],
      globsIndices: [],
      superGlobsIndices: [],
    };
  }

  #initRoutes(): Record<
    HandlerType,
    Record<HttpMethodUpper, RouteEntries<ExtendContext>>
  > {
    const routes = {} as Record<
      HandlerType,
      Record<HttpMethodUpper, RouteEntries<ExtendContext>>
    >;
    for (const handlerType of HANDLER_TYPES.keys()) {
      routes[handlerType] = {
        HEAD: this.#InitEntries("HEAD"),
        GET: this.#InitEntries("GET"),
        QUERY: this.#InitEntries("QUERY"),
        POST: this.#InitEntries("POST"),
        PUT: this.#InitEntries("PUT"),
        PATCH: this.#InitEntries("PATCH"),
        DELETE: this.#InitEntries("DELETE"),
        OPTIONS: this.#InitEntries("OPTIONS"),
        TRACE: this.#InitEntries("TRACE"),
        CONNECT: this.#InitEntries("CONNECT"),
      };
    }
    return routes;
  }
}

const parseParams = (
  superGlobIndex: number | undefined,
  params: [number, string][] | undefined,
  pathname: string,
  parts: string[],
  paramsRef: Record<string, unknown>,
): Record<string, unknown> => {
  const definedParam = params !== undefined;
  if (!definedParam && superGlobIndex == null) {
    return EMPTY_PARAMS;
  }
  const paramsRec = {} as Record<string, unknown | undefined>;
  if (definedParam && superGlobIndex != null) {
    const paramId = params[0][1];
    const idx = params[0][0];
    const key = paramId + "##" + idx;
    if (key in paramsRef) {
      paramsRec[paramId] = paramsRef[key];
    } else {
      const param = pathname.substring(superGlobIndex);
      paramsRec[paramId] = param;
      paramsRef[key] = param;
    }
  } else if (definedParam) {
    for (const [idx, paramId] of params) {
      const key = paramId + "#" + idx;
      if (key in paramsRef) {
        paramsRec[paramId] = paramsRef[key];
      } else {
        const param = parts[idx];
        paramsRec[paramId] = param;
        paramsRef[key] = param;
      }
    }
  }
  return paramsRec;
};

/**
 * Translate route definition file pathname into valid route pathname.
 *
 * @param pathname The file path name of the route definition.
 * @param maxPath The max path part count limit.
 * @returns {string} Valid route pathname.
 * @throws {RouterError} `Invalid path  ${pathname} -> ${part}` if invalid path encountered.
 * @throws {RouterError} `Max path exceeded` if maxPath is exceeded.
 */
export const translateRouteFilePath = (
  pathname: string,
  maxPath: number,
): string => {
  const parts = pathname.split("/", maxPath + 1);
  if (parts.length > maxPath) {
    throw new RouterError("Max path exceeded");
  }
  const parts_len_1 = parts.length - 1;
  let lastPartIsEscaped = false;
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    if (part == null) {
      parts[i] = "";
      continue;
    }
    // validate part
    if (!PATH_PART_REGEX.test(part)) {
      throw new RouterError(`Invalid path ${pathname} -> ${part}`);
    }
    // parse part
    switch (part) {
      case "":
        break;
      case "[#]":
        parts[i] = "*";
        break;
      case "[##]":
        parts[i] = "**";
        break;
      case "[[#]]":
        parts[i] = "*!";
        break;
      case "[[##]]":
        parts[i] = "**!";
        break;
      default:
        if (part.startsWith("#")) {
          if (i === parts_len_1) {
            lastPartIsEscaped = true;
          }
          parts[i] = part.substring(1);
        } else if (part.startsWith("[") && part.endsWith("]")) {
          const nextBracketIdx = part.indexOf("[", 1);
          if (nextBracketIdx < 0) {
            const extractedPart = part.substring(1, part.length - 1);
            // check for ## name
            if (extractedPart.startsWith("##")) {
              parts[i] = "::" + extractedPart.substring(2).trim();
            } else {
              // [name]
              parts[i] = ":" + extractedPart;
            }
          } else {
            // [[##name]] | [[## name! ]] | [[a,b]name!] | [[a,b] name ] | [[a,b] [name] ]
            const lastBracketIdx = part.indexOf("]", 1);
            const separatorIdx =
              lastBracketIdx >= 0 ? lastBracketIdx : part.length;
            const paths = part.substring(nextBracketIdx + 1, separatorIdx);
            // [[##name]] | [[## name]]
            if (paths.startsWith("##")) {
              const paramId = paths.substring(2).trim();
              parts[i] = `::${paramId}!`;
            } else {
              const paramId = part
                .substring(separatorIdx + 1, part.length - 1)
                .trim();
              // split values a,b,c and replace , with |
              let newPaths = "";
              let lastI = 0;
              for (let i = 0; i < paths.length; ) {
                const cc = paths.charCodeAt(i);
                if (cc === 44) {
                  newPaths += paths.substring(lastI, i) + "|";
                  lastI = ++i;
                  continue;
                }
                i++;
              }
              if (lastI < paths.length) {
                newPaths += paths.substring(lastI);
              }
              if (paramId.startsWith("[") && paramId.endsWith("]")) {
                const extrParamId = paramId
                  .substring(1, paramId.length - 1)
                  .trim();
                parts[i] = `${newPaths}:${extrParamId}!`;
              } else {
                parts[i] = newPaths + ":" + paramId;
              }
            }
          }
        }
    }
  }
  if (
    !lastPartIsEscaped &&
    parts.length > 1 &&
    parts[parts_len_1] === "index"
  ) {
    parts[parts_len_1] = "";
  }
  return parts.join("/");
};

const generateOperationId = (
  method: HttpMethodUpper,
  path: string,
  clean: boolean = true,
): string => {
  // Clean path
  let cleanPath = path
    .split("/")
    .filter(Boolean)
    .map((part) => {
      // Remove braces and special chars
      let cleaned = part
        .replace(/[{}]/g, "")
        .replace(/[\-\.@]/g, (m) =>
          m === "-" ? "_" : m === "." ? "__" : "_at_",
        );
      if (clean) {
        // Remove other special chars
        cleaned = cleaned.replace(/[^a-zA-Z0-9_]/g, "");
      }
      // Convert to PascalCase
      return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    })
    .join("");

  if (!cleanPath) {
    cleanPath = "Root";
  }

  const methodPrefix = method.toLowerCase();
  return `${methodPrefix}${cleanPath}`;
};

export default Router;
