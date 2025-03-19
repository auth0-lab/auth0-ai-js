import "dotenv/config";

import { CoreMessage, generateText } from "ai";
import Enquirer from "enquirer";

import { openai } from "@ai-sdk/openai";
import { DeviceAuthorizer } from "@auth0/ai";

import { Context } from "./context";
import { buy } from "./tools/buy";

async function generate(messages: CoreMessage[], context: Context) {
  const result = await generateText({
    model: openai("gpt-4o-mini"),
    messages,
    maxSteps: 2,
    tools: {
      buy: buy(context),
    },
  });

  return result;
}

async function main() {
  console.log(`<Enter a command (type "exit" to quit)>\n\n`);

  const enquirer = new Enquirer<{ prompt: string }>();
  const authResponse = await DeviceAuthorizer.authorize(
    {
      scope: "openid",
    },
    {
      clientId: process.env["AUTH0_PUBLIC_CLIENT_ID"]!,
    }
  );
  const messages: CoreMessage[] = [];

  try {
    while (true) {
      const { prompt } = await enquirer.prompt({
        type: "text",
        name: "prompt",
        message: "    ",
        prefix: "User",
      });

      if (prompt.toLowerCase() === "exit") {
        console.log("Goodbye!");
        break;
      }

      // Add the user's message to the messages
      messages.push({ role: "user", content: prompt });

      const { response, text } = await generate(messages, {
        userID: authResponse.claims?.sub || "",
      });

      // Update the messages with the response
      messages.push(...response.messages);

      console.log(`Assistant · ${text}\n`);
    }
  } catch (error) {
    console.log("AGENT:error", error);
  }
}

main().catch(console.error);
