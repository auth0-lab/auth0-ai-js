import { z } from "zod";

import { FGAAuthorizer } from "@auth0/ai";
import { tool } from "@langchain/core/tools";

const fga = FGAAuthorizer.create();

const useFGA = fga({
  buildQuery: async (params) => {
    return {
      user: `user:${params.configurable.userId}`,
      object: `asset:${params.ticker}`,
      relation: "can_buy",
      context: { current_time: new Date().toISOString() },
    };
  },
});

export const buyTool = tool(
  useFGA(async ({ allowed }, { ticker, qty }) => {
    if (allowed) {
      return { ticker, qty };
    }

    return `The user is not allowed to buy ${ticker}.`;
  }),
  {
    name: "buy",
    description: "Use this function to buy stock",
    schema: z.object({
      ticker: z.string(),
      qty: z.number(),
    }),
  }
);
