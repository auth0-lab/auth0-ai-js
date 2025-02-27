import { TokenResponse } from "auth0/dist/cjs/auth/tokenExchange";
import { AsyncLocalStorage } from "node:async_hooks";

export type FederatedConnectionAuthorizerParams<ToolExecuteArgs extends any[]> =
  {
    refreshToken: (...args: ToolExecuteArgs) => Promise<string> | string;
    scopes: string[];
    connection: string;
  };

export type AsyncStorageValue<TContext> = {
  getAccessToken: () => string;

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

/**
 * Requests authorization to a third party service via Federated Connection.
 */
export abstract class FederatedConnectionAuthorizerBase<
  ToolExecuteArgs extends any[]
> {
  constructor(
    private readonly auth0: {
      domain: string;
      clientId: string;
      clientSecret: string | undefined;
    },
    private params: FederatedConnectionAuthorizerParams<ToolExecuteArgs>
  ) {}

  protected validateToken(tokenResponse?: TokenResponse) {
    const store = asyncLocalStorage.getStore();
    if (!store) {
      throw new Error(
        "The tool must be wrapped with the FederationConnectionAuthorizer."
      );
    }

    if (!tokenResponse) {
      throw new Error(
        `Authorization required to access the Federated Connection: ${this.params.connection}`
      );
    }

    const currentScopes = tokenResponse.scope.split(" ");
    const missingScopes = this.params.scopes.filter(
      (s) => !currentScopes.includes(s)
    );
    store.currentScopes = currentScopes;

    if (missingScopes.length > 0) {
      throw new Error(
        `Authorization required to access the Federated Connection: ${
          this.params.connection
        }. Missing scopes: ${missingScopes.join(", ")}`
      );
    }
  }

  protected async getAccessToken(
    ...toolContext: ToolExecuteArgs
  ): Promise<TokenResponse | undefined> {
    const exchangeParams = {
      grant_type:
        "urn:auth0:params:oauth:grant-type:token-exchange:federated-connection-access-token",
      client_id: this.auth0.clientId,
      client_secret: this.auth0.clientSecret,
      subject_token_type: "urn:ietf:params:oauth:token-type:refresh_token",
      subject_token:
        typeof this.params.refreshToken === "string"
          ? this.params.refreshToken
          : await this.params.refreshToken(...toolContext),
      connection: this.params.connection,
      requested_token_type:
        "http://auth0.com/oauth/token-type/federated-connection-access-token",
    };

    const res = await fetch(`https://${this.auth0.domain}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(exchangeParams),
    });

    if (!res.ok) {
      return;
    }

    return res.json();
  }

  protected wrapExecute(
    getContext: (...args: ToolExecuteArgs) => any,
    execute: (...args: ToolExecuteArgs) => any
  ): (...args: ToolExecuteArgs) => any {
    return async (...args: ToolExecuteArgs) => {
      const tokenResponse = await this.getAccessToken(...args);

      const storeValue = {
        getAccessToken: () => {
          this.validateToken(tokenResponse);
          return tokenResponse!.access_token;
        },
        context: await getContext(...args),
        scopes: this.params.scopes,
        connection: this.params.connection,
      };

      if (asyncLocalStorage.getStore()) {
        throw new Error(
          "Cannot nest tool calls that require federated connection authorization."
        );
      }

      return asyncLocalStorage.run(storeValue, async () => {
        return execute(...args);
      });
    };
  }
}
