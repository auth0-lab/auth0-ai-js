import { FederatedConnectionAuthorizerBase } from "@auth0/ai/FederatedConnections";
import { FederatedConnectionInterrupt } from "@auth0/ai/interrupts";
import { DynamicStructuredTool, tool } from "@langchain/core/tools";
import { LangGraphRunnableConfig } from "@langchain/langgraph";

import { toGraphInterrupt } from "../util/interrrupt";
import { Optional } from "../util/optionalType";
import { ToolContext } from "../util/ToolContext";
import { ToolWrapper, ZodObjectAny } from "../util/ToolWrapper";

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
  [any, LangGraphRunnableConfig]
> {
  protectedTools: string[] = [];

  constructor(
    auth0: ConstructorParameters<typeof FederatedConnectionAuthorizerBase>[0],
    config: Optional<
      ConstructorParameters<typeof FederatedConnectionAuthorizerBase>[1],
      "refreshToken"
    >
  ) {
    const refreshToken = config.refreshToken ?? defaultGetRefreshToken();
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
    return <T extends ZodObjectAny = ZodObjectAny>(
      t: DynamicStructuredTool<T>
    ) => {
      return tool(this.protect(ToolContext(t), t.invoke.bind(t)), {
        name: t.name,
        description: t.description,
        schema: t.schema,
      }) as unknown as DynamicStructuredTool<T>;
    };
  }
}
