# 🏆 @bepalo/spine

**A fast, lightweight, runtime-agnostic HTTP router for modern JavaScript and TypeScript runtimes.**

@bepalo/spine is a low-overhead HTTP routing library built around efficient path matching, typed request contexts, composable handler pipelines, and a Web-standard `Request`/`Response` interface.

## ✨ Features

- ⚡ **High Performance** - Efficient route matching with specialized exact, glob, and super-glob route tables
- 🎯 **Flexible Routing** - Path parameters, optional alternatives, globs (`.*`, `*`), and super-globs (`.**`, `**`)
- 🧩 **Multiple Handler Phases** - Filters, handlers, fallbacks, afters, and catchers
- 🔌 **Composable Pipelines** - Chain multiple handlers with explicit pipeline control
- 🛡️ **Built-in Error Handling** - `HttpError`, route catchers, and configurable default error handling
- 🌐 **Runtime Agnostic** - Uses standard Web APIs and works with Bun, Deno, Node.js, and other compatible runtimes
- 📁 **File-Based Routing** - Load routes automatically from a directory structure
- 📖 **OpenAPI Support** - Attach OpenAPI metadata to handlers and generate an OpenAPI 3.0 document
- 🧠 **TypeScript Native** - Fully typed router contexts, handlers, request bodies, authentication, and middleware
- 🧱 **Router Composition** - Build routers independently and forward requests between routers
- 🛠️ **Response Helpers** - JSON, HTML, text, redirects, blobs, form data, URL-encoded responses, cookies, and more
- 📦 **Request Parsers** - Query strings, cookies, request bodies, headers, and streaming multipart form data
- 🔐 **Authentication Middleware** - Authentication, authorization, and Basic Authentication helpers
- 🌍 **CORS Middleware** - Configurable CORS handling
- 🚦 **Rate Limiting** - Token-bucket rate limiting middleware
- 🔤 **Unicode Paths** - Route matching supports Unicode pathname characters
- 📏 **Configurable Path Limits** - Control the maximum number of path segments processed by the router
- 🪶 **Minimal Dependencies** - Designed around standard JavaScript/Web APIs

## Design goals

- **Server independent** - The router works with standard `Request` and `Response` objects instead of depending on a particular HTTP server.
- **Predictable matching** - Exact routes, parameter routes, globs, and super-globs are matched using deterministic precedence rules.
- **Composable** - Routers can be built independently and used together.
- **Streaming-friendly** - Request bodies remain Web streams and multipart parsing can process data incrementally.
- **Type-safe** - Context extensions allow application-specific data to flow through handler pipelines without losing TypeScript information.
- **Low overhead** - Route registration and request matching use specialized data structures rather than a general-purpose regular-expression router.
- **Framework-friendly** - The router can be used directly or serve as the routing layer underneath a larger framework.

## 📑 Table of Contents

1. [🏆 @bepalo/spine](#-bepalospine)
2. [✨ Features](#-features)
3. [Design goals](#design-goals)
4. [🚀 Get Started](#-get-started)
   - [📥 Installation](#-installation)
   - [📦 Basic Usage](#-basic-usage)
   - [HTTP Method Helpers](#http-method-helpers)
   - [Serve with Bun](#serve-with-bun)
   - [Serve with Deno](#serve-with-deno)
   - [Serve with Node.js](#serve-with-nodejs)

5. [📚 Core Concepts](#-core-concepts)
   - [Router Context](#router-context)
   - [Handler Types](#handler-types)
   - [Pipeline Control](#pipeline-control)
   - [Route Matching](#route-matching)
   - [Path Parameters](#path-parameters)
   - [Route Alternatives](#route-alternatives)
   - [Glob Routes](#glob-routes)
   - [Super-Glob Routes](#super-glob-routes)

6. [📁 File-Based Routing](#-file-based-routing)
   - [Loading Routes](#loading-routes)
   - [Route File Naming](#route-file-naming)
   - [File-Based Parameters](#file-based-parameters)
   - [File-Based Globs](#file-based-globs)
   - [Escaping Route Names](#escaping-route-names)

7. [📖 API Reference](#-api-reference)
   - [Router](#router)
   - [Router Configuration](#router-configuration)
   - [Route Registration](#route-registration)
   - [Request Processing](#request-processing)
   - [OpenAPI](#openapi)
   - [Response Helpers](#response-helpers)
   - [Request Parsers](#request-parsers)
   - [Middleware](#middleware)
   - [Authentication](#authentication)

8. [🔧 Advanced Usage](#-advanced-usage)
   - [Custom Context](#custom-context)
   - [Router Composition](#router-composition)
   - [Streaming Multipart Uploads](#streaming-multipart-uploads)
   - [Error Handling](#error-handling)
   - [Default Handlers](#default-handlers)

9. [🎯 Performance](#-performance)
10. [📄 License](#-license)
11. [🕊️ Thanks and Enjoy](#-thanks-and-enjoy)
12. [💖 Be a Sponsor](#-be-a-sponsor)

## 🚀 Get Started

### 📥 Installation

**Node.js / Bun**

```sh
bun add @bepalo/spine
# or
pnpm add @bepalo/spine
# or
npm install @bepalo/spine
# or
yarn add @bepalo/spine
```

**Deno**

```ts
import Router from "jsr:@bepalo/spine";
```

You can also import individual APIs:

```ts
import { Router, json, text, html, parseBody } from "@bepalo/spine";
```

### 📦 Basic Usage

```ts
import { Router, json, text, status } from "@bepalo/spine";

const router = new Router();

router.get("/", () => text("Hello World!"));

router.get("/users/:id", ({ params }) =>
  json({
    userId: params.id,
  }),
);

router.post("/users", () => json({ created: true }, { status: 201 }));

router.get("/status", () => status(200));

const response = await router.respond(
  new Request("http://localhost:3000/users/123"),
);

console.log(response.status);
```

### HTTP Method Helpers

The router provides dedicated helpers for every standard HTTP method:

```ts
router.head("/resource", handler);
router.get("/resource", handler);
router.post("/resource", handler);
router.put("/resource", handler);
router.patch("/resource", handler);
router.delete("/resource", handler);
router.options("/resource", handler);
router.trace("/resource", handler);
router.connect("/resource", handler);
```

There are also helpers for registering a route for multiple methods:

```ts
router.all("/resource", handler);
```

And CRUD methods:

```ts
router.crud("/users", handler);
```

CRUD includes:

```text
GET
POST
PUT
PATCH
DELETE
```

The same method-specific helpers are available for filters, handlers, fallbacks, afters, and catchers.

### Serve with Bun

```ts
import { Router, text } from "@bepalo/spine";

const router = new Router();

router.get("/", () => text("Hello from Bun!"));

Bun.serve({
  port: 3000,
  fetch: (request) => router.respond(request),
});

console.log("Server running at http://localhost:3000");
```

To provide the client address or other runtime-specific information, pass it through the router context:

```ts
const router = new Router<{
  address: {
    family: string;
    address: string;
    port: number;
  };
}>();

router.get("/", (ctx) => new Response(`Client: ${ctx.address.address}`));

Bun.serve({
  port: 3000,

  fetch: async (request, server) => {
    const address = server.requestIP(request);

    if (!address) {
      return new Response("Unable to determine client address", {
        status: 500,
      });
    }

    return router.respond(request, { address });
  },
});
```

### Serve with Deno

```ts
import { Router, text } from "@bepalo/spine";

const router = new Router();

router.get("/", () => text("Hello from Deno!"));

Deno.serve(
  {
    port: 3000,
  },
  (request) => router.respond(request),
);
```

The request context can also be extended with the Deno client address:

```ts
const router = new Router<{
  address: {
    family: string;
    address: string;
    port: number;
  };
}>();

router.get("/", ({ address }) => new Response(`Client: ${address.address}`));

Deno.serve(
  {
    port: 3000,
  },
  (request, info) => {
    const address = {
      family: info.remoteAddr.transport,
      address: info.remoteAddr.hostname,
      port: info.remoteAddr.port,
    };

    return router.respond(request, { address });
  },
);
```

### Serve with Node.js

Because the router uses Web-standard `Request` and `Response` objects, it can be placed on top of Node's HTTP server:

```ts
import http from "node:http";
import { Router, text } from "@bepalo/spine";

const router = new Router();

router.get("/", () => text("Hello from Node.js!"));

http
  .createServer(async (req, res) => {
    const url = new URL(req.url || "/", `http://${req.headers.host}`);

    const headers = new Headers();

    for (const [key, value] of Object.entries(req.headers)) {
      if (value != null) {
        headers.set(key, Array.isArray(value) ? value.join(", ") : value);
      }
    }

    const request = new Request(url, {
      method: req.method,
      headers,
      body: req.method === "GET" || req.method === "HEAD" ? undefined : req,
      duplex: "half",
    });

    const response = await router.respond(request);

    res.writeHead(
      response.status,
      response.statusText,
      Object.fromEntries(response.headers.entries()),
    );

    if (response.body) {
      const reader = response.body.getReader();

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        res.write(value);
      }
    }

    res.end();
  })
  .listen(3000, () => {
    console.log("Server running at http://localhost:3000");
  });
```

## 📚 Core Concepts

### Router Context

Every handler receives a context object:

```ts
type BaseContext = {
  router: Router;
  url: URL;
  request: Request;
  headers: Headers;
  params: Record<string, string> & {
    $?: string;
    $$?: string;
  };
  pathname: string;
  $pathname: string[];
  error?: Error | HttpError;
};
```

The context is available directly to handlers:

```ts
router.get("/users/:id", (ctx) => {
  console.log(ctx.request);
  console.log(ctx.url);
  console.log(ctx.pathname);
  console.log(ctx.params.id);

  return json({
    id: ctx.params.id,
  });
});
```

The context can be extended with application-specific information:

```ts
type AppContext = {
  user?: {
    id: string;
    role: string;
  };
};

const router = new Router<AppContext>();

router.get("/profile", (ctx) => {
  return json({
    user: ctx.user,
  });
});
```

Runtime-specific information can also be passed through `respond()`:

```ts
const router = new Router<{
  requestId: string;
}>();

router.get("/", (ctx) => {
  return json({
    requestId: ctx.requestId,
  });
});

router.respond(request, {
  requestId: crypto.randomUUID(),
});
```

### Handler Types

The router has five handler phases:

1. **Filters** - Run before the main handler and can terminate request processing.
2. **Handlers** - Process the request and produce the main response.
3. **Fallbacks** - Run when no handler produces a response.
4. **Catchers** - Handle errors thrown during request processing.
5. **Afters** - Run after the final response has been determined.

The normal flow is:

```text
Filters
   ↓
Handlers
   ↓
Fallbacks
   ↓
Response
   ↓
Afters
```

If an error occurs:

```text
Filters / Handlers / Fallbacks
              ↓
           Catchers
              ↓
           Response
              ↓
            Afters
```

### Pipeline Control

A route can contain multiple handlers:

```ts
router.get("/users/:id", [
  (ctx) => {
    console.log("First handler");
  },

  (ctx) => {
    console.log("Second handler");
  },

  (ctx) => {
    return json({
      id: ctx.params.id,
    });
  },
]);
```

A handler can return a `Response` to stop the current pipeline:

```ts
router.get("/private", [
  (ctx) => {
    if (!ctx.request.headers.has("authorization")) {
      return new Response("Unauthorized", {
        status: 401,
      });
    }
  },

  () => json({ secret: "value" }),
]);
```

The router also provides two pipeline-control symbols:

```ts
import { Break_Pipe, Break_Pipeline } from "@bepalo/spine";
```

`Break_Pipe` stops the current route pipeline while allowing other matching routes to continue.

`Break_Pipeline` stops the current handler phase entirely.

Example:

```ts
router.filterAll("/api/**", [
  (ctx) => {
    if (!ctx.request.headers.has("authorization")) {
      return Break_Pipeline;
    }
  },

  () => {
    console.log("This filter will not continue");
  },
]);
```

### Route Matching

Routes can be registered using the general method/path syntax:

```ts
router.handle("Get /users", handler);
router.handle("POST /users", handler);
```

The preferred convenience API is:

```ts
router.get("/users", handler);
router.post("/users", handler);
```

Routes are categorized internally into:

- Exact routes
- Glob routes
- Super-glob routes

This allows common exact routes to avoid expensive general-purpose pattern matching.

### Path Parameters

Parameters use the `:name` syntax:

```ts
router.get("/users/:id", (ctx) => {
  return json({
    id: ctx.params.id,
  });
});
```

Multiple parameters are supported:

```ts
router.get("/users/:userId/posts/:postId", (ctx) =>
  json({
    userId: ctx.params.userId,
    postId: ctx.params.postId,
  }),
);
```

The parameter values are decoded from the request pathname.

The generated OpenAPI path converts parameters to the standard `{name}` notation.

### Route Alternatives

A route segment can contain alternatives separated by `|`:

```ts
router.get("/|about|contact", () => {
  return text("Matched");
});
```

This creates equivalent routes for:

```text
/
/about
/contact
```

Alternatives can also be used with parameters:

```ts
router.get("/api/|users|accounts/:id", (ctx) => {
  return json({
    id: ctx.params.id,
  });
});
```

This matches:

```text
/api/users/123
/api/accounts/123
```

### Glob Routes

A single-segment glob uses `*`:

```ts
router.get("/files/*", (ctx) => {
  return json({
    path: ctx.params,
  });
});
```

When using a named parameter, the parameter syntax is preferred:

```ts
router.get("/files/:name", (ctx) => {
  return text(ctx.params.name);
});
```

The special `.*` pattern can be used to match a path suffix:

```ts
router.get("/api/.*", () => {
  return text("API route");
});
```

Glob routes participate in route specificity matching so that more specific routes are preferred over less specific ones.

### Super-Glob Routes

`**` matches a path prefix and can consume multiple path segments:

```ts
router.get("/api/**", (ctx) => {
  return json({
    path: ctx.params.$$,
  });
});
```

Super-glob routes expose two special parameters:

```text
$   pathname before the super-glob portion
$$  pathname including the super-glob portion
```

For example:

```ts
router.get("/api/**", (ctx) => {
  console.log(ctx.params.$);
  console.log(ctx.params.$$);

  return text("Matched");
});
```

A super-glob is useful for catch-all API routes, static resources, or framework-level fallback behavior.

## 📁 File-Based Routing

The router can automatically discover route files from a directory.

### Loading Routes

```ts
const router = new Router();

await router.load({
  routesPath: "./routes",
});
```

By default, JavaScript and TypeScript route files are loaded:

```text
.js
.ts
.mjs
.cjs
```

The loader can be customized:

```ts
await router.load({
  routesPath: "./routes",
  pattern: /\.(js|ts)$/,
});
```

Directories can also be filtered:

```ts
await router.load({
  routesPath: "./routes",
  dirPattern: /^api/,
});
```

The filename-to-route conversion is handled by `translateRouteFilePath()`.

### Route File Naming

A basic route directory can look like:

```text
routes/
├── index.ts
├── about.ts
├── users/
│   ├── index.ts
│   └── [id].ts
└── api/
    ├── users.ts
    └── posts.ts
```

The resulting routes are approximately:

```text
/index.ts       -> /
/about.ts       -> /about
/users/index.ts -> /users
/users/[id].ts  -> /users/:id
```

A route file exports HTTP methods:

```ts
import { json } from "@bepalo/spine";

export const GET = () => {
  return json({
    message: "Hello",
  });
};
```

Multiple methods can be exported from one file:

```ts
import { json } from "@bepalo/spine";

export const GET = () =>
  json({
    method: "GET",
  });

export const POST = () =>
  json({
    method: "POST",
  });
```

### File-Based Parameters

A parameterized filename can be written using parentheses:

```text
routes/
└── users/
    └── (id).ts
```

This corresponds to:

```text
/users/:id
```

The parameter is available in the route context:

```ts
import { json } from "@bepalo/spine";

export const GET = (ctx) => {
  return json({
    id: ctx.params.id,
  });
};
```

### File-Based Globs

The file router uses filesystem-safe representations for special route patterns.

```text
(#)
```

represents:

```text
*
```

and:

```text
(##)
```

represents:

```text
**
```

The bracket forms:

```text
[#]
```

and:

```text
[##]
```

represent:

```text
.*
.**
```

For example:

```text
routes/
└── api/
    └── (##).ts
```

represents a route similar to:

```text
/api/**
```

### Escaping Route Names

Route filenames can contain router syntax by escaping the special prefix with `#`.

For example, a filename beginning with `#` can represent a literal route segment rather than a special route pattern.

The loader validates route path segments before translating them into router patterns.

### File-Based Handler Phases

The file loader also supports handler types through export names.

For example:

```ts
export const GET = handler;
export const GET_filter = filter;
export const GET_fallback = fallback;
export const GET_after = after;
export const GET_catcher = catcher;
```

This allows a single route file to describe the complete lifecycle of a route.

A route can therefore contain:

```ts
export const GET_filter = (ctx) => {
  // authentication or validation
};

export const GET = (ctx) => {
  return json({
    success: true,
  });
};

export const GET_after = (ctx) => {
  console.log("Response:", ctx.response);
};
```

Pipelines can also be exported:

```ts
export const GET = [validateRequest, loadUser, handler];
```

## 📖 API Reference

### Router

```ts
const router = new Router();
```

The router accepts an optional configuration object:

```ts
const router = new Router({
  maxPath: 24,

  enable: {
    filter: true,
    handler: true,
    fallback: true,
    after: true,
    catcher: true,
  },
});
```

### Router Configuration

#### `maxPath`

Maximum number of pathname segments processed by the router.

Default:

```text
24
```

Example:

```ts
const router = new Router({
  maxPath: 32,
});
```

If the request exceeds the configured limit, the router returns `414 URI Too Long`.

#### `enable`

Enable or disable handler phases:

```ts
const router = new Router({
  enable: {
    filter: true,
    handler: true,
    fallback: true,
    after: true,
    catcher: true,
  },
});
```

#### `defaultFilter`

A filter that runs when no route-specific filter has produced a response:

```ts
const router = new Router({
  defaultFilter: (ctx) => {
    console.log("Global filter");
  },
});
```

#### `defaultFallback`

Runs when no route handler has produced a response:

```ts
const router = new Router({
  defaultFallback: () =>
    new Response("Not Found", {
      status: 404,
    }),
});
```

#### `defaultCatcher`

Handles errors that are not handled by a route-specific catcher:

```ts
const router = new Router({
  defaultCatcher: (ctx) => {
    console.error(ctx.error);

    return json(
      {
        error: "Internal Server Error",
      },
      {
        status: 500,
      },
    );
  },
});
```

#### `defaultAfter`

Runs after the response has been determined:

```ts
const router = new Router({
  defaultAfter: (ctx) => {
    console.log(ctx.response.status);
  },
});
```

### Route Registration

The generic registration methods are:

```ts
router.filter(path, pipeline);
router.handle(path, pipeline);
router.fallback(path, pipeline);
router.after(path, pipeline);
router.catch(path, pipeline);
```

For example:

```ts
router.filter("Get /admin/**", authenticate);

router.handle("Get /admin/users", getUsers);

router.fallback("Get /admin/**", notFound);

router.after("Get /admin/**", logOrMAlterResponse);

router.catch("Get /admin/**", handleError);
```

The method-specific versions are:

```text
filterAll
filterCrud
filterHead
filterGet
filterPost
filterPut
filterPatch
filterDelete
filterOptions
filterTrace
filterConnect

handleAll, *Crud, *Head, *Get, *Post, *Put, *Patch, *Delete, *Options, *Trace, *Connect

fallbackAll, *Crud, *Head, *Get, *Post, *Put, *Patch, *Delete, *Options, *Trace, *Connect

afterAll, *Crud, *Head, *Get, *Post, *Put, *Patch, *Delete, *Options, *Trace, *Connect

catchAll, *Crud, *Head, *Get, *Post, *Put, *Patch, *Delete, *Options, *Trace, *Connect
```

For most applications, the concise helpers are sufficient:

```ts
router.get("/users", handler);
router.post("/users", handler);

router.filterGet("/users", filter);
router.fallbackGet("/users/**", fallback);
router.afterGet("/users/**", after);
router.catchGet("/users/**", catcher);
```

### Overwriting Routes

By default, registering the same route twice throws a `RouterError`.

Use `overwrite: true` to replace an existing route:

```ts
router.patch("/users", handler, {
  overwrite: true,
});
```

### Request Processing

The main entry point is:

```ts
const response = await router.respond(request);
```

The initial context can be supplied:

```ts
import { toBase64UUID } from "@bepalo/spine";

const response = await router.respond(request, {
  headers: new Header({ "X-Powered-By": "@bepalo/spine" }),
  requestId: toBase64UUID(crypto.randomUUID()), // UUID compressed to base64url
});
```

The router always returns a Web-standard `Response`.

If no route matches:

```text
404 Not Found
```

If a route matches but no handler produces a response:

```text
501 Not Implemented
```

Malformed paths can result in:

```text
400 Bad Request
```

Paths exceeding the configured segment limit result in:

```text
414 URI Too Long
```

### OpenAPI

Handlers can contain OpenAPI metadata.

```ts
router.get("/users/:id", handler, {
  openApi: {
    summary: "Get a user",
    description: "Retrieve a user by ID",
    tags: ["Users"],
    responses: {
      "200": {
        description: "User found",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                },
              },
            },
          },
        },
      },
    },
  },
});
```

Generate an OpenAPI 3.0 document:

```ts
const openApi = await router.generateOpenAPI({
  title: "My API",
  version: "1.0.0",
});
```

The result has the form:

```ts
{
  openapi: "3.0.0",
  info: {
    title: "My API",
    version: "1.0.0",
  },
  paths: {
    // ...
  },
}
```

Path parameters are automatically converted into OpenAPI `{parameter}` notation.

For example:

```text
/users/:id
```

becomes:

```text
/users/{id}
```

### Response Helpers

The package provides helpers for common HTTP responses.

#### `status`

```ts
status(200);
status(201, "Created");
status(404, "Not Found");
status(204, null); // null specifically for empty content
```

#### `text`

```ts
text("Hello World!");
```

#### `html`

```ts
html("<h1>Hello World!</h1>");
```

#### `json`

```ts
json({
  success: true,
});
```

With a custom status:

```ts
json(
  {
    created: true,
  },
  {
    status: 201,
  },
);
```

#### `redirect`

```ts
redirect("/login");
```

With a custom status:

```ts
redirect("/login", {
  status: 301,
});
```

#### `blob`

```ts
blob(myBlob);
```

#### `octetStream`

```ts
octetStream(data);
```

#### `formData`

```ts
formData(form);
```

#### `usp`

```ts
usp(
  new URLSearchParams({
    hello: "world",
  }),
);
```

#### `send`

Autodetects the content-type and returns a reposnse accordingly.

```ts
send("Hello");
send(Bun.file("accounts.xlsx"));
```

Objects can also be passed:

```ts
send({
  success: true,
});
```

#### Cookies

cookie manipulation is done directly in headers. The helper functions help with
generating the cookie name and value which can be used in the response header directly
or via `ctx.headers`.

Cookies can be created using `setCookie`:

```ts
import { setCookie } from "@bepalo/spine";

const [name, value] = setCookie("session", "abc123", {
  httpOnly: true,
  path: "/",
});
```

Cookies can be cleared with:

```ts
clearCookie("session", {
  path: "/",
});
```

### Request Parsers

#### Cookie Parser

```ts
import { parseCookie } from "@bepalo/spine";

router.get<CTXCookie<"session" | "geo">>("/profile", [
  parseCookie(),
  ({ cookie: { session, geo } }) => {
    return status({ session, geo });
  },
]);
```

#### Query Parser

```ts
import { parseQuery } from "@bepalo/spine";

router.get<CTXQuery<"q" | "page">>("/search", [
  parseQuery(),
  ({ query: { q, page } }) => {
    return json({ q, page });
  },
]);
```

```text
/search?q=router&page=2
```

### Request Bodies

`parseBody()` supports:

```text
application/x-www-form-urlencoded
application/json
application/rjson // Custom Type. Remote-JSON. Very efficient. Slightly slower than JSON(native).
text/plain
```

Example:

```ts
import { parseBody, json } from "@bepalo/spine";

router.post("/users", [
  // you can specify what body type to expect for autocomplete using CTXBody.
  parseBody<CTXBody<object | any[] | string | number | boolean | null>>(),
  ({ body }) => {
    return json({ body });
  },
]);
```

```ts
parseBody({
  accept: ["application/json"], //  Accepted media types can be restricted:
  maxSize: 5 * 1024 * 1024, // A maximum body size, in bytes, can also be configured:
  once: true, //  To ensure the request body is parsed only once:
});
```

### Multipart Form Data

The router provides a streaming multipart parser:

```ts
import { parseMultipart } from "@bepalo/spine";
```

Example:

```ts
router.post("/upload", [
  parseMultipart({
    onHeader: async (ctx, { headers, id, name, filename, files }) => {
      console.log(info.name, info.filename, info.chunk.length);
      // Process the chunk.
    },
    onData: async (ctx, info) => {
      console.log(info.name, info.filename, info.chunk.length);
      // Process the chunk.
    },
    onDataCompletion: (ctx, info) => {
      console.log("Completed:", info.name);
    },
  }),
]);
```

The multipart parser processes request bodies as streams rather than requiring the entire upload to be loaded into memory.

The context contains:

```ts
ctx.fields;
ctx.files;
```

where appropriate.

### Header Parsing

Raw header bytes can be parsed with:

```ts
parseHeaders(rawHeaders);
```

Content-Disposition parameters can also be extracted:

```ts
const contentDisposition = {};

const headers = parseHeaders(rawHeaders, contentDisposition);
```

### Middleware

The package includes built-in middleware for common server requirements.

### Rate Limiting

Use `limitRate()` for token-bucket rate limiting:

```ts
import { limitRate } from "@bepalo/spine";

router.filterAll("/api/**", [
  limitRate({
    key: (ctx) => ctx.request.headers.get("x-forwarded-for") ?? "unknown",

    maxTokens: 100,

    refillRate: 10,

    refillInterval: 1000,
  }),
]);
```

The key function can be asynchronous:

```ts
limitRate({
  key: async (ctx) => {
    return getClientIdentifier(ctx);
  },

  maxTokens: 100,

  refillRate: 10,
});
```

### CORS

Use `cors()` to configure cross-origin requests:

```ts
import { cors } from "@bepalo/spine";

router.filterAll("/api/**", [
  cors({
    origins: "*",
  }),
]);
```

Restrict origins:

```ts
cors({
  origins: ["https://example.com", "https://app.example.com"],
});
```

Configure methods and headers:

```ts
cors({
  origins: ["https://example.com"],

  methods: ["Get", "Post", "Put", "Delete"],

  allowedHeaders: ["Content-Type", "Authorization"],
});
```

### Authentication

The router includes authentication helpers:

```ts
import { authenticate, authorize } from "@bepalo/spine";
```

Authentication populates `ctx.auth`.

A custom authentication parser can be provided:

```ts
router.filterGet("/private", [
  authenticate({
    parseAuth: async (ctx) => {
      const token = ctx.request.headers.get("authorization");

      if (!token) {
        return undefined;
      }

      return {
        role: "user",
        id: "123",
      };
    },
  }),
]);
```

Authorization can then restrict roles:

```ts
router.filterGet("/admin", [
  authorize({
    allowRole: "admin",
  }),
]);
```

Multiple authorization rules can be composed depending on the application requirements.

### Basic Authentication

The package also provides:

```ts
basicAuthParser();
```

for parsing HTTP Basic Authentication credentials.

## 🔧 Advanced Usage

### Custom Context

One of the main design goals of the router is allowing applications to extend the context.

```ts
type AppContext = {
  user?: {
    id: string;
    role: string;
  };

  requestId: string;
};

const router = new Router<AppContext>();
```

Middleware can populate the context:

```ts
const loadUser = (ctx: AppContext) => {
  ctx.user = {
    id: "123",
    role: "admin",
  };
};
```

Subsequent handlers receive the extended context:

```ts
router.get("/profile", [
  loadUser,

  (ctx) => {
    return json({
      user: ctx.user,
      requestId: ctx.requestId,
    });
  },
]);
```

### Router Composition

Routers can be kept modular and forwarded to from another router.

This is useful for splitting an application into independent APIs:

```ts
const apiRouter = new Router();

apiRouter.get("/users", () =>
  json({
    users: [],
  }),
);

apiRouter.get("/posts", () =>
  json({
    posts: [],
  }),
);
```

A parent router can forward requests:

```ts
const router = new Router();

router.get("/api/users", async (ctx) => {
  return apiRouter.respond(ctx.request);
});
```

The `forward()` helper can also be used:

```ts
import { forward } from "@bepalo/spine";

router.get("/api/users", (ctx) => forward(apiRouter, "/users")(ctx));
```

This allows routers to remain independently testable and composable.

### Streaming Multipart Uploads

For large uploads, process data incrementally instead of calling `request.formData()`:

```ts
router.post("/upload", [
  parseMultipart({
    onStart: (ctx) => {
      console.log("Upload started");
    },

    onHeader: (ctx, info) => {
      console.log("Part:", info.name, info.filename);
    },

    onData: async (ctx, info) => {
      await processChunk(info.chunk);
    },

    onDataCompletion: (ctx, info) => {
      console.log("Part completed:", info.name);
    },

    onEnd: (ctx, info) => {
      console.log("Upload complete:", info.success);
    },
  }),
]);
```

This is particularly useful for large files and streaming-oriented servers.

### Error Handling

Throw an ordinary error:

```ts
router.get("/error", () => {
  throw new Error("Something went wrong");
});
```

The router will pass the error to matching catchers.

Route-specific catcher:

```ts
router.catchGet("/error", (ctx) => {
  console.error(ctx.error);

  return json(
    {
      error: ctx.error?.message,
    },
    {
      status: 500,
    },
  );
});
```

For HTTP-specific failures, use `HttpError`:

```ts
import { HttpError } from "@bepalo/spine";

router.get("/users/:id", (ctx) => {
  const user = findUser(ctx.params.id);

  if (!user) {
    throw new HttpError(404, "User not found");
  }

  return json(user);
});
```

If the error is not handled by a catcher, `HttpError.status` is used as the response status.

### Default Handlers

Global defaults are useful for application-wide behavior:

```ts
const router = new Router({
  defaultFilter: (ctx) => {
    ctx.headers.set("X-Powered-By", "@bepalo/spine");
  },

  defaultFallback: () =>
    json(
      {
        error: "Not Found",
      },
      {
        status: 404,
      },
    ),

  defaultCatcher: (ctx) =>
    json(
      {
        error: "Internal Server Error",
      },
      {
        status: 500,
      },
    ),

  defaultAfter: (ctx) => {
    console.log(ctx.response.status);
  },
});
```

## 🎯 Performance

@bepalo/spine is designed to keep the common routing path small and predictable.

Routes are separated internally by HTTP method and route category:

```text
HTTP Method
    │
    ├── Exact Routes
    │
    ├── Glob Routes
    │
    └── Super-Glob Routes
```

Exact routes can be looked up directly, while glob and super-glob routes are evaluated separately.

The router also splits pathname processing into reusable path segments and avoids using one large regular expression for the complete routing table.

### Route Matching Priority

The router considers routes in this general order:

```text
1. Exact route
2. Glob route
3. Super-glob route
```

For handler routes, the first matching handler route is selected.

Filters, fallbacks, afters, and catchers can participate in their respective phases without requiring all route types to be combined into one routing table.

### Runtime Agnostic Architecture

The core router does not create a server.

It accepts:

```ts
Request;
```

and produces:

```ts
Response;
```

This keeps the routing layer independent from:

```text
Bun
Deno
Node.js
Cloudflare Workers
Other Web API compatible runtimes
```

For example:

```ts
const response = await router.respond(request);
```

The HTTP server is responsible only for converting its native request representation into a Web-standard `Request` and sending the resulting `Response`.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](/LICENSE) file for details.

## 🕊️ Thanks and Enjoy

If you like this library and want to support the project, please give it a star on [GitHub](https://github.com/bepalo/spine).

## 💖 Be a Sponsor

Fund me so I can give more attention to the products and services you liked.
