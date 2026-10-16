import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createServer } from "node:http";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { setupServer } from "msw/node";
import { SignJWT, createLocalJWKSet } from "jose";
import {
  createAuth0Handlers,
  createTestKey,
  exportJwks,
  mintAccessToken,
  mintUnsignedToken,
  scopeMode,
} from "../../../packages/ai-mcp/test/support/index.js";
import type { TestKey } from "../../../packages/ai-mcp/test/support/index.js";
import type { DownstreamConfig, McpServerConfig } from "../src/config.js";
import { createDownstreamServer } from "../src/downstream-api.js";
import { createMcpApp } from "../src/mcp-app.js";

// Offline: Auth0 is replaced by MSW handlers; both servers listen on loopback.
const MCP_URL = "https://mcp.example.com/mcp";
const DOWNSTREAM_AUDIENCE = "https://reports.example.com";

let key: TestKey;
let tenant: ReturnType<typeof createAuth0Handlers>;
let downstream: Server;
let mcp: Server;
let mcpPort: number;
let downstreamPort: number;

const msw = setupServer();

function listen(server: Server): Promise<number> {
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () =>
      resolve((server.address() as AddressInfo).port),
    );
  });
}

beforeAll(async () => {
  key = await createTestKey();
  tenant = createAuth0Handlers({ key, scope: scopeMode.echo });
  msw.listen({
    onUnhandledRequest(request, print) {
      if (new URL(request.url).hostname === "127.0.0.1") return;
      print.error();
    },
  });
  // The handlers come from the package test support, which may resolve its own copy of msw.
  msw.use(...(tenant.handlers as unknown as Parameters<typeof msw.use>));

  const downstreamConfig: DownstreamConfig = {
    domain: "tenant.example.com",
    audience: DOWNSTREAM_AUDIENCE,
    requiredScope: "read:reports",
    port: 0,
  };
  downstream = createDownstreamServer(
    downstreamConfig,
    createLocalJWKSet(
      exportJwks(key) as Parameters<typeof createLocalJWKSet>[0],
    ),
  );
  downstreamPort = await listen(downstream);

  const mcpConfig: McpServerConfig = {
    domain: "tenant.example.com",
    serverUrl: MCP_URL,
    clientId: "mcp-client",
    clientSecret: "secret",
    requiredScopes: [],
    adminScope: "read:admin",
    downstreamAudience: DOWNSTREAM_AUDIENCE,
    downstreamUrl: `http://127.0.0.1:${downstreamPort}`,
    downstreamScope: "read:reports",
    downstreamTimeoutMs: 2000,
    port: 0,
  };
  const app = createMcpApp(mcpConfig);
  mcp = createServer((req, res) => void app(req, res));
  mcpPort = await listen(mcp);
});

afterEach(() => tenant.state.reset());
afterAll(async () => {
  msw.close();
  await Promise.all(
    [mcp, downstream].map((s) => new Promise((resolve) => s.close(resolve))),
  );
});

function callerToken(scope: string, sub = "user|1") {
  return mintAccessToken(key, {
    iss: tenant.issuer,
    aud: MCP_URL,
    sub,
    scope,
    claims: { client_id: "client-a" },
  });
}

async function callTool(name: string, token?: string) {
  return fetch(`http://127.0.0.1:${mcpPort}/mcp`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      ...(token && { authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name, arguments: {} },
    }),
  });
}

interface ToolResult {
  result?: { isError?: boolean; content: Array<{ text: string }> };
}

describe("example MCP server", () => {
  it("rejects a request without a credential", async () => {
    const response = await callTool("list_reports");
    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toMatch(/^Bearer /);
  });

  it("lists reports from the downstream API with an exchanged token", async () => {
    const response = await callTool(
      "list_reports",
      await callerToken("openid"),
    );
    const body = (await response.json()) as ToolResult;

    expect(response.status).toBe(200);
    expect(body.result?.isError).toBeFalsy();
    expect(JSON.parse(body.result!.content[0]!.text)).toMatchObject({
      reports: [{ id: "r-1" }, { id: "r-2" }],
    });
    expect(tenant.state.successfulExchangeCount).toBe(1);
    expect(tenant.state.lastExchangeRequest?.params["audience"]).toBe(
      DOWNSTREAM_AUDIENCE,
    );
  });

  it("never returns exchange error text in the tool result", async () => {
    tenant.state.failure = {
      status: 400,
      body: {
        error: "invalid_grant",
        error_description: "SECRET-INTERNAL-DETAIL tenant.example.com",
      },
    };
    // A caller no earlier test used, so a cached exchange cannot hide the failure.
    const response = await callTool(
      "list_reports",
      await callerToken("openid", "user|failing"),
    );
    const raw = await response.text();
    const body = JSON.parse(raw) as ToolResult;

    expect(body.result?.isError).toBe(true);
    expect(body.result?.content[0]?.text).toBe(
      "Could not reach the downstream API.",
    );
    expect(raw).not.toContain("SECRET-INTERNAL-DETAIL");
    expect(raw).not.toContain("invalid_grant");
  });

  it("denies the admin tool per tool, with HTTP 200 and an error result", async () => {
    const response = await callTool(
      "admin_summary",
      await callerToken("openid"),
    );
    const body = (await response.json()) as ToolResult;

    expect(response.status).toBe(200);
    expect(body.result?.isError).toBe(true);
  });

  it("runs the admin tool for a caller with the admin scope", async () => {
    const response = await callTool(
      "admin_summary",
      await callerToken("openid read:admin"),
    );
    const body = (await response.json()) as ToolResult;

    expect(body.result?.isError).toBeFalsy();
    expect(body.result?.content[0]?.text).toContain("Administrator summary");
  });
});

describe("example downstream API", () => {
  function get(token?: string) {
    return fetch(`http://127.0.0.1:${downstreamPort}/reports`, {
      headers: token ? { authorization: `Bearer ${token}` } : {},
    });
  }

  it("answers 401 without a token", async () => {
    expect((await get()).status).toBe(401);
  });

  it("answers 401 for a token issued for another audience", async () => {
    const token = await mintAccessToken(key, {
      iss: tenant.issuer,
      aud: "https://other.example.com",
      sub: "user|1",
      scope: "read:reports",
    });
    expect((await get(token)).status).toBe(401);
  });

  it("answers 403 when the scope is missing", async () => {
    const token = await mintAccessToken(key, {
      iss: tenant.issuer,
      aud: DOWNSTREAM_AUDIENCE,
      sub: "user|1",
      scope: "other:scope",
    });
    expect((await get(token)).status).toBe(403);
  });

  it("answers 200 for a valid token", async () => {
    const token = await mintAccessToken(key, {
      iss: tenant.issuer,
      aud: DOWNSTREAM_AUDIENCE,
      sub: "user|1",
      scope: "read:reports",
    });
    expect((await get(token)).status).toBe(200);
  });

  it("answers 401 for an unsigned alg:none token", async () => {
    const token = mintUnsignedToken({
      iss: tenant.issuer,
      aud: DOWNSTREAM_AUDIENCE,
      sub: "user|1",
      scope: "read:reports",
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    expect((await get(token)).status).toBe(401);
  });

  it("answers 401 for an HS256 token signed with the public key material", async () => {
    const secret = new TextEncoder().encode(JSON.stringify(key.publicJwk));
    const token = await new SignJWT({ scope: "read:reports" })
      .setProtectedHeader({ alg: "HS256", kid: key.kid })
      .setIssuer(tenant.issuer)
      .setAudience(DOWNSTREAM_AUDIENCE)
      .setSubject("user|1")
      .setExpirationTime("1h")
      .sign(secret);
    expect((await get(token)).status).toBe(401);
  });

  it("answers 401 for an expired token", async () => {
    const token = await mintAccessToken(key, {
      iss: tenant.issuer,
      aud: DOWNSTREAM_AUDIENCE,
      sub: "user|1",
      scope: "read:reports",
      exp: Math.floor(Date.now() / 1000) - 3600,
    });
    expect((await get(token)).status).toBe(401);
  });
});
