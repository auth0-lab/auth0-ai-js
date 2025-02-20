import { CIBAAuthorizer, CibaAuthorizerCheckResponse } from "@auth0/ai";
import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { Client } from "@langchain/langgraph-sdk";

import { Auth0Graphs } from "./types";

const CibaPollerAnnotation = Annotation.Root({
  auth_req_id: Annotation<string>(),
  agent_to_resume: Annotation<string>(),
  thread_id: Annotation<string>(),
  user_id: Annotation<string>(),

  // Internal
  task_id: Annotation<string>(),
  status: Annotation<string>(),
});

type CibaState = typeof CibaPollerAnnotation.State;

type CibaPollerParams = {
  onStopScheduler: string | ((state: CibaState) => Promise<void>);
};

export function CibaPollerGraph(params: CibaPollerParams) {
  async function checkStatus(state: CibaState) {
    try {
      // TODO: use CIBA expiration to stop the scheduler and resume the agent
      const res = await CIBAAuthorizer.check(state.auth_req_id);

      // TODO: store the AT in the store

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
          state.thread_id,
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

  async function resumeAgent(state: CibaState) {
    const langgraph = new Client({
      apiUrl: process.env.LANGGRAPH_API_URL || "http://localhost:54367",
    });

    try {
      await langgraph.runs.wait(state.thread_id, state.agent_to_resume, {
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
