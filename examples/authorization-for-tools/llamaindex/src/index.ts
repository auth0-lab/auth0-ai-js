import "dotenv/config";

import Enquirer from "enquirer";
import { OpenAIAgent } from "llamaindex";

import { systemPrompt } from "./system";
import { buyTool } from "./tools/buy";

async function main() {
  console.log(`<Enter a command (type "exit" to quit)>\n\n`);
  const enquirer = new Enquirer<{ message: string }>();

  const agent = new OpenAIAgent({
    systemPrompt: systemPrompt,
    tools: [
      buyTool({
        userId: "john",
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
