import { AsyncLocalStorage } from "node:async_hooks";

type VercelAIContext = {
  threadID: string;
};

const aiContext = new AsyncLocalStorage<VercelAIContext>();
let globalContext: VercelAIContext | (() => VercelAIContext) | undefined =
  undefined;

export const getAIContext = () => {
  const aictx = aiContext.getStore();
  if (aictx?.threadID) {
    return aictx;
  }

  if (typeof globalContext === "function") {
    return globalContext();
  } else if (globalContext) {
    return globalContext;
  }

  throw new Error(
    "No AI context found. Make sure to call setAIContext({threadID}) from '@auth0/ai-vercel'"
  );
};

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
  if (!params || typeof params.threadID !== "string") {
    throw new Error("threadID must be a string");
  }
  aiContext.enterWith(params);
};

/**
 * Similar to `setAIContext`. Wraps the function in a context.
 *
 * Some environments like Cloudflare Workers don't support `AsyncLocalStorage`.
 * @deprecated Use `runWithAIContext` instead.
 * @param params - The context parameters to set.
 * @param params.threadID - The thread ID to set in the context.
 * @param fn - The function to execute within the context.
 * @returns The result of the function executed within the context.
 */
export const runInAIContext = <T>(params: VercelAIContext, fn: () => T) => {
  return aiContext.run(params, fn);
};

/**
 *
 * Run a function with the provided AI context.
 *
 * This allows you to execute code within a specific AI context scope.
 *
 * @param params - The context parameters to use.
 * @param params.threadID - The thread ID to set in the context.
 * @param fn - The function to execute within the context.
 */
export const runWithAIContext = <T>(params: VercelAIContext, fn: () => T) => {
  if (!params || typeof params.threadID !== "string") {
    throw new Error("threadID must be a string");
  }
  return aiContext.run(params, fn);
};

export const setGlobalAIContext = (
  params: VercelAIContext | (() => VercelAIContext)
) => {
  if (!params) {
    throw new Error("params must be defined");
  }
  if (
    typeof params === "object" &&
    params !== null &&
    typeof params.threadID !== "string"
  ) {
    throw new Error("threadID must be a string");
  }
  if (globalContext) {
    throw new Error(
      "Global AI context is already set. Use global context only once in serverless functions like Cloudflare Agents."
    );
  }
  globalContext = params;
};
