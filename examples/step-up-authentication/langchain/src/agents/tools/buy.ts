import { z } from "zod";

import { tool } from "@langchain/core/tools";

export const buyTool = tool(
  (input, config) => {
    console.log("----");
    console.log(`Buying: ${input.ticker}`);
    console.log("----");
    return "Trade successful!";
  },
  {
    name: "buy_tool",
    description: "Use this function to buy stock",
    schema: z.object({
      ticker: z.string(),
      qty: z.number(),
    }),
  }
);
