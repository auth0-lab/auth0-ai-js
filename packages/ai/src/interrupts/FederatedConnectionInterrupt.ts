import { Auth0Interrupt } from "./Auth0Interrupt";

/**
 * Error thrown when a tool call requires an access token for an external service.
 *
 * Throw this error if the service returns Unauthorized for the current access token.
 */
export class FederatedConnectionInterrupt extends Auth0Interrupt {
  public behavior: "resume" | "reload";

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

  public static code = "FEDERATED_CONNECTION_ERROR" as const;

  constructor(
    message: string,
    connection: string,
    scopes: string[],
    requiredScopes: string[],
    behavior: "resume" | "reload" = "resume"
  ) {
    super(message, FederatedConnectionInterrupt.code);
    this.behavior = behavior;
    this.connection = connection;
    this.scopes = scopes;
    this.requiredScopes = requiredScopes;
  }
}

/**
 * Error thrown when a tool call requires an access token for an external service.
 *
 * The authorizer will automatically convert this class of error to FederatedConnectionInterrupt.
 */
export class FederatedConnectionError extends Error {
  constructor(message: string) {
    super(message);
  }
}
