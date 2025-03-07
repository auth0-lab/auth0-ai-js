/* eslint-disable @typescript-eslint/no-unsafe-function-type */
const isCallback = (
  maybeFunction: any | ((...args: any[]) => void)
): maybeFunction is Function => typeof maybeFunction === "function";

export type AuthorizerToolParameter<
  ToolExecuteArgs extends any[],
  TResult = string
> = TResult | ((...args: ToolExecuteArgs) => Promise<TResult> | TResult);

export const resolveParameter = <
  ToolExecuteArgs extends any[],
  TResult = string
>(
  resolver: AuthorizerToolParameter<ToolExecuteArgs, TResult>,
  context: ToolExecuteArgs
): TResult | Promise<TResult> => {
  if (isCallback(resolver)) {
    return resolver(...context);
  }
  return resolver;
};
