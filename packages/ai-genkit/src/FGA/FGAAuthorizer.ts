import { GenkitBeta } from "genkit/beta";

import { FGAAuthorizerBase } from "@auth0/ai/FGA";
import { ToolFnOptions, ToolRunOptions } from "@genkit-ai/ai/tool";

import { createToolWrapper, ToolWrapper } from "../lib";

/**
 * The FGAAuthorizer class implements the FGA authorization control for a Genkit AI tool.
 *
 * This class extends the FGAAuthorizerBase and provides a method to build a tool authorizer
 * that protects the tool execution using FGA.
 *
 */
export class FGAAuthorizer extends FGAAuthorizerBase<
  [any, ToolFnOptions & ToolRunOptions]
> {
  constructor(
    private readonly genkit: GenkitBeta,
    ...args: ConstructorParameters<typeof FGAAuthorizerBase>
  ) {
    super(...args);
  }

  /**
   *
   * Builds a tool authorizer that protects the tool execution with FGA.
   *
   * @returns A tool authorizer.
   */
  authorizer(): ToolWrapper {
    return createToolWrapper(this.genkit, this.protect.bind(this));
  }
}
