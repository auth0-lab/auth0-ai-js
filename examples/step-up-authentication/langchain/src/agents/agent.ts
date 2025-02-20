import {
  Annotation,
  END,
  InMemoryStore,
  LangGraphRunnableConfig,
  MemorySaver,
  MessagesAnnotation,
  START,
  StateGraph,
} from "@langchain/langgraph";
import { AIMessage } from "@langchain/langgraph-sdk";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";

import { Auth0AI, Auth0State } from "../sdk";
import { SchedulerClient } from "../services/client";
import { buyTool, weatherTool } from "./tools";

const model = new ChatOpenAI({
  model: "gpt-4o",
}).bindTools([weatherTool, buyTool]);

const callLLM = async (
  state: typeof MessagesAnnotation.State,
  config: LangGraphRunnableConfig
) => {
  const response = await model.invoke(state.messages);

  const store = config.store!;
  await store.put(
    ["auth0-ai", "thread_id", "user_id", "tool_id"],
    "access_token",
    {
      at: "xxxxx",
    }
  );

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

const a0 = new Auth0AI({
  ciba: {
    onApproveGoTo: "tools",
    onRejectGoTo: "callLLM",
    onResumeInvoke: "agent",
    scheduler: async (config) => {
      // Custom scheduler
      await SchedulerClient().schedule(config);
    },
  },
});

const StateAnnotation = Annotation.Root({
  ...MessagesAnnotation.spec,
  ...Auth0State.spec,
});

const stateGraph = a0.protect(
  new StateGraph(StateAnnotation)
    .addNode("callLLM", callLLM)
    .addNode(
      "tools",
      new ToolNode([
        weatherTool,
        // Protected by CIBA
        a0.withCIBA(buyTool, {
          binding_message: async (_) => {
            return `Do you want to buy ${_.qty} ${_.ticker}`;
          },
        }),
      ])
    )
    .addEdge(START, "callLLM")
    .addEdge("tools", "callLLM")
    .addConditionalEdges("callLLM", a0.withAuth(shouldContinue))
);

const memory = new MemorySaver();
const inMemoryStore = new InMemoryStore();

export const graph = stateGraph.compile({
  checkpointer: memory,
  store: inMemoryStore,
});
