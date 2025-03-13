export * from "./FGA/fga-retriever";

export { CibaPollerGraph } from "./ciba/ciba-poller-graph";
export type { SchedulerParams } from "./ciba/ciba-graph/types";

import { AuthorizerParams, Credentials } from "@auth0/ai";
import { Annotation, LangGraphRunnableConfig } from "@langchain/langgraph";

import { CIBAGraph } from "./ciba/ciba-graph";
import { CIBAGraphOptions } from "./ciba/ciba-graph/types";
import { FederatedConnectionAuthorizer } from "./FederatedConnections";
import { FGA_AI } from "./FGA_AI";

type FederatedConnectionAuthorizerParams = ConstructorParameters<
  typeof FederatedConnectionAuthorizer
>[1];

type Auth0StateType = {
  error: string;
};

export { getAccessTokenForConnection } from "./FederatedConnections";

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
    this.config = {
      domain: config?.domain || process.env.AUTH0_DOMAIN,
      clientId: config?.clientId || process.env.AUTH0_CLIENT_ID,
      clientSecret: config?.clientSecret || process.env.AUTH0_CLIENT_SECRET,
    };
    if (!this.config.domain) {
      throw new Error(
        "Auth0 configuration error: No domain provided. Please set the 'domain' in the configuration or environment variables."
      );
    }
    if (!this.config.clientId) {
      throw new Error(
        "Auth0 configuration error: No clientId provided. Please set the 'clientId' in the configuration or environment variables."
      );
    }
  }

  /**
   *
   * Protects a tool execution with the CIBA authorizer.
   *
   * @param options - The CIBA authorizer options.
   * @returns The authorizer.
   */
  withCIBA(options?: CIBAGraphOptions) {
    this._graph = new CIBAGraph(options, this.config);

    return this._graph;
  }

  /**
   * Protects a tool execution with the Federated Connection authorizer.
   *
   * @param options - The Federated Connections authorizer options.
   * @returns The authorizer.
   */
  withFederatedConnection(options: FederatedConnectionAuthorizerParams) {
    const authorizer = new FederatedConnectionAuthorizer(
      //TODO: makes types compatible...
      this.config as ConstructorParameters<
        typeof FederatedConnectionAuthorizer
      >[0],
      options
    );
    return authorizer.authorizer();
  }

  static FGA = FGA_AI;
}
