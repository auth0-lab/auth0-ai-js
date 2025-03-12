import { JSONValue } from "llamaindex";

import { FGAAuthorizerBase } from "@auth0/ai/FGA";
import { ToolRunnableConfig } from "@langchain/core/tools";

export type LlamaToolHandler<T> = (input: T) => JSONValue | Promise<JSONValue>;

/**
 * The FGAAuthorizer class implements the FGA authorization control for a Vercel AI tool.
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
    return <T>(t: LlamaToolHandler<T>): LlamaToolHandler<T> => {
      return this.protect(t) as LlamaToolHandler<T>;
    };
  }
}
