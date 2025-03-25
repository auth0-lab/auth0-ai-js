import "dotenv/config";

import Enquirer from "enquirer";
import { OpenAIAgent } from "llamaindex";
import { randomUUID } from "node:crypto";

import { setAIContext } from "@auth0/ai-llamaindex";

import { buyTool } from "./tools/buy";

async function main() {
  console.log(`<Enter a command (type "exit" to quit)>\n\n`);
  const enquirer = new Enquirer<{ message: string }>();
  setAIContext({ threadID: randomUUID() });

  const agent = new OpenAIAgent({
    tools: [buyTool()],
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
