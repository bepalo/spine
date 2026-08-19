// src/generator.ts

import {
  HandlerRegisterPiplineOptions,
  HandlerType,
  HttpMethod,
  HttpMethodUpper,
  MethodPath,
  MIME_TYPES,
  MimeType,
  Path,
  RouterError,
} from "./types.ts";
import Router, {
  HTTP_METHODS_UPPER,
  HANDLER_TYPES,
  translateRouteFilePath,
} from "./router.ts";
import { walk, dynamicImport } from "./utils.deno.ts";
import { DirWalkNode } from "./utils.ts";
import { watch } from "node:fs/promises";
import { hash } from "node:crypto";
import { stat } from "node:fs/promises";

export interface GenerateStaticRoutesParams {
  routesPath: string;
  importRoot: string;
  usePathForIdGeneration?: boolean;
  importExtensions?: boolean | { (name: string): string };
  pattern?: RegExp;
  dirPattern?: RegExp;
  processName?: (name: string) => string;
  onError?: (error: Error | unknown, node: DirWalkNode) => boolean | void;
}

function getRouteLoaders(
  routerId: string,
  moduleId: string,
  pathname: string,
  module: object,
  importPath: string,
  testRouter: Router,
) {
  let setters = "";
  for (const [methodHandler, def] of Object.entries(module)) {
    // get method and handler type
    const [method_, handlerType_] = methodHandler.split("_", 2);
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
    } else if (HTTP_METHODS_UPPER.has(methodUpper as HttpMethodUpper)) {
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
    }
    const defIsObject = !Array.isArray(def) && typeof def === "object";
    // get pipe and any other options
    const pipe = defIsObject ? (def as any).pipe : def;
    const options: HandlerRegisterPiplineOptions | undefined = defIsObject
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
        (Array.isArray(pipe) && pipe.every((h) => typeof h === "function")) ||
        typeof pipe === "function"
      )
    ) {
      throw new RouterError(
        `Invalid pipe or handler type for \`${methodHandler}\` in '${importPath}'`,
      );
    }
    if (options?.openApi != null && typeof options?.openApi !== "object") {
      throw new RouterError(
        `Invalid openApi type for \`${methodHandler}\` in '${importPath}'`,
      );
    }
    const entryId = `${moduleId}.${methodHandler}`;
    const optionsStr = defIsObject ? `, $O(${entryId})` : "";
    const pipeStr = defIsObject ? `${entryId}.pipe` : entryId;
    switch (handlerType) {
      case "filter":
        testRouter[`filter${method}`](pathname as Path, pipe, options);
        setters += `\n  ${routerId}.filter${method}("${pathname}", ${pipeStr}${optionsStr});`;
        break;
      case "handler":
        testRouter[`handle${method}`](pathname as Path, pipe, options);
        setters += `\n  ${routerId}.handle${method}("${pathname}", ${pipeStr}${optionsStr});`;
        break;
      case "fallback":
        testRouter[`fallback${method}`](pathname as Path, pipe, options);
        setters += `\n  ${routerId}.fallback${method}("${pathname}", ${pipeStr}${optionsStr});`;
        break;
      case "after":
        testRouter[`after${method}`](pathname as Path, pipe, options);
        setters += `\n  ${routerId}.after${method}("${pathname}", ${pipeStr}${optionsStr});`;
        break;
      case "catcher":
        testRouter[`catch${method}`](pathname as Path, pipe, options);
        setters += `\n  ${routerId}.catch${method}("${pathname}", ${pipeStr}${optionsStr});`;
        break;
    }
  }
  return setters;
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
export const generateStaticRoutes = async ({
  routesPath,
  importRoot = "./",
  usePathForIdGeneration = false,
  importExtensions = false,
  pattern = /\.(js|ts|mjs|cjs)$/,
  dirPattern = /.*/,
  processName = (name: string) => name.substring(0, name.lastIndexOf(".")),
  onError,
}: GenerateStaticRoutesParams): Promise<string> => {
  const testRouter = new Router();
  let imports = "";
  let loads = "";
  const prefix = "route";
  const map = new Map<
    string,
    Array<Record<"name" | "pathname" | "importStr" | "loadStr", string>>
  >();
  for await (const node of walk(routesPath)) {
    try {
      const { name, type, relativePath, fullPath, parent, path: _path } = node;
      if (type === "file") {
        if (!pattern.test(node.name)) {
          continue;
        }
        if (!dirPattern.test(node.parent)) {
          continue;
        }
        const processedName = decodeURIComponent(processName(node.name));
        const pureRelativePath = !node.parent
          ? `${processedName}`
          : `${node.parent}/${processedName}`;
        const extension =
          typeof importExtensions === "function"
            ? importExtensions(node.name)
            : importExtensions
              ? relativePath.substring(relativePath.lastIndexOf("."))
              : "";
        let pathname = translateRouteFilePath("/" + pureRelativePath);
        pathname = pureRelativePath.endsWith("/index")
          ? pathname.substring(0, pathname.length - 1)
          : pathname;
        const importName =
          prefix +
          "_" +
          (usePathForIdGeneration
            ? pureRelativePath
                .replace(/\//g, "_")
                .replace(/[^a-zA-Z0-9_]/g, "_")
                .replace(/_+/g, "_")
                .replace(/^_/, "")
                .replace(/_$/, "")
            : hash("md5", pureRelativePath, "base64url").replace(
                /[^a-zA-Z0-9_]/g,
                "_",
              ));
        const importPath = importRoot + pureRelativePath + extension;
        const module = (await dynamicImport(fullPath)) as object;
        const routeDef =
          "  " +
          getRouteLoaders(
            "router",
            importName,
            pathname,
            module,
            _path,
            testRouter,
          );
        const importStr = `import * as ${importName} from "${importPath}";\n`;
        const loadStr = routeDef;
        let entry = map.get("/" + parent);
        if (!entry) {
          entry = [];
          map.set("/" + parent, entry);
        }
        entry.push({ name, pathname, importStr, loadStr });
      }
    } catch (error) {
      if (onError != null) {
        if (onError(error, node)) {
          break;
        }
      } else {
        console.error(node.path, error);
      }
    }
  }
  // append in a sorted order
  map.forEach((e) => e.sort((a, b) => a.pathname.localeCompare(b.pathname)));
  const sortedEntries = Array.from(map.entries()).sort((a, b) =>
    a[0].localeCompare(b[0]),
  );
  for (const [p, es] of sortedEntries) {
    // add group header
    loads += `\n  // ─── ${p} ───`;
    for (const e of es) {
      const { importStr, loadStr } = e;
      imports += importStr;
      loads += loadStr;
    }
  }
  return `// This is auto-generated for static importing of @bepalo/spine file-based routes
import { Router, type PipeDef } from "@bepalo/spine";
${imports}
const $O = <ExtendContext extends Record<string, unknown>>({
  pipe,
  ...options
}: PipeDef<ExtendContext>) => options;

export const setRoutes = async <ExtendContext extends Record<string, unknown>>(
  router: Router<ExtendContext>
) => {${loads}
};\n
// Use this to set the routes in your router
export default setRoutes;
`;
};

export type GenerateStaticRoutesWatcherParams = {
  read: (filename: string) => Promise<string> | string;
  write: (
    filename: string,
    content: string,
  ) => Promise<void | unknown> | void | unknown;
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
export const generateStaticRoutesWatcher = async ({
  read,
  write,
  abortSignal,
  generateDelay = 1000,
  output = "./routes.ts",
  timestamp = () => `${new Date().toLocaleTimeString()}`,
  logger = console.log,
  pattern = /\.(js|ts|mjs|cjs)$/,
  dirPattern = /.*/,
  ...params
}: GenerateStaticRoutesWatcherParams): Promise<void> => {
  let timerId: NodeJS.Timeout | undefined = undefined;
  //
  const gnerateOutput = async () => {
    const newContent = await generateStaticRoutes({
      pattern,
      dirPattern,
      ...params,
    });
    let oldContent = undefined;
    try {
      oldContent = await read(output);
    } catch {}
    if (oldContent == null) {
      await write(output, newContent);
      logger(timestamp(), "[Routes-Watcher]", `Routes generated to ${output}`);
    } else {
      const newHash = hash("md5", newContent, "base64");
      const oldHash = hash("md5", oldContent, "base64");
      if (newHash !== oldHash) {
        await write(output, newContent);
        logger(
          timestamp(),
          "[Routes-Watcher]",
          `Routes generated to ${output}`,
        );
      } else {
        logger(timestamp(), "[Routes-Watcher]", `No change to routes`);
      }
    }
  };
  // intitial generation
  await gnerateOutput();
  try {
    logger(
      timestamp(),
      "[Routes-Watcher]",
      `watching for routes changes under '${params.routesPath}'...`,
    );
    for await (const event of watch(params.routesPath, {
      recursive: true,
      signal: abortSignal,
    })) {
      const eventFilename = event.filename || "";
      const fileSeparatorIdx = eventFilename.lastIndexOf("/");
      const parent = eventFilename.substring(0, fileSeparatorIdx);
      const filename = eventFilename.substring(fileSeparatorIdx + 1);
      if (
        (event.eventType === "change" || event.eventType === "rename") &&
        pattern.test(filename) &&
        dirPattern.test(parent)
      ) {
        logger(
          timestamp(),
          "[Routes-Watcher]",
          `Change Event: "${eventFilename}"`,
        );
        if (timerId == null) {
          timerId = setTimeout(async () => {
            try {
              await gnerateOutput();
            } catch (error) {
              logger(timestamp(), "[Routes-Watcher][Error]", error);
            } finally {
              timerId = undefined;
            }
          }, generateDelay);
        }
      }
    }
  } catch (error) {
    clearTimeout(timerId);
    timerId = undefined;
    if (error instanceof Error) {
      logger(timestamp(), "[Routes-Watcher][Error]", error);
    } else {
      logger(timestamp(), "[Routes-Watcher]", "Watcher aborted");
    }
  }
};

///////////////////////////////////////////////

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
  transformPathname?: (
    fileInfo: GenerateStaticAssetsManifestFileInfo,
  ) => string;
}

export const defaultPathnameTransformer = ({
  name,
  ext,
  relativePath,
}: GenerateStaticAssetsManifestFileInfo) => {
  return [".html", ".htm", ".xhtml", ".xhtm"].includes(ext)
    ? name === "index"
      ? `/${relativePath.substring(0, relativePath.length - ext.length - "/index".length)}`
      : `/${relativePath.substring(0, relativePath.length - ext.length)}`
    : `/${relativePath}`;
};

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
export const generateStaticAssetsManifest = async ({
  assetsPath,
  sortOrder,
  exclude,
  transformPathname = defaultPathnameTransformer,
}: GenerateStaticAssetsParams): Promise<StaticAssetsManifest> => {
  const manifest: StaticAssetsManifest = {
    version: "1",
    generatedAt: new Date().toISOString(),
    files: {},
  };
  const files: Record<string, StaticAssetsManifestFile> = {};
  for await (const node of walk(assetsPath)) {
    if (node.type === "file") {
      const { path, relativePath, parent } = node;
      const extIndex = node.name.lastIndexOf(".");
      const ext = extIndex < 0 ? "" : node.name.substring(extIndex);
      const name =
        extIndex < 0
          ? node.name
          : node.name.substring(0, node.name.length - ext.length);
      // get file stat
      const fst = await stat(node.fullPath);
      const mtime = Math.trunc(fst.mtimeMs);
      const size = fst.size;
      const contentType =
        MIME_TYPES.get(ext.substring(1)) || "application/octet-stream";
      // form fileInfo and check if to exclude
      const fileInfo: GenerateStaticAssetsManifestFileInfo = {
        name,
        ext,
        relativePath,
        parent,
        size,
        mtime,
        contentType,
      };
      if (typeof exclude === "function" && exclude(fileInfo)) {
        continue;
      }
      const pathname = transformPathname(fileInfo);
      // check for collisions
      if (pathname in files) {
        throw new Error(
          `Static Asset pathname collision for '${pathname}' -> '${relativePath}' with '${files[pathname].relativePath}'`,
        );
      }
      files[pathname] = {
        pathname,
        name,
        ext,
        path,
        relativePath,
        contentType,
        mtime,
        size,
      };
    }
  }
  if (sortOrder === undefined) {
    manifest.files = files;
  } else {
    const pred =
      sortOrder < 0
        ? (a: string, b: string) => b.localeCompare(a)
        : (a: string, b: string) => a.localeCompare(b);
    const sortedKeys = Object.keys(files).sort(pred);
    for (const key of sortedKeys) {
      manifest.files[key] = files[key];
    }
  }
  return manifest;
};

export type GenerateStaticAssetsManifestWatcherParams = {
  read: (filename: string) => Promise<string> | string;
  write: (
    filename: string,
    content: string,
  ) => Promise<void | unknown> | void | unknown;
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
export const generateStaticAssetsManifestWatcher = async ({
  read,
  write,
  abortSignal,
  generateDelay = 1000,
  output = "./static-assets.json",
  timestamp = () => `${new Date().toLocaleTimeString()}`,
  logger = console.log,
  exclude,
  ...params
}: GenerateStaticAssetsManifestWatcherParams): Promise<void> => {
  let timerId: NodeJS.Timeout | undefined = undefined;
  //
  const gnerateOutput = async () => {
    const staticAssetsManifest = await generateStaticAssetsManifest({
      exclude,
      ...params,
    });
    const newContentFiles = JSON.stringify(staticAssetsManifest.files);
    const newContent = JSON.stringify(staticAssetsManifest, null, 2);
    let oldContent = undefined;
    let oldContentFiles = undefined;
    try {
      oldContent = await read(output);
      try {
        oldContentFiles = JSON.stringify(JSON.parse(oldContent)?.files);
      } catch {
        oldContent = undefined;
      }
    } catch {}
    if (oldContent == null || oldContentFiles == null) {
      await write(output, newContent);
      logger(
        timestamp(),
        "[Static-Assets-Watcher]",
        `Manifest generated to ${output}`,
      );
    } else {
      const newHash = hash("md5", newContentFiles, "base64");
      const oldHash = hash("md5", oldContentFiles, "base64");
      if (newHash !== oldHash) {
        await write(output, newContent);
        logger(
          timestamp(),
          "[Static-Assets-Watcher]",
          `Manifest generated to ${output}`,
        );
      } else {
        logger(timestamp(), "[Static-Assets-Watcher]", `No change to manifest`);
      }
    }
  };
  // intitial generation
  await gnerateOutput();
  try {
    logger(
      timestamp(),
      "[Static-Assets-Watcher]",
      `watching for routes changes under '${params.assetsPath}'...`,
    );
    for await (const event of watch(params.assetsPath, {
      recursive: true,
      signal: abortSignal,
    })) {
      if (event.eventType === "rename") {
        const relativePath = event.filename || "";
        if (exclude !== undefined) {
          const path = params.assetsPath + "/" + relativePath;
          const fileSeparatorIdx = relativePath.lastIndexOf("/");
          const parent = relativePath.substring(0, fileSeparatorIdx);
          const filename = relativePath.substring(fileSeparatorIdx + 1);
          const extIndex = filename.lastIndexOf(".");
          const ext = extIndex < 0 ? "" : filename.substring(extIndex);
          const name =
            extIndex < 0
              ? filename
              : filename.substring(0, filename.length - ext.length);
          // get file stat
          const fst = await stat(path).catch(() => ({
            mtimeMs: 0,
            size: 0,
          }));
          const mtime = Math.trunc(fst.mtimeMs);
          const size = fst.size;
          const contentType =
            MIME_TYPES.get(ext.substring(1)) || "application/octet-stream";
          const fileInfo: GenerateStaticAssetsManifestFileInfo = {
            name,
            ext,
            relativePath,
            parent,
            size,
            mtime,
            contentType,
          };
          if (exclude(fileInfo)) {
            continue;
          }
        }
        logger(
          timestamp(),
          "[Static-Assets-Watcher]",
          `File Event: "${relativePath}"`,
        );
        if (timerId == null) {
          timerId = setTimeout(async () => {
            try {
              await gnerateOutput();
            } catch (error) {
              logger(timestamp(), "[Static-Assets-Watcher][Error]", error);
            } finally {
              timerId = undefined;
            }
          }, generateDelay);
        }
      }
    }
  } catch (error) {
    clearTimeout(timerId);
    timerId = undefined;
    if (error instanceof Error) {
      logger(timestamp(), "[Static-Assets-Watcher][Error]", error);
    } else {
      logger(timestamp(), "[Static-Assets-Watcher]", "Watcher aborted");
    }
  }
};
