import { AuthenticationClient } from "auth0";
import { Credentials } from "src/credentials";
import {
  AccessDeniedInterrupt,
  AuthorizationPendingInterrupt,
  AuthorizationPollingInterrupt,
  AuthorizationRequestExpiredInterrupt,
  InvalidGrantInterrupt,
  UserDoesNotHavePushNotificationsInterrupt,
} from "src/interrupts";
import { resolveParameter } from "src/parameters";

import { AuthorizerParams } from "../";
import { asyncLocalStorage, AsyncStorageValue } from "./asyncLocalStorage";
import { CIBAAuthorizationRequest } from "./CIBAAuthorizationRequest";
import { CIBAAuthorizerParams } from "./CIBAAuthorizerParams";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
function ensureOpenIdScope(scopes: string[]): string[] {
  return scopes.includes("openid") ? scopes : ["openid", ...scopes];
}
/**
 * Requests authorization by prompting the user via an out-of-band channel from
 * the backend.
 */
export class CIBAAuthorizerBase<ToolExecuteArgs extends any[]> {
  auth0: AuthenticationClient;

  constructor(
    auth0: AuthorizerParams,
    private readonly params: CIBAAuthorizerParams<ToolExecuteArgs>
  ) {
    this.auth0 = new AuthenticationClient({
      domain: auth0?.domain || process.env.AUTH0_DOMAIN!,
      clientId: auth0?.clientId || process.env.AUTH0_CLIENT_ID!,
      clientSecret: auth0?.clientSecret || process.env.AUTH0_CLIENT_SECRET,
      clientAssertionSigningAlg: auth0?.clientAssertionSigningAlg,
      clientAssertionSigningKey: auth0?.clientAssertionSigningKey,
      idTokenSigningAlg: auth0?.idTokenSigningAlg,
      clockTolerance: auth0?.clockTolerance,
      useMTLS: auth0?.useMTLS,
    });
  }

  private async start(
    toolContext: ToolExecuteArgs
  ): Promise<CIBAAuthorizationRequest> {
    const requestedAt = Date.now() / 1000;
    const authorizeParams = {
      scope: ensureOpenIdScope(this.params.scopes).join(" "),
      binding_message: "",
      userId: "",
      audience: this.params.audience || "",
      request_expiry: this.params.requestExpiry?.toString(),
    };

    authorizeParams.binding_message = await resolveParameter(
      this.params.bindingMessage,
      toolContext
    );

    authorizeParams.userId = await resolveParameter(
      this.params.userID,
      toolContext
    );

    const response = await this.auth0.backchannel.authorize(authorizeParams);

    return {
      id: response.auth_req_id,
      requestedAt: requestedAt,
      expiresIn: response.expires_in,
      interval: response.interval,
    };
  }

  private async getCredentialsInternal(
    authRequest: CIBAAuthorizationRequest
  ): Promise<Credentials | undefined> {
    try {
      const elapsedSeconds = Date.now() / 1000 - authRequest.requestedAt;

      if (elapsedSeconds >= authRequest.expiresIn) {
        throw new AuthorizationRequestExpiredInterrupt(
          "The authorization request has expired.",
          authRequest
        );
      }

      const response = await this.auth0.backchannel.backchannelGrant({
        auth_req_id: authRequest.id,
      });

      const credentials = {
        accessToken: {
          type: response.token_type || "bearer",
          value: response.access_token,
        },
        refreshToken: response.refresh_token
          ? {
              type: response.token_type || "bearer",
              value: response.refresh_token,
            }
          : undefined,
        idToken: response.id_token
          ? {
              type: response.token_type || "bearer",
              value: response.id_token,
            }
          : undefined,
      };

      return credentials;
    } catch (e: any) {
      if (e.error === "authorization_pending") {
        throw new AuthorizationPendingInterrupt(
          e.error_description,
          authRequest
        );
      }

      if (e.error === "slow_down") {
        throw new AuthorizationPollingInterrupt(
          e.error_description,
          authRequest
        );
      }

      //For the rest of exceptions we can delete the auth request.
      await this.deleteAuthRequest();

      if (e.error == "invalid_grant") {
        throw new InvalidGrantInterrupt(e.error_description, authRequest);
      }

      if (e.error == "invalid_request") {
        throw new UserDoesNotHavePushNotificationsInterrupt(
          e.error_description
        );
      }
      if (e.error == "access_denied") {
        throw new AccessDeniedInterrupt(e.error_description, authRequest);
      }

      throw e;
    }
  }

  protected async getCredentials(authRequest: CIBAAuthorizationRequest) {
    return this.getCredentialsInternal(authRequest);
  }

  protected async getCredentialsPolling(
    authRequest: CIBAAuthorizationRequest
  ): Promise<Credentials | undefined> {
    let credentials: Credentials | undefined = undefined;

    do {
      try {
        credentials = await this.getCredentialsInternal(authRequest);
      } catch (err) {
        if (
          err instanceof AuthorizationPendingInterrupt ||
          err instanceof AuthorizationPollingInterrupt
        ) {
          await sleep(err.request.interval * 1000);
        } else {
          throw err;
        }
      }
    } while (!credentials);

    return credentials;
  }

  protected deleteAuthRequest() {
    const store = asyncLocalStorage.getStore();
    if (!store) {
      throw new Error("This method should be called from within a tool.");
    }
    if (this.params.onAuthorizationRequest === "interrupt") {
      return this.params.storeAuthorizationResponse(
        undefined,
        ...(store.args as ToolExecuteArgs)
      );
    }
  }

  /**
   *
   * Wraps the execute method of a AI tool to handle CIBA authorization.
   *
   * @param getContext - A function that returns the context of the tool execution.
   * @param execute - The tool execute method.
   * @returns The wrapped execute method.
   */
  protect(
    getContext: (...args: ToolExecuteArgs) => any,
    execute: (...args: ToolExecuteArgs) => any
  ): (...args: ToolExecuteArgs) => any {
    return async (...args: ToolExecuteArgs) => {
      let authRequest: CIBAAuthorizationRequest | undefined;
      if (asyncLocalStorage.getStore()) {
        throw new Error(
          "Cannot nest tool calls that require CIBA authorization."
        );
      }

      const interruptMode =
        typeof this.params.onAuthorizationRequest === "undefined" ||
        this.params.onAuthorizationRequest === "interrupt";

      if (interruptMode) {
        authRequest = await resolveParameter(
          this.params.getAuthorizationResponse,
          args
        );
        if (!authRequest) {
          //Initial request
          authRequest = await this.start(args);
          await this.params.storeAuthorizationResponse(authRequest, ...args);
        }
      } else {
        authRequest = await this.start(args);
      }

      const storeValue: AsyncStorageValue<any> = {
        args,
        context: getContext(...args),
      };

      return asyncLocalStorage.run(storeValue, async () => {
        let credentials: Credentials | undefined;
        try {
          if (interruptMode) {
            credentials = await this.getCredentials(authRequest);
          } else {
            credentials = await this.getCredentialsPolling(authRequest);
          }
        } catch (err) {
          const shouldInterrupt =
            err instanceof AuthorizationPendingInterrupt ||
            err instanceof AuthorizationPollingInterrupt;
          if (shouldInterrupt) {
            throw err;
          } else if (typeof this.params.onUnauthorized === "function") {
            return this.params.onUnauthorized(err as Error, ...args);
          } else {
            return err;
          }
        }
        storeValue.credentials = credentials;
        return execute(...args);
      });
    };
  }
}
