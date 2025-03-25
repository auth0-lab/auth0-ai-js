import { AsyncLocalStorage } from "node:async_hooks";

type VercelAIContext = {
  threadID: string;
};

export const aiContext = new AsyncLocalStorage<VercelAIContext>();

/**
 *
 * Set the context for the current async execution.
 *
 * This function should be called in the API route handler.
 *
 * @param params - The context parameters to set.
 * @param params.threadID - The thread ID to set in the context.
 */
export const setAIContext = (params: VercelAIContext) => {
  if (typeof params.threadID !== "string") {
    throw new Error("threadID must be a string");
  }
  aiContext.enterWith(params);
};
