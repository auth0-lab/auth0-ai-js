import { Auth0AIError } from "./Auth0AIError";

/**
 * Error thrown when a tool call requires authorization to access a third party provider.
 */

export class ThirdPartyAccessAuthRequiredError extends Auth0AIError {
  connection: string;
  scopes: string[];

  constructor(message: string, toolCallId: string, connection: string, scopes: string[]) {
    super(message, toolCallId, 'THIRD_PARTY_ACCESS_AUTH_REQUIRED');
    this.name = this.constructor.name;
    this.connection = connection;
    this.scopes = scopes;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ThirdPartyAccessAuthRequiredError);
    }
  }
}
