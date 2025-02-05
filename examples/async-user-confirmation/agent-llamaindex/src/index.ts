import "dotenv/config";

import { FunctionTool, OpenAIAgent } from "llamaindex";
import z from "zod";

import { DeviceAuthorizer } from "@auth0/ai";

const deviceFlow = DeviceAuthorizer.create();

const useDeviceFlow = deviceFlow({
  scope: "openid",
  audience: process.env["AUDIENCE"]!,
});

const buyTool = FunctionTool.from(
  useDeviceFlow(async ({ accessToken }, { ticker, qty }) => {
    const headers = {
      "Content-Type": "application/json",
    };
    const body = {
      ticker: ticker,
      qty: qty,
    };

    if (accessToken) {
      headers["Authorization"] = "Bearer " + accessToken;
    }

    const response = await fetch(process.env["API_URL"]!, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(body),
    });

    return response.statusText;
  }),
  {
    name: "buy",
    description: "Use this function to buy stock",
    parameters: z.object({
      ticker: z.string(),
      qty: z.number(),
    }),
  }
);

const agent = new OpenAIAgent({
  tools: [buyTool],
  verbose: true,
});

async function main() {
  try {
    const response = await agent.chat({ message: "Buy 100 shares of ZEKO" });

    console.log(response.message.content);
  } catch (error) {
    console.log("AGENT:error", error);
  }
}

main().catch(console.error);
