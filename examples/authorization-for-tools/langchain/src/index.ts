import "dotenv/config";

import Enquirer from "enquirer";

import {
  BaseMessage,
  HumanMessage,
  SystemMessage,
} from "@langchain/core/messages";
import {
  Annotation,
  messagesStateReducer,
  StateGraph,
} from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";

import { systemPrompt } from "./system";
import { buyTool } from "./tools/buy";

const tools = [buyTool];
const toolNode = new ToolNode(tools, { handleToolErrors: false });
const model = new ChatOpenAI({ model: "gpt-4" }).bindTools(tools);

function shouldContinue(state) {
  const messages = state.messages;
  const lastMessage = messages[messages.length - 1];

  if (lastMessage.tool_calls?.length) {
    return "tools";
  }

  return "__end__";
}

async function callModel(state: { messages: BaseMessage[] }) {
  const messages = state.messages;
  const response = await model.invoke(messages);

  return { messages: [response] };
}

const StateAnnotation = Annotation.Root({
  messages: Annotation({
    reducer: messagesStateReducer,
  }),
});

const workflow = new StateGraph(StateAnnotation)
  .addNode("agent", callModel)
  .addNode("tools", toolNode)
  .addEdge("__start__", "agent")
  .addConditionalEdges("agent", shouldContinue)
  .addEdge("tools", "agent");

async function main() {
  const agent = workflow.compile();

  try {
    console.log(`<Enter a command (type "exit" to quit)>\n\n`);

    const enquirer = new Enquirer<{ message: string }>();
    const messages: BaseMessage[] = [new SystemMessage(systemPrompt)];

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

      const rv = await agent.invoke(
        { messages },
        {
          configurable: {
            thread_id: "42",
            // https://langchain-ai.github.io/langgraphjs/how-tos/pass-run-time-values-to-tools/#define-the-agent-state
            userId: "john",
          },
        }
      );

      console.log(
        `Assistant · ${rv.messages[rv.messages.length - 1].content}\n`
      );
    }
  } catch (error) {
    console.log("AGENT:error", error);
  }
}

main().catch(console.error);
