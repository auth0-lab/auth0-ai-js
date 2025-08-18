import { TokenResponse } from "../../credentials";
import { AuthorizerToolParameter } from "../../parameters";
import { Store } from "../../stores";
import { AuthContext } from "../context";

export enum SUBJECT_TOKEN_TYPES {
  /**
   * Indicates that the token is an OAuth 2.0 refresh token issued by the given authorization server.
   *
   * @see {@link https://datatracker.ietf.org/doc/html/rfc8693#section-3-3.4 RFC 8693 Section 3-3.4}
   */
  SUBJECT_TYPE_REFRESH_TOKEN = "urn:ietf:params:oauth:token-type:refresh_token",

  /**
   * Indicates that the token is an OAuth 2.0 access token issued by the given authorization server.
   *
   * @see {@link https://datatracker.ietf.org/doc/html/rfc8693#section-3-3.2 RFC 8693 Section 3-3.2}
   */
  SUBJECT_TYPE_ACCESS_TOKEN = "urn:ietf:params:oauth:token-type:access_token",
}

export type FederatedConnectionAuthorizerParams<ToolExecuteArgs extends any[]> =
  {
    /**
     * The Auth0 refresh token to exchange for an Federated Connection access token.
     */
    refreshToken?: AuthorizerToolParameter<ToolExecuteArgs, string | undefined>;

    /**
     * The Federated connection access token if available in the tool context.
     * This can also be provided as a string exchange when exchanging an access token for a Federated Connection access token.
     */
    accessToken?:
      | AuthorizerToolParameter<
          ToolExecuteArgs,
          TokenResponse | string | undefined
        >
      | string
      | undefined;

    /**
     * This is used to specify the type of token being requested from Auth0 during the OAuth 2.0 token exchange request.
     */
    subjectTokenType?: SUBJECT_TOKEN_TYPES | undefined;

    /**
     * Optional login hint to provide when exchanging an access or refresh token for a Federated Connection access token.
     */
    loginHint?: AuthorizerToolParameter<ToolExecuteArgs, string | undefined>;

    /**
     * The scopes required in the access token of the federated connection provider.
     */
    scopes: string[];

    /**
     * The connection name of the federated connection provider.
     */
    connection: string;

    /**
     * AuthContext defines the scope of credential sharing:
     * - "tool-call": Credentials are valid only for a single invocation of the tool.
     * - "tool": Credentials are shared across multiple calls to the same tool within the same thread.
     * - "thread": Credentials are shared across all tools using the same authorizer within the current thread.
     * - "agent": Credentials are shared globally across all threads and tools in the agent.
     *
     * @default "thread"
     */
    credentialsContext?: AuthContext;

    /**
     * An store used to store the authorization credentials according
     * to the `credentialsContext` scope.
     */
    store: Store;
  };
