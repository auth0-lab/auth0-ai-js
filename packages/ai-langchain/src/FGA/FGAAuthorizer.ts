import z from "zod";

import { FGAAuthorizerBase } from "@auth0/ai/FGA";
import { RunnableFunc } from "@langchain/core/runnables";
import { ToolRunnableConfig } from "@langchain/core/tools";

export type ZodObjectAny = z.ZodObject<any, any, any, any>;

/**
 * The FGAAuthorizer class implements the FGA authorization control for a LangChain AI tool.
 *
 * This class extends the FGAAuthorizerBase and provides a method to build a tool authorizer
 * that protects the tool execution using FGA.
 *
 */
export class FGAAuthorizer extends FGAAuthorizerBase<
  [any, ToolRunnableConfig]
> {
  /**
   *
   * Builds a tool authorizer that protects the tool execution with FGA.
   *
   * @returns A tool authorizer.
   */
  authorizer() {
    return <T extends Record<string, any>>(
      t: RunnableFunc<T, any, ToolRunnableConfig>
    ): RunnableFunc<T, any, ToolRunnableConfig> => {
      return this.protect(t) as RunnableFunc<T, any, ToolRunnableConfig>;
    };
  }
}
