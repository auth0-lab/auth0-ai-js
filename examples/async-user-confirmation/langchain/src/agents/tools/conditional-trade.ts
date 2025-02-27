import { z } from "zod";

import { tool } from "@langchain/core/tools";
import { LangGraphRunnableConfig } from "@langchain/langgraph";

import { SchedulerClient } from "../../services/client";

export const conditionalTrade = tool(
  async (input, config: LangGraphRunnableConfig) => {
    // Schedule the conditional trade
    await SchedulerClient().schedule("conditional-trade", {
      config: {
        configurable: {
          user_id: config?.configurable?.user_id,
        },
      },
      input: {
        data: {
          ...input,
        },
      },
    });

    console.log("----");
    console.log(`Starting conditional trading for: ${input.ticker}`);
    console.log("----");

    return "Conditional trading started";
  },
  {
    name: "conditional_trade_tool",
    description: "Use this function to trade an stock under certain conditions",
    schema: z.object({
      ticker: z.string(),
      qty: z.number(),
      metric: z
        .enum(["P/E", "EPS", "P/B", "D/E", "ROE", "RSI", "price"])
        .describe("The financial metric to monitor."),
      operator: z
        .enum(["=", "<", "<=", ">", ">="])
        .describe("The comparison operator to evaluate the condition."),
      threshold: z
        .number()
        .describe(
          "The threshold value of the financial variable that triggers the buy action."
        ),
    }),
  }
);
