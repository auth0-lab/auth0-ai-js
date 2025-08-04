import { AuthorizerToolParameter } from "../../parameters";
import { Store } from "../../stores";
import { AuthContext } from "../context";

export type FederatedConnectionAuthorizerParams<ToolExecuteArgs extends any[]> =
  {
    /**
     * The Auth0 refresh token to exchange for an Federated Connection access token.
     */
    refreshToken?: AuthorizerToolParameter<ToolExecuteArgs, string | undefined>;

    /**
     * The access token to exchange for a Federated Connection access token.
     * This enables federated token exchange using access tokens instead of refresh tokens.
     */
    accessToken?: AuthorizerToolParameter<ToolExecuteArgs, string | undefined>;

    /**
     * Optional login hint to provide to the federated connection provider.
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
