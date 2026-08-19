import { MimeType } from "./types.ts";
import { DirWalkNode } from "./utils.ts";
export interface GenerateStaticRoutesParams {
    routesPath: string;
    importRoot: string;
    usePathForIdGeneration?: boolean;
    importExtensions?: boolean | {
        (name: string): string;
    };
    pattern?: RegExp;
    dirPattern?: RegExp;
    processName?: (name: string) => string;
    onError?: (error: Error | unknown, node: DirWalkNode) => boolean | void;
}
/**
 * Generate static import for file-structure defined routes.
 * This is useful for integration with frameworks such as Nexts and cloudflare
 * and production in general.
 *
 * @param {object} options Options for static routes import generator. eg. './routes'
 * @param {string} options.routesPath The root path of the routes.
 * @param {string} options.importRoot The import root-prefix to use in the generated imports.
 *   `importRoot: ''` -> `import ... from 'api/index.ts';`
 *   `importRoot: './routes/'` ->  `import ... from './routes/api/index.ts';`
 * @param {boolean} options.usePathForIdGeneration Use transformed path instead of hash for import ids.
 * @param {boolean|{(name:string):string}} options.importExtensions Enable or customize import extensions.
 * @param {RegExp} options.pattern Pattern to match route file names against. Use for filtering.
 * @param {RegExp} options.dirPattern Pattern to match route file parent against.
 *    Use for filtering the route folders.
 *    Note that the parent path matched will not start with `/` and will be relative to `routesPath`.
 * @param {{(name:string):string}} options.processedName Transform route file name. Use to remove custom file extensions.
 *    This should be used in conjunction with `importExtensions`.
 * @param {(error: Error | unknown, node: DirWalkNode) => boolean | void} options.onError Custom error handler. Return true in order to break and stop loading.
 * @returns {string} The generated static import of routes.
 *
 * @example
 *
 * ```
 *  import { generateStaticRoutes } from "@bepalo/spine";
 *  import { hash } from "node:crypto";
 *
 *  await generateStaticRoutes({
 *    routesPath: "./routes",
 *    importRoot: "./routes/",
 *    pattern: /route\.(?:ts|js|mjs)$/, // match only routes ending with .route.ts...
 *    dirPattern: /^api/, // match only routes under ./routes/api
 *    processName: (name) => name.substring(0, name.length - ".route.ts".length),
 *    importExtensions: (name) => name.substring(name.length - ".route.ts".length),
 *  }).then(async (c) => {
 *    const output = "./all-routes.ts";
 *
 *    // update generated import file if the hash changed.
 *    const f = Bun.file(output);
 *    if (await f.exists()) {
 *      if (hash("md5", c, "hex") != hash("md5", await f.text(), "hex")) {
 *        Bun.write(output, c);
 *        console.log(timestamp(), "[SPINE-GEN]", c.length, `'${output}'`);
 *      }
 *    } else {
 *      Bun.write(output, c);
 *      console.log(timestamp(), "[SPINE-GEN]", c.length, `'${output}'`);
 *    }
 *  });
 *  ```
 *
 */
export declare const generateStaticRoutes: ({ routesPath, importRoot, usePathForIdGeneration, importExtensions, pattern, dirPattern, processName, onError, }: GenerateStaticRoutesParams) => Promise<string>;
export type GenerateStaticRoutesWatcherParams = {
    read: (filename: string) => Promise<string> | string;
    write: (filename: string, content: string) => Promise<void | unknown> | void | unknown;
    output: string;
    abortSignal?: AbortSignal;
    generateDelay?: number;
    timestamp?: () => string | number | unknown;
    logger?: (...args: any[]) => unknown;
} & GenerateStaticRoutesParams;
/**
 *
 * @param {object} options Options include `generateStaticRoutes` options too.
 * @param {output} [options.output='./routes.ts'] Output file path. deafult: `'./routes.ts'`
 * @param {number} [options.generateDelay=1000] Time in milliseconds to delay generation on change. default: `1000` -> 1s
 * @param {AbortSignal} options.abortSignal Abort signal.
 * @param {(filename:string)=>Promise<string>|string} options.read Function to read from file.
 * @param {(filename:string,content:string)=>Promise<void|unknown>|void|unknown} options.write Function to write to file.
 * @param {()=>string|number|unknown} options.timestamp Override default log timestamp.
 * @param {(...args:any[])=>unknown} options.logger Override logger.
 *
 * @example
 * generateStaticRoutesWatcher({
 *   routesPath: "./routes",
 *   importRoot: "./routes/",
 *   output: "./routes.ts",
 *   abortSignal: abortController.signal,
 *   read: (filepath) => readFile(filepath, { encoding: "utf-8" }),
 *   write: (filepath, content) =>
 *     writeFile(filepath, content, { encoding: "utf-8" }),
 *   // generateDelay: 1000,
 * });
 *
 */
export declare const generateStaticRoutesWatcher: ({ read, write, abortSignal, generateDelay, output, timestamp, logger, pattern, dirPattern, ...params }: GenerateStaticRoutesWatcherParams) => Promise<void>;
export interface StaticAssetsManifestFile {
    pathname: string;
    name: string;
    ext: string;
    path: string;
    relativePath: string;
    size: number;
    mtime: number;
    contentType: string;
}
export interface StaticAssetsManifest {
    version: string;
    generatedAt: string;
    files: Record<string, StaticAssetsManifestFile>;
}
export interface GenerateStaticAssetsManifestFileInfo {
    name: string;
    ext: string;
    relativePath: string;
    parent: string;
    size: number;
    mtime: number;
    contentType: MimeType;
}
export interface GenerateStaticAssetsParams {
    assetsPath: string;
    sortOrder?: -1 | 1;
    exclude?: (fileInfo: GenerateStaticAssetsManifestFileInfo) => boolean | void;
    transformPathname?: (fileInfo: GenerateStaticAssetsManifestFileInfo) => string;
}
export declare const defaultPathnameTransformer: ({ name, ext, relativePath, }: GenerateStaticAssetsManifestFileInfo) => string;
/**
 * Static assets manifest generator. Primarily intended for use with static file serving.
 *
 * @description Generates an asset manifest of static assets under the given path.
 * It gathers the name, extension, paths, size, modification-time and content-type of the assets.
 *
 * @param {object} options Options for the static assets manifest generator.
 * @param {string} options.assetsPath Root path of the static assets.
 * @param {-1|1|undefined} options.sortOrder Enable and set the sort order of file entries by their pathname.
 * @param {(fileInfo:GenerateStaticAssetsManifestFileInfo)=>boolean|void} options.exclude Function to exclude files. Returning `true` means skip file.
 * @param {(fileInfo: GenerateStaticAssetsManifestFileInfo)=>string} options.transformPathname Override function to transform the pathname.
 * @returns {Promise<StaticAssetsManifest>} The generated static asset manifest.
 *
 * @example
 * generateStaticAssetsManifest({
 *   assetsPath: "./public",
 *   // exclude: ({ name, ext }) => !name || ext === ".private",
 *   // transformPathname: ({ name, parent }) =>
 *   //    name === index && ext == ".html" ? `/${parent}` : `/${parent}/${name}`
 * });
 */
export declare const generateStaticAssetsManifest: ({ assetsPath, sortOrder, exclude, transformPathname, }: GenerateStaticAssetsParams) => Promise<StaticAssetsManifest>;
export type GenerateStaticAssetsManifestWatcherParams = {
    read: (filename: string) => Promise<string> | string;
    write: (filename: string, content: string) => Promise<void | unknown> | void | unknown;
    output: string;
    abortSignal?: AbortSignal;
    generateDelay?: number;
    timestamp?: () => string | number | unknown;
    logger?: (...args: any[]) => unknown;
} & GenerateStaticAssetsParams;
/**
 *
 * @param options Options include `generateStaticAssets` options too.
 * @param {output} [options.output='./static-assets.json'] Output file path. default: `'./static-assets.json'`
 * @param {number} [options.generateDelay=1000] Time in milliseconds to delay generation on change. default: `1000` -> 1s
 * @param {AbortSignal} options.abortSignal Abort signal.
 * @param {(filename:string)=>Promise<string>|string} options.read Function to read from file.
 * @param {(filename:string,content:string)=>Promise<void|unknown>|void|unknown} options.write Function to write to file.
 * @param {()=>string|number|unknown} options.timestamp Override default log timestamp.
 * @param {(...args:any[])=>unknown} options.logger Override logger.
 *
 * @example
 * generateStaticAssetsManifestWatcher({
 *   assetsPath: "./public",
 *   output: "./static-assets.json",
 *   // sortOrder: 1,
 *   // exclude: ({ name, ext }) => !name || ext === ".private",
 *   // generateDelay: 1000,
 *   read: (filepath) => readFile(filepath, { encoding: "utf-8" }),
 *   write: (filepath, content) =>
 *     writeFile(filepath, content, { encoding: "utf-8" }),
 *   abortSignal: abortController.signal,
 * });
 *
 */
export declare const generateStaticAssetsManifestWatcher: ({ read, write, abortSignal, generateDelay, output, timestamp, logger, exclude, ...params }: GenerateStaticAssetsManifestWatcherParams) => Promise<void>;
//# sourceMappingURL=generator.d.ts.map