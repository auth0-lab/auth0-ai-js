import "dotenv/config";

import Enquirer from "enquirer";

import { BaseMessage, HumanMessage } from "@langchain/core/messages";
import { Client } from "@langchain/langgraph-sdk";

async function main() {
  try {
    console.log(`<Enter a command (type "exit" to quit)>\n\n`);

    const enquirer = new Enquirer<{ message: string }>();
    const messages: BaseMessage[] = [];

    const client = new Client({
      apiUrl: process.env.LANGGRAPH_API_URL || "http://localhost:54367",
    });

    const { thread_id } = await client.threads.create();

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

      messages.push(new HumanMessage(message));

      const waitResult = await client.runs.wait(thread_id, "agent", {
        input: { messages },
        config: {
          configurable: {
            userId: "john",
          },
        },
      });
      const result = (waitResult as Record<string, any>).messages;

      console.log(`Assistant · ${result[result.length - 1].content}\n`);
    }
  } catch (error) {
    console.log("AGENT:error", error);
  }
}

main().catch(console.error);
