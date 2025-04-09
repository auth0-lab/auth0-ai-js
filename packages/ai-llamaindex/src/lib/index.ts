import { FunctionTool, JSONValue } from "llamaindex";
import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";

import { ContextGetter } from "@auth0/ai/authorizers";

import { ToolWrapper } from "../types";

type LlamaIndexContext = {
  toolCallID?: string;
  toolName?: string;
  threadID: string;
};

export const aiContext = new AsyncLocalStorage<LlamaIndexContext>();

/**
 *
 * Set the context for the current async execution.
 *
 * This function should be called in the API route handler.
 *
 * @param params - The context parameters to set.
 * @param params.threadID - The thread ID to set in the context.
 */
export const setAIContext = (params: Pick<LlamaIndexContext, "threadID">) => {
  if (typeof params.threadID !== "string") {
    throw new Error("threadID must be a string");
  }
  aiContext.enterWith(params);
};

type TProtectFunc = (
  getContext: ContextGetter<[any, object | undefined]>,
  execute: (args_0: any, args_1: object | undefined) => any
) => (args_0: any, args_1: object | undefined) => any;

export const createToolWrapper = (protect: TProtectFunc): ToolWrapper => {
  return <
    T,
    R extends JSONValue | Promise<JSONValue>,
    AdditionalToolArgument extends object = object,
  >(
    t: FunctionTool<T, R, AdditionalToolArgument>
  ) => {
    const context = aiContext.getStore();
    if (!context) {
      throw new Error(
        "AI context not set. Please use setAIContext({ threadID }) to set it."
      );
    }
    if (!context.toolCallID) {
      context.toolCallID = randomUUID();
    }
    const { threadID, toolCallID } = context;
    const toolName = t.metadata.name;

    const execute = protect(() => {
      return {
        threadID,
        toolName,
        toolCallID,
      };
    }, t.call);

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return FunctionTool.from(execute, t.metadata) as unknown as FunctionTool<
      T,
      R,
      AdditionalToolArgument
    >;
  };
};
