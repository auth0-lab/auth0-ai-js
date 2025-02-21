import { CIBAAuthorizer, CibaAuthorizerCheckResponse } from "@auth0/ai";
import {
  Annotation,
  END,
  LangGraphRunnableConfig,
  START,
  StateGraph,
} from "@langchain/langgraph";
import { Client } from "@langchain/langgraph-sdk";

import { Auth0Graphs, Auth0StoreKey } from "./types";

type CibaResponse = {
  auth_req_id: string;
  expires_in: number;
  interval: number;
};

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  id_token: string;
  token_type?: string;
  expires_in: number;
  scope: string;
};

const CibaPollerAnnotation = Annotation.Root({
  cibaResponse: Annotation<CibaResponse>(),
  onResumeInvoke: Annotation<string>(),
  threadId: Annotation<string>(),
  userId: Annotation<string>(),

  // Internal
  taskId: Annotation<string>(),
  toolId: Annotation<string>(),
  status: Annotation<string>(),
  tokenResponse: Annotation<TokenResponse>(),
});

type CibaState = typeof CibaPollerAnnotation.State;

type CibaPollerParams = {
  onStopScheduler: string | ((state: CibaState) => Promise<void>);
};

export function CibaPollerGraph(params: CibaPollerParams) {
  async function checkStatus(state: CibaState) {
    try {
      // TODO: use CIBA expiration to stop the scheduler and resume the agent
      const res = await CIBAAuthorizer.check(state.cibaResponse.auth_req_id);

      state.tokenResponse = res.token;
      state.status = res.status;
    } catch (e) {
      console.error(e);
    }

    return state;
  }

  async function stopScheduler(state: CibaState) {
    try {
      if (typeof params.onStopScheduler === "string") {
        const langgraph = new Client({
          apiUrl: process.env.LANGGRAPH_API_URL || "http://localhost:54367",
        });
        await langgraph.crons.createForThread(
          state.threadId,
          Auth0Graphs.CIBA_POLLER
        );
      }

      if (typeof params.onStopScheduler === "function") {
        await params.onStopScheduler(state);
      }
    } catch (e) {
      console.error(e);
    }

    return state;
  }

  async function resumeAgent(
    state: CibaState,
    config: LangGraphRunnableConfig
  ) {
    const langgraph = new Client({
      apiUrl: process.env.LANGGRAPH_API_URL || "http://localhost:54367",
    });

    try {
      if (state.status === CibaAuthorizerCheckResponse.APPROVED) {
        const store = config.store!;

        await store.put(
          [Auth0StoreKey, state.threadId, state.userId, state.toolId],
          "access_token",
          {
            credentials: {
              token_type: state.tokenResponse.token_type,
              access_token: state.tokenResponse.access_token,
            },
          }
        );
      }

      await langgraph.runs.wait(state.threadId, state.onResumeInvoke, {
        command: {
          resume: state.status,
        },
      });
    } catch (e) {
      console.error(e);
    }

    return state;
  }

  async function shouldContinue(state: CibaState) {
    if (state.status === CibaAuthorizerCheckResponse.PENDING) {
      return END;
    }

    if (state.status === CibaAuthorizerCheckResponse.EXPIRED) {
      return "stopScheduler";
    }

    if (
      state.status === CibaAuthorizerCheckResponse.APPROVED ||
      state.status === CibaAuthorizerCheckResponse.REJECTED
    ) {
      return "resumeAgent";
    }

    return END;
  }

  const stateGraph = new StateGraph(CibaPollerAnnotation)
    .addNode("checkStatus", checkStatus)
    .addNode("stopScheduler", stopScheduler)
    .addNode("resumeAgent", resumeAgent)
    .addEdge(START, "checkStatus")
    .addEdge("resumeAgent", "stopScheduler")
    .addConditionalEdges("checkStatus", shouldContinue);

  return stateGraph;
}
