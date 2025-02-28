import { Tool, ToolExecutionOptions } from "ai";
import { Schema, z } from "zod";

import { AuthorizationPending, Credentials } from "@auth0/ai";
import { AuthorizeResponse, CIBAAuthorizerBase } from "@auth0/ai/CIBA";

import { CIBAuthorizationError } from "./CIBAuthorizationError";

type Parameters = z.ZodTypeAny | Schema<any>;

export class CIBAAuthorizer extends CIBAAuthorizerBase<
  [any, ToolExecutionOptions]
> {
  protected override async getCredentials(
    params: AuthorizeResponse
  ): Promise<Credentials | undefined> {
    try {
      return super.getCredentials(params);
    } catch (err) {
      if (err instanceof Error) {
        throw new CIBAuthorizationError(
          err.message,
          err.name !== AuthorizationPending.name
        );
      }
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
