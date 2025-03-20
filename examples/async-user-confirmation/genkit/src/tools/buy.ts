import { Genkit, z } from "genkit";

import { AccessDeniedError, CIBAAuthorizer } from "@auth0/ai";

import { Context } from "../context";

const ciba = CIBAAuthorizer.create();

export function buyTool(ai: Genkit) {
  const useCiba = ciba({
    userId: async () => {
      const data = ai.currentSession<Context>();
      return data.state?.userId!;
    },
    bindingMessage: async ({ ticker, qty }) =>
      `Do you want to buy ${qty} shares of ${ticker}`,
    scope: "openid stock:trade",
    audience: process.env["AUDIENCE"]!,
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
    useCiba(
      async ({ accessToken }, { ticker, qty }) => {
        const headers = {
          Authorization: "",
          "Content-Type": "application/json",
        };
        const body = {
          ticker: ticker,
          qty: qty,
        };

        if (accessToken) {
          headers["Authorization"] = "Bearer " + accessToken;
        }

        const response = await fetch(process.env["API_URL"]!, {
          method: "POST",
          headers: headers,
          body: JSON.stringify(body),
        });

        return response.statusText;
      },
      // If `onError` is not provided, Auth0-AI will respond with a generic error message.
      async (e: Error) => {
        // Custom error handling.
        if (e instanceof AccessDeniedError) {
          return "The user has deny the request";
        }

        return e.message;
      }
    )
  );
}
