import { z } from "zod";

import { getAccessToken } from "@auth0/ai-langchain";
import { tool } from "@langchain/core/tools";
import { LangGraphRunnableConfig } from "@langchain/langgraph";

export const tradeTool = tool(
  async (input, config: LangGraphRunnableConfig) => {
    const accessToken = getAccessToken(config);

    const headers = {
      Authorization: "",
      "Content-Type": "application/json",
    };
    const body = {
      ticker: input.ticker,
      qty: input.qty,
    };

    if (accessToken === null) {
      throw new Error("Access token not found");
    }

    if (accessToken) {
      headers["Authorization"] = "Bearer " + accessToken;
    }

    const response = await fetch(process.env["API_URL"]!, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(body),
    });

    return response.statusText;
  },
  {
    name: "trade_tool",
    description: "Use this function to trade an stock",
    schema: z.object({
      ticker: z.string(),
      qty: z.number(),
    }),
  }
);
