import { FunctionTool, JSONValue } from "llamaindex";

export type ToolWrapper = <
  T,
  R extends JSONValue | Promise<JSONValue>,
  AdditionalToolArgument extends object = object,
>(
  t: FunctionTool<T, R, AdditionalToolArgument>
) => FunctionTool<T, R, AdditionalToolArgument>;
