import { FGAAuthorizerBase } from "@auth0/ai/FGA";
import {
  DynamicStructuredTool,
  tool,
  ToolRunnableConfig,
} from "@langchain/core/tools";

import { ToolWrapper, ZodObjectAny } from "../util/ToolWrapper";

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
  authorizer(): ToolWrapper {
    return <T extends ZodObjectAny = ZodObjectAny>(
      t: DynamicStructuredTool<T>
    ) => {
      return tool(this.protect(t.invoke.bind(t)), {
        name: t.name,
        description: t.description,
        schema: t.schema,
      }) as unknown as DynamicStructuredTool<T>;
    };
  }
}
