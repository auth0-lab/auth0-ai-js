import "dotenv/config";

import Enquirer from "enquirer";
import { OpenAIAgent } from "llamaindex";

import { DeviceAuthorizer } from "@auth0/ai";

import { buyTool } from "./tools/buy";

async function main() {
  console.log(`<Enter a command (type "exit" to quit)>\n\n`);
  const enquirer = new Enquirer<{ message: string }>();
  const authResponse = await DeviceAuthorizer.authorize(
    {
      scope: "openid",
    },
    {
      clientId: process.env["AUTH0_PUBLIC_CLIENT_ID"]!,
    }
  );
  const agent = new OpenAIAgent({
    tools: [
      buyTool({
        userId: authResponse.claims?.sub || "",
      }),
    ],
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
