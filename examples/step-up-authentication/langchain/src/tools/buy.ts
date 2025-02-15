import { z } from "zod";

import { AccessDeniedError, CIBAAuthorizer } from "@auth0/ai";
import { tool } from "@langchain/core/tools";

const ciba = CIBAAuthorizer.create();

const useCiba = ciba({
  userId: async (params) => {
    return params.configurable.userId;
  },
  binding_message: async ({ ticker, qty }) =>
    `Do you want to buy ${qty} shares of ${ticker}`,
  scope: "openid buy:stocks",
  audience: process.env["AUDIENCE"]!,
});

export const buyTool = tool(
  useCiba(
    async ({ accessToken }, { ticker, qty }) => {
      const headers = {
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
  ),
  {
    name: "buy",
    description: "Use this function to buy stock",
    schema: z.object({
      ticker: z.string(),
      qty: z.number(),
    }),
  }
);
