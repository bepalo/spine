"use strict";
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
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateStaticRoutesImporter = void 0;
const types_ts_1 = require("./types.js");
const router_ts_1 = __importStar(require("./router.js"));
const utils_node_ts_1 = require("./utils.node.js");
const node_crypto_1 = require("node:crypto");
function getRouteLoaders(routerId, moduleId, pathname, module, importPath, testRouter) {
    let setters = "";
    for (const [methodHandler, def] of Object.entries(module)) {
        // get method and handler type
        const [method_, handlerType_] = methodHandler.split("_", 2);
        let method;
        let handlerType = "handler";
        if (router_ts_1.HTTP_METHODS_UPPER.has(method_.toUpperCase())) {
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
        if (!(Array.isArray(def) ||
            typeof def === "function" ||
            typeof def === "object")) {
            // throw new RouterError(`Invalid route definition type \`${typeof def}\` '${methodHandler}' in ${importPath}`);
            console.error(new types_ts_1.RouterError(`Invalid route definition type \`${typeof def}\` '${methodHandler}' in ${importPath}`));
            continue;
        }
        const defIsObject = !Array.isArray(def) && typeof def === "object";
        // get pipe and any other options
        const _a = defIsObject
            ? def
            : { pipe: def }, { pipe } = _a, options = __rest(_a, ["pipe"]);
        if (!(Array.isArray(pipe) || typeof pipe === "function")) {
            // throw new RouterError(`Invalid route 'pipe' type \`${typeof pipe}\` in ${importPath}`);
            console.error(new types_ts_1.RouterError(`Invalid route 'pipe' type \`${typeof pipe}\` in ${importPath}`));
            continue;
        }
        const entryId = `${moduleId}.${methodHandler}`;
        const optionsStr = Object.entries(options).length > 0 ? `, $O(${entryId})` : "";
        const pipeStr = defIsObject ? `${entryId}.pipe` : entryId;
        testRouter.register(handlerType, `${method} ${pathname}`, pipe, options);
        switch (handlerType) {
            case "filter":
                setters += `\n  ${routerId}.filter${method}("${pathname}", ${pipeStr}${optionsStr});`;
                break;
            case "handler":
                setters += `\n  ${routerId}.handle${method}("${pathname}", ${pipeStr}${optionsStr});`;
                break;
            case "fallback":
                setters += `\n  ${routerId}.fallback${method}("${pathname}", ${pipeStr}${optionsStr});`;
                break;
            case "after":
                setters += `\n  ${routerId}.after${method}("${pathname}", ${pipeStr}${optionsStr});`;
                break;
            case "catcher":
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
 * @param options Options for static routes import generator. eg. './routes'
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
 *  import { generateStaticRoutesImporter } from "@bepalo/spine";
 *  import { hash } from "node:crypto";
 *
 *  await generateStaticRoutesImporter({
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
 *      if (hash("sha1", c, "hex") != hash("sha1", await f.text(), "hex")) {
 *        Bun.write(output, c);
 *        console.log(new Date().getTime(), "[SPINE-GEN]", c.length, `'${output}'`);
 *      }
 *    } else {
 *      Bun.write(output, c);
 *      console.log(new Date().getTime(), "[SPINE-GEN]", c.length, `'${output}'`);
 *    }
 *  });
 *  ```
 *
 */
const generateStaticRoutesImporter = (_a) => __awaiter(void 0, [_a], void 0, function* ({ routesPath, importRoot = "./", usePathForIdGeneration = false, importExtensions = false, pattern = /\.(js|ts|mjs|cjs)$/, dirPattern = /.*/, processName = (name) => name.substring(0, name.lastIndexOf(".")), onError, }) {
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
                            : (0, node_crypto_1.hash)("sha1", pureRelativePath, "base64url").replace(/[^a-zA-Z0-9_]/g, "_"));
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
exports.generateStaticRoutesImporter = generateStaticRoutesImporter;
exports.default = exports.generateStaticRoutesImporter;
//# sourceMappingURL=generator.js.map