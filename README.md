# 🏆 @bepalo/spine

![hero](./assets/spine-hero.png)

[![npm version](https://img.shields.io/npm/v/@bepalo/spine.svg)](https://www.npmjs.com/package/@bepalo/spine)
[![CI](https://img.shields.io/github/actions/workflow/status/bepalo/spine/ci.yaml?label=ci)](https://github.com/bepalo/spine/actions/workflows/ci.yaml)
[![tests](https://img.shields.io/github/actions/workflow/status/bepalo/spine/testing.yaml?label=tests)](https://github.com/bepalo/spine/actions/workflows/testing.yaml)
[![license](https://img.shields.io/npm/l/@bepalo/spine.svg)](LICENSE)
![Benchmarked](https://img.shields.io/badge/benchmarked-yes-green)

<!--
[![Vitest](https://img.shields.io/badge/vitest-6E9F18?style=for-the-badge&logo=vitest&logoColor=white)](test-result.md) -->

**A fast, runtime-agnostic HTTP router for JavaScript and TypeScript.**

Spine is a low-level routing layer built around the Web `Request`/`Response` APIs. It gives you fast, predictable route matching, typed contexts, composable handler pipelines, and the freedom to run it on top of any HTTP server.

```text
                       ( @Bepalo/spine )

                      ( The Router Pipeline )

                          ┌───────────────────────┐
                          ▼                       │
                   ┌──────┴───────┐               │
         ┌─────────│   Filters    │─────────┐ <request>
         │         └──────┬───────┘         │     │
         │      <no match nor response>     │     │
         │                ▼                 │     │
         │         ┌──────┴───────┐         │  ┌──┴────────┐
         ├─────────│   Handlers   │─────────┤  │   Server  │◄───┐
         │         └──────┬───────┘         │  └──┬─────┬──┘    │
         │      <no match nor response>     │     ▲     │   <request>
      <error>             ▼                 │     │ <response>  │
         │         ┌──────┴───────┐         │     │     ▼       │
         ├─────────│  Fallbacks   │─────────┤     │   ┌─┴───────┴─┐
         ▼         └──────┬───────┘         │     │   │   Client  │
   ┌─────┴──────┐         │   ┌──<response>─┘     │   └───────────┘
   │  Catchers  │         ▼   ▼                   │
   └─────┬──────┘  ┌──────┴───┴───┐               │
         └────────►│   Afters     │───────────────┘
  <error-response> └──────────────┘  <final-response>
```

```text
Benchmark Bun.serve baseline: @bepalo/spine vs Hono
Bun runtime · localhost · 20,000 sequential requests per route

              Bun          Spine          Hono     ┌──────────────┐
───────────────────────────────────────────────    │    Server    │
/             9.91k         8.64k         8.19k    └──────┬───────┘
exact        10.33k         8.42k         8.19k        Request
long exact   10.34k         8.28k         7.99k           ▼
one param     9.99k         8.16k         7.86k    ┌──────────────┐
two params   10.17k         8.04k         7.66k    │    Spine     │
three params  9.99k         7.68k         6.76k    │    Router    │
six params    9.88k         7.91k         7.51k    └──────┬───────┘
ten params    9.78k         7.90k         7.12k        Response
                                                          ▼
Average       10.05k        8.13k         7.65k    ┌──────────────┐
                                          ops/s    │    Server    │
                                                   └──────────────┘
    ████████████████████████████████████████ Bun
    █████████████████████████████████ Spine
    ████████████████████████████████ Hono
```

## Why Spine?

- ⚡ **Low-overhead routing** — specialized route tables for exact, glob, and super-glob routes
- 🎯 **Powerful route patterns** — parameters, alternatives, `*`, `*!`, `**`, and `**!`
- 🔗 **Composable pipelines** — filters, handlers, fallbacks, catchers, and after-hooks
- 🧠 **TypeScript-first** — extend the request context with your own application data
- 🌐 **Runtime agnostic** — works with Bun, Deno, Node.js, and other Web API-compatible runtimes
- 📁 **File-based routing** — optionally load routes directly from a directory structure
- 📖 OpenAPI 3.0 generation — route metadata, tags, parameters, schemas, security, components, and configurable sorting
- 🛠️ **Built-in utilities** — request parsing, responses, CORS, rate limiting, and authentication
- 🪶 **No server lock-in** — Spine only deals with `Request` in and `Response` out

## 📑 Table of Contents

- [Quick Start](#quick-start)
- [Real World Usecase Example](#real-world-usecase-example)
- [Routing](#routing)
  - [Parameters](#parameters)
  - [Alternatives](#alternatives)
  - [Wildcards](#wildcards)
  - [File-Based Wildcards](#file-based-wildcards)

- [Handler Pipeline](#handler-pipeline)
  - [Filter Pipes](#filter-pipes)
  - [Handler Pipes](#handler-pipes)

- [Type-Safe Context](#type-safe-context)
- [File-Based Routing](#file-based-routing)
- [Built for HTTP APIs](#built-for-http-apis)
  - [Request parsing](#request-parsing)
  - [Responses](#responses)
  - [CORS and rate limiting](#cors-and-rate-limiting)
  - [Authentication](#authentication)

- [OpenAPI](#openapi)
- [Error Handling](#error-handling)
- [Performance](#performance)
- [License](#-license)
- [Thanks and Enjoy](#️-thanks-and-enjoy)
- [Be a Sponsor](#-be-a-sponsor)

## Quick Start

Install

```sh
pnpm add @bepalo/spine
# or
npm install @bepalo/spine
# or
bun add @bepalo/spine
```

```ts
import {
  Router,
  json,
  text,
  toBase64UUID,
  parseBody,
  parseMultipart,
} from "@bepalo/spine";

// A user defined custom context shared accross the router
type CTSpineApp = { clientId: string; requestId: string };

const spine = new Router<CTSpineApp>();

spine.get("/", () => text("Hello, Spine!"));

// pipe specific context extension using CT* context extension types.
spine.get<CTQuery<"q" | "page">>("/search", [
  parseQuery(),
  ({ query: { q, page } }) => json({ q, page }),
]);

spine.get("/users/:id", ({ params: { id } }) => json({ id }));

spine.post<CTBody<object>>("/users", [
  parseBody({ accept: ["application/json"], maxSize: 1024 }),
  () => json({ created: true }, { status: 201 }),
]);

// Serve with Bun
Bun.serve({
  port: 3000,
  fetch: async (request, server) =>
    await spine.respond(request, {
      headers: new Header({ "X-Powered-By": "@bepalo/spine" }),
      requestId: toBase64UUID(crypto.randomUUID()), // compress UUID to base64url 'I6qNV82UTmulXhEhxHpZxw'
      clientId: server.requestIP(req).address ?? "anonymous",
    }),
});

// Serve with Deno
Deno.serve(
  {
    port: 3000,
  },
  (request) => async (request, server) =>
    await spine.respond(request, {
      headers: new Header({ "X-Powered-By": "@bepalo/spine" }),
      requestId: toBase64UUID(crypto.randomUUID()),
      clientId: remoteAddr.hostname ?? "anonymous",
    }),
);
```

That's the core API.

Spine does not create or manage your server. Your runtime gives Spine a standard `Request`, and Spine returns a standard `Response`.

```ts
const response = await spine.respond(request);
```

This makes the spine easy to embed into servers, frameworks, workers, and custom runtimes.

## Sneek peek of what is possible

### `src/utils/generate.ts`

<details open>

<summary> Generator utilities to watch for changes and generate static-routes-imports and static-assets-manifest.</summary>

```ts
// src/utils/generate.ts
import {
  generateStaticAssetsManifestWatcher,
  generateStaticRoutesWatcher,
} from "@bepalo/spine";
import { writeFile } from "node:fs/promises";
import { readFile } from "node:fs/promises";

const abortController = new AbortController();

// setTimeout(() => abortController.abort(), 10000);

generateStaticRoutesWatcher({
  routesPath: "./routes",
  importRoot: "./routes/",
  output: "./routes.ts",
  read: (filepath) => readFile(filepath, { encoding: "utf-8" }),
  write: (filepath, content) =>
    writeFile(filepath, content, { encoding: "utf-8" }),
  abortSignal: abortController.signal,
  // generateDelay: 1000,
});

generateStaticAssetsManifestWatcher({
  assetsPath: "./public",
  output: "./static-assets.json",
  abortSignal: abortController.signal,
  sortOrder: 1,
  // exclude: ({ name, ext }) => !name || ext === ".env",
  read: (filepath) => readFile(filepath, { encoding: "utf-8" }),
  write: (filepath, content) =>
    writeFile(filepath, content, { encoding: "utf-8" }),
  // generateDelay: 1000,
});
```

</details>

### Static assets

#### `404.html`

<details>
<summary>404.html</summary>

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Document</title>
  </head>

  <body>
    <h1>404 Page not found!</h1>
    <p>We couldn't locate the page you were looking for</p>
  </body>
</html>
```

</details>

#### `500.html`

</details>

<details>
<summary>500.html</summary>

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Document</title>
  </head>

  <body>
    <h1>{{STATUS}} {{STATUS_TEXT}}</h1>
    <p><strong>{{ERROR}}!</strong></p>
  </body>
</html>
```

</details>

#### `Swagger`

<details>
<summary> public/openapi/index.html</summary>

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content="SwaggerUI" />
    <title>SwaggerUI</title>
    <link
      rel="stylesheet"
      href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css"
    />
  </head>

  <body>
    <div id="swagger-ui"></div>
    <script
      src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"
      crossorigin
    ></script>
    <script>
      window.onload = () => {
        window.ui = SwaggerUIBundle({
          url: "/openapi/doc.json",
          dom_id: "#swagger-ui",
        });
      };
    </script>
  </body>
</html>
```

</details>

### Source Codes

### `/user/:id Route`

<details>
<summary>src/routes/users/[id].ts</summary>

```ts
// src/routes/user/[id].ts

import {
  json,
  parseBody,
  type CTBody,
  type CTParams,
  type HandlerDef,
  type PipeDef,
} from "@bepalo/spine";
import { ArkErrors, type } from "arktype";

export const get_filter: HandlerDef = [
  ({ params }) => {
    // valdate params
    const r = type({
      id: "3 <= string.numeric <= 5",
    }).assert(params);
    if (r instanceof ArkErrors) {
      return json({ error: r.toJSON() }, { status: 400 });
    }
  },
];

export const get: PipeDef<CTParams<"id">> = {
  pipe: ({ params: { id } }) => {
    return parseInt(id) < 0
      ? json({ error: "User not found" })
      : json({ user: { name: `user-${id}` } });
  },

  openApi: {
    summary: "Get user by ID",
    responses: {
      "200": {
        description: "Successfull response",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                user: {
                  type: "object",
                  properties: {
                    name: {
                      type: "string",
                    },
                  },
                },
              },
            },
          },
        },
      },
      "404": {
        description: "User not found",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                error: {
                  type: "string",
                },
              },
            },
          },
        },
      },
      "400": {
        description: "Bad request",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                error: {
                  type: "string",
                },
              },
            },
          },
        },
      },
    },
  },
};

export const post_filter: HandlerDef<CTBody> = [parseBody({ maxSize: 1024 })];

export const post: HandlerDef<CTBody> = ({
  url: { pathname },
  params,
  body,
}) => {
  return json({ pathname, params, body });
};
```

</details>

#### `Main`

<details>
<summary>src/index.ts</summary>

```ts
import type { Path, StaticAssetsManifestFile } from "@bepalo/spine";
import {
  Router,
  ExpCache,
  HttpError,
  Status,
  json,
  cors,
  limitRate,
  getHttpStatusText,
  status,
  securityHeaders,
  Break_Pipeline,
} from "@bepalo/spine";
import { readFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
// Import generated static routes imports
import setRoutes from "./routes";
// Import generated static assets manifest
import staticAssetsManifest from "./static-assets.json";

const {
  "/404": notFoundAsset,
  "/500": serverErrorAsset,
  ...staticAssets
} = staticAssetsManifest.files;

// lru-exp cache for static assets
const assetsCache: ExpCache<string, Buffer<ArrayBuffer>> = new ExpCache({
  maxMemory: 32 * 1024 * 1024, // 32Mb
  onMiss(key, entry, reason, cache) {
    if (!(key in staticAssetsManifest.files)) return;
    const asset = (staticAssetsManifest.files as any)[key];
    // Read from file into cache because it is missing.
    // You only have to call `assetsCache.get` elsewhere
    //   as this will automatically load it on cache-miss.
    cache.set(
      key,
      readFileSync(asset.path, { encoding: undefined }),
      asset.size,
      {
        ttl: 3_600_000, // 1 hour
      },
    );
    return true;
  },
});

// Static assets cache cleanup timer.
// You could also setup a cron api.
setInterval(() => {
  console.log("Cleared ", assetsCache.evictExpired());
}, 3_600_000);

export type CTMain = { clientIP: string };

// Create router instance
export const spine = new Router<CTMain>({
  maxPath: 10,
});

// Serve
const server = Bun.serve({
  port: 3000,
  fetch: (request, server) =>
    spine.respond(request, {
      clientIP: server.requestIP(request)?.address || "anonymous",
    }),
});
console.log(`Listening on ${server.url}`);

//////////////////////////////////////////////

// Set generated dynamic-routes' static-imports
setRoutes(spine);

// Security Headers, CORS, Rate Limiting, ... for /**
spine.filterAll("/**", [
  // forceHttps({ toPort: server.port }),
  limitRate<CTMain>({
    key: ({ clientIP }) => clientIP,
    maxTokens: 100,
    refillInterval: 60 * 1000, // every minute
    // refillRate:
    setXRateLimitHeaders: process.env.NODE_ENV !== "production",
  }),
  securityHeaders({
    headers: {
      "Reporting-Endpoints": `coep-endpoint="${server.url.origin + "/coep"}"`,
    },
    crossOriginEmbedderPolicy: 'credentialless; report-to="coep-endpoint"',
    crossOriginResourcePolicy: "same-site",
    crossOriginOpenerPolicy: "same-origin-allow-popups",
    referrerPolicy: "strict-origin-when-cross-origin",
    xFrameOptions: "DENY",
    contentSecurityPolicy: [
      ["default-src", "'self'"],
      ["object-src", "'none'"],
      ["frame-ancestors", "'none'"],
      [
        "script-src style-src font-src",
        "'self'",
        "https://unpkg.com",
        "'unsafe-inline'",
      ],
      ["script-src", "'self'", "'strict-dynamic'", "'unsafe-inline'"],
      ["img-src", "'self'", "data:", "'unsafe-inline'"],
      ["upgrade-insecure-requests"],
    ],
  }),
  cors({
    origins: ["https://example.com", server.url.origin],
    methods: ["Get", "Head", "Options"],
    allowedHeaders: ["Authorization", "X-API-Key"],
    credentials: true,
    maxAge: 60 * 60,
  }),
]);

// Security Headers, CORS, Rate Limiting, ... for /api/**
spine.filterAll("/api/**", [
  // forceHttps({ toPort: server.port }),
  limitRate<CTMain>({
    key: ({ clientIP }) => clientIP,
    maxTokens: 300,
    refillInterval: 60 * 1000, // every minute
    refillRate: 100, // 100 tokens every minute
    setXRateLimitHeaders: process.env.NODE_ENV !== "production",
  }),
  securityHeaders({
    // crossOriginResourcePolicy: "same-site",
    // referrerPolicy: "strict-origin-when-cross-origin",
    xFrameOptions: "DENY",
    contentSecurityPolicy: [["upgrade-insecure-requests"]],
  }),
  cors({
    origins: ["https://example.com", server.url.origin],
    methods: ["Get", "Post", "Put", "Patch", "Delete", "Head", "Options"],
    allowedHeaders: ["Content-Type", "Authorization", "X-API-Key"],
    credentials: true,
    maxAge: 60 * 60,
  }),
  // do not bubble to other matching filters such as /**
  () => Break_Pipeline,
]);

// Handle Options for all /** to return no content
spine.handleOptions("/**", () => status(204, null));

// Handler get and head of static assets using generated manifest
spine.handle(
  [["Head", "Get"], ...(Object.keys(staticAssets) as Path[])],
  ({ url, request, headers }) => {
    const asset: StaticAssetsManifestFile = (staticAssets as any)[url.pathname];
    headers.set("Content-Type", asset.contentType);
    headers.set("Content-Length", asset.size.toFixed());
    const fileContent = assetsCache.get(asset.pathname);
    if (request.method === "HEAD") {
      return status(200, null);
    }
    return new Response(fileContent);
  },
);

// Handle fallbacks of get /** using 404.html static page
spine.fallback([["Head", "Get"], "/**"], ({ url, request, headers }) => {
  const asset: StaticAssetsManifestFile = notFoundAsset;
  headers.set("Content-Type", asset.contentType);
  headers.set("Content-Length", asset.size.toFixed());
  if (request.method === "HEAD") {
    return status(200, null);
  }
  const fileContent = assetsCache.get(notFoundAsset.pathname);
  return new Response(fileContent, { status: 404 });
});

// Set error handler of All /**
// Note: The string replacement is just for demonstration.
//       You are probably going to use a framework like
//       pug, react, Nextjs or others.
spine.catchAll("/**", ({ error, request, headers }) => {
  // process.env.NODE_ENV !== "production" && console.error(error);
  const statusCode = (error as HttpError).status || 500;
  const asset: StaticAssetsManifestFile = serverErrorAsset;
  headers.set("Content-Type", asset.contentType);
  headers.set("Content-Length", asset.size.toFixed());
  if (request.method === "HEAD") {
    return status(200, null);
  }
  const fileContent = assetsCache.get(asset.pathname);
  const vars = {
    STATUS: String(statusCode),
    STATUS_TEXT: getHttpStatusText(statusCode),
    ERROR: error.message,
  };
  return new Response(
    fileContent!
      .toString()
      .replace(/(\\)?\{\{(.+?)\}\}/g, (match, escape, id) =>
        escape ? match : ((vars as any)[id] ?? match),
      ),
    { status: statusCode },
  );
});

// Set error handler of All /api/**
// Takes precedence over /**
spine.catchAll("/api/**", ({ error }) => {
  process.env.NODE_ENV !== "production" && console.error(error);
  const status = (error as HttpError).status || 500;
  return json({ error: error.message }, { status });
});

// Set fallback handler of (Get,Post,Put,Patch,Delete) /api/**
spine.fallbackCrud("/api/**", () =>
  json({ error: "Not found" }, { status: 404 }),
);

// Error test
spine.get(["/error", "/api/error"], () => {
  throw new HttpError(Status._503_ServiceUnavailable, "Come back tomorrow");
});

// Stats
spine.get("/api/stats", () => json({ staticAssetsCache: assetsCache.stats }));

spine.afterAll(
  "/**",
  ({
    request: { method },
    response: { status, statusText, headers, body },
    url,
    timestamps,
  }) => {
    const { request, start, end } = timestamps;
    const size = ["OPTIONS", "HEAD"].includes(method)
      ? 0
      : Number(headers.get("Content-Length") || "0");
    const kbSize = ((size ?? 0) / 1024).toFixed(2).padStart(5);
    const time = (end - start).toFixed(3).padStart(6);
    let logstr = `[${new Date(request).toISOString()}]`;
    logstr += `[${status}]`;
    logstr += ` ${time}ms ${kbSize}KB`;
    logstr += ` -- ${method} ${url.pathname} ${url.search}`;
    logstr += ` -- ${statusText}`;
    console.log(logstr);
  },
);

//////////////////////////////////////////

// generate public/openapi/doc.json
spine
  .generateOpenAPI(
    {
      title: "@bepalo/spine Demo",
      version: "1.0.0",
      // ...
    },
    {
      pick: ({ path }) => path.startsWith("/api"),
      // autoTag: false,
      // autoSummary: false,
      includeOperationId: true,
      sortTagsOrder: 1,
      sortPathnameOrder: 1,
      sortMethodOrder: 1,
    },
  )
  .then(async (openapi) => {
    const output = "./public/openapi/doc.json";
    const content = JSON.stringify(openapi, null, 2);
    await writeFile(output, content, { encoding: "utf-8" });
  });
```

</details>

---

## Routing

Use the convenient HTTP method helpers:

```ts
spine.get("/users", handler);
spine.post("/users", handler);
spine.put("/users/:id", handler);
spine.patch("/users/:id", handler);
spine.delete("/users/:id", handler);
```

Or register several methods at once:

```ts
spine.all("/health", handler);
spine.crud("/users/:id", handler);
```

All standard HTTP methods are supported:

```text
HEAD  GET  POST  PUT  PATCH
DELETE  OPTIONS  TRACE  CONNECT
```

### Parameters

Parameters are detected from pathname using typescript. So, you have typesafety and autocomplete for that. Cool!

```ts
spine.get("/users/:userId/posts/:postId", ({ params }) => {
  return json({
    userId: params.userId,
    postId: params.postId,
  });
});
```

### Alternatives

A route segment can contain alternatives:

```ts
spine.get("/|about|contact", handler);
```

This matches:

```text
/
/about
/contact
```

Alternatives can also be combined with parameters:

```ts
spine.get("/api/|users|accounts/:id", handler);
```

### Wildcards

Spine supports single-segment and multi-segment wildcards:

```text
\*    one path segment
\*\!   optional single-segment suffix
\*\*   multiple path segments
\*\*\!  optional multi-segment suffix
```

For example:

```ts
spine.get("/files/*", handler);

spine.get("/api/**", ({ params }) => {
  console.log(params.$);
  console.log(params.$$);

  return json({ ok: true });
});
```

Use `*!` and `**!` when the wildcard portion is optional. `/abc/def/*!` will
match `/abc/def` while `/abc/def/*` will not.

### File-Based Wildcards

Filesystem-safe route names are provided for wildcard patterns:

```text
[#]     → *
[[#]]   → *!

[##]    → **
[[##]]  → **!
```

For example:

```text
routes/
└── api/
    └── [##].ts
```

maps to:

```text
/api/**
```

while:

```text
routes/
└── api/
    └── [[##]].ts
```

maps to:

```text
/api/**!
```

---

| ROUTER PATH                       | FILE PATH                         | MATCHES `highlighted`                                                                      |
| --------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------ |
| `/exact/path`                     | `/exact/path`                     | "/exact/path"                                                                              |
| `/slash/matters/`                 | `/slash/matters/`                 | "/slash/matters/"                                                                          |
| `/wild/glob/*`                    | `/wild/glob/[#]`                  | "/wild/glob/` `" "/wild/glob/`y`" "/wild/glob/`n`"                                         |
| `/wild/glob/match/base/*!`        | `/wild/glob/match/base/[[#]]`     | "/wild/glob/match/base" "/wild/glob/match/base/` `" "/wild/glob/match/base/`y`"            |
| `/globs/*/cool/*`                 | `/globs/[#]/cool/[#]`             | "/globs/` `/cool/" "/globs/`are`/cool/" "/globs/`are`/cool/`breath`"                       |
| `/globs/*/cool/*!`                | `/globs/[#]/cool/[[#]]`           | "/globs/` `/cool" "/globs/`are`/cool/` `" "/globs/` `/cool/breath" "/globs/`are`/cool/`y`" |
| `/named/:glob/here`               | `/named/[glob]/here`              | "/named/` `/here" "/named/`pet`/here/"                                                     |
| `/named/optional/:glob!`          | `/named/optional/[[glob]]`        | "/named/optional" "/named/optional/` `" "/named/optional/`pet`"                            |
| `/super/globs/**`                 | `/super/globs/[##]`               | "/super/globs/` `" "/super/globs/`here`" "/super/globs/`here/and/there`"                   |
| `/super/globs/**!`                | `/super/globs/[[##]]`             | "/super/globs" "/super/globs/` `" "/super/globs/`here`" "/super/globs/`1/2/3/4`"           |
| `/named/super/::slug`             | `/named/super/[## slug]`          | "/named/super/` `" "/named/super/`pet`" "/named/super/`man/town`"                          |
| `/named/super/::slug!`            | `/named/super/[[## slug]]`        | "/named/super" "/named/super/` `" "/named/super/`pet`" "/named/super/`man/town`"           |
| `/certain/a\|b\|c\|:options/y\|n` | `/certain/[[,a,b,c] options ]/y`  | "/certain/`a`/n" "/certain/`b`/y" "/certain/`c`/n" "/certain/` `/y"                        |
| `/certain/a\|b\|c:options!/y\|n`  | `/certain/[[a,b,c] [options] ]/n` | "/certain/`a`/y" "/certain/`b`/n" "/certain/`c`/y"                                         |

## Handler Pipeline

Spine separates request processing into explicit phases:

```text
                  ( @Bepalo/spine )
                   router pipe
                         ┌───────────────────────┐
                         ▼                       │
                  ┌──────┴───────┐               │
        ┌─────────│   Filters    │─────────┐ <request>
        │         └──────┬───────┘         │     │
        │      <no match nor response>     │     │
        │                ▼                 │     │
        │         ┌──────┴───────┐         │  ┌──┴────────┐
        ├─────────│   Handlers   │─────────┤  │   Server  │◄───┐
        │         └──────┬───────┘         │  └──┬─────┬──┘    │
        │      <no match nor response>     │     ▲     │   <request>
     <error>             ▼                 │     │ <response>  │
        │         ┌──────┴───────┐         │     │     ▼       │
        ├─────────│  Fallbacks   │─────────┤     │   ┌─┴───────┴─┐
        ▼         └──────┬───────┘         │     │   │   Client  │
  ┌─────┴──────┐         │   ┌──<response>─┘     │   └───────────┘
  │  Catchers  │         ▼   ▼                   │
  └─────┬──────┘  ┌──────┴───┴───┐               │
        └────────►│   Afters     │───────────────┘
 <error-response> └──────────────┘  <final-response>
```

### Filter Pipes

The first handling stage of a request is done through the filter stage.
Use this stage to parse and validate the request.

```ts
spine.filterCrud<CTAuth>("/user/**!", [
  parseQuery(),
  parseCookie(),
  authenticate(),
  authorize(),
]);
spine.filterPost("/user", [
  parseCookie(),
  authenticate(),
  authorize(),
  parseBody(),
]);
```

### Handler Pipes

This is main handling stage of a request.

```ts
spine.get("/user/:id", []);
spine.filterPost("/user", [
  parseCookie(),
  authenticate(),
  authorize(),
  parseBody(),
]);
```

This lets cross-cutting behavior remain separate from your actual route handlers.

```ts
spine.filterGet("/api/**", [limitRate(), cors(), authenticate()]);

spine.get("/api/users", listUsers());

spine.fallbackGet("/api/**", () =>
  json({ error: "Not Found" }, { status: 404 }),
);

spine.catchGet("/api/**", ({ error }) =>
  json({ error: error?.message }, { status: 500 }),
);

spine.afterGet("/api/**", ({ response }) => {
  console.log(response.status);
  // even the response after a caught error will pass through the after-pipe
  // error thrown here is not caught.
  // afters are best used for logging or modifying the final response
});
```

Handlers can also be composed into pipelines:

```ts
spine.post("/users", [parseBody(), validateUser(), createUser()]);
```

A pipe can stop normally by returning a `Response`, or use Spine's explicit control symbols:

```ts
import { Break_Pipe, Break_Pipeline } from "@bepalo/spine";

spine.filterGet("/**", cors({ maxTokens: 60 }));
spine.filterGet("/api/**", [cors({ maxTokens: 200 }), () => Break_Pipeline]);. /* '/**' cors wont be called */

// Break_Pipeline breaks from the overall handlers pipe while
// Break_Pipe breaks from the current handler pipe without returning a Response.

```

## Type-Safe Context

Every handler receives a context containing the request, URL, pathname, headers, route parameters, and spine.

You can extend it with your own application state:

```ts
type AppContext = {
  requestId: string;
  user?: {
    id: string;
    role: string;
  };
};

const spine = new Router<AppContext>();

type CTMore = { counter: { count: 0 } };

// context can be passed to the handler method for more specificity and need.
// Eg. cookie parsing, query parsing, body parsing, ... per pipe
spine.get<CTMore>("/profile", ({ requestId, user, counter }) =>
  json({
    requestId,
    user,
    counter,
  }),
);
```

Context values can be supplied when processing a request:

```ts
spine.respond(request, {
  requestId: crypto.randomUUID(),
});
```

This keeps runtime-specific concerns outside the spine itself.

## File-Based Routing

If you prefer filesystem-based routing, Spine can load routes from a directory:

```ts
const spine = new Router();

await spine.load({
  routesPath: "routes",
  // pattern: /\.route\.(.ts|.js)$/,
  // dirPattern: /.*/,
  // processName: (name) => name.substring(0, name.lastIndexOf(".")),
});
```

For example:

```text
routes/
├── index.ts
├── users.ts
├── [[products,pricing,contact] page]
├── users/
│   └── [id].ts
└── api/
    └── [##].ts
```

A route file exports its HTTP method handlers: in the format \<method\>\_\<handler-type\> or
a shortcut for handler \<method\>. eg. `Get`, `Get_Filter`.

**NOTE:** both \<handler-type\> and \<method\> are case-insensitive and you can decide how to name them as long as you adhere to the format \<method\>\_\<handler-type\> or \<method\>.

```ts
// routes/users.ts
import { json } from "@bepalo/spine";

const auth = [parseCookie(), authenticate()];

export const Get_Filter = [...auth, parseQuery()];

export const Post_Filter = [...auth, parseQuery(), parseBody(), vallidate()];

export const Get = () => json({ users: [] });

export const Post = () => json({ created: true }, { status: 201 });
```

A parameterized file:

```text
users/[id].ts
```

maps to:

```text
/users/:id
```

Special filesystem-safe patterns are available for wildcard routes:

```text
[#]     → *
[[#]]   → *!

[##]    → **
[[##]]  → **!
```

File routing is completely optional. The normal programmatic API remains the core of Spine.

## Built for HTTP APIs

Spine includes the common building blocks you usually end up adding around a spine.

### Request parsing

```ts
spine.post("/users", [parseBody(), ({ body }) => json(body)]);
```

Available parsers include:

- `parseBody`
- `parseQuery`
- `parseCookie`
- `parseHeaders`
- `parseMultipart`

Multipart parsing is streaming-oriented, making it suitable for large uploads.

### Responses

Common response helpers are included:

```ts
json(data);
text("Hello");
html("<h1>Hello</h1>");
status(204);
redirect("/login");
blob(file);
octetStream(data);
formData(data);
usp(params);
send(data);
```

Cookie helpers are also provided:

```ts
setCookie(name, value, options);
clearCookie(name, options);
```

### CORS and rate limiting

```ts
spine.filterAll("/api/**", [
  cors({
    origins: "*",
  }),

  limitRate({
    key: ({ request }) => request.headers.get("x-forwarded-for") ?? "unknown",
    maxTokens: 100,
    refillRate: 10,
  }),
]);
```

### Authentication

Authentication is intentionally application-defined:

```ts
spine.filterGet("/private/**", [
  authenticate({
    parseAuth: async ({ request }) => {
      const token = request.headers.get("authorization");

      if (!token) return undefined;

      return {
        role: "user",
      };
    },
  }),

  authorize({
    allowRole: (role) => role === "user",
  }),
]);
```

Basic Authentication is also supported through `basicAuthParser()`.

## OpenAPI

Add OpenAPI metadata directly to a handler:

```ts
spine.get(
  "/users/:id",
  ({ params }) =>
    json({
      id: params.id,
    }),
  {
    openApi: {
      summary: "Get a user",
      tags: ["Users"],
      responses: {
        "200": {
          description: "User",
        },
      },
    },
  },
);
```

Then generate an OpenAPI 3.0 document:

```ts
const document = await spine.generateOpenAPI({
  title: "My API",
  version: "1.0.0",
});
```

Route parameters are automatically represented using OpenAPI's `{parameter}` syntax.

## Error Handling

Throw an `HttpError` when you need an HTTP-specific failure:

```ts
import { HttpError } from "@bepalo/spine";

spine.get("/users/:id", ({ params }) => {
  const user = findUser(params.id);

  if (!user) {
    throw new HttpError(404, "User not found");
  }

  return json(user);
});
```

Handle errors with a catcher:

```ts
spine.catchGet("/users/**", ({ error }) =>
  json({ error: error?.message }, { status: 500 }),
);
```

## Multipart Parser Demo

This is a well tested multipart-form-data parser that parses by streaming chunks.
It can even handle edge cases like boundary across multiple chunks and very small chunks (down to 5 bytes of chunk). Thank God!

```ts
router.post("/upload", [
  parseUpload<{}, { writer: Bun.FileSink; hash: Hash | string }>({
    // maxFields: 2,
    // maxFiles: 1,
    // maxFieldSize: 203,
    // maxFileSize: 200 * 1024 * 1024,

    path: process.cwd() + "/uploads",

    fileHandle: (fullpath: string) => ({
      writer: Bun.file(fullpath).writer(),
      hash: createHash("sha256"),
    }),

    write: ({ handle }, chunk) => {
      handle.writer.write(chunk);
      (handle.hash as Hash).update(chunk);
    },

    end: ({ handle, fullpath, name }, success) => {
      handle.writer.end();
      handle.hash = (handle.hash as Hash).digest().toString("hex");
      if (!success) {
        Bun.file(fullpath).delete();
        console.log(`[FileUpload](${name}) failed`);
      }
    },

    onEnd: ({ files, fields }) => {
      console.dir(
        {
          files: Object.fromEntries(files.entries()),
          fields: Object.fromEntries(fields.entries()),
        },
        { depth: 3 },
      );
    },

    onFileProgress: (ctx, { file }) => {
      console.log(
        `[FileUpload](${file.name}) progress`,
        file.progress.toFixed(2),
        "%",
      );
    },
  }),
]);
```

## Performance

Spine keeps routing deliberately simple and specialized:

- Exact routes use direct route tables.
- Glob routes are stored separately from exact routes.
- Super-glob routes are handled independently.
- Routes are organized by HTTP method.
- Pathnames are split once and reused during matching.
- Parameter extraction happens only for the selected route candidates.

The result is a spine focused on **fast matching, low overhead, and predictable behavior** without tying the routing layer to a particular server.

## 📄 License

[MIT](/LICENSE)

## 🕊️ Thanks and Enjoy

If you find Spine useful, please consider starring the repository and sharing it with others.

## 💖 Be a Sponsor

Support development and future improvements.

<a href="https://ko-fi.com/natieshzed">
  <img height="32" src="https://img.shields.io/badge/Ko--fi-donate-orange?style=for-the-badge&logo=ko-fi&logoColor=white">
</a>
