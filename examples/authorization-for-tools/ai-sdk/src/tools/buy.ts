import "dotenv/config";

import { z } from "zod";

import { FGA_AI } from "@auth0/ai-vercel";

import { Context } from "../context";

const fgaAI = new FGA_AI();

export const buy = (context: Context) => {
  const useFGA = fgaAI.withFGA({
    buildQuery: async ({ ticker }) => {
      return {
        user: `user:${context.userId}`,
        object: `asset:${ticker}`,
        relation: "can_buy",
        context: { current_time: new Date().toISOString() },
      };
    },
    onUnauthorized({ ticker }) {
      return `The user is not allowed to buy ${ticker}.`;
    },
  });

  return useFGA({
    description: "Use this function to buy stock",
    parameters: z.object({
      ticker: z.string(),
      qty: z.number(),
    }),
    execute: async ({ ticker, qty }) => {
      return `Purchased ${qty} shares of ${ticker}`;
    },
  });
};
