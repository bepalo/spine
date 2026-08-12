import { getHttpStatusText } from "./status.ts";
import {
  Break_Pipe,
  Break_Pipeline,
  ExtractParams,
  HttpError,
  RouterError,
  type HttpMethodLower,
  type OpenApiPathItem,
  type OpenApiParameter,
  type OpenApiResponse,
  type Context,
  type CTError,
  type CTResponse,
  type EmptyRecord,
  type Handler,
  type HandlerRegisterPiplineOptions,
  type HandlerRouteEntries,
  type HandlerRouteEntry,
  type HandlerType,
  type HttpMethod,
  type HttpMethodUpper,
  type MethodPath,
  type Path,
  type Pipe,
  type RegisterPiplineOptions,
  type RespondContext,
  type RouteEntries,
  type RouteEntry,
  type RouterConfig,
  OpenApiSchema,
  OpenApiSecurityScheme,
} from "./types.ts";
import { CTParams } from "./parsers.ts";
import { walk, dynamicImport } from "./utils.deno.ts";

const EMPTY_PARAMS = Object.freeze({});
const W = "[\\p{L}\\p{M}\\p{N}\\p{S}\\p{P}_\\-.]";
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
  "Post",
  "Put",
  "Patch",
  "Delete",
]);

export const HTTP_METHODS_UPPER = new Set<HttpMethodUpper>([
  "HEAD",
  "GET",
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
  ExtendContext extends { router: Router<_ExtendContext> } & Record<
    string,
    unknown
  > = { router: Router<_ExtendContext> } & _ExtendContext,
> {
  #config: RouterConfig<ExtendContext>;
  #routes: Omit<
    Record<HandlerType, Record<HttpMethodUpper, RouteEntries<ExtendContext>>>,
    "handler"
  > &
    Record<
      Extract<HandlerType, "handler">,
      Record<HttpMethodUpper, HandlerRouteEntries<ExtendContext>>
    >;

  get maxPath() {
    return this.#config.maxPath;
  }

  get enable() {
    return { ...this.#config.enable };
  }

  constructor(
    config?: Omit<RouterConfig<ExtendContext>, "maxPath"> &
      Partial<Pick<RouterConfig<ExtendContext>, "maxPath">>,
  ) {
    this.#config = {
      ...config,
      maxPath: config?.maxPath ?? 24,
      enable: {
        filter: config?.enable?.filter ?? true,
        handler: config?.enable?.handler ?? true,
        fallback: config?.enable?.fallback ?? true,
        after: config?.enable?.after ?? true,
        catcher: config?.enable?.catcher ?? true,
      },
    };
    this.#routes = this.#initRoutes();
  }

  async respond(
    request: Request,
    ctxInit?: Omit<RespondContext<ExtendContext>, "router">,
  ): Promise<Response> {
    const requestTimestamp = performance.now();
    const method = request.method as HttpMethod;
    const url = new URL(request.url);
    let pathname!: string;
    let response: Response | undefined = undefined;
    try {
      pathname = decodeURIComponent(url.pathname);
    } catch {
      return new Response(null, {
        status: 400,
        statusText: getHttpStatusText(400),
      });
    }
    const parts: string[] = [];
    const ctx: Context<ExtendContext> = {
      router: this,
      url,
      request,
      headers: ctxInit?.headers ?? new Headers(),
      params: EMPTY_PARAMS,
      pathname,
      $pathname: parts,
      ...ctxInit,
      timestamps: {
        request: requestTimestamp,
        response: requestTimestamp,
        ...(ctxInit as any)?.timestamps,
      },
    } as Context<ExtendContext>;
    {
      const count = this.splitPath(pathname, parts, this.#config.maxPath);
      if (count < 0) {
        return count === -1
          ? new Response(null, {
              status: 400,
              statusText: getHttpStatusText(400),
              headers: ctx.headers,
            })
          : new Response(null, {
              status: 414,
              statusText: getHttpStatusText(414),
              headers: ctx.headers,
            });
      }
    }
    const found = {
      filter: 0,
      handler: 0,
      fallback: 0,
      after: 0,
      catcher: 0,
    } as Record<HandlerType, number>;
    try {
      // get handlers first to check if any exist before filtering
      const handlerRoutes = this.#getRouteEntries(
        pathname,
        parts,
        this.#routes.handler[method as HttpMethodUpper],
        true,
      );
      found.handler = handlerRoutes.length;
      // for optmization, load fallbacks here only if necesasry
      //   i.e. no handlers have been found or defaultFallback not set.
      // if fallback routes have not been loaded now then they will be lazy
      //   loaded later.
      let handlerOrFallbackFound =
        this.#config.defaultFallback != null || found.handler > 0;
      let fallbacksLoaded = false;
      // get fallbacks if handlers have not been found
      let fallbackRoutes: RouteEntry<ExtendContext>[] = [];
      if (!handlerOrFallbackFound && this.#config.enable?.fallback) {
        fallbackRoutes = this.#getRouteEntries(
          pathname,
          parts,
          this.#routes.fallback[method as HttpMethodUpper],
          false,
        );
        found.fallback = fallbackRoutes.length;
        handlerOrFallbackFound = found.fallback > 0;
        fallbacksLoaded = true;
      }
      if (handlerOrFallbackFound) {
        // filters
        if (this.#config.enable?.filter) {
          const filterRoutes = this.#getRouteEntries(
            pathname,
            parts,
            this.#routes.filter[method as HttpMethodUpper],
            false,
          );
          found.filter = filterRoutes.length;
          if (filterRoutes.length > 0) {
            away: for (const routeEntry of filterRoutes) {
              // parse params
              const params = routeEntry.parseParams(pathname, parts);
              ctx.params = params ?? EMPTY_PARAMS;
              // call request handlers
              for (const handler of routeEntry.pipe) {
                const resp = await handler.apply(this, [ctx]);
                if (resp instanceof Response) {
                  response = resp;
                  break;
                } else if (resp === Break_Pipe) {
                  break;
                } else if (resp === Break_Pipeline) {
                  break away;
                }
              }
              if (response instanceof Response) {
                break;
              }
            }
          }
          // default filter
          if (!(response instanceof Response) && this.#config.defaultFilter) {
            const resp = await this.#config.defaultFilter(ctx);
            if (resp instanceof Response) {
              response = resp;
            }
          }
        }
        // handlers
        if (handlerRoutes.length > 0 && !(response instanceof Response)) {
          away: for (const routeEntry of handlerRoutes) {
            // parse params
            const params = routeEntry.parseParams(pathname, parts);
            ctx.params = params ?? EMPTY_PARAMS;
            // call request handlers
            for (const handler of routeEntry.pipe) {
              const resp = await handler(ctx);
              if (resp instanceof Response) {
                response = resp;
                break;
              } else if (resp === Break_Pipe) {
                break;
              } else if (resp === Break_Pipeline) {
                break away;
              }
            }
            if (response instanceof Response) {
              break;
            }
          }
        }
        // fallbacks
        if (this.#config.enable?.fallback && !(response instanceof Response)) {
          if (!fallbacksLoaded) {
            fallbackRoutes = this.#getRouteEntries(
              pathname,
              parts,
              this.#routes.fallback[method as HttpMethodUpper],
              false,
            );
          }
          away: for (const routeEntry of fallbackRoutes) {
            // parse params
            const params = routeEntry.parseParams(pathname, parts);
            ctx.params = params ?? EMPTY_PARAMS;
            // call request handlers
            for (const handler of routeEntry.pipe) {
              const resp = await handler(ctx);
              if (resp instanceof Response) {
                response = resp;
                break;
              } else if (resp === Break_Pipe) {
                break;
              } else if (resp === Break_Pipeline) {
                break away;
              }
            }
            if (response instanceof Response) {
              break;
            }
          }
          // default fallback
          if (!(response instanceof Response) && this.#config.defaultFallback) {
            const resp = await this.#config.defaultFallback(ctx);
            if (resp instanceof Response) {
              response = resp;
            }
          }
        }
      }
      // append headers
      if (response?.headers != null) {
        for (const [k, v] of response.headers) {
          ctx.headers.append(k, v);
        }
      }
      // default response to not-implemented or not-found if null
      response =
        response instanceof Response
          ? new Response(response.body, {
              ...response,
              status: response.status,
              statusText: getHttpStatusText(response.status),
              headers: ctx.headers,
            })
          : found.handler + found.fallback > 0
            ? new Response(null, {
                status: 501,
                statusText: getHttpStatusText(501),
                headers: ctx.headers,
              })
            : new Response(null, {
                status: 404,
                statusText: getHttpStatusText(404),
                headers: ctx.headers,
              });
    } catch (_error) {
      const error =
        _error instanceof Error ? _error : (Error(String(_error)) as Error);
      (ctx as Context<CTError & ExtendContext>).error = error;
      // catchers
      if (this.#config.enable?.catcher) {
        const catcherRoutes = this.#getRouteEntries(
          pathname,
          parts,
          this.#routes.catcher[method as HttpMethodUpper],
          false,
        );
        found.catcher = catcherRoutes.length;
        if (catcherRoutes.length > 0) {
          away: for (const routeEntry of catcherRoutes) {
            // parse params
            const params = routeEntry.parseParams(url.pathname, parts);
            ctx.params = params ?? EMPTY_PARAMS;
            // call request handlers
            for (const handler of routeEntry.pipe) {
              const resp = await handler(ctx);
              if (resp instanceof Response) {
                response = resp;
                break;
              } else if (resp === Break_Pipe) {
                break;
              } else if (resp === Break_Pipeline) {
                break away;
              }
            }
          }
        }
      }
      // default cathcer
      if (!(response instanceof Response) && this.#config.defaultCatcher) {
        const errorCtx = ctx as Context<CTError & ExtendContext>;
        (ctx as Context<CTError & ExtendContext>).error = error;
        const resp = await this.#config.defaultCatcher(errorCtx);
        if (resp instanceof Response) {
          response = resp;
        }
      }
      if (!(response instanceof Response)) {
        const status =
          ctx.error && ctx.error instanceof HttpError ? ctx.error.status : 500;
        response = new Response(null, {
          status,
          statusText: getHttpStatusText(status),
        });
      }
      // append headers
      for (const [k, v] of response.headers) {
        ctx.headers.append(k, v);
      }
      response = new Response(response.body, {
        ...response,
        status: response.status,
        statusText: getHttpStatusText(response.status),
        headers: ctx.headers,
      });
    }
    (ctx as Context<CTResponse & ExtendContext>).response = response;
    ctx.timestamps.response = performance.now();
    // afters
    if (this.#config.enable?.after) {
      const afterRoutes = this.#getRouteEntries(
        pathname,
        parts,
        this.#routes.after[method as HttpMethodUpper],
        false,
      );
      found.after = afterRoutes.length;
      if (afterRoutes.length > 0) {
        away: for (const routeEntry of afterRoutes) {
          // parse params
          const params = routeEntry.parseParams(pathname, parts);
          ctx.params = params ?? EMPTY_PARAMS;
          (ctx as Context<CTResponse & ExtendContext>).response = response;
          // call request handlers
          for (const handler of routeEntry.pipe) {
            const resp = await handler(ctx);
            if (resp instanceof Response) {
              response = resp;
              break;
            } else if (resp === Break_Pipe) {
              break;
            } else if (resp === Break_Pipeline) {
              break away;
            }
          }
          if (response instanceof Response) {
            break;
          }
        }
      }
    }
    // default after
    if (this.#config.defaultAfter) {
      const resp = await this.#config.defaultAfter(
        ctx as Context<CTResponse & ExtendContext>,
      );
      if (resp instanceof Response) {
        response = resp;
      }
    }
    return response;
  }

  async load({
    routesPath,
    pattern = /\.(js|ts|mjs|cjs)$/,
    dirPattern = /.*/,
    processName = (name: string) => name.substring(0, name.lastIndexOf(".")),
  }: {
    routesPath: string;
    pattern?: RegExp;
    dirPattern?: RegExp;
    processName?: (name: string) => string;
  }) {
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
          )) as unknown as Record<string, unknown>;
          const processedName = decodeURIComponent(processName(node.name));
          const pathname = !node.parent
            ? `/${processedName}`
            : `/${node.parent}/${processedName}`;
          const path = translateRouteFilePath(pathname, this.#config.maxPath);
          for (const _method of Object.keys(handlersImp)) {
            const _definition = handlersImp[_method];
            let method: HttpMethod;
            let upperMethod = _method.toUpperCase() as HttpMethodUpper;
            let handlerType: HandlerType = "handler";
            if (HTTP_METHODS_UPPER.has(upperMethod)) {
              method = _method as HttpMethod;
            } else {
              const [spMethod, _handlerType] = _method.split("_", 2);
              if (!(spMethod && _handlerType)) {
                continue;
              }
              upperMethod = spMethod.toUpperCase() as HttpMethodUpper;
              if (HTTP_METHODS_UPPER.has(upperMethod)) {
                method = spMethod as HttpMethod;
              } else {
                continue;
              }
              if (
                HANDLER_TYPES.has(_handlerType?.toLowerCase() as HandlerType)
              ) {
                handlerType = _handlerType.toLowerCase() as HandlerType;
              } else {
                continue;
              }
            }
            const definition =
              Array.isArray(_definition) || typeof _definition === "function"
                ? { pipe: _definition }
                : {
                    pipe: (_definition as Record<string, unknown>).pipe,
                    openApi: (_definition as Record<string, unknown>).openApi,
                  };
            const pipe = definition.pipe;
            const openApi = definition.openApi;
            if (openApi != null && handlerType !== "handler") {
              console.warn(
                `OpenApi definition will be ignored in '${node.path}' ${_method}`,
              );
            }
            if (pipe == null) {
              throw new RouterError(
                `Undefined pipe in '${node.path}' ${_method}`,
              );
            }
            if (!Array.isArray(pipe) && typeof pipe !== "function") {
              throw new RouterError(
                `Bad pipe type in '${node.path}' ${_method}`,
              );
            }
            if (openApi != null && typeof openApi !== "object") {
              throw new RouterError(
                `Bad openApi type in '${node.path}' ${_method}`,
              );
            }
            const options =
              handlerType === "handler" && openApi != null
                ? { openApi }
                : undefined;
            if (Array.isArray(pipe) || typeof pipe === "function") {
              this.register(
                handlerType,
                `${method as HttpMethod} ${path as `/${string}`}`,
                pipe as Pipe<ExtendContext> | Handler<ExtendContext>,
                options as HandlerRegisterPiplineOptions,
              );
            }
          }
        } catch (error) {
          console.error(`Failed to import route at ${node.fullPath}:`, error);
        }
      }
    }
  }

  generateOpenAPI(info?: {
    title?: string;
    version?: string;
    description?: string;
    servers?: Array<{ url: string; description?: string }>;
    security?: Array<Record<string, string[]>>;
    components?: {
      schemas?: Record<string, OpenApiSchema>;
      securitySchemes?: Record<string, OpenApiSecurityScheme>;
    };
  }): Promise<{
    openapi: "3.0.0";
    info: {
      title: string;
      version: string;
      description?: string;
    };
    servers?: Array<{ url: string; description?: string }>;
    paths: Record<string, Record<HttpMethodLower, OpenApiPathItem>>;
    components?: {
      schemas?: Record<string, OpenApiSchema>;
      securitySchemes?: Record<string, OpenApiSecurityScheme>;
    };
    security?: Array<Record<string, string[]>>;
  }> {
    const {
      title = "API",
      version = "1.0.0",
      description,
      servers = [{ url: "/", description: "Current server" }],
      security,
      components: globalComponents,
    } = info ?? {};

    return new Promise((resolve) => {
      const handlers = this.#routes.handler;
      const paths: Record<string, Record<string, OpenApiPathItem>> = {};
      const schemas: Record<string, OpenApiSchema> = {};
      const securitySchemes: Record<string, OpenApiSecurityScheme> = {};

      // Group routes by path
      const routeGroups = new Map<
        string,
        Map<HttpMethodUpper, HandlerRouteEntry<ExtendContext>>
      >();

      // Collect all routes
      for (const method of Object.keys(handlers)) {
        const methodHandlers = handlers[method as HttpMethodUpper];
        for (const entries of [
          methodHandlers.entries,
          methodHandlers.globs,
          methodHandlers.superGlobs,
        ]) {
          for (const bucket of entries) {
            if (bucket == null) continue;

            for (const [, entry] of bucket) {
              if (entry == null) continue;

              // Skip super glob routes for OpenAPI (they're catch-alls)
              if (entry.path.endsWith("/**")) {
                continue;
              }

              let pathMethods = routeGroups.get(entry.openApiPath);
              if (!pathMethods) {
                pathMethods = new Map();
                routeGroups.set(entry.openApiPath, pathMethods);
              }
              pathMethods.set(method as HttpMethodUpper, entry);
            }
          }
        }
      }

      // Build paths
      for (const [pathname, methods] of routeGroups) {
        const pathItem: Record<string, OpenApiPathItem> = {};
        paths[pathname] = pathItem;

        for (const [method, entry] of methods) {
          const openApi = entry.openApi ?? {};
          const methodLower = method.toLowerCase() as HttpMethodLower;

          // Build parameters - only include path params that are actually in the path
          // console.log(entry);
          const pathParams = [];
          if (entry.params != null) {
            for (const [idx, paramId] of entry.params) {
              // if(entry.pathParts[idx])
              console.log([idx, paramId, entry.pathParts[idx]]);
              pathParams.push({
                name: paramId,
                in: "path" as const,
                required: true,
                schema: { type: "string" as const },
              });
            }
          }

          // Combine with user-defined parameters
          const userParams = openApi.parameters ?? [];
          const allParams = [...userParams, ...pathParams];

          // Remove duplicates (by name + in combination)
          const paramSet = new Set<string>();
          const parameters: OpenApiParameter[] = [];
          for (const param of allParams) {
            const key = `${param.name}:${param.in}`;
            if (!paramSet.has(key)) {
              paramSet.add(key);
              parameters.push(param);
            }
          }

          // Build request body
          const requestBody = openApi.requestBody;

          // Build responses
          const responses: Record<string, OpenApiResponse> = {};

          if (openApi.responses) {
            Object.assign(responses, openApi.responses);
          } else {
            // Infer responses from HTTP method
            if (method !== "DELETE" && method !== "HEAD") {
              responses["200"] = {
                description: "Successful response",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        data: { type: "object" },
                        message: { type: "string" },
                      },
                    },
                  },
                },
              };
            } else if (method === "DELETE") {
              responses["204"] = {
                description: "Resource deleted successfully",
              };
            }

            // Add common error responses
            if (entry.params?.length) {
              responses["404"] = {
                description: "Resource not found",
              };
            }

            responses["400"] = {
              description: "Bad request",
            };

            responses["500"] = {
              description: "Internal server error",
            };
          }

          // Build security
          let operationSecurity = openApi.security;
          if (!operationSecurity && security) {
            operationSecurity = security;
          }

          // Generate clean operation ID
          const operationId =
            openApi.operationId || generateOperationId(method, pathname);

          // Build operation object
          const operation: OpenApiPathItem = {
            summary: openApi.summary,
            description: openApi.description,
            tags: openApi.tags,
            parameters: parameters.length > 0 ? parameters : undefined,
            requestBody,
            responses,
            security: operationSecurity,
            operationId,
          };

          // Remove undefined properties
          const cleanedOperation = Object.fromEntries(
            Object.entries(operation).filter(
              ([_, value]) => value !== undefined,
            ),
          ) as OpenApiPathItem;

          pathItem[methodLower] = cleanedOperation;
        }
      }

      // Merge global components with any collected schemas
      const components: any = {};
      if (globalComponents?.schemas) {
        Object.assign(schemas, globalComponents.schemas);
      }
      if (Object.keys(schemas).length > 0) {
        components.schemas = schemas;
      }

      if (globalComponents?.securitySchemes) {
        Object.assign(securitySchemes, globalComponents.securitySchemes);
      }
      if (Object.keys(securitySchemes).length > 0) {
        components.securitySchemes = securitySchemes;
      }

      const result: any = {
        openapi: "3.0.0" as const,
        info: {
          title,
          version,
          ...(description && { description }),
        },
        servers,
        paths,
      };

      if (Object.keys(components).length > 0) {
        result.components = components;
      }

      if (security && security.length > 0) {
        result.security = security;
      }

      resolve(result);
    });
  }

  all<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: P | Array<P>,
    pipe:
      | Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: RegisterPiplineOptions,
  ): Router<ExtendContext> {
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

  crud<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: Path | Array<Path>,
    pipe:
      | Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: RegisterPiplineOptions,
  ): Router<ExtendContext> {
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

  head<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: Path | Array<Path>,
    pipe:
      | Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: RegisterPiplineOptions,
  ): Router<ExtendContext> {
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

  get<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: Path | Array<Path>,
    pipe:
      | Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: HandlerRegisterPiplineOptions,
  ): Router<ExtendContext> {
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

  post<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: Path | Array<Path>,
    pipe:
      | Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: HandlerRegisterPiplineOptions,
  ): Router<ExtendContext> {
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

  put<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: Path | Array<Path>,
    pipe:
      | Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: HandlerRegisterPiplineOptions,
  ): Router<ExtendContext> {
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

  patch<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: Path | Array<Path>,
    pipe:
      | Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: HandlerRegisterPiplineOptions,
  ): Router<ExtendContext> {
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

  delete<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: Path | Array<Path>,
    pipe:
      | Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: HandlerRegisterPiplineOptions,
  ): Router<ExtendContext> {
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

  options<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: Path | Array<Path>,
    pipe:
      | Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: HandlerRegisterPiplineOptions,
  ): Router<ExtendContext> {
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

  trace<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: Path | Array<Path>,
    pipe:
      | Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: HandlerRegisterPiplineOptions,
  ): Router<ExtendContext> {
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

  connect<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: Path | Array<Path>,
    pipe:
      | Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: HandlerRegisterPiplineOptions,
  ): Router<ExtendContext> {
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

  filterAll<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: Path | Array<Path>,
    pipe:
      | Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: RegisterPiplineOptions,
  ): Router<ExtendContext> {
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

  filterCrud<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: Path | Array<Path>,
    pipe:
      | Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: RegisterPiplineOptions,
  ): Router<ExtendContext> {
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

  filterHead<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: Path | Array<Path>,
    pipe:
      | Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: RegisterPiplineOptions,
  ): Router<ExtendContext> {
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

  filterGet<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: Path | Array<Path>,
    pipe:
      | Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: RegisterPiplineOptions,
  ): Router<ExtendContext> {
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

  filterPost<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: Path | Array<Path>,
    pipe:
      | Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: RegisterPiplineOptions,
  ): Router<ExtendContext> {
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

  filterPut<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: Path | Array<Path>,
    pipe:
      | Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: RegisterPiplineOptions,
  ): Router<ExtendContext> {
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

  filterPatch<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: Path | Array<Path>,
    pipe:
      | Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: RegisterPiplineOptions,
  ): Router<ExtendContext> {
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

  filterDelete<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: Path | Array<Path>,
    pipe:
      | Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: RegisterPiplineOptions,
  ): Router<ExtendContext> {
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

  filterOptions<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: Path | Array<Path>,
    pipe:
      | Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: RegisterPiplineOptions,
  ): Router<ExtendContext> {
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

  filterTrace<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: Path | Array<Path>,
    pipe:
      | Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: RegisterPiplineOptions,
  ): Router<ExtendContext> {
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

  filterConnect<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: Path | Array<Path>,
    pipe:
      | Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: RegisterPiplineOptions,
  ): Router<ExtendContext> {
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

  handleAll<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: Path | Array<Path>,
    pipe:
      | Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: RegisterPiplineOptions,
  ): Router<ExtendContext> {
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

  handleCrud<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: Path | Array<Path>,
    pipe:
      | Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: RegisterPiplineOptions,
  ): Router<ExtendContext> {
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

  handleHead<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: Path | Array<Path>,
    pipe:
      | Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: HandlerRegisterPiplineOptions,
  ): Router<ExtendContext> {
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

  handleGet<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: Path | Array<Path>,
    pipe:
      | Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: HandlerRegisterPiplineOptions,
  ): Router<ExtendContext> {
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

  handlePost<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: Path | Array<Path>,
    pipe:
      | Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: HandlerRegisterPiplineOptions,
  ): Router<ExtendContext> {
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

  handlePut<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: Path | Array<Path>,
    pipe:
      | Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: HandlerRegisterPiplineOptions,
  ): Router<ExtendContext> {
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

  handlePatch<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: Path | Array<Path>,
    pipe:
      | Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: HandlerRegisterPiplineOptions,
  ): Router<ExtendContext> {
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

  handleDelete<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: Path | Array<Path>,
    pipe:
      | Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: HandlerRegisterPiplineOptions,
  ): Router<ExtendContext> {
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

  handleOptions<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: Path | Array<Path>,
    pipe:
      | Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: HandlerRegisterPiplineOptions,
  ): Router<ExtendContext> {
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

  handleTrace<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: Path | Array<Path>,
    pipe:
      | Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: HandlerRegisterPiplineOptions,
  ): Router<ExtendContext> {
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

  handleConnect<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: Path | Array<Path>,
    pipe:
      | Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: HandlerRegisterPiplineOptions,
  ): Router<ExtendContext> {
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

  fallbackAll<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: Path | Array<Path>,
    pipe:
      | Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: RegisterPiplineOptions,
  ): Router<ExtendContext> {
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

  fallbackCrud<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: Path | Array<Path>,
    pipe:
      | Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: RegisterPiplineOptions,
  ): Router<ExtendContext> {
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

  fallbackHead<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: Path | Array<Path>,
    pipe:
      | Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: RegisterPiplineOptions,
  ): Router<ExtendContext> {
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

  fallbackGet<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: Path | Array<Path>,
    pipe:
      | Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: RegisterPiplineOptions,
  ): Router<ExtendContext> {
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

  fallbackPost<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: Path | Array<Path>,
    pipe:
      | Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: RegisterPiplineOptions,
  ): Router<ExtendContext> {
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

  fallbackPut<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: Path | Array<Path>,
    pipe:
      | Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: RegisterPiplineOptions,
  ): Router<ExtendContext> {
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

  fallbackPatch<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: Path | Array<Path>,
    pipe:
      | Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: RegisterPiplineOptions,
  ): Router<ExtendContext> {
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

  fallbackDelete<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: Path | Array<Path>,
    pipe:
      | Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: RegisterPiplineOptions,
  ): Router<ExtendContext> {
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

  fallbackOptions<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: Path | Array<Path>,
    pipe:
      | Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: RegisterPiplineOptions,
  ): Router<ExtendContext> {
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

  fallbackTrace<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: Path | Array<Path>,
    pipe:
      | Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: RegisterPiplineOptions,
  ): Router<ExtendContext> {
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

  fallbackConnect<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: Path | Array<Path>,
    pipe:
      | Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>
      | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>,
    options?: RegisterPiplineOptions,
  ): Router<ExtendContext> {
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

  afterAll<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: Path | Array<Path>,
    pipe:
      | Handler<
          CTParams<ExtractParams<P>> &
            CTResponse &
            ExtendContext &
            ExtendContextMore
        >
      | Pipe<
          CTParams<ExtractParams<P>> &
            CTResponse &
            ExtendContext &
            ExtendContextMore
        >,
    options?: RegisterPiplineOptions,
  ): Router<ExtendContext> {
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
      pipe as Handler<ExtendContext> | Pipe<ExtendContext>,
      options,
    );
  }

  afterCrud<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: Path | Array<Path>,
    pipe:
      | Handler<
          CTParams<ExtractParams<P>> &
            CTResponse &
            ExtendContext &
            ExtendContextMore
        >
      | Pipe<
          CTParams<ExtractParams<P>> &
            CTResponse &
            ExtendContext &
            ExtendContextMore
        >,
    options?: RegisterPiplineOptions,
  ): Router<ExtendContext> {
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
      pipe as Handler<ExtendContext> | Pipe<ExtendContext>,
      options,
    );
  }

  afterHead<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: Path | Array<Path>,
    pipe:
      | Handler<
          CTParams<ExtractParams<P>> &
            CTResponse &
            ExtendContext &
            ExtendContextMore
        >
      | Pipe<
          CTParams<ExtractParams<P>> &
            CTResponse &
            ExtendContext &
            ExtendContextMore
        >,
    options?: RegisterPiplineOptions,
  ): Router<ExtendContext> {
    paths = Array.isArray(paths) ? paths : [paths];
    const methodPaths = paths.map(
      (p: string) => `Head ${p}`,
    ) as Array<MethodPath>;
    return this.register(
      "after",
      methodPaths,
      pipe as Handler<ExtendContext> | Pipe<ExtendContext>,
      options,
    );
  }

  afterGet<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: Path | Array<Path>,
    pipe:
      | Handler<
          CTParams<ExtractParams<P>> &
            CTResponse &
            ExtendContext &
            ExtendContextMore
        >
      | Pipe<
          CTParams<ExtractParams<P>> &
            CTResponse &
            ExtendContext &
            ExtendContextMore
        >,
    options?: RegisterPiplineOptions,
  ): Router<ExtendContext> {
    paths = Array.isArray(paths) ? paths : [paths];
    const methodPaths = paths.map(
      (p: string) => `Get ${p}`,
    ) as Array<MethodPath>;
    return this.register(
      "after",
      methodPaths,
      pipe as Handler<ExtendContext> | Pipe<ExtendContext>,
      options,
    );
  }

  afterPost<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: Path | Array<Path>,
    pipe:
      | Handler<
          CTParams<ExtractParams<P>> &
            CTResponse &
            ExtendContext &
            ExtendContextMore
        >
      | Pipe<
          CTParams<ExtractParams<P>> &
            CTResponse &
            ExtendContext &
            ExtendContextMore
        >,
    options?: RegisterPiplineOptions,
  ): Router<ExtendContext> {
    paths = Array.isArray(paths) ? paths : [paths];
    const methodPaths = paths.map(
      (p: string) => `Post ${p}`,
    ) as Array<MethodPath>;
    return this.register(
      "after",
      methodPaths,
      pipe as Handler<ExtendContext> | Pipe<ExtendContext>,
      options,
    );
  }

  afterPut<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: Path | Array<Path>,
    pipe:
      | Handler<
          CTParams<ExtractParams<P>> &
            CTResponse &
            ExtendContext &
            ExtendContextMore
        >
      | Pipe<
          CTParams<ExtractParams<P>> &
            CTResponse &
            ExtendContext &
            ExtendContextMore
        >,
    options?: RegisterPiplineOptions,
  ): Router<ExtendContext> {
    paths = Array.isArray(paths) ? paths : [paths];
    const methodPaths = paths.map(
      (p: string) => `Put ${p}`,
    ) as Array<MethodPath>;
    return this.register(
      "after",
      methodPaths,
      pipe as Handler<ExtendContext> | Pipe<ExtendContext>,
      options,
    );
  }

  afterPatch<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: Path | Array<Path>,
    pipe:
      | Handler<
          CTParams<ExtractParams<P>> &
            CTResponse &
            ExtendContext &
            ExtendContextMore
        >
      | Pipe<
          CTParams<ExtractParams<P>> &
            CTResponse &
            ExtendContext &
            ExtendContextMore
        >,
    options?: RegisterPiplineOptions,
  ): Router<ExtendContext> {
    paths = Array.isArray(paths) ? paths : [paths];
    const methodPaths = paths.map(
      (p: string) => `Patch ${p}`,
    ) as Array<MethodPath>;
    return this.register(
      "after",
      methodPaths,
      pipe as Handler<ExtendContext> | Pipe<ExtendContext>,
      options,
    );
  }

  afterDelete<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: Path | Array<Path>,
    pipe:
      | Handler<
          CTParams<ExtractParams<P>> &
            CTResponse &
            ExtendContext &
            ExtendContextMore
        >
      | Pipe<
          CTParams<ExtractParams<P>> &
            CTResponse &
            ExtendContext &
            ExtendContextMore
        >,
    options?: RegisterPiplineOptions,
  ): Router<ExtendContext> {
    paths = Array.isArray(paths) ? paths : [paths];
    const methodPaths = paths.map(
      (p: string) => `Delete ${p}`,
    ) as Array<MethodPath>;
    return this.register(
      "after",
      methodPaths,
      pipe as Handler<ExtendContext> | Pipe<ExtendContext>,
      options,
    );
  }

  afterOptions<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: Path | Array<Path>,
    pipe:
      | Handler<
          CTParams<ExtractParams<P>> &
            CTResponse &
            ExtendContext &
            ExtendContextMore
        >
      | Pipe<
          CTParams<ExtractParams<P>> &
            CTResponse &
            ExtendContext &
            ExtendContextMore
        >,
    options?: RegisterPiplineOptions,
  ): Router<ExtendContext> {
    paths = Array.isArray(paths) ? paths : [paths];
    const methodPaths = paths.map(
      (p: string) => `Options ${p}`,
    ) as Array<MethodPath>;
    return this.register(
      "after",
      methodPaths,
      pipe as Handler<ExtendContext> | Pipe<ExtendContext>,
      options,
    );
  }

  afterTrace<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: Path | Array<Path>,
    pipe:
      | Handler<
          CTParams<ExtractParams<P>> &
            CTResponse &
            ExtendContext &
            ExtendContextMore
        >
      | Pipe<
          CTParams<ExtractParams<P>> &
            CTResponse &
            ExtendContext &
            ExtendContextMore
        >,
    options?: RegisterPiplineOptions,
  ): Router<ExtendContext> {
    paths = Array.isArray(paths) ? paths : [paths];
    const methodPaths = paths.map(
      (p: string) => `Trace ${p}`,
    ) as Array<MethodPath>;
    return this.register(
      "after",
      methodPaths,
      pipe as Handler<ExtendContext> | Pipe<ExtendContext>,
      options,
    );
  }

  afterConnect<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: Path | Array<Path>,
    pipe:
      | Handler<
          CTParams<ExtractParams<P>> &
            CTResponse &
            ExtendContext &
            ExtendContextMore
        >
      | Pipe<
          CTParams<ExtractParams<P>> &
            CTResponse &
            ExtendContext &
            ExtendContextMore
        >,
    options?: RegisterPiplineOptions,
  ): Router<ExtendContext> {
    paths = Array.isArray(paths) ? paths : [paths];
    const methodPaths = paths.map(
      (p: string) => `Connect ${p}`,
    ) as Array<MethodPath>;
    return this.register(
      "after",
      methodPaths,
      pipe as Handler<ExtendContext> | Pipe<ExtendContext>,
      options,
    );
  }

  catchAll<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: Path | Array<Path>,
    pipe:
      | Handler<
          CTParams<ExtractParams<P>> &
            CTError &
            ExtendContext &
            ExtendContextMore
        >
      | Pipe<
          CTParams<ExtractParams<P>> &
            CTError &
            ExtendContext &
            ExtendContextMore
        >,
    options?: RegisterPiplineOptions,
  ): Router<ExtendContext> {
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
      pipe as Handler<ExtendContext> | Pipe<ExtendContext>,
      options,
    );
  }

  catchCrud<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: Path | Array<Path>,
    pipe:
      | Handler<
          CTParams<ExtractParams<P>> &
            CTError &
            ExtendContext &
            ExtendContextMore
        >
      | Pipe<
          CTParams<ExtractParams<P>> &
            CTError &
            ExtendContext &
            ExtendContextMore
        >,
    options?: RegisterPiplineOptions,
  ): Router<ExtendContext> {
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
      pipe as Handler<ExtendContext> | Pipe<ExtendContext>,
      options,
    );
  }

  catchHead<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: Path | Array<Path>,
    pipe:
      | Handler<
          CTParams<ExtractParams<P>> &
            CTError &
            ExtendContext &
            ExtendContextMore
        >
      | Pipe<
          CTParams<ExtractParams<P>> &
            CTError &
            ExtendContext &
            ExtendContextMore
        >,
    options?: RegisterPiplineOptions,
  ): Router<ExtendContext> {
    paths = Array.isArray(paths) ? paths : [paths];
    const methodPaths = paths.map(
      (p: string) => `Head ${p}`,
    ) as Array<MethodPath>;
    return this.register(
      "catcher",
      methodPaths,
      pipe as Handler<ExtendContext> | Pipe<ExtendContext>,
      options,
    );
  }

  catchGet<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: Path | Array<Path>,
    pipe:
      | Handler<
          CTParams<ExtractParams<P>> &
            CTError &
            ExtendContext &
            ExtendContextMore
        >
      | Pipe<
          CTParams<ExtractParams<P>> &
            CTError &
            ExtendContext &
            ExtendContextMore
        >,
    options?: RegisterPiplineOptions,
  ): Router<ExtendContext> {
    paths = Array.isArray(paths) ? paths : [paths];
    const methodPaths = paths.map(
      (p: string) => `Get ${p}`,
    ) as Array<MethodPath>;
    return this.register(
      "catcher",
      methodPaths,
      pipe as Handler<ExtendContext> | Pipe<ExtendContext>,
      options,
    );
  }

  catchPost<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: Path | Array<Path>,
    pipe:
      | Handler<
          CTParams<ExtractParams<P>> &
            CTError &
            ExtendContext &
            ExtendContextMore
        >
      | Pipe<
          CTParams<ExtractParams<P>> &
            CTError &
            ExtendContext &
            ExtendContextMore
        >,
    options?: RegisterPiplineOptions,
  ): Router<ExtendContext> {
    paths = Array.isArray(paths) ? paths : [paths];
    const methodPaths = paths.map(
      (p: string) => `Post ${p}`,
    ) as Array<MethodPath>;
    return this.register(
      "catcher",
      methodPaths,
      pipe as Handler<ExtendContext> | Pipe<ExtendContext>,
      options,
    );
  }

  catchPut<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: Path | Array<Path>,
    pipe:
      | Handler<
          CTParams<ExtractParams<P>> &
            CTError &
            ExtendContext &
            ExtendContextMore
        >
      | Pipe<
          CTParams<ExtractParams<P>> &
            CTError &
            ExtendContext &
            ExtendContextMore
        >,
    options?: RegisterPiplineOptions,
  ): Router<ExtendContext> {
    paths = Array.isArray(paths) ? paths : [paths];
    const methodPaths = paths.map(
      (p: string) => `Put ${p}`,
    ) as Array<MethodPath>;
    return this.register(
      "catcher",
      methodPaths,
      pipe as Handler<ExtendContext> | Pipe<ExtendContext>,
      options,
    );
  }

  catchPatch<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: Path | Array<Path>,
    pipe:
      | Handler<
          CTParams<ExtractParams<P>> &
            CTError &
            ExtendContext &
            ExtendContextMore
        >
      | Pipe<
          CTParams<ExtractParams<P>> &
            CTError &
            ExtendContext &
            ExtendContextMore
        >,
    options?: RegisterPiplineOptions,
  ): Router<ExtendContext> {
    paths = Array.isArray(paths) ? paths : [paths];
    const methodPaths = paths.map(
      (p: string) => `Patch ${p}`,
    ) as Array<MethodPath>;
    return this.register(
      "catcher",
      methodPaths,
      pipe as Handler<ExtendContext> | Pipe<ExtendContext>,
      options,
    );
  }

  catchDelete<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: Path | Array<Path>,
    pipe:
      | Handler<
          CTParams<ExtractParams<P>> &
            CTError &
            ExtendContext &
            ExtendContextMore
        >
      | Pipe<
          CTParams<ExtractParams<P>> &
            CTError &
            ExtendContext &
            ExtendContextMore
        >,
    options?: RegisterPiplineOptions,
  ): Router<ExtendContext> {
    paths = Array.isArray(paths) ? paths : [paths];
    const methodPaths = paths.map(
      (p: string) => `Delete ${p}`,
    ) as Array<MethodPath>;
    return this.register(
      "catcher",
      methodPaths,
      pipe as Handler<ExtendContext> | Pipe<ExtendContext>,
      options,
    );
  }

  catchOptions<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: Path | Array<Path>,
    pipe:
      | Handler<
          CTParams<ExtractParams<P>> &
            CTError &
            ExtendContext &
            ExtendContextMore
        >
      | Pipe<
          CTParams<ExtractParams<P>> &
            CTError &
            ExtendContext &
            ExtendContextMore
        >,
    options?: RegisterPiplineOptions,
  ): Router<ExtendContext> {
    paths = Array.isArray(paths) ? paths : [paths];
    const methodPaths = paths.map(
      (p: string) => `Options ${p}`,
    ) as Array<MethodPath>;
    return this.register(
      "catcher",
      methodPaths,
      pipe as Handler<ExtendContext> | Pipe<ExtendContext>,
      options,
    );
  }

  catchTrace<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: Path | Array<Path>,
    pipe:
      | Handler<
          CTParams<ExtractParams<P>> &
            CTError &
            ExtendContext &
            ExtendContextMore
        >
      | Pipe<
          CTParams<ExtractParams<P>> &
            CTError &
            ExtendContext &
            ExtendContextMore
        >,
    options?: RegisterPiplineOptions,
  ): Router<ExtendContext> {
    paths = Array.isArray(paths) ? paths : [paths];
    const methodPaths = paths.map(
      (p: string) => `Trace ${p}`,
    ) as Array<MethodPath>;
    return this.register(
      "catcher",
      methodPaths,
      pipe as Handler<ExtendContext> | Pipe<ExtendContext>,
      options,
    );
  }

  catchConnect<
    ExtendContextMore extends Record<string, unknown> = EmptyRecord,
    P extends Path = Path,
  >(
    paths: Path | Array<Path>,
    pipe:
      | Handler<
          CTParams<ExtractParams<P>> &
            CTError &
            ExtendContext &
            ExtendContextMore
        >
      | Pipe<
          CTParams<ExtractParams<P>> &
            CTError &
            ExtendContext &
            ExtendContextMore
        >,
    options?: RegisterPiplineOptions,
  ): Router<ExtendContext> {
    paths = Array.isArray(paths) ? paths : [paths];
    const methodPaths = paths.map(
      (p: string) => `Connect ${p}`,
    ) as Array<MethodPath>;
    return this.register(
      "catcher",
      methodPaths,
      pipe as Handler<ExtendContext> | Pipe<ExtendContext>,
      options,
    );
  }

  filter<ExtendContextMore extends Record<string, unknown> = EmptyRecord>(
    methodPaths: MethodPath | Array<MethodPath>,
    pipe:
      | Handler<ExtendContext & ExtendContextMore>
      | Pipe<ExtendContext & ExtendContextMore>,
    options?: RegisterPiplineOptions,
  ): Router<ExtendContext> {
    return this.register(
      "filter",
      methodPaths,
      pipe as Handler<ExtendContext> | Pipe<ExtendContext>,
      options,
    );
  }

  handle<ExtendContextMore extends Record<string, unknown> = EmptyRecord>(
    methodPaths: MethodPath | Array<MethodPath>,
    pipe:
      | Handler<ExtendContext & ExtendContextMore>
      | Pipe<ExtendContext & ExtendContextMore>,
    options?: HandlerRegisterPiplineOptions,
  ): Router<ExtendContext> {
    return this.register(
      "handler",
      methodPaths,
      pipe as Handler<ExtendContext> | Pipe<ExtendContext>,
      options,
    );
  }

  fallback<ExtendContextMore extends Record<string, unknown> = EmptyRecord>(
    methodPaths: MethodPath | Array<MethodPath>,
    pipe:
      | Handler<ExtendContext & ExtendContextMore>
      | Pipe<ExtendContext & ExtendContextMore>,
    options?: RegisterPiplineOptions,
  ): Router<ExtendContext> {
    return this.register(
      "fallback",
      methodPaths,
      pipe as Handler<ExtendContext> | Pipe<ExtendContext>,
      options,
    );
  }

  after<ExtendContextMore extends Record<string, unknown> = EmptyRecord>(
    methodPaths: MethodPath | Array<MethodPath>,
    pipe:
      | Handler<ExtendContext & ExtendContextMore>
      | Pipe<ExtendContext & ExtendContextMore>,
    options?: RegisterPiplineOptions,
  ): Router<ExtendContext> {
    return this.register(
      "after",
      methodPaths,
      pipe as Handler<ExtendContext> | Pipe<ExtendContext>,
      options,
    );
  }

  catch<ExtendContextMore extends Record<string, unknown> = EmptyRecord>(
    methodPaths: MethodPath | Array<MethodPath>,
    pipe:
      | Handler<
          ExtendContext & ExtendContextMore & { error: Error | HttpError }
        >
      | Pipe<ExtendContext & ExtendContextMore & { error: Error | HttpError }>,
    options?: RegisterPiplineOptions,
  ): Router<ExtendContext> {
    return this.register(
      "catcher",
      methodPaths,
      pipe as
        | Handler<ExtendContext & { error: Error | HttpError }>
        | Pipe<ExtendContext & { error: Error | HttpError }>,
      options,
    );
  }

  register(
    handlerType: HandlerType,
    methodPaths: MethodPath | Array<MethodPath>,
    pipe:
      | Handler<ExtendContext & { error: Error | HttpError }>
      | Pipe<ExtendContext & { error: Error | HttpError }>,
    options?: RegisterPiplineOptions | HandlerRegisterPiplineOptions,
  ): Router<ExtendContext> {
    const overwrite = options?.overwrite === true;
    methodPaths = Array.isArray(methodPaths) ? methodPaths : [methodPaths];
    pipe = Array.isArray(pipe) ? pipe : [pipe];
    for (const methodPath of methodPaths) {
      const [method, originalPath] = methodPath.split(" ", 2) as [
        HttpMethod,
        string,
      ];
      const processedPaths = this.#processPath(originalPath);
      const { params, paths } = processedPaths;
      const paramsMap = params ? new Map(params) : undefined;
      for (const path of paths) {
        const standardPath = params
          ? path
              .split("/")
              .map((p, idx) => (p === "*" ? `:${paramsMap?.get(idx)}` : p))
              .join("/")
          : path;
        const openApiPath = params
          ? path
              .split("/")
              .map((p, idx) => (p === "*" ? `{${paramsMap?.get(idx)}}` : p))
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
        const parts = path.split("/", this.#config.maxPath + 1);
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
          pipe,
          originalPath,
          standardPath,
          openApiPath,
          path,
          pathParts: parts,
          openApi: (options as HandlerRegisterPiplineOptions)?.openApi,
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
            throw new RouterError(
              `SuperGlob route already set for (${method} ${originalPath} -> ${path})`,
            );
          }
          if (superGlobEntries == null) {
            superGlobEntries = new Map();
            routes.superGlobs[parts_len_1] = superGlobEntries;
          }
          superGlobEntries.set(basePath, entry);
        } else if (hasGlob) {
          // check for globs
          let globEntries = routes.globs[parts.length];
          if (globEntries) {
            if (!overwrite && globEntries && globEntries.has(path)) {
              throw new RouterError(
                `Glob route already set for (${method} ${originalPath} -> ${path})`,
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
          }
          entries.set(path, entry);
        }
      }
    }
    return this;
  }

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
): Record<string, string | undefined> | undefined => {
  if (params == null && superGlobIndex == null) return undefined;
  const paramsRec = {} as Record<string, string | undefined>;
  if (params != null && superGlobIndex != null) {
    const name = params[0][1];
    paramsRec[name] = pathname.substring(superGlobIndex);
  } else if (params != null) {
    for (const [idx, paramId] of params) {
      paramsRec[paramId] = parts[idx] as string;
    }
  }
  return paramsRec;
};

export const translateRouteFilePath = (
  pathname: string,
  maxPath: number = 64,
) => {
  const parts = pathname.split("/", maxPath + 1);
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

const generateOperationId = (method: HttpMethodUpper, path: string): string => {
  // Remove all special characters and format properly
  const cleanPath = path
    .replace(/[{}]/g, "")
    .replace(/\*/g, "")
    .replace(/[^a-zA-Z0-9\/]/g, "")
    .split("/")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");

  return `${method.toLowerCase()}${cleanPath}`;
};

export default Router;
