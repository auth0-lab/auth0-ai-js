import { z } from "zod";

import { withCanBuyPermission } from "@/lib/auth0-ai";

export const buyStock = withCanBuyPermission({
  description:
    "Execute a fictional stock purchase given stock ticker and quantity",
  parameters: z.object({
    ticker: z
      .enum(["ATKO", "ZEKO", "ACME"])
      .describe("The stock ticker to trade"),
    qty: z
      .number()
      .int()
      .positive()
      .describe("The quantity of shares to trade"),
  }),
  async execute({ ticker, qty }) {
    return `Just bought ${qty} shares of ${ticker}`;
  },
});
