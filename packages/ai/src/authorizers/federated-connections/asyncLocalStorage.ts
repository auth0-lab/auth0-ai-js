import { AsyncLocalStorage } from "node:async_hooks";

export type AsyncStorageValue<TContext> = {
  /**
   * The Federated Connection access token.
   */
  accessToken?: string;

  /**
   * The tool execution context.
   */
  context: TContext;

  /**
   * The federated connection name.
   */
  connection: string;

  /**
   * The scopes required to access the federated connection.
   */
  scopes: string[];

  /**
   * The scopes that the current access token has.
   */
  currentScopes?: string[];
};

export const asyncLocalStorage = new AsyncLocalStorage<
  AsyncStorageValue<any>
>();
