import * as jose from "jose";
import { z } from "zod";

export type AuthParams = {
  allowed?: boolean;
  accessToken?: string;
  claims?: jose.JWTPayload;
};

export type ToolWithAuthHandler<I, O, C> = (
  authParams: AuthParams,
  input: I,
  config?: C
) => Promise<O>;

export const Auth0ClientSchema = z.object({
  domain: z.string().default(() => process.env.AUTH0_DOMAIN!),
  clientId: z.string().optional(),
  clientSecret: z
    .union([z.string(), z.undefined()])
    .transform((v) => v ?? process.env.AUTH0_CLIENT_SECRET),
  resourceServerClientId: z
    .union([z.string(), z.undefined()])
    .transform((v) => v ?? process.env.LINKED_CLIENT_ID),
  resourceServerClientSecret: z
    .union([z.string(), z.undefined()])
    .transform((v) => v ?? process.env.LINKED_CLIENT_SECRET),
  telemetry: z.boolean().optional(),
  clientInfo: z
    .object({
      name: z.string(),
    })
    .passthrough()
    .optional(),
}).refine((data) => {
  // Either clientId OR resourceServerClientId must be provided
  return data.clientId || data.resourceServerClientId;
}, {
  message: "Either clientId or resourceServerClientId must be provided",
  path: ["clientId", "resourceServerClientId"]
});

export const Auth0PublicClientSchema = z.object({
  domain: z.string().default(() => process.env.AUTH0_DOMAIN!),
  clientId: z.string().default(() => process.env.AUTH0_CLIENT_ID!),
});

// Base parameters shared by both configurations
export type Auth0ClientBaseParams = {
  domain: string;
  telemetry?: boolean;
  clientInfo?: {
    name: string;
    [key: string]: any;
  };
};

// Union type for client configuration - either SPA client or Resource Server client
export type Auth0ClientParams = Auth0ClientBaseParams & (
  | {
      clientId: string;
      clientSecret?: string;
      resourceServerClientId?: string;
      resourceServerClientSecret?: string;
    }
  | {
      clientId?: string;
      clientSecret?: string;
      resourceServerClientId: string;
      resourceServerClientSecret: string;
    }
);

export type Auth0PublicClientParams = z.infer<typeof Auth0PublicClientSchema>;

export type OnAuthorizationRequest = "block" | "interrupt";
