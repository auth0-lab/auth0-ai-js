import { Interruption } from "#interruptions";

import { asyncLocalStorage } from "./asyncLocalStorage";

/**
 * Error thrown when a tool call requires an access token for an external service.
 *
 * Throw this error if the service returns Unauthorized for the current access token.
 */
export class FederatedConnectionError extends Interruption {
  /**
   * The auth0 connection name.
   */
  public readonly connection: string;

  /**
   * The scopes required to access the external service as stated
   * in the authorizer.
   */
  public readonly scopes: string[];

  /**
   * The union between the current scopes of the Access Token plus the required scopes.
   * This is the list of scopes that will be used to request a new Access Token.
   */
  public readonly requiredScopes: string[];

  constructor(
    message: string,
  ) {
    const store = asyncLocalStorage.getStore();

    if (!store) {
      throw new Error('FederatedConnectionError created outside of a tool call with Federated Connection.');
    }

    super(message, store.context.toolCallId, 'FEDERATED_CONNECTION_ERROR');

    this.name = this.constructor.name;
    this.connection = store.connection;
    this.scopes = store.scopes;
    this.requiredScopes = [
      ...store.currentScopes || [],
      ...store.scopes
    ];

    // this.missingScopes = missingScopes;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, FederatedConnectionError);
    }
  }
}
