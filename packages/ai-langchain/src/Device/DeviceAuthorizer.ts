import z from "zod";

import { DeviceAuthorizerBase } from "@auth0/ai/Device";
import { DeviceInterrupts } from "@auth0/ai/interrupts";
import { tool } from "@langchain/core/tools";

import { toGraphInterrupt } from "../util/interrrupt";
import { ToolContext } from "../util/ToolContext";
import { ToolLike, ToolWrapper } from "../util/ToolWrapper";

export type ZodObjectAny = z.ZodObject<any, any, any, any>;

/**
 * Authorizer for federated connections.
 */
export class DeviceAuthorizer extends DeviceAuthorizerBase<[any, any]> {
  protected override handleAuthorizationInterrupts(
    err:
      | DeviceInterrupts.AuthorizationPendingInterrupt
      | DeviceInterrupts.AuthorizationPollingInterrupt
  ): void {
    throw toGraphInterrupt(err);
  }

  authorizer(): ToolWrapper {
    return <
      TSchema,
      TInput,
      TConfig,
      TReturnType,
      T extends ToolLike<TSchema, TInput, TConfig, TReturnType>,
    >(
      t: T
    ) => {
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
