import { tool } from "ai";
import { z } from "zod";

export const getStockMetric = tool({
  description: "Get a stock metric",
  parameters: z.object({
    ticker: z.string(),
    metric: z.enum(["PE", "P/S", "P/B", "P/FCF", "P/EBITDA"]),
  }),
  execute: async ({ ticker, metric }) => {
    console.log(`Getting ${metric} for ${ticker}`);
    return Math.random() * 50;
  },
});
