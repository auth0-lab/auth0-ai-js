import { FunctionTool, JSONValue } from "llamaindex";

import { FGAAuthorizerBase } from "@auth0/ai/FGA";

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
    return <
      T,
      R extends JSONValue | Promise<JSONValue>,
      AdditionalToolArgument extends object = object,
    >(
      t: FunctionTool<T, R, AdditionalToolArgument>
    ) => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      return FunctionTool.from(this.protect(t.call), t.metadata);
    };
  }
}
