import { AIMessage } from "@langchain/core/messages";
import {
  END,
  InMemoryStore,
  MemorySaver,
  MessagesAnnotation,
  START,
  StateGraph,
} from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";

import { listNearbyEvents, listUserCalendars } from "./tools/index";

import type { RunnableLike } from "@langchain/core/runnables";
const model = new ChatOpenAI({
  model: "gpt-4o-mini",
}).bindTools([listNearbyEvents, listUserCalendars]);

const callLLM = async (state: typeof MessagesAnnotation.State) => {
  const response = await model.invoke(state.messages);
  return { messages: [response] };
};

const routeAfterLLM: RunnableLike = function (state) {
  const lastMessage = state.messages[state.messages.length - 1] as AIMessage;
  if (!lastMessage.tool_calls?.length) {
    return END;
  }
  return "tools";
};

const stateGraph = new StateGraph(MessagesAnnotation)
  .addNode("callLLM", callLLM)
  .addNode(
    "tools",
    new ToolNode([listNearbyEvents, listUserCalendars], {
      // Error handler should be disabled in order to
      // trigger interruptions from within tools.
      handleToolErrors: false,
    })
  )
  .addEdge(START, "callLLM")
  .addConditionalEdges("callLLM", routeAfterLLM, [END, "tools"])
  .addEdge("tools", "callLLM");

const checkpointer = new MemorySaver();
const store = new InMemoryStore();

export const graph = stateGraph.compile({
  checkpointer,
  store,
});
