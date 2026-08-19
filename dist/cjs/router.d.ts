import { ExtractParams, HttpError, type CTError, type CTResponse, type EmptyRecord, type Handler, type HandlerRegisterPiplineOptions, type HandlerType, type HttpMethod, type HttpMethodUpper, type MethodPath, type Path, type Pipe, type RegisterPiplineOptions, type RespondContext, type RouterConfig, GenerateOpenApiInfo, GenerateOpenAPIOptions, GeneratedOpenApi } from "./types.ts";
import { CTParams } from "./parsers.ts";
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
    constructor(config?: Omit<RouterConfig<ExtendContext>, "maxPath"> & Partial<Pick<RouterConfig<ExtendContext>, "maxPath">>);
    respond(request: Request, ctxInit?: Omit<RespondContext<ExtendContext>, "router">): Promise<Response>;
    load({ routesPath, pattern, dirPattern, processName, }: {
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
     *   - Recieves two `GenerateOpenAPISortParam` parameters: `{ method, path, parts, tags }`
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
    all<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: P | Array<P>, pipe: Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: RegisterPiplineOptions): Router<ExtendContext>;
    crud<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: RegisterPiplineOptions): Router<ExtendContext>;
    head<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: RegisterPiplineOptions): Router<ExtendContext>;
    get<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: HandlerRegisterPiplineOptions): Router<ExtendContext>;
    post<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: HandlerRegisterPiplineOptions): Router<ExtendContext>;
    put<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: HandlerRegisterPiplineOptions): Router<ExtendContext>;
    patch<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: HandlerRegisterPiplineOptions): Router<ExtendContext>;
    delete<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: HandlerRegisterPiplineOptions): Router<ExtendContext>;
    options<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: HandlerRegisterPiplineOptions): Router<ExtendContext>;
    trace<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: HandlerRegisterPiplineOptions): Router<ExtendContext>;
    connect<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: HandlerRegisterPiplineOptions): Router<ExtendContext>;
    filterAll<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: RegisterPiplineOptions): Router<ExtendContext>;
    filterCrud<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: RegisterPiplineOptions): Router<ExtendContext>;
    filterHead<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: RegisterPiplineOptions): Router<ExtendContext>;
    filterGet<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: RegisterPiplineOptions): Router<ExtendContext>;
    filterPost<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: RegisterPiplineOptions): Router<ExtendContext>;
    filterPut<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: RegisterPiplineOptions): Router<ExtendContext>;
    filterPatch<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: RegisterPiplineOptions): Router<ExtendContext>;
    filterDelete<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: RegisterPiplineOptions): Router<ExtendContext>;
    filterOptions<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: RegisterPiplineOptions): Router<ExtendContext>;
    filterTrace<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: RegisterPiplineOptions): Router<ExtendContext>;
    filterConnect<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: RegisterPiplineOptions): Router<ExtendContext>;
    handleAll<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: RegisterPiplineOptions): Router<ExtendContext>;
    handleCrud<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: RegisterPiplineOptions): Router<ExtendContext>;
    handleHead<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: HandlerRegisterPiplineOptions): Router<ExtendContext>;
    handleGet<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: HandlerRegisterPiplineOptions): Router<ExtendContext>;
    handlePost<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: HandlerRegisterPiplineOptions): Router<ExtendContext>;
    handlePut<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: HandlerRegisterPiplineOptions): Router<ExtendContext>;
    handlePatch<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: HandlerRegisterPiplineOptions): Router<ExtendContext>;
    handleDelete<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: HandlerRegisterPiplineOptions): Router<ExtendContext>;
    handleOptions<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: HandlerRegisterPiplineOptions): Router<ExtendContext>;
    handleTrace<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: HandlerRegisterPiplineOptions): Router<ExtendContext>;
    handleConnect<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: HandlerRegisterPiplineOptions): Router<ExtendContext>;
    fallbackAll<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: RegisterPiplineOptions): Router<ExtendContext>;
    fallbackCrud<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: RegisterPiplineOptions): Router<ExtendContext>;
    fallbackHead<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: RegisterPiplineOptions): Router<ExtendContext>;
    fallbackGet<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: RegisterPiplineOptions): Router<ExtendContext>;
    fallbackPost<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: RegisterPiplineOptions): Router<ExtendContext>;
    fallbackPut<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: RegisterPiplineOptions): Router<ExtendContext>;
    fallbackPatch<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: RegisterPiplineOptions): Router<ExtendContext>;
    fallbackDelete<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: RegisterPiplineOptions): Router<ExtendContext>;
    fallbackOptions<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: RegisterPiplineOptions): Router<ExtendContext>;
    fallbackTrace<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: RegisterPiplineOptions): Router<ExtendContext>;
    fallbackConnect<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & ExtendContext & ExtendContextMore>, options?: RegisterPiplineOptions): Router<ExtendContext>;
    afterAll<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & CTResponse & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & CTResponse & ExtendContext & ExtendContextMore>, options?: RegisterPiplineOptions): Router<ExtendContext>;
    afterCrud<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & CTResponse & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & CTResponse & ExtendContext & ExtendContextMore>, options?: RegisterPiplineOptions): Router<ExtendContext>;
    afterHead<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & CTResponse & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & CTResponse & ExtendContext & ExtendContextMore>, options?: RegisterPiplineOptions): Router<ExtendContext>;
    afterGet<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & CTResponse & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & CTResponse & ExtendContext & ExtendContextMore>, options?: RegisterPiplineOptions): Router<ExtendContext>;
    afterPost<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & CTResponse & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & CTResponse & ExtendContext & ExtendContextMore>, options?: RegisterPiplineOptions): Router<ExtendContext>;
    afterPut<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & CTResponse & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & CTResponse & ExtendContext & ExtendContextMore>, options?: RegisterPiplineOptions): Router<ExtendContext>;
    afterPatch<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & CTResponse & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & CTResponse & ExtendContext & ExtendContextMore>, options?: RegisterPiplineOptions): Router<ExtendContext>;
    afterDelete<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & CTResponse & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & CTResponse & ExtendContext & ExtendContextMore>, options?: RegisterPiplineOptions): Router<ExtendContext>;
    afterOptions<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & CTResponse & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & CTResponse & ExtendContext & ExtendContextMore>, options?: RegisterPiplineOptions): Router<ExtendContext>;
    afterTrace<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & CTResponse & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & CTResponse & ExtendContext & ExtendContextMore>, options?: RegisterPiplineOptions): Router<ExtendContext>;
    afterConnect<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & CTResponse & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & CTResponse & ExtendContext & ExtendContextMore>, options?: RegisterPiplineOptions): Router<ExtendContext>;
    catchAll<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & CTError & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & CTError & ExtendContext & ExtendContextMore>, options?: RegisterPiplineOptions): Router<ExtendContext>;
    catchCrud<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & CTError & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & CTError & ExtendContext & ExtendContextMore>, options?: RegisterPiplineOptions): Router<ExtendContext>;
    catchHead<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & CTError & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & CTError & ExtendContext & ExtendContextMore>, options?: RegisterPiplineOptions): Router<ExtendContext>;
    catchGet<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & CTError & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & CTError & ExtendContext & ExtendContextMore>, options?: RegisterPiplineOptions): Router<ExtendContext>;
    catchPost<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & CTError & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & CTError & ExtendContext & ExtendContextMore>, options?: RegisterPiplineOptions): Router<ExtendContext>;
    catchPut<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & CTError & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & CTError & ExtendContext & ExtendContextMore>, options?: RegisterPiplineOptions): Router<ExtendContext>;
    catchPatch<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & CTError & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & CTError & ExtendContext & ExtendContextMore>, options?: RegisterPiplineOptions): Router<ExtendContext>;
    catchDelete<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & CTError & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & CTError & ExtendContext & ExtendContextMore>, options?: RegisterPiplineOptions): Router<ExtendContext>;
    catchOptions<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & CTError & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & CTError & ExtendContext & ExtendContextMore>, options?: RegisterPiplineOptions): Router<ExtendContext>;
    catchTrace<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & CTError & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & CTError & ExtendContext & ExtendContextMore>, options?: RegisterPiplineOptions): Router<ExtendContext>;
    catchConnect<ExtendContextMore extends Record<string, unknown> = EmptyRecord, P extends Path = Path>(paths: Path | Array<Path>, pipe: Handler<CTParams<ExtractParams<P>> & CTError & ExtendContext & ExtendContextMore> | Pipe<CTParams<ExtractParams<P>> & CTError & ExtendContext & ExtendContextMore>, options?: RegisterPiplineOptions): Router<ExtendContext>;
    filter<ExtendContextMore extends Record<string, unknown> = EmptyRecord>(methodPaths: MethodPath | Array<MethodPath> | [Array<HttpMethod>, ...Array<Path>], pipe: Handler<ExtendContext & ExtendContextMore> | Pipe<ExtendContext & ExtendContextMore>, options?: RegisterPiplineOptions): Router<ExtendContext>;
    handle<ExtendContextMore extends Record<string, unknown> = EmptyRecord>(methodPaths: MethodPath | Array<MethodPath> | [Array<HttpMethod>, ...Array<Path>], pipe: Handler<ExtendContext & ExtendContextMore> | Pipe<ExtendContext & ExtendContextMore>, options?: HandlerRegisterPiplineOptions): Router<ExtendContext>;
    fallback<ExtendContextMore extends Record<string, unknown> = EmptyRecord>(methodPaths: MethodPath | Array<MethodPath> | [Array<HttpMethod>, ...Array<Path>], pipe: Handler<ExtendContext & ExtendContextMore> | Pipe<ExtendContext & ExtendContextMore>, options?: RegisterPiplineOptions): Router<ExtendContext>;
    after<ExtendContextMore extends Record<string, unknown> = EmptyRecord>(methodPaths: MethodPath | Array<MethodPath> | [Array<HttpMethod>, ...Array<Path>], pipe: Handler<ExtendContext & ExtendContextMore> | Pipe<ExtendContext & ExtendContextMore>, options?: RegisterPiplineOptions): Router<ExtendContext>;
    catch<ExtendContextMore extends Record<string, unknown> = EmptyRecord>(methodPaths: MethodPath | Array<MethodPath> | [Array<HttpMethod>, ...Array<Path>], pipe: Handler<ExtendContext & ExtendContextMore & {
        error: Error | HttpError;
    }> | Pipe<ExtendContext & ExtendContextMore & {
        error: Error | HttpError;
    }>, options?: RegisterPiplineOptions): Router<ExtendContext>;
    register(handlerType: HandlerType, methodPaths: MethodPath | Array<MethodPath>, pipe: Handler<ExtendContext & {
        error: Error | HttpError;
    }> | Pipe<ExtendContext & {
        error: Error | HttpError;
    }>, options?: RegisterPiplineOptions | HandlerRegisterPiplineOptions): Router<ExtendContext>;
    splitPath(pathname: string, parts: string[], maxPath: number): number;
}
export declare const translateRouteFilePath: (pathname: string, maxPath?: number) => string;
export default Router;
//# sourceMappingURL=router.d.ts.map