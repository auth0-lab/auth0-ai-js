/** Reads settings from environment variables. Nothing is hard-coded. */

function required(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name]?.trim();
  if (!value) {
    throw new Error(`Missing environment variable ${name}. See .env.example.`);
  }
  return value;
}

function list(value: string | undefined): string[] {
  return (value ?? "").split(/\s+/).filter((entry) => entry.length > 0);
}

function port(env: NodeJS.ProcessEnv, name: string, fallback: number): number {
  const raw = env[name]?.trim();
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 65535) {
    throw new Error(`Environment variable ${name} must be a port number.`);
  }
  return parsed;
}

function positiveInt(
  env: NodeJS.ProcessEnv,
  name: string,
  fallback: number,
): number {
  const raw = env[name]?.trim();
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`Environment variable ${name} must be a positive integer.`);
  }
  return parsed;
}

export interface McpServerConfig {
  domain: string;
  /** Public URL of the MCP endpoint. Also the audience of access tokens sent to it. */
  serverUrl: string;
  clientId: string;
  clientSecret: string;
  requiredScopes: string[];
  adminScope: string;
  downstreamAudience: string;
  downstreamUrl: string;
  downstreamScope: string;
  /** Longest wait for the downstream API, in milliseconds. */
  downstreamTimeoutMs: number;
  port: number;
}

export interface DownstreamConfig {
  domain: string;
  audience: string;
  requiredScope: string;
  port: number;
}

export function loadMcpServerConfig(
  env: NodeJS.ProcessEnv = process.env,
): McpServerConfig {
  return {
    domain: required(env, "AUTH0_DOMAIN"),
    serverUrl: required(env, "MCP_SERVER_URL"),
    clientId: required(env, "AUTH0_CLIENT_ID"),
    clientSecret: required(env, "AUTH0_CLIENT_SECRET"),
    requiredScopes: list(env["MCP_REQUIRED_SCOPES"]),
    adminScope: required(env, "MCP_ADMIN_SCOPE"),
    downstreamAudience: required(env, "DOWNSTREAM_AUDIENCE"),
    downstreamUrl: required(env, "DOWNSTREAM_URL"),
    downstreamScope: required(env, "DOWNSTREAM_SCOPE"),
    downstreamTimeoutMs: positiveInt(env, "DOWNSTREAM_TIMEOUT_MS", 5000),
    port: port(env, "MCP_PORT", 3001),
  };
}

export function loadDownstreamConfig(
  env: NodeJS.ProcessEnv = process.env,
): DownstreamConfig {
  return {
    domain: required(env, "AUTH0_DOMAIN"),
    audience: required(env, "DOWNSTREAM_AUDIENCE"),
    requiredScope: required(env, "DOWNSTREAM_REQUIRED_SCOPE"),
    port: port(env, "DOWNSTREAM_PORT", 3002),
  };
}
