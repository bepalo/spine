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
Object.defineProperty(exports, "__esModule", { value: true });
exports.basicAuthParser = exports.authorize = exports.authenticate = void 0;
const helpers_ts_1 = require("./helpers.js");
const types_ts_1 = require("./types.js");
/**
 * Middleware to authenticate a request.
 *
 * @template {Record<string, unknown>} ExtendAuth - Extend Auth Context
 * @template {Record<string, unknown>} ExtendContext - Extend Router Context
 * @param {Object} [options] - Configuration options.
 * @param {ParseAuthFn}[options.parseAuth] - Function to extract authentication info from the request.
 *   Should return an `Auth` object if valid, `Error` if invalid, or `null/undefined` if missing.
 * @param {boolean} [options.breakPipeline=false] - If true, stops only pipeline flow per handler type after success.
 * @param {boolean} [options.checkOnly=false] - If true, only checks authentication without returning a response.
 *
 * @returns {Handler<CTAuth<ExtendAuth> & ExtendContext>} A handler that sets `ctx.auth` if authentication succeeds,
 *   otherwise returns a `401 Unauthorized` or with error message if available response (unless `checkOnly` is true).
 */
const authenticate = ({ parseAuth, breakPipeline = false, checkOnly = false, }) => {
    return function (ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            const auth = yield parseAuth(ctx);
            if (auth == null) {
                if (checkOnly) {
                    return;
                }
                return (0, helpers_ts_1.status)(401);
            }
            else if (auth instanceof Response) {
                if (checkOnly) {
                    return;
                }
                return auth;
            }
            ctx.auth = auth;
            if (breakPipeline) {
                return types_ts_1.Break_Pipeline;
            }
        });
    };
};
exports.authenticate = authenticate;
/**
 * Middleware to authorize a request based on role or permissions.
 *
 * @template {Record<string, unknown>} ExtendAuth - Extend Auth Context
 * @template {Record<string, unknown>} ExtendContext - Extend Router Context
 * @param {Object} [options] - Configuration options.
 * @param {(role: string) => boolean}[options.allowRole] - Function to check if a role is allowed.
 * @param {(role: string) => boolean}[options.forbidRole] - Function to check if a role is forbidden.
 * @param {string[]}[options.permissions] - List of permissions required for access.
 * @param {(permission: string,role: string) => boolean|null|undefined}[options.hasPermission] - Function to check if a role has a given permission.
 *   Required if `permissions` is provided.
 * @param {boolean} [options.breakPipeline=false] - If true, stops only pipeline flow per handler type after success.
 *
 * @returns {Handler<CTAuth & ExtendContext>} A handler that checks `ctx.auth` and enforces role/permission rules.
 *   Returns `401 Unauthorized` if no auth is present, or `403 Forbidden` if checks fail.
 *   Throws an error if `permissions` is set without `hasPermission`.
 *
 */
const authorize = ({ allowRole, forbidRole, permissions, hasPermission, breakPipeline = false, }) => {
    if (permissions && !hasPermission) {
        throw new types_ts_1.RouterError("authorize middleware 'permissions' require 'hasPermission'");
    }
    return ({ auth }) => {
        if (auth == null) {
            return (0, helpers_ts_1.status)(401);
        }
        if (allowRole && !allowRole(auth.role)) {
            return (0, helpers_ts_1.status)(403);
        }
        if (forbidRole && forbidRole(auth.role)) {
            return (0, helpers_ts_1.status)(403);
        }
        if (permissions && hasPermission) {
            const permitted = permissions.some((permission) => hasPermission(permission, auth.role));
            if (!permitted)
                return (0, helpers_ts_1.status)(403);
        }
        if (breakPipeline) {
            return types_ts_1.Break_Pipeline;
        }
    };
};
exports.authorize = authorize;
/**
 * Returns a Basic Authenticator for authenticate middleware.
 * Supports RFC 7617 Basic Authentication scheme.
 *
 * @template {Record<string, unknown>} ExtendAuth - Extend Auth Context
 * @template {Record<string, unknown>} ExtendContext - Extend Router Context
 * @param {Object} config - Basic Authentication configuration
 * @param {(credentials: {username:string;password:string;})=>|Promise<boolean | Response | Auth<ExtendAuth>>|boolean|Response|Auth<ExtendAuth>} config.validateCredentials - Callback to validate credentials
 * @param {"base64"|"raw"} [config.type="base64"] - Credential encoding type
 * @param {":"|" "} [config.separator=":"] - Separator between username and password
 * @param {string} [config.realm="Protected"] - Authentication realm
 * @param {prop} [config.ctxProp="basicAuth"] - Context property name for auth data
 * @returns {Function} Middleware function that validates Basic Authentication
 *
 * @example
 * // Simple username/password authentication
 * const authProtection = authenticate({
 *     parseAuth: basicAuthParser({
 *       validateCredentials: ({ username, password }) => {
 *         const passwordBuffer = new TextEncoder().encode(password);
 *         const verifyBuffer = new TextEncoder().encode("Admin");
 *         if (passwordBuffer.length !== verifyBuffer.length)
 *           return !crypto.timingSafeEqual(verifyBuffer, verifyBuffer);
 *         return crypto.timingSafeEqual(passwordBuffer, verifyBuffer);
 *       },
 *       // type: "base64",
 *       // separator: ":",
 *       realm: "Dashboard",
 *     }),
 *   })
 * router.filterGet<CTAuth<{ username: string }>>("/dashboard/.**", [
 *   authProtection,
 * ]);
 */
const basicAuthParser = ({ validateCredentials, type = "base64", separator = ":", realm = "Protected", defaultRole = "user", }) => {
    return (ctx) => __awaiter(void 0, void 0, void 0, function* () {
        const { request } = ctx;
        const authorization = request.headers.get("authorization");
        ctx.headers.set("WWW-Authenticate", `Basic realm="${realm}", charset="UTF-8"`);
        if (!authorization)
            return (0, helpers_ts_1.status)(401);
        const [scheme, creds] = authorization.split(" ", 2);
        if (!scheme || !creds || scheme.toLowerCase() !== "basic")
            return (0, helpers_ts_1.status)(401);
        let xcreds = creds;
        if (type === "base64") {
            try {
                xcreds = atob(creds);
            }
            catch (_a) {
                return (0, helpers_ts_1.status)(401);
            }
        }
        const [username, password] = xcreds.split(separator, 2);
        if (!username || !password)
            return (0, helpers_ts_1.status)(401);
        const credentials = {
            username,
            password,
        };
        const credentailsValidation = yield validateCredentials(credentials);
        if (credentailsValidation instanceof Response) {
            return credentailsValidation;
        }
        if (!credentailsValidation)
            return (0, helpers_ts_1.status)(401);
        return credentailsValidation === true
            ? { username, role: defaultRole }
            : credentailsValidation;
    });
};
exports.basicAuthParser = basicAuthParser;
//# sourceMappingURL=auth-middlewares.js.map