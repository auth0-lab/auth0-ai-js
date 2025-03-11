import { CIBAAuthorizer } from "@auth0/ai";
import { RunnableConfig } from "@langchain/core/runnables";
import { Command } from "@langchain/langgraph";
import { Client } from "@langchain/langgraph-sdk";

import { Auth0Graphs, Auth0Nodes } from "../types";
import { ICIBAGraph, State } from "./types";
import { getToolDefinition } from "./utils";

export const initializeCIBA =
  (cibaGraph: ICIBAGraph) =>
  async (state: State, config?: RunnableConfig): Promise<any> => {
    try {
      const cibaParams = cibaGraph.getOptions();
      const tools = cibaGraph.getTools();
      const toolDefinition = getToolDefinition(state, tools);

      if (!toolDefinition) {
        return new Command({ resume: true });
      }

      const graph = cibaGraph.getGraph();
      const { metadata, tool } = toolDefinition;
      const cibaOptions = metadata?.options;
      let bindingMessage = "";

      const langgraph = new Client({
        apiUrl: process.env.LANGGRAPH_API_URL || "http://localhost:54367",
      });

      // Check if CIBA Poller Graph exists
      const searchResult = await langgraph.assistants.search({
        graphId: Auth0Graphs.CIBA_POLLER,
      });

      if (searchResult.length === 0) {
        throw new Error(
          `[${Auth0Nodes.AUTH0_CIBA}] "${Auth0Graphs.CIBA_POLLER}" does not exists. Make sure to register the graph in your "langgraph.json".`
        );
      }

      if (!(metadata.options.onApproveGoTo! in graph.nodes)) {
        throw new Error(
          `[${Auth0Nodes.AUTH0_CIBA}] "${metadata.options.onApproveGoTo}" is not a valid node.`
        );
      }

      if (!(metadata.options.onRejectGoTo! in graph.nodes)) {
        throw new Error(
          `[${Auth0Nodes.AUTH0_CIBA}] "${metadata.options.onRejectGoTo}" is not a valid node.`
        );
      }

      if (!cibaParams?.config.scheduler) {
        throw new Error(
          `[${Auth0Nodes.AUTH0_CIBA}] "scheduler" must be a "function" or an "string".`
        );
      }

      if (!cibaParams?.config.onResumeInvoke) {
        throw new Error(
          `[${Auth0Nodes.AUTH0_CIBA}] "scheduler" must be a "function" or an "string".`
        );
      }

      if (typeof cibaOptions.bindingMessage === "function") {
        bindingMessage = await cibaOptions.bindingMessage(tool.args);
      }

      if (typeof cibaOptions.bindingMessage === "string") {
        bindingMessage = cibaOptions.bindingMessage;
      }

      const cibaResponse = await CIBAAuthorizer.start(
        {
          userId: config?.configurable?.user_id,
          scope: cibaOptions.scope || "openid",
          audience: cibaOptions.audience,
          bindingMessage: bindingMessage,
        },
        cibaGraph.getAuthorizerParams()
      );

      const scheduler = cibaParams?.config.scheduler;
      // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
      const onResumeInvoke = cibaParams?.config.onResumeInvoke!;
      const threadId = config?.metadata?.thread_id as string;
      const schedulerParams = {
        toolId: tool.id,
        userId: config?.configurable?.user_id,
        cibaGraphId: Auth0Graphs.CIBA_POLLER,
        threadId,
        cibaResponse,
        onResumeInvoke,
      };

      // Use Custom Scheduler
      if (typeof scheduler === "function") {
        await scheduler(schedulerParams);
      }

      // Use Langgraph SDK to schedule the task
      if (typeof scheduler === "string") {
        //TODO: check if the cron alrady exists for thread_id/agent_id/auth_req_id
        await langgraph.crons.createForThread(
          threadId,
          schedulerParams.cibaGraphId,
          {
            // Default to every minute
            schedule: "*/1 * * * *",
            input: schedulerParams,
          }
        );
      }

      console.log("CIBA Task Scheduled");
    } catch (e) {
      console.error(e);
      state.auth0 = { error: e.message };
    }

    return state;
  };
