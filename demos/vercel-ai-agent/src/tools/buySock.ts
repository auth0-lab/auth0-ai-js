import { z } from "zod";

import { withCIBA } from "../auth0ai";

export const buyStock = withCIBA({
  description: "Execute an stock purchase given stock ticker and quantity",
  parameters: z.object({
    tradeID: z.string().uuid().describe('The unique identifier for the trade provided by the user'),
    userID: z.string().describe('The user ID of the user who created the conditional trade'),
    ticker: z.string().describe('The stock ticker to trade'),
    qty: z.number().int().positive().describe('The quantity of shares to trade'),
  }),
  execute: async (
    {
      userID,
      ticker,
      qty,
    }: {
      userID: string;
      ticker: string;
      qty: number;
    },
    ctx
  ): Promise<string> => {
    return `Just bought ${qty} shares of ${ticker} for ${userID}`;
  },
});
