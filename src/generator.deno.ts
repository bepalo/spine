import {
  HandlerType,
  HttpMethod,
  HttpMethodUpper,
  RouterError,
} from "./types.ts";
import {
  HTTP_METHODS_UPPER,
  HANDLER_TYPES,
  translateRouteFilePath,
} from "./router.ts";
import { walk, dynamicImport } from "./utils.deno.ts";
import { hash } from "node:crypto";
import { DirWalkNode } from "./utils.ts";

function getRouteLoaders(
  routerId: string,
  moduleId: string,
  pathname: string,
  module: object,
  importPath: string,
) {
  let setters = "";
  for (const [methodHandler, def] of Object.entries(module)) {
    // get method and handler type
    const [method_, handlerType_] = methodHandler.split("_", 2);
    let method: HttpMethod;
    let handlerType: HandlerType = "handler";
    if (HTTP_METHODS_UPPER.has(method_.toUpperCase() as HttpMethodUpper)) {
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
    if (
      !(
        Array.isArray(def) ||
        typeof def === "function" ||
        typeof def === "object"
      )
    ) {
      // throw new RouterError(`Invalid route definition type \`${typeof def}\` '${methodHandler}' in ${importPath}`);
      console.error(
        new RouterError(
          `Invalid route definition type \`${typeof def}\` '${methodHandler}' in ${importPath}`,
        ),
      );
      continue;
    }
    const defIsObject = !Array.isArray(def) && typeof def === "object";
    // get pipe and any other options
    const { pipe, ...options } = defIsObject
      ? (def as { pipe: unknown })
      : { pipe: def };
    if (!(Array.isArray(pipe) || typeof pipe === "function")) {
      // throw new RouterError(`Invalid route 'pipe' type \`${typeof pipe}\` in ${importPath}`);
      console.error(
        new RouterError(
          `Invalid route 'pipe' type \`${typeof pipe}\` in ${importPath}`,
        ),
      );
      continue;
    }
    const entryId = `${moduleId}.${methodHandler}`;
    const optionsStr =
      Object.entries(options).length > 0 ? `, $O(${entryId})` : "";
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
export const generateStaticRoutesImporter = async ({
  routesPath,
  importRoot = "./",
  usePathForIdGeneration = false,
  importExtensions = false,
  pattern = /\.(js|ts|mjs|cjs)$/,
  dirPattern = /.*/,
  processName = (name: string) => name.substring(0, name.lastIndexOf(".")),
  onError,
}: {
  routesPath: string;
  importRoot: string;
  usePathForIdGeneration?: boolean;
  importExtensions?: boolean | { (name: string): string };
  pattern?: RegExp;
  dirPattern?: RegExp;
  processName?: (name: string) => string;
  onError?: (error: Error | unknown, node: DirWalkNode) => boolean | void;
}): Promise<string> => {
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
            : hash("sha1", pureRelativePath, "base64url").replace(
                /[^a-zA-Z0-9_]/g,
                "_",
              ));
        const importPath = importRoot + pureRelativePath + extension;
        const module = (await dynamicImport(fullPath)) as object;
        const routeDef =
          "  " + getRouteLoaders("router", importName, pathname, module, _path);
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

export default generateStaticRoutesImporter;
