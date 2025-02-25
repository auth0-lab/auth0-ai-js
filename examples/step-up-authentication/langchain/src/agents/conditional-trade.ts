import { Auth0AI, Auth0State } from "@auth0/ai-langchain";
import { AIMessage } from "@langchain/core/messages";
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
import { ToolNode } from "@langchain/langgraph/prebuilt";

import { SchedulerClient } from "../services/client";
import { tradeTool } from "./tools";

type ConditionalTrade = {
  ticker: string;
  qty: number;
  metric: string;
  threshold: number;
  operator: string;
};

async function shouldContinue(state) {
  const { messages } = state;
  const lastMessage = messages[messages.length - 1] as AIMessage;

  if (
    !lastMessage ||
    !lastMessage.tool_calls ||
    lastMessage.tool_calls.length === 0
  ) {
    return END;
  }

  return "tools";
}

async function checkCondition(state, config: LangGraphRunnableConfig) {
  const store = config.store;
  const data = await store?.get([state.taskId], "status");

  if (data?.value?.status === "processing") {
    // skip since the job is already processing
    return state;
  }

  if (!data) {
    await store?.put([state.taskId], "status", { status: "processing" });
  }

  // https://langchain-ai.github.io/langgraphjs/how-tos/force-calling-a-tool-first/#define-the-graph
  return {
    messages: [
      new AIMessage({
        content: "",
        tool_calls: [
          {
            name: "trade_tool",
            args: {
              ticker: state.data.ticker,
              qty: state.data.qty,
            },
            id: "tool_abcd123",
          },
        ],
      }),
    ],
  };
}

async function stopScheduler(state) {
  try {
    await SchedulerClient().stop(state.taskId);
  } catch (e) {
    console.error(e);
  }

  return state;
}

function notifyUser(state) {
  console.log("----");
  console.log(`Notifying the user about the trade.`);
  console.log("----");

  return state;
}

// Initialize Auth0AI
const auth0AI = new Auth0AI();

// Initialize CIBA with Auth0AI
const ciba = auth0AI.withCiba({
  onApproveGoTo: "tools",
  onRejectGoTo: "stopScheduler",
  onResumeInvoke: "conditional-trade",
  scope: "stock:trade",
  audience: process.env["AUDIENCE"],
  scheduler: async (input) => {
    // Custom scheduler
    await SchedulerClient().schedule(input.cibaGraphId, { input });
  },
});

// Define the state annotation
const StateAnnotation = Annotation.Root({
  ...MessagesAnnotation.spec,
  ...Auth0State.spec,
  data: Annotation<ConditionalTrade>(),
});

// Protect the graph with CIBA
const stateGraph = ciba.protect(
  new StateGraph(StateAnnotation)
    .addNode("checkCondition", checkCondition)
    .addNode("notifyUser", notifyUser)
    .addNode("stopScheduler", stopScheduler)
    .addNode(
      "tools",
      new ToolNode([
        // Protected by CIBA
        ciba.withCIBA(tradeTool, {
          binding_message: async (_) => {
            return `Do you want to buy ${_.qty} ${_.ticker}`;
          },
        }),
      ])
    )
    .addEdge(START, "checkCondition")
    .addEdge("tools", "stopScheduler")
    .addEdge("stopScheduler", "notifyUser")
    .addConditionalEdges("checkCondition", ciba.withAuth(shouldContinue))
);

const checkpointer = new MemorySaver();
const store = new InMemoryStore();

export const graph = stateGraph.compile({
  checkpointer,
  store,
});
