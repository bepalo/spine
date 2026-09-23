# 🏆 @bepalo/spine

![hero](./assets/spine-hero.png)

[![npm version](https://img.shields.io/npm/v/@bepalo/spine.svg)](https://www.npmjs.com/package/@bepalo/spine)
[![CI](https://img.shields.io/github/actions/workflow/status/bepalo/spine/ci.yaml?label=ci)](https://github.com/bepalo/spine/actions/workflows/ci.yaml)
[![tests](https://img.shields.io/github/actions/workflow/status/bepalo/spine/testing.yaml?label=tests)](https://github.com/bepalo/spine/actions/workflows/testing.yaml)
[![license](https://img.shields.io/npm/l/@bepalo/spine.svg)](LICENSE)
![Benchmarked](https://img.shields.io/badge/benchmarked-yes-green)

<!--
[![Vitest](https://img.shields.io/badge/vitest-6E9F18?style=for-the-badge&logo=vitest&logoColor=white)](test-result.md) -->

**The Next-Generation Web-Standard HTTP Router & Pipeline Engine for TypeScript & JavaScript.**

Spine is built from first principles around Web Standard APIs (`Request`, `Response`, `Headers`, `URL`). It replaces traditional recursive middleware onions with **deterministic flat array pipelines**, introduces **pipeline parameter linking**, features **specialized $O(1)$ routing tables**, and delivers zero server lock-in across Bun, Deno, Node.js, and edge runtimes.

```text
                               ( @bepalo/spine )

                            The 5-Phase Pipeline Flow
                            ─────────────────────────

                               Incoming Web Request
                                        │
                                        ▼
                                ┌───────────────┐
                     ┌──────────│  1. Filters   │──────────┐
                     │          └───────┬───────┘          │
                     │                  │ <no response>    │
                     │                  ▼                  │
                     │          ┌───────────────┐          │
                     ├──────────│  2. Handlers  │──────────┤
                     │          └───────┬───────┘          │
                     │                  │ <no response>    │
                     │                  ▼                  │
                     │          ┌───────────────┐          │
                  <error>       │ 3. Fallbacks  │──────────┤
                     │          └───────┬───────┘          │
                     │                  │                  │
                     ▼                  ▼                  ▼
             ┌───────────────┐  ┌───────────────────────────────┐
             │  4. Catchers  │─►│      Response Assembly        │
             └───────────────┘  └───────────────┬───────────────┘
                                                │
                                                ▼
                                        ┌───────────────┐
                                        │   5. Afters   │
                                        └───────┬───────┘
                                                │
                                        <afterCatcher> (on after-error)
                                                │
                                                ▼
                                         Final Response
```

_NOTE: All pipes except handlers are optional and can be disabled for performance. Default pipes can be defined used instead. You can basically use handler pipes with or without default pipes if you want._

---

## ⚡ What Makes Spine Different?

| Feature                   | Spine (`@bepalo/spine`)                                                                             | Express / Koa                                           | Hono / Fastify                     |
| :------------------------ | :-------------------------------------------------------------------------------------------------- | :------------------------------------------------------ | :--------------------------------- |
| **Pipeline Architecture** | **Flat Array Pipeline** with explicit signals (`Break_Pipe`, `Break_Pipeline`)                      | Recursive `next()` callback onion (call-stack overhead) | Nested async middleware cascade    |
| **Execution Guarantees**  | Deterministic 5-phase lifecycle: Filters $\to$ Handlers $\to$ Fallbacks $\to$ Catchers $\to$ Afters | Order depends on middleware registration sequence       | Mixed middleware / route execution |
| **Parameter Linking**     | **Built-in**: Params parsed/mutated in filters automatically link downstream                        | ❌ Manual `req` object mutation                         | ❌ Manual `c.set()` state passing  |
| **HTTP Standards**        | **Full Support** including **HTTP `QUERY`** (RFC 9535)                                              | ❌ Standard methods only                                | ❌ Standard methods only           |
| **Routing Tables**        | **Specialized $O(1)$ tables** partitioned by depth, globs (`*`), and super-globs (`**`)             | Linear regex iteration                                  | Radix Tree (RegExp-heavy)          |
| **Runtime Portability**   | **Native Web Standards**: Pure `Request` in, `Response` out (Bun, Deno, Node, Edge)                 | Node.js `IncomingMessage` / `ServerResponse` tied       | Web Standards / Adapters           |
| **Type Safety**           | **Automatic compile-time path parameter inference** directly from string literals                   | Manual typing / `any`                                   | Generic context inference          |
| **Streaming Multipart**   | **Zero-dependency state machine** parsing streams chunk-by-chunk (down to 5 bytes)                  | Requires `multer` / `busboy`                            | Requires external plugins          |
| **Built-in Caching**      | **Memory-bounded LRU & TTL caches** tracking actual bytes in memory                                 | ❌ None                                                 | ❌ None                            |
| **OpenAPI Generation**    | **Native OpenAPI 3.0 document generation** with auto-tagging and sorting                            | Requires swagger-jsdoc / plugins                        | Requires `@hono/zod-openapi`       |

---

## 🚀 Spine in 30 Seconds

```ts
import { Router, json, rjson, text, logRequestsWithColor, HttpError } from "@bepalo/spine";
import { validate, cors, limitRate, securityHeaders, Status } from "@bepalo/spine";
import { type, ArkErrors } from "arktype";


// Define constants and context types
const isProduction = process.env.NODE_ENV !== "production";
export type CTApp = {}; // Router scope context

// Initialize router with maximum path segment depth and defaults
const spine = new Router<CTApp>({
  maxPath: 24,
  disable: {
    after: true,
    catcher: true,
    fallback: true,
  },
  defaultHandler: () => {
    return json({ message: "Not found" }, { status: Status._404_NotFound });
  },
  defaultCatcher: ({ error }) => {
    if (!isProduction) console.error(error);
    return json(
      { error: error.message },
      { status: (error as HttpError).status || Status._500_InternalServerError },
    );
  },
  defaultAfter: logRequestsWithColor({
    status: { color: "auto", bold: true }, // 2xx green, 3xx cyan, 4xx yellow, 5xx red
    method: { color: "auto", bold: true },
    duration: { color: "yellow", dim: true },
  }),
  afterCatcher: ({ error }) => {
    isProduction && console.error(error);
  },
});

spine.get("/health", () => json({ status: "healthy" }));

const secRoutes = new Router<CTApp>({ maxPath: 2 });

// Global Filters: Security headers, CORS, and Token-Bucket Rate Limiting
secRoutes.filterAll("/**", [
  securityHeaders(),
  cors({
    origins: "*",
    methods: ["Get", "Query", "Post", "Put", "Patch", "Delete"],
  }),
  limitRate({
    key: (ctx) => ctx.request.headers.get("x-forwarded-for") || "anonymous",
    maxTokens: 100,
    refillInterval: 60, // 100 tokens per minute
    setXRateLimitHeaders: true,
  }),
]);

const usersApiRoutes = new Router<CTApp>({ maxPath: 2 });

// Parameter Linking & Validation:
//    Validates & parses parameters in a filter; downstream handlers receive typed numbers!
usersApiRoutes.filterPost("/:id", [
  validate({
    responseType: "json",
    errors: [ArkErrors],
    paramsMutation: true,
    params: type({ id: "string.numeric.parse" }), // parses "123" -> 123
    // params: { id: (id: string) => parseInt(id) }, // you can use your custom type validator too


    bodyParse: true,
    bodyMutation: true,
    bodyParseOptions: {
      accept: [
        "application/json",
        "application/rjson",
        "application/x-www-form-urlencoded"
      ],
      maxSize: 1024
    },
    body: type({
      username: "3 <= string <= 20",
      email: "string.email",
      role: "'admin' | 'user'",
    }),
    strange: false, // strips unexpected fields
  }),
]);

// Main Handlers: Type-safe route parameters with zero boilerplate
usersApiRoutes.post("/:id", ({ params, body }) => {
  return json({ created: true, id: params.id, user: body }, { status: 201 });
});

// It is also okay to do validation in handlers.
usersApiRoutes.get("/:id", [
  validate({
    responseType: "json",
    errors: [ArkErrors],
    paramsMutation: true,
    params: type({ id: "string.numeric.parse" }), // parses "123" -> 123
  }),
  ({ params }) => {
    return json({ userId: params.id });
  }
]);

// HTTP QUERY Method (RFC 9535 Safe Method with Body)
usersApiRoutes.query("/search", [
  validate({ bodyParse: true }),
  ({ body }) => rjson({ results: [], query: body }),
]);

// Append the routes to the main router.
spine.append(secRoutes);
spine.appendTo("/api/users", usersApiRoutes)

// Introspect route definitions
console.dir(spine.getRoutesByPathnameThenMethod(), { depth: 0 });

// Serve natively on Bun, Deno, Node.js, or workers!
export default {
  fetch: (request: Request) => spine.respond(request),
};
```

---

## 📑 Table of Contents

- [Why Spine?](#-what-makes-spine-different)
- [Spine in 30 Seconds](#-spine-in-30-seconds)
- [Quick Start](#quick-start)
  - [Bun](#bun)
  - [Deno](#deno)
  - [Node.js (v18+)](#nodejs-v18)
- [The Pipeline Architecture](#the-pipeline-architecture)
  - [The 5 Phases](#the-5-phases)
  - [Control Signals (`Break_Pipe`, `Break_Pipeline`)](#control-signals)
- [Routing](#routing)
  - [HTTP Methods & Shorthands](#http-methods--shorthands)
  - [Parameters & Compile-Time Inference](#parameters--compile-time-inference)
  - [Path Alternatives](#path-alternatives)
  - [Wildcards (`*`, `*!`, `**`, `**!`, `::slug`)](#wildcards)
  - [File-Based Wildcards Table](#file-based-wildcards-table)
- [Parameter Linking](#parameter-linking)
- [Validation Engine (`validate`)](#validation-engine-validate)
- [Request Logging (`logRequestsWithColor`)](#request-logging-logrequestswithcolor)
- [Built-In Middlewares & Security](#built-in-middlewares--security)
  - [CORS](#cors)
  - [Rate Limiting (`limitRate`)](#rate-limiting-limitrate)
  - [Security Headers (`securityHeaders`)](#security-headers-securityheaders)
  - [HTTPS Redirection (`forceHttps`)](#https-redirection-forcehttps)
  - [Authentication & Authorization](#authentication--authorization)
- [Request Parsers & Responses](#request-parsers--responses)
  - [Request Parsers](#request-parsers)
  - [Responses & Helpers (`rjson`, `json`, etc.)](#responses--helpers)
- [Streaming Multipart Upload Parser](#streaming-multipart-upload-parser)
- [Caching & Data Structures (`Cache`, `ExpCache`)](#caching--data-structures-cache-expcache)
- [OpenAPI 3.0 Document Generation](#openapi-30-document-generation)
- [Router Composition (`appendTo`) & Introspection](#router-composition-appendto--introspection)
- [File-Based Routing & Watchers](#file-based-routing--watchers)
- [Performance & Design Invariants](#performance--design-invariants)
- [📄 License](#-license)
- [🕊️ Thanks and Enjoy](#️-thanks-and-enjoy)
- [💖 Be a Sponsor](#-be-a-sponsor)

---

## Quick Start

### Installation

```sh
# npm
npm install @bepalo/spine

# pnpm
pnpm add @bepalo/spine

# bun
bun add @bepalo/spine
```

### Bun

```ts
import Router, { text, json } from "@bepalo/spine";

const spine = new Router({ maxPath: 24 });
spine.get("/", () => text("Hello from Bun!"));
spine.get("/users/:id", ({ params }) => json({ id: params.id }));

Bun.serve({
  port: 3000,
  fetch: (req) => spine.respond(req),
});
```

### Deno

```ts
import Router, { text, json } from "jsr:@bepalo/spine";
// or import Router from "@bepalo/spine";

const spine = new Router({ maxPath: 24 });
spine.get("/", () => text("Hello from Deno!"));
spine.get("/users/:id", ({ params }) => json({ id: params.id }));

Deno.serve({ port: 3000 }, (req) => spine.respond(req));
```

### Node.js (v18+)

```ts
import { createServer } from "node:http";
import { Readable } from "node:stream";
import Router, { text, json } from "@bepalo/spine";

const spine = new Router({ maxPath: 24 });
spine.get("/", () => text("Hello from Node.js!"));
spine.get("/users/:id", ({ params }) => json({ id: params.id }));

const server = createServer(async (req, res) => {
  const url = `http://${req.headers.host || "localhost"}${req.url}`;
  const isBodyAllowed = !["GET", "HEAD"].includes(req.method!);

  const webReq = new Request(url, {
    method: req.method,
    headers: req.headers as any,
    body: isBodyAllowed ? (Readable.toWeb(req) as any) : undefined,
    duplex: isBodyAllowed ? "half" : undefined,
  } as any);

  const webRes = await spine.respond(webReq);

  res.statusCode = webRes.status;
  res.statusMessage = webRes.statusText;
  webRes.headers.forEach((val, key) => res.setHeader(key, val));

  if (webRes.body) {
    const reader = webRes.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
  }
  res.end();
});

server.listen(3000);
```

---

## The Pipeline Architecture

In Spine, middleware is not an "onion". You do not call `next()` or manage nested promise stacks.

Handlers are structured as **flat, sequential array pipelines**:

```ts
type Handler<ExtendContext> = (
  ctx: Context<ExtendContext>,
) => Promise<HandlerReturn> | HandlerReturn;
type Pipe<ExtendContext> = Array<Handler<ExtendContext>>;
```

### The 5 Phases

When `spine.respond(request)` is executed, requests travel in strict order through 5 phases:

1. **Filters** (`filterGet`, `filterPost`, `filterAll`, etc.): Run before handlers. Used for authentication, CORS, rate limiting, and request parsing. Filters bubble across all matching route entries (Exact $\to$ Glob $\to$ SuperGlob $\to$ `defaultFilter`). If any filter returns a `Response`, execution jumps directly to Response Assembly and Afters.
2. **Handlers** (`get`, `query`, `post`, `handle`, etc.): Main business logic. **Only the single most specific match runs (`noBubble: true`)**. If no response is returned, runs `defaultHandler` (if defined) before moving to Fallbacks.
3. **Fallbacks** (`fallbackGet`, `fallbackAll`, etc.): Evaluated if no handler responded. Runs matching fallback routes and `defaultFallback`.
4. **Catchers** (`catchGet`, `catchAll`, etc.): Evaluated when an uncaught error is thrown during Filters, Handlers, or Fallbacks.
5. **Afters** (`afterGet`, `afterAll`, `defaultAfter`): Always executes on the final `Response` object for logging, auditing, and header injection. Errors thrown here are captured by `afterCatcher` without breaking the outgoing response.

### Control Signals

Handlers communicate with the pipeline using explicit return values:

```ts
import { Break_Pipe, Break_Pipeline } from "@bepalo/spine";
```

- **`void` / `undefined`**: Continues execution to the next handler in the current pipe.
- **`Response` instance**: **Short-circuits immediately**. Sets the active response and proceeds directly to Response Assembly and Afters.
- **`Break_Pipe`**: Breaks out of the **current** route pipe without returning a response, allowing parent wildcard pipes in the same phase to continue.
- **`Break_Pipeline`**: Breaks out of the **entire stage** (e.g. stops filter bubbling to `/**`), without returning a response.

---

## Routing

### HTTP Methods & Shorthands

Spine provides direct shorthands for all HTTP methods:

```ts
spine.get("/items", handler);
spine.query("/items", handler); // RFC 9535 HTTP QUERY method
spine.post("/items", handler);
spine.put("/items/:id", handler);
spine.patch("/items/:id", handler);
spine.delete("/items/:id", handler);
spine.head("/items", handler);
spine.options("/items", handler);
spine.trace("/items", handler);
spine.connect("/items", handler);

// Multi-method shorthands
spine.all("/health", handler); // Matches ALL HTTP methods
spine.crud("/users/:id", handler); // Matches GET, QUERY, POST, PUT, PATCH, DELETE
```

Batch registration via method strings or matrix arrays:

```ts
spine.handle("Get /users", handler);
spine.handle(["Get /users", "Post /users"], handler);
spine.handle([["Get", "Query", "Post"], "/users", "/accounts"], handler);
```

### Parameters & Compile-Time Inference

Route parameters are automatically parsed from string literals with zero manual generic typing:

```ts
// 'userId' and 'postId' are strongly-typed string parameters on ctx.params!
spine.get("/users/:userId/posts/:postId", ({ params }) => {
  return json({ user: params.userId, post: params.postId });
});
```

### Path Alternatives

Declare branching route segments inline using pipe syntax `|`:

```ts
spine.get("/|about|contact", (ctx) => text(`Matched: ${ctx.pathname}`));
// Matches: "/", "/about", and "/contact"
```

Combine alternatives with named parameters:

```ts
spine.get("/api/users|accounts/:type", ({ params }) => {
  return json({ type: params.type }); // "users" or "accounts"
});

spine.get("/status/active|pending:state", ({ params }) => {
  return json({ state: params.state }); // "active" or "pending"
});
```

### Wildcards

- `*` — Matches exactly one path segment (e.g. `/files/*`).
- `*!` — Optional single-segment wildcard at the end (e.g. `/api/*!` matches `/api` and `/api/users`).
- `**` — Multi-segment wildcard matching any depth (e.g. `/static/**`).
- `**!` — Optional multi-segment wildcard (e.g. `/assets/**!` matches `/assets`, `/assets/`, and `/assets/a/b/c`).
- `::slug` — Named super-glob capturing the remaining path into `ctx.params.slug`.
- `::slug!` — Optional named super-glob.

```ts
spine.get("/files/::filepath", ({ params }) => {
  return json({ file: params.filepath }); // e.g. "docs/2026/report.pdf"
});
```

### File-Based Wildcards Table

| ROUTER PATH            | FILE PATH                     | MATCHES                                       |
| :--------------------- | :---------------------------- | :-------------------------------------------- |
| `/exact/path`          | `/exact/path.ts`              | `/exact/path`                                 |
| `/wild/glob/*`         | `/wild/glob/[#].ts`           | `/wild/glob/abc`                              |
| `/wild/glob/match/*!`  | `/wild/glob/match/[[#]].ts`   | `/wild/glob/match`, `/wild/glob/match/abc`    |
| `/named/:id/view`      | `/named/[id]/view.ts`         | `/named/123/view`                             |
| `/super/globs/**`      | `/super/globs/[##].ts`        | `/super/globs/a/b/c`                          |
| `/super/globs/**!`     | `/super/globs/[[##]].ts`      | `/super/globs`, `/super/globs/a/b`            |
| `/named/super/::slug`  | `/named/super/[## slug].ts`   | `/named/super/path/to/file.png`               |
| `/named/super/::slug!` | `/named/super/[[## slug]].ts` | `/named/super`, `/named/super/path/to/file`   |
| `/docs/a\|b\|c:page`   | `/docs/[[a,b,c] page].ts`     | `/docs/a`, `/docs/b`, `/docs/c`               |
| `#filename`            | `/#index.ts`                  | Escapes filename (prevents collapsing to `/`) |

---

## Parameter Linking

Spine features **Pipeline Parameter Linking**. When a filter validates or transforms a route parameter (e.g. converting a string ID into a number using `validate({ paramsMutation: true })`), that mutated value automatically forwards to downstream handlers matching that parameter name and index.

```ts
import { validate } from "@bepalo/spine";
import { type, ArkErrors } from "arktype";

// 1. Filter mutates params.id into a number
spine.filterGet("/api/users/:id", [
  validate({
    errors: [ArkErrors],
    paramsMutation: true,
    params: type({ id: "string.numeric.parse" }), // "123" -> 123
  }),
]);

// 2. Main handler receives the parsed number directly in params!
spine.get("/api/users/:id", ({ params }) => {
  // typeof params.id is number!
  return json({ id: params.id });
});
```

> [!NOTE]
> Single-glob parameters (`:id`) and super-glob parameters (`::id`) use isolated namespaces (`id#1` vs `id##1`), preventing variable collision.

---

## Validation Engine (`validate`)

The built-in `validate` middleware validates `params`, `query`, `cookie`, and `body` using Regex, custom functions, or schema libraries (such as ArkType or Zod):

```ts
import { validate } from "@bepalo/spine";
import { type, ArkErrors } from "arktype";

spine.filterPost("/api/users/:id", [
  validate({
    // Response format on error: "json" | "text" | "status"
    responseType: "json",

    // Catch custom schema error classes
    errors: [ArkErrors],

    // Validate and parse route parameters
    paramsMutation: true,
    params: type({
      id: "string.numeric.parse",
    }),

    // Automatically parse query before validation
    queryParse: true,
    queryMutation: true,
    query: {
      tab: (val) =>
        ["profile", "billing"].includes(val) || new Error("Invalid tab"),
    },

    // Automatically parse body before validation
    bodyParse: true,
    bodyParseOptions: { accept: "application/json", maxSize: 1024 * 1024 },
    bodyMutation: true,
    body: type({
      username: "3 <= string <= 20",
      role: "'admin' | 'user'",
      password: "string >= 8",
    }),

    // Strip unexpected properties from mutated objects
    strange: false,
  }),
]);
```

---

## Request Logging (`logRequestsWithColor`)

High-performance After-hook middlewares for request logging:

```ts
import { logRequestsWithColor } from "@bepalo/spine";

spine.afterAll("/**", [
  logRequestsWithColor({
    enable: {
      requestTime: true,
      duration: true,
      status: "status",
      search: "singleline",
    },
    status: { color: "auto", bold: true }, // Auto-colored: 2xx green, 3xx cyan, 4xx yellow, 5xx red
    method: { color: "auto", bold: true }, // Per-method coloring
    duration: { color: "yellow", dim: true },
  }),
]);
```

---

## Built-In Middlewares & Security

### CORS

```ts
import { cors } from "@bepalo/spine";

spine.filterAll("/api/**", [
  cors({
    origins: ["https://example.com"], // or "*"
    methods: [ "Get", "Query", "Post", "Put", "Patch", "Delete", "Head", "Options" ],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true, // Note: credentials cannot be used with origins: "*"
    maxAge: 86400,
    responseType: "json",
  }),
]);
```

### Rate Limiting (`limitRate`)

High-performance token-bucket rate limiter supporting interval or continuous refill rates:

```ts
import { limitRate } from "@bepalo/spine";

spine.filterAll("/api/**", [
  limitRate({
    key: (ctx) => ctx.request.headers.get("x-forwarded-for") || "anonymous",
    maxTokens: 100,
    refillInterval: 60, // 100 tokens per 60s
    refillRate: 10,
    setXRateLimitHeaders: true, // Sets X-RateLimit-Limit & X-RateLimit-Remaining
    responseType: "json",
  }),
]);
```

### Security Headers (`securityHeaders`)

```ts
import { securityHeaders } from "@bepalo/spine";

spine.filterAll("/**", [
  securityHeaders({
    xFrameOptions: "DENY", // or null to unset default
    xContentTypeOptions: "nosniff", // or null to unset default
    referrerPolicy: "strict-origin-when-cross-origin",
    strictTransportSecurity: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    contentSecurityPolicy: {
      "default-src": "'self'",
      "script-src": ["'self'", "https://cdn.example.com"],
      "object-src": "'none'",
      "upgrade-insecure-requests": true,
    },
    crossOriginOpenerPolicy: "same-origin",
    crossOriginEmbedderPolicy: "credentialless",
    crossOriginResourcePolicy: "same-site",
  }),
]);
```

### HTTPS Redirection (`forceHttps`)

```ts
import { forceHttps } from "@bepalo/spine";

spine.filterAll("/**", [
  forceHttps({ toPort: 443 }), // 308 Permanent Redirect preserving method and body
]);
```

### Authentication & Authorization

```ts
import {
  Router,
  Status,
  authenticate,
  authorize,
  json,
  type CTAuth,
} from "@bepalo/spine";
import { JWT } from "@bepalo/jwt";

type UserRole = "admin" | "user";
type AuthData = { userId: string; role: UserRole };
// console.log(JWT.genHmac("HS256"));
const adminJWT = JWT.createSymmetric<AuthData>("<secret>", "HS256");

const spine = new Router<CTAuth<AuthData>>({ maxPath: 5 });

spine.filterAll("/admin/**", [
  authenticate<AuthData>({
    responseType: "json",
    parseAuth: async (ctx) => {
      const token = ctx.request.headers
        .get("authorization")
        ?.replace("Bearer ", "");
      if (!token) return null; // Returns 401 Unauthorized
      const { valid, error, payload } = adminJWT.verifySync(token);
      if (error) {
        return json(
          { error: error.message },
          { status: Status._401_Unauthorized },
        );
      }
      const { userId, role } = payload!;
      return { userId, role };
    },
  }),

  authorize<AuthData>({
    responseType: "json",
    allowRole: (role) => role === "admin", // Returns 403 Forbidden on failure
  }),
]);

spine.get("/admin/users", ({ auth }) => {
  const { role, userId } = auth!;
  // ...
});
```

---

## Request Parsers & Responses

### Request Parsers

```ts
import { parseQuery, parseCookie, parseBody } from "@bepalo/spine";

// Parse URL search parameters into ctx.query
spine.filterGet("/search", [parseQuery({ responseType: "json" })]);

// Parse request cookies into ctx.cookie
spine.filterAll("/**", [parseCookie({ responseType: "json" })]);

// Parse JSON, RJSON, URL-encoded, or plain text bodies into ctx.body
spine.filterPost("/data", [
  parseBody({
    accept: "application/json",
    maxSize: 1024 * 1024, // 1MB limit
    responseType: "json",
  }),
]);
```

### Responses & Helpers

```ts
import {
  json,
  rjson,
  text,
  html,
  status,
  redirect,
  redirectPermanentPreserve,
  blob,
  octetStream,
  setCookie,
  clearCookie,
} from "@bepalo/spine";

// Standard JSON response
json({ message: "Success" });

// RJSON response using @bepalo/rjson
rjson({ message: "RJSON Success" });

// Plain text and HTML
text("Hello, world!");
html("<h1>Hello, world!</h1>");

// Status response
status(204);

// Redirects
redirectPermanentPreserve("/new-url"); // 308 Permanent Redirect

// Cookie helpers
ctx.headers.append(
  ...setCookie("token", "secret", {
    path: "/",
    httpOnly: true,
    secure: true,
    maxAge: 3600,
  }),
);
```

---

## Streaming Multipart Upload Parser

Spine features a zero-dependency chunked streaming multipart parser capable of handling boundaries split across chunk fragments down to 5 bytes:

_NOTE: `parseUpload` is an abstraction of `parseMultipart`_

```ts
import { parseUpload } from "@bepalo/spine";
import { openSync, closeSync, writeSync } from "node:fs";

type UploadData = { fd: number; offset: number };

const mimeExtension = (mime: string) => {
  switch (mime) {
    case "image/jpeg":
      return ".jpeg";
    case "image/png":
      return ".png";
    default:
      "";
  }
};

spine.post("/upload", [
  parseUpload<UploadData>({
    responseType: "json",
    dontCatch: true,

    fileHandle: (path) => ({ fd: openSync(path, "w"), offset: 0 }),

    // idGenerator: () => toBase64UUID(crypto.randomUUID()),

    // path: "./uploads"
    path: (id, file) => `.uploads/${id}${mimeExtension(file.type)}`,

    write: async ({ handle }, chunk) => {
      const { fd, offset } = handle;
      let written = writeSync(fd, chunk, 0, chunk.length, offset);
      while (written < chunk.length) {
        written += writeSync(
          fd,
          chunk,
          written,
          chunk.length,
          offset + written,
        );
      }
      handle.offset += written;
      return written;
    },

    end: async ({ handle: { fd }, ...file }) => closeSync(fd),

    maxTotalSize: 100 * 1024 * 1024, // 100MB total
    maxFileSize: 50 * 1024 * 1024, // 50MB max file
    maxFiles: 10,
    maxFields: 1,
    maxFieldSize: 20,
    // progress only works if Content-Length is specified
    progressIncrement: 10, // progress report every 10% but actual callback depends on chunk size

    onFileHeader: (ctx, { headers }) => {
      const contentType = headers.get("content-type");
      if (
        !["image/jpeg", "image/png"].some((type) =>
          contentType?.startsWith(type),
        )
      ) {
        return json(
          { error: "Unsupported Content-Type", contentType },
          { status: Status._400_BadRequest },
        );
      }
    },

    onFileProgress: (ctx, { file, filename, headers, id, name }) => {
      console.log(`[${name}:${file.fullpath}] ${file.progress.toFixed(2)}%`);
    },
  }),
  ({ fields, files }) => {
    return json({
      success: true,
      fields,
      files: Object.fromEntries(files),
      totalSize: Object.values(files).reduce((sum, f) => sum + f.size, 0),
    });
  },
]);
```

---

## Caching & Data Structures (`Cache`, `ExpCache`)

Spine includes memory-bounded LRU caches that track capacity in **bytes** rather than entry counts:

```ts
import { ExpCache } from "@bepalo/spine";

const cache = new ExpCache<string, string>({
  maxMemory: 32 * 1024 * 1024, // 32MB maximum byte capacity
  defaultTTL: 3600 * 1000, // 1 hour TTL
  onMiss: (key, entry, reason, cache) => {
    // Automatically called on cache miss or expiration
  },
});

const data = "user-data";
cache.set("session-1", data, data.length, { ttl: 60 * 1000 });
const value = cache.get("session-1");

setInterval(() => {
  cache.evictExpired(); // Purges expired keys
}, 300_000);
```

---

## OpenAPI 3.0 Document Generation

Generate full OpenAPI 3.0.0 specifications directly from your routes and metadata:

```ts
spine.get("/users/:id", ({ params }) => json({ id: params.id }), {
  openApi: {
    summary: "Get user by ID",
    tags: ["Users"],
    responses: {
      "200": { description: "User found" },
      "404": { description: "User not found" },
    },
  },
});

const openapi = await spine.generateOpenAPI(
  {
    title: "Application API",
    version: "1.0.0",
    servers: [{ url: "https://api.example.com/v1" }],
  },
  {
    pick: ({ path }) => path.startsWith("/api"),
    autoTag: true,
    autoSummary: true,
    includeOperationId: true,
    sortPathnameOrder: 1,
    sortMethodOrder: 1,
  },
);
```

---

## Router Composition (`append`,`appendTo`) & Introspection

Mount sub-routers with path prefixes:

```ts
const apiRoutes = new Router({ maxPath: 16 });
apiRoutes.get("/users", () => json({ users: [] }));
apiRoutes.get("/posts", () => json({ posts: [] }));

const mainRouter = new Router({ maxPath: 24 });
mainRouter.appendTo("/v1", apiRoutes);

// mainRouter now handles: GET /v1/users, GET /v1/posts
```

```ts
const secRoutes = new Router({ maxPath: 16 });
secRoutes.filterAll("/**", [cors(), securityHeaders()]);
secRoutes.filterAll("/api/**", [cors(), securityHeaders()]);

const mainRouter = new Router({ maxPath: 24 });
mainRouter.append(secRoutes);

// mainRouter now filters: All /**, All /api/**
```

Inspect active route registrations across dimensions:

```ts
console.dir(spine.getRoutesByPathnameThenMethod(), { depth: 5 });
console.dir(spine.getRoutesByPathnameThenHandlerType(), { depth: 5 });
console.dir(spine.getRoutesByHandlerTypeThenMethod(), { depth: 5 });
console.dir(spine.getRoutesByHandlerTypeThenPathname(), { depth: 5 });
console.dir(spine.getRoutesByMethodThenHandlerType(), { depth: 5 });
console.dir(spine.getRoutesByMethodThenPathname(), { depth: 5 });
```

---

## File-Based Routing & Watchers

### Loading Routes Dynamically

_NOTE: It is best to use generated static imports for production. see [static-route-watchers](#static-route-watchers-for-zero-reflection-production)_

```ts
const spine = new Router({ maxPath: 24 });

await spine.load({
  routesPath: "./routes",
  // pattern: /\.(ts|js)$/,
});
```

A route file exports handlers matching `<method>` or `<method>_<handlerType>`:

_NOTE: method and handlerType are both case insensitive so you are free to use any casing you want._

```ts
// routes/users/[id].ts
import { json, type HandlerPipe, type CTBody } from "@bepalo/spine";

export const get: HandlerPipe = {
  pipe: ({ params }) => json({ user: params.id }),
  openApi: {
    summary: "Get user by ID",
  },
};

export const get: HandlerPipe = {
  pipe: ({ params }) => json({ user: params.id }),
  openApi: {
    summary: "Get user by ID",
  },
};

export const post: HandlerPipe<CTBody> = ({ body }) => json({ created: body });
```

### Static Route Watchers for Zero-Reflection Production

Generate static import files during development that register routes directly in production:

```ts
// scripts/watch-routes.ts
import { generateStaticRoutesWatcher } from "@bepalo/spine";
import { readFile, writeFile } from "node:fs/promises";

generateStaticRoutesWatcher({
  routesPath: "./routes",
  importRoot: "./routes/",
  output: "./routes.gen.ts",
  read: (f) => readFile(f, "utf-8"),
  write: (f, c) => writeFile(f, c, "utf-8"),
});
```

```ts
// server.ts
import Router from "@bepalo/spine";
import setRoutes from "./routes.gen.ts";

const spine = new Router({ maxPath: 24 });
setRoutes(spine); // Zero filesystem latency on startup!
```

---

## Performance & Design Invariants

- **Specialized Routing Tables**: Exact routes use direct $O(1)$ Map lookups. Globs and super-globs are stored in separate index arrays by path segment count.
- **No String Regex at Matching Time**: Path segments are split once per request and compared by segment.
- **Flat Execution Pipelines**: Array iteration avoids recursive function call stack overhead.
- **Strict Depth Boundaries**: `maxPath` enforces a hard limit on segment count, guarding against URI exhaustion attacks.
- **Zero Cross-Request State Leakage**: Each incoming request receives a fresh `Context` object that can be customized.
- **Protected After-Hooks**: Errors in After-hooks are caught by `afterCatcher` and never corrupt the outgoing Response.
- **Optional pipes**: Optional pipes to disable for performance optimization.

---

## 📄 License

[MIT](/LICENSE)

## 🕊️ Thanks and Enjoy

If you find Spine useful, please consider starring the repository and sharing it with others.

## 💖 Be a Sponsor

Support development and future improvements.

<a href="https://ko-fi.com/natieshzed">
  <img height="32" src="https://img.shields.io/badge/Ko--fi-donate-orange?style=for-the-badge&logo=ko-fi&logoColor=white">
</a>
