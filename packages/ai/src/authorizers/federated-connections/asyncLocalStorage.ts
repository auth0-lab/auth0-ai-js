import { AsyncLocalStorage } from "node:async_hooks";

import { TokenSet } from "../../credentials";
import { ToolCallContext } from "../context";

export type AsyncStorageValue = {
  /**
   * The Federated Connection access token.
   */
  credentials?: TokenSet;

  /**
   * The tool execution context.
   */
  context: ToolCallContext;

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

export const asyncLocalStorage = new AsyncLocalStorage<AsyncStorageValue>();

export const getCredentialsForConnection = () => {
  const store = asyncLocalStorage.getStore();
  if (typeof store === "undefined") {
    throw new Error(
      "The tool must be wrapped with the withTokenForConnections function."
    );
  }
  return store?.credentials;
};
