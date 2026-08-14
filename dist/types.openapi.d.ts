import { HandlerRouteEntry, HttpMethodLower, HttpMethodUpper } from "./types";
export type OpenApiDesc = {
    summary?: string;
    description?: string;
    tags?: string[];
    operationId?: string;
    parameters?: OpenApiParameter[];
    requestBody?: {
        required?: boolean;
        content: Record<string, {
            schema: OpenApiSchema;
        }>;
    };
    responses?: Record<string, {
        description: string;
        content?: Record<string, {
            schema: OpenApiSchema;
            example?: any;
        }>;
    }>;
    security?: Array<Record<string, string[]>>;
};
export type OpenApiPathItem = {
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
    content: Record<string, {
        schema: OpenApiSchema;
        examples?: Record<string, {
            value: any;
            summary?: string;
        }>;
    }>;
};
export type OpenApiResponse = {
    description: string;
    content?: Record<string, {
        schema: OpenApiSchema;
        examples?: Record<string, {
            value: any;
            summary?: string;
        }>;
    }>;
    headers?: Record<string, {
        description?: string;
        schema: OpenApiSchema;
    }>;
};
export type OpenApiSecurityScheme = {
    type: "apiKey" | "http" | "oauth2" | "openIdConnect";
    description?: string;
    name?: string;
    in?: "query" | "header" | "cookie";
    scheme?: string;
    bearerFormat?: string;
    flows?: {
        implicit?: {
            authorizationUrl: string;
            scopes: Record<string, string>;
        };
        password?: {
            tokenUrl: string;
            scopes: Record<string, string>;
        };
        clientCredentials?: {
            tokenUrl: string;
            scopes: Record<string, string>;
        };
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
    type?: "string" | "number" | "integer" | "boolean" | "array" | "object";
    title?: string;
    description?: string;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    format?: "date" | "date-time" | "email" | "uuid" | "uri" | "hostname" | "ipv4" | "ipv6" | "binary" | "base64" | "byte";
    enum?: string[];
    minimum?: number;
    maximum?: number;
    exclusiveMinimum?: number;
    exclusiveMaximum?: number;
    multipleOf?: number;
    items?: OpenApiSchema;
    minItems?: number;
    maxItems?: number;
    uniqueItems?: boolean;
    properties?: Record<string, OpenApiSchema>;
    required?: string[];
    additionalProperties?: boolean | OpenApiSchema;
    minProperties?: number;
    maxProperties?: number;
    allOf?: OpenApiSchema[];
    anyOf?: OpenApiSchema[];
    oneOf?: OpenApiSchema[];
    not?: OpenApiSchema;
    nullable?: boolean;
    example?: any;
    default?: any;
    readOnly?: boolean;
    writeOnly?: boolean;
    deprecated?: boolean;
    externalDocs?: {
        description?: string;
        url: string;
    };
};
export interface GenerateOpenApiInfo {
    title?: string;
    version?: string;
    description?: string;
    servers?: Array<{
        url: string;
        description?: string;
    }>;
    security?: Array<Record<string, string[]>>;
    components?: {
        schemas?: Record<string, OpenApiSchema>;
        securitySchemes?: Record<string, OpenApiSecurityScheme>;
        parameters?: Record<string, OpenApiParameter>;
        responses?: Record<string, OpenApiResponse>;
        examples?: Record<string, {
            value: any;
            summary?: string;
        }>;
    };
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
}
export declare const SORT_METHOD_PRIORITY_INDEX: Readonly<Map<HttpMethodUpper, number>>;
export interface GenerateOpenAPISortParam {
    method: HttpMethodUpper;
    path: string;
    parts: readonly string[];
    tags: readonly string[];
}
export interface GenerateOpenAPIOptions<ExtendContext extends Record<string, unknown> = Record<string, unknown>> {
    pick?: (entry: GenerateOpenAPISortParam) => boolean;
    includeOperationId?: boolean;
    autoTag?: boolean | ((entry: HandlerRouteEntry<ExtendContext>) => string[]);
    commonParameters?: OpenApiParameter[];
    autoSummary?: boolean;
    cleanOperationId?: boolean;
    sortTagsOrder?: 1 | -1;
    sortMethodOrder?: 1 | -1;
    sortPathnameOrder?: 1 | -1;
    sortMethodPriorityMap?: Map<HttpMethodUpper, number>;
    routeSorter?: (a: GenerateOpenAPISortParam, b: GenerateOpenAPISortParam) => number;
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
    servers?: Array<{
        url: string;
        description?: string;
    }>;
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
    paths: Record<string, Record<HttpMethodLower, OpenApiPathItem>>;
    components?: {
        schemas?: Record<string, OpenApiSchema>;
        securitySchemes?: Record<string, OpenApiSecurityScheme>;
        parameters?: Record<string, OpenApiParameter>;
        responses?: Record<string, OpenApiResponse>;
        examples?: Record<string, {
            value: any;
            summary?: string;
        }>;
    };
    security?: Array<Record<string, string[]>>;
}
//# sourceMappingURL=types.openapi.d.ts.map