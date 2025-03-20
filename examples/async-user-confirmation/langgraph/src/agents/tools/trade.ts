import { z } from "zod";

import { getCIBACredentials } from "@auth0/ai-langchain";
import { tool } from "@langchain/core/tools";
import { Command, LangGraphRunnableConfig } from "@langchain/langgraph";

export const tradeTool = tool(
  async (input, config: LangGraphRunnableConfig) => {
    // Get the access token
    const credentials = getCIBACredentials();
    const accessToken = credentials?.accessToken?.value;

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

    return new Command({
      update: {
        result: {
          success: true,
          message: response.statusText,
        },
      },
    });
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
