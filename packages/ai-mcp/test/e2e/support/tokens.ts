/**
 * Token helpers. They call the tenant token endpoint only. Returned tokens are never logged, and
 * failures report the HTTP status and the OAuth `error` code, never a body that could echo input.
 */
import type { E2eEnv } from "./env.js";

async function tokenRequest(env: E2eEnv, form: Record<string, string>): Promise<string> {
  const response = await fetch(`https://${env.domain}/oauth/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(form),
  });
  const body = (await response.json().catch(() => ({}))) as { access_token?: string; error?: string };
  if (!response.ok || typeof body.access_token !== "string") {
    throw new Error(`Token request failed: status ${response.status}, error ${body.error ?? "unknown"}`);
  }
  return body.access_token;
}

export interface UserTokenOptions {
  /** Audience of the token. Defaults to the MCP API. */
  audience?: string;
  /** Space-separated scopes. Defaults to the downstream scope. */
  scope?: string;
}

/** Password-realm grant for the test user through the login client. Returns the access token. */
export function getUserToken(env: E2eEnv, options: UserTokenOptions = {}): Promise<string> {
  return tokenRequest(env, {
    grant_type: "http://auth0.com/oauth/grant-type/password-realm",
    realm: env.realm,
    username: env.username,
    password: env.password,
    client_id: env.loginClientId,
    client_secret: env.loginClientSecret,
    audience: options.audience ?? env.mcpAudience,
    scope: options.scope ?? env.downstreamScope,
  });
}

export interface ClientCredentialsOptions {
  audience: string;
  scope?: string;
  /** Organization id; the token then carries `org_id`. */
  organization?: string;
  /** Which client authenticates. Defaults to the M2M client. */
  clientId?: string;
  clientSecret?: string;
}

/** Client credentials grant. Defaults to the M2M client of the contract. */
export function getClientCredentialsToken(env: E2eEnv, options: ClientCredentialsOptions): Promise<string> {
  return tokenRequest(env, {
    grant_type: "client_credentials",
    client_id: options.clientId ?? env.m2mClientId,
    client_secret: options.clientSecret ?? env.m2mClientSecret,
    audience: options.audience,
    ...(options.scope !== undefined && { scope: options.scope }),
    ...(options.organization !== undefined && { organization: options.organization }),
  });
}

/** Decodes the payload of a JWT without verifying it. For assertions on claim names only. */
export function decodeClaims(token: string): Record<string, unknown> {
  const payload = token.split(".")[1] ?? "";
  return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Record<string, unknown>;
}
