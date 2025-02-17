import "dotenv/config";

import { tool } from "ai";
import { z } from "zod";

import { FGAAuthorizer } from "@auth0/ai";

import { Context } from "../context";

const fga = FGAAuthorizer.create();

export const buy = (context: Context) => {
  const useFGA = fga({
    buildQuery: async ({ ticker }) => {
      return {
        user: `user:${context.userId}`,
        object: `asset:${ticker}`,
        relation: "can_buy",
        context: { current_time: new Date().toISOString() },
      };
    },
  });

  return tool({
    description: "Use this function to buy stock",
    parameters: z.object({
      ticker: z.string(),
      qty: z.number(),
    }),
    execute: useFGA(async ({ allowed }, { ticker, qty }) => {
      if (allowed) {
        return { ticker, qty };
      }

      return `The user is not allowed to buy ${ticker}.`;
    }),
  });
};
