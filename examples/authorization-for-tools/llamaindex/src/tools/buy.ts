import "dotenv/config";

import { FunctionTool } from "llamaindex";
import z from "zod";

import { FGAAuthorizer } from "@auth0/ai";

import { Context } from "../context";

const fga = FGAAuthorizer.create();

export const buyTool = (context: Context) => {
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

  return FunctionTool.from(
    useFGA(
      async ({ allowed }, { ticker, qty }: { ticker: string; qty: number }) => {
        if (allowed) {
          return { ticker, qty };
        }

        return `The user is not allowed to buy ${ticker}.`;
      }
    ),
    {
      name: "buy",
      description: "Use this function to buy stock",
      parameters: z.object({
        ticker: z.string(),
        qty: z.number(),
      }),
    }
  );
};
