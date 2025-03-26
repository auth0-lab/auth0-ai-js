import { z } from "genkit";
import { GenkitBeta } from "genkit/beta";

import { AccessDeniedError } from "@auth0/ai";
import { Auth0AI, getCIBACredentials } from "@auth0/ai-genkit";

import { Context } from "../context";

const auth0AI = new Auth0AI();

export function buyTool(ai: GenkitBeta) {
  const useCiba = auth0AI.withCIBA({
    userId: async () => {
      const data = ai.currentSession<Context>();
      return data.state?.userId!;
    },

    bindingMessage: async (_: { ticker: string; qty: number }) => {
      return `Do you want to buy ${_.qty} shares of ${_.ticker}`;
    },

    scopes: ["openid", "stock:trade"],

    audience: process.env["AUDIENCE"]!,

    onAuthorizationRequest: "block",

    // If `onError` is not provided, Auth0-AI will respond with a generic error message.
    onUnauthorized: async (e: Error) => {
      console.log("error", e);
      // Custom error handling.
      if (e instanceof AccessDeniedError) {
        return "The user has deny the request";
      }

      return e.message;
    },
  });

  return ai.defineTool(
    {
      name: "buy",
      description: "Use this function to buy stock",
      inputSchema: z.object({
        ticker: z.string(),
        qty: z.number(),
      }),
      outputSchema: z.string(),
    },
    useCiba(async ({ ticker, qty }) => {
      const headers = {
        Authorization: "",
        "Content-Type": "application/json",
      };
      const body = {
        ticker: ticker,
        qty: qty,
      };

      const credentials = getCIBACredentials();
      const accessToken = credentials?.accessToken?.value;

      if (accessToken) {
        headers["Authorization"] = "Bearer " + accessToken;
      }

      const response = await fetch(process.env["API_URL"]!, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(body),
      });

      return response.statusText;
    })
  );
}
