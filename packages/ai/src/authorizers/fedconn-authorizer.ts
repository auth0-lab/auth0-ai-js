import { TokenResponse } from "auth0/dist/cjs/auth/tokenExchange";

import { AuthorizerParams } from "./";

type StringOrFn<TContext> = (params: TContext) => Promise<string>;

export type FederatedConnectionAuthorizerOptions<ToolType> = {
  refreshToken: string | StringOrFn<ToolType>;
  connection: string;
  scopes: string[];
  validateToken?: boolean;
};

export type ValidatableTokenResponse = TokenResponse & {
  /**
   * Validate the scopes of an access token returned by Auth0
   * with the requested scopes.
   *
   * @returns void
   */
  validate: () => void;
};

/**
 * Requests authorization to a third party service via Federated Connection.
 */
export class FederatedConnectionAuthorizer {
  private readonly auth0: { domain: string; clientId: string; clientSecret: string | undefined; };

  private constructor(params?: AuthorizerParams) {
    this.auth0 = {
      domain: params?.domain || process.env.AUTH0_DOMAIN!,
      clientId: params?.clientId || process.env.AUTH0_CLIENT_ID!,
      clientSecret: params?.clientSecret || process.env.AUTH0_CLIENT_SECRET,
    };
  }

  private validateToken<TContext>(
    params: FederatedConnectionAuthorizerOptions<TContext>,
    tokenResponse: TokenResponse
  ) {
    if (!tokenResponse) {
      throw new Error(
        `Authorization required to access the Federated Connection: ${params.connection}`
      );
    }

    const currentScopes = tokenResponse.scope.split(' ');
    const missingScopes = params.scopes.filter(s => !currentScopes.includes(s));

    if (missingScopes.length > 0) {
      throw new Error(
        `Authorization required to access the Federated Connection: ${params.connection}. Missing scopes: ${missingScopes.join(', ')}`
      );
    }
  }

  private async getAccessToken<TContext>(
    params: FederatedConnectionAuthorizerOptions<TContext>,
    toolContext?: TContext
  ): Promise<ValidatableTokenResponse> {
    const exchangeParams = {
      grant_type: "urn:auth0:params:oauth:grant-type:token-exchange:federated-connection-access-token",
      client_id: this.auth0.clientId,
      client_secret: this.auth0.clientSecret,
      subject_token_type: "urn:ietf:params:oauth:token-type:refresh_token",
      subject_token: typeof params.refreshToken === 'string' ?
        params.refreshToken :
        await params.refreshToken(toolContext as TContext),
      connection: params.connection,
      requested_token_type: 'http://auth0.com/oauth/token-type/federated-connection-access-token',
    };

    const res = await fetch(`https://${this.auth0.domain}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(exchangeParams),
    });

    if (!res.ok) {
      throw new Error(`Unable to get an access token: ${await res.text()}`);
    }

    const tokenResponse = await res.json() as TokenResponse;
    return {
      ...tokenResponse,
      validate: () => this.validateToken(params, tokenResponse)
    };
  }

  static async authorize<TContext>(
    options: FederatedConnectionAuthorizerOptions<TContext>,
    toolContext: TContext,
    params?: AuthorizerParams
  ) {
    const authorizer = new FederatedConnectionAuthorizer(params);
    const tokenResponse = await authorizer.getAccessToken(options, toolContext);
    const validateToken = options.validateToken ?? true;
    if (validateToken) {
      authorizer.validateToken(options, tokenResponse);
    }
    return tokenResponse;
  }
}
