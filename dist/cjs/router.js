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
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var _Router_instances, _Router_config, _Router_routes, _Router_register, _Router_processPath, _Router_getRouteEntries, _Router_InitEntries, _Router_initRoutes;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Router = exports.HANDLER_TYPES = exports.HTTP_METHODS_UPPER = exports.CRUD_METHODS = exports.HTTP_METHODS = void 0;
const status_ts_1 = require("./status.js");
const types_ts_1 = require("./types.js");
const utils_node_ts_1 = require("./utils.node.js");
const EMPTY_PARAMS = Object.freeze({});
const W = "[\\p{L}\\p{M}\\p{N}\\p{S}\\p{P}_\\-.]";
const PATH_PART_REGEX = new RegExp(`^(?:#?${W}+|\\[(?:${W}*|#{1,2}|##\\s*${W}*\\s*|\\[##\\s*${W}*\\s*\\]|\\[${W}*(?:,${W}*)*\\](?:\\s*${W}*\\s*|\\[\\s*${W}*\\s*\\]))\\])$`, "u");
const REGISTER_PATH_REGEX = new RegExp(`^(?:/(?:${W}*|${W}*(?:\\|${W}*)*:${W}*|\\*))+|(?:/${W}*)*(?:/\\.?\\*\\*)|(?:/${W}*)*(?:/::${W}*)$`, "u");
exports.HTTP_METHODS = new Set([
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
exports.CRUD_METHODS = new Set([
    "Get",
    "Post",
    "Put",
    "Patch",
    "Delete",
]);
exports.HTTP_METHODS_UPPER = new Set([
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
exports.HANDLER_TYPES = new Set([
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
class Router {
    get maxPath() {
        return __classPrivateFieldGet(this, _Router_config, "f").maxPath;
    }
    get enable() {
        return Object.assign({}, __classPrivateFieldGet(this, _Router_config, "f").enable);
    }
    constructor(config) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
        _Router_instances.add(this);
        _Router_config.set(this, void 0);
        _Router_routes.set(this, void 0);
        __classPrivateFieldSet(this, _Router_config, Object.assign(Object.assign({}, config), { maxPath: (_a = config === null || config === void 0 ? void 0 : config.maxPath) !== null && _a !== void 0 ? _a : 24, enable: {
                filter: (_c = (_b = config === null || config === void 0 ? void 0 : config.enable) === null || _b === void 0 ? void 0 : _b.filter) !== null && _c !== void 0 ? _c : true,
                handler: (_e = (_d = config === null || config === void 0 ? void 0 : config.enable) === null || _d === void 0 ? void 0 : _d.handler) !== null && _e !== void 0 ? _e : true,
                fallback: (_g = (_f = config === null || config === void 0 ? void 0 : config.enable) === null || _f === void 0 ? void 0 : _f.fallback) !== null && _g !== void 0 ? _g : true,
                after: (_j = (_h = config === null || config === void 0 ? void 0 : config.enable) === null || _h === void 0 ? void 0 : _h.after) !== null && _j !== void 0 ? _j : true,
                catcher: (_l = (_k = config === null || config === void 0 ? void 0 : config.enable) === null || _k === void 0 ? void 0 : _k.catcher) !== null && _l !== void 0 ? _l : true,
            } }), "f");
        __classPrivateFieldSet(this, _Router_routes, __classPrivateFieldGet(this, _Router_instances, "m", _Router_initRoutes).call(this), "f");
    }
    respond(request, ctxInit) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f;
            let response = undefined;
            const method = request.method;
            const url = new URL(request.url);
            let pathname;
            try {
                pathname = decodeURIComponent(url.pathname);
            }
            catch (_g) {
                return new Response(null, {
                    status: 400,
                    statusText: (0, status_ts_1.getHttpStatusText)(400),
                });
            }
            const parts = [];
            const ctx = Object.assign({ router: this, url,
                request, headers: (_a = ctxInit === null || ctxInit === void 0 ? void 0 : ctxInit.headers) !== null && _a !== void 0 ? _a : new Headers(), params: EMPTY_PARAMS, pathname, $pathname: parts }, ctxInit);
            {
                const count = this.splitPath(pathname, parts, __classPrivateFieldGet(this, _Router_config, "f").maxPath);
                if (count < 0) {
                    return count === -1
                        ? new Response(null, {
                            status: 400,
                            statusText: (0, status_ts_1.getHttpStatusText)(400),
                            headers: ctx.headers,
                        })
                        : new Response(null, {
                            status: 414,
                            statusText: (0, status_ts_1.getHttpStatusText)(414),
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
            };
            try {
                // filters
                if ((_b = __classPrivateFieldGet(this, _Router_config, "f").enable) === null || _b === void 0 ? void 0 : _b.filter) {
                    const filterRoutes = __classPrivateFieldGet(this, _Router_instances, "m", _Router_getRouteEntries).call(this, pathname, parts, __classPrivateFieldGet(this, _Router_routes, "f").filter[method], false);
                    found.filter = filterRoutes.length;
                    if (filterRoutes.length > 0) {
                        away: for (const routeEntry of filterRoutes) {
                            // parse params
                            const params = routeEntry.parseParams(pathname, parts);
                            ctx.params = params !== null && params !== void 0 ? params : EMPTY_PARAMS;
                            // call request handlers
                            for (const handler of routeEntry.pipeline) {
                                const resp = yield handler.apply(this, [ctx]);
                                if (resp instanceof Response) {
                                    response = resp;
                                    break;
                                }
                                else if (resp === types_ts_1.Break_Pipe) {
                                    break;
                                }
                                else if (resp === types_ts_1.Break_Pipeline) {
                                    break away;
                                }
                            }
                            if (response instanceof Response) {
                                break;
                            }
                        }
                    }
                    // default filter
                    if (!(response instanceof Response) && __classPrivateFieldGet(this, _Router_config, "f").defaultFilter) {
                        const resp = yield __classPrivateFieldGet(this, _Router_config, "f").defaultFilter(ctx);
                        if (resp instanceof Response) {
                            response = resp;
                        }
                    }
                }
                // handlers
                if (((_c = __classPrivateFieldGet(this, _Router_config, "f").enable) === null || _c === void 0 ? void 0 : _c.handler) && !(response instanceof Response)) {
                    const handlerRoutes = __classPrivateFieldGet(this, _Router_instances, "m", _Router_getRouteEntries).call(this, pathname, parts, __classPrivateFieldGet(this, _Router_routes, "f").handler[method], true);
                    found.handler = handlerRoutes.length;
                    if (handlerRoutes.length > 0) {
                        away: for (const routeEntry of handlerRoutes) {
                            // parse params
                            const params = routeEntry.parseParams(pathname, parts);
                            ctx.params = params !== null && params !== void 0 ? params : EMPTY_PARAMS;
                            // call request handlers
                            for (const handler of routeEntry.pipeline) {
                                const resp = yield handler(ctx);
                                if (resp instanceof Response) {
                                    response = resp;
                                    break;
                                }
                                else if (resp === types_ts_1.Break_Pipe) {
                                    break;
                                }
                                else if (resp === types_ts_1.Break_Pipeline) {
                                    break away;
                                }
                            }
                            if (response instanceof Response) {
                                break;
                            }
                        }
                    }
                }
                // fallbacks
                if (((_d = __classPrivateFieldGet(this, _Router_config, "f").enable) === null || _d === void 0 ? void 0 : _d.fallback) && !(response instanceof Response)) {
                    const fallbackRoutes = __classPrivateFieldGet(this, _Router_instances, "m", _Router_getRouteEntries).call(this, pathname, parts, __classPrivateFieldGet(this, _Router_routes, "f").fallback[method], false);
                    found.fallback = fallbackRoutes.length;
                    if (fallbackRoutes.length > 0) {
                        away: for (const routeEntry of fallbackRoutes) {
                            // parse params
                            const params = routeEntry.parseParams(pathname, parts);
                            ctx.params = params !== null && params !== void 0 ? params : EMPTY_PARAMS;
                            // call request handlers
                            for (const handler of routeEntry.pipeline) {
                                const resp = yield handler(ctx);
                                if (resp instanceof Response) {
                                    response = resp;
                                    break;
                                }
                                else if (resp === types_ts_1.Break_Pipe) {
                                    break;
                                }
                                else if (resp === types_ts_1.Break_Pipeline) {
                                    break away;
                                }
                            }
                            if (response instanceof Response) {
                                break;
                            }
                        }
                    }
                    // default fallback
                    if (!(response instanceof Response) && __classPrivateFieldGet(this, _Router_config, "f").defaultFallback) {
                        const resp = yield __classPrivateFieldGet(this, _Router_config, "f").defaultFallback(ctx);
                        if (resp instanceof Response) {
                            response = resp;
                        }
                    }
                }
                // append headers
                if ((response === null || response === void 0 ? void 0 : response.headers) != null) {
                    for (const [k, v] of response.headers) {
                        ctx.headers.append(k, v);
                    }
                }
                // default response to not-implemented or not-found if null
                response =
                    response instanceof Response
                        ? new Response(response.body, Object.assign(Object.assign({}, response), { status: response.status, statusText: (0, status_ts_1.getHttpStatusText)(response.status), headers: ctx.headers }))
                        : found.handler + found.fallback > 0
                            ? new Response(null, {
                                status: 501,
                                statusText: (0, status_ts_1.getHttpStatusText)(501),
                                headers: ctx.headers,
                            })
                            : new Response(null, {
                                status: 404,
                                statusText: (0, status_ts_1.getHttpStatusText)(404),
                                headers: ctx.headers,
                            });
            }
            catch (_error) {
                const error = _error instanceof Error ? _error : Error(String(_error));
                ctx.error = error;
                // catchers
                if ((_e = __classPrivateFieldGet(this, _Router_config, "f").enable) === null || _e === void 0 ? void 0 : _e.catcher) {
                    const catcherRoutes = __classPrivateFieldGet(this, _Router_instances, "m", _Router_getRouteEntries).call(this, pathname, parts, __classPrivateFieldGet(this, _Router_routes, "f").catcher[method], false);
                    found.catcher = catcherRoutes.length;
                    if (catcherRoutes.length > 0) {
                        away: for (const routeEntry of catcherRoutes) {
                            // parse params
                            const params = routeEntry.parseParams(url.pathname, parts);
                            ctx.params = params !== null && params !== void 0 ? params : EMPTY_PARAMS;
                            // call request handlers
                            for (const handler of routeEntry.pipeline) {
                                const resp = yield handler(ctx);
                                if (resp instanceof Response) {
                                    response = resp;
                                    break;
                                }
                                else if (resp === types_ts_1.Break_Pipe) {
                                    break;
                                }
                                else if (resp === types_ts_1.Break_Pipeline) {
                                    break away;
                                }
                            }
                        }
                    }
                }
                // default cathcer
                if (!(response instanceof Response) && __classPrivateFieldGet(this, _Router_config, "f").defaultCatcher) {
                    const errorCtx = ctx;
                    ctx.error = error;
                    const resp = yield __classPrivateFieldGet(this, _Router_config, "f").defaultCatcher(errorCtx);
                    if (resp instanceof Response) {
                        response = resp;
                    }
                }
                if (!(response instanceof Response)) {
                    const status = ctx.error && ctx.error instanceof types_ts_1.HttpError ? ctx.error.status : 500;
                    response = new Response(null, {
                        status,
                        statusText: (0, status_ts_1.getHttpStatusText)(status),
                    });
                }
                // append headers
                for (const [k, v] of response.headers) {
                    ctx.headers.append(k, v);
                }
                response = new Response(response.body, Object.assign(Object.assign({}, response), { status: response.status, statusText: (0, status_ts_1.getHttpStatusText)(response.status), headers: ctx.headers }));
            }
            ctx.response = response;
            // afters
            if ((_f = __classPrivateFieldGet(this, _Router_config, "f").enable) === null || _f === void 0 ? void 0 : _f.after) {
                const afterRoutes = __classPrivateFieldGet(this, _Router_instances, "m", _Router_getRouteEntries).call(this, pathname, parts, __classPrivateFieldGet(this, _Router_routes, "f").after[method], false);
                found.after = afterRoutes.length;
                if (afterRoutes.length > 0) {
                    away: for (const routeEntry of afterRoutes) {
                        // parse params
                        const params = routeEntry.parseParams(pathname, parts);
                        ctx.params = params !== null && params !== void 0 ? params : EMPTY_PARAMS;
                        ctx.response = response;
                        // call request handlers
                        for (const handler of routeEntry.pipeline) {
                            const resp = yield handler(ctx);
                            if (resp instanceof Response) {
                                response = resp;
                                break;
                            }
                            else if (resp === types_ts_1.Break_Pipe) {
                                break;
                            }
                            else if (resp === types_ts_1.Break_Pipeline) {
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
            if (__classPrivateFieldGet(this, _Router_config, "f").defaultAfter) {
                const resp = yield __classPrivateFieldGet(this, _Router_config, "f").defaultAfter(ctx);
                if (resp instanceof Response) {
                    response = resp;
                }
            }
            return response;
        });
    }
    load(_a) {
        return __awaiter(this, arguments, void 0, function* ({ routesPath, pattern = /\.(js|ts|mjs|cjs)$/, dirPattern = /.*/, processName = (name) => name.substring(0, name.lastIndexOf(".")), }) {
            var _b, e_1, _c, _d;
            try {
                for (var _e = true, _f = __asyncValues((0, utils_node_ts_1.walk)(routesPath)), _g; _g = yield _f.next(), _b = _g.done, !_b; _e = true) {
                    _d = _g.value;
                    _e = false;
                    const node = _d;
                    if (node.type === "file") {
                        if (!pattern.test(node.name)) {
                            continue;
                        }
                        if (!dirPattern.test(node.parent)) {
                            continue;
                        }
                        let handlersImp;
                        try {
                            handlersImp = (yield (0, utils_node_ts_1.dynamicImport)(node.fullPath));
                            const processedName = decodeURIComponent(processName(node.name));
                            const pathname = !node.parent
                                ? `/${processedName}`
                                : `/${node.parent}/${processedName}`;
                            const path = this.translateRouteFilePath(pathname);
                            for (const _method of Object.keys(handlersImp)) {
                                const _definition = handlersImp[_method];
                                let method;
                                let upperMethod = _method.toUpperCase();
                                let handlerType = "handler";
                                if (exports.HTTP_METHODS_UPPER.has(upperMethod)) {
                                    method = _method;
                                }
                                else {
                                    const [spMethod, _handlerType] = _method.split("_", 2);
                                    if (!(spMethod && _handlerType)) {
                                        continue;
                                    }
                                    upperMethod = spMethod.toUpperCase();
                                    if (exports.HTTP_METHODS_UPPER.has(upperMethod)) {
                                        method = spMethod;
                                    }
                                    else {
                                        continue;
                                    }
                                    if (exports.HANDLER_TYPES.has(_handlerType === null || _handlerType === void 0 ? void 0 : _handlerType.toLowerCase())) {
                                        handlerType = _handlerType.toLowerCase();
                                    }
                                    else {
                                        continue;
                                    }
                                }
                                const definition = Array.isArray(_definition) || typeof _definition === "function"
                                    ? { pipeline: _definition }
                                    : {
                                        pipeline: _definition.pipeline,
                                        openApi: _definition.openApi,
                                    };
                                const pipeline = definition.pipeline;
                                const openApi = definition.openApi;
                                if (openApi != null && handlerType !== "handler") {
                                    console.warn(`OpenApi definition will be ignored in '${node.path}' ${_method}`);
                                }
                                if (pipeline == null) {
                                    throw new types_ts_1.RouterError(`Undefined pipeline in '${node.path}' ${_method}`);
                                }
                                if (!Array.isArray(pipeline) && typeof pipeline !== "function") {
                                    throw new types_ts_1.RouterError(`Bad pipeline type in '${node.path}' ${_method}`);
                                }
                                if (openApi != null && typeof openApi !== "object") {
                                    throw new types_ts_1.RouterError(`Bad openApi type in '${node.path}' ${_method}`);
                                }
                                const options = handlerType === "handler" && openApi != null
                                    ? { openApi }
                                    : undefined;
                                if (Array.isArray(pipeline) || typeof pipeline === "function") {
                                    __classPrivateFieldGet(this, _Router_instances, "m", _Router_register).call(this, handlerType, `${method} ${path}`, pipeline, options);
                                }
                            }
                        }
                        catch (error) {
                            console.error(`Failed to import route at ${node.fullPath}:`, error);
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
        });
    }
    generateOpenAPI(info) {
        return new Promise((resolve) => {
            var _a, _b, _c, _d;
            const { title = "API", version = "1.0.0" } = info !== null && info !== void 0 ? info : {};
            const paths = {};
            const handlers = __classPrivateFieldGet(this, _Router_routes, "f").handler;
            for (const method of Object.keys(handlers)) {
                const methodHandlers = handlers[method];
                for (const entries of [
                    methodHandlers.entries,
                    methodHandlers.globs,
                    methodHandlers.superGlobs,
                    // methodHandlers.superGlobsWithGlobs,
                ])
                    for (const bucket of entries) {
                        if (bucket == null) {
                            continue;
                        }
                        for (const key of bucket.keys()) {
                            const entry = bucket.get(key);
                            if (entry == null) {
                                continue;
                            }
                            const pathname = entry.openApiPath;
                            const openApi = entry.openApi;
                            if (openApi != null) {
                                if (paths[pathname] == null) {
                                    paths[pathname] = {};
                                }
                                const methodLower = method.toLowerCase();
                                const parameters = (_c = (_a = openApi.parameters) !== null && _a !== void 0 ? _a : (_b = entry.params) === null || _b === void 0 ? void 0 : _b.map(([, paramId]) => ({
                                    name: paramId,
                                    in: "path",
                                    required: true,
                                    schema: { type: "string" },
                                }))) !== null && _c !== void 0 ? _c : [];
                                const responses = (_d = openApi.responses) !== null && _d !== void 0 ? _d : {
                                    "200": {
                                        description: "OK",
                                        content: {
                                            "application/json": {
                                                schema: { type: "object" },
                                            },
                                        },
                                    },
                                };
                                paths[pathname][methodLower] = Object.assign(Object.assign({}, openApi), { parameters,
                                    responses });
                            }
                        }
                    }
            }
            resolve({
                openapi: "3.0.0",
                info: { title, version },
                paths,
            });
        });
    }
    all(paths, pipeline, options) {
        paths = Array.isArray(paths) ? paths : [paths];
        const methodPaths = [];
        for (const p of paths) {
            for (const method of exports.HTTP_METHODS.keys()) {
                methodPaths.push(`${method} ${p}`);
            }
        }
        return __classPrivateFieldGet(this, _Router_instances, "m", _Router_register).call(this, "handler", methodPaths, pipeline, options);
    }
    crud(paths, pipeline, options) {
        paths = Array.isArray(paths) ? paths : [paths];
        const methodPaths = [];
        for (const p of paths) {
            for (const method of exports.CRUD_METHODS.keys()) {
                methodPaths.push(`${method} ${p}`);
            }
        }
        return __classPrivateFieldGet(this, _Router_instances, "m", _Router_register).call(this, "handler", methodPaths, pipeline, options);
    }
    head(paths, pipeline, options) {
        paths = Array.isArray(paths) ? paths : [paths];
        const methodPaths = paths.map((p) => `Head ${p}`);
        return __classPrivateFieldGet(this, _Router_instances, "m", _Router_register).call(this, "handler", methodPaths, pipeline, options);
    }
    get(paths, pipeline, options) {
        paths = Array.isArray(paths) ? paths : [paths];
        const methodPaths = paths.map((p) => `Get ${p}`);
        return __classPrivateFieldGet(this, _Router_instances, "m", _Router_register).call(this, "handler", methodPaths, pipeline, options);
    }
    post(paths, pipeline, options) {
        paths = Array.isArray(paths) ? paths : [paths];
        const methodPaths = paths.map((p) => `Post ${p}`);
        return __classPrivateFieldGet(this, _Router_instances, "m", _Router_register).call(this, "handler", methodPaths, pipeline, options);
    }
    put(paths, pipeline, options) {
        paths = Array.isArray(paths) ? paths : [paths];
        const methodPaths = paths.map((p) => `Put ${p}`);
        return __classPrivateFieldGet(this, _Router_instances, "m", _Router_register).call(this, "handler", methodPaths, pipeline, options);
    }
    patch(paths, pipeline, options) {
        paths = Array.isArray(paths) ? paths : [paths];
        const methodPaths = paths.map((p) => `Patch ${p}`);
        return __classPrivateFieldGet(this, _Router_instances, "m", _Router_register).call(this, "handler", methodPaths, pipeline, options);
    }
    delete(paths, pipeline, options) {
        paths = Array.isArray(paths) ? paths : [paths];
        const methodPaths = paths.map((p) => `Delete ${p}`);
        return __classPrivateFieldGet(this, _Router_instances, "m", _Router_register).call(this, "handler", methodPaths, pipeline, options);
    }
    options(paths, pipeline, options) {
        paths = Array.isArray(paths) ? paths : [paths];
        const methodPaths = paths.map((p) => `Options ${p}`);
        return __classPrivateFieldGet(this, _Router_instances, "m", _Router_register).call(this, "handler", methodPaths, pipeline, options);
    }
    trace(paths, pipeline, options) {
        paths = Array.isArray(paths) ? paths : [paths];
        const methodPaths = paths.map((p) => `Trace ${p}`);
        return __classPrivateFieldGet(this, _Router_instances, "m", _Router_register).call(this, "handler", methodPaths, pipeline, options);
    }
    connect(paths, pipeline, options) {
        paths = Array.isArray(paths) ? paths : [paths];
        const methodPaths = paths.map((p) => `Connect ${p}`);
        return __classPrivateFieldGet(this, _Router_instances, "m", _Router_register).call(this, "handler", methodPaths, pipeline, options);
    }
    filterAll(paths, pipeline, options) {
        paths = Array.isArray(paths) ? paths : [paths];
        const methodPaths = [];
        for (const p of paths) {
            for (const method of exports.HTTP_METHODS.keys()) {
                methodPaths.push(`${method} ${p}`);
            }
        }
        return __classPrivateFieldGet(this, _Router_instances, "m", _Router_register).call(this, "filter", methodPaths, pipeline, options);
    }
    filterCrud(paths, pipeline, options) {
        paths = Array.isArray(paths) ? paths : [paths];
        const methodPaths = [];
        for (const p of paths) {
            for (const method of exports.CRUD_METHODS.keys()) {
                methodPaths.push(`${method} ${p}`);
            }
        }
        return __classPrivateFieldGet(this, _Router_instances, "m", _Router_register).call(this, "filter", methodPaths, pipeline, options);
    }
    filterHead(paths, pipeline, options) {
        paths = Array.isArray(paths) ? paths : [paths];
        const methodPaths = paths.map((p) => `Head ${p}`);
        return __classPrivateFieldGet(this, _Router_instances, "m", _Router_register).call(this, "filter", methodPaths, pipeline, options);
    }
    filterGet(paths, pipeline, options) {
        paths = Array.isArray(paths) ? paths : [paths];
        const methodPaths = paths.map((p) => `Get ${p}`);
        return __classPrivateFieldGet(this, _Router_instances, "m", _Router_register).call(this, "filter", methodPaths, pipeline, options);
    }
    filterPost(paths, pipeline, options) {
        paths = Array.isArray(paths) ? paths : [paths];
        const methodPaths = paths.map((p) => `Post ${p}`);
        return __classPrivateFieldGet(this, _Router_instances, "m", _Router_register).call(this, "filter", methodPaths, pipeline, options);
    }
    filterPut(paths, pipeline, options) {
        paths = Array.isArray(paths) ? paths : [paths];
        const methodPaths = paths.map((p) => `Put ${p}`);
        return __classPrivateFieldGet(this, _Router_instances, "m", _Router_register).call(this, "filter", methodPaths, pipeline, options);
    }
    filterPatch(paths, pipeline, options) {
        paths = Array.isArray(paths) ? paths : [paths];
        const methodPaths = paths.map((p) => `Patch ${p}`);
        return __classPrivateFieldGet(this, _Router_instances, "m", _Router_register).call(this, "filter", methodPaths, pipeline, options);
    }
    filterDelete(paths, pipeline, options) {
        paths = Array.isArray(paths) ? paths : [paths];
        const methodPaths = paths.map((p) => `Delete ${p}`);
        return __classPrivateFieldGet(this, _Router_instances, "m", _Router_register).call(this, "filter", methodPaths, pipeline, options);
    }
    filterOptions(paths, pipeline, options) {
        paths = Array.isArray(paths) ? paths : [paths];
        const methodPaths = paths.map((p) => `Options ${p}`);
        return __classPrivateFieldGet(this, _Router_instances, "m", _Router_register).call(this, "filter", methodPaths, pipeline, options);
    }
    filterTrace(paths, pipeline, options) {
        paths = Array.isArray(paths) ? paths : [paths];
        const methodPaths = paths.map((p) => `Trace ${p}`);
        return __classPrivateFieldGet(this, _Router_instances, "m", _Router_register).call(this, "filter", methodPaths, pipeline, options);
    }
    filterConnect(paths, pipeline, options) {
        paths = Array.isArray(paths) ? paths : [paths];
        const methodPaths = paths.map((p) => `Connect ${p}`);
        return __classPrivateFieldGet(this, _Router_instances, "m", _Router_register).call(this, "filter", methodPaths, pipeline, options);
    }
    handleAll(paths, pipeline, options) {
        paths = Array.isArray(paths) ? paths : [paths];
        const methodPaths = [];
        for (const p of paths) {
            for (const method of exports.HTTP_METHODS.keys()) {
                methodPaths.push(`${method} ${p}`);
            }
        }
        return __classPrivateFieldGet(this, _Router_instances, "m", _Router_register).call(this, "handler", methodPaths, pipeline, options);
    }
    handleCrud(paths, pipeline, options) {
        paths = Array.isArray(paths) ? paths : [paths];
        const methodPaths = [];
        for (const p of paths) {
            for (const method of exports.CRUD_METHODS.keys()) {
                methodPaths.push(`${method} ${p}`);
            }
        }
        return __classPrivateFieldGet(this, _Router_instances, "m", _Router_register).call(this, "handler", methodPaths, pipeline, options);
    }
    handleHead(paths, pipeline, options) {
        paths = Array.isArray(paths) ? paths : [paths];
        const methodPaths = paths.map((p) => `Head ${p}`);
        return __classPrivateFieldGet(this, _Router_instances, "m", _Router_register).call(this, "handler", methodPaths, pipeline, options);
    }
    handleGet(paths, pipeline, options) {
        paths = Array.isArray(paths) ? paths : [paths];
        const methodPaths = paths.map((p) => `Get ${p}`);
        return __classPrivateFieldGet(this, _Router_instances, "m", _Router_register).call(this, "handler", methodPaths, pipeline, options);
    }
    handlePost(paths, pipeline, options) {
        paths = Array.isArray(paths) ? paths : [paths];
        const methodPaths = paths.map((p) => `Post ${p}`);
        return __classPrivateFieldGet(this, _Router_instances, "m", _Router_register).call(this, "handler", methodPaths, pipeline, options);
    }
    handlePut(paths, pipeline, options) {
        paths = Array.isArray(paths) ? paths : [paths];
        const methodPaths = paths.map((p) => `Put ${p}`);
        return __classPrivateFieldGet(this, _Router_instances, "m", _Router_register).call(this, "handler", methodPaths, pipeline, options);
    }
    handlePatch(paths, pipeline, options) {
        paths = Array.isArray(paths) ? paths : [paths];
        const methodPaths = paths.map((p) => `Patch ${p}`);
        return __classPrivateFieldGet(this, _Router_instances, "m", _Router_register).call(this, "handler", methodPaths, pipeline, options);
    }
    handleDelete(paths, pipeline, options) {
        paths = Array.isArray(paths) ? paths : [paths];
        const methodPaths = paths.map((p) => `Delete ${p}`);
        return __classPrivateFieldGet(this, _Router_instances, "m", _Router_register).call(this, "handler", methodPaths, pipeline, options);
    }
    handleOptions(paths, pipeline, options) {
        paths = Array.isArray(paths) ? paths : [paths];
        const methodPaths = paths.map((p) => `Options ${p}`);
        return __classPrivateFieldGet(this, _Router_instances, "m", _Router_register).call(this, "handler", methodPaths, pipeline, options);
    }
    handleTrace(paths, pipeline, options) {
        paths = Array.isArray(paths) ? paths : [paths];
        const methodPaths = paths.map((p) => `Trace ${p}`);
        return __classPrivateFieldGet(this, _Router_instances, "m", _Router_register).call(this, "handler", methodPaths, pipeline, options);
    }
    handleConnect(paths, pipeline, options) {
        paths = Array.isArray(paths) ? paths : [paths];
        const methodPaths = paths.map((p) => `Connect ${p}`);
        return __classPrivateFieldGet(this, _Router_instances, "m", _Router_register).call(this, "handler", methodPaths, pipeline, options);
    }
    fallbackAll(paths, pipeline, options) {
        paths = Array.isArray(paths) ? paths : [paths];
        const methodPaths = [];
        for (const p of paths) {
            for (const method of exports.HTTP_METHODS.keys()) {
                methodPaths.push(`${method} ${p}`);
            }
        }
        return __classPrivateFieldGet(this, _Router_instances, "m", _Router_register).call(this, "fallback", methodPaths, pipeline, options);
    }
    fallbackCrud(paths, pipeline, options) {
        paths = Array.isArray(paths) ? paths : [paths];
        const methodPaths = [];
        for (const p of paths) {
            for (const method of exports.CRUD_METHODS.keys()) {
                methodPaths.push(`${method} ${p}`);
            }
        }
        return __classPrivateFieldGet(this, _Router_instances, "m", _Router_register).call(this, "fallback", methodPaths, pipeline, options);
    }
    fallbackHead(paths, pipeline, options) {
        paths = Array.isArray(paths) ? paths : [paths];
        const methodPaths = paths.map((p) => `Head ${p}`);
        return __classPrivateFieldGet(this, _Router_instances, "m", _Router_register).call(this, "fallback", methodPaths, pipeline, options);
    }
    fallbackGet(paths, pipeline, options) {
        paths = Array.isArray(paths) ? paths : [paths];
        const methodPaths = paths.map((p) => `Get ${p}`);
        return __classPrivateFieldGet(this, _Router_instances, "m", _Router_register).call(this, "fallback", methodPaths, pipeline, options);
    }
    fallbackPost(paths, pipeline, options) {
        paths = Array.isArray(paths) ? paths : [paths];
        const methodPaths = paths.map((p) => `Post ${p}`);
        return __classPrivateFieldGet(this, _Router_instances, "m", _Router_register).call(this, "fallback", methodPaths, pipeline, options);
    }
    fallbackPut(paths, pipeline, options) {
        paths = Array.isArray(paths) ? paths : [paths];
        const methodPaths = paths.map((p) => `Put ${p}`);
        return __classPrivateFieldGet(this, _Router_instances, "m", _Router_register).call(this, "fallback", methodPaths, pipeline, options);
    }
    fallbackPatch(paths, pipeline, options) {
        paths = Array.isArray(paths) ? paths : [paths];
        const methodPaths = paths.map((p) => `Patch ${p}`);
        return __classPrivateFieldGet(this, _Router_instances, "m", _Router_register).call(this, "fallback", methodPaths, pipeline, options);
    }
    fallbackDelete(paths, pipeline, options) {
        paths = Array.isArray(paths) ? paths : [paths];
        const methodPaths = paths.map((p) => `Delete ${p}`);
        return __classPrivateFieldGet(this, _Router_instances, "m", _Router_register).call(this, "fallback", methodPaths, pipeline, options);
    }
    fallbackOptions(paths, pipeline, options) {
        paths = Array.isArray(paths) ? paths : [paths];
        const methodPaths = paths.map((p) => `Options ${p}`);
        return __classPrivateFieldGet(this, _Router_instances, "m", _Router_register).call(this, "fallback", methodPaths, pipeline, options);
    }
    fallbackTrace(paths, pipeline, options) {
        paths = Array.isArray(paths) ? paths : [paths];
        const methodPaths = paths.map((p) => `Trace ${p}`);
        return __classPrivateFieldGet(this, _Router_instances, "m", _Router_register).call(this, "fallback", methodPaths, pipeline, options);
    }
    fallbackConnect(paths, pipeline, options) {
        paths = Array.isArray(paths) ? paths : [paths];
        const methodPaths = paths.map((p) => `Connect ${p}`);
        return __classPrivateFieldGet(this, _Router_instances, "m", _Router_register).call(this, "fallback", methodPaths, pipeline, options);
    }
    afterAll(paths, pipeline, options) {
        paths = Array.isArray(paths) ? paths : [paths];
        const methodPaths = [];
        for (const p of paths) {
            for (const method of exports.HTTP_METHODS.keys()) {
                methodPaths.push(`${method} ${p}`);
            }
        }
        return __classPrivateFieldGet(this, _Router_instances, "m", _Router_register).call(this, "after", methodPaths, pipeline, options);
    }
    afterCrud(paths, pipeline, options) {
        paths = Array.isArray(paths) ? paths : [paths];
        const methodPaths = [];
        for (const p of paths) {
            for (const method of exports.CRUD_METHODS.keys()) {
                methodPaths.push(`${method} ${p}`);
            }
        }
        return __classPrivateFieldGet(this, _Router_instances, "m", _Router_register).call(this, "after", methodPaths, pipeline, options);
    }
    afterHead(paths, pipeline, options) {
        paths = Array.isArray(paths) ? paths : [paths];
        const methodPaths = paths.map((p) => `Head ${p}`);
        return __classPrivateFieldGet(this, _Router_instances, "m", _Router_register).call(this, "after", methodPaths, pipeline, options);
    }
    afterGet(paths, pipeline, options) {
        paths = Array.isArray(paths) ? paths : [paths];
        const methodPaths = paths.map((p) => `Get ${p}`);
        return __classPrivateFieldGet(this, _Router_instances, "m", _Router_register).call(this, "after", methodPaths, pipeline, options);
    }
    afterPost(paths, pipeline, options) {
        paths = Array.isArray(paths) ? paths : [paths];
        const methodPaths = paths.map((p) => `Post ${p}`);
        return __classPrivateFieldGet(this, _Router_instances, "m", _Router_register).call(this, "after", methodPaths, pipeline, options);
    }
    afterPut(paths, pipeline, options) {
        paths = Array.isArray(paths) ? paths : [paths];
        const methodPaths = paths.map((p) => `Put ${p}`);
        return __classPrivateFieldGet(this, _Router_instances, "m", _Router_register).call(this, "after", methodPaths, pipeline, options);
    }
    afterPatch(paths, pipeline, options) {
        paths = Array.isArray(paths) ? paths : [paths];
        const methodPaths = paths.map((p) => `Patch ${p}`);
        return __classPrivateFieldGet(this, _Router_instances, "m", _Router_register).call(this, "after", methodPaths, pipeline, options);
    }
    afterDelete(paths, pipeline, options) {
        paths = Array.isArray(paths) ? paths : [paths];
        const methodPaths = paths.map((p) => `Delete ${p}`);
        return __classPrivateFieldGet(this, _Router_instances, "m", _Router_register).call(this, "after", methodPaths, pipeline, options);
    }
    afterOptions(paths, pipeline, options) {
        paths = Array.isArray(paths) ? paths : [paths];
        const methodPaths = paths.map((p) => `Options ${p}`);
        return __classPrivateFieldGet(this, _Router_instances, "m", _Router_register).call(this, "after", methodPaths, pipeline, options);
    }
    afterTrace(paths, pipeline, options) {
        paths = Array.isArray(paths) ? paths : [paths];
        const methodPaths = paths.map((p) => `Trace ${p}`);
        return __classPrivateFieldGet(this, _Router_instances, "m", _Router_register).call(this, "after", methodPaths, pipeline, options);
    }
    afterConnect(paths, pipeline, options) {
        paths = Array.isArray(paths) ? paths : [paths];
        const methodPaths = paths.map((p) => `Connect ${p}`);
        return __classPrivateFieldGet(this, _Router_instances, "m", _Router_register).call(this, "after", methodPaths, pipeline, options);
    }
    catchAll(paths, pipeline, options) {
        paths = Array.isArray(paths) ? paths : [paths];
        const methodPaths = [];
        for (const p of paths) {
            for (const method of exports.HTTP_METHODS.keys()) {
                methodPaths.push(`${method} ${p}`);
            }
        }
        return __classPrivateFieldGet(this, _Router_instances, "m", _Router_register).call(this, "catcher", methodPaths, pipeline, options);
    }
    catchCrud(paths, pipeline, options) {
        paths = Array.isArray(paths) ? paths : [paths];
        const methodPaths = [];
        for (const p of paths) {
            for (const method of exports.CRUD_METHODS.keys()) {
                methodPaths.push(`${method} ${p}`);
            }
        }
        return __classPrivateFieldGet(this, _Router_instances, "m", _Router_register).call(this, "catcher", methodPaths, pipeline, options);
    }
    catchHead(paths, pipeline, options) {
        paths = Array.isArray(paths) ? paths : [paths];
        const methodPaths = paths.map((p) => `Head ${p}`);
        return __classPrivateFieldGet(this, _Router_instances, "m", _Router_register).call(this, "catcher", methodPaths, pipeline, options);
    }
    catchGet(paths, pipeline, options) {
        paths = Array.isArray(paths) ? paths : [paths];
        const methodPaths = paths.map((p) => `Get ${p}`);
        return __classPrivateFieldGet(this, _Router_instances, "m", _Router_register).call(this, "catcher", methodPaths, pipeline, options);
    }
    catchPost(paths, pipeline, options) {
        paths = Array.isArray(paths) ? paths : [paths];
        const methodPaths = paths.map((p) => `Post ${p}`);
        return __classPrivateFieldGet(this, _Router_instances, "m", _Router_register).call(this, "catcher", methodPaths, pipeline, options);
    }
    catchPut(paths, pipeline, options) {
        paths = Array.isArray(paths) ? paths : [paths];
        const methodPaths = paths.map((p) => `Put ${p}`);
        return __classPrivateFieldGet(this, _Router_instances, "m", _Router_register).call(this, "catcher", methodPaths, pipeline, options);
    }
    catchPatch(paths, pipeline, options) {
        paths = Array.isArray(paths) ? paths : [paths];
        const methodPaths = paths.map((p) => `Patch ${p}`);
        return __classPrivateFieldGet(this, _Router_instances, "m", _Router_register).call(this, "catcher", methodPaths, pipeline, options);
    }
    catchDelete(paths, pipeline, options) {
        paths = Array.isArray(paths) ? paths : [paths];
        const methodPaths = paths.map((p) => `Delete ${p}`);
        return __classPrivateFieldGet(this, _Router_instances, "m", _Router_register).call(this, "catcher", methodPaths, pipeline, options);
    }
    catchOptions(paths, pipeline, options) {
        paths = Array.isArray(paths) ? paths : [paths];
        const methodPaths = paths.map((p) => `Options ${p}`);
        return __classPrivateFieldGet(this, _Router_instances, "m", _Router_register).call(this, "catcher", methodPaths, pipeline, options);
    }
    catchTrace(paths, pipeline, options) {
        paths = Array.isArray(paths) ? paths : [paths];
        const methodPaths = paths.map((p) => `Trace ${p}`);
        return __classPrivateFieldGet(this, _Router_instances, "m", _Router_register).call(this, "catcher", methodPaths, pipeline, options);
    }
    catchConnect(paths, pipeline, options) {
        paths = Array.isArray(paths) ? paths : [paths];
        const methodPaths = paths.map((p) => `Connect ${p}`);
        return __classPrivateFieldGet(this, _Router_instances, "m", _Router_register).call(this, "catcher", methodPaths, pipeline, options);
    }
    filter(methodPaths, pipeline, options) {
        return __classPrivateFieldGet(this, _Router_instances, "m", _Router_register).call(this, "filter", methodPaths, pipeline, options);
    }
    handle(methodPaths, pipeline, options) {
        return __classPrivateFieldGet(this, _Router_instances, "m", _Router_register).call(this, "handler", methodPaths, pipeline, options);
    }
    fallback(methodPaths, pipeline, options) {
        return __classPrivateFieldGet(this, _Router_instances, "m", _Router_register).call(this, "fallback", methodPaths, pipeline, options);
    }
    after(methodPaths, pipeline, options) {
        return __classPrivateFieldGet(this, _Router_instances, "m", _Router_register).call(this, "after", methodPaths, pipeline, options);
    }
    catch(methodPaths, pipeline, options) {
        return __classPrivateFieldGet(this, _Router_instances, "m", _Router_register).call(this, "catcher", methodPaths, pipeline, options);
    }
    splitPath(pathname, parts, maxPath) {
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
    translateRouteFilePath(pathname) {
        const parts = pathname.split("/", __classPrivateFieldGet(this, _Router_config, "f").maxPath + 1);
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
                throw new types_ts_1.RouterError(`Invalid path ${pathname} -> ${part}`);
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
                    }
                    else if (part.startsWith("[") && part.endsWith("]")) {
                        const nextBracketIdx = part.indexOf("[", 1);
                        if (nextBracketIdx < 0) {
                            const extractedPart = part.substring(1, part.length - 1);
                            // check for ## name
                            if (extractedPart.startsWith("##")) {
                                parts[i] = "::" + extractedPart.substring(2).trim();
                            }
                            else {
                                // [name]
                                parts[i] = ":" + extractedPart;
                            }
                        }
                        else {
                            // [[##name]] | [[## name! ]] | [[a,b]name!] | [[a,b] name ] | [[a,b] [name] ]
                            const lastBracketIdx = part.indexOf("]", 1);
                            const separatorIdx = lastBracketIdx >= 0 ? lastBracketIdx : part.length;
                            const paths = part.substring(nextBracketIdx + 1, separatorIdx);
                            // [[##name]] | [[## name]]
                            if (paths.startsWith("##")) {
                                const paramId = paths.substring(2).trim();
                                parts[i] = `::${paramId}!`;
                            }
                            else {
                                const paramId = part
                                    .substring(separatorIdx + 1, part.length - 1)
                                    .trim();
                                // split values a,b,c and replace , with |
                                let newPaths = "";
                                let lastI = 0;
                                for (let i = 0; i < paths.length;) {
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
                                }
                                else {
                                    parts[i] = newPaths + ":" + paramId;
                                }
                            }
                        }
                    }
            }
        }
        if (!lastPartIsEscaped &&
            parts.length > 1 &&
            parts[parts_len_1] === "index") {
            parts[parts_len_1] = "";
        }
        return parts.join("/");
    }
}
exports.Router = Router;
_Router_config = new WeakMap(), _Router_routes = new WeakMap(), _Router_instances = new WeakSet(), _Router_register = function _Router_register(handlerType, methodPaths, pipeline, options) {
    const overwrite = (options === null || options === void 0 ? void 0 : options.overwrite) === true;
    methodPaths = Array.isArray(methodPaths) ? methodPaths : [methodPaths];
    pipeline = Array.isArray(pipeline) ? pipeline : [pipeline];
    for (const methodPath of methodPaths) {
        const [method, originalPath] = methodPath.split(" ", 2);
        const processedPaths = __classPrivateFieldGet(this, _Router_instances, "m", _Router_processPath).call(this, originalPath);
        const { params, paths } = processedPaths;
        const paramsMap = params ? new Map(params) : undefined;
        for (const path of paths) {
            const standardPath = params
                ? path
                    .split("/")
                    .map((p, idx) => (p === "*" ? `:${paramsMap === null || paramsMap === void 0 ? void 0 : paramsMap.get(idx)}` : p))
                    .join("/")
                : path;
            const openApiPath = params
                ? path
                    .split("/")
                    .map((p, idx) => (p === "*" ? `{${paramsMap === null || paramsMap === void 0 ? void 0 : paramsMap.get(idx)}}` : p))
                    .join("/")
                : path;
            const upperMethod = method.toUpperCase();
            if (!exports.HTTP_METHODS_UPPER.has(upperMethod)) {
                throw new types_ts_1.RouterError(`Unsupported HTTP Method ${method}`);
            }
            const routes = __classPrivateFieldGet(this, _Router_routes, "f")[handlerType][upperMethod];
            if (!REGISTER_PATH_REGEX.test(path)) {
                throw new types_ts_1.RouterError(`Invalid path for (${method} ${originalPath} -> ${path})`);
            }
            const parts = path.split("/", __classPrivateFieldGet(this, _Router_config, "f").maxPath + 1);
            if (parts.length - 1 > __classPrivateFieldGet(this, _Router_config, "f").maxPath) {
                throw new types_ts_1.RouterError(`Path parts length limit exceeded ${__classPrivateFieldGet(this, _Router_config, "f").maxPath}`);
            }
            const parts_len_1 = parts.length - 1;
            const hasGlob = parts.some((p) => p === "*");
            const superGlobIndex = path.endsWith("/**") ? path.length - 3 : -1;
            const hasSuperGlob = superGlobIndex >= 0;
            const entry = {
                parseParams: parseParams.bind(null, hasSuperGlob ? superGlobIndex + 1 : undefined, params),
                params,
                pipeline,
                originalPath,
                standardPath,
                openApiPath,
                path,
                pathParts: parts,
                openApi: options === null || options === void 0 ? void 0 : options.openApi,
            };
            // check for super globs
            if (hasSuperGlob) {
                if (hasGlob) {
                    throw new types_ts_1.RouterError(`SuperGlob route with Globs are not allowed. for (${method} ${originalPath} -> ${path})`);
                }
                let superGlobEntries = routes.superGlobs[parts_len_1];
                const basePath = path.substring(0, superGlobIndex + 1);
                if (!overwrite &&
                    superGlobEntries &&
                    superGlobEntries.has(basePath)) {
                    throw new types_ts_1.RouterError(`SuperGlob route already set for (${method} ${originalPath} -> ${path})`);
                }
                if (superGlobEntries == null) {
                    superGlobEntries = new Map();
                    routes.superGlobs[parts_len_1] = superGlobEntries;
                }
                superGlobEntries.set(basePath, entry);
            }
            else if (hasGlob) {
                // check for globs
                let globEntries = routes.globs[parts.length];
                if (globEntries) {
                    if (!overwrite && globEntries && globEntries.has(path)) {
                        throw new types_ts_1.RouterError(`Glob route already set for (${method} ${originalPath} -> ${path})`);
                    }
                    // check for collision
                    for (const globEntry of globEntries.values()) {
                        let collision = -1;
                        for (let i = 1; i < parts.length; i++) {
                            if (parts[i] === "*" && globEntry.pathParts[i] === "*") {
                                collision = i;
                            }
                            else if (parts[i] !== globEntry.pathParts[i]) {
                                collision = -1;
                                break;
                            }
                        }
                        if (collision >= 0 && !overwrite) {
                            throw new types_ts_1.RouterError(`Route collision for (${method} ${originalPath} -> ${path} with ${globEntry.originalPath} at ${parts.slice(0, collision + 1).join("/")})`);
                        }
                    }
                }
                if (globEntries == null) {
                    globEntries = new Map();
                    routes.globs[parts.length] = globEntries;
                }
                globEntries.set(path, entry);
            }
            else {
                let entries = routes.entries[parts.length];
                if (!overwrite && entries && entries.has(path)) {
                    throw new types_ts_1.RouterError(`Route already set for (${method} ${originalPath} -> ${path})`);
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
}, _Router_processPath = function _Router_processPath(path) {
    const processedPaths = {
        paths: [""],
    };
    const parts = path.split("/", __classPrivateFieldGet(this, _Router_config, "f").maxPath + 1);
    const parts_len_1 = parts.length - 1;
    for (let i = 1; i < parts.length; i++) {
        const part = parts[i];
        const partIncludesPipe = part.includes("|");
        const partIncludesColon = part.includes(":");
        if (partIncludesPipe && !partIncludesColon) {
            const subParts = part.split("|");
            const prevProcessedPath = [...processedPaths.paths];
            for (let k = 0; k < processedPaths.paths.length; k++) {
                processedPaths.paths[k] += "/" + subParts[0];
            }
            for (let j = 1; j < subParts.length; j++) {
                for (let k = 0; k < prevProcessedPath.length; k++) {
                    processedPaths.paths.push(prevProcessedPath[k] + "/" + subParts[j]);
                }
            }
        }
        else if (partIncludesColon && part.startsWith("::")) {
            // /::named-super-glob
            const endTokenIdx = part.lastIndexOf("!");
            const paramId = endTokenIdx > 0 ? part.substring(2, endTokenIdx) : part.substring(2);
            if (processedPaths.params == null) {
                processedPaths.params = [];
            }
            processedPaths.params.push([i, paramId]);
            if (endTokenIdx > 0) {
                const prevProcessedPath = [...processedPaths.paths];
                for (let k = 0; k < prevProcessedPath.length; k++) {
                    processedPaths.paths.push(prevProcessedPath[k] + "/**");
                }
            }
            else {
                for (let j = 0; j < processedPaths.paths.length; j++) {
                    processedPaths.paths[j] += "/**";
                }
            }
            break;
        }
        else if (partIncludesColon) {
            // /:param | /:param! | /a|b|c:certain-param
            if (processedPaths.params == null) {
                processedPaths.params = [];
            }
            const colonIdx = partIncludesPipe
                ? part.lastIndexOf(":")
                : part.indexOf(":");
            const subPartsStr = part.substring(0, colonIdx);
            const endTokenIdx = part.lastIndexOf("!");
            const paramId = endTokenIdx > 0
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
                            processedPaths.paths.push(prevProcessedPath[k] + "/" + subParts[j]);
                        }
                    }
                }
                else {
                    for (let j = 0; j < subParts.length; j++) {
                        for (let k = 0; k < prevProcessedPath.length; k++) {
                            processedPaths.paths.push(prevProcessedPath[k] + "/" + subParts[j]);
                        }
                    }
                }
            }
            else if (endTokenIdx > 0) {
                const prevProcessedPath = [...processedPaths.paths];
                for (let k = 0; k < prevProcessedPath.length; k++) {
                    processedPaths.paths.push(prevProcessedPath[k] + "/*");
                }
            }
            else {
                for (let j = 0; j < processedPaths.paths.length; j++) {
                    processedPaths.paths[j] += "/*";
                }
            }
        }
        else if (part === "*!" || (i >= parts_len_1 && part === "**!")) {
            const endTokenIdx = part.lastIndexOf("!");
            const globPath = "/" +
                (endTokenIdx > 0
                    ? part.substring(0, endTokenIdx)
                    : part.substring(0));
            const prevProcessedPath = [...processedPaths.paths];
            for (let k = 0; k < prevProcessedPath.length; k++) {
                processedPaths.paths.push(prevProcessedPath[k] + globPath);
            }
        }
        else {
            for (let j = 0; j < processedPaths.paths.length; j++) {
                processedPaths.paths[j] += "/" + part;
            }
        }
    }
    return processedPaths;
}, _Router_getRouteEntries = function _Router_getRouteEntries(pathname, parts, routes, noBubble) {
    var _a;
    if (routes == null)
        return [];
    const routeEntries = [];
    const parts_len_1 = parts.length - 1;
    // match exact
    {
        const routeEntry = (_a = routes.entries[parts.length]) === null || _a === void 0 ? void 0 : _a.get(pathname);
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
        let globPath = pathname.length > 1
            ? pathname.substring(0, pathname.lastIndexOf("/", pathname.length - 1) + 1)
            : pathname;
        for (let i = parts_len_1; i > 0; i--,
            globPath = globPath.substring(0, globPath.lastIndexOf("/", globPath.length - 2) + 1)) {
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
}, _Router_InitEntries = function _Router_InitEntries(method) {
    return {
        method,
        entries: new Array(__classPrivateFieldGet(this, _Router_config, "f").maxPath + 1),
        globs: new Array(__classPrivateFieldGet(this, _Router_config, "f").maxPath + 1),
        superGlobs: new Array(__classPrivateFieldGet(this, _Router_config, "f").maxPath + 1),
    };
}, _Router_initRoutes = function _Router_initRoutes() {
    const routes = {};
    for (const handlerType of exports.HANDLER_TYPES.keys()) {
        routes[handlerType] = {
            HEAD: __classPrivateFieldGet(this, _Router_instances, "m", _Router_InitEntries).call(this, "HEAD"),
            GET: __classPrivateFieldGet(this, _Router_instances, "m", _Router_InitEntries).call(this, "GET"),
            POST: __classPrivateFieldGet(this, _Router_instances, "m", _Router_InitEntries).call(this, "POST"),
            PUT: __classPrivateFieldGet(this, _Router_instances, "m", _Router_InitEntries).call(this, "PUT"),
            PATCH: __classPrivateFieldGet(this, _Router_instances, "m", _Router_InitEntries).call(this, "PATCH"),
            DELETE: __classPrivateFieldGet(this, _Router_instances, "m", _Router_InitEntries).call(this, "DELETE"),
            OPTIONS: __classPrivateFieldGet(this, _Router_instances, "m", _Router_InitEntries).call(this, "OPTIONS"),
            TRACE: __classPrivateFieldGet(this, _Router_instances, "m", _Router_InitEntries).call(this, "TRACE"),
            CONNECT: __classPrivateFieldGet(this, _Router_instances, "m", _Router_InitEntries).call(this, "CONNECT"),
        };
    }
    return routes;
};
const parseParams = (superGlobIndex, params, pathname, parts) => {
    if (params == null && superGlobIndex == null)
        return undefined;
    const paramsRec = {};
    if (params != null && superGlobIndex != null) {
        const name = params[0][1];
        paramsRec[name] = pathname.substring(superGlobIndex);
    }
    else if (params != null) {
        for (const [idx, paramId] of params) {
            paramsRec[paramId] = parts[idx];
        }
    }
    return paramsRec;
};
exports.default = Router;
//# sourceMappingURL=router.js.map