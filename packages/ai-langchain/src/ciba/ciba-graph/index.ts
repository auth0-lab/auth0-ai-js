import { AuthorizerParams } from "@auth0/ai";
import { AIMessage } from "@langchain/core/messages";
import { RunnableToolLike } from "@langchain/core/runnables";
import { StructuredToolInterface } from "@langchain/core/tools";
import { END, START, StateDefinition, StateGraph } from "@langchain/langgraph";

import { Auth0Nodes } from "../types";
import { initializeCIBA } from "./initialize-ciba";
import { initializeHITL } from "./initialize-hitl";
import { CIBAGraphOptions, CIBAOptions, ProtectedTool, State } from "./types";

export class CIBAGraph<N extends string = string> {
  private graph: any;
  private options?: CIBAGraphOptions<N>;
  private tools: ProtectedTool<N>[] = [];
  private authorizerParams: AuthorizerParams | undefined;

  constructor(
    options?: CIBAGraphOptions<N>,
    authorizerParams?: AuthorizerParams
  ) {
    this.options = options;
    this.authorizerParams = authorizerParams;
  }

  getTools() {
    return this.tools;
  }

  getGraph() {
    return this.graph;
  }

  getOptions() {
    return this.options;
  }

  getAuthorizerParams() {
    return this.authorizerParams;
  }

  registerNodes<
    SD,
    S,
    U,
    N extends string,
    I extends StateDefinition,
    O extends StateDefinition,
    C extends StateDefinition
  >(graph: StateGraph<SD, S, U, N, I, O, C>) {
    this.graph = graph;

    // add CIBA HITL and CIBA nodes
    this.graph
      .addNode(Auth0Nodes.AUTH0_CIBA_HITL, initializeHITL(this))
      .addNode(Auth0Nodes.AUTH0_CIBA, initializeCIBA(this))
      .addConditionalEdges(Auth0Nodes.AUTH0_CIBA, (state: State) => {
        if (state.auth0?.error) {
          return END;
        }

        return Auth0Nodes.AUTH0_CIBA_HITL;
      });

    return graph;
  }

  protectTool(
    tool: StructuredToolInterface | RunnableToolLike,
    options: CIBAOptions<N>
  ) {
    // review tool options
    options = {
      // default options
      ...this.options,
      // tool specific options
      ...options,
    };

    if (options.onApproveGoTo === undefined) {
      throw new Error(`[${tool.name}] onApproveGoTo is required`);
    }

    if (options.onRejectGoTo === undefined) {
      throw new Error(`[${tool.name}] onRejectGoTo is required`);
    }

    this.tools.push({ toolName: tool.name, options });

    return tool;
  }

  withAuth<F extends (...args: any[]) => any>(fn: F) {
    return (...args: Parameters<F>) => {
      const state = args[0];
      const { messages } = state;
      const lastMessage = messages[messages.length - 1] as AIMessage;

      if (typeof fn !== "function") {
        return START;
      }

      // Call default function if no tool calls
      if (
        !lastMessage ||
        !lastMessage.tool_calls ||
        lastMessage.tool_calls.length === 0
      ) {
        return fn(...args);
      }

      const toolName = lastMessage.tool_calls[0].name;
      const tool = this.tools.find((t) => t.toolName === toolName);

      if (tool) {
        return Auth0Nodes.AUTH0_CIBA;
      }

      // Call default function if tool is not protected
      return fn(...args);
    };
  }
}
