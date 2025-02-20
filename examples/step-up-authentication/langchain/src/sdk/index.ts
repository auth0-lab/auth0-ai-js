import "dotenv/config";

import { RunnableToolLike } from "@langchain/core/runnables";
import { StructuredToolInterface } from "@langchain/core/tools";
import { Annotation, StateDefinition, StateGraph } from "@langchain/langgraph";

import { CIBAGraph } from "./ciba-graph";
import { CIBAGraphOptions, CIBAOptions } from "./ciba-graph/types";

type Auth0StateType = {
  error: string;
};

export const Auth0State = Annotation.Root({
  auth0: Annotation<Auth0StateType>(),
});

export class Auth0AI<N extends string> {
  private _graph: CIBAGraph<N>;

  constructor(options?: CIBAGraphOptions<N>) {
    this._graph = new CIBAGraph(options);
  }

  protect<
    SD,
    S,
    U,
    N extends string,
    I extends StateDefinition,
    O extends StateDefinition,
    C extends StateDefinition
  >(graph: StateGraph<SD, S, U, N, I, O, C>) {
    this._graph.protect(graph);
    return graph;
  }

  withCIBA(
    tool: StructuredToolInterface | RunnableToolLike,
    options: CIBAOptions<N>
  ): StructuredToolInterface | RunnableToolLike {
    this._graph.withCIBA(tool, options);
    return tool;
  }

  withAuth(fn: any) {
    return (...args: any[]) => {
      return this._graph.withAuth(fn)(...args);
    };
  }
}
