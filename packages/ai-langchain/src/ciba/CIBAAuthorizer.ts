import z from "zod";

import { CIBAAuthorizerBase } from "@auth0/ai/CIBA";
import {
  AuthorizationPendingInterrupt,
  AuthorizationPollingInterrupt,
} from "@auth0/ai/interrupts";
import { DynamicStructuredTool, tool } from "@langchain/core/tools";
import { LangGraphRunnableConfig } from "@langchain/langgraph";

import { toGraphInterrupt } from "../util/interrrupt";
import { ToolWrapper } from "../util/ToolWrapper";
import { CIBAAuthorizerParams, handleLangGraphStore } from "./params";

export type ZodObjectAny = z.ZodObject<any, any, any, any>;

/**
 * Authorizer for federated connections.
 */
export class CIBAAuthorizer extends CIBAAuthorizerBase<
  [any, LangGraphRunnableConfig]
> {
  protectedTools: string[] = [];

  constructor(
    auth0: ConstructorParameters<typeof CIBAAuthorizerBase>[0],
    config: CIBAAuthorizerParams<[any, LangGraphRunnableConfig]>
  ) {
    super(auth0, handleLangGraphStore(config));
  }

  protected override handleAuthorizationInterrupts(
    err: AuthorizationPendingInterrupt | AuthorizationPollingInterrupt
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
