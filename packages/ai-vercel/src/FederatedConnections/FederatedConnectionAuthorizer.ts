import { Tool, ToolExecutionOptions } from "ai";
import { TokenResponse } from "auth0/dist/cjs/auth/tokenExchange";
import { Schema, z } from "zod";

import { FederatedConnections } from "@auth0/ai";

import { FederatedConnectionError } from "./FederatedConnectionError";

type Parameters = z.ZodTypeAny | Schema<any>;

export class FederatedConnectionAuthorizer extends FederatedConnections.FederatedConnectionAuthorizerBase<
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
        execute: this.wrapExecute((params, ctx) => ctx, t.execute!),
      };
    };
  }
}
