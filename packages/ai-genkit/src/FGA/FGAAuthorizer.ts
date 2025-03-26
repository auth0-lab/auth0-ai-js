import { ToolWrapper } from "src/util/types";

import { FGAAuthorizerBase } from "@auth0/ai/FGA";

/**
 * The FGAAuthorizer class implements the FGA authorization control for a Genkit AI tool.
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
    return ((fn) => {
      return this.protect(fn);
    }) as ToolWrapper;
  }
}
