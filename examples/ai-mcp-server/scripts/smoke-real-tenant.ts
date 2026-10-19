/**
 * Smoke test against a real Auth0 tenant. It starts the example's downstream API and MCP server
 * on loopback, signs a test user in, connects an MCP client over Streamable HTTP, and calls both
 * tools. The downstream API verifies the exchanged token against the tenant JWKS, so a passing run
 * proves a real on-behalf-of token arrived.
 *
 * The user token comes from the Resource Owner Password grant. That grant is for local testing
 * only. Production clients should use the authorization code flow with PKCE.
 *
 * Nothing secret is printed: only token lengths and claim names.
 */
import { createServer } from "node:http";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { decodeJwt } from "jose";
import { loadDownstreamConfig, loadMcpServerConfig } from "../src/config.js";
import { createDownstreamServer } from "../src/downstream-api.js";
import { createMcpApp } from "../src/mcp-app.js";

const results: { name: string; ok: boolean; detail: string }[] = [];

function record(name: string, ok: boolean, detail = ""): boolean {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
  return ok;
}

function need(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing environment variable ${name}. See .env.example.`);
  return value;
}

function listen(server: Server): Promise<number> {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve((server.address() as AddressInfo).port));
  });
}

function close(server: Server | undefined): Promise<void> {
  if (!server?.listening) return Promise.resolve();
  server.closeAllConnections();
  return new Promise((resolve) => server.close(() => resolve()));
}

/** Resource Owner Password grant. Local testing only. */
async function signIn(domain: string, audience: string): Promise<string> {
  const body: Record<string, string> = {
    grant_type: process.env["SMOKE_REALM"]?.trim()
      ? "http://auth0.com/oauth/grant-type/password-realm"
      : "password",
    client_id: need("SMOKE_LOGIN_CLIENT_ID"),
    username: need("SMOKE_USERNAME"),
    password: need("SMOKE_PASSWORD"),
    audience,
    scope: process.env["SMOKE_SCOPE"]?.trim() || "openid",
  };
  const secret = process.env["SMOKE_LOGIN_CLIENT_SECRET"]?.trim();
  if (secret) body["client_secret"] = secret;
  const realm = process.env["SMOKE_REALM"]?.trim();
  if (realm) body["realm"] = realm;

  const response = await fetch(`https://${domain}/oauth/token`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  const json = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok || typeof json["access_token"] !== "string") {
    const code = typeof json["error"] === "string" ? json["error"] : "unknown";
    throw new Error(`Sign-in failed with HTTP ${response.status} (${code}).`);
  }
  return json["access_token"];
}

function resultText(result: unknown): { isError: boolean; text: string } {
  const r = result as { isError?: boolean; content?: { type: string; text?: string }[] };
  const text = (r.content ?? []).map((c) => (c.type === "text" ? (c.text ?? "") : "")).join("");
  return { isError: r.isError === true, text };
}

async function main(): Promise<void> {
  let downstream: Server | undefined;
  let mcp: Server | undefined;
  let client: Client | undefined;
  try {
    // Ports are chosen by the OS, so the smoke never collides with a running server.
    process.env["MCP_PORT"] = "0";
    process.env["DOWNSTREAM_PORT"] = "0";
    const downstreamConfig = loadDownstreamConfig();
    downstream = createDownstreamServer(downstreamConfig);
    const downstreamPort = await listen(downstream);
    process.env["DOWNSTREAM_URL"] = `http://127.0.0.1:${downstreamPort}`;

    const config = loadMcpServerConfig();
    const app = createMcpApp(config);
    mcp = createServer((req, res) => void app(req, res));
    const mcpPort = await listen(mcp);
    record("servers started", true, `mcp port ${mcpPort}, downstream port ${downstreamPort}`);

    const userToken = await signIn(config.domain, config.serverUrl);
    const claims = decodeJwt(userToken);
    record(
      "user token issued",
      true,
      `length ${userToken.length}, claims ${Object.keys(claims).sort().join(",")}`,
    );

    client = new Client({ name: "smoke-real-tenant", version: "0.1.0" });
    await client.connect(
      new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${mcpPort}/mcp`), {
        requestInit: { headers: { authorization: `Bearer ${userToken}` } },
      }),
    );
    record("mcp client connected", true);

    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name).sort();
    record(
      "tools listed",
      names.includes("list_reports") && names.includes("admin_summary"),
      names.join(","),
    );

    const reports = resultText(await client.callTool({ name: "list_reports", arguments: {} }));
    let reportCount = -1;
    try {
      reportCount = (JSON.parse(reports.text) as { reports: unknown[] }).reports.length;
    } catch {
      // Leave reportCount at -1; the check below fails.
    }
    record(
      "list_reports returned data fetched with an exchanged token",
      !reports.isError && reportCount > 0,
      reports.isError ? "tool error" : `${reportCount} reports`,
    );

    const admin = resultText(await client.callTool({ name: "admin_summary", arguments: {} }));
    record("admin_summary allowed for the caller", !admin.isError, admin.isError ? "tool error" : "ok");
  } catch (error) {
    // Only the error class and a message the script itself wrote are printed.
    const message = error instanceof Error && error.message.startsWith("Sign-in failed")
      ? error.message
      : error instanceof Error && error.message.startsWith("Missing environment variable")
        ? error.message
        : error instanceof Error
          ? error.name
          : "unknown";
    record("run completed without errors", false, message);
  } finally {
    await client?.close().catch(() => undefined);
    await Promise.all([close(mcp), close(downstream)]);
  }

  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exitCode = failed === 0 ? 0 : 1;
}

void main();
