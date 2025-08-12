import { FederatedConnectionAuthorizerBase } from "@auth0/ai/FederatedConnections";
import { FederatedConnectionInterrupt } from "@auth0/ai/interrupts";
import { tool } from "@langchain/core/tools";
import { LangGraphRunnableConfig } from "@langchain/langgraph";

import { toGraphInterrupt } from "../util/interrrupt";
import { Optional } from "../util/optionalType";
import { ToolContext } from "../util/ToolContext";
import { ToolLike, ToolWrapper } from "../util/ToolWrapper";

const defaultGetRefreshToken = () => {
  return async (
    _: any,
    config: LangGraphRunnableConfig
  ): Promise<string | undefined> => {
    return config?.configurable?._credentials?.refreshToken;
  };
};

/**
 * Authorizer for federated connections.
 */
export class FederatedConnectionAuthorizer extends FederatedConnectionAuthorizerBase<
  [any, any]
> {
  protectedTools: string[] = [];

  constructor(
    auth0: ConstructorParameters<typeof FederatedConnectionAuthorizerBase>[0],
    config: Optional<
      ConstructorParameters<typeof FederatedConnectionAuthorizerBase>[1],
      "refreshToken"
    >
  ) {
    // Only provide default refreshToken if no accessToken is provided
    // This prevents conflicts when using accessToken for federated token exchange
    const refreshToken = config.accessToken
      ? undefined
      : (config.refreshToken ?? defaultGetRefreshToken());

    super(auth0, {
      ...config,
      refreshToken,
    });
  }

  protected override handleAuthorizationInterrupts(
    err: FederatedConnectionInterrupt
  ): void {
    throw toGraphInterrupt(err);
  }

  authorizer(): ToolWrapper {
    return <T extends ToolLike>(t: T) => {
      const getContext = ToolContext(t);
      const protectedFunc = this.protect(getContext, t.invoke.bind(t));
      return tool(protectedFunc, {
        name: t.name,
        description: t.description,
        schema: t.schema,
      }) as unknown as T;
    };
  }
}
