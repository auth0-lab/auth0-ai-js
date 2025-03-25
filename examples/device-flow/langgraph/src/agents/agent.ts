import path from "path";

import { Auth0AI } from "@auth0/ai-langchain";
import { FSStore } from "@auth0/ai/stores";
import {
  END,
  InMemoryStore,
  MemorySaver,
  MessagesAnnotation,
  START,
  StateGraph,
} from "@langchain/langgraph";
import { AIMessage } from "@langchain/langgraph-sdk";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";

import { portfolioTool, profileTool } from "./tools";

const checkpointer = new MemorySaver();
const store = new InMemoryStore();

const model = new ChatOpenAI({
  model: "gpt-4o",
}).bindTools([portfolioTool, profileTool]);

const callLLM = async (state: typeof MessagesAnnotation.State) => {
  const response = await model.invoke(state.messages);
  return { messages: [response] };
};

function shouldContinue(state) {
  const { messages } = state;
  const lastMessage = messages[messages.length - 1] as AIMessage;

  if (!lastMessage.tool_calls || lastMessage.tool_calls.length === 0) {
    return END;
  }

  return "tools";
}

const auth0AI = new Auth0AI({
  store: new FSStore(path.join(process.cwd(), "/.store/auth0ai.json")),
});

const protectTool = auth0AI.withDeviceAuthorizationFlow({
  audience: process.env["AUDIENCE"]! as string,
  scopes: ["portfolio:read", "openid", "profile"],
  onUnauthorized(err: Error) {
    return { error: `Unauthorized ${err.message}`, success: false };
  },
});

const stateGraph = new StateGraph(MessagesAnnotation.spec)
  .addNode("callLLM", callLLM)
  .addNode(
    "tools",
    new ToolNode([protectTool(portfolioTool), protectTool(profileTool)], {
      handleToolErrors: false,
    })
  )
  .addEdge(START, "callLLM")
  .addEdge("tools", "callLLM")
  .addConditionalEdges("callLLM", shouldContinue);

export const graph = stateGraph.compile({
  checkpointer,
  store,
});
