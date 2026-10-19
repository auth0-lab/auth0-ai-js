/**
 * Boots the handler under test on an ephemeral localhost port: a real `http.Server` mounted with
 * `createNodeMcpHandler`, a real `createMcpClient` against the tenant, and tools that call the
 * downstream API through the request-scoped client.
 */
import { createServer } from "node:http";
import type { Server as HttpServer } from "node:http";
import type { AddressInfo } from "node:net";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createMcpClient } from "../../../src/client.js";
import type { McpClient } from "../../../src/client.js";
import { createNodeMcpHandler } from "../../../src/mcp-sdk.js";
import { getRequestContext } from "../../../src/request-context.js";
import type { McpClientOptions } from "../../../src/types.js";
import type { E2eEnv } from "./env.js";

export interface E2eMcpServerOptions {
  env: E2eEnv;
  /** Downstream API URL the `delegate` tool calls (see `startDownstreamApi`). */
  downstreamUrl: string;
  /** Audience the server accepts. Defaults to the MCP API of the contract. */
  audience?: string;
  scopeMatching?: McpClientOptions["scopeMatching"];
  tokenStore?: McpClientOptions["tokenStore"];
  organizationPolicy?: McpClientOptions["organizationPolicy"];
  organizationId?: McpClientOptions["organizationId"];
  /** Scopes every request must carry (handler level, answered with 403). */
  requiredScopes?: readonly string[];
  /** Registers more tools. Each tool must read the caller from `getRequestContext()`. */
  registerTools?: (mcp: McpServer, deps: { downstreamUrl: string; env: E2eEnv }) => void;
}

export interface E2eMcpServer {
  /** MCP endpoint, `http://127.0.0.1:<port>/mcp`. */
  url: URL;
  /** The wrapper client the handler uses. */
  client: McpClient;
  close(): Promise<void>;
}

function json(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value) }] };
}

/** Outcome the `delegate` tool reports: what the downstream API answered, never a token. */
export interface DelegateResult {
  status: number;
  body: Record<string, unknown>;
  /** Scopes the wrapper reports as granted for the exchanged token. */
  grantedScopes: string[];
}

function buildTools(deps: { downstreamUrl: string; env: E2eEnv }): McpServer {
  const mcp = new McpServer({ name: "e2e", version: "1.0.0" });

  mcp.registerTool("whoami", { description: "Reports the caller seen inside the tool." }, async () => {
    const context = getRequestContext();
    return json({
      sub: context?.principal.sub ?? null,
      clientId: context?.principal.clientId ?? null,
      orgId: context?.principal.orgId ?? null,
      scopes: context ? [...context.principal.scopes] : [],
    });
  });

  mcp.registerTool(
    "delegate",
    {
      description: "Exchanges the caller's token for the downstream API and calls it.",
      inputSchema: { scope: z.string().optional(), audience: z.string().optional() },
    },
    async ({ scope, audience }) => {
      const context = getRequestContext();
      if (context === undefined) throw new Error("No request context.");
      const exchanged = await context.mcpClient.getTokenOnBehalfOf({
        audience: audience ?? deps.env.downstreamAudience,
        scope: scope ?? deps.env.downstreamScope,
      });
      const response = await fetch(deps.downstreamUrl, {
        headers: { authorization: `Bearer ${exchanged.accessToken}` },
      });
      const result: DelegateResult = {
        status: response.status,
        body: (await response.json()) as Record<string, unknown>,
        grantedScopes: [...(exchanged.grantedScopes ?? [])],
      };
      return json(result);
    },
  );

  return mcp;
}

/** Starts the server. Always `close()` it in `afterEach` or `afterAll`. */
export async function startMcpServer(options: E2eMcpServerOptions): Promise<E2eMcpServer> {
  const { env } = options;
  const audience = options.audience ?? env.mcpAudience;
  const client = createMcpClient({
    domain: env.domain,
    audience,
    clientId: env.oboClientId,
    clientSecret: env.oboClientSecret,
    ...(options.scopeMatching !== undefined && { scopeMatching: options.scopeMatching }),
    ...(options.tokenStore !== undefined && { tokenStore: options.tokenStore }),
    ...(options.organizationPolicy !== undefined && { organizationPolicy: options.organizationPolicy }),
    ...(options.organizationId !== undefined && { organizationId: options.organizationId }),
  });
  const deps = { downstreamUrl: options.downstreamUrl, env };

  const listener = createNodeMcpHandler({
    client,
    resource: audience,
    authorizationServers: [env.issuer],
    ...(options.requiredScopes !== undefined && { requiredScopes: options.requiredScopes }),
    createServer: () => {
      const mcp = buildTools(deps);
      options.registerTools?.(mcp, deps);
      return mcp;
    },
  });
  const httpServer: HttpServer = createServer((req, res) => void listener(req, res));
  await new Promise<void>((resolve) => httpServer.listen(0, "127.0.0.1", resolve));
  const port = (httpServer.address() as AddressInfo).port;

  return {
    url: new URL(`http://127.0.0.1:${port}/mcp`),
    client,
    async close() {
      httpServer.closeAllConnections();
      await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    },
  };
}
