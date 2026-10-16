import type { IncomingMessage, ServerResponse } from "node:http";
import {
  DownscopedTokenError,
  InsufficientScopeError,
  MemoryIndexedTokenStore,
  createMcpClient,
  getCallerMcpClientOrThrow,
  withRequiredScopes,
} from "@auth0/ai-mcp";
import { createNodeMcpHandler } from "@auth0/ai-mcp/mcp-sdk";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { McpServerConfig } from "./config.js";

function failure(message: string) {
  return { ...text(message), isError: true as const };
}

function text(value: string) {
  return { content: [{ type: "text" as const, text: value }] };
}

/** Builds the MCP server for one request. Tools read the caller from the request context. */
function buildServer(config: McpServerConfig): McpServer {
  const server = new McpServer({ name: "reports-example", version: "0.1.0" });

  // Tool 1: calls the downstream API with a token obtained by on-behalf-of
  // exchange. The request-scoped client always acts for the caller of this request.
  server.registerTool(
    "list_reports",
    {
      description:
        "Lists reports from the downstream API, using the caller's identity.",
    },
    async () => {
      try {
        const exchanged = await getCallerMcpClientOrThrow().getTokenOnBehalfOf({
          audience: config.downstreamAudience,
          scope: config.downstreamScope,
        });
        const response = await fetch(
          new URL("/reports", config.downstreamUrl),
          {
            headers: { authorization: `Bearer ${exchanged.accessToken}` },
            signal: AbortSignal.timeout(config.downstreamTimeoutMs),
          },
        );
        if (!response.ok) {
          return failure(`The downstream API answered ${response.status}.`);
        }
        return text(JSON.stringify(await response.json()));
      } catch (error) {
        // Log the error name only. Messages can carry details that must not reach logs or callers.
        console.error(
          "list_reports failed",
          error instanceof Error ? error.name : "unknown",
        );
        if (
          error instanceof DownscopedTokenError ||
          error instanceof InsufficientScopeError
        ) {
          return failure(
            "The downstream API did not grant the required access.",
          );
        }
        return failure("Could not reach the downstream API.");
      }
    },
  );

  // Tool 2: only for callers whose token carries the admin scope. A caller
  // without it gets an error result for this tool; the rest of the server works.
  server.registerTool(
    "admin_summary",
    { description: "Summary for administrators. Needs the admin scope." },
    withRequiredScopes(config.adminScope, async () =>
      text("Administrator summary: all systems normal."),
    ),
  );

  return server;
}

/** Returns a Node request listener that authenticates and serves MCP requests. */
export function createMcpApp(
  config: McpServerConfig,
): (req: IncomingMessage, res: ServerResponse) => Promise<void> {
  const client = createMcpClient({
    domain: config.domain,
    audience: config.serverUrl,
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    // Reuses exchanged tokens for repeat calls by the same caller.
    tokenStore: new MemoryIndexedTokenStore(),
  });

  return createNodeMcpHandler({
    client,
    resource: config.serverUrl,
    authorizationServers: [`https://${config.domain}/`],
    requiredScopes: config.requiredScopes,
    metadata: { resourceName: "Reports example" },
    onError: (error) =>
      console.error(
        "request failed",
        error instanceof Error ? error.name : "unknown",
      ),
    createServer: () => buildServer(config),
  });
}
