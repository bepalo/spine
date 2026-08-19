"use strict";
// src/generator.ts
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateStaticAssetsManifestWatcher = exports.generateStaticAssetsManifest = exports.defaultPathnameTransformer = exports.generateStaticRoutesWatcher = exports.generateStaticRoutes = void 0;
const types_ts_1 = require("./types.js");
const router_ts_1 = __importStar(require("./router.js"));
const utils_node_ts_1 = require("./utils.node.js");
const promises_1 = require("node:fs/promises");
const node_crypto_1 = require("node:crypto");
const promises_2 = require("node:fs/promises");
function getRouteLoaders(routerId, moduleId, pathname, module, importPath, testRouter) {
    let setters = "";
    for (const [methodHandler, def] of Object.entries(module)) {
        // get method and handler type
        const [method_, handlerType_] = methodHandler.split("_", 2);
        let method;
        let handlerType = "handler";
        const methodUpper = method_.toUpperCase();
        if (methodUpper === "ALL") {
            method = "All";
        }
        else if (methodUpper === "CRUD") {
            method = "Crud";
        }
        else if (router_ts_1.HTTP_METHODS_UPPER.has(methodUpper)) {
            method = (method_.charAt(0).toUpperCase() +
                method_.substring(1).toLowerCase());
        }
        else {
            continue;
        }
        if (handlerType_ &&
            router_ts_1.HANDLER_TYPES.has(handlerType_.toLowerCase())) {
            handlerType = handlerType_.toLowerCase();
        }
        const defIsObject = !Array.isArray(def) && typeof def === "object";
        // get pipe and any other options
        const pipe = defIsObject ? def.pipe : def;
        const options = defIsObject
            ? {}
            : undefined;
        if (options != null) {
            options.openApi = def.openApi;
            options.overwrite = def.overwrite;
        }
        if ((options === null || options === void 0 ? void 0 : options.openApi) != null && handlerType !== "handler") {
            console.warn(`OpenApi definition will be ignored for \`${methodHandler}\` in '${importPath}'`);
        }
        if (pipe == null) {
            throw new types_ts_1.RouterError(`Undefined pipe for \`${methodHandler}\` in '${importPath}'`);
        }
        if (!((Array.isArray(pipe) && pipe.every((h) => typeof h === "function")) ||
            typeof pipe === "function")) {
            throw new types_ts_1.RouterError(`Invalid pipe or handler type for \`${methodHandler}\` in '${importPath}'`);
        }
        if ((options === null || options === void 0 ? void 0 : options.openApi) != null && typeof (options === null || options === void 0 ? void 0 : options.openApi) !== "object") {
            throw new types_ts_1.RouterError(`Invalid openApi type for \`${methodHandler}\` in '${importPath}'`);
        }
        const entryId = `${moduleId}.${methodHandler}`;
        const optionsStr = defIsObject ? `, $O(${entryId})` : "";
        const pipeStr = defIsObject ? `${entryId}.pipe` : entryId;
        switch (handlerType) {
            case "filter":
                testRouter[`filter${method}`](pathname, pipe, options);
                setters += `\n  ${routerId}.filter${method}("${pathname}", ${pipeStr}${optionsStr});`;
                break;
            case "handler":
                testRouter[`handle${method}`](pathname, pipe, options);
                setters += `\n  ${routerId}.handle${method}("${pathname}", ${pipeStr}${optionsStr});`;
                break;
            case "fallback":
                testRouter[`fallback${method}`](pathname, pipe, options);
                setters += `\n  ${routerId}.fallback${method}("${pathname}", ${pipeStr}${optionsStr});`;
                break;
            case "after":
                testRouter[`after${method}`](pathname, pipe, options);
                setters += `\n  ${routerId}.after${method}("${pathname}", ${pipeStr}${optionsStr});`;
                break;
            case "catcher":
                testRouter[`catch${method}`](pathname, pipe, options);
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
const generateStaticRoutes = (_a) => __awaiter(void 0, [_a], void 0, function* ({ routesPath, importRoot = "./", usePathForIdGeneration = false, importExtensions = false, pattern = /\.(js|ts|mjs|cjs)$/, dirPattern = /.*/, processName = (name) => name.substring(0, name.lastIndexOf(".")), onError, }) {
    var _b, e_1, _c, _d;
    const testRouter = new router_ts_1.default();
    let imports = "";
    let loads = "";
    const prefix = "route";
    const map = new Map();
    try {
        for (var _e = true, _f = __asyncValues((0, utils_node_ts_1.walk)(routesPath)), _g; _g = yield _f.next(), _b = _g.done, !_b; _e = true) {
            _d = _g.value;
            _e = false;
            const node = _d;
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
                    const extension = typeof importExtensions === "function"
                        ? importExtensions(node.name)
                        : importExtensions
                            ? relativePath.substring(relativePath.lastIndexOf("."))
                            : "";
                    let pathname = (0, router_ts_1.translateRouteFilePath)("/" + pureRelativePath);
                    pathname = pureRelativePath.endsWith("/index")
                        ? pathname.substring(0, pathname.length - 1)
                        : pathname;
                    const importName = prefix +
                        "_" +
                        (usePathForIdGeneration
                            ? pureRelativePath
                                .replace(/\//g, "_")
                                .replace(/[^a-zA-Z0-9_]/g, "_")
                                .replace(/_+/g, "_")
                                .replace(/^_/, "")
                                .replace(/_$/, "")
                            : (0, node_crypto_1.hash)("md5", pureRelativePath, "base64url").replace(/[^a-zA-Z0-9_]/g, "_"));
                    const importPath = importRoot + pureRelativePath + extension;
                    const module = (yield (0, utils_node_ts_1.dynamicImport)(fullPath));
                    const routeDef = "  " +
                        getRouteLoaders("router", importName, pathname, module, _path, testRouter);
                    const importStr = `import * as ${importName} from "${importPath}";\n`;
                    const loadStr = routeDef;
                    let entry = map.get("/" + parent);
                    if (!entry) {
                        entry = [];
                        map.set("/" + parent, entry);
                    }
                    entry.push({ name, pathname, importStr, loadStr });
                }
            }
            catch (error) {
                if (onError != null) {
                    if (onError(error, node)) {
                        break;
                    }
                }
                else {
                    console.error(node.path, error);
                }
            }
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (!_e && !_b && (_c = _f.return)) yield _c.call(_f);
        }
        finally { if (e_1) throw e_1.error; }
    }
    // append in a sorted order
    map.forEach((e) => e.sort((a, b) => a.pathname.localeCompare(b.pathname)));
    const sortedEntries = Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
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
});
exports.generateStaticRoutes = generateStaticRoutes;
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
const generateStaticRoutesWatcher = (_a) => __awaiter(void 0, void 0, void 0, function* () {
    var _b, e_2, _c, _d;
    var { read, write, abortSignal, generateDelay = 1000, output = "./routes.ts", timestamp = () => `${new Date().toLocaleTimeString()}`, logger = console.log, pattern = /\.(js|ts|mjs|cjs)$/, dirPattern = /.*/ } = _a, params = __rest(_a, ["read", "write", "abortSignal", "generateDelay", "output", "timestamp", "logger", "pattern", "dirPattern"]);
    let timerId = undefined;
    //
    const gnerateOutput = () => __awaiter(void 0, void 0, void 0, function* () {
        const newContent = yield (0, exports.generateStaticRoutes)(Object.assign({ pattern,
            dirPattern }, params));
        let oldContent = undefined;
        try {
            oldContent = yield read(output);
        }
        catch (_a) { }
        if (oldContent == null) {
            yield write(output, newContent);
            logger(timestamp(), "[Routes-Watcher]", `Routes generated to ${output}`);
        }
        else {
            const newHash = (0, node_crypto_1.hash)("md5", newContent, "base64");
            const oldHash = (0, node_crypto_1.hash)("md5", oldContent, "base64");
            if (newHash !== oldHash) {
                yield write(output, newContent);
                logger(timestamp(), "[Routes-Watcher]", `Routes generated to ${output}`);
            }
            else {
                logger(timestamp(), "[Routes-Watcher]", `No change to routes`);
            }
        }
    });
    // intitial generation
    yield gnerateOutput();
    try {
        logger(timestamp(), "[Routes-Watcher]", `watching for routes changes under '${params.routesPath}'...`);
        try {
            for (var _e = true, _f = __asyncValues((0, promises_1.watch)(params.routesPath, {
                recursive: true,
                signal: abortSignal,
            })), _g; _g = yield _f.next(), _b = _g.done, !_b; _e = true) {
                _d = _g.value;
                _e = false;
                const event = _d;
                const eventFilename = event.filename || "";
                const fileSeparatorIdx = eventFilename.lastIndexOf("/");
                const parent = eventFilename.substring(0, fileSeparatorIdx);
                const filename = eventFilename.substring(fileSeparatorIdx + 1);
                if ((event.eventType === "change" || event.eventType === "rename") &&
                    pattern.test(filename) &&
                    dirPattern.test(parent)) {
                    logger(timestamp(), "[Routes-Watcher]", `Change Event: "${eventFilename}"`);
                    if (timerId == null) {
                        timerId = setTimeout(() => __awaiter(void 0, void 0, void 0, function* () {
                            try {
                                yield gnerateOutput();
                            }
                            catch (error) {
                                logger(timestamp(), "[Routes-Watcher][Error]", error);
                            }
                            finally {
                                timerId = undefined;
                            }
                        }), generateDelay);
                    }
                }
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (!_e && !_b && (_c = _f.return)) yield _c.call(_f);
            }
            finally { if (e_2) throw e_2.error; }
        }
    }
    catch (error) {
        clearTimeout(timerId);
        timerId = undefined;
        if (error instanceof Error) {
            logger(timestamp(), "[Routes-Watcher][Error]", error);
        }
        else {
            logger(timestamp(), "[Routes-Watcher]", "Watcher aborted");
        }
    }
});
exports.generateStaticRoutesWatcher = generateStaticRoutesWatcher;
const defaultPathnameTransformer = ({ name, ext, relativePath, }) => {
    return [".html", ".htm", ".xhtml", ".xhtm"].includes(ext)
        ? name === "index"
            ? `/${relativePath.substring(0, relativePath.length - ext.length - "/index".length)}`
            : `/${relativePath.substring(0, relativePath.length - ext.length)}`
        : `/${relativePath}`;
};
exports.defaultPathnameTransformer = defaultPathnameTransformer;
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
const generateStaticAssetsManifest = (_a) => __awaiter(void 0, [_a], void 0, function* ({ assetsPath, sortOrder, exclude, transformPathname = exports.defaultPathnameTransformer, }) {
    var _b, e_3, _c, _d;
    const manifest = {
        version: "1",
        generatedAt: new Date().toISOString(),
        files: {},
    };
    const files = {};
    try {
        for (var _e = true, _f = __asyncValues((0, utils_node_ts_1.walk)(assetsPath)), _g; _g = yield _f.next(), _b = _g.done, !_b; _e = true) {
            _d = _g.value;
            _e = false;
            const node = _d;
            if (node.type === "file") {
                const { path, relativePath, parent } = node;
                const extIndex = node.name.lastIndexOf(".");
                const ext = extIndex < 0 ? "" : node.name.substring(extIndex);
                const name = extIndex < 0
                    ? node.name
                    : node.name.substring(0, node.name.length - ext.length);
                // get file stat
                const fst = yield (0, promises_2.stat)(node.fullPath);
                const mtime = Math.trunc(fst.mtimeMs);
                const size = fst.size;
                const contentType = types_ts_1.MIME_TYPES.get(ext.substring(1)) || "application/octet-stream";
                // form fileInfo and check if to exclude
                const fileInfo = {
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
                    throw new Error(`Static Asset pathname collision for '${pathname}' -> '${relativePath}' with '${files[pathname].relativePath}'`);
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
    }
    catch (e_3_1) { e_3 = { error: e_3_1 }; }
    finally {
        try {
            if (!_e && !_b && (_c = _f.return)) yield _c.call(_f);
        }
        finally { if (e_3) throw e_3.error; }
    }
    if (sortOrder === undefined) {
        manifest.files = files;
    }
    else {
        const pred = sortOrder < 0
            ? (a, b) => b.localeCompare(a)
            : (a, b) => a.localeCompare(b);
        const sortedKeys = Object.keys(files).sort(pred);
        for (const key of sortedKeys) {
            manifest.files[key] = files[key];
        }
    }
    return manifest;
});
exports.generateStaticAssetsManifest = generateStaticAssetsManifest;
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
const generateStaticAssetsManifestWatcher = (_a) => __awaiter(void 0, void 0, void 0, function* () {
    var _b, e_4, _c, _d;
    var { read, write, abortSignal, generateDelay = 1000, output = "./static-assets.json", timestamp = () => `${new Date().toLocaleTimeString()}`, logger = console.log, exclude } = _a, params = __rest(_a, ["read", "write", "abortSignal", "generateDelay", "output", "timestamp", "logger", "exclude"]);
    let timerId = undefined;
    //
    const gnerateOutput = () => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        const staticAssetsManifest = yield (0, exports.generateStaticAssetsManifest)(Object.assign({ exclude }, params));
        const newContentFiles = JSON.stringify(staticAssetsManifest.files);
        const newContent = JSON.stringify(staticAssetsManifest, null, 2);
        let oldContent = undefined;
        let oldContentFiles = undefined;
        try {
            oldContent = yield read(output);
            try {
                oldContentFiles = JSON.stringify((_a = JSON.parse(oldContent)) === null || _a === void 0 ? void 0 : _a.files);
            }
            catch (_b) {
                oldContent = undefined;
            }
        }
        catch (_c) { }
        if (oldContent == null || oldContentFiles == null) {
            yield write(output, newContent);
            logger(timestamp(), "[Static-Assets-Watcher]", `Manifest generated to ${output}`);
        }
        else {
            const newHash = (0, node_crypto_1.hash)("md5", newContentFiles, "base64");
            const oldHash = (0, node_crypto_1.hash)("md5", oldContentFiles, "base64");
            if (newHash !== oldHash) {
                yield write(output, newContent);
                logger(timestamp(), "[Static-Assets-Watcher]", `Manifest generated to ${output}`);
            }
            else {
                logger(timestamp(), "[Static-Assets-Watcher]", `No change to manifest`);
            }
        }
    });
    // intitial generation
    yield gnerateOutput();
    try {
        logger(timestamp(), "[Static-Assets-Watcher]", `watching for routes changes under '${params.assetsPath}'...`);
        try {
            for (var _e = true, _f = __asyncValues((0, promises_1.watch)(params.assetsPath, {
                recursive: true,
                signal: abortSignal,
            })), _g; _g = yield _f.next(), _b = _g.done, !_b; _e = true) {
                _d = _g.value;
                _e = false;
                const event = _d;
                if (event.eventType === "rename") {
                    const relativePath = event.filename || "";
                    if (exclude !== undefined) {
                        const path = params.assetsPath + "/" + relativePath;
                        const fileSeparatorIdx = relativePath.lastIndexOf("/");
                        const parent = relativePath.substring(0, fileSeparatorIdx);
                        const filename = relativePath.substring(fileSeparatorIdx + 1);
                        const extIndex = filename.lastIndexOf(".");
                        const ext = extIndex < 0 ? "" : filename.substring(extIndex);
                        const name = extIndex < 0
                            ? filename
                            : filename.substring(0, filename.length - ext.length);
                        // get file stat
                        const fst = yield (0, promises_2.stat)(path).catch(() => ({
                            mtimeMs: 0,
                            size: 0,
                        }));
                        const mtime = Math.trunc(fst.mtimeMs);
                        const size = fst.size;
                        const contentType = types_ts_1.MIME_TYPES.get(ext.substring(1)) || "application/octet-stream";
                        const fileInfo = {
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
                    logger(timestamp(), "[Static-Assets-Watcher]", `File Event: "${relativePath}"`);
                    if (timerId == null) {
                        timerId = setTimeout(() => __awaiter(void 0, void 0, void 0, function* () {
                            try {
                                yield gnerateOutput();
                            }
                            catch (error) {
                                logger(timestamp(), "[Static-Assets-Watcher][Error]", error);
                            }
                            finally {
                                timerId = undefined;
                            }
                        }), generateDelay);
                    }
                }
            }
        }
        catch (e_4_1) { e_4 = { error: e_4_1 }; }
        finally {
            try {
                if (!_e && !_b && (_c = _f.return)) yield _c.call(_f);
            }
            finally { if (e_4) throw e_4.error; }
        }
    }
    catch (error) {
        clearTimeout(timerId);
        timerId = undefined;
        if (error instanceof Error) {
            logger(timestamp(), "[Static-Assets-Watcher][Error]", error);
        }
        else {
            logger(timestamp(), "[Static-Assets-Watcher]", "Watcher aborted");
        }
    }
});
exports.generateStaticAssetsManifestWatcher = generateStaticAssetsManifestWatcher;
//# sourceMappingURL=generator.js.map