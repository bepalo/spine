import {
  HandlerType,
  HttpMethod,
  HttpMethodUpper,
  RouterError,
} from "./types.ts";
import { Router, HTTP_METHODS_UPPER, HANDLER_TYPES } from "./router.ts";
import { walk, dynamicImport } from "./utils.deno.ts";

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
      Object.entries(options).length > 0 ? `, getOptions(${entryId})` : "";
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

export const generateRoutesFileContent = async (
  router: Router,
  routesPath: string,
  importRoot: string = "./",
) => {
  let imports = "";
  let loads = "";
  const prefix = "route";
  const map = new Map<
    string,
    Array<Record<"name" | "pathname" | "importStr" | "loadStr", string>>
  >();
  for await (const node of walk(routesPath)) {
    const { name, type, relativePath, fullPath, parent, path: _path } = node;
    if (type === "file") {
      const pureRelativePath = relativePath.substring(
        0,
        relativePath.lastIndexOf("."),
      );
      let pathname = router.translateRouteFilePath("/" + pureRelativePath);
      pathname = pureRelativePath.endsWith("/index")
        ? pathname.substring(0, pathname.length - 1)
        : pathname;
      const processedPathname = pathname
        .replace(/\//g, "_")
        .replace(/(\*{1,2})!?/g, (_m, m1) => "$".repeat(m1.length))
        .replace(
          /(_.+?(?:\|.+?)*)?\:{1,2}(.*)!?[\/$]?/g,
          (_m, m1, m2) => (m1 ? m1.replace(/\|/g, "$") + "$$" : "") + "$" + m2,
        );
      const importName = prefix + processedPathname;
      const importPath = importRoot + pureRelativePath;
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
  }
  // append in a sorted order
  map.forEach((e) => e.sort((a, b) => a.pathname.localeCompare(b.pathname)));
  const sortedEntries = Array.from(map.entries()).sort((a, b) =>
    a[0].localeCompare(b[0]),
  );
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
};

export default generateRoutesFileContent;
