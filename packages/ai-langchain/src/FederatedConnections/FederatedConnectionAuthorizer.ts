import { randomUUID } from "crypto";

import { FederatedConnectionAuthorizerBase } from "@auth0/ai/FederatedConnections";
import { FederatedConnectionInterrupt } from "@auth0/ai/interrupts";
import { DynamicStructuredTool, tool } from "@langchain/core/tools";
import { LangGraphRunnableConfig } from "@langchain/langgraph";

import { toGraphInterrupt } from "../util/interrrupt";
import { Optional } from "../util/optionalType";
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
  middlewareInstanceID: string;
  protectedTools: string[] = [];

  constructor(
    auth0: ConstructorParameters<typeof FederatedConnectionAuthorizerBase>[0],
    config: Optional<
      ConstructorParameters<typeof FederatedConnectionAuthorizerBase>[1],
      "refreshToken"
    >
  ) {
    const middlewareInstanceID = randomUUID();
    const refreshToken = config.refreshToken ?? defaultGetRefreshToken();

    super(auth0, {
      ...config,
      refreshToken,
    });

    this.middlewareInstanceID = middlewareInstanceID;
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
      return tool(
        this.protect((_params, ctx) => {
          const { tread_id, checkpoint_ns, run_id, tool_call_id } =
            ctx.configurable ?? {};
          return { tread_id, checkpoint_ns, run_id, tool_call_id };
        }, t.invoke.bind(t)),
        {
          name: t.name,
          description: t.description,
          schema: t.schema,
        }
      ) as unknown as DynamicStructuredTool<T>;
    };
  }
}
