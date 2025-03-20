import { AsyncLocalStorage } from "async_hooks";

import { Credentials } from "../../credentials";

export type AsyncStorageValue<TContext> = {
  credentials?: Credentials;

  /**
   * The tool execution context.
   */
  context: TContext;

  /**
   * The tool execution arguments.
   */
  args: any[];
};

export const asyncLocalStorage = new AsyncLocalStorage<
  AsyncStorageValue<any>
>();

export const getCIBACredentials = () => {
  const t = asyncLocalStorage.getStore();
  if (typeof t === "undefined") {
    throw new Error("The tool must be wrapped with the withCIBA function.");
  }
  return t.credentials;
};
