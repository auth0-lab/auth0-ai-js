import { AsyncLocalStorage } from "async_hooks";
import { Credentials } from "src/credentials";

export type AsyncStorageValue<TContext> = {
  credentials?: Credentials;

  /**
   * The tool execution context.
   */
  context: TContext;
};

export const asyncLocalStorage = new AsyncLocalStorage<
  AsyncStorageValue<any>
>();

export const getCIBACredentials = (): Credentials | undefined => {
  const t = asyncLocalStorage.getStore();
  if (typeof t === "undefined") {
    throw new Error("The tool must be wrapped with the withCIBA function.");
  }
  return t.credentials;
};
