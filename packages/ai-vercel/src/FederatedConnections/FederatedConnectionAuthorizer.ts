import { Tool, ToolExecutionOptions } from "ai";
import { Schema, z } from "zod";

import { TokenResponse } from "@auth0/ai";
import { FederatedConnectionAuthorizerBase } from "@auth0/ai/FederatedConnections";

import { FederatedConnectionError } from "./FederatedConnectionError";

type Parameters = z.ZodTypeAny | Schema<any>;

export class FederatedConnectionAuthorizer extends FederatedConnectionAuthorizerBase<
  [any, ToolExecutionOptions]
> {
  protected override validateToken(tokenResponse: TokenResponse): void {
    try {
      super.validateToken(tokenResponse);
    } catch (err) {
      if (
        err instanceof Error &&
        err.message.startsWith("Authorization required")
      ) {
        throw new FederatedConnectionError(err.message);
      }
      throw err;
    }
  }

  authorizer() {
    return <PARAMETERS extends Parameters = any, RESULT = any>(
      t: Tool<PARAMETERS, RESULT>
    ): Tool<PARAMETERS, RESULT> => {
      return {
        ...t,
        execute: this.protect((params, ctx) => ctx, t.execute!),
      };
    };
  }
}
