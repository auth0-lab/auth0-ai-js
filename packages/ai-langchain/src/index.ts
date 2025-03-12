export * from "./retrievers/fga-retriever";

export { CibaPollerGraph } from "./ciba/ciba-poller-graph";
export type { SchedulerParams } from "./ciba/ciba-graph/types";

import { AuthorizerParams, Credentials } from "@auth0/ai";
import { Annotation, LangGraphRunnableConfig } from "@langchain/langgraph";

import { CIBAGraph } from "./ciba/ciba-graph";
import { CIBAGraphOptions } from "./ciba/ciba-graph/types";
import { FGA_AI } from "./FGA_AI";

type Auth0StateType = {
  error: string;
};

export const Auth0State = Annotation.Root({
  auth0: Annotation<Auth0StateType>(),
  taskId: Annotation<string>(),
});

export function getAccessToken(config: LangGraphRunnableConfig) {
  let accessToken: string | null = null;

  try {
    const credentials: Credentials | null = config.configurable?._credentials;

    if (credentials) {
      accessToken = credentials.accessToken.value;
    }
  } catch (e) {
    console.error(e);
  }

  return accessToken;
}

export class Auth0AI {
  private _graph: CIBAGraph | undefined;
  private config: AuthorizerParams | undefined;

  constructor(config?: AuthorizerParams) {
    this.config = config;
  }

  withCIBA(options?: CIBAGraphOptions) {
    this._graph = new CIBAGraph(options, this.config);

    return this._graph;
  }

  static FGA = FGA_AI;
}
