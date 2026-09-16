import { ExtractParams, type CTError, type EmptyRecord, type Handler, type HandlerType, type HttpMethod, type HttpMethodUpper, type MethodPath, type Path, type Pipe, type RegisterPipelineOptions, type RespondContext, type RouterConfig, GenerateOpenApiInfo, GenerateOpenAPIOptions, GeneratedOpenApi, EndHandler, EndPipe, ErrorHandler, ErrorPipe } from "./types.ts";
import { CTParams } from "./parsers.ts";
export declare const EMPTY_PARAMS: Readonly<{}>;
export declare const PATH_PART_REGEX: RegExp;
export declare const REGISTER_PATH_REGEX: RegExp;
export declare const HTTP_METHODS: Set<HttpMethod>;
export declare const CRUD_METHODS: Set<HttpMethod>;
export declare const HTTP_METHODS_UPPER: Set<HttpMethodUpper>;
export declare const HANDLER_TYPES: Set<HandlerType>;
/**
 * The Router class.
 *
 * @template {Record<string, unknown>} ExtendContext - Extend Router Context
 */
export declare class Router<_ExtendContext extends Record<string, unknown> = EmptyRecord, ExtendContext extends {
    router: Router<_ExtendContext>;
} & Record<string, unknown> = {
    router: Router<_ExtendContext>;
} & _ExtendContext> {
    #private;
    get maxPath(): number;
    get enable(): {
        filter?: boolean | undefined;
        fallback?: boolean | undefined;
        after?: boolean | undefined;
        catcher?: boolean | undefined;
    };
    get doNotStoreSetters(): boolean | undefined;
    get setters(): {
        handlerType: HandlerType;
        methodPaths: MethodPath | Array<MethodPath>;
        pipe: Handler<ExtendContext> | ErrorHandler<ExtendContext> | EndHandler<ExtendContext> | Pipe<ExtendContext> | ErrorPipe<ExtendContext> | EndPipe<ExtendContext>;
        options?: RegisterPipelineOptions | RegisterPipelineOptions;
    }[];
    /**
     * Create a new Router
     *
     * @param {RouterConfig<ExtendContext>} config Router configs
     */
    constructor(config: RouterConfig<ExtendContext>);
    /**
     * Respond to a request according to the defined routes.
     *
     * @param {Request} request An http request object
     * @param {RespondContext<ExtendContext>} ctxInit Context pre-initialization.
     *     Only headers and timestamps are allowed.
     *     But timestamps properties will not be overridden but rather extended.
     * @returns {Response} An http response object
     */
    respond(request: Request, ctxInit?: RespondContext<ExtendContext>): Promise<Response>;
    /**
     *
     * @param {string} prefix Path prefix to prepend to paths.
     * @param {Router<_ExtendContext,ExtendContext>} router The router to append routes definitions from.
     * @param {{overwrite:boolean}} options Options to apply to each route definition.
     * @param {boolean} [options.overwrite] Overwrite each route definition. This overrides the route specific options.
     */
    appendTo(prefix: `/${string}`, router: Router<_ExtendContext, ExtendContext>, options?: {
        overwrite: boolean;
    }): void;
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
    load(options: {
        routesPath: string;
        pattern?: RegExp;
        dirPattern?: RegExp;
        processName?: (name: string) => string;
    }): Promise<void>;
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
    generateOpenAPI(info?: GenerateOpenApiInfo, options?: GenerateOpenAPIOptions<ExtendContext>): Promise<GeneratedOpenApi>;
    /**
     * Define handlers for all http methods ["Head","Get","Query","Post","Put","Patch","Delete","Options","Trace","Connect"] and the specified paths.
     *
     * @param {Path} paths One or more valid route paths
     * @param pipe One or more request handlers
     * @param {RegisterPipelineOptions} options Register pipeline options
     * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
     * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
     * @returns This router instance.
     */
    all<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: P | Array<P>, pipe: Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: RegisterPipelineOptions): Router<ExtendContext>;
    /**
     * Define handlers for CRUD http methods ["Get","Query","Post","Put","Patch","Delete"] and the specified paths.
     *
     * @param {Path} paths One or more valid route paths
     * @param pipe One or more request handlers
     * @param {RegisterPipelineOptions} options Register pipeline options
     * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
     * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
     * @returns This router instance.
     */
    crud<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: RegisterPipelineOptions): Router<ExtendContext>;
    /**
     * Define handlers for Head http method and the specified paths.
     *
     * @param {Path} paths One or more valid route paths
     * @param pipe One or more request handlers
     * @param {RegisterPipelineOptions} options Register pipeline options
     * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
     * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
     * @returns This router instance.
     */
    head<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: RegisterPipelineOptions): Router<ExtendContext>;
    /**
     * Define handlers for Get http method and the specified paths.
     *
     * @param {Path} paths One or more valid route paths
     * @param pipe One or more request handlers
     * @param {RegisterPipelineOptions} options Register pipeline options
     * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
     * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
     * @returns This router instance.
     */
    get<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: RegisterPipelineOptions): Router<ExtendContext>;
    /**
     * Define handlers for Query http method and the specified paths.
     *
     * @param {Path} paths One or more valid route paths
     * @param pipe One or more request handlers
     * @param {RegisterPipelineOptions} options Register pipeline options
     * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
     * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
     * @returns This router instance.
     */
    query<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: RegisterPipelineOptions): Router<ExtendContext>;
    /**
     * Define handlers for Post http method and the specified paths.
     *
     * @param {Path} paths One or more valid route paths
     * @param pipe One or more request handlers
     * @param {RegisterPipelineOptions} options Register pipeline options
     * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
     * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
     * @returns This router instance.
     */
    post<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: RegisterPipelineOptions): Router<ExtendContext>;
    /**
     * Define handlers for Put http method and the specified paths.
     *
     * @param {Path} paths One or more valid route paths
     * @param pipe One or more request handlers
     * @param {RegisterPipelineOptions} options Register pipeline options
     * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
     * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
     * @returns This router instance.
     */
    put<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: RegisterPipelineOptions): Router<ExtendContext>;
    /**
     * Define handlers for Patch http method and the specified paths.
     *
     * @param {Path} paths One or more valid route paths
     * @param pipe One or more request handlers
     * @param {RegisterPipelineOptions} options Register pipeline options
     * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
     * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
     * @returns This router instance.
     */
    patch<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: RegisterPipelineOptions): Router<ExtendContext>;
    /**
     * Define handlers for Head Delete method and the specified paths.
     *
     * @param {Path} paths One or more valid route paths
     * @param pipe One or more request handlers
     * @param {RegisterPipelineOptions} options Register pipeline options
     * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
     * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
     * @returns This router instance.
     */
    delete<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: RegisterPipelineOptions): Router<ExtendContext>;
    /**
     * Define handlers for Options http method and the specified paths.
     *
     * @param {Path} paths One or more valid route paths
     * @param pipe One or more request handlers
     * @param {RegisterPipelineOptions} options Register pipeline options
     * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
     * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
     * @returns This router instance.
     */
    options<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: RegisterPipelineOptions): Router<ExtendContext>;
    /**
     * Define handlers for Trace http method and the specified paths.
     *
     * @param {Path} paths One or more valid route paths
     * @param pipe One or more request handlers
     * @param {RegisterPipelineOptions} options Register pipeline options
     * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
     * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
     * @returns This router instance.
     */
    trace<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: RegisterPipelineOptions): Router<ExtendContext>;
    /**
     * Define handlers for Connect http method and the specified paths.
     *
     * @param {Path} paths One or more valid route paths
     * @param pipe One or more request handlers
     * @param {RegisterPipelineOptions} options Register pipeline options
     * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
     * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
     * @returns This router instance.
     */
    connect<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: RegisterPipelineOptions): Router<ExtendContext>;
    /**
     * Define filters for all http methods ["Head","Get","Query","Post","Put","Patch","Delete","Options","Trace","Connect"] and the specified paths.
     *
     * @param {Path} paths One or more valid route paths
     * @param pipe One or more request handlers
     * @param {RegisterPipelineOptions} options Register pipeline options
     * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
     * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
     * @returns This router instance.
     */
    filterAll<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: RegisterPipelineOptions): Router<ExtendContext>;
    /**
     * Define filters for CRUD http methods ["Get","Query","Post","Put","Patch","Delete"] and the specified paths.
     *
     * @param {Path} paths One or more valid route paths
     * @param pipe One or more request handlers
     * @param {RegisterPipelineOptions} options Register pipeline options
     * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
     * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
     * @returns This router instance.
     */
    filterCrud<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: RegisterPipelineOptions): Router<ExtendContext>;
    /**
     * Define filters for Head http method and the specified paths.
     *
     * @param {Path} paths One or more valid route paths
     * @param pipe One or more request handlers
     * @param {RegisterPipelineOptions} options Register pipeline options
     * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
     * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
     * @returns This router instance.
     */
    filterHead<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: RegisterPipelineOptions): Router<ExtendContext>;
    /**
     * Define filters for Get http method and the specified paths.
     *
     * @param {Path} paths One or more valid route paths
     * @param pipe One or more request handlers
     * @param {RegisterPipelineOptions} options Register pipeline options
     * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
     * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
     * @returns This router instance.
     */
    filterGet<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: RegisterPipelineOptions): Router<ExtendContext>;
    /**
     * Define filters for Query http method and the specified paths.
     *
     * @param {Path} paths One or more valid route paths
     * @param pipe One or more request handlers
     * @param {RegisterPipelineOptions} options Register pipeline options
     * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
     * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
     * @returns This router instance.
     */
    filterQuery<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: RegisterPipelineOptions): Router<ExtendContext>;
    /**
     * Define filters for Post http method and the specified paths.
     *
     * @param {Path} paths One or more valid route paths
     * @param pipe One or more request handlers
     * @param {RegisterPipelineOptions} options Register pipeline options
     * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
     * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
     * @returns This router instance.
     */
    filterPost<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: RegisterPipelineOptions): Router<ExtendContext>;
    /**
     * Define filters for Put http method and the specified paths.
     *
     * @param {Path} paths One or more valid route paths
     * @param pipe One or more request handlers
     * @param {RegisterPipelineOptions} options Register pipeline options
     * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
     * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
     * @returns This router instance.
     */
    filterPut<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: RegisterPipelineOptions): Router<ExtendContext>;
    /**
     * Define filters for Patch http method and the specified paths.
     *
     * @param {Path} paths One or more valid route paths
     * @param pipe One or more request handlers
     * @param {RegisterPipelineOptions} options Register pipeline options
     * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
     * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
     * @returns This router instance.
     */
    filterPatch<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: RegisterPipelineOptions): Router<ExtendContext>;
    /**
     * Define filters for Head Delete method and the specified paths.
     *
     * @param {Path} paths One or more valid route paths
     * @param pipe One or more request handlers
     * @param {RegisterPipelineOptions} options Register pipeline options
     * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
     * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
     * @returns This router instance.
     */
    filterDelete<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: RegisterPipelineOptions): Router<ExtendContext>;
    /**
     * Define filters for Options http method and the specified paths.
     *
     * @param {Path} paths One or more valid route paths
     * @param pipe One or more request handlers
     * @param {RegisterPipelineOptions} options Register pipeline options
     * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
     * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
     * @returns This router instance.
     */
    filterOptions<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: RegisterPipelineOptions): Router<ExtendContext>;
    /**
     * Define filters for Trace http method and the specified paths.
     *
     * @param {Path} paths One or more valid route paths
     * @param pipe One or more request handlers
     * @param {RegisterPipelineOptions} options Register pipeline options
     * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
     * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
     * @returns This router instance.
     */
    filterTrace<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: RegisterPipelineOptions): Router<ExtendContext>;
    /**
     * Define filters for Connect http method and the specified paths.
     *
     * @param {Path} paths One or more valid route paths
     * @param pipe One or more request handlers
     * @param {RegisterPipelineOptions} options Register pipeline options
     * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
     * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
     * @returns This router instance.
     */
    filterConnect<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: RegisterPipelineOptions): Router<ExtendContext>;
    /**
     * Define handlers for all http methods ["Head","Get","Query","Post","Put","Patch","Delete","Options","Trace","Connect"] and the specified paths.
     *
     * @param {Path} paths One or more valid route paths
     * @param pipe One or more request handlers
     * @param {RegisterPipelineOptions} options Register pipeline options
     * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
     * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
     * @returns This router instance.
     */
    handleAll<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: RegisterPipelineOptions): Router<ExtendContext>;
    /**
     * Define handlers for CRUD http methods ["Get","Query","Post","Put","Patch","Delete"] and the specified paths.
     *
     * @param {Path} paths One or more valid route paths
     * @param pipe One or more request handlers
     * @param {RegisterPipelineOptions} options Register pipeline options
     * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
     * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
     * @returns This router instance.
     */
    handleCrud<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: RegisterPipelineOptions): Router<ExtendContext>;
    /**
     * Define handlers for Head http method and the specified paths.
     *
     * @param {Path} paths One or more valid route paths
     * @param pipe One or more request handlers
     * @param {RegisterPipelineOptions} options Register pipeline options
     * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
     * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
     * @returns This router instance.
     */
    handleHead<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: RegisterPipelineOptions): Router<ExtendContext>;
    /**
     * Define handlers for Get http method and the specified paths.
     *
     * @param {Path} paths One or more valid route paths
     * @param pipe One or more request handlers
     * @param {RegisterPipelineOptions} options Register pipeline options
     * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
     * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
     * @returns This router instance.
     */
    handleGet<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: RegisterPipelineOptions): Router<ExtendContext>;
    /**
     * Define handlers for Query http method and the specified paths.
     *
     * @param {Path} paths One or more valid route paths
     * @param pipe One or more request handlers
     * @param {RegisterPipelineOptions} options Register pipeline options
     * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
     * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
     * @returns This router instance.
     */
    handleQuery<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: RegisterPipelineOptions): Router<ExtendContext>;
    /**
     * Define handlers for Post http method and the specified paths.
     *
     * @param {Path} paths One or more valid route paths
     * @param pipe One or more request handlers
     * @param {RegisterPipelineOptions} options Register pipeline options
     * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
     * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
     * @returns This router instance.
     */
    handlePost<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: RegisterPipelineOptions): Router<ExtendContext>;
    /**
     * Define handlers for Put http method and the specified paths.
     *
     * @param {Path} paths One or more valid route paths
     * @param pipe One or more request handlers
     * @param {RegisterPipelineOptions} options Register pipeline options
     * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
     * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
     * @returns This router instance.
     */
    handlePut<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: RegisterPipelineOptions): Router<ExtendContext>;
    /**
     * Define handlers for Patch http method and the specified paths.
     *
     * @param {Path} paths One or more valid route paths
     * @param pipe One or more request handlers
     * @param {RegisterPipelineOptions} options Register pipeline options
     * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
     * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
     * @returns This router instance.
     */
    handlePatch<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: RegisterPipelineOptions): Router<ExtendContext>;
    /**
     * Define handlers for Head Delete method and the specified paths.
     *
     * @param {Path} paths One or more valid route paths
     * @param pipe One or more request handlers
     * @param {RegisterPipelineOptions} options Register pipeline options
     * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
     * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
     * @returns This router instance.
     */
    handleDelete<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: RegisterPipelineOptions): Router<ExtendContext>;
    /**
     * Define handlers for Options http method and the specified paths.
     *
     * @param {Path} paths One or more valid route paths
     * @param pipe One or more request handlers
     * @param {RegisterPipelineOptions} options Register pipeline options
     * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
     * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
     * @returns This router instance.
     */
    handleOptions<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: RegisterPipelineOptions): Router<ExtendContext>;
    /**
     * Define handlers for Trace http method and the specified paths.
     *
     * @param {Path} paths One or more valid route paths
     * @param pipe One or more request handlers
     * @param {RegisterPipelineOptions} options Register pipeline options
     * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
     * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
     * @returns This router instance.
     */
    handleTrace<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: RegisterPipelineOptions): Router<ExtendContext>;
    /**
     * Define handlers for Connect http method and the specified paths.
     *
     * @param {Path} paths One or more valid route paths
     * @param pipe One or more request handlers
     * @param {RegisterPipelineOptions} options Register pipeline options
     * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
     * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
     * @returns This router instance.
     */
    handleConnect<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: RegisterPipelineOptions): Router<ExtendContext>;
    /**
     * Define fallbacks for all http methods ["Head","Get","Query","Post","Put","Patch","Delete","Options","Trace","Connect"] and the specified paths.
     *
     * @param {Path} paths One or more valid route paths
     * @param pipe One or more request handlers
     * @param {RegisterPipelineOptions} options Register pipeline options
     * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
     * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
     * @returns This router instance.
     */
    fallbackAll<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: RegisterPipelineOptions): Router<ExtendContext>;
    /**
     * Define fallbacks for CRUD http methods ["Get","Query","Post","Put","Patch","Delete"] and the specified paths.
     *
     * @param {Path} paths One or more valid route paths
     * @param pipe One or more request handlers
     * @param {RegisterPipelineOptions} options Register pipeline options
     * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
     * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
     * @returns This router instance.
     */
    fallbackCrud<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: RegisterPipelineOptions): Router<ExtendContext>;
    /**
     * Define fallbacks for Head http method and the specified paths.
     *
     * @param {Path} paths One or more valid route paths
     * @param pipe One or more request handlers
     * @param {RegisterPipelineOptions} options Register pipeline options
     * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
     * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
     * @returns This router instance.
     */
    fallbackHead<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: RegisterPipelineOptions): Router<ExtendContext>;
    /**
     * Define fallbacks for Get http method and the specified paths.
     *
     * @param {Path} paths One or more valid route paths
     * @param pipe One or more request handlers
     * @param {RegisterPipelineOptions} options Register pipeline options
     * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
     * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
     * @returns This router instance.
     */
    fallbackGet<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: RegisterPipelineOptions): Router<ExtendContext>;
    /**
     * Define fallbacks for Query http method and the specified paths.
     *
     * @param {Path} paths One or more valid route paths
     * @param pipe One or more request handlers
     * @param {RegisterPipelineOptions} options Register pipeline options
     * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
     * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
     * @returns This router instance.
     */
    fallbackQuery<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: RegisterPipelineOptions): Router<ExtendContext>;
    /**
     * Define fallbacks for Post http method and the specified paths.
     *
     * @param {Path} paths One or more valid route paths
     * @param pipe One or more request handlers
     * @param {RegisterPipelineOptions} options Register pipeline options
     * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
     * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
     * @returns This router instance.
     */
    fallbackPost<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: RegisterPipelineOptions): Router<ExtendContext>;
    /**
     * Define fallbacks for Put http method and the specified paths.
     *
     * @param {Path} paths One or more valid route paths
     * @param pipe One or more request handlers
     * @param {RegisterPipelineOptions} options Register pipeline options
     * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
     * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
     * @returns This router instance.
     */
    fallbackPut<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: RegisterPipelineOptions): Router<ExtendContext>;
    /**
     * Define fallbacks for Patch http method and the specified paths.
     *
     * @param {Path} paths One or more valid route paths
     * @param pipe One or more request handlers
     * @param {RegisterPipelineOptions} options Register pipeline options
     * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
     * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
     * @returns This router instance.
     */
    fallbackPatch<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: RegisterPipelineOptions): Router<ExtendContext>;
    /**
     * Define fallbacks for Head Delete method and the specified paths.
     *
     * @param {Path} paths One or more valid route paths
     * @param pipe One or more request handlers
     * @param {RegisterPipelineOptions} options Register pipeline options
     * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
     * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
     * @returns This router instance.
     */
    fallbackDelete<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: RegisterPipelineOptions): Router<ExtendContext>;
    /**
     * Define fallbacks for Options http method and the specified paths.
     *
     * @param {Path} paths One or more valid route paths
     * @param pipe One or more request handlers
     * @param {RegisterPipelineOptions} options Register pipeline options
     * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
     * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
     * @returns This router instance.
     */
    fallbackOptions<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: RegisterPipelineOptions): Router<ExtendContext>;
    /**
     * Define fallbacks for Trace http method and the specified paths.
     *
     * @param {Path} paths One or more valid route paths
     * @param pipe One or more request handlers
     * @param {RegisterPipelineOptions} options Register pipeline options
     * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
     * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
     * @returns This router instance.
     */
    fallbackTrace<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: RegisterPipelineOptions): Router<ExtendContext>;
    /**
     * Define fallbacks for Connect http method and the specified paths.
     *
     * @param {Path} paths One or more valid route paths
     * @param pipe One or more request handlers
     * @param {RegisterPipelineOptions} options Register pipeline options
     * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
     * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
     * @returns This router instance.
     */
    fallbackConnect<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: RegisterPipelineOptions): Router<ExtendContext>;
    /**
     * Define afters for all http methods ["Head","Get","Query","Post","Put","Patch","Delete","Options","Trace","Connect"] and the specified paths.
     *
     * @param {Path} paths One or more valid route paths
     * @param pipe One or more request handlers
     * @param {RegisterPipelineOptions} options Register pipeline options
     * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
     * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
     * @returns This router instance.
     */
    afterAll<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: EndHandler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: RegisterPipelineOptions): Router<ExtendContext>;
    /**
     * Define afters for CRUD http methods ["Get","Query","Post","Put","Patch","Delete"] and the specified paths.
     *
     * @param {Path} paths One or more valid route paths
     * @param pipe One or more request handlers
     * @param {RegisterPipelineOptions} options Register pipeline options
     * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
     * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
     * @returns This router instance.
     */
    afterCrud<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: EndHandler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: RegisterPipelineOptions): Router<ExtendContext>;
    /**
     * Define afters for Head http method and the specified paths.
     *
     * @param {Path} paths One or more valid route paths
     * @param pipe One or more request handlers
     * @param {RegisterPipelineOptions} options Register pipeline options
     * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
     * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
     * @returns This router instance.
     */
    afterHead<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: EndHandler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: RegisterPipelineOptions): Router<ExtendContext>;
    /**
     * Define afters for Get http method and the specified paths.
     *
     * @param {Path} paths One or more valid route paths
     * @param pipe One or more request handlers
     * @param {RegisterPipelineOptions} options Register pipeline options
     * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
     * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
     * @returns This router instance.
     */
    afterGet<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: EndHandler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: RegisterPipelineOptions): Router<ExtendContext>;
    /**
     * Define afters for Query http method and the specified paths.
     *
     * @param {Path} paths One or more valid route paths
     * @param pipe One or more request handlers
     * @param {RegisterPipelineOptions} options Register pipeline options
     * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
     * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
     * @returns This router instance.
     */
    afterQuery<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: EndHandler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: RegisterPipelineOptions): Router<ExtendContext>;
    /**
     * Define afters for Post http method and the specified paths.
     *
     * @param {Path} paths One or more valid route paths
     * @param pipe One or more request handlers
     * @param {RegisterPipelineOptions} options Register pipeline options
     * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
     * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
     * @returns This router instance.
     */
    afterPost<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: EndHandler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: RegisterPipelineOptions): Router<ExtendContext>;
    /**
     * Define afters for Put http method and the specified paths.
     *
     * @param {Path} paths One or more valid route paths
     * @param pipe One or more request handlers
     * @param {RegisterPipelineOptions} options Register pipeline options
     * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
     * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
     * @returns This router instance.
     */
    afterPut<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: EndHandler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: RegisterPipelineOptions): Router<ExtendContext>;
    /**
     * Define afters for Patch http method and the specified paths.
     *
     * @param {Path} paths One or more valid route paths
     * @param pipe One or more request handlers
     * @param {RegisterPipelineOptions} options Register pipeline options
     * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
     * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
     * @returns This router instance.
     */
    afterPatch<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: EndHandler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: RegisterPipelineOptions): Router<ExtendContext>;
    /**
     * Define afters for Head Delete method and the specified paths.
     *
     * @param {Path} paths One or more valid route paths
     * @param pipe One or more request handlers
     * @param {RegisterPipelineOptions} options Register pipeline options
     * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
     * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
     * @returns This router instance.
     */
    afterDelete<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: EndHandler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: RegisterPipelineOptions): Router<ExtendContext>;
    /**
     * Define afters for Options http method and the specified paths.
     *
     * @param {Path} paths One or more valid route paths
     * @param pipe One or more request handlers
     * @param {RegisterPipelineOptions} options Register pipeline options
     * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
     * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
     * @returns This router instance.
     */
    afterOptions<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: EndHandler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: RegisterPipelineOptions): Router<ExtendContext>;
    /**
     * Define afters for Trace http method and the specified paths.
     *
     * @param {Path} paths One or more valid route paths
     * @param pipe One or more request handlers
     * @param {RegisterPipelineOptions} options Register pipeline options
     * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
     * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
     * @returns This router instance.
     */
    afterTrace<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: EndHandler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: RegisterPipelineOptions): Router<ExtendContext>;
    /**
     * Define afters for Connect http method and the specified paths.
     *
     * @param {Path} paths One or more valid route paths
     * @param pipe One or more request handlers
     * @param {RegisterPipelineOptions} options Register pipeline options
     * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
     * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
     * @returns This router instance.
     */
    afterConnect<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: EndHandler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: RegisterPipelineOptions): Router<ExtendContext>;
    /**
     * Define catchers for all http methods ["Head","Get","Query","Post","Put","Patch","Delete","Options","Trace","Connect"] and the specified paths.
     *
     * @param {Path} paths One or more valid route paths
     * @param pipe One or more request handlers
     * @param {RegisterPipelineOptions} options Register pipeline options
     * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
     * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
     * @returns This router instance.
     */
    catchAll<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: ErrorHandler<CTParams<ExtractParams<P>> & CTError & ExtendContext & ExtendContextMore> | ErrorPipe<CTParams<ExtractParams<P>> & CTError & ExtendContext & ExtendContextMore>, options?: RegisterPipelineOptions): Router<ExtendContext>;
    /**
     * Define catchers for CRUD http methods ["Get","Query","Post","Put","Patch","Delete"] and the specified paths.
     *
     * @param {Path} paths One or more valid route paths
     * @param pipe One or more request handlers
     * @param {RegisterPipelineOptions} options Register pipeline options
     * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
     * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
     * @returns This router instance.
     */
    catchCrud<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: ErrorHandler<CTParams<ExtractParams<P>> & CTError & ExtendContext & ExtendContextMore> | ErrorPipe<CTParams<ExtractParams<P>> & CTError & ExtendContext & ExtendContextMore>, options?: RegisterPipelineOptions): Router<ExtendContext>;
    /**
     * Define catchers for Head http method and the specified paths.
     *
     * @param {Path} paths One or more valid route paths
     * @param pipe One or more request handlers
     * @param {RegisterPipelineOptions} options Register pipeline options
     * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
     * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
     * @returns This router instance.
     */
    catchHead<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: ErrorHandler<CTParams<ExtractParams<P>> & CTError & ExtendContext & ExtendContextMore> | ErrorPipe<CTParams<ExtractParams<P>> & CTError & ExtendContext & ExtendContextMore>, options?: RegisterPipelineOptions): Router<ExtendContext>;
    /**
     * Define catchers for Get http method and the specified paths.
     *
     * @param {Path} paths One or more valid route paths
     * @param pipe One or more request handlers
     * @param {RegisterPipelineOptions} options Register pipeline options
     * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
     * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
     * @returns This router instance.
     */
    catchGet<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: ErrorHandler<CTParams<ExtractParams<P>> & CTError & ExtendContext & ExtendContextMore> | ErrorPipe<CTParams<ExtractParams<P>> & CTError & ExtendContext & ExtendContextMore>, options?: RegisterPipelineOptions): Router<ExtendContext>;
    /**
     * Define catchers for Query http method and the specified paths.
     *
     * @param {Path} paths One or more valid route paths
     * @param pipe One or more request handlers
     * @param {RegisterPipelineOptions} options Register pipeline options
     * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
     * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
     * @returns This router instance.
     */
    catchQuery<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: ErrorHandler<CTParams<ExtractParams<P>> & CTError & ExtendContext & ExtendContextMore> | ErrorPipe<CTParams<ExtractParams<P>> & CTError & ExtendContext & ExtendContextMore>, options?: RegisterPipelineOptions): Router<ExtendContext>;
    /**
     * Define catchers for Post http method and the specified paths.
     *
     * @param {Path} paths One or more valid route paths
     * @param pipe One or more request handlers
     * @param {RegisterPipelineOptions} options Register pipeline options
     * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
     * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
     * @returns This router instance.
     */
    catchPost<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: ErrorHandler<CTParams<ExtractParams<P>> & CTError & ExtendContext & ExtendContextMore> | ErrorPipe<CTParams<ExtractParams<P>> & CTError & ExtendContext & ExtendContextMore>, options?: RegisterPipelineOptions): Router<ExtendContext>;
    /**
     * Define catchers for Put http method and the specified paths.
     *
     * @param {Path} paths One or more valid route paths
     * @param pipe One or more request handlers
     * @param {RegisterPipelineOptions} options Register pipeline options
     * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
     * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
     * @returns This router instance.
     */
    catchPut<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: ErrorHandler<CTParams<ExtractParams<P>> & CTError & ExtendContext & ExtendContextMore> | ErrorPipe<CTParams<ExtractParams<P>> & CTError & ExtendContext & ExtendContextMore>, options?: RegisterPipelineOptions): Router<ExtendContext>;
    /**
     * Define catchers for Patch http method and the specified paths.
     *
     * @param {Path} paths One or more valid route paths
     * @param pipe One or more request handlers
     * @param {RegisterPipelineOptions} options Register pipeline options
     * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
     * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
     * @returns This router instance.
     */
    catchPatch<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: ErrorHandler<CTParams<ExtractParams<P>> & CTError & ExtendContext & ExtendContextMore> | ErrorPipe<CTParams<ExtractParams<P>> & CTError & ExtendContext & ExtendContextMore>, options?: RegisterPipelineOptions): Router<ExtendContext>;
    /**
     * Define catchers for Head Delete method and the specified paths.
     *
     * @param {Path} paths One or more valid route paths
     * @param pipe One or more request handlers
     * @param {RegisterPipelineOptions} options Register pipeline options
     * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
     * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
     * @returns This router instance.
     */
    catchDelete<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: ErrorHandler<CTParams<ExtractParams<P>> & CTError & ExtendContext & ExtendContextMore> | ErrorPipe<CTParams<ExtractParams<P>> & CTError & ExtendContext & ExtendContextMore>, options?: RegisterPipelineOptions): Router<ExtendContext>;
    /**
     * Define catchers for Options http method and the specified paths.
     *
     * @param {Path} paths One or more valid route paths
     * @param pipe One or more request handlers
     * @param {RegisterPipelineOptions} options Register pipeline options
     * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
     * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
     * @returns This router instance.
     */
    catchOptions<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: ErrorHandler<CTParams<ExtractParams<P>> & CTError & ExtendContext & ExtendContextMore> | ErrorPipe<CTParams<ExtractParams<P>> & CTError & ExtendContext & ExtendContextMore>, options?: RegisterPipelineOptions): Router<ExtendContext>;
    /**
     * Define catchers for Trace http method and the specified paths.
     *
     * @param {Path} paths One or more valid route paths
     * @param pipe One or more request handlers
     * @param {RegisterPipelineOptions} options Register pipeline options
     * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
     * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
     * @returns This router instance.
     */
    catchTrace<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: ErrorHandler<CTParams<ExtractParams<P>> & CTError & ExtendContext & ExtendContextMore> | ErrorPipe<CTParams<ExtractParams<P>> & CTError & ExtendContext & ExtendContextMore>, options?: RegisterPipelineOptions): Router<ExtendContext>;
    /**
     * Define catchers for Connect http method and the specified paths.
     *
     * @param {Path} paths One or more valid route paths
     * @param pipe One or more request handlers
     * @param {RegisterPipelineOptions} options Register pipeline options
     * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
     * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
     * @returns This router instance.
     */
    catchConnect<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: ErrorHandler<CTParams<ExtractParams<P>> & CTError & ExtendContext & ExtendContextMore> | ErrorPipe<CTParams<ExtractParams<P>> & CTError & ExtendContext & ExtendContextMore>, options?: RegisterPipelineOptions): Router<ExtendContext>;
    /**
     * Define filters for the specified method paths.
     *
     * @param {MethodPath|Array<MethodPath>} methodPaths Method-path definitions in the form of: `Method /Path`, or [`Method /Path`, ...] or [[`Method`, ...], `/Path`, ...]
     * @param pipe One or more request handlers
     * @param {RegisterPipelineOptions} options Register pipeline options
     * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
     * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
     * @returns This router instance.
     */
    filter<ExtendContextMore extends Record<string, unknown> = EmptyRecord>(methodPaths: MethodPath | Array<MethodPath> | [Array<HttpMethod>, ...Array<Path>], pipe: Handler<ExtendContext & ExtendContextMore> | Pipe<ExtendContext & ExtendContextMore>, options?: RegisterPipelineOptions): Router<ExtendContext>;
    /**
     * Define handlers for the specified method paths.
     *
     * @param {MethodPath|Array<MethodPath>} methodPaths Method-path definitions in the form of: `Method /Path`, or [`Method /Path`, ...] or [[`Method`, ...], `/Path`, ...]
     * @param pipe One or more request handlers
     * @param {RegisterPipelineOptions} options Register pipeline options
     * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
     * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
     * @returns This router instance.
     */
    handle<ExtendContextMore extends Record<string, unknown> = EmptyRecord>(methodPaths: MethodPath | Array<MethodPath> | [Array<HttpMethod>, ...Array<Path>], pipe: Handler<ExtendContext & ExtendContextMore> | Pipe<ExtendContext & ExtendContextMore>, options?: RegisterPipelineOptions): Router<ExtendContext>;
    /**
     * Define fallbacks for the specified method paths.
     *
     * @param {MethodPath|Array<MethodPath>} methodPaths Method-path definitions in the form of: `Method /Path`, or [`Method /Path`, ...] or [[`Method`, ...], `/Path`, ...]
     * @param pipe One or more request handlers
     * @param {RegisterPipelineOptions} options Register pipeline options
     * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
     * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
     * @returns This router instance.
     */
    fallback<ExtendContextMore extends Record<string, unknown> = EmptyRecord>(methodPaths: MethodPath | Array<MethodPath> | [Array<HttpMethod>, ...Array<Path>], pipe: Handler<ExtendContext & ExtendContextMore> | Pipe<ExtendContext & ExtendContextMore>, options?: RegisterPipelineOptions): Router<ExtendContext>;
    /**
     * Define afters for the specified method paths.
     *
     * @param {MethodPath|Array<MethodPath>} methodPaths Method-path definitions in the form of: `Method /Path`, or [`Method /Path`, ...] or [[`Method`, ...], `/Path`, ...]
     * @param pipe One or more request handlers
     * @param {RegisterPipelineOptions} options Register pipeline options
     * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
     * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
     * @returns This router instance.
     */
    after<ExtendContextMore extends Record<string, unknown> = EmptyRecord>(methodPaths: MethodPath | Array<MethodPath> | [Array<HttpMethod>, ...Array<Path>], pipe: EndHandler<ExtendContext & ExtendContextMore> | EndPipe<ExtendContext & ExtendContextMore>, options?: RegisterPipelineOptions): Router<ExtendContext>;
    /**
     * Define catchers for the specified method paths.
     *
     * @param {MethodPath|Array<MethodPath>} methodPaths Method-path definitions in the form of: `Method /Path`, or [`Method /Path`, ...] or [[`Method`, ...], `/Path`, ...]
     * @param pipe One or more request handlers
     * @param {RegisterPipelineOptions} options Register pipeline options
     * @param {boolean} [options.overwrite] Overwrite colliding route definitions.
     * @param {OpenApiDesc|false} [options.openApi] OpenApi definition
     * @returns This router instance.
     */
    catch<ExtendContextMore extends Record<string, unknown> = EmptyRecord>(methodPaths: MethodPath | Array<MethodPath> | [Array<HttpMethod>, ...Array<Path>], pipe: ErrorHandler<ExtendContext & ExtendContextMore> | ErrorPipe<ExtendContext & ExtendContextMore>, options?: RegisterPipelineOptions): Router<ExtendContext>;
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
    register(handlerType: HandlerType, methodPaths: MethodPath | Array<MethodPath>, pipe: Handler<ExtendContext> | ErrorHandler<ExtendContext> | EndHandler<ExtendContext> | Pipe<ExtendContext> | ErrorPipe<ExtendContext> | EndPipe<ExtendContext>, options?: RegisterPipelineOptions | RegisterPipelineOptions): Router<ExtendContext>;
    /**
     *
     * @param pathname Valid url pathname
     * @param parts Destination parts array to push path parts to.
     * @param maxPath The max path part count limit.
     * @returns count of path parts if valid.
     * @returns -count if path parts are greater than maxPath.
     */
    splitPath(pathname: string, parts: string[], maxPath: number): number;
}
/**
 * Translate route definition file pathname into valid route pathname.
 *
 * @param pathname The file path name of the route definition.
 * @param maxPath The max path part count limit.
 * @returns {string} Valid route pathname.
 * @throws {RouterError} `Invalid path  ${pathname} -> ${part}` if invalid path encountered.
 * @throws {RouterError} `Max path exceeded` if maxPath is exceeded.
 */
export declare const translateRouteFilePath: (pathname: string, maxPath: number) => string;
export default Router;
//# sourceMappingURL=router.d.ts.map