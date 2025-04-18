import { Tool, ToolExecutionOptions } from "ai";
import { Schema, z } from "zod";

import { FederatedConnectionAuthorizerBase } from "@auth0/ai/FederatedConnections";

import { ToolContext } from "../util/ToolContext";

type Parameters = z.ZodTypeAny | Schema<any>;

export class FederatedConnectionAuthorizer extends FederatedConnectionAuthorizerBase<
  [any, ToolExecutionOptions]
> {
  authorizer() {
    return <PARAMETERS extends Parameters = any, RESULT = any>(
      t: Tool<PARAMETERS, RESULT>
    ): Tool<PARAMETERS, RESULT> => {
      return {
        ...t,
        execute: this.protect(ToolContext(t), t.execute!),
      };
    };
  }
}
