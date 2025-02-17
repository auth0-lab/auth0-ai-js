import { Genkit, z } from "genkit";

import { FGAAuthorizer } from "@auth0/ai";

import { Context } from "../context";

const fga = FGAAuthorizer.create();

export function buyTool(ai: Genkit) {
  const useFGA = fga({
    buildQuery: async ({ ticker }) => {
      const data = ai.currentSession<Context>();

      return {
        user: `user:${data.state?.userId!}`,
        object: `asset:${ticker}`,
        relation: "can_buy",
        context: { current_time: new Date().toISOString() },
      };
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
    useFGA(async ({ allowed }, { ticker, qty }) => {
      if (allowed) {
        return `${qty} of ${ticker} bought successfully`;
      }

      return `The user is not allowed to buy ${ticker}.`;
    })
  );
}
