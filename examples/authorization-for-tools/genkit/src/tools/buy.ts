import { GenkitBeta, z } from "genkit/beta";

import { Auth0AI } from "@auth0/ai-genkit";

import { Context } from "../context";

const auth0AI = new Auth0AI.FGA();

export function buyTool(ai: GenkitBeta) {
  const useFGA = auth0AI.withFGA({
    buildQuery: async ({ ticker }) => {
      const data = ai.currentSession<Context>();

      return {
        user: `user:${data.state?.userId!}`,
        object: `asset:${ticker}`,
        relation: "can_buy",
        context: { current_time: new Date().toISOString() },
      };
    },
    onUnauthorized(params) {
      return `The user is not allowed to buy ${params.ticker}.`;
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
    useFGA(async ({ ticker, qty }) => {
      return `Purchased ${qty} shares of ${ticker}`;
    })
  );
}
