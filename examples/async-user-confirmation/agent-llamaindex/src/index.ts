import "dotenv/config";

import Enquirer from "enquirer";
import { FunctionTool, OpenAIAgent } from "llamaindex";
import z from "zod";

import { CIBAAuthorizer, DeviceAuthorizer, usePipeline } from "@auth0/ai";

const deviceFlow = DeviceAuthorizer.create({
  clientId: process.env["AUTH0_PUBLIC_CLIENT_ID"]!,
});
const useDeviceFlow = deviceFlow({
  scope: "openid",
});

const ciba = CIBAAuthorizer.create();
const useCiba = ciba({
  userId: async ({ userId }) => {
    return userId;
  },
  binding_message: async ({ ticker, qty }) =>
    `Do you want to buy ${qty} shares of ${ticker}`,
  scope: "openid buy:stocks",
  audience: process.env["AUDIENCE"]!,
});

const buyTool = FunctionTool.from(
  usePipeline(
    [useDeviceFlow, useCiba],
    async (
      { accessToken },
      { ticker, qty }: { ticker: string; qty: number }
    ) => {
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

async function main() {
  const enquirer = new Enquirer<{ message: string }>();
  const agent = new OpenAIAgent({
    tools: [buyTool],
    verbose: true,
  });

  try {
    while (true) {
      const { message } = await enquirer.prompt({
        type: "text",
        name: "message",
        message: "    ",
        prefix: "User",
      });

      if (message.toLowerCase() === "exit") {
        console.log("Goodbye!");
        break;
      }

      const response = await agent.chat({ message });

      console.log(`Assistant · ${response.message.content}\n`);
    }
  } catch (error) {
    console.log("AGENT:error", error);
  }
}

main().catch(console.error);
