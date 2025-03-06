import { asyncLocalStorage } from "@auth0/ai/CIBA";

import { Interruption } from "#interruptions";

/**
 * Error thrown when a tool call requires authorization via CIBA protocol.
 */
export class CIBAuthorizationError extends Interruption {
  constructor(message: string, public readonly isFinal: boolean) {
    const store = asyncLocalStorage.getStore();

    if (!store) {
      throw new Error(
        "CIBAuthorizationError created outside of a tool call withCIBA."
      );
    }

    super(message, store.context.toolCallId, "CIBA_AUTHORIZATION_ERROR");
  }
}
