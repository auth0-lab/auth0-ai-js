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

/**
 * Checks the condition of a given state and config, and performs actions based on the status.
 *
 * @param state - The current state object containing task information.
 * @param config - The configuration object for LangGraphRunnable, containing the store.
 * @returns A promise that resolves to the updated state or an object containing messages with tool calls.
 *
 * @see {@link https://langchain-ai.github.io/langgraphjs/how-tos/force-calling-a-tool-first/#define-the-graph}
 */
async function checkCondition(state, config: LangGraphRunnableConfig) {
  //
  // This function should contains the logic to check if the stock condition is met.
  //

  const store = config.store;
  const data = await store?.get([state.taskId], "status");

  if (data?.value?.status === "processing") {
    // skip since the job is already processing
    return state;
  }

  if (!data) {
    await store?.put([state.taskId], "status", { status: "processing" });
  }

  // Calling the trade tool to initiate the trade
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

/**
 * Notifies the user about the trade.
 *
 * @param {any} state - The current state of the trade.
 * @returns {any} The updated state after notification.
 */
function notifyUser(state) {
  console.log("----");
  console.log(`Notifying the user about the trade.`);
  console.log("----");

  return state;
}

const auth0AI = new Auth0AI();

/**
 * Configures the CIBA flow with Auth0 AI.
 *
 * @param {object} options - The configuration options for CIBA.
 * @param {string} options.audience - The audience for the CIBA flow, typically the API identifier.
 * @param {object} options.config - Additional configuration for the CIBA flow.
 * @param {string} options.config.onResumeInvoke - The identifier for the agent to invoke upon resuming the flow.
 * @param {function} options.config.scheduler - A custom scheduler function to handle scheduling logic.
 * @param {object} input - The input object passed to the scheduler function.
 * @param {string} input.cibaGraphId - The unique identifier for the CIBA graph.
 *
 * @returns {object} - The initialized CIBA flow instance.
 */
const ciba = auth0AI.withCIBA({
  audience: process.env["AUDIENCE"],
  config: {
    onResumeInvoke: "conditional-trade",
    scheduler: async (input) => {
      // Custom scheduler
      await SchedulerClient().schedule(input.cibaGraphId, { input });
    },
  },
});

// Define the state annotation
const StateAnnotation = Annotation.Root({
  ...MessagesAnnotation.spec,
  ...Auth0State.spec,
  data: Annotation<ConditionalTrade>(),
});

/**
 * Initializes and registers a state graph for conditional trade operations using CIBA.
 *
 * The state graph consists of the following nodes:
 * - `checkCondition`: Evaluates whether the trade condition is met.
 * - `notifyUser`: Notifies the user about the trade status.
 * - `stopScheduler`: Stops the scheduler if the trade is acepted or rejected.
 * - `tools`: A tool node that handles the trade tool with CIBA protection.
 *
 * The `tools` node uses the `tradeTool` with CIBA protection, which includes:
 * - `onApproveGoTo`: Transitions to the `tools` node if the trade is approved.
 * - `onRejectGoTo`: Transitions to the `stopScheduler` node if the trade is rejected.
 * - `scope`: Specifies the required scope for the trade operation (`stock:trade`).
 * - `bindingMessage`: Generates a message asking the user if they want to buy a specified quantity of a stock ticker.
 */
const stateGraph = ciba.registerNodes(
  new StateGraph(StateAnnotation)
    .addNode("checkCondition", checkCondition)
    .addNode("notifyUser", notifyUser)
    .addNode("stopScheduler", stopScheduler)
    .addNode(
      "tools",
      new ToolNode([
        ciba.protectTool(tradeTool, {
          onApproveGoTo: "tools",
          onRejectGoTo: "stopScheduler",
          scope: "stock:trade",
          bindingMessage: async (_) => {
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
