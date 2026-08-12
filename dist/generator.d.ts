import { DirWalkNode } from "./utils.ts";
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
export declare const generateStaticRoutesImporter: ({ routesPath, importRoot, usePathForIdGeneration, importExtensions, pattern, dirPattern, processName, onError, }: {
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
}) => Promise<string>;
export default generateStaticRoutesImporter;
//# sourceMappingURL=generator.d.ts.map