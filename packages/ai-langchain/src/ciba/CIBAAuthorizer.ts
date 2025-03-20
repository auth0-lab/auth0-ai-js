import { ToolWrapper } from "src/util/ToolWrapper";
import z from "zod";

import { Credentials } from "@auth0/ai";
import { CIBAAuthorizationRequest, CIBAAuthorizerBase } from "@auth0/ai/CIBA";
import { DynamicStructuredTool, tool } from "@langchain/core/tools";
import { LangGraphRunnableConfig } from "@langchain/langgraph";

import { toGraphInterrupt } from "../util/interrrupt";
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

  override async getCredentials(
    authRequest: CIBAAuthorizationRequest
  ): Promise<Credentials | undefined> {
    try {
      return await super.getCredentials(authRequest);
    } catch (err: any) {
      throw toGraphInterrupt(err);
    }
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
