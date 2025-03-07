import { Tool, ToolExecutionOptions } from "ai";
import { Schema, z } from "zod";

import { FGAAuthorizerBase } from "@auth0/ai/FGA";

type Parameters = z.ZodTypeAny | Schema<any>;

/**
 * The FGAAuthorizer class implements the FGA authorization control for a Vercel AI tool.
 *
 * This class extends the FGAAuthorizerBase and provides a method to build a tool authorizer
 * that protects the tool execution using FGA.
 *
 */
export class FGAAuthorizer extends FGAAuthorizerBase<
  [any, ToolExecutionOptions]
> {
  /**
   *
   * Builds a tool authorizer that protects the tool execution with FGA.
   *
   * @returns A tool authorizer.
   */
  authorizer() {
    return <PARAMETERS extends Parameters = any, RESULT = any>(
      t: Tool<PARAMETERS, RESULT>
    ): Tool<PARAMETERS, RESULT> => {
      return {
        ...t,
        execute: this.protect(t.execute!),
      };
    };
  }
}
