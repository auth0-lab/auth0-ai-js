import { tool } from "ai";
import { z } from "zod/v3";

import type { Context } from "hono";

export function createCallProtectedApiTool(_c: Context) {
  // Human-in-the-loop tool: omit execute so the model only proposes the call.
  // The server will execute after user confirmation.
  return tool({
    description:
      "Access protected Auth0 API data for the current user. MUST be explicitly confirmed by the user before execution.",
    inputSchema: z
      .object({
        reason: z.string().describe("Why this call is needed"),
      })
      .strict(),
    // Use a string output to align with cookbook pattern (initial confirmation states are strings)
    outputSchema: z
      .string()
      .describe("Result or status of protected API access"),
    // NO execute function -> forwarded to client for confirmation.
  });
}
