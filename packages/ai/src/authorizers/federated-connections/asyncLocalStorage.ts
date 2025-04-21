import { AsyncLocalStorage } from "node:async_hooks";

import { TokenSet } from "../../credentials";
import { FederatedConnectionError } from "../../interrupts";
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

/**
 * Returns the entire tokenset for the current connection.
 *
 * Use `getAccessTokenForConnection` if you only need the access token.
 *
 * @returns {TokenSet} The current token set.
 */
export const getCredentialsForConnection = () => {
  const store = asyncLocalStorage.getStore();
  if (typeof store === "undefined") {
    throw new Error(
      "The tool must be wrapped with the withTokenForConnections function."
    );
  }
  return store?.credentials;
};

/**
 *
 * Get the access token for the current connection.
 *
 * @returns The access token for the current connection.
 */
export const getAccessTokenForConnection = () => {
  const credentials = getCredentialsForConnection();
  if (!credentials || !credentials.accessToken) {
    throw new FederatedConnectionError("No credentials found");
  }
  return credentials.accessToken;
};
