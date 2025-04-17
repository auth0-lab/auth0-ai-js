import { FGAAuthorizerBase } from "@auth0/ai/FGA";
import { tool } from "@langchain/core/tools";

import { ToolLike, ToolWrapper } from "../util/ToolWrapper";

/**
 * The FGAAuthorizer class implements the FGA authorization control for a LangChain AI tool.
 *
 * This class extends the FGAAuthorizerBase and provides a method to build a tool authorizer
 * that protects the tool execution using FGA.
 *
 */
export class FGAAuthorizer extends FGAAuthorizerBase<[any, any]> {
  /**
   *
   * Builds a tool authorizer that protects the tool execution with FGA.
   *
   * @returns A tool authorizer.
   */
  authorizer(): ToolWrapper {
    return <T extends ToolLike>(t: T) => {
      const protectedFunc = this.protect(t.invoke.bind(t));
      return tool(protectedFunc, {
        name: t.name,
        description: t.description,
        schema: t.schema,
      }) as unknown as T;
    };
  }
}
