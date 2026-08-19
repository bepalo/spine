// src/utils.node.ts

import { DirWalkNode } from "./utils.ts";
import { readdir } from "node:fs/promises";
import { join, resolve, relative } from "node:path";
import { pathToFileURL } from "node:url";

export async function* walk(
  dir: string,
  rootPath?: string,
): AsyncGenerator<DirWalkNode> {
  rootPath = rootPath || dir;
  for (const entry of await readdir(dir, {
    withFileTypes: true,
  })) {
    const name = entry.name;
    const parent = relative(rootPath, dir).replace(/\\/g, "/");
    const path = join(dir, name).replace(/\\/g, "/");
    const fullPath = resolve(dir, name).replace(/\\/g, "/");
    const relativePath = relative(rootPath, path).replace(/\\/g, "/");
    if (entry.isDirectory()) {
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
