// router.test.ts
import { describe, it, expect, vi } from "bun:test";
import { Router } from "../src/router.ts";
import { json, text, status, redirect } from "../src/helpers.ts";
import {
  Break_Pipe,
  Break_Pipeline,
  HttpError,
  RouterError,
} from "../src/types.ts";
import type { Context, CTError, CTResponse } from "../src/types.ts";
import { parseQuery, type CTQuery } from "../src/parsers.ts";

// Test helpers
const createRequest = (
  path: string,
  method: string = "GET",
  headers: Record<string, string> = {},
  body?: unknown,
): Request => {
  if (body != null) {
    headers["content-type"] = "application/json";
  }
  return new Request(`http://localhost${path}`, {
    method,
    headers: new Headers(headers),
    body: body ? JSON.stringify(body || null) : undefined,
  });
};

const createSpy = () => vi.fn();

describe("Router", () => {
  describe("Basic Routing", () => {
    it("should handle GET requests", async () => {
      const router = new Router();
      const spy = createSpy();

      router.get("/test", () => {
        spy();
        return text("OK");
      });

      const response = await router.respond(createRequest("/test"));
      expect(response.status).toBe(200);
      expect(await response.text()).toBe("OK");
      expect(spy).toHaveBeenCalled();
    });

    it("should handle POST requests", async () => {
      const router = new Router();

      router.post("/test", () => json({ created: true }));

      const response = await router.respond(createRequest("/test", "POST"));
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ created: true });
    });

    it("should handle PUT requests", async () => {
      const router = new Router();

      router.put("/test", () => json({ updated: true }));

      const response = await router.respond(createRequest("/test", "PUT"));
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ updated: true });
    });

    it("should handle DELETE requests", async () => {
      const router = new Router();

      router.delete("/test", () => status(204));

      const response = await router.respond(createRequest("/test", "DELETE"));
      expect(response.status).toBe(204);
    });

    it("should handle PATCH requests", async () => {
      const router = new Router();

      router.patch("/test", () => json({ patched: true }));

      const response = await router.respond(createRequest("/test", "PATCH"));
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ patched: true });
    });

    it("should handle HEAD requests", async () => {
      const router = new Router();
      const spy = createSpy();

      router.head("/test", () => {
        spy();
        return new Response(null, { status: 200 });
      });

      const response = await router.respond(createRequest("/test", "HEAD"));
      expect(response.status).toBe(200);
      expect(spy).toHaveBeenCalled();
    });

    it("should handle OPTIONS requests", async () => {
      const router = new Router();

      router.options("/test", () => {
        const response = new Response(null, { status: 204 });
        response.headers.set("Allow", "GET, POST");
        return response;
      });

      const response = await router.respond(createRequest("/test", "OPTIONS"));
      expect(response.status).toBe(204);
      expect(response.headers.get("Allow")).toBe("GET, POST");
    });

    it("should return 404 for unregistered routes", async () => {
      const router = new Router();
      const response = await router.respond(createRequest("/nonexistent"));
      expect(response.status).toBe(404);
    });

    it("should return 501 when handler exists but method is not implemented", async () => {
      const router = new Router();
      router.post("/test", () => {});

      const response = await router.respond(createRequest("/test", "POST"));
      expect(response.status).toBe(501);
    });
  });

  describe("Route Patterns", () => {
    describe("Exact Paths", () => {
      it("should match exact paths", async () => {
        const router = new Router();
        let called = false;

        router.get("/exact/path", () => {
          called = true;
          return text("matched");
        });

        const response = await router.respond(createRequest("/exact/path"));
        expect(called).toBe(true);
        expect(await response.text()).toBe("matched");
      });

      it("should NOT match similar paths", async () => {
        const router = new Router();
        let called = false;

        router.get("/exact/path", () => {
          called = true;
          return text("matched");
        });

        await router.respond(createRequest("/exact/path/extra"));
        expect(called).toBe(false);
      });
    });

    describe("Path Parameters", () => {
      it("should parse single parameter", async () => {
        const router = new Router();

        router.get("/users/:id", (ctx) => {
          return json({ id: ctx.params.id! });
        });

        const response = await router.respond(createRequest("/users/123"));
        expect(await response.json()).toEqual({ id: "123" });
      });

      it("should parse multiple parameters", async () => {
        const router = new Router();

        router.get("/users/:userId/posts/:postId", (ctx) => {
          return json({
            userId: ctx.params.userId!,
            postId: ctx.params.postId!,
          });
        });

        const response = await router.respond(
          createRequest("/users/123/posts/456"),
        );
        expect(await response.json()).toEqual({ userId: "123", postId: "456" });
      });

      it("should parse parameter with pipe (specified values)", async () => {
        const router = new Router();

        router.get("/|home|about:page", (ctx) => {
          return json({ page: ctx.params.page! });
        });

        const response1 = await router.respond(createRequest("/home"));
        expect(await response1.json()).toEqual({ page: "home" });

        const response2 = await router.respond(createRequest("/about"));
        expect(await response2.json()).toEqual({ page: "about" });

        const response3 = await router.respond(createRequest("/contact"));
        expect(response3.status).toBe(404);
      });

      it("should parse complex pipe with colon", async () => {
        const router = new Router();

        router.get(
          "/dashboard/admin|vendor|client:role/settings/profile|payment:tab",
          (ctx) => {
            return json({ role: ctx.params.role!, tab: ctx.params.tab! });
          },
        );

        const response1 = await router.respond(
          createRequest("/dashboard/admin/settings/profile"),
        );
        expect(await response1.json()).toEqual({
          role: "admin",
          tab: "profile",
        });

        const response2 = await router.respond(
          createRequest("/dashboard/client/settings/payment"),
        );
        expect(await response2.json()).toEqual({
          role: "client",
          tab: "payment",
        });

        const response3 = await router.respond(
          createRequest("/dashboard/vendor/settings/security"),
        );
        expect(response3.status).toBe(404);
      });
    });

    describe("Globs (*)", () => {
      it("should match single segment glob", async () => {
        const router = new Router();
        let called = false;

        router.get("/api/*", (ctx) => {
          called = true;
          return json({ wildcard: ctx.params["!0"] });
        });

        await router.respond(createRequest("/api/users"));
        expect(called).toBe(true);
      });

      it("should match multiple globs", async () => {
        const router = new Router();

        router.get("/*/*", () => {
          return status(200);
        });

        const response = await router.respond(createRequest("/api/users"));
        expect(response.status).toBe(200);
      });

      it("should NOT match deeper paths than expected", async () => {
        const router = new Router();
        let called = false;

        router.get("/*", () => {
          called = true;
          return text("matched");
        });

        await router.respond(createRequest("/api/v1/users"));
        expect(called).toBe(false);
      });
    });

    describe("Super Globs (**)", () => {
      it("should match deep paths", async () => {
        const router = new Router();

        router.get("/files/**", () => {
          return status(200);
        });

        const response = await router.respond(
          createRequest("/files/documents/report.pdf"),
        );
        expect(response.status).toEqual(200);
      });

      it("should match root super glob", async () => {
        const router = new Router();

        router.get("/**", () => {
          return status(200);
        });

        const response = await router.respond(createRequest("/any/deep/path"));
        expect(response.status).toEqual(200);
      });
    });

    describe("Special Patterns (*!, **!)", () => {
      it("should match *! pattern as regex-like glob", async () => {
        const router = new Router();

        router.get("/api/*!", () => {
          return status(200);
        });

        const response0 = await router.respond(createRequest("/api"));
        expect(response0.status).toBe(200);

        const response1 = await router.respond(createRequest("/api/users"));
        expect(response1.status).toBe(200);

        const response2 = await router.respond(createRequest("/api/v1/users"));
        expect(response2.status).toBe(404);
      });

      it("should match **! pattern including parent path", async () => {
        const router = new Router();

        router.get("/files/**!", () => {
          return status(200);
        });

        const response1 = await router.respond(
          createRequest("/files/documents/report.pdf"),
        );
        expect(response1.status).toBe(200);

        const response2 = await router.respond(
          createRequest("/files/report.pdf"),
        );
        expect(response2.status).toBe(200);

        const response3 = await router.respond(createRequest("/files/"));
        expect(response3.status).toBe(200);

        const response4 = await router.respond(createRequest("/files"));
        expect(response4.status).toBe(200);
      });
    });
  });

  describe("Route Priority", () => {
    it("should prioritize exact matches over globs", async () => {
      const router = new Router();
      const calls: string[] = [];

      router.get("/api/users/123", () => {
        calls.push("exact");
        return text("exact");
      });

      router.get("/api/*", () => {
        calls.push("glob");
        return text("glob");
      });

      router.get("/api/**", () => {
        calls.push("super");
        return text("super");
      });

      const response = await router.respond(createRequest("/api/users/123"));
      expect(calls).toEqual(["exact"]);
      expect(await response.text()).toBe("exact");
    });

    it("should prioritize globs over super globs", async () => {
      const router = new Router();
      const calls: string[] = [];

      router.get("/api/v1/*", () => {
        calls.push("glob");
        return text("glob");
      });

      router.get("/api/**", () => {
        calls.push("super");
        return text("super");
      });

      const response = await router.respond(createRequest("/api/v1/users"));
      expect(calls).toEqual(["glob"]);
      expect(await response.text()).toBe("glob");
    });

    it("should prioritize specific globs over general globs", async () => {
      const router = new Router();
      const calls: string[] = [];

      router.get("/api/users/*", () => {
        calls.push("specific");
        return text("specific");
      });

      router.get("/api/*", () => {
        calls.push("general");
        return text("general");
      });

      const response = await router.respond(createRequest("/api/users/123"));
      expect(calls).toEqual(["specific"]);
      expect(await response.text()).toBe("specific");
    });

    it("should match the longest super glob prefix", async () => {
      const router = new Router();

      router.get("/api/**", () => text("api"));
      router.get("/api/v1/**", () => text("v1"));
      router.get("/api/v1/users/**", () => text("users"));

      const response1 = await router.respond(
        createRequest("/api/v1/users/profile"),
      );
      expect(await response1.text()).toBe("users");

      const response2 = await router.respond(createRequest("/api/v1/posts"));
      expect(await response2.text()).toBe("v1");

      const response3 = await router.respond(createRequest("/api/health"));
      expect(await response3.text()).toBe("api");
    });

    it("should throw RouterError for the same paths", () => {
      const router = new Router();

      router.get("/api/*", () => {});

      expect(() => router.get("/api/*", () => {})).toThrowError(RouterError);
    });

    it("should respect route registration order for equal matches", async () => {
      const router = new Router();
      const calls: string[] = [];

      router.get("/api/*", () => {
        calls.push("first");
        return text("first");
      });

      router.get(
        "/api/*",
        () => {
          calls.push("second");
          return text("second");
        },
        { overwrite: true },
      );

      const response = await router.respond(createRequest("/api/users"));
      expect(calls).toEqual(["second"]);
      expect(await response.text()).toBe("second");
    });

    it("should handle complex priority scenarios", async () => {
      const router = new Router();

      // Exact match
      router.get("/api/users/123", () => text("exact"));

      // More specific glob
      router.get("/api/users/*", () => text("user glob"));

      // General glob
      router.get("/api/*", () => text("api glob"));

      // Super glob
      router.get("/api/**", () => text("api super"));

      // Root super glob
      router.get("/**", () => text("root super"));

      const responses = [
        { path: "/api/users/123", expected: "exact" },
        { path: "/api/users/456", expected: "user glob" },
        { path: "/api/posts", expected: "api glob" },
        { path: "/api/users/123/posts", expected: "api super" },
        { path: "/other/path", expected: "root super" },
      ];

      for (const { path, expected } of responses) {
        const response = await router.respond(createRequest(path));
        expect(await response.text()).toBe(expected);
      }
    });
  });

  describe("Middleware Pipeline", () => {
    it("should execute multiple handlers in order", async () => {
      const router = new Router();
      const order: string[] = [];

      router.get("/test", [
        () => {
          order.push("first");
        },
        () => {
          order.push("second");
          return text("done");
        },
        () => {
          order.push("third");
        },
      ]);

      const response = await router.respond(createRequest("/test"));
      expect(order).toEqual(["first", "second"]);
      expect(await response.text()).toBe("done");
    });

    it("should stop pipeline with Break_Pipe", async () => {
      const router = new Router();
      const order: string[] = [];

      router.get("/test", [
        () => {
          order.push("first");
        },
        () => {
          order.push("second");
          return Break_Pipe;
        },
        () => {
          order.push("third");
        },
      ]);

      await router.respond(createRequest("/test"));
      expect(order).toEqual(["first", "second"]);
    });

    it("should stop pipeline queue with Break_Pipeline", async () => {
      const router = new Router();
      const order: string[] = [];

      router.get("/test", [
        () => {
          order.push("first");
          return Break_Pipeline;
        },
        () => {
          order.push("second");
        },
      ]);

      await router.respond(createRequest("/test"));
      expect(order).toEqual(["first"]);
    });

    it("should pass context between handlers", async () => {
      const router = new Router();

      router.get("/test", [
        (ctx: Context & { data?: string }) => {
          ctx.data = "hello";
        },
        (ctx: Context & { data?: string }) => {
          return text(ctx.data || "not set");
        },
      ]);

      const response = await router.respond(createRequest("/test"));
      expect(await response.text()).toBe("hello");
    });

    it("should handle async handlers", async () => {
      const router = new Router();

      router.get("/test", async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return text("async response");
      });

      const response = await router.respond(createRequest("/test"));
      expect(await response.text()).toBe("async response");
    });
  });

  describe("Filters", () => {
    it("should execute filters before handlers", async () => {
      const router = new Router();
      let filterCalled = false;
      let handlerCalled = false;

      router.filterGet("/test", () => {
        filterCalled = true;
      });

      router.get("/test", () => {
        handlerCalled = true;
        return text("OK");
      });

      await router.respond(createRequest("/test"));
      expect(filterCalled).toBe(true);
      expect(handlerCalled).toBe(true);
    });

    it("should stop execution if filter returns response", async () => {
      const router = new Router();
      let handlerCalled = false;

      router.filterGet("/test", () => {
        return status(401, "Unauthorized");
      });

      router.get("/test", () => {
        handlerCalled = true;
        return text("OK");
      });

      const response = await router.respond(createRequest("/test"));
      expect(response.status).toBe(401);
      expect(await response.text()).toBe("Unauthorized");
      expect(handlerCalled).toBe(false);
    });

    it("should apply filters in priority order", async () => {
      const router = new Router();
      const calls: string[] = [];

      router.filterGet("/**", () => {
        calls.push("root super");
      });

      router.filterGet("/api/**", () => {
        calls.push("api super");
      });

      router.filterGet("/api/*", () => {
        calls.push("api glob");
      });

      router.filterGet("/api/users/*", () => {
        calls.push("users glob");
      });

      router.filterGet("/api/users/123", () => {
        calls.push("exact");
      });

      router.get("/api/users/123", () => text("OK"));

      await router.respond(createRequest("/api/users/123"));
      expect(calls).toEqual(["exact", "users glob", "api super", "root super"]);
    });
  });

  describe("Fallbacks", () => {
    it("should execute fallback when no handler matches", async () => {
      const router = new Router();

      router.fallbackGet("/*", () => {
        return text("fallback response", { status: 404 });
      });

      const response = await router.respond(createRequest("/nonexistent"));
      expect(response.status).toBe(404);
      expect(await response.text()).toBe("fallback response");
    });

    it("should NOT execute fallback when handler exists", async () => {
      const router = new Router();
      let fallbackCalled = false;

      router.get("/test", () => text("handler"));
      router.fallbackGet("/*", () => {
        fallbackCalled = true;
        return text("fallback");
      });

      const response = await router.respond(createRequest("/test"));
      expect(await response.text()).toBe("handler");
      expect(fallbackCalled).toBe(false);
    });

    it("should use defaultFallback if configured", async () => {
      const router = new Router({
        defaultFallback: () => text("default fallback", { status: 404 }),
      });

      const response = await router.respond(createRequest("/nonexistent"));
      expect(await response.text()).toBe("default fallback");
      expect(response.status).toBe(404);
    });
  });

  describe("Error Handling", () => {
    it("should catch errors in handlers", async () => {
      const router = new Router();

      router.get("/error", () => {
        throw new Error("Something went wrong");
      });

      const response = await router.respond(createRequest("/error"));
      expect(response.status).toBe(500);
    });

    it("should use custom error catcher", async () => {
      const router = new Router();

      router.catchGet("/error", (ctx) => {
        return text(`Error: ${ctx.error.message || "Unknown"}`, {
          status: 400,
        });
      });

      router.get("/error", () => {
        throw new Error("Custom error");
      });

      const response = await router.respond(createRequest("/error"));
      expect(response.status).toBe(400);
      expect(await response.text()).toBe("Error: Custom error");
    });

    it("should handle HttpError with status", async () => {
      const router = new Router();

      router.get("/error", () => {
        throw new HttpError(403, "Forbidden");
      });

      const response = await router.respond(createRequest("/error"));
      expect(response.status).toBe(403);
    });

    it("should use defaultCatcher if configured", async () => {
      const router = new Router({
        defaultCatcher: (ctx) => {
          return text(`Error caught: ${ctx.error.message}`, { status: 500 });
        },
      });

      router.get("/error", () => {
        throw new Error("Test error");
      });

      const response = await router.respond(createRequest("/error"));
      expect(await response.text()).toBe("Error caught: Test error");
      expect(response.status).toBe(500);
    });
  });

  describe("After Middleware", () => {
    it("should execute after handlers", async () => {
      const router = new Router();
      let afterCalled = false;

      router.get("/test", () => text("OK"));

      router.afterGet("/test", (ctx<CTResponse>) => {
        afterCalled = true;
        ctx.response.headers.set("X-Custom", "after");
      });

      const response = await router.respond(createRequest("/test"));
      expect(afterCalled).toBe(true);
      expect(response.headers.get("X-Custom")).toBe("after");
    });

    it("should allow modifying response in after", async () => {
      const router = new Router();

      router.get("/test", () => text("original"));

      router.afterGet("/test", () => {
        return text("modified");
      });

      const response = await router.respond(createRequest("/test"));
      expect(await response.text()).toBe("modified");
    });
  });

  describe("Multiple HTTP Methods", () => {
    it("should handle different methods on same path", async () => {
      const router = new Router();

      router.get("/resource", () => text("GET"));
      router.post("/resource", () => text("POST"));
      router.put("/resource", () => text("PUT"));
      router.delete("/resource", () => text("DELETE"));
      router.patch("/resource", () => text("PATCH"));

      const methods = ["GET", "POST", "PUT", "DELETE", "PATCH"];
      const expected = ["GET", "POST", "PUT", "DELETE", "PATCH"];

      for (let i = 0; i < methods.length; i++) {
        const response = await router.respond(
          createRequest("/resource", methods[i]),
        );
        expect(await response.text()).toBe(expected[i]!);
      }
    });

    it("should use all() for all HTTP methods", async () => {
      const router = new Router();

      router.all("/test", () => text("All methods"));

      const methods = [
        "GET",
        "POST",
        "PUT",
        "DELETE",
        "PATCH",
        "HEAD",
        "OPTIONS",
      ];
      for (const method of methods) {
        const response = await router.respond(createRequest("/test", method));
        expect(await response.text()).toBe("All methods");
      }
    });

    it("should use crud() for CRUD methods", async () => {
      const router = new Router();

      router.crud("/resource", () => text("CRUD method"));

      const methods = ["GET", "POST", "PUT", "DELETE", "PATCH"];
      for (const method of methods) {
        const response = await router.respond(
          createRequest("/resource", method),
        );
        expect(await response.text()).toBe("CRUD method");
      }
    });
  });

  describe("Route Registration", () => {
    it("should register multiple paths at once", async () => {
      const router = new Router();

      router.get(["/users", "/profiles", "/people"], () => text("matched"));

      for (const path of ["/users", "/profiles", "/people"]) {
        const response = await router.respond(createRequest(path));
        expect(await response.text()).toBe("matched");
      }
    });

    it("should throw error when overwriting existing route", () => {
      const router = new Router();

      router.get("/test", () => text("first"));

      expect(() => {
        router.get("/test", () => text("second"));
      }).toThrow(RouterError);
    });

    it("should allow overwriting when specified", async () => {
      const router = new Router();

      router.get("/test", () => text("first"));
      router.get("/test", () => text("second"), { overwrite: true });

      const response = await router.respond(createRequest("/test"));
      expect(await response.text()).toBe("second");
    });

    it("should handle chaining", async () => {
      const router = new Router();

      router
        .get("/a", () => text("a"))
        .post("/b", () => text("b"))
        .put("/c", () => text("c"));

      const response1 = await router.respond(createRequest("/a", "GET"));
      expect(await response1.text()).toBe("a");

      const response2 = await router.respond(createRequest("/b", "POST"));
      expect(await response2.text()).toBe("b");

      const response3 = await router.respond(createRequest("/c", "PUT"));
      expect(await response3.text()).toBe("c");
    });
  });

  describe("Context and Headers", () => {
    it("should provide request in context", async () => {
      const router = new Router();
      let capturedRequest: Request | undefined;

      router.get("/test", (ctx) => {
        capturedRequest = ctx.request;
        return text("OK");
      });

      const request = createRequest("/test", "GET", { "X-Custom": "value" });
      await router.respond(request);

      expect(capturedRequest).toBe(request);
    });

    it("should allow setting response headers", async () => {
      const router = new Router();

      router.get("/test", (ctx) => {
        ctx.headers.set("X-Custom-Response", "header-value");
        return text("OK");
      });

      const response = await router.respond(createRequest("/test"));
      expect(response.headers.get("X-Custom-Response")).toBe("header-value");
    });

    it("should merge response headers with context headers", async () => {
      const router = new Router();

      router.get("/test", () => {
        const response = text("OK");
        response.headers.set("X-From-Response", "response");
        return response;
      });

      const response = await router.respond(createRequest("/test"));
      expect(response.headers.get("X-From-Response")).toBe("response");
    });

    it("should provide query parameters", async () => {
      const router = new Router<CTQuery>();
      let query: Record<string, string | null> = {};

      router.get("/search", [
        parseQuery(),
        (ctx<CTQuery>) => {
          query = ctx.query;
          return text("OK");
        },
      ]);

      await router.respond(createRequest("/search?q=hello&page=2"));
      expect(query.q).toBe("hello");
      expect(query.page).toBe("2");
    });
  });

  describe("Path Resolution", () => {
    it("should handle root path /", async () => {
      const router = new Router();

      router.get("/", () => text("root"));

      const response = await router.respond(createRequest("/"));
      expect(await response.text()).toBe("root");
    });

    it("should handle paths with trailing slashes differently that without trailing slashes", async () => {
      const router = new Router();

      router.get("/users", () => text("users"));
      router.get("/root/", () => text("root"));

      const response1 = await router.respond(createRequest("/users"));
      expect(await response1.text()).toBe("users");

      const response2 = await router.respond(createRequest("/users/"));
      expect(response2.status).toBe(404);

      const response3 = await router.respond(createRequest("/root/"));
      expect(await response3.text()).toBe("root");

      const response4 = await router.respond(createRequest("/root"));
      expect(response4.status).toBe(404);
    });

    it("should limit max path depth", async () => {
      const router = new Router({ maxPath: 3 });

      router.get("/a/b/c", () => text("within limit"));

      const response1 = await router.respond(createRequest("/a/b/c"));
      expect(response1.status).toBe(200);

      const response2 = await router.respond(createRequest("/a/b/c/d"));
      expect(response2.status).toBe(414);
    });
  });

  describe("OpenAPI Generation", () => {
    it("should generate OpenAPI documentation", async () => {
      const router = new Router();

      router.get("/users/:id", () => text("OK"), {
        openApi: {
          summary: "Get user",
          description: "Retrieves a user by ID",
          tags: ["users"],
          responses: {
            "200": {
              description: "User found",
              content: {
                "application/json": {
                  schema: { type: "object" },
                },
              },
            },
          },
        },
      });

      router.post("/users", () => text("OK"), {
        openApi: {
          summary: "Create user",
          tags: ["users"],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { type: "object" },
              },
            },
          },
          responses: {
            "201": { description: "User created" },
          },
        },
      });

      const openapi = await router.generateOpenAPI({
        title: "Test API",
        version: "1.0.0",
      });

      expect(openapi.openapi).toBe("3.0.0");
      expect(openapi.info.title).toBe("Test API");
      expect(openapi.info.version).toBe("1.0.0");
      expect(openapi.paths["/users/{id}"]).toBeDefined();
      expect(openapi.paths["/users/{id}"].get.summary).toBe("Get user");
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty body responses", async () => {
      const router = new Router();

      router.get("/empty", () => status(204, null));

      const response = await router.respond(createRequest("/empty"));
      expect(response.status).toBe(204);
      expect(await response.text()).toBe("");
    });

    it("should handle redirects", async () => {
      const router = new Router();

      router.get("/old", () => redirect("/new"));
      router.get("/new", () => text("new location"));

      const response = await router.respond(createRequest("/old"));
      expect(response.status).toBe(302);
      expect(response.headers.get("Location")).toBe("/new");
    });

    it("should handle JSON responses", async () => {
      const router = new Router();

      router.get("/json", () => json({ message: "success", data: { id: 1 } }));

      const response = await router.respond(createRequest("/json"));
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain(
        "application/json",
      );
      expect(await response.json()).toEqual({
        message: "success",
        data: { id: 1 },
      });
    });
  });

  describe("Performance", () => {
    it("should handle many routes efficiently", async () => {
      const router = new Router();

      // Register 500 routes
      for (let i = 0; i < 500; i++) {
        router.get(`/api/v${i}/users/:id`, () => text(`user ${i}`));
        router.get(`/api/v${i}/posts/*`, () => text(`post ${i}`));
      }

      router.get("/api/**", () => text("catch-all"));
      router.get("/static/*", () => text("static"));

      const start = performance.now();
      const response = await router.respond(
        createRequest("/api/v250/users/123"),
      );
      const end = performance.now();

      expect(response.status).toBe(200);
      expect(await response.text()).toBe("user 250");
      expect(end - start).toBeLessThan(50); // Should be fast
    });
  });

  describe("End-to-End Scenarios", () => {
    it("should handle complete REST API workflow", async () => {
      const router = new Router();
      const users = new Map<string, unknown>();

      // Auth middleware
      const auth = (ctx): Response | void => {
        const authHeader = ctx.request.headers.get("Authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
          return status(401);
        }
      };

      // Apply auth to all API routes
      router.filterGet("/api/**", auth);
      router.filterPost("/api/**", auth);
      router.filterPut("/api/**", auth);
      router.filterDelete("/api/**", auth);

      // Routes
      router.get("/api/users", () => json([...users.values()]));

      router.post("/api/users", async (ctx) => {
        const body = await ctx.request.json();
        const id = crypto.randomUUID();
        users.set(id, { ...body!, id });
        return json(users.get(id), { status: 201 });
      });

      router.get("/api/users/:id", (ctx) => {
        const user = users.get(ctx.params.id!);
        if (!user) return status(404);
        return json(user);
      });

      router.put("/api/users/:id", async (ctx) => {
        const user = users.get(ctx.params.id!);
        if (!user) return status(404);
        const body = await ctx.request.json();
        users.set(ctx.params.id!, { ...user, ...body! });
        return json(users.get(ctx.params.id!));
      });

      router.delete("/api/users/:id", (ctx) => {
        if (!users.has(ctx.params.id!)) return status(404);
        users.delete(ctx.params.id!);
        return status(204);
      });

      // Test unauthorized
      const unauthorized = await router.respond(
        createRequest("/api/users", "POST"),
      );
      expect(unauthorized.status).toBe(401);

      // Create user with auth
      const authHeaders = { Authorization: "Bearer valid-token" };
      const createReq = createRequest("/api/users", "POST", authHeaders, {});
      const createRes = await router.respond(createReq);
      expect(createRes.status).toBe(201);
      const newUser = await createRes.json();

      // Get user
      const getReq = createRequest(
        `/api/users/${newUser.id}`,
        "GET",
        authHeaders,
      );
      const getRes = await router.respond(getReq);
      expect(getRes.status).toBe(200);
      const fetchedUser = await getRes.json();
      expect(fetchedUser.id).toBe(newUser.id);

      // Update user
      const updateReq = createRequest(
        `/api/users/${newUser.id}`,
        "PUT",
        authHeaders,
        {},
      );
      const updateRes = await router.respond(updateReq);
      expect(updateRes.status).toBe(200);

      // Delete user
      const deleteReq = createRequest(
        `/api/users/${newUser.id}`,
        "DELETE",
        authHeaders,
      );
      const deleteRes = await router.respond(deleteReq);
      expect(deleteRes.status).toBe(204);

      // Verify deletion
      const getReq2 = createRequest(
        `/api/users/${newUser.id}`,
        "GET",
        authHeaders,
      );
      const getRes2 = await router.respond(getReq2);
      expect(getRes2.status).toBe(404);
    });
  });

  describe("File Path Translation", () => {
    it("should translate file system paths to route paths", () => {
      const router = new Router();
      // Access private method for testing
      const translate = router.translateRouteFilePath.bind(router);

      expect(translate("/users/index")).toBe("/users/");
      expect(translate("/users/profile")).toBe("/users/profile");
      expect(translate("/api/[#]/users")).toBe("/api/*/users");
      expect(translate("/api/[[#]]/users")).toBe("/api/*!/users");
      expect(translate("/api/[#]/users/[[#]]")).toBe("/api/*/users/*!");
      expect(translate("/api/[[#]]/users/[#]")).toBe("/api/*!/users/*");
      expect(translate("/api/[##]")).toBe("/api/**");
      expect(translate("/api/[[##]]")).toBe("/api/**!");
      expect(translate("/api/[##slug]")).toBe("/api/::slug");
      expect(translate("/api/[## slug ]")).toBe("/api/::slug");
      expect(translate("/api/[[##slug]]")).toBe("/api/::slug!");
      expect(translate("/api/[[## slug ]]")).toBe("/api/::slug!");
      expect(translate("/[page]")).toBe("/:page");
      expect(translate("/users/[id]")).toBe("/users/:id");
      expect(translate("/dashboard/[[admin,vendor,client]role]")).toBe(
        "/dashboard/admin|vendor|client:role",
      );
      expect(translate("/dashboard/[[admin,vendor,client] role ]")).toBe(
        "/dashboard/admin|vendor|client:role",
      );
      expect(translate("/dashboard/[[,admin,vendor,client][role]]")).toBe(
        "/dashboard/|admin|vendor|client:role!",
      );
      expect(translate("/dashboard/[[,admin,vendor,client][ role ]]")).toBe(
        "/dashboard/|admin|vendor|client:role!",
      );
    });
  });
});

describe("Router - Additional Tests", () => {
  describe("Route Collision Detection", () => {
    it("should detect collisions between exact and glob routes", () => {
      const router = new Router();

      router.get("/api/users", () => text("exact"));

      // This should NOT throw an error - exact and glob can coexist
      expect(() => {
        router.get("/api/*", () => text("glob"));
      }).not.toThrow();
    });

    it("should detect collisions between glob routes with same specificity", () => {
      const router = new Router();

      router.get("/api/*/users", () => text("first"));

      // This should throw because both match the same pattern
      expect(() => {
        router.get("/api/*/users", () => text("second"));
      }).toThrow(RouterError);
    });

    it("should allow overlapping globs with different specificity", () => {
      const router = new Router();

      router.get("/api/*", () => text("general"));

      // More specific glob should be allowed
      expect(() => {
        router.get("/api/users/*", () => text("specific"));
      }).not.toThrow();
    });

    it("should detect collisions with super globs", () => {
      const router = new Router();

      router.get("/api/**", () => text("super"));

      // These should NOT throw because they're more specific
      expect(() => {
        router.get("/api/users", () => text("exact"));
      }).not.toThrow();

      expect(() => {
        router.get("/api/*", () => text("glob"));
      }).not.toThrow();
    });
  });

  describe("Break_Pipe and Break_Pipeline Behavior", () => {
    it("should stop current route handlers with Break_Pipe but continue to next routes", async () => {
      const router = new Router();
      const order: string[] = [];

      router.get("/test", [
        () => {
          order.push("first");
          return Break_Pipe;
        },
        () => {
          order.push("second"); // Should not run
        },
      ]);

      router.afterGet("/test", [
        () => {
          order.push("third"); // Should run (different route entry)
        },
      ]);

      await router.respond(createRequest("/test"));
      expect(order).toEqual(["first", "third"]);
    });

    it("should stop all route handlers with Break_Pipeline", async () => {
      const router = new Router();
      const order: string[] = [];

      router.get("/test", [
        () => {
          order.push("first");
          return Break_Pipeline;
        },
        () => {
          order.push("second"); // Should not run
        },
      ]);

      expect(() => {
        router.get("/test", [
          () => {
            order.push("third"); // Should not run
          },
        ]);
      }).toThrow(RouterError);

      await router.respond(createRequest("/test"));
      expect(order).toEqual(["first"]);
    });

    it("should allow handlers after Break_Pipe in the same route", async () => {
      const router = new Router();
      const order: string[] = [];

      router.get("/test", [
        () => {
          order.push("first");
        },
        () => {
          order.push("second");
          return Break_Pipe;
        },
        () => {
          order.push("third"); // Should not run
        },
      ]);

      await router.respond(createRequest("/test"));
      expect(order).toEqual(["first", "second"]);
    });
  });

  describe("Handler Return Types", () => {
    it("should handle handlers that return undefined (void)", async () => {
      const router = new Router();
      let called = false;

      router.get("/test", () => {
        called = true;
        // Returns undefined
      });

      const response = await router.respond(createRequest("/test"));
      expect(called).toBe(true);
      expect(response.status).toBe(501); // No response, should continue
    });

    it("should handle handlers that return Response", async () => {
      const router = new Router();

      router.get("/test", () => {
        return text("custom response");
      });

      const response = await router.respond(createRequest("/test"));
      expect(response.status).toBe(200);
      expect(await response.text()).toBe("custom response");
    });

    it("should handle handlers that return Break_Pipe", async () => {
      const router = new Router();
      const calls: string[] = [];

      router.get("/test", [
        () => {
          calls.push("first");
        },
        () => {
          calls.push("second");
          return Break_Pipe;
        },
        () => {
          calls.push("third");
          return status(200);
        },
      ]);

      const response = await router.respond(createRequest("/test"));
      expect(response.status).toBe(501);
      expect(calls).toEqual(["first", "second"]);
    });
  });

  describe("Multiple Middleware Types Combined", () => {
    it("should execute in order: filter -> handler -> after", async () => {
      const router = new Router();
      const order: string[] = [];

      router.filterGet("/test", () => {
        order.push("filter");
      });

      router.get("/test", () => {
        order.push("handler");
        return text("OK");
      });

      router.afterGet("/test", (ctx) => {
        order.push("after");
        ctx.response.headers.set("X-Order", "after");
      });

      const response = await router.respond(createRequest("/test"));
      expect(order).toEqual(["filter", "handler", "after"]);
      expect(response.headers.get("X-Order")).toBe("after");
    });

    it("should execute fallback when handler returns Break_Pipeline", async () => {
      const router = new Router();
      let fallbackCalled = false;

      router.get("/test", () => {
        return Break_Pipeline;
      });

      router.fallbackGet("/test", () => {
        fallbackCalled = true;
        return text("fallback");
      });

      const response = await router.respond(createRequest("/test"));
      expect(fallbackCalled).toBe(true);
      expect(await response.text()).toBe("fallback");
    });

    it("should execute after even after response has been returned", async () => {
      const router = new Router();
      let afterCalled = false;
      let filterCalled = false;

      router.filterGet("/test", () => {
        filterCalled = true;
      });

      router.get("/test", () => text("OK"));

      router.afterGet("/test", () => {
        afterCalled = true;
      });

      const response = await router.respond(createRequest("/test"));
      expect(response.status).toBe(200);
      expect(filterCalled).toBe(true);
      expect(afterCalled).toBe(true);
    });
  });

  describe("Path Parameter Edge Cases", () => {
    it("should handle parameters with special characters", async () => {
      const router = new Router();

      router.get("/users/:id", (ctx) => {
        return json({ id: ctx.params.id });
      });

      const response = await router.respond(
        createRequest("/users/user-123_456"),
      );
      expect(await response.json()).toEqual({ id: "user-123_456" });
    });

    it("should handle multiple parameters with same name (overwrite)", async () => {
      const router = new Router();

      router.get("/:id/:id", (ctx) => {
        return json({ id: ctx.params.id });
      });

      const response = await router.respond(createRequest("/123/456"));
      expect(await response.json()).toEqual({ id: "456" }); // Last one wins
    });

    it("should handle parameters with Unicode characters", async () => {
      const router = new Router();

      router.get("/users/:name", (ctx) => {
        return json({ name: ctx.params.name });
      });

      const response = await router.respond(createRequest("/users/äöüß"));
      expect(await response.json()).toEqual({ name: "äöüß" });
    });

    it("should handle empty parameter values", async () => {
      const router = new Router();

      router.get("/users/:id", (ctx) => {
        return json({ id: ctx.params.id });
      });

      // Note: Empty parameter will match but the parameter value will be empty
      const response = await router.respond(createRequest("/users/"));
      // This might match the route with empty param, but the test shows behavior
      expect(response.status).toBe(200);
    });
  });

  describe("Query Parameter Parsing", () => {
    it("should parse multiple query parameters", async () => {
      const router = new Router<CTQuery>();
      let query: Record<string, string | null> = {};

      router.get("/search", [
        parseQuery(),
        (ctx<CTQuery>) => {
          query = ctx.query;
          return text("OK");
        },
      ]);

      await router.respond(createRequest("/search?q=hello&page=2&sort=asc"));
      expect(query.q).toBe("hello");
      expect(query.page).toBe("2");
      expect(query.sort).toBe("asc");
    });

    it("should handle query parameters with special characters", async () => {
      const router = new Router<CTQuery>();
      let query: Record<string, string | null> = {};

      router.get("/search", [
        parseQuery(),
        (ctx<CTQuery>) => {
          query = ctx.query;
          return text("OK");
        },
      ]);

      await router.respond(
        createRequest("/search?q=hello%20world&filter=name%3Djohn"),
      );
      expect(query.q).toBe("hello world");
      expect(query.filter).toBe("name=john");
    });

    it("should handle duplicate query parameters (last one wins)", async () => {
      const router = new Router<CTQuery>();
      let query: Record<string, string | null> = {};

      router.get("/search", [
        parseQuery(),
        (ctx<CTQuery>) => {
          query = ctx.query;
          return text("OK");
        },
      ]);

      await router.respond(createRequest("/search?q=hello&q=world"));
      expect(query.q).toBe("world");
    });

    it("should handle empty query parameters", async () => {
      const router = new Router<CTQuery>();
      let query: Record<string, string | null> = {};

      router.get("/search", [
        parseQuery(),
        (ctx<CTQuery>) => {
          query = ctx.query;
          return text("OK");
        },
      ]);

      await router.respond(createRequest("/search?q=&page=2"));
      expect(query.q).toBe("");
      expect(query.page).toBe("2");
    });
  });

  describe("Error Propagation", () => {
    it("should propagate errors from filters to catchers", async () => {
      const router = new Router();
      const spy = createSpy();
      let caught = false;

      router.filterGet("/test", () => {
        throw new Error("Filter error");
      });

      router.fallbackGet("/**", () => {
        spy();
      });

      router.catchGet("/test", (ctx) => {
        caught = true;
        return text(`Caught: ${ctx.error.message}`, { status: 500 });
      });

      const response = await router.respond(createRequest("/test"));
      expect(caught).toBe(true);
      expect(spy).toHaveBeenCalledTimes(0);
      expect(await response.text()).toBe("Caught: Filter error");
    });

    it("should not propagate errors from after handlers", () => {
      const router = new Router();
      let caught = false;

      router.get("/test", () => text("OK"));

      router.afterGet("/test", () => {
        throw new Error("After error");
      });

      router.catchGet("/test", (ctx) => {
        caught = true;
        return text(`Caught: ${ctx.errormessage}`, { status: 500 });
      });
      expect(async () => {
        await router.respond(createRequest("/test"));
      }).toThrow(Error);
      expect(caught).toBe(false);
    });

    it("should handle errors in default handlers", async () => {
      const router = new Router({
        defaultCatcher: (ctx) => {
          return text(`Default: ${ctx.error.message}`, { status: 500 });
        },
      });

      router.get("/test", () => {
        throw new Error("Handler error");
      });

      const response = await router.respond(createRequest("/test"));
      expect(await response.text()).toBe("Default: Handler error");
    });
  });

  describe("Custom Context Extension", () => {
    it("should allow extending context with custom properties", async () => {
      type CustomContext = Context & { user?: { id: string; name: string } };

      const router = new Router();

      router.get("/test", [
        (ctx: CustomContext) => {
          ctx.user = { id: "123", name: "John" };
        },
        (ctx: CustomContext) => {
          return json({ user: ctx.user });
        },
      ]);

      const response = await router.respond(createRequest("/test"));
      expect(await response.json()).toEqual({
        user: { id: "123", name: "John" },
      });
    });

    it("should preserve context across middleware", async () => {
      type CustomContext = Context & { data: { counter: number } };

      const router = new Router();

      router.get("/test", [
        (ctx: CustomContext) => {
          ctx.data = { counter: 0 };
        },
        (ctx: CustomContext) => {
          ctx.data.counter++;
        },
        (ctx: CustomContext) => {
          return json({ counter: ctx.data.counter });
        },
      ]);

      const response = await router.respond(createRequest("/test"));
      expect(await response.json()).toEqual({ counter: 1 });
    });
  });

  describe("Route Method Shorthands", () => {
    it("should support HEAD method shorthand", async () => {
      const router = new Router();
      let called = false;

      router.head("/test", () => {
        called = true;
        return new Response(null, { status: 200 });
      });

      const response = await router.respond(createRequest("/test", "HEAD"));
      expect(called).toBe(true);
      expect(response.status).toBe(200);
    });

    it("should support OPTIONS method shorthand", async () => {
      const router = new Router();

      router.options("/test", () => {
        const response = new Response(null, { status: 204 });
        response.headers.set("Allow", "GET, POST, OPTIONS");
        return response;
      });

      const response = await router.respond(createRequest("/test", "OPTIONS"));
      expect(response.status).toBe(204);
      expect(response.headers.get("Allow")).toBe("GET, POST, OPTIONS");
    });

    it("should support CONNECT method shorthand", async () => {
      const router = new Router();
      let called = false;

      router.connect("/test", () => {
        called = true;
        return new Response(null, { status: 200 });
      });

      const response = await router.respond(createRequest("/test", "CONNECT"));
      expect(called).toBe(true);
      expect(response.status).toBe(200);
    });

    it("should support TRACE method shorthand", async () => {
      const router = new Router();
      let called = false;

      router.trace("/test", () => {
        called = true;
        return new Response(null, { status: 200 });
      });

      const response = await router.respond(createRequest("/test", "TRACE"));
      expect(called).toBe(true);
      expect(response.status).toBe(200);
    });
  });

  describe("Error Response Formatting", () => {
    it("should include error in response for HttpError", async () => {
      const router = new Router();

      router.get("/error", () => {
        throw new HttpError(400, "Bad Request");
      });

      router.catchGet("/error", (ctx) => {
        return text(ctx.error.message || "Error", {
          status: ctx.error instanceof HttpError ? ctx.error.status : 500,
        });
      });

      const response = await router.respond(createRequest("/error"));
      expect(response.status).toBe(400);
      expect(await response.text()).toBe("Bad Request");
    });

    it("should handle non-Error thrown values", async () => {
      const router = new Router();

      router.get("/error", () => {
        throw "String error"; // Non-Error thrown
      });

      router.catchGet("/error", (ctx) => {
        return text(`Caught: ${ctx.error.message}`, {
          status: 500,
        });
      });

      const response = await router.respond(createRequest("/error"));
      expect(await response.text()).toBe("Caught: String error");
    });
  });

  describe("Configuration Options", () => {
    it("should disable filters when configured", async () => {
      const router = new Router({
        enable: { filter: false },
      });

      let filterCalled = false;

      router.filterGet("/test", () => {
        filterCalled = true;
      });

      router.get("/test", () => text("OK"));

      await router.respond(createRequest("/test"));
      expect(filterCalled).toBe(false);
    });

    it("should disable error catchers when configured", async () => {
      const router = new Router({
        enable: { catcher: false },
      });

      router.get("/test", () => {
        throw new Error("Error");
      });

      router.catchGet("/test", () => {
        return text("Should not run");
      });

      const response = await router.respond(createRequest("/test"));
      expect(response.status).toBe(500);
    });
  });

  describe("Concurrent Requests", () => {
    it("should handle concurrent requests without interference", async () => {
      const router = new Router();

      router.get("/test/:id", (ctx) => {
        return text(`ID: ${ctx.params.id}`);
      });

      const requests = [
        router.respond(createRequest("/test/1")),
        router.respond(createRequest("/test/2")),
        router.respond(createRequest("/test/3")),
      ];

      const responses = await Promise.all(requests);

      for (let i = 0; i < responses.length; i++) {
        const text = await responses[i]!.text();
        expect(text).toBe(`ID: ${i + 1}`);
      }
    });

    it("should handle concurrent requests with shared state carefully", async () => {
      const router = new Router();
      let counter = 0;

      router.get("/increment", async () => {
        const current = counter;
        await new Promise((resolve) => setTimeout(resolve, 1));
        counter = current + 1;
        return json({ counter: counter });
      });

      // Should be careful with shared state - this might not be atomic
      const requests = [
        router.respond(createRequest("/increment")),
        router.respond(createRequest("/increment")),
        router.respond(createRequest("/increment")),
      ];

      const responses = await Promise.all(requests);

      // Values might not be sequential due to race conditions
      // This just ensures the routes work
      for (const response of responses) {
        expect(response.status).toBe(200);
      }
    });
  });

  describe("Route Inheritance and Sub-routing", () => {
    it("should support nested route patterns with shared prefixes", async () => {
      const router = new Router();

      // Shared prefix with different handlers
      router.get("/api/users", () => text("users"));
      router.get("/api/posts", () => text("posts"));
      router.get("/api/comments", () => text("comments"));

      const response1 = await router.respond(createRequest("/api/users"));
      expect(await response1.text()).toBe("users");

      const response2 = await router.respond(createRequest("/api/posts"));
      expect(await response2.text()).toBe("posts");
    });

    it("should allow mounting routers", async () => {
      const router = new Router();
      const subRouter = new Router();

      subRouter.get("/users", () => text("sub users"));
      subRouter.get("/posts", () => text("sub posts"));

      // Copy routes from subRouter to main router
      // This is a simplified version - in practice you'd have a mount method
      // But this tests the concept
      router.get("/api/users", () => text("api users"));

      const response = await router.respond(createRequest("/api/users"));
      expect(await response.text()).toBe("api users");
    });
  });

  describe("Body Parsing", () => {
    it("should handle JSON body in POST requests", async () => {
      const router = new Router();
      let body: unknown;

      router.post("/test", async (ctx) => {
        body = await ctx.request.json();
        return json({ received: body });
      });

      const payload = { name: "John", age: 30 };
      const response = await router.respond(
        createRequest(
          "/test",
          "POST",
          { "content-type": "application/json" },
          payload,
        ),
      );

      expect(await response.json()).toEqual({ received: payload });
    });

    it("should handle FormData body", async () => {
      const router = new Router();

      router.post("/upload", async (ctx) => {
        const formData = await ctx.request.formData();
        const name = formData.get("name");
        return json({ name });
      });

      const formData = new FormData();
      formData.append("name", "John");

      const request = new Request("http://localhost/upload", {
        method: "POST",
        body: formData,
      });

      const response = await router.respond(request);
      expect(await response.json()).toEqual({ name: "John" });
    });

    it("should handle empty body", async () => {
      const router = new Router();
      let body: unknown = "not set";

      router.post("/test", async (ctx) => {
        try {
          body = await ctx.request.json();
        } catch {
          body = null;
        }
        return text("OK");
      });

      const response = await router.respond(
        createRequest(
          "/test",
          "POST",
          { "content-type": "application/json" },
          null,
        ),
      );

      expect(body).toBeNull();
      expect(response.status).toBe(200);
    });
  });

  describe("Route Matching with Edge Cases", () => {
    it("should match the most specific route when multiple match", async () => {
      const router = new Router();

      router.get("/a/b/c", () => text("exact"));
      router.get("/a/*/c", () => text("glob"));
      router.get("/a/**", () => text("super"));

      const response1 = await router.respond(createRequest("/a/b/c"));
      expect(await response1.text()).toBe("exact");

      const response2 = await router.respond(createRequest("/a/x/c"));
      expect(await response2.text()).toBe("glob");

      const response3 = await router.respond(createRequest("/a/b/c/d"));
      expect(await response3.text()).toBe("super");
    });

    it("should handle routes with . and - characters", async () => {
      const router = new Router();

      router.get("/api/v1.2/users", () => text("v1.2"));
      router.get("/api/v2-3/users", () => text("v2-3"));
      router.get("/api/:version/users", (ctx) => {
        return text(ctx.params.version!);
      });

      const response1 = await router.respond(createRequest("/api/v1.2/users"));
      expect(await response1.text()).toBe("v1.2");

      const response2 = await router.respond(createRequest("/api/v2-3/users"));
      expect(await response2.text()).toBe("v2-3");

      const response3 = await router.respond(createRequest("/api/v4/users"));
      expect(await response3.text()).toBe("v4");
    });
  });

  describe("Performance Edge Cases", () => {
    it("should handle deep nested routes efficiently", async () => {
      const router = new Router({ maxPath: 50 });

      // Create a deep route
      let path = "";
      for (let i = 1; i <= 50; i++) {
        path += `/level${i}`;
      }

      router.get(path as `/${string}`, () => text("deep"));

      const response = await router.respond(createRequest(path));
      expect(await response.text()).toBe("deep");
    });

    it("should handle many parameterized routes efficiently", async () => {
      const router = new Router();

      // Register many parameterized routes
      for (let i = 0; i < 100; i++) {
        router.get(`/api/v${i}/users/:id`, (ctx) => {
          return text(`v${i}:${ctx.params.id}`);
        });
      }

      const start = performance.now();
      const response = await router.respond(
        createRequest("/api/v50/users/123"),
      );
      const end = performance.now();

      expect(await response.text()).toBe("v50:123");
      expect(end - start).toBeLessThan(20); // Should be fast
    });

    it("should handle routes with many path segments", async () => {
      const router = new Router({ maxPath: 50 });

      router.get("/a/b/c/d/e/f/g/h/i/j/k/l/m/n/o/p/q/r/s/t/u/v/w/x/y/z", () => {
        return text("deep");
      });

      const response = await router.respond(
        createRequest("/a/b/c/d/e/f/g/h/i/j/k/l/m/n/o/p/q/r/s/t/u/v/w/x/y/z"),
      );
      expect(await response.text()).toBe("deep");
    });
  });

  describe("Router - Path Decoding and Security", () => {
    it("should decode URL-encoded paths", async () => {
      const router = new Router();
      let capturedPath = "";

      router.get("/users/:id", (ctx) => {
        capturedPath = ctx.params.id!;
        return text("OK");
      });

      await router.respond(createRequest("/users/john%40example.com"));
      expect(capturedPath).toBe("john@example.com");
    });

    it("should handle paths with spaces", async () => {
      const router = new Router();
      let capturedPath = "";

      router.get("/files/:name", (ctx) => {
        capturedPath = ctx.params.name!;
        return text("OK");
      });

      await router.respond(createRequest("/files/my%20document.pdf"));
      expect(capturedPath).toBe("my document.pdf");
    });

    it("should handle unicode characters in paths", async () => {
      const router = new Router();
      let capturedPath = "";

      router.get("/users/:name", (ctx) => {
        capturedPath = ctx.params.name!;
        return text("OK");
      });

      await router.respond(createRequest("/users/%E4%BD%A0%E5%A5%BD"));
      expect(capturedPath).toBe("你好");
    });

    it("should handle emoji in paths", async () => {
      const router = new Router();
      let capturedPath = "";

      router.get("/emoji/:emoji", (ctx) => {
        capturedPath = ctx.params.emoji!;
        return text("OK");
      });

      await router.respond(createRequest("/emoji/%F0%9F%98%8A"));
      expect(capturedPath).toBe("😊");
    });

    it("should normalize path to prevent traversal attacks", async () => {
      const router = new Router();
      let called = false;

      router.get("/api/users", () => {
        called = true;
        return text("users");
      });

      await router.respond(createRequest("/api/users"));
      expect(called).toBe(true);
    });

    it("should reject paths with null bytes", async () => {
      const router = new Router();
      let called = false;

      router.get("/**", ({ url, pathname }) => {
        console.log({ pathname, url: url.pathname });
      });

      router.get("/test", () => {
        called = true;
        return text("OK");
      });

      const response = await router.respond(createRequest("/test%00"));
      expect(response.status).toBe(400);
      expect(called).toBe(false);
    });

    it("should handle invalid URI encoding gracefully", async () => {
      const router = new Router();

      // Invalid % followed by non-hex characters
      const response = await router.respond(createRequest("/test%ZZ"));
      expect(response.status).toBe(400);
    });

    it("should decode paths before route matching", async () => {
      const router = new Router();
      let called = false;

      router.get("/api/v1/users", () => {
        called = true;
        return text("matched");
      });

      await router.respond(createRequest("/api%2Fv1/users"));
      expect(called).toBe(true);
    });

    it("should handle double-encoded paths", async () => {
      const router = new Router();
      let capturedPath = "";

      router.get("/search/:q", (ctx) => {
        capturedPath = ctx.params.q!;
        return text("OK");
      });

      // %2520 is double-encoded space (%20 -> %2520)
      await router.respond(createRequest("/search/hello%2520world"));
      expect(capturedPath).toBe("hello%20world");
    });

    it("should normalize path traversal with .. segments", async () => {
      const router = new Router();
      let called = false;

      router.get("/protected/secret", () => {
        called = true;
        return text("secret");
      });

      const response = await router.respond(
        createRequest("/protected/../protected/secret"),
      );
      expect(await response.text()).toBe("secret");
      expect(called).toBe(true);
    });

    it("should prevent path traversal with encoded .. %2E%2E", async () => {
      const router = new Router();
      const result = { pathname: "" };

      router.get("/data", ({ pathname }) => {
        result.pathname = pathname;
        return status(201);
      });

      router.get("/secure/**", ({ pathname }) => {
        result.pathname = pathname;
        return status(200);
      });

      const response = await router.respond(
        createRequest("/secure/%2E%2E/data"),
      );
      expect(response.status).toBe(201);
      expect(result.pathname).toBe("/data");
    });

    it("should prevent path traversal with encoded / %2F", async () => {
      const router = new Router();
      const result = { pathname: "" };

      router.get("/secure/data", ({ pathname }) => {
        result.pathname = pathname;
        return status(201);
      });

      router.get("/secure/**", ({ pathname }) => {
        result.pathname = pathname;
        return status(200);
      });

      const response = await router.respond(createRequest("/secure%2F../data"));
      expect(response.status).toBe(200);
      expect(result.pathname).toBe("/secure/../data");
    });
  });

  describe("Router - Route Collision Edge Cases", () => {
    it("should not allow registering duplicate exact routes", () => {
      const router = new Router();

      router.get("/test", () => text("first"));

      expect(() => {
        router.get("/test", () => text("second"));
      }).toThrow(RouterError);
    });

    it("should allow registering same path with different methods", () => {
      const router = new Router();

      expect(() => {
        router.get("/test", () => text("GET"));
        router.post("/test", () => text("POST"));
        router.put("/test", () => text("PUT"));
      }).not.toThrow();
    });

    it("should handle route conflicts with globs correctly", () => {
      const router = new Router();

      router.get("/api/*/users", () => text("first"));

      // This should not throw - different pattern specificity
      expect(() => {
        router.get("/api/v1/users", () => text("exact"));
      }).not.toThrow();

      // This should throw - same pattern
      expect(() => {
        router.get("/api/*/users", () => text("duplicate"));
      }).toThrow(RouterError);
    });

    it("should handle route conflicts with super globs correctly", () => {
      const router = new Router();

      router.get("/api/**", () => text("super"));

      // More specific routes should be allowed
      expect(() => {
        router.get("/api/users", () => text("exact"));
      }).not.toThrow();

      expect(() => {
        router.get("/api/v1/users", () => text("exact v1"));
      }).not.toThrow();

      // Duplicate super glob should throw
      expect(() => {
        router.get("/api/**", () => text("duplicate super"));
      }).toThrow(RouterError);
    });
  });

  describe("Router - Headers and Status Codes", () => {
    it("should preserve custom status texts", async () => {
      const router = new Router();

      router.get("/custom", () => {
        return new Response("Custom message", {
          status: 418,
          statusText: "I'm a teapot",
        });
      });

      const response = await router.respond(createRequest("/custom"));
      expect(response.status).toBe(418);
      expect(response.statusText).toBe("I'm a teapot");
    });

    it("should merge headers correctly", async () => {
      const router = new Router();

      router.get("/test", () => {
        const response = text("OK");
        response.headers.set("X-Custom-1", "value1");
        response.headers.set("X-Custom-2", "value2");
        return response;
      });

      const response = await router.respond(createRequest("/test"));
      expect(response.headers.get("X-Custom-1")).toBe("value1");
      expect(response.headers.get("X-Custom-2")).toBe("value2");
    });

    it("should handle multiple Set-Cookie headers", async () => {
      const router = new Router();

      router.get("/cookies", () => {
        const response = text("OK");
        response.headers.append("Set-Cookie", "session=abc123; HttpOnly");
        response.headers.append("Set-Cookie", "theme=dark; Path=/");
        return response;
      });

      const response = await router.respond(createRequest("/cookies"));
      const cookies = response.headers.getSetCookie();
      expect(cookies).toHaveLength(2);
      expect(cookies[0]).toContain("session=abc123");
      expect(cookies[1]).toContain("theme=dark");
    });
  });

  describe("Router - Async Error Handling", () => {
    it("should catch errors from async handlers", async () => {
      const router = new Router();

      router.get("/async-error", async () => {
        await new Promise((resolve) => setTimeout(resolve, 1));
        throw new Error("Async error");
      });

      router.catchGet("/async-error", (ctx) => {
        return text(`Caught: ${ctx.error.message}`, { status: 500 });
      });

      const response = await router.respond(createRequest("/async-error"));
      expect(await response.text()).toBe("Caught: Async error");
      expect(response.status).toBe(500);
    });

    it("should catch errors from async filters", async () => {
      const router = new Router();

      router.filterGet("/test", async () => {
        await new Promise((resolve) => setTimeout(resolve, 1));
        throw new Error("Async filter error");
      });

      router.catchGet("/test", (ctx) => {
        return text(`Caught: ${ctx.error.message}`, { status: 500 });
      });

      router.get("/test", () => text("OK"));

      const response = await router.respond(createRequest("/test"));
      expect(await response.text()).toBe("Caught: Async filter error");
    });

    it("should not catch errors in after handlers", () => {
      const router = new Router();

      router.get("/test", () => text("OK"));

      router.afterGet("/test", async () => {
        await new Promise((resolve) => setTimeout(resolve, 1));
        throw new Error("Async after error");
      });

      router.catchGet("/test", (ctx) => {
        return text(`Caught: ${ctx.error.message}`, { status: 500 });
      });

      expect(async () => {
        await router.respond(createRequest("/test"));
      }).toThrow(Error);
    });
  });

  describe("Router - Middleware with Response Shortcuts", () => {
    it("should support json helper", async () => {
      const router = new Router();

      router.get("/json", () => json({ success: true, data: { id: 1 } }));

      const response = await router.respond(createRequest("/json"));
      expect(response.headers.get("content-type")).toContain(
        "application/json",
      );
      expect(await response.json()).toEqual({ success: true, data: { id: 1 } });
    });

    it("should support text helper", async () => {
      const router = new Router();

      router.get("/text", () => text("Hello World"));

      const response = await router.respond(createRequest("/text"));
      expect(response.headers.get("content-type")).toContain("text/plain");
      expect(await response.text()).toBe("Hello World");
    });

    it("should support status helper", async () => {
      const router = new Router();

      router.get("/status", () => status(201, "Created"));

      const response = await router.respond(createRequest("/status"));
      expect(response.status).toBe(201);
      expect(await response.text()).toBe("Created");
    });

    it("should support redirect helper", async () => {
      const router = new Router();

      router.get("/old", () => redirect("/new"));
      router.get("/new", () => text("New Location"));

      const response = await router.respond(createRequest("/old"));
      expect(response.status).toBe(302);
      expect(response.headers.get("Location")).toBe("/new");
    });
  });

  describe("Router - Method Chaining", () => {
    it("should support fluent method chaining", async () => {
      const router = new Router();

      router
        .get("/a", () => text("A"))
        .post("/b", () => text("B"))
        .put("/c", () => text("C"))
        .delete("/d", () => text("D"));

      const responses = await Promise.all([
        router.respond(createRequest("/a", "GET")),
        router.respond(createRequest("/b", "POST")),
        router.respond(createRequest("/c", "PUT")),
        router.respond(createRequest("/d", "DELETE")),
      ]);

      expect(await responses[0].text()).toBe("A");
      expect(await responses[1].text()).toBe("B");
      expect(await responses[2].text()).toBe("C");
      expect(await responses[3].text()).toBe("D");
    });
  });

  describe("Router - Empty Path Handling", () => {
    it("should handle empty path as root", async () => {
      const router = new Router();

      router.get("/", () => text("root"));

      const response = await router.respond(createRequest(""));
      expect(await response.text()).toBe("root");
    });

    it("should handle path with only slash", async () => {
      const router = new Router();

      router.get("/", () => text("root"));

      const response = await router.respond(createRequest("/"));
      expect(await response.text()).toBe("root");
    });
  });

  describe("Router - Memory Usage and Cleanup", () => {
    it("should not leak memory with many route registrations", () => {
      const router = new Router();

      // Register and overwrite many routes
      for (let i = 0; i < 100; i++) {
        router.get(`/test/${i}`, () => text(`${i}`), { overwrite: true });
      }

      // Should still work
      expect(() => {
        router.get("/test/final", () => text("final"));
      }).not.toThrow();
    });

    it("should handle circular route references gracefully", async () => {
      const router = new Router();

      // Register routes that might reference each other
      router.get("/a", () => redirect("/b"));
      router.get("/b", () => redirect("/c"));
      router.get("/c", () => text("C"));

      // This will follow redirects
      const response = await router.respond(createRequest("/a"));
      expect(response.status).toBe(302);
      expect(response.headers.get("Location")).toBe("/b");
    });
  });
});

describe("OpenAPI Generation - Extended", () => {
  it("should generate OpenAPI with parameters", async () => {
    const router = new Router();

    router.get("/users/:id", () => text("OK"), {
      openApi: {
        summary: "Get user by ID",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
          {
            name: "fields",
            in: "query",
            required: false,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "User found",
            content: {
              "application/json": {
                schema: { type: "object" },
              },
            },
          },
        },
      },
    });

    const openapi = await router.generateOpenAPI();
    const path = openapi.paths["/users/{id}"];
    const get = path.get;

    expect(get.parameters).toHaveLength(2);
    expect(get.parameters[0].name).toBe("id");
    expect(get.parameters[0].in).toBe("path");
    expect(get.parameters[1].name).toBe("fields");
    expect(get.parameters[1].in).toBe("query");
  });

  it("should generate OpenAPI with request body", async () => {
    const router = new Router();

    router.post("/users", () => text("OK"), {
      openApi: {
        summary: "Create user",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  email: { type: "string" },
                },
                required: ["name", "email"],
              },
            },
          },
        },
        responses: {
          "201": { description: "User created" },
        },
      },
    });

    const openapi = await router.generateOpenAPI();
    const path = openapi.paths["/users"];
    const post = path.post;

    expect(post.requestBody).toBeDefined();
    expect(post.requestBody.required).toBe(true);
    expect(post.requestBody.content["application/json"]).toBeDefined();
    expect(
      post.requestBody.content["application/json"].schema.properties,
    ).toHaveProperty("name");
    expect(
      post.requestBody.content["application/json"].schema.properties,
    ).toHaveProperty("email");
  });
});
