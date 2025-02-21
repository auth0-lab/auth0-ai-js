import { Tool, ToolExecutionOptions } from "ai";
import { Auth0AI } from "src/Auth0AI";
import { Schema, z } from "zod";

import { FederatedConnectionAuthorizer as FedConAuthorizer, ValidatableTokenResponse } from "@auth0/ai";

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

  private validateToken(
    tokenResponse?: ValidatableTokenResponse,
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
    store.currentScopes = currentScopes;

    try {
      tokenResponse.validate();
    } catch (err) {
      throw new FederatedConnectionError((err as Error).message);
    }

    return tokenResponse.access_token;
  }

  private async getAccessToken(
    toolOptions: ToolExecutionOptions,
  ) {
    let tokenResponse: ValidatableTokenResponse | undefined = undefined;
    try {
      const refreshToken = await this.params.getRefreshToken();
      tokenResponse = await FedConAuthorizer.authorize({
        refreshToken,
        connection: this.params.connection,
        scopes: this.params.scopes,
        validateToken: false,
      }, toolOptions, this.auth0AI);
    } catch (err) {
      console.error(`Error exchanging refresh token: ${err}`);
    }
    return tokenResponse;
  }

  authorizer() {
    return <PARAMETERS extends Parameters = any, RESULT = any>(t: Tool<PARAMETERS, RESULT>): Tool<PARAMETERS, RESULT> => {
      return {
        ...t,
        execute: async (params, ctx) => {
          const tokenResponse = await this.getAccessToken(ctx);

          const storeValue: AsyncStorageValue = {
            getAccessToken: () => this.validateToken(tokenResponse),
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
