/**
 * Environment contract of the real-tenant e2e suite. Values are read from `process.env`;
 * nothing here ever prints a value.
 */

/** Variables every scenario needs. */
const BASE_REQUIRED = [
  "AUTH0_E2E_DOMAIN",
  "AUTH0_E2E_MCP_AUDIENCE",
  "AUTH0_E2E_DOWNSTREAM_AUDIENCE",
  "AUTH0_E2E_OBO_CLIENT_ID",
  "AUTH0_E2E_OBO_CLIENT_SECRET",
  "AUTH0_E2E_LOGIN_CLIENT_ID",
  "AUTH0_E2E_LOGIN_CLIENT_SECRET",
  "AUTH0_E2E_USERNAME",
  "AUTH0_E2E_PASSWORD",
  "AUTH0_E2E_REALM",
] as const;

/** Extra variables only some scenarios need. Pass them to {@link loadE2eEnv}. */
export const M2M_VARS = ["AUTH0_E2E_M2M_CLIENT_ID", "AUTH0_E2E_M2M_CLIENT_SECRET"] as const;
export const ORG_VARS = ["AUTH0_E2E_ORG_ID"] as const;

export interface E2eEnv {
  /** True when `AUTH0_E2E=1`. Specs use `describe.skipIf(!e2e.enabled)`. */
  enabled: boolean;
  /** Tenant domain, for example `example.us.auth0.com`. Empty when disabled. */
  domain: string;
  /** Issuer URL, `https://<domain>/`. */
  issuer: string;
  /** Identifier of the MCP API (audience of the user access token). */
  mcpAudience: string;
  /** Identifier of the downstream API the server exchanges for. */
  downstreamAudience: string;
  /** Scope requested for the downstream API. Defaults to `work:read`. */
  downstreamScope: string;
  oboClientId: string;
  oboClientSecret: string;
  loginClientId: string;
  loginClientSecret: string;
  username: string;
  password: string;
  realm: string;
  m2mClientId: string;
  m2mClientSecret: string;
  orgId: string;
  /** Optional hand-supplied expired access token for the MCP API. */
  expiredToken: string;
}

function read(name: string): string {
  return process.env[name] ?? "";
}

/**
 * Reads the contract. When `AUTH0_E2E` is not `1` it returns a disabled, empty value so the
 * suite is skipped. When it is `1` and a required variable is missing it throws an error naming
 * the missing variables (never values), which fails the spec file loudly.
 *
 * @param extra - Additional required variable names, for example {@link M2M_VARS}.
 */
export function loadE2eEnv(extra: readonly string[] = []): E2eEnv {
  const enabled = process.env["AUTH0_E2E"] === "1";
  if (enabled) {
    const missing = [...BASE_REQUIRED, ...extra].filter((name) => read(name) === "");
    if (missing.length > 0) {
      throw new Error(`AUTH0_E2E=1 but required variables are missing: ${missing.join(", ")}`);
    }
  }
  const domain = read("AUTH0_E2E_DOMAIN");
  return {
    enabled,
    domain,
    issuer: domain === "" ? "" : `https://${domain}/`,
    mcpAudience: read("AUTH0_E2E_MCP_AUDIENCE"),
    downstreamAudience: read("AUTH0_E2E_DOWNSTREAM_AUDIENCE"),
    downstreamScope: read("AUTH0_E2E_DOWNSTREAM_SCOPE") || "work:read",
    oboClientId: read("AUTH0_E2E_OBO_CLIENT_ID"),
    oboClientSecret: read("AUTH0_E2E_OBO_CLIENT_SECRET"),
    loginClientId: read("AUTH0_E2E_LOGIN_CLIENT_ID"),
    loginClientSecret: read("AUTH0_E2E_LOGIN_CLIENT_SECRET"),
    username: read("AUTH0_E2E_USERNAME"),
    password: read("AUTH0_E2E_PASSWORD"),
    realm: read("AUTH0_E2E_REALM"),
    m2mClientId: read("AUTH0_E2E_M2M_CLIENT_ID"),
    m2mClientSecret: read("AUTH0_E2E_M2M_CLIENT_SECRET"),
    orgId: read("AUTH0_E2E_ORG_ID"),
    expiredToken: read("AUTH0_E2E_EXPIRED_TOKEN"),
  };
}
