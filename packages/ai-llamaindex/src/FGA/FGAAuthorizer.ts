import { JSONValue } from "llamaindex";

import { FGAAuthorizerBase } from "@auth0/ai/FGA";

import { createToolWrapper } from "../lib";

export type LlamaToolHandler<T> = (input: T) => JSONValue | Promise<JSONValue>;

/**
 * The FGAAuthorizer class implements the FGA authorization control for a LlamaIndex AI tool.
 *
 * This class extends the FGAAuthorizerBase and provides a method to build a tool authorizer
 * that protects the tool execution using FGA.
 *
 */
export class FGAAuthorizer extends FGAAuthorizerBase<
  [any, object | undefined]
> {
  /**
   *
   * Builds a tool authorizer that protects the tool execution with FGA.
   *
   * @returns A tool authorizer.
   */
  authorizer() {
    return createToolWrapper(this.protect.bind(this));
  }
}
