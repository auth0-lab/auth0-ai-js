import { z } from "zod";

import { tool } from "@langchain/core/tools";
import { LangGraphRunnableConfig } from "@langchain/langgraph";

import { getAccessToken } from "../../sdk";

export const buyTool = tool(
  async (input, config: LangGraphRunnableConfig) => {
    const { accessToken } = await getAccessToken(config);

    console.log("----");
    console.log("at", accessToken);
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
