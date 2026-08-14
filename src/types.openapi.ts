// src/types.openapi.ts

import { HandlerRouteEntry, HttpMethodLower, HttpMethodUpper } from "./types";

export type OpenApiDesc = {
  summary?: string;
  description?: string;
  tags?: string[];
  operationId?: string;
  parameters?: OpenApiParameter[];
  requestBody?: {
    required?: boolean;
    content: Record<
      string,
      {
        schema: OpenApiSchema;
      }
    >;
  };
  responses?: Record<
    string,
    {
      description: string;
      content?: Record<
        string,
        {
          schema: OpenApiSchema;
          example?: any;
        }
      >;
    }
  >;
  security?: Array<Record<string, string[]>>;
};

export type OpenApiOperation = {
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: OpenApiParameter[];
  requestBody?: OpenApiRequestBody;
  responses: Record<string, OpenApiResponse>;
  security?: Array<Record<string, string[]>>;
  operationId?: string;
};

export type OpenApiRequestBody = {
  required?: boolean;
  content: Record<
    string,
    {
      schema: OpenApiSchema;
      examples?: Record<string, { value: any; summary?: string }>;
    }
  >;
};

export type OpenApiResponse = {
  description: string;
  content?: Record<
    string,
    {
      schema: OpenApiSchema;
      examples?: Record<string, { value: any; summary?: string }>;
    }
  >;
  headers?: Record<
    string,
    {
      description?: string;
      schema: OpenApiSchema;
    }
  >;
};

export type OpenApiSecurityScheme = {
  type: "apiKey" | "http" | "oauth2" | "openIdConnect";
  description?: string;
  name?: string;
  in?: "query" | "header" | "cookie";
  scheme?: string;
  bearerFormat?: string;
  flows?: {
    implicit?: { authorizationUrl: string; scopes: Record<string, string> };
    password?: { tokenUrl: string; scopes: Record<string, string> };
    clientCredentials?: { tokenUrl: string; scopes: Record<string, string> };
    authorizationCode?: {
      authorizationUrl: string;
      tokenUrl: string;
      scopes: Record<string, string>;
    };
  };
  openIdConnectUrl?: string;
};

export type OpenApiParameter = {
  name: string;
  description?: string;
  in: "query" | "header" | "path" | "cookie";
  required?: boolean;
  schema: OpenApiSchema;
};

export type OpenApiSchema = {
  // Type
  type?: "string" | "number" | "integer" | "boolean" | "array" | "object";

  // Documentation
  title?: string;
  description?: string;

  // String
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?:
    | "date"
    | "date-time"
    | "email"
    | "uuid"
    | "uri"
    | "hostname"
    | "ipv4"
    | "ipv6"
    | "binary"
    | "base64"
    | "byte";
  enum?: string[];

  // Number
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  multipleOf?: number;

  // Array
  items?: OpenApiSchema;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;

  // Object
  properties?: Record<string, OpenApiSchema>;
  required?: string[];
  additionalProperties?: boolean | OpenApiSchema;
  minProperties?: number;
  maxProperties?: number;

  // Composition
  allOf?: OpenApiSchema[];
  anyOf?: OpenApiSchema[];
  oneOf?: OpenApiSchema[];
  not?: OpenApiSchema;

  // Additional
  nullable?: boolean;
  example?: any;
  default?: any;
  readOnly?: boolean;
  writeOnly?: boolean;
  deprecated?: boolean;

  // External docs
  externalDocs?: {
    description?: string;
    url: string;
  };
};

export interface GenerateOpenApiInfo {
  title?: string;
  version?: string;
  description?: string;
  servers?: Array<{ url: string; description?: string }>;
  security?: Array<Record<string, string[]>>;
  components?: {
    schemas?: Record<string, OpenApiSchema>;
    securitySchemes?: Record<string, OpenApiSecurityScheme>;
    parameters?: Record<string, OpenApiParameter>;
    responses?: Record<string, OpenApiResponse>;
    examples?: Record<string, { value: any; summary?: string }>;
  };
  // Additional OpenAPI info fields
  termsOfService?: string;
  contact?: {
    name?: string;
    url?: string;
    email?: string;
  };
  license?: {
    name: string;
    url?: string;
  };
  // Tags for grouping - these are GLOBAL tags that should be applied to operations
  tags?: Array<{
    name: string;
    description?: string;
    externalDocs?: {
      description?: string;
      url: string;
    };
  }>;
  // External documentation
  externalDocs?: {
    description?: string;
    url: string;
  };
}

export const SORT_METHOD_PRIORITY_INDEX = Object.freeze(
  new Map<HttpMethodUpper, number>([
    ["HEAD", 0],
    ["GET", 1],
    ["POST", 2],
    ["PUT", 3],
    ["PATCH", 4],
    ["DELETE", 5],
    ["OPTIONS", 6],
    ["TRACE", 7],
  ]),
);

export interface GenerateOpenAPISortParam {
  method: HttpMethodUpper;
  path: string;
  parts: readonly string[];
  tags: readonly string[];
}

export interface GenerateOpenAPIOptions<
  ExtendContext extends Record<string, unknown> = Record<string, unknown>,
> {
  // Filter to pick route entry if true is returned otherwise skipped
  pick?: (entry: GenerateOpenAPISortParam) => boolean;
  // Include operationId in responses
  includeOperationId?: boolean;
  // Group by tags automatically - when true, uses first path segment as tag
  autoTag?: boolean | ((entry: HandlerRouteEntry<ExtendContext>) => string[]);
  // Add common parameters to all operations
  commonParameters?: OpenApiParameter[];
  // Generate summary from route path if not provided
  autoSummary?: boolean;
  // Clean operation IDs (remove special chars)
  cleanOperationId?: boolean;
  // Sort order for tags for the default sorter
  sortTagsOrder?: 1 | -1;
  // Sort order for method for the default sorter
  sortMethodOrder?: 1 | -1;
  // Sort order for pathname for the default sorter
  sortPathnameOrder?: 1 | -1;
  // Method priority map for the default sorter
  sortMethodPriorityMap?: Map<HttpMethodUpper, number>;
  // Predicate to sort routes by their pathname
  routeSorter?: (
    a: GenerateOpenAPISortParam,
    b: GenerateOpenAPISortParam,
  ) => number;
}

export interface GeneratedOpenApi {
  openapi: "3.0.0";
  info: {
    title: string;
    version: string;
    description?: string;
    termsOfService?: string;
    contact?: {
      name?: string;
      url?: string;
      email?: string;
    };
    license?: {
      name: string;
      url?: string;
    };
  };
  servers?: Array<{ url: string; description?: string }>;
  tags?: Array<{
    name: string;
    description?: string;
    externalDocs?: {
      description?: string;
      url: string;
    };
  }>;
  externalDocs?: {
    description?: string;
    url: string;
  };
  paths: Record<string, Record<HttpMethodLower, OpenApiOperation>>;
  components?: {
    schemas?: Record<string, OpenApiSchema>;
    securitySchemes?: Record<string, OpenApiSecurityScheme>;
    parameters?: Record<string, OpenApiParameter>;
    responses?: Record<string, OpenApiResponse>;
    examples?: Record<string, { value: any; summary?: string }>;
  };
  security?: Array<Record<string, string[]>>;
}
