// tests/router.openapi.test.ts

import { describe, it, expect, vi } from "bun:test";
import { Router } from "../src/router.ts";
import { text, json } from "../src/helpers.ts";
import type { Context } from "../src/types.ts";

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

describe("Router - OpenAPI Generation", () => {
  describe("Basic OpenAPI Generation", () => {
    it("should generate basic OpenAPI document", async () => {
      const router = new Router();

      router.get("/users", () => text("OK"), {
        openApi: {
          summary: "Get users",
          description: "Retrieves all users",
          tags: ["users"],
          responses: {
            "200": {
              description: "Users retrieved",
              content: {
                "application/json": {
                  schema: {
                    type: "array",
                    items: { type: "object" },
                  },
                },
              },
            },
          },
        },
      });

      const openapi = await router.generateOpenAPI({
        title: "Test API",
        version: "1.0.0",
        description: "Test API description",
      });

      expect(openapi.openapi).toBe("3.0.0");
      expect(openapi.info.title).toBe("Test API");
      expect(openapi.info.version).toBe("1.0.0");
      expect(openapi.info.description).toBe("Test API description");
      expect(openapi.paths["/users"]).toBeDefined();
      expect(openapi.paths["/users"].get).toBeDefined();
    });

    it("should generate OpenAPI with servers", async () => {
      const router = new Router();

      router.get("/test", () => text("OK"));

      const openapi = await router.generateOpenAPI({
        title: "Test API",
        version: "1.0.0",
        servers: [
          { url: "https://api.example.com/v1", description: "Production" },
          { url: "http://localhost:3000", description: "Local development" },
        ],
      });

      expect(openapi.servers).toHaveLength(2);
      expect(openapi.servers?.[0].url).toBe("https://api.example.com/v1");
      expect(openapi.servers?.[1].url).toBe("http://localhost:3000");
    });

    it("should generate OpenAPI with contact and license", async () => {
      const router = new Router();

      router.get("/test", () => text("OK"));

      const openapi = await router.generateOpenAPI({
        title: "Test API",
        version: "1.0.0",
        contact: {
          name: "API Support",
          email: "support@example.com",
          url: "https://example.com/support",
        },
        license: {
          name: "MIT",
          url: "https://opensource.org/licenses/MIT",
        },
        termsOfService: "https://example.com/terms",
      });

      expect(openapi.info.contact).toBeDefined();
      expect(openapi.info.contact?.name).toBe("API Support");
      expect(openapi.info.contact?.email).toBe("support@example.com");
      expect(openapi.info.license).toBeDefined();
      expect(openapi.info.license?.name).toBe("MIT");
      expect(openapi.info.termsOfService).toBe("https://example.com/terms");
    });

    it("should generate OpenAPI with external docs", async () => {
      const router = new Router();

      router.get("/test", () => text("OK"));

      const openapi = await router.generateOpenAPI({
        title: "Test API",
        version: "1.0.0",
        externalDocs: {
          description: "API Documentation",
          url: "https://docs.example.com/api",
        },
      });

      expect(openapi.externalDocs).toBeDefined();
      expect(openapi.externalDocs?.description).toBe("API Documentation");
      expect(openapi.externalDocs?.url).toBe("https://docs.example.com/api");
    });
  });

  describe("OpenAPI with Tags", () => {
    it("should auto-tag routes based on path", async () => {
      const router = new Router();

      router.get("/api/users", () => text("OK"));
      router.get("/api/posts", () => text("OK"));
      router.get("/admin/dashboard", () => text("OK"));

      const openapi = await router.generateOpenAPI(
        { title: "Test API", version: "1.0.0" },
        { autoTag: true },
      );

      expect(openapi.tags).toBeDefined();
      expect(openapi.tags?.some((t) => t.name === "api")).toBe(true);
      expect(openapi.tags?.some((t) => t.name === "admin")).toBe(true);

      // Check operations have tags
      expect(openapi.paths["/api/users"].get.tags).toContain("api");
      expect(openapi.paths["/api/posts"].get.tags).toContain("api");
      expect(openapi.paths["/admin/dashboard"].get.tags).toContain("admin");
    });

    it("should use custom tag function", async () => {
      const router = new Router();

      router.get("/api/users", () => text("OK"));
      router.get("/api/posts", () => text("OK"));

      const openapi = await router.generateOpenAPI(
        { title: "Test API", version: "1.0.0" },
        {
          autoTag: (entry) => {
            const parts = entry.openApiPath.split("/").filter(Boolean);
            return parts.length > 1 ? ["custom", parts[0]] : ["default"];
          },
        },
      );

      expect(openapi.paths["/api/users"].get.tags).toContain("custom");
      expect(openapi.paths["/api/users"].get.tags).toContain("api");
    });

    it("should include global tags when used by operations", async () => {
      const router = new Router();

      router.get("/api/users", () => text("OK"), {
        openApi: { tags: ["users", "api"] },
      });

      const openapi = await router.generateOpenAPI({
        title: "Test API",
        version: "1.0.0",
        tags: [
          { name: "users", description: "User operations" },
          { name: "api", description: "API operations" },
          { name: "unused", description: "Unused tag" },
        ],
      });

      expect(openapi.tags).toHaveLength(2);
      expect(openapi.tags?.some((t) => t.name === "users")).toBe(true);
      expect(openapi.tags?.some((t) => t.name === "api")).toBe(true);
      expect(openapi.tags?.some((t) => t.name === "unused")).toBe(false);
    });

    it("should auto-generate tags when autoTag is enabled by default", async () => {
      const router = new Router();

      router.get("/test", () => text("OK"));

      const openapi = await router.generateOpenAPI({
        title: "Test API",
        version: "1.0.0",
        tags: [{ name: "unused", description: "Not used anywhere" }],
      });

      expect(openapi.tags).toEqual([
        {
          name: "test",
        },
      ]);
    });

    it("should not include unused tags", async () => {
      const router = new Router();

      router.get("/test", () => text("OK"));

      const openapi = await router.generateOpenAPI(
        {
          title: "Test API",
          version: "1.0.0",
          tags: [{ name: "unused", description: "Not used anywhere" }],
        },
        {
          autoTag: false,
        },
      );

      expect(openapi.tags).toBeUndefined();
    });
  });

  describe("OpenAPI with Operation IDs", () => {
    it("should generate operation IDs", async () => {
      const router = new Router();

      router.get("/api/users", () => text("OK"));
      router.post("/api/users", () => text("OK"));
      router.get("/api/users/:id", () => text("OK"));

      const openapi = await router.generateOpenAPI(
        { title: "Test API", version: "1.0.0" },
        { includeOperationId: true },
      );

      expect(openapi.paths["/api/users"].get.operationId).toBe("getApiUsers");
      expect(openapi.paths["/api/users"].post.operationId).toBe("postApiUsers");
      expect(openapi.paths["/api/users/{id}"].get.operationId).toBe(
        "getApiUsersId",
      );
    });

    it("should use custom operation ID when provided", async () => {
      const router = new Router();

      router.get("/users", () => text("OK"), {
        openApi: {
          operationId: "customGetUsers",
        },
      });

      const openapi = await router.generateOpenAPI(
        { title: "Test API", version: "1.0.0" },
        { includeOperationId: true },
      );

      expect(openapi.paths["/users"].get.operationId).toBe("customGetUsers");
    });

    it("should not generate operation IDs when disabled", async () => {
      const router = new Router();

      router.get("/users", () => text("OK"));

      const openapi = await router.generateOpenAPI(
        { title: "Test API", version: "1.0.0" },
        { includeOperationId: false },
      );

      expect(openapi.paths["/users"].get.operationId).toBeUndefined();
    });

    it("should clean operation IDs", async () => {
      const router = new Router();

      router.get("/api/v1/users/:id/posts", () => text("OK"));

      const openapi = await router.generateOpenAPI(
        { title: "Test API", version: "1.0.0" },
        { cleanOperationId: true },
      );

      expect(openapi.paths["/api/v1/users/{id}/posts"].get.operationId).toBe(
        "getApiV1UsersIdPosts",
      );
    });
  });

  describe("OpenAPI with Summaries", () => {
    it("should auto-generate summaries", async () => {
      const router = new Router();

      router.get("/api/users", () => text("OK"));
      router.post("/api/users/:id/update", () => text("OK"));

      const openapi = await router.generateOpenAPI(
        { title: "Test API", version: "1.0.0" },
        { autoSummary: true },
      );

      expect(openapi.paths["/api/users"].get.summary).toBe("get users");
      expect(openapi.paths["/api/users/{id}/update"].post.summary).toBe(
        "post update",
      );
    });

    it("should use custom summary when provided", async () => {
      const router = new Router();

      router.get("/users", () => text("OK"), {
        openApi: {
          summary: "Get all users",
        },
      });

      const openapi = await router.generateOpenAPI(
        { title: "Test API", version: "1.0.0" },
        { autoSummary: true },
      );

      expect(openapi.paths["/users"].get.summary).toBe("Get all users");
    });

    it("should not generate summaries when disabled", async () => {
      const router = new Router();

      router.get("/users", () => text("OK"));

      const openapi = await router.generateOpenAPI(
        { title: "Test API", version: "1.0.0" },
        { autoSummary: false },
      );

      expect(openapi.paths["/users"].get.summary).toBeUndefined();
    });
  });

  describe("OpenAPI with Parameters", () => {
    it("should include path parameters from route", async () => {
      const router = new Router();

      router.get("/users/:userId/posts/:postId", () => text("OK"));

      const openapi = await router.generateOpenAPI({
        title: "Test API",
        version: "1.0.0",
      });

      const params =
        openapi.paths["/users/{userId}/posts/{postId}"].get.parameters;
      expect(params).toHaveLength(2);
      expect(params?.[0].name).toBe("userId");
      expect(params?.[0].in).toBe("path");
      expect(params?.[0].required).toBe(true);
      expect(params?.[1].name).toBe("postId");
      expect(params?.[1].in).toBe("path");
      expect(params?.[1].required).toBe(true);
    });

    it("should combine user-defined and path parameters", async () => {
      const router = new Router();

      router.get("/users/:id", () => text("OK"), {
        openApi: {
          parameters: [
            {
              name: "fields",
              in: "query",
              schema: { type: "string" },
            },
            {
              name: "include",
              in: "query",
              schema: { type: "string" },
            },
          ],
        },
      });

      const openapi = await router.generateOpenAPI({
        title: "Test API",
        version: "1.0.0",
      });

      const params = openapi.paths["/users/{id}"].get.parameters;
      expect(params).toHaveLength(3);
      expect(params?.some((p) => p.name === "id" && p.in === "path")).toBe(
        true,
      );
      expect(params?.some((p) => p.name === "fields" && p.in === "query")).toBe(
        true,
      );
      expect(
        params?.some((p) => p.name === "include" && p.in === "query"),
      ).toBe(true);
    });

    it("should deduplicate parameters", async () => {
      const router = new Router();

      router.get("/users/:id", () => text("OK"), {
        openApi: {
          parameters: [
            {
              name: "id",
              in: "path",
              schema: { type: "string" },
            },
          ],
        },
      });

      const openapi = await router.generateOpenAPI({
        title: "Test API",
        version: "1.0.0",
      });

      const params = openapi.paths["/users/{id}"].get.parameters;
      expect(params).toHaveLength(1);
      expect(params?.[0].name).toBe("id");
    });

    it("should add common parameters to all operations", async () => {
      const router = new Router();

      router.get("/users", () => text("OK"));
      router.get("/posts", () => text("OK"));

      const openapi = await router.generateOpenAPI(
        { title: "Test API", version: "1.0.0" },
        {
          commonParameters: [
            {
              name: "X-Request-ID",
              in: "header",
              schema: { type: "string" },
              description: "Request tracking ID",
            },
            {
              name: "X-API-Version",
              in: "header",
              schema: { type: "string" },
            },
          ],
        },
      );

      expect(openapi.paths["/users"].get.parameters).toHaveLength(2);
      expect(openapi.paths["/posts"].get.parameters).toHaveLength(2);
      expect(openapi.paths["/users"].get.parameters?.[0].name).toBe(
        "X-Request-ID",
      );
      expect(openapi.paths["/users"].get.parameters?.[1].name).toBe(
        "X-API-Version",
      );
    });
  });

  describe("OpenAPI with Responses", () => {
    it("should infer default responses", async () => {
      const router = new Router();

      router.get("/users", () => text("OK"));

      const openapi = await router.generateOpenAPI(
        { title: "Test API", version: "1.0.0" },
        { defaultContentType: "application/json" },
      );

      const responses = openapi.paths["/users"].get.responses;
      expect(responses["200"]).toBeDefined();
      expect(responses["200"].description).toBe("Successful response");
    });

    it("should use custom responses when provided", async () => {
      const router = new Router();

      router.get("/users", () => text("OK"), {
        openApi: {
          responses: {
            "200": {
              description: "Users retrieved successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "array",
                    items: { type: "object" },
                  },
                },
              },
            },
            "403": {
              description: "Forbidden",
            },
          },
        },
      });

      const openapi = await router.generateOpenAPI({
        title: "Test API",
        version: "1.0.0",
      });

      const responses = openapi.paths["/users"].get.responses;
      expect(responses["200"].description).toBe("Users retrieved successfully");
      expect(responses["403"]).toBeDefined();
      expect(responses["403"].description).toBe("Forbidden");
      expect(responses["400"]).toBeUndefined(); // Not auto-added when custom responses provided
    });
  });

  describe("OpenAPI with Request Body", () => {
    it("should include request body from OpenAPI description", async () => {
      const router = new Router();

      router.post("/users", () => text("OK"), {
        openApi: {
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
        },
      });

      const openapi = await router.generateOpenAPI({
        title: "Test API",
        version: "1.0.0",
      });

      const requestBody = openapi.paths["/users"].post.requestBody;
      expect(requestBody).toBeDefined();
      expect(requestBody?.required).toBe(true);
      expect(requestBody?.content["application/json"]).toBeDefined();
      expect(requestBody?.content["application/json"].schema).toBeDefined();
      expect(
        requestBody?.content["application/json"].schema.properties,
      ).toHaveProperty("name");
      expect(
        requestBody?.content["application/json"].schema.properties,
      ).toHaveProperty("email");
      expect(
        requestBody?.content["application/json"].schema.required,
      ).toContain("name");
      expect(
        requestBody?.content["application/json"].schema.required,
      ).toContain("email");
    });
  });

  describe("OpenAPI with Security", () => {
    it("should include global security", async () => {
      const router = new Router();

      router.get("/users", () => text("OK"));

      const openapi = await router.generateOpenAPI({
        title: "Test API",
        version: "1.0.0",
        security: [{ bearerAuth: [] }],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: "http",
              scheme: "bearer",
              bearerFormat: "JWT",
            },
          },
        },
      });

      expect(openapi.security).toBeDefined();
      expect(openapi.security?.[0]).toEqual({ bearerAuth: [] });
      expect(openapi.components?.securitySchemes).toBeDefined();
      expect(openapi.components?.securitySchemes?.bearerAuth).toBeDefined();
    });

    it("should include operation-level security", async () => {
      const router = new Router();

      router.get("/public", () => text("OK"));

      router.get("/private", () => text("OK"), {
        openApi: {
          security: [{ apiKey: [] }],
        },
      });

      const openapi = await router.generateOpenAPI({
        title: "Test API",
        version: "1.0.0",
        components: {
          securitySchemes: {
            apiKey: {
              type: "apiKey",
              in: "header",
              name: "X-API-Key",
            },
          },
        },
      });

      expect(openapi.paths["/public"].get.security).toBeUndefined();
      expect(openapi.paths["/private"].get.security).toBeDefined();
      expect(openapi.paths["/private"].get.security?.[0]).toEqual({
        apiKey: [],
      });
    });

    it("should merge operation security with global security", async () => {
      const router = new Router();

      router.get("/users", () => text("OK"), {
        openApi: {
          security: [{ bearerAuth: [] }],
        },
      });

      const openapi = await router.generateOpenAPI({
        title: "Test API",
        version: "1.0.0",
        security: [{ basicAuth: [] }],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: "http",
              scheme: "bearer",
            },
            basicAuth: {
              type: "http",
              scheme: "basic",
            },
          },
        },
      });

      // Operation security should override global
      expect(openapi.paths["/users"].get.security?.[0]).toEqual({
        bearerAuth: [],
      });
    });
  });

  describe("OpenAPI with Components", () => {
    it("should include global schemas", async () => {
      const router = new Router();

      router.get("/users", () => text("OK"));

      const openapi = await router.generateOpenAPI({
        title: "Test API",
        version: "1.0.0",
        components: {
          schemas: {
            User: {
              type: "object",
              properties: {
                id: { type: "string" },
                name: { type: "string" },
                email: { type: "string" },
              },
            },
            Error: {
              type: "object",
              properties: {
                error: { type: "string" },
                message: { type: "string" },
              },
            },
          },
        },
      });

      expect(openapi.components?.schemas).toBeDefined();
      expect(openapi.components?.schemas?.User).toBeDefined();
      expect(openapi.components?.schemas?.User.properties).toHaveProperty("id");
      expect(openapi.components?.schemas?.User.properties).toHaveProperty(
        "name",
      );
      expect(openapi.components?.schemas?.User.properties).toHaveProperty(
        "email",
      );
      expect(openapi.components?.schemas?.Error).toBeDefined();
    });

    it("should include global parameters", async () => {
      const router = new Router();

      router.get("/users", () => text("OK"));

      const openapi = await router.generateOpenAPI({
        title: "Test API",
        version: "1.0.0",
        components: {
          parameters: {
            PageParam: {
              name: "page",
              in: "query",
              schema: { type: "integer", minimum: 1, default: 1 },
            },
            LimitParam: {
              name: "limit",
              in: "query",
              schema: {
                type: "integer",
                minimum: 1,
                maximum: 100,
                default: 10,
              },
            },
          },
        },
      });

      expect(openapi.components?.parameters).toBeDefined();
      expect(openapi.components?.parameters?.PageParam).toBeDefined();
      expect(openapi.components?.parameters?.LimitParam).toBeDefined();
    });

    it("should include global responses", async () => {
      const router = new Router();

      router.get("/users", () => text("OK"));

      const openapi = await router.generateOpenAPI({
        title: "Test API",
        version: "1.0.0",
        components: {
          responses: {
            NotFound: {
              description: "Resource not found",
            },
            Unauthorized: {
              description: "Authentication required",
            },
          },
        },
      });

      expect(openapi.components?.responses).toBeDefined();
      expect(openapi.components?.responses?.NotFound).toBeDefined();
      expect(openapi.components?.responses?.Unauthorized).toBeDefined();
    });

    it("should include global examples", async () => {
      const router = new Router();

      router.get("/users", () => text("OK"));

      const openapi = await router.generateOpenAPI({
        title: "Test API",
        version: "1.0.0",
        components: {
          examples: {
            UserExample: {
              value: { id: "123", name: "John Doe", email: "john@example.com" },
              summary: "Example user",
            },
          },
        },
      });

      expect(openapi.components?.examples).toBeDefined();
      expect(openapi.components?.examples?.UserExample).toBeDefined();
      expect(openapi.components?.examples?.UserExample.value).toHaveProperty(
        "id",
      );
      expect(openapi.components?.examples?.UserExample.value).toHaveProperty(
        "name",
      );
    });

    it("should merge multiple component types", async () => {
      const router = new Router();

      router.get("/users", () => text("OK"));

      const openapi = await router.generateOpenAPI({
        title: "Test API",
        version: "1.0.0",
        components: {
          schemas: {
            User: {
              type: "object",
              properties: {
                id: { type: "string" },
                name: { type: "string" },
              },
            },
          },
          securitySchemes: {
            bearerAuth: {
              type: "http",
              scheme: "bearer",
            },
          },
          parameters: {
            PageParam: {
              name: "page",
              in: "query",
              schema: { type: "integer" },
            },
          },
        },
      });

      expect(openapi.components?.schemas).toBeDefined();
      expect(openapi.components?.securitySchemes).toBeDefined();
      expect(openapi.components?.parameters).toBeDefined();
    });
  });
  describe("OpenAPI with Route Filtering", () => {
    it("should filter routes with pick option", async () => {
      const router = new Router();

      // Routes that should be included
      router.get("/api/v1/users", () => text("OK"), {
        openApi: { tags: ["v1"] },
      });
      router.get("/api/v1/posts", () => text("OK"), {
        openApi: { tags: ["v1"] },
      });
      router.get("/api/v2/users", () => text("OK"), {
        openApi: { tags: ["v2"] },
      });
      router.delete("/api/v1/users", () => text("OK"), {
        openApi: { tags: ["v1"] },
      });
      router.delete("/api/v1/posts", () => text("OK"), {
        openApi: { tags: ["v1"] },
      });
      router.delete("/api/v2/users", () => text("OK"), {
        openApi: { tags: ["v2"] },
      });

      // Routes that should be excluded
      router.get("/", () => text("OK"));
      router.get("/docs", () => text("OK"));
      router.post("/api/v1/users", () => text("OK"), {
        openApi: { tags: ["v1"] },
      });
      router.post("/api/v1/posts", () => text("OK"), {
        openApi: { tags: ["v1"] },
      });
      router.post("/api/v2/users", () => text("OK"), {
        openApi: { tags: ["v2"] },
      });

      const openapi = await router.generateOpenAPI(
        { title: "Test API", version: "1.0.0" },
        {
          pick: ({ path, method, tags }) => {
            // Only include:
            // - Routes starting with /api
            // - Only GET and DELETE methods
            // - Routes with either v1 or v2 tags
            return (
              path.startsWith("/api") &&
              (method === "GET" || method === "DELETE") &&
              tags.some((t) => t === "v1" || t === "v2")
            );
          },
        },
      );

      // Verify included routes exist and have correct operations
      // GET routes
      expect(openapi.paths["/api/v1/users"]).toBeDefined();
      expect(openapi.paths["/api/v1/users"].get).toBeDefined();
      expect(openapi.paths["/api/v1/users"].delete).toBeDefined();

      expect(openapi.paths["/api/v1/posts"]).toBeDefined();
      expect(openapi.paths["/api/v1/posts"].get).toBeDefined();
      expect(openapi.paths["/api/v1/posts"].delete).toBeDefined();

      expect(openapi.paths["/api/v2/users"]).toBeDefined();
      expect(openapi.paths["/api/v2/users"].get).toBeDefined();
      expect(openapi.paths["/api/v2/users"].delete).toBeDefined();

      // Verify excluded routes are NOT present
      // Non-API routes
      expect(openapi.paths["/"]).toBeUndefined();
      expect(openapi.paths["/docs"]).toBeUndefined();

      // POST routes (excluded by method filter)
      expect(openapi.paths["/api/v1/users"]?.post).toBeUndefined();
      expect(openapi.paths["/api/v1/posts"]?.post).toBeUndefined();
      expect(openapi.paths["/api/v2/users"]?.post).toBeUndefined();

      // Verify that tags are correctly applied to included operations
      expect(openapi.paths["/api/v1/users"].get.tags).toContain("v1");
      expect(openapi.paths["/api/v1/users"].delete.tags).toContain("v1");
      expect(openapi.paths["/api/v2/users"].get.tags).toContain("v2");
      expect(openapi.paths["/api/v2/users"].delete.tags).toContain("v2");
    });

    it("should handle complex pick conditions with multiple criteria", async () => {
      const router = new Router();

      router.get("/api/public/users", () => text("OK"), {
        openApi: { tags: ["public"] },
      });
      router.get("/api/private/users", () => text("OK"), {
        openApi: { tags: ["private"] },
      });
      router.get("/api/admin/users", () => text("OK"), {
        openApi: { tags: ["admin"] },
      });
      router.post("/api/public/users", () => text("OK"), {
        openApi: { tags: ["public"] },
      });
      router.delete("/api/admin/users", () => text("OK"), {
        openApi: { tags: ["admin"] },
      });

      const openapi = await router.generateOpenAPI(
        { title: "Test API", version: "1.0.0" },
        {
          pick: ({ path, method, tags }) => {
            // Only include:
            // - Routes with 'public' tag OR
            // - Routes with 'admin' tag AND DELETE method
            return (
              tags.includes("public") ||
              (tags.includes("admin") && method === "DELETE")
            );
          },
        },
      );

      // Public routes should be included (GET and POST)
      expect(openapi.paths["/api/public/users"]).toBeDefined();
      expect(openapi.paths["/api/public/users"].get).toBeDefined();
      expect(openapi.paths["/api/public/users"].post).toBeDefined();

      // Admin DELETE should be included
      expect(openapi.paths["/api/admin/users"]).toBeDefined();
      expect(openapi.paths["/api/admin/users"].delete).toBeDefined();

      // Admin GET should be excluded (not public, not DELETE)
      expect(openapi.paths["/api/admin/users"]?.get).toBeUndefined();

      // Private routes should be excluded entirely
      expect(openapi.paths["/api/private/users"]).toBeUndefined();
    });

    it("should preserve operation ordering when filtering with pick", async () => {
      const router = new Router();

      router.get("/api/v1/users", () => text("OK"), {
        openApi: { tags: ["v1"], operationId: "getV1Users" },
      });
      router.get("/api/v2/users", () => text("OK"), {
        openApi: { tags: ["v2"], operationId: "getV2Users" },
      });
      router.get("/api/v3/users", () => text("OK"), {
        openApi: { tags: ["v3"], operationId: "getV3Users" },
      });
      router.get("/api/v4/users", () => text("OK"), {
        openApi: { tags: ["v4"], operationId: "getV4Users" },
      });
      router.get("/api/v5/users", () => text("OK"), {
        openApi: { tags: ["v5"], operationId: "getV5Users" },
      });

      const openapi = await router.generateOpenAPI(
        { title: "Test API", version: "1.0.0" },
        {
          pick: ({ tags }) => {
            // Only include even versioned routes
            const version = parseInt(tags[0]?.replace("v", "") || "0");
            return version % 2 === 0;
          },
          sortPathnameOrder: 1,
        },
      );

      // Only even versions should be present
      expect(openapi.paths["/api/v2/users"]).toBeDefined();
      expect(openapi.paths["/api/v4/users"]).toBeDefined();
      expect(openapi.paths["/api/v1/users"]).toBeUndefined();
      expect(openapi.paths["/api/v3/users"]).toBeUndefined();
      expect(openapi.paths["/api/v5/users"]).toBeUndefined();

      // Operation IDs should be preserved
      expect(openapi.paths["/api/v2/users"].get.operationId).toBe("getV2Users");
      expect(openapi.paths["/api/v4/users"].get.operationId).toBe("getV4Users");
    });

    it("should handle empty pick filter (include all)", async () => {
      const router = new Router();

      router.get("/api/users", () => text("OK"), {
        openApi: { tags: ["users"] },
      });
      router.get("/api/posts", () => text("OK"), {
        openApi: { tags: ["posts"] },
      });
      router.get("/api/comments", () => text("OK"), {
        openApi: { tags: ["comments"] },
      });

      // No pick function provided - should include all
      const openapi = await router.generateOpenAPI({
        title: "Test API",
        version: "1.0.0",
      });

      expect(Object.keys(openapi.paths)).toHaveLength(3);
      expect(openapi.paths["/api/users"]).toBeDefined();
      expect(openapi.paths["/api/posts"]).toBeDefined();
      expect(openapi.paths["/api/comments"]).toBeDefined();
    });

    it("should filter out all routes when pick returns false", async () => {
      const router = new Router();

      router.get("/api/users", () => text("OK"), {
        openApi: { tags: ["users"] },
      });
      router.get("/api/posts", () => text("OK"), {
        openApi: { tags: ["posts"] },
      });

      const openapi = await router.generateOpenAPI(
        { title: "Test API", version: "1.0.0" },
        {
          pick: () => false, // Exclude all routes
        },
      );

      expect(Object.keys(openapi.paths)).toHaveLength(0);
    });

    it("should maintain tag filtering when pick is used", async () => {
      const router = new Router();

      router.get("/api/v1/users", () => text("OK"), {
        openApi: { tags: ["v1", "api"] },
      });
      router.get("/api/v2/users", () => text("OK"), {
        openApi: { tags: ["v2"] },
      });
      router.get("/api/v3/users", () => text("OK"), {
        openApi: { tags: ["v3", "api"] },
      });

      const openapi = await router.generateOpenAPI(
        {
          title: "Test API",
          version: "1.0.0",
          tags: [
            { name: "api", description: "API endpoints" },
            { name: "v2", description: "Version 2 endpoints" },
            { name: "unused", description: "Unused tag" },
          ],
        },
        {
          pick: ({ tags }) => {
            // Only include routes with 'api' tag
            return tags.includes("api");
          },
          autoTag: false,
        },
      );

      // Only routes with 'api' tag should be included
      expect(openapi.paths["/api/v1/users"]).toBeDefined();
      expect(openapi.paths["/api/v3/users"]).toBeDefined();
      expect(openapi.paths["/api/v2/users"]).toBeUndefined();

      // Tags should be filtered to only used tags
      expect(openapi.tags).toBeDefined();
      expect(openapi.tags?.some((t) => t.name === "api")).toBe(true);
      expect(openapi.tags?.some((t) => t.name === "v2")).toBe(false);
      expect(openapi.tags?.some((t) => t.name === "unused")).toBe(false);
    });

    it("should handle pick with different HTTP methods on same path", async () => {
      const router = new Router();

      router.get("/api/resource", () => text("OK"), {
        openApi: { tags: ["read"] },
      });
      router.post("/api/resource", () => text("OK"), {
        openApi: { tags: ["write"] },
      });
      router.put("/api/resource", () => text("OK"), {
        openApi: { tags: ["write"] },
      });
      router.delete("/api/resource", () => text("OK"), {
        openApi: { tags: ["admin"] },
      });

      const openapi = await router.generateOpenAPI(
        { title: "Test API", version: "1.0.0" },
        {
          pick: ({ tags }) => {
            // Only include routes with 'read' or 'write' tags
            return tags.some((t) => t === "read" || t === "write");
          },
          autoTag: false,
        },
      );

      // GET (read) should be included
      expect(openapi.paths["/api/resource"]).toBeDefined();
      expect(openapi.paths["/api/resource"].get).toBeDefined();

      // POST and PUT (write) should be included
      expect(openapi.paths["/api/resource"].post).toBeDefined();
      expect(openapi.paths["/api/resource"].put).toBeDefined();

      // DELETE (admin) should be excluded
      expect(openapi.paths["/api/resource"].delete).toBeUndefined();
    });
  });

  describe("OpenAPI with Complex Routes", () => {
    it("should handle routes with alternative paths", async () => {
      const router = new Router();

      // This registers: /home, /about, /contact (expanded by router)
      router.get("/|home|about|contact:page", (ctx) => {
        return text(ctx.params.page!);
      });

      const openapi = await router.generateOpenAPI({
        title: "Test API",
        version: "1.0.0",
      });

      // The router expands alternative paths into separate routes
      expect(openapi.paths["/home"]).toBeDefined();
      expect(openapi.paths["/about"]).toBeDefined();
      expect(openapi.paths["/contact"]).toBeDefined();

      // Each path should have no parameters (they're separate routes)
      expect(openapi.paths["/home"].get.parameters).toBeUndefined();
      expect(openapi.paths["/about"].get.parameters).toBeUndefined();
      expect(openapi.paths["/contact"].get.parameters).toBeUndefined();
    });

    it("should handle routes with pipe in parameters", async () => {
      const router = new Router();

      router.get(
        "/dashboard/admin|vendor|client:role/settings/profile|payment:tab",
        () => {
          return text("OK");
        },
      );

      const openapi = await router.generateOpenAPI({
        title: "Test API",
        version: "1.0.0",
      });

      // The router expands both sets of alternatives
      // This creates paths like:
      // /dashboard/admin/settings/profile
      // /dashboard/admin/settings/payment
      // /dashboard/vendor/settings/profile
      // etc.

      const paths = Object.keys(openapi.paths);
      expect(paths).toContain("/dashboard/admin/settings/profile");
      expect(paths).toContain("/dashboard/admin/settings/payment");
      expect(paths).toContain("/dashboard/vendor/settings/profile");

      // Check that a sample path has no parameters (they're expanded)
      const params =
        openapi.paths["/dashboard/admin/settings/profile"]?.get?.parameters;
      expect(params).toBeUndefined();
    });

    it("should handle deep nested routes", async () => {
      const router = new Router();

      router.get("/a/b/c/d/e/f/g/h/i/j", () => text("OK"));

      const openapi = await router.generateOpenAPI({
        title: "Test API",
        version: "1.0.0",
      });

      expect(openapi.paths["/a/b/c/d/e/f/g/h/i/j"]).toBeDefined();
      expect(openapi.paths["/a/b/c/d/e/f/g/h/i/j"].get).toBeDefined();
    });

    it("should handle all HTTP methods", async () => {
      const router = new Router();

      router.get("/resource", () => text("GET"));
      router.post("/resource", () => text("POST"));
      router.put("/resource", () => text("PUT"));
      router.delete("/resource", () => text("DELETE"));
      router.patch("/resource", () => text("PATCH"));
      router.head("/resource", () => new Response(null, { status: 200 }));
      router.options("/resource", () => new Response(null, { status: 204 }));
      router.trace("/resource", () => new Response(null, { status: 200 }));
      router.connect("/resource", () => new Response(null, { status: 200 }));

      const openapi = await router.generateOpenAPI({
        title: "Test API",
        version: "1.0.0",
      });

      const resource = openapi.paths["/resource"];
      expect(resource.get).toBeDefined();
      expect(resource.post).toBeDefined();
      expect(resource.put).toBeDefined();
      expect(resource.delete).toBeDefined();
      expect(resource.patch).toBeDefined();
      expect(resource.head).toBeDefined();
      expect(resource.options).toBeDefined();
      expect(resource.trace).toBeDefined();
      expect(resource.connect).toBeUndefined();
    });
  });

  describe("OpenAPI Schema Descriptions", () => {
    it("should include schema descriptions", async () => {
      const router = new Router();

      router.post("/users", () => text("OK"), {
        openApi: {
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  description: "User creation payload",
                  properties: {
                    name: {
                      type: "string",
                      description: "User's full name",
                      minLength: 2,
                      maxLength: 100,
                    },
                    email: {
                      type: "string",
                      description: "User's email address",
                      format: "email",
                    },
                    age: {
                      type: "integer",
                      description: "User's age",
                      minimum: 18,
                      maximum: 120,
                    },
                  },
                  required: ["name", "email"],
                },
              },
            },
          },
          responses: {
            "201": {
              description: "User created",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    description: "Created user response",
                    properties: {
                      id: {
                        type: "string",
                        description: "Unique user identifier",
                        format: "uuid",
                      },
                      name: {
                        type: "string",
                        description: "User's name",
                      },
                      email: {
                        type: "string",
                        description: "User's email",
                      },
                      createdAt: {
                        type: "string",
                        description: "User creation timestamp",
                        format: "date-time",
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      const openapi = await router.generateOpenAPI({
        title: "Test API",
        version: "1.0.0",
      });

      const requestSchema =
        openapi.paths["/users"].post.requestBody?.content["application/json"]
          .schema;
      expect(requestSchema?.description).toBe("User creation payload");
      expect(requestSchema?.properties?.name?.description).toBe(
        "User's full name",
      );
      expect(requestSchema?.properties?.name?.minLength).toBe(2);
      expect(requestSchema?.properties?.email?.description).toBe(
        "User's email address",
      );
      expect(requestSchema?.properties?.email?.format).toBe("email");

      const responseSchema =
        openapi.paths["/users"].post.responses["201"].content[
          "application/json"
        ].schema;
      expect(responseSchema?.description).toBe("Created user response");
      expect(responseSchema?.properties?.id?.description).toBe(
        "Unique user identifier",
      );
      expect(responseSchema?.properties?.id?.format).toBe("uuid");
      expect(responseSchema?.properties?.createdAt?.format).toBe("date-time");
    });

    it("should include descriptions for array items", async () => {
      const router = new Router();

      router.get("/users", () => text("OK"), {
        openApi: {
          responses: {
            "200": {
              description: "Users list",
              content: {
                "application/json": {
                  schema: {
                    type: "array",
                    description: "List of users",
                    items: {
                      type: "object",
                      description: "User object",
                      properties: {
                        id: { type: "string", description: "User ID" },
                        name: { type: "string", description: "User name" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      const openapi = await router.generateOpenAPI({
        title: "Test API",
        version: "1.0.0",
      });

      const schema =
        openapi.paths["/users"].get.responses["200"].content["application/json"]
          .schema;
      expect(schema?.description).toBe("List of users");
      expect(schema?.items?.description).toBe("User object");
      expect(schema?.items?.properties?.id?.description).toBe("User ID");
    });
  });

  describe("OpenAPI Return Type Validation", () => {
    it("should return a valid GeneratedOpenApi type", async () => {
      const router = new Router();

      router.get("/test", () => text("OK"));

      const openapi = await router.generateOpenAPI({
        title: "Test API",
        version: "1.0.0",
        description: "Test description",
        servers: [{ url: "/", description: "Current" }],
        tags: [{ name: "test" }],
        externalDocs: {
          description: "Docs",
          url: "https://example.com/docs",
        },
        components: {
          schemas: {
            Test: {
              type: "object",
              properties: {
                id: { type: "string" },
              },
            },
          },
          securitySchemes: {
            bearer: {
              type: "http",
              scheme: "bearer",
            },
          },
        },
        security: [{ bearer: [] }],
      });

      // Validate structure
      expect(openapi.openapi).toBe("3.0.0");
      expect(openapi.info.title).toBe("Test API");
      expect(openapi.info.version).toBe("1.0.0");
      expect(openapi.info.description).toBe("Test description");
      expect(openapi.servers).toBeDefined();
      expect(openapi.tags).toBeDefined();
      expect(openapi.externalDocs).toBeDefined();
      expect(openapi.components?.schemas).toBeDefined();
      expect(openapi.components?.securitySchemes).toBeDefined();
      expect(openapi.security).toBeDefined();
      expect(openapi.paths).toBeDefined();
      expect(openapi.paths["/test"]).toBeDefined();
    });

    it("should include operation IDs in all operations when enabled", async () => {
      const router = new Router();

      router.get("/users", () => text("OK"));
      router.post("/users", () => text("OK"));
      router.get("/users/:id", () => text("OK"));
      router.put("/users/:id", () => text("OK"));
      router.delete("/users/:id", () => text("OK"));

      const openapi = await router.generateOpenAPI(
        { title: "Test API", version: "1.0.0" },
        { includeOperationId: true },
      );

      expect(openapi.paths["/users"].get.operationId).toBe("getUsers");
      expect(openapi.paths["/users"].post.operationId).toBe("postUsers");
      expect(openapi.paths["/users/{id}"].get.operationId).toBe("getUsersId");
      expect(openapi.paths["/users/{id}"].put.operationId).toBe("putUsersId");
      expect(openapi.paths["/users/{id}"].delete.operationId).toBe(
        "deleteUsersId",
      );
    });
  });

  describe("OpenAPI Edge Cases", () => {
    it("should handle routes with no OpenAPI metadata", async () => {
      const router = new Router();

      router.get("/test", () => text("OK"));

      const openapi = await router.generateOpenAPI({
        title: "Test API",
        version: "1.0.0",
      });

      expect(openapi.paths["/test"].get.responses).toBeDefined();
      expect(openapi.paths["/test"].get.summary).toBe("get test");
      expect(openapi.paths["/test"].get.operationId).toBe("getTest");
    });

    it("should handle routes with multiple methods", async () => {
      const router = new Router();

      router.all("/test", () => text("All methods"));

      const openapi = await router.generateOpenAPI({
        title: "Test API",
        version: "1.0.0",
      });

      const path = openapi.paths["/test"];
      expect(path.get).toBeDefined();
      expect(path.post).toBeDefined();
      expect(path.put).toBeDefined();
      expect(path.delete).toBeDefined();
      expect(path.patch).toBeDefined();
    });

    it("should handle routes with same path but different methods and OpenAPI", async () => {
      const router = new Router();

      router.get("/users", () => text("GET"), {
        openApi: {
          summary: "Get users",
          tags: ["users"],
        },
      });

      router.post("/users", () => text("POST"), {
        openApi: {
          summary: "Create user",
          tags: ["users"],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                  },
                },
              },
            },
          },
        },
      });

      const openapi = await router.generateOpenAPI({
        title: "Test API",
        version: "1.0.0",
      });

      const path = openapi.paths["/users"];
      expect(path.get.summary).toBe("Get users");
      expect(path.post.summary).toBe("Create user");
      expect(path.post.requestBody).toBeDefined();
    });
  });
});
