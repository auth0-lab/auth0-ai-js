import { Tool, ToolExecutionOptions } from "ai";
import { TokenResponse } from "auth0/dist/cjs/auth/tokenExchange";
import { Auth0AI } from "src/Auth0AI";
import { Schema, z } from "zod";

import { asyncLocalStorage, AsyncStorageValue } from "./asyncLocalStorage";
import { FederatedConnectionError } from "./FederatedConnectionError";

type Parameters = z.ZodTypeAny | Schema<any>;

export type FederatedConnectionAuthorizerParams = {
  getRefreshToken: () => Promise<string> | string;
  scopes: string[];
  connection: string;
};


export class FederatedConnectionAuthorizer {
  constructor(
    private auth0AI: Auth0AI,
    private params: FederatedConnectionAuthorizerParams
  ) { }

  private async exchangeRefreshToken(
    refreshToken: string
  ): Promise<TokenResponse> {
    //TODO: this should be supported by the node-auth0
    // const r = await this.auth0AI.authClient.tokenExchange.exchangeToken({
    //   grant_type: "urn:auth0:params:oauth:grant-type:token-exchange:federated-connection-access-token",
    //   subject_token_type: "urn:ietf:params:oauth:token-type:refresh_token",
    //   subject_token: refreshToken,
    //   connection: this.params.connection,
    //   requested_token_type: 'http://auth0.com/oauth/token-type/federated-connection-access-token',
    // });

    const res = await fetch(`https://${this.auth0AI.domain}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "urn:auth0:params:oauth:grant-type:token-exchange:federated-connection-access-token",
        client_id: this.auth0AI.clientId,
        client_secret: this.auth0AI.clientSecret,
        subject_token_type: "urn:ietf:params:oauth:token-type:refresh_token",
        subject_token: refreshToken,
        connection: this.params.connection,
        requested_token_type: 'http://auth0.com/oauth/token-type/federated-connection-access-token',
      }),
    });

    if (!res.ok) {
      throw new Error(`Unable to get a Google API access token: ${await res.text()}`);
    }

    const body = await res.json();
    return body;
  }

  private validateToken(
    toolOptions: ToolExecutionOptions,
    tokenResponse?: TokenResponse,
  ) {
    const store = asyncLocalStorage.getStore();
    if (!store) {
      throw new Error('The tool must be wrapped with the FederationConnectionAuthorizer.');
    }

    if (!tokenResponse) {
      throw new FederatedConnectionError(
        `Authorization required to access the Federated Connection: ${this.params.connection}`
      );
    }

    const currentScopes = tokenResponse.scope.split(' ');
    const missingScopes = this.params.scopes.filter(s => !currentScopes.includes(s));

    store.currentScopes = currentScopes;

    if (missingScopes.length > 0) {
      throw new FederatedConnectionError(
        `Authorization required to access the Federated Connection: ${this.params.connection}`
      );
    }

    return tokenResponse.access_token;
  }

  private async getAccessToken() {
    let tokenResponse: TokenResponse | undefined = undefined;
    try {
      const refreshToken = await this.params.getRefreshToken();
      tokenResponse = await this.exchangeRefreshToken(
        refreshToken
      );
    } catch (err) { }
    return tokenResponse;
  }

  authorizer() {
    return <PARAMETERS extends Parameters = any, RESULT = any>(t: Tool<PARAMETERS, RESULT>): Tool<PARAMETERS, RESULT> => {
      return {
        ...t,
        execute: async (params, ctx) => {
          const tokenResponse = await this.getAccessToken();

          const storeValue: AsyncStorageValue = {
            getAccessToken: () => this.validateToken(ctx, tokenResponse),
            context: ctx,
            scopes: this.params.scopes,
            connection: this.params.connection,
          };

          return new Promise((resolve, reject) => {
            if (asyncLocalStorage.getStore()) {
              reject(new Error('Cannot nest tool calls that require federated connection authorization.'));
              return;
            }
            asyncLocalStorage.run(storeValue, async () => {
              return t.execute!(params, ctx)
                .then(resolve, reject);
            });
          })
        }
      };
    };
  }
};
