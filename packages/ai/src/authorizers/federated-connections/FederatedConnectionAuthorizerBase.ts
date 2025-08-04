import crypto from "crypto";
import stableHash from "stable-hash";

import {
  TokenResponse,
  TokenSet,
  tokenSetFromTokenResponse,
} from "../../credentials";
import {
  Auth0Interrupt,
  FederatedConnectionError,
  FederatedConnectionInterrupt,
} from "../../interrupts";
import { resolveParameter } from "../../parameters";
import { SubStore } from "../../stores";
import { omit, RequireFields } from "../../util";
import { ContextGetter, nsFromContext } from "../context";
import { Auth0ClientParams, Auth0ClientSchema } from "../types";
import { asyncLocalStorage, AsyncStorageValue } from "./asyncLocalStorage";
import { FederatedConnectionAuthorizerParams } from "./FederatedConnectionAuthorizerParams";

/**
 * Requests authorization to a third party service via Federated Connection.
 */

export class FederatedConnectionAuthorizerBase<ToolExecuteArgs extends any[]> {
  private readonly auth0: Auth0ClientParams;
  private readonly params: RequireFields<
    FederatedConnectionAuthorizerParams<ToolExecuteArgs>,
    "credentialsContext"
  >;
  private readonly credentialsStore: SubStore<TokenSet>;

  constructor(
    auth0: Partial<Auth0ClientParams>,
    params: FederatedConnectionAuthorizerParams<ToolExecuteArgs>
  ) {
    this.auth0 = Auth0ClientSchema.parse(auth0) as Auth0ClientParams;
    this.params = {
      credentialsContext: "thread",
      ...params,
    };

    const instanceID = this.getInstanceID();

    this.credentialsStore = new SubStore<TokenSet>(params.store, {
      baseNamespace: [instanceID, "Credentials"],
      getTTL: (credentials) =>
        credentials.expiresIn ? credentials.expiresIn * 1000 : undefined,
    });

    // Validate that exactly one token source is provided
    const hasRefreshToken = typeof params.refreshToken !== "undefined";
    const hasAccessToken = typeof params.accessToken !== "undefined";

    if (!hasRefreshToken && !hasAccessToken) {
      throw new Error(
        "Either refreshToken or accessToken must be provided to initialize the Authorizer."
      );
    }

    if (hasRefreshToken && hasAccessToken) {
      throw new Error(
        "Only one of refreshToken or accessToken can be provided to initialize the Authorizer."
      );
    }

    // Validate resource server client credentials when using access tokens
    if (hasAccessToken) {
      if (
        !this.auth0.resourceServerClientId ||
        !this.auth0.resourceServerClientSecret
      ) {
        throw new Error(
          "resourceServerClientId and resourceServerClientSecret must be provided when using accessToken for federated token exchange."
        );
      }
    }
  }

  private getInstanceID(): string {
    const props = {
      auth0: this.auth0,
      params: omit(this.params, [
        "store",
        "refreshToken",
        "accessToken",
        "loginHint",
      ]),
    };
    const sh = stableHash(props);
    return crypto.createHash("MD5").update(sh).digest("hex");
  }

  protected handleAuthorizationInterrupts(err: Auth0Interrupt) {
    throw err;
  }

  protected validateToken(tokenResponse?: TokenResponse) {
    const store = asyncLocalStorage.getStore();
    if (!store) {
      throw new Error(
        "The tool must be wrapped with the FederationConnectionAuthorizer."
      );
    }

    const { scopes, connection } = store;

    if (!tokenResponse) {
      throw new FederatedConnectionInterrupt(
        `Authorization required to access the Federated Connection: ${this.params.connection}`,
        connection,
        scopes,
        scopes
      );
    }

    const currentScopes = (tokenResponse.scope ?? "")
      .replace(/,/g, " ")
      .split(" ");

    const missingScopes = scopes.filter((s) => !currentScopes.includes(s));

    store.currentScopes = currentScopes;

    if (missingScopes.length > 0) {
      throw new FederatedConnectionInterrupt(
        `Authorization required to access the Federated Connection: ${this.params.connection}. Missing scopes: ${missingScopes.join(", ")}`,
        connection,
        scopes,
        [...currentScopes, ...scopes]
      );
    }
  }

  private async getAccessTokenImpl(
    ...toolContext: ToolExecuteArgs
  ): Promise<TokenResponse | undefined> {
    const store = asyncLocalStorage.getStore();
    if (!store) {
      throw new Error(
        "The tool must be wrapped with the FederationConnectionAuthorizer."
      );
    }

    const { connection } = store;

    // Determine which token type to use and get the appropriate subject token
    let subjectToken: string | undefined;
    let subjectTokenType: string;
    const clientId: string =
      this.auth0.clientId || this.auth0.resourceServerClientId!;
    const clientSecret: string =
      this.auth0.clientSecret || this.auth0.resourceServerClientSecret!;

    if (typeof this.params.refreshToken === "function") {
      subjectToken = await this.getRefreshToken(...toolContext);
      subjectTokenType = "urn:ietf:params:oauth:token-type:refresh_token";
    } else if (typeof this.params.accessToken === "function") {
      subjectToken = await resolveParameter(
        this.params.accessToken,
        toolContext
      );
      subjectTokenType = "urn:ietf:params:oauth:token-type:access_token";
    } else {
      // This should never happen due to constructor validation, but TypeScript needs this
      throw new Error("Either refreshToken or accessToken must be configured");
    }

    if (!subjectToken) {
      return;
    }

    // Get optional login hint if provided
    const loginHint =
      typeof this.params.loginHint === "function"
        ? await resolveParameter(this.params.loginHint, toolContext)
        : undefined;

    const exchangeParams: Record<string, string> = {
      grant_type:
        "urn:auth0:params:oauth:grant-type:token-exchange:federated-connection-access-token",
      client_id: clientId,
      subject_token_type: subjectTokenType,
      subject_token: subjectToken,
      connection: connection,
      requested_token_type:
        "http://auth0.com/oauth/token-type/federated-connection-access-token",
    };

    // Add client secret if available
    if (clientSecret) {
      exchangeParams.client_secret = clientSecret;
    }

    // Add login hint if provided
    if (loginHint) {
      exchangeParams.login_hint = loginHint;
    }

    const res = await fetch(`https://${this.auth0.domain}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(exchangeParams),
    });

    if (!res.ok) {
      //TODO: handle all type of response errors.
      return;
    }

    const tokenResponse: TokenResponse = await res.json();
    return tokenResponse;
  }

  protected async getAccessToken(
    ...toolContext: ToolExecuteArgs
  ): Promise<TokenSet> {
    let tokenResponse: TokenResponse | undefined;

    // Use token exchange for both refresh tokens and access tokens
    if (
      typeof this.params.refreshToken === "function" ||
      typeof this.params.accessToken === "function"
    ) {
      tokenResponse = await this.getAccessTokenImpl(...toolContext);
    }

    this.validateToken(tokenResponse);
    return tokenSetFromTokenResponse(tokenResponse!);
  }

  protected async getRefreshToken(...toolContext: ToolExecuteArgs) {
    return await resolveParameter(this.params.refreshToken, toolContext);
  }

  /**
   *
   * Wraps the execute method of an AI tool to handle Federated Connections authorization.
   *
   * @param getContext - A function that returns the context of the tool execution.
   * @param execute - The tool execute method.
   * @returns The wrapped execute method.
   */
  protect(
    getContext: ContextGetter<ToolExecuteArgs>,
    execute: (...args: ToolExecuteArgs) => any
  ): (...args: ToolExecuteArgs) => any {
    return async (...args: ToolExecuteArgs) => {
      const context = getContext(...args);
      const asyncStore: AsyncStorageValue = {
        context: context,
        scopes: this.params.scopes,
        connection: this.params.connection,
      };

      if (asyncLocalStorage.getStore()) {
        throw new Error(
          "Cannot nest tool calls that require federated connection authorization."
        );
      }

      return asyncLocalStorage.run(asyncStore, async () => {
        const credentialsNS = nsFromContext(
          this.params.credentialsContext,
          context
        );
        try {
          let credentials: TokenSet = await this.credentialsStore.get(
            credentialsNS,
            "credential"
          );
          if (!credentials) {
            credentials = await this.getAccessToken(...args);
            await this.credentialsStore.put(
              credentialsNS,
              "credential",
              credentials
            );
          }
          asyncStore.credentials = credentials;
          return await execute(...args);
        } catch (err) {
          if (err instanceof FederatedConnectionError) {
            this.credentialsStore.delete(credentialsNS, "credential");
            const interrupt = new FederatedConnectionInterrupt(
              err.message,
              asyncStore.connection,
              asyncStore.scopes,
              asyncStore.scopes
            );
            return this.handleAuthorizationInterrupts(interrupt);
          }
          if (err instanceof Auth0Interrupt) {
            this.credentialsStore.delete(credentialsNS, "credential");
            return this.handleAuthorizationInterrupts(err);
          }
          throw err;
        }
      });
    };
  }
}
