// router.handlers.test.ts
import { describe, it, expect, vi } from "bun:test";
import Router from "../src/router.ts";
import { json, text, status } from "../src/helpers.ts";
import {
  Break_Pipe,
  Break_Pipeline,
  HttpError,
  RouterError,
} from "../src/types.ts";
import type { Context, CTError, CTResponse } from "../src/types.ts";

// Test helpers
const createRequest = (
  path: string,
  method: string = "GET",
  headers: Record<string, string> = {},
): Request => {
  return new Request(`http://localhost${path}`, {
    method,
    headers: new Headers(headers),
  });
};

const createSpy = () => vi.fn();

describe("Router Handler Methods", () => {
  describe("HTTP Method Shorthands", () => {
    it("router.get() should register GET handler", async () => {
      const router = new Router();
      const spy = createSpy();

      router.get("/test", () => {
        spy();
        return text("GET response");
      });

      const response = await router.respond(createRequest("/test", "GET"));
      expect(spy).toHaveBeenCalled();
      expect(await response.text()).toBe("GET response");
    });

    it("router.post() should register POST handler", async () => {
      const router = new Router();
      const spy = createSpy();

      router.post("/test", () => {
        spy();
        return json({ method: "POST" });
      });

      const response = await router.respond(createRequest("/test", "POST"));
      expect(spy).toHaveBeenCalled();
      expect(await response.json()).toEqual({ method: "POST" });
    });

    it("router.put() should register PUT handler", async () => {
      const router = new Router();
      const spy = createSpy();

      router.put("/test", () => {
        spy();
        return json({ method: "PUT" });
      });

      const response = await router.respond(createRequest("/test", "PUT"));
      expect(spy).toHaveBeenCalled();
      expect(await response.json()).toEqual({ method: "PUT" });
    });

    it("router.delete() should register DELETE handler", async () => {
      const router = new Router();
      const spy = createSpy();

      router.delete("/test", () => {
        spy();
        return status(204);
      });

      const response = await router.respond(createRequest("/test", "DELETE"));
      expect(spy).toHaveBeenCalled();
      expect(response.status).toBe(204);
    });

    it("router.patch() should register PATCH handler", async () => {
      const router = new Router();
      const spy = createSpy();

      router.patch("/test", () => {
        spy();
        return json({ method: "PATCH" });
      });

      const response = await router.respond(createRequest("/test", "PATCH"));
      expect(spy).toHaveBeenCalled();
      expect(await response.json()).toEqual({ method: "PATCH" });
    });

    it("router.head() should register HEAD handler", async () => {
      const router = new Router();
      const spy = createSpy();

      router.head("/test", () => {
        spy();
        return new Response(null, { status: 200 });
      });

      const response = await router.respond(createRequest("/test", "HEAD"));
      expect(spy).toHaveBeenCalled();
      expect(response.status).toBe(200);
    });

    it("router.options() should register OPTIONS handler", async () => {
      const router = new Router();
      const spy = createSpy();

      router.options("/test", () => {
        spy();
        const response = new Response(null, { status: 204 });
        response.headers.set("Allow", "GET, POST");
        return response;
      });

      const response = await router.respond(createRequest("/test", "OPTIONS"));
      expect(spy).toHaveBeenCalled();
      expect(response.status).toBe(204);
      expect(response.headers.get("Allow")).toBe("GET, POST");
    });

    it("router.trace() should register TRACE handler", async () => {
      const router = new Router();
      const spy = createSpy();

      router.trace("/test", () => {
        spy();
        return new Response("TRACE response", { status: 200 });
      });

      const response = await router.respond(createRequest("/test", "TRACE"));
      expect(spy).toHaveBeenCalled();
      expect(await response.text()).toBe("TRACE response");
    });

    it("router.connect() should register CONNECT handler", async () => {
      const router = new Router();
      const spy = createSpy();

      router.connect("/test", () => {
        spy();
        return new Response(null, { status: 200 });
      });

      const response = await router.respond(createRequest("/test", "CONNECT"));
      expect(spy).toHaveBeenCalled();
      expect(response.status).toBe(200);
    });
  });

  describe("Generic Handlers", () => {
    it("router.handle() should register handler with method path", async () => {
      const router = new Router();
      const spy = createSpy();

      router.handle("Get /test", () => {
        spy();
        return text("handled");
      });

      const response = await router.respond(createRequest("/test", "GET"));
      expect(spy).toHaveBeenCalled();
      expect(await response.text()).toBe("handled");
    });

    it("router.handle() should register multiple method paths", async () => {
      const router = new Router();
      const spy = createSpy();

      router.handle(["Get /test", "Post /test"], () => {
        spy();
        return text("handled");
      });

      const response1 = await router.respond(createRequest("/test", "GET"));
      expect(spy).toHaveBeenCalledTimes(1);
      expect(await response1.text()).toBe("handled");

      const response2 = await router.respond(createRequest("/test", "POST"));
      expect(spy).toHaveBeenCalledTimes(2);
      expect(await response2.text()).toBe("handled");
    });

    it("router.handle() should support OpenAPI options", async () => {
      const router = new Router();

      router.handle("Get /users", () => text("OK"), {
        openApi: {
          summary: "Get users",
          responses: {
            "200": { description: "OK" },
          },
        },
      });

      const openapi = await router.generateOpenAPI();
      expect(openapi.paths["/users"].get.summary).toBe("Get users");
    });
  });

  describe("Filter Handlers", () => {
    it("router.filter() should register filter", async () => {
      const router = new Router();
      const spy = createSpy();

      router.filter("Get /test", () => {
        spy();
      });

      router.get("/test", () => text("OK"));

      await router.respond(createRequest("/test", "GET"));
      expect(spy).toHaveBeenCalled();
    });

    it("router.filterGet() should register GET filter", async () => {
      const router = new Router();
      const spy = createSpy();

      router.filterGet("/test", () => {
        spy();
      });

      router.get("/test", () => text("OK"));

      await router.respond(createRequest("/test", "GET"));
      expect(spy).toHaveBeenCalled();
    });

    it("router.filterPost() should register POST filter", async () => {
      const router = new Router();
      const spy = createSpy();

      router.filterPost("/test", () => {
        spy();
      });

      router.post("/test", () => text("OK"));

      await router.respond(createRequest("/test", "POST"));
      expect(spy).toHaveBeenCalled();
    });

    it("router.filterAll() should register filter for all methods", async () => {
      const router = new Router();
      const spy = createSpy();

      router.filterAll("/test", () => {
        spy();
      });

      router.all("/test", () => text("OK"));

      const methods = ["GET", "POST", "PUT", "DELETE", "PATCH"];
      for (const method of methods) {
        await router.respond(createRequest("/test", method));
      }
      expect(spy).toHaveBeenCalledTimes(methods.length);
    });

    it("router.filterCrud() should register filter for CRUD methods", async () => {
      const router = new Router();
      const spy = createSpy();

      router.filterCrud("/test", () => {
        spy();
      });

      router.crud("/test", () => text("OK"));

      const methods = ["GET", "POST", "PUT", "DELETE", "PATCH"];
      for (const method of methods) {
        await router.respond(createRequest("/test", method));
      }
      expect(spy).toHaveBeenCalledTimes(methods.length);
    });

    it("router.filterHead() should register HEAD filter", async () => {
      const router = new Router();
      const spy = createSpy();

      router.filterHead("/test", () => {
        spy();
      });

      router.head("/test", () => new Response(null, { status: 200 }));

      await router.respond(createRequest("/test", "HEAD"));
      expect(spy).toHaveBeenCalled();
    });

    it("router.filterOptions() should register OPTIONS filter", async () => {
      const router = new Router();
      const spy = createSpy();

      router.filterOptions("/test", () => {
        spy();
      });

      router.options("/test", () => status(204));

      await router.respond(createRequest("/test", "OPTIONS"));
      expect(spy).toHaveBeenCalled();
    });

    it("router.filterTrace() should register TRACE filter", async () => {
      const router = new Router();
      const spy = createSpy();

      router.filterTrace("/test", () => {
        spy();
      });

      router.trace("/test", () => new Response(null, { status: 200 }));

      await router.respond(createRequest("/test", "TRACE"));
      expect(spy).toHaveBeenCalled();
    });

    it("router.filterConnect() should register CONNECT filter", async () => {
      const router = new Router();
      const spy = createSpy();

      router.filterConnect("/test", () => {
        spy();
      });

      router.connect("/test", () => new Response(null, { status: 200 }));

      await router.respond(createRequest("/test", "CONNECT"));
      expect(spy).toHaveBeenCalled();
    });
  });

  describe("Fallback Handlers", () => {
    it("router.fallback() should register fallback", async () => {
      const router = new Router();
      const spy = createSpy();
      const spy1 = createSpy();

      router.fallbackGet("/test", () => {
        spy();
        return text("fallback");
      });

      router.handleGet("/test", () => {
        spy1();
      });
      const response = await router.respond(createRequest("/test", "GET"));
      expect(spy).toHaveBeenCalled();
      expect(spy1).toHaveBeenCalled();
      expect(await response.text()).toBe("fallback");
    });

    it("router.fallbackGet() should register GET fallback", async () => {
      const router = new Router();
      const spy = createSpy();
      const spy1 = createSpy();

      router.fallbackGet("/test", () => {
        spy();
        return text("fallback");
      });

      router.get("/test", () => {
        spy1();
      });

      const response = await router.respond(createRequest("/test", "GET"));
      expect(spy).toHaveBeenCalled();
      expect(spy1).toHaveBeenCalled();
      expect(await response.text()).toBe("fallback");
    });

    it("router.fallbackAll() should register fallback for all methods", async () => {
      const router = new Router();
      const spy = createSpy();
      const spy1 = createSpy();

      router.fallbackAll("/test", () => {
        spy();
        return text("fallback");
      });

      router.handleAll("/test", () => {
        spy1();
      });

      const methods = ["GET", "POST", "PUT", "DELETE", "PATCH"];
      for (const method of methods) {
        const response = await router.respond(createRequest("/test", method));
        expect(await response.text()).toBe("fallback");
      }
      expect(spy).toHaveBeenCalledTimes(methods.length);
      expect(spy1).toHaveBeenCalledTimes(methods.length);
    });

    it("router.fallbackCrud() should register fallback for CRUD methods", async () => {
      const router = new Router();
      const spy = createSpy();
      const spy1 = createSpy();

      router.fallbackCrud("/test", () => {
        spy();
        return text("fallback");
      });

      router.handleCrud("/test", () => {
        spy1();
      });

      const methods = ["GET", "POST", "PUT", "DELETE", "PATCH"];
      for (const method of methods) {
        const response = await router.respond(createRequest("/test", method));
        expect(await response.text()).toBe("fallback");
      }
      expect(spy).toHaveBeenCalledTimes(methods.length);
      expect(spy1).toHaveBeenCalledTimes(methods.length);
    });
  });

  describe("After Handlers", () => {
    it("router.after() should register after handler", async () => {
      const router = new Router();
      const spy = createSpy();

      router.get("/test", () => text("OK"));

      router.after("Get /test", (ctx: Context<CTResponse>) => {
        spy();
        ctx.response.headers.set("X-After", "true");
      });

      const response = await router.respond(createRequest("/test", "GET"));
      expect(spy).toHaveBeenCalled();
      expect(response.headers.get("X-After")).toBe("true");
    });

    it("router.afterGet() should register GET after handler", async () => {
      const router = new Router();
      const spy = createSpy();

      router.get("/test", () => text("OK"));

      router.afterGet("/test", (ctx: Context<CTResponse>) => {
        spy();
        ctx.response.headers.set("X-After", "true");
      });

      const response = await router.respond(createRequest("/test", "GET"));
      expect(spy).toHaveBeenCalled();
      expect(response.headers.get("X-After")).toBe("true");
    });

    it("router.afterAll() should register after for all methods", async () => {
      const router = new Router();
      const spy = createSpy();

      router.all("/test", () => text("OK"));

      router.afterAll("/test", (ctx: Context<CTResponse>) => {
        spy();
        ctx.response.headers.set("X-After", "true");
      });

      const methods = ["GET", "POST", "PUT", "DELETE", "PATCH"];
      for (const method of methods) {
        const response = await router.respond(createRequest("/test", method));
        expect(response.headers.get("X-After")).toBe("true");
      }
      expect(spy).toHaveBeenCalledTimes(methods.length);
    });

    it("router.afterCrud() should register after for CRUD methods", async () => {
      const router = new Router();
      const spy = createSpy();

      router.crud("/test", () => text("OK"));

      router.afterCrud("/test", (ctx: Context<CTResponse>) => {
        spy();
        ctx.response.headers.set("X-After", "true");
      });

      const methods = ["GET", "POST", "PUT", "DELETE", "PATCH"];
      for (const method of methods) {
        const response = await router.respond(createRequest("/test", method));
        expect(response.headers.get("X-After")).toBe("true");
      }
      expect(spy).toHaveBeenCalledTimes(methods.length);
    });
  });

  describe("Catcher Handlers", () => {
    it("router.catch() should register error catcher", async () => {
      const router = new Router();
      const spy = createSpy();

      router.get("/error", () => {
        throw new Error("Test error");
      });

      router.catch("Get /error", (ctx: Context) => {
        spy();
        return text(`Caught: ${ctx.error?.message}`, { status: 500 });
      });

      const response = await router.respond(createRequest("/error", "GET"));
      expect(spy).toHaveBeenCalled();
      expect(await response.text()).toBe("Caught: Test error");
    });

    it("router.catchGet() should register GET error catcher", async () => {
      const router = new Router();
      const spy = createSpy();

      router.get("/error", () => {
        throw new Error("Test error");
      });

      router.catchGet("/error", (ctx: Context) => {
        spy();
        return text(`Caught: ${ctx.error?.message}`, { status: 500 });
      });

      const response = await router.respond(createRequest("/error", "GET"));
      expect(spy).toHaveBeenCalled();
      expect(await response.text()).toBe("Caught: Test error");
    });

    it("router.catchAll() should register catcher for all methods", async () => {
      const router = new Router();
      const spy = createSpy();

      router.all("/error", () => {
        throw new Error("Test error");
      });

      router.catchAll("/error", (ctx: Context) => {
        spy();
        return text(`Caught: ${ctx.error?.message}`, { status: 500 });
      });

      const methods = ["GET", "POST", "PUT", "DELETE", "PATCH"];
      for (const method of methods) {
        const response = await router.respond(createRequest("/error", method));
        expect(await response.text()).toBe("Caught: Test error");
      }
      expect(spy).toHaveBeenCalledTimes(methods.length);
    });

    it("router.catchCrud() should register catcher for CRUD methods", async () => {
      const router = new Router();
      const spy = createSpy();

      router.crud("/error", () => {
        throw new Error("Test error");
      });

      router.catchCrud("/error", (ctx: Context) => {
        spy();
        return text(`Caught: ${ctx.error?.message}`, { status: 500 });
      });

      const methods = ["GET", "POST", "PUT", "DELETE", "PATCH"];
      for (const method of methods) {
        const response = await router.respond(createRequest("/error", method));
        expect(await response.text()).toBe("Caught: Test error");
      }
      expect(spy).toHaveBeenCalledTimes(methods.length);
    });
  });

  describe("Batch Handlers", () => {
    it("router.all() should register handler for all HTTP methods", async () => {
      const router = new Router();
      const spy = createSpy();

      router.all("/test", () => {
        spy();
        return text("all methods");
      });

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
        expect(await response.text()).toBe("all methods");
      }
      expect(spy).toHaveBeenCalledTimes(methods.length);
    });

    it("router.crud() should register handler for CRUD methods", async () => {
      const router = new Router();
      const spy = createSpy();

      router.crud("/test", () => {
        spy();
        return text("crud method");
      });

      const methods = ["GET", "POST", "PUT", "DELETE", "PATCH"];
      for (const method of methods) {
        const response = await router.respond(createRequest("/test", method));
        expect(await response.text()).toBe("crud method");
      }
      expect(spy).toHaveBeenCalledTimes(methods.length);
    });

    it("router.handleAll() should register handler for all methods", async () => {
      const router = new Router();
      const spy = createSpy();

      router.handleAll("/test", () => {
        spy();
        return text("handled all");
      });

      const methods = ["GET", "POST", "PUT", "DELETE", "PATCH"];
      for (const method of methods) {
        const response = await router.respond(createRequest("/test", method));
        expect(await response.text()).toBe("handled all");
      }
      expect(spy).toHaveBeenCalledTimes(methods.length);
    });

    it("router.handleCrud() should register handler for CRUD methods", async () => {
      const router = new Router();
      const spy = createSpy();

      router.handleCrud("/test", () => {
        spy();
        return text("handled crud");
      });

      const methods = ["GET", "POST", "PUT", "DELETE", "PATCH"];
      for (const method of methods) {
        const response = await router.respond(createRequest("/test", method));
        expect(await response.text()).toBe("handled crud");
      }
      expect(spy).toHaveBeenCalledTimes(methods.length);
    });
  });

  describe("Multiple Paths", () => {
    it("should register handler for multiple paths", async () => {
      const router = new Router();
      const spy = createSpy();

      router.get(["/a", "/b", "/c"], () => {
        spy();
        return text("matched");
      });

      const paths = ["/a", "/b", "/c"];
      for (const path of paths) {
        const response = await router.respond(createRequest(path));
        expect(await response.text()).toBe("matched");
      }
      expect(spy).toHaveBeenCalledTimes(paths.length);
    });
  });

  describe("Pipeline Handlers", () => {
    it("should execute pipeline of handlers in order", async () => {
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

    it("should handle mixed handler types in pipeline", async () => {
      const router = new Router();
      const order: string[] = [];

      router.get("/test", [
        () => {
          order.push("handler1");
        },
        () => {
          order.push("handler2");
          return Break_Pipe;
        },
        () => {
          order.push("handler3");
        },
      ]);

      await router.respond(createRequest("/test"));
      expect(order).toEqual(["handler1", "handler2"]);
    });

    it("returning Break_Pipe should only break from the current pipline", async () => {
      const router = new Router();
      const order: string[] = [];

      router.filterGet("/**", [
        () => {
          order.push("handler7");
        },
        () => {
          order.push("handler8");
          return Break_Pipe;
        },
        () => {
          order.push("handler9");
        },
      ]);

      router.filterGet("/test", [
        () => {
          order.push("handler4");
        },
        () => {
          order.push("handler5");
          return Break_Pipe;
        },
        () => {
          order.push("handler6");
        },
      ]);

      router.get("/test", [
        () => {
          order.push("handler1");
        },
        () => {
          order.push("handler2");
          return Break_Pipe;
        },
        () => {
          order.push("handler3");
        },
      ]);

      await router.respond(createRequest("/test"));
      expect(order).toEqual([
        "handler4",
        "handler5",
        "handler7",
        "handler8",
        "handler1",
        "handler2",
      ]);
    });

    it("returning Break_Pipeline should only break from the current pipline", async () => {
      const router = new Router();
      const order: string[] = [];

      router.filterGet("/**", [
        () => {
          order.push("handler7");
        },
        () => {
          order.push("handler8");
          return Break_Pipeline;
        },
        () => {
          order.push("handler9");
        },
      ]);

      router.filterGet("/test", [
        () => {
          order.push("handler4");
        },
        () => {
          order.push("handler5");
          return Break_Pipeline;
        },
        () => {
          order.push("handler6");
        },
      ]);

      router.get("/test", [
        () => {
          order.push("handler1");
        },
        () => {
          order.push("handler2");
          return Break_Pipeline;
        },
        () => {
          order.push("handler3");
        },
      ]);

      await router.respond(createRequest("/test"));
      expect(order).toEqual(["handler4", "handler5", "handler1", "handler2"]);
    });
  });

  describe("Combined Handler Types", () => {
    it("should combine filter, handler, and after", async () => {
      const router = new Router();
      const order: string[] = [];

      router.filterGet("/test", () => {
        order.push("filter");
      });

      router.get("/test", () => {
        order.push("handler");
        return text("OK");
      });

      router.afterGet("/test", (ctx: Context<CTResponse>) => {
        order.push("after");
        ctx.response.headers.set("X-Order", "filter->handler->after");
      });

      const response = await router.respond(createRequest("/test"));
      expect(order).toEqual(["filter", "handler", "after"]);
      expect(response.headers.get("X-Order")).toBe("filter->handler->after");
    });

    it("should combine filter, fallback, and after", async () => {
      const router = new Router();
      const order: string[] = [];

      router.filterGet("/test", () => {
        order.push("filter");
      });

      router.fallbackGet("/test", () => {
        order.push("fallback");
        return text("fallback");
      });

      router.afterGet("/test", () => {
        order.push("after");
      });

      router.get("/test", () => {
        order.push("handler");
      });

      const response = await router.respond(createRequest("/test"));
      expect(order).toEqual(["filter", "handler", "fallback", "after"]);
      expect(await response.text()).toBe("fallback");
    });

    it("should combine catcher with other handlers", async () => {
      const router = new Router();
      const order: string[] = [];

      router.filterGet("/test", () => {
        order.push("filter");
      });

      router.get("/test", () => {
        order.push("handler");
        throw new Error("Error");
      });

      router.catchGet("/test", (ctx: Context) => {
        order.push("catcher");
        return text(`Caught: ${ctx.error?.message}`, { status: 500 });
      });

      router.afterGet("/test", () => {
        order.push("after");
      });

      const response = await router.respond(createRequest("/test"));
      expect(order).toEqual(["filter", "handler", "catcher", "after"]);
      expect(await response.text()).toBe("Caught: Error");
    });
  });

  describe("Overwrite Options", () => {
    it("should throw when overwriting without option", () => {
      const router = new Router();

      router.get("/test", () => text("first"));

      expect(() => {
        router.get("/test", () => text("second"));
      }).toThrow(RouterError);
    });

    it("should allow overwrite with option", async () => {
      const router = new Router();

      router.get("/test", () => text("first"));
      router.get("/test", () => text("second"), { overwrite: true });

      const response = await router.respond(createRequest("/test"));
      expect(await response.text()).toBe("second");
    });

    it("should allow overwrite for all handler types", () => {
      const router = new Router();

      // Filter
      router.filterGet("/test", () => {});
      router.filterGet("/test", () => {}, { overwrite: true });

      // Fallback
      router.fallbackGet("/test", () => {});
      router.fallbackGet("/test", () => {}, { overwrite: true });

      // After
      router.afterGet("/test", () => {});
      router.afterGet("/test", () => {}, { overwrite: true });

      // Catcher
      router.catchGet("/test", () => {});
      router.catchGet("/test", () => {}, { overwrite: true });

      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe("Route Parameter Extraction", () => {
    it("should extract parameters in all handler types", async () => {
      const router = new Router();

      // Filter
      router.filterGet("/users/:id", (ctx: Context) => {
        expect(ctx.params.id).toBe("123");
      });

      // Handler
      router.get("/users/:id", (ctx: Context) => {
        expect(ctx.params.id).toBe("123");
        return text("OK");
      });

      // Fallback
      router.fallbackGet("/users/:id", (ctx: Context) => {
        expect(ctx.params.id).toBe("123");
      });

      // After
      router.afterGet("/users/:id", (ctx: Context<CTResponse>) => {
        expect(ctx.params.id).toBe("123");
      });

      // Catcher
      router.catchGet("/users/:id", (ctx: Context) => {
        expect(ctx.params.id).toBe("123");
      });

      await router.respond(createRequest("/users/123", "GET"));
    });
  });

  describe("Error Handling in Handlers", () => {
    it("should handle errors in all handler types", async () => {
      const router = new Router();
      let caught = false;

      router.filterGet("/error", () => {
        throw new Error("Filter error");
      });

      router.get("/error", () => text("OK"));

      router.catchGet("/error", (ctx: Context) => {
        caught = true;
        expect(ctx.error?.message).toBe("Filter error");
        return text("Caught", { status: 500 });
      });

      const response = await router.respond(createRequest("/error"));
      expect(caught).toBe(true);
      expect(await response.text()).toBe("Caught");
    });

    it("should handle HttpError in handlers", async () => {
      const router = new Router();

      router.get("/error", () => {
        throw new HttpError(403, "Forbidden");
      });

      router.catchGet("/error", (ctx: Context) => {
        if (ctx.error instanceof HttpError) {
          return text(ctx.error.message, { status: ctx.error.status });
        }
        return text("Unknown", { status: 500 });
      });

      const response = await router.respond(createRequest("/error"));
      expect(response.status).toBe(403);
      expect(await response.text()).toBe("Forbidden");
    });
  });

  describe("Special Path Patterns", () => {
    it("should handle glob patterns in all handler types", async () => {
      const router = new Router();
      const spy = createSpy();

      router.get("/api/*", () => {
        spy();
        return text("glob");
      });

      const response = await router.respond(createRequest("/api/users"));
      expect(spy).toHaveBeenCalled();
      expect(await response.text()).toBe("glob");
    });

    it("should handle named super glob patterns in all handler types", async () => {
      const router = new Router();
      const spy = createSpy();

      router.get("/files/::filepath", (ctx: Context) => {
        spy();
        expect(ctx.params.filepath).toBe("documents/report.pdf");
        return text("super glob");
      });

      const response = await router.respond(
        createRequest("/files/documents/report.pdf"),
      );
      expect(spy).toHaveBeenCalled();
      expect(await response.text()).toBe("super glob");
    });

    it("should handle named parameters in all handler types", async () => {
      const router = new Router();
      const spy = createSpy();

      router.get("/|home|about:page", (ctx: Context) => {
        spy();
        expect(ctx.params.page).toBe("home");
        return text("named");
      });

      const response = await router.respond(createRequest("/home"));
      expect(spy).toHaveBeenCalled();
      expect(await response.text()).toBe("named");
    });
  });

  describe("Default Handlers", () => {
    it("should use defaultFilter", async () => {
      const spy = createSpy();
      const router = new Router({
        defaultFilter: () => {
          spy();
        },
      });

      router.get("/test", () => text("OK"));

      await router.respond(createRequest("/test"));
      expect(spy).toHaveBeenCalled();
    });

    it("should use defaultFallback", async () => {
      const spy = createSpy();
      const router = new Router({
        defaultFallback: () => {
          spy();
          return text("default fallback", { status: 404 });
        },
      });

      const response = await router.respond(createRequest("/nonexistent"));
      expect(spy).toHaveBeenCalled();
      expect(await response.text()).toBe("default fallback");
    });

    it("should use defaultCatcher", async () => {
      const spy = createSpy();
      const router = new Router({
        defaultCatcher: (ctx: Context<CTError>) => {
          spy();
          return text(`Default catch: ${ctx.error?.message}`, { status: 500 });
        },
      });

      router.get("/error", () => {
        throw new Error("Test");
      });

      const response = await router.respond(createRequest("/error"));
      expect(spy).toHaveBeenCalled();
      expect(await response.text()).toBe("Default catch: Test");
    });

    it("should use defaultAfter", async () => {
      const spy = createSpy();
      const router = new Router({
        defaultAfter: (ctx: Context<CTResponse>) => {
          spy();
          ctx.response.headers.set("X-Default-After", "true");
        },
      });

      router.get("/test", () => text("OK"));

      const response = await router.respond(createRequest("/test"));
      expect(spy).toHaveBeenCalled();
      expect(response.headers.get("X-Default-After")).toBe("true");
    });
  });

  describe("Chaining", () => {
    it("should support method chaining", () => {
      const router = new Router();

      const result = router
        .get("/a", () => text("a"))
        .post("/b", () => text("b"))
        .put("/c", () => text("c"))
        .delete("/d", () => text("d"))
        .filterGet("/e", () => {})
        .fallbackGet("/f", () => {})
        .afterGet("/g", () => {})
        .catchGet("/h", () => {});

      expect(result).toBe(router);
    });
  });
});
