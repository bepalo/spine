// src/utils.deno.ts

import { join, resolve, relative } from "jsr:@std/path@1";
import { DirWalkNode } from "./utils.ts";
import { pathToFileURL } from "node:url";

export async function* walk(
  dir: string,
  rootPath?: string,
): AsyncGenerator<DirWalkNode> {
  rootPath = rootPath || dir;
  for await (const entry of Deno.readDir(dir)) {
    const name = entry.name;
    const parent = relative(rootPath, dir).replace(/\\/g, "/");
    const path = join(dir, name).replace(/\\/g, "/");
    const fullPath = resolve(dir, name).replace(/\\/g, "/");
    const relativePath = relative(rootPath, path).replace(/\\/g, "/");
    if (entry.isDirectory) {
      yield { type: "dir", name, path, parent, fullPath, relativePath };
      yield* walk(path, rootPath);
    } else {
      yield { type: "file", name, path, parent, fullPath, relativePath };
    }
  }
}

export const dynamicImport = async (fullPath: string): Promise<unknown> => {
  return await import(pathToFileURL(fullPath).href);
};
