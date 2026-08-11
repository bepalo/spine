"use strict";
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
const router_ts_1 = require("./router.js");
const utils_node_ts_1 = require("./utils.node.js");
function getRouteLoaders(routerId, moduleId, pathname, module, importPath) {
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
        const optionsStr = Object.entries(options).length > 0 ? `, getOptions(${entryId})` : "";
        const pipeStr = defIsObject ? `${entryId}.pipe` : entryId;
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
const generateStaticRoutesImporter = (router_1, routesPath_1, ...args_1) => __awaiter(void 0, [router_1, routesPath_1, ...args_1], void 0, function* (router, routesPath, importRoot = "./") {
    var _a, e_1, _b, _c;
    let imports = "";
    let loads = "";
    const prefix = "route";
    const map = new Map();
    try {
        for (var _d = true, _e = __asyncValues((0, utils_node_ts_1.walk)(routesPath)), _f; _f = yield _e.next(), _a = _f.done, !_a; _d = true) {
            _c = _f.value;
            _d = false;
            const node = _c;
            const { name, type, relativePath, fullPath, parent, path: _path } = node;
            if (type === "file") {
                const pureRelativePath = relativePath.substring(0, relativePath.lastIndexOf("."));
                let pathname = router.translateRouteFilePath("/" + pureRelativePath);
                pathname = pureRelativePath.endsWith("/index")
                    ? pathname.substring(0, pathname.length - 1)
                    : pathname;
                let path = pathname
                    .replace(/\//g, "_")
                    .replace(/(\*{1,2})!?/g, (_m, m1) => "$".repeat(m1.length))
                    .replace(/(_.+?(?:\|.+?)*)?\:{1,2}(.*)!?[\/$]?/g, (_m, m1, m2) => (m1 ? m1.replace(/\|/g, "$") + "$$" : "") + "$" + m2);
                const importName = prefix + path;
                const importPath = importRoot + pureRelativePath;
                const module = (yield (0, utils_node_ts_1.dynamicImport)(fullPath));
                const routeDef = "  " +
                    (yield getRouteLoaders("router", importName, pathname, module, _path));
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
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (!_d && !_a && (_b = _e.return)) yield _b.call(_e);
        }
        finally { if (e_1) throw e_1.error; }
    }
    // append in a sorted order
    map.forEach((e) => e.sort((a, b) => a.pathname.localeCompare(b.pathname)));
    const sortedEntries = Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    for (const [p, es] of sortedEntries) {
        loads += `\n  //     ${p}`;
        for (const e of es) {
            const { importStr, loadStr } = e;
            imports += importStr;
            loads += loadStr;
        }
    }
    return `// This is auto-generated for static importing of @bepalo/spine file-based routes
import { Router, Handler, HandlerRegisterPiplineOptions, Pipe } from '@bepalo/spine';
${imports}
const getOptions = <ExtendContext extends Record<string, unknown>>(
	def: { pipe: Handler<ExtendContext> | Pipe<ExtendContext> } & HandlerRegisterPiplineOptions,
) => {
	const { pipe, ...options } = def;
	return options;
};

export const setRoutes = async <ExtendContext extends Record<string, unknown>>(router: Router<ExtendContext>) => {${loads}
};\n
// Use this to set the routes in your router
export default setRoutes;
`;
});
exports.generateStaticRoutesImporter = generateStaticRoutesImporter;
exports.default = exports.generateStaticRoutesImporter;
//# sourceMappingURL=generator.js.map