// src/auth-middlewares.ts

import { status } from "./helpers.ts";
import {
  Break_Pipeline,
  RouterError,
  type Context,
  type Handler,
} from "./types.ts";

/**
 * Represents an authenticated user.
 *
 * @template {Record<string, unknown>} ExtendAuth - Extend Auth Context
 */
export type Auth<
  ExtendAuth extends Record<string, unknown> = Record<string, never>,
> = {
  /** Role assigned to the user (e.g., "admin", "user") */
  role: string;
} & ExtendAuth;

/**
 * Context extension that includes authentication information.
 *
 * @template {Record<string, unknown>} ExtendAuth - Extend Auth Context
 */
export type CTAuth<
  ExtendAuth extends Record<string, unknown> = Record<string, never>,
> = {
  /** Authenticated user details */
  auth?: Auth<ExtendAuth>;
};

/**
 * auth context parser for authenticate middleware
 *
 * @template {Record<string, unknown>} ExtendAuth - Extend Auth Context
 * @template {Record<string, unknown>} ExtendContext - Extend Router Context
 */
export type ParseAuthFn<
  ExtendAuth extends Record<string, unknown> = Record<string, never>,
  ExtendContext extends Record<string, unknown> = Record<string, never>,
> = (
  ctx: Context<CTAuth<ExtendAuth> & ExtendContext>,
) =>
  | Promise<Auth<ExtendAuth> | Response | null | undefined>
  | Auth<ExtendAuth>
  | Response
  | null
  | undefined;

/**
 * Middleware to authenticate a request.
 *
 * @template {Record<string, unknown>} ExtendAuth - Extend Auth Context
 * @template {Record<string, unknown>} ExtendContext - Extend Router Context
 * @param {Object} [options] - Configuration options.
 * @param {ParseAuthFn}[options.parseAuth] - Function to extract authentication info from the request.
 *   Should return an `Auth` object if valid, `Error` if invalid, or `null/undefined` if missing.
 * @param {boolean} [options.breakPipeline=false] - If true, stops only pipe flow per handler type after success.
 * @param {boolean} [options.checkOnly=false] - If true, only checks authentication without returning a response.
 *
 * @returns {Handler<CTAuth<ExtendAuth> & ExtendContext>} A handler that sets `ctx.auth` if authentication succeeds,
 *   otherwise returns a `401 Unauthorized` or with error message if available response (unless `checkOnly` is true).
 */
export const authenticate = <
  ExtendAuth extends Record<string, unknown> = Record<string, never>,
  ExtendContext extends Record<string, unknown> = Record<string, never>,
>({
  parseAuth,
  breakPipeline = false,
  checkOnly = false,
}: {
  parseAuth: ParseAuthFn<ExtendAuth, ExtendContext>;
  breakPipeline?: boolean;
  checkOnly?: boolean;
}): Handler<CTAuth<ExtendAuth> & ExtendContext> => {
  return async function (ctx) {
    const auth = await parseAuth(ctx);
    if (auth == null) {
      if (checkOnly) {
        return;
      }
      return status(401);
    } else if (auth instanceof Response) {
      if (checkOnly) {
        return;
      }
      return auth;
    }
    ctx.auth = auth;
    if (breakPipeline) {
      return Break_Pipeline;
    }
  };
};

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
 * @param {boolean} [options.breakPipeline=false] - If true, stops only pipe flow per handler type after success.
 *
 * @returns {Handler<CTAuth & ExtendContext>} A handler that checks `ctx.auth` and enforces role/permission rules.
 *   Returns `401 Unauthorized` if no auth is present, or `403 Forbidden` if checks fail.
 *   Throws an error if `permissions` is set without `hasPermission`.
 *
 */
export const authorize = <
  ExtendAuth extends Record<string, unknown> = Record<string, never>,
  ExtendContext extends Record<string, unknown> = Record<string, never>,
>({
  allowRole,
  forbidRole,
  permissions,
  hasPermission,
  breakPipeline = false,
}: {
  allowRole?: (role: string) => boolean;
  forbidRole?: (role: string) => boolean;
  permissions?: string[];
  hasPermission?: (
    permission: string,
    role: string,
  ) => boolean | null | undefined;
  breakPipeline?: boolean;
}): Handler<CTAuth<ExtendAuth> & ExtendContext> => {
  if (permissions && !hasPermission) {
    throw new RouterError(
      "authorize middleware 'permissions' require 'hasPermission'",
    );
  }
  return ({ auth }) => {
    if (auth == null) {
      return status(401);
    }
    if (allowRole && !allowRole(auth.role)) {
      return status(403);
    }
    if (forbidRole && forbidRole(auth.role)) {
      return status(403);
    }
    if (permissions && hasPermission) {
      const permitted = permissions.some((permission) =>
        hasPermission(permission, auth.role),
      );
      if (!permitted) return status(403);
    }
    if (breakPipeline) {
      return Break_Pipeline;
    }
  };
};

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
export const basicAuthParser = <
  ExtendAuth extends { username: string } & Record<string, unknown> = {
    username: string;
  },
  ExtendContext extends Record<string, unknown> = Record<string, never>,
>({
  validateCredentials,
  type = "base64",
  separator = ":",
  realm = "Protected",
  defaultRole = "user",
}: {
  validateCredentials: (credentials: {
    username: string;
    password: string;
  }) =>
    | Promise<boolean | Response | Auth<ExtendAuth>>
    | boolean
    | Response
    | Auth<ExtendAuth>;
  type?: "raw" | "base64";
  separator?: ":" | " ";
  realm?: string;
  defaultRole?: string;
}): ParseAuthFn<ExtendAuth, ExtendContext> => {
  return async (ctx: Context<CTAuth<ExtendAuth> & ExtendContext>) => {
    const { request } = ctx;
    const authorization = request.headers.get("authorization");
    ctx.headers.set(
      "WWW-Authenticate",
      `Basic realm="${realm}", charset="UTF-8"`,
    );
    if (!authorization) return status(401);
    const [scheme, creds] = authorization.split(" ", 2);
    if (!scheme || !creds || scheme.toLowerCase() !== "basic")
      return status(401);
    let xcreds = creds;
    if (type === "base64") {
      try {
        xcreds = atob(creds);
      } catch {
        return status(401);
      }
    }
    const [username, password] = xcreds.split(separator, 2);
    if (!username || !password) return status(401);
    const credentials = {
      username,
      password,
    };
    const credentailsValidation = await validateCredentials(credentials);
    if (credentailsValidation instanceof Response) {
      return credentailsValidation;
    }
    if (!credentailsValidation) return status(401);
    return credentailsValidation === true
      ? ({ username, role: defaultRole } as Auth<ExtendAuth>)
      : credentailsValidation;
  };
};
