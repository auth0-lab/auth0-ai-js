import "dotenv/config";

import Enquirer from "enquirer";
import open from "open";
import terminalLink from "terminal-link";

import { getAuth0Interrupts } from "@auth0/ai-langchain";
import { DeviceInterrupts } from "@auth0/ai/interrupts";
import { HumanMessage } from "@langchain/core/messages";
import { Client, Thread } from "@langchain/langgraph-sdk";

const userPrompt = new Enquirer<{ prompt: string }>();
const confirm = new Enquirer<{ answer: boolean }>();

const client = new Client({
  apiUrl: process.env.LANGGRAPH_API_URL || "http://localhost:54367",
});

const langGraphStudioURL = (thread: Thread) => {
  const searchParams = new URLSearchParams({
    baseUrl: process.env.LANGGRAPH_API_URL || "http://localhost:54367",
  });
  return `https://smith.langchain.com/studio/thread/${thread.thread_id}?${searchParams}`;
};
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const handleDeviceInterrupt = async (thread: Thread) => {
  const firstInterrupt = getAuth0Interrupts(thread)[0];
  if (
    firstInterrupt &&
    DeviceInterrupts.AuthorizationPendingInterrupt.isInterrupt(
      firstInterrupt.value
    )
  ) {
    const { answer } = await confirm.prompt({
      type: "confirm",
      name: "answer",
      initial: true,
      message:
        "We need to authenticate you in a browser. Do you want to continue?",
    });
    if (!answer) {
      process.exit(1);
    }

    await open(firstInterrupt.value.response.verificationUriComplete!);

    //Poll the resumption of the thread...
    while (true) {
      await sleep((firstInterrupt.value.response.interval || 5) * 1000);
      const stream = client.runs.stream(thread.thread_id, "agent", {
        streamMode: "events",
      });
      await displayAssistantStream(stream);
      thread = await client.threads.get(thread.thread_id);
      if (getAuth0Interrupts(thread).length === 0) {
        break;
      }
    }
  }
};

async function displayAssistantStream(stream) {
  let assistantPromptDisplay = false;
  for await (const message of stream) {
    if (
      message.event === "events" &&
      message.data &&
      message.data["event"] === "on_chat_model_stream" &&
      message.data["data"]["chunk"]["content"]
    ) {
      if (!assistantPromptDisplay) {
        process.stdout.write("Assistant · ");
        assistantPromptDisplay = true;
      }
      const content = message.data["data"]["chunk"]["content"];
      if (!content) {
        continue;
      }
      process.stdout.write(content);
    }
  }
  if (assistantPromptDisplay) {
    process.stdout.write("\n");
  }
}

async function main() {
  let thread = await client.threads.create();

  console.log(`Welcome to the demo chatbot!`);
  console.log(`Thread ID: ${thread.thread_id}`);
  console.log(
    `Check this thread in LangGraph studio ${terminalLink("here", langGraphStudioURL(thread))}`
  );
  console.log(`<Enter a command (type "exit" to quit)>\n`);

  try {
    while (true) {
      thread = await client.threads.get(thread.thread_id);
      await handleDeviceInterrupt(thread);

      const { prompt } = await userPrompt.prompt({
        type: "text",
        name: "prompt",
        message: "    ",
        prefix: "User",
      });

      if (prompt.toLowerCase() === "exit") {
        console.log("Goodbye!");
        break;
      }

      const stream = client.runs.stream(thread.thread_id, "agent", {
        // streamMode: "messages",
        streamMode: "events",
        input: {
          messages: [new HumanMessage(prompt)],
        },
      });

      await displayAssistantStream(stream);
    }
  } catch (error) {
    console.dir(error);
    console.log("AGENT:error", error);
    process.exit(1);
  }
}

main().catch(console.error);
