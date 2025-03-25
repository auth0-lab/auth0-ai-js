import crypto from "node:crypto";
import { discovery, initiateDeviceAuthorization } from "openid-client";
import { stableHash } from "stable-hash";

import { TokenSet, tokenSetFromTokenResponse } from "../../credentials";
import {
  AccessDeniedInterrupt,
  AuthorizationPendingInterrupt,
  AuthorizationPollingInterrupt,
  AuthorizationRequestExpiredInterrupt,
} from "../../interrupts/DeviceInterrupts";
import { Store, SubStore } from "../../stores";
import { omit } from "../../util";
import { AuthContext, ContextGetter, nsFromContext } from "../context";
import { Auth0PublicClientParams, Auth0PublicClientSchema } from "../types";
import { asyncLocalStorage, AsyncStorageValue } from "./asyncLocalStorage";
import { DeviceAuthorizerParams } from "./DeviceAuthorizerParams";
import {
  DeviceAuthorizationResponse,
  parseDeviceAuthResponse,
} from "./DeviceAuthResponse";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * The DeviceAuthorizerBase class acts as a guard and wrapper around tools or agent
 * capabilities that require authenticated access. It encapsulates the
 * OpenID Connect Device Authorization Flow, allowing tools to interrupt execution
 * to request user authorization and resume seamlessly once authorization is granted.
 *
 * Enable agentic tools to be wrapped with secure, lazy-triggered device authorization,
 * with a clean interrupt/resume model for user-in-the-loop authentication.
 *
 * Core Concepts
 *
 * - Interrupt-driven flow: If no valid token is present, the tool throws a DeviceAuthInterrupt,
 * which contains the verification_uri, user_code, and other relevant metadata.
 *
 * - Polling/resumption: The Agent client can poll the agent to resume execution.
 *
 * - Token management: Tokens (and refresh tokens, if applicable) are stored and reused
 * transparently.
 *
 */
export class DeviceAuthorizerBase<ToolExecuteArgs extends any[]> {
  private auth0: Auth0PublicClientParams;
  private params: DeviceAuthorizerParams<ToolExecuteArgs> & {
    credentialsContext: AuthContext;
  };
  private credentialsStore: Store<TokenSet>;
  private authResponseStore: Store<DeviceAuthorizationResponse>;

  constructor(
    auth0: Partial<Auth0PublicClientParams>,
    params: DeviceAuthorizerParams<ToolExecuteArgs>
  ) {
    this.auth0 = Auth0PublicClientSchema.parse(auth0);
    if (!this.auth0.domain) {
      throw new Error("Domain is required.");
    }
    if (!this.auth0.clientId) {
      throw new Error("Client ID is required.");
    }
    if (!params.store) {
      throw new Error("Store is required.");
    }

    this.params = {
      credentialsContext: "thread",
      ...params,
    };

    const instanceID = this.getInstanceID();

    this.credentialsStore = new SubStore(params.store, {
      baseNamespace: [instanceID, "Credentials"],
      getTTL: (credentials) =>
        credentials.expiresIn ? credentials.expiresIn * 1000 : undefined,
    });

    this.authResponseStore = new SubStore(params.store, {
      baseNamespace: [instanceID, "AuthResponses"],
      getTTL: (authResponse) =>
        authResponse.expiresIn ? authResponse.expiresIn * 1000 : undefined,
    });
  }

  private async start(): Promise<DeviceAuthorizationResponse> {
    const requestedAt = Date.now() / 1000;
    const config = await discovery(
      new URL(`https://${this.auth0.domain!}`),
      this.auth0.clientId!
    );

    const handle = await initiateDeviceAuthorization(config, {
      scope: (this.params.scopes ?? []).join(" "),
      audience: this.params.audience!,
    });

    return parseDeviceAuthResponse(handle, requestedAt);
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
    getContext: ContextGetter<ToolExecuteArgs>,
    execute: (...args: ToolExecuteArgs) => any
  ): (...args: ToolExecuteArgs) => any {
    return async (...args: ToolExecuteArgs) => {
      let authResponse: DeviceAuthorizationResponse | undefined;
      if (asyncLocalStorage.getStore()) {
        throw new Error(
          "Cannot nest tool calls that require CIBA authorization."
        );
      }

      const context = getContext(...args);
      const storeValue: AsyncStorageValue<any> = {
        args,
        context: context,
      };

      return asyncLocalStorage.run(storeValue, async () => {
        let credentials: TokenSet | undefined;
        let credentialsObtained = false;
        const authResponseNS = nsFromContext("tool-call", context);
        const credentialsNS = nsFromContext(
          this.params.credentialsContext,
          context
        );
        try {
          credentials = await this.credentialsStore.get(
            credentialsNS,
            "credential"
          );

          if (!credentials) {
            if (
              !this.params.onAuthorizationRequest ||
              this.params.onAuthorizationRequest === "interrupt"
            ) {
              authResponse = await this.authResponseStore.get(
                authResponseNS,
                "authResponse"
              );

              if (!authResponse) {
                //Initial request
                authResponse = await this.start();
                await this.authResponseStore.put(
                  authResponseNS,
                  "authResponse",
                  authResponse
                );
              }
              credentials = await this.getCredentials(authResponse);
            } else {
              // Block mode
              authResponse = await this.start();
              const credentialsPromise =
                this.getCredentialsPolling(authResponse);
              if (typeof this.params.onAuthorizationRequest === "function") {
                await this.params.onAuthorizationRequest(
                  authResponse,
                  credentialsPromise
                );
              }
              credentials = await credentialsPromise;
            }

            if (typeof credentials !== "undefined") {
              this.credentialsStore.put(
                credentialsNS,
                "credential",
                credentials
              );
            }

            credentialsObtained = true;
          }
        } catch (err) {
          const shouldInterrupt =
            err instanceof AuthorizationPendingInterrupt ||
            err instanceof AuthorizationPollingInterrupt;
          if (shouldInterrupt) {
            return this.handleAuthorizationInterrupts(err);
          } else {
            await this.deleteAuthRequest();
            if (typeof this.params.onUnauthorized === "function") {
              return this.params.onUnauthorized(err as Error, ...args);
            } else {
              return err;
            }
          }
        }
        if (credentialsObtained) {
          await this.deleteAuthRequest();
        }
        storeValue.credentials = credentials;
        return execute(...args);
      });
    };
  }

  private async getCredentials(
    authResponse: DeviceAuthorizationResponse
  ): Promise<TokenSet | undefined> {
    //TODO: this is not supported neither by the OIDC client library
    //      or the auth0 client.
    const url = `https://${this.auth0.domain!}/oauth/token`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
        device_code: authResponse.deviceCode,
        client_id: this.auth0.clientId!,
      }),
    });

    if (!response.ok) {
      if (response.headers.get("content-type")?.includes("application/json")) {
        const { error, error_description } = await response.json();
        if (error === "authorization_pending") {
          throw new AuthorizationPendingInterrupt(
            error_description,
            authResponse
          );
        }
        if (error === "slow_down") {
          throw new AuthorizationPollingInterrupt(
            error_description,
            authResponse
          );
        }
        if (error === "expired_token") {
          throw new AuthorizationRequestExpiredInterrupt(
            error_description,
            authResponse
          );
        }
        if (error === "access_denied") {
          throw new AccessDeniedInterrupt(error_description, authResponse);
        }
        throw new Error(error_description);
      }
      const errText = await response.text();
      throw new Error(`Failed to obtain tokens: ${errText}`);
    }

    const tr = await response.json();
    const credentials = tokenSetFromTokenResponse(tr);

    return credentials;
  }

  protected async getCredentialsPolling(
    authResponse: DeviceAuthorizationResponse
  ): Promise<TokenSet | undefined> {
    let credentials: TokenSet | undefined = undefined;

    do {
      try {
        credentials = await this.getCredentials(authResponse);
      } catch (err) {
        if (
          err instanceof AuthorizationPendingInterrupt ||
          err instanceof AuthorizationPollingInterrupt
        ) {
          await sleep((err.response.interval ?? 10) * 1000);
        } else {
          throw err;
        }
      }
    } while (!credentials);

    return credentials;
  }

  private getInstanceID(): string {
    const props = {
      auth0: this.auth0,
      params: omit(this.params, ["store", "onUnauthorized"]),
    };
    const sh = stableHash(props);
    return crypto.createHash("MD5").update(sh).digest("hex");
  }

  protected deleteAuthRequest() {
    const store = asyncLocalStorage.getStore();
    if (!store) {
      throw new Error("This method should be called from within a tool.");
    }
    const authResponseNS = nsFromContext("tool-call", store.context);
    return this.authResponseStore.delete(authResponseNS, "authResponse");
  }

  protected handleAuthorizationInterrupts(
    err: AuthorizationPendingInterrupt | AuthorizationPollingInterrupt
  ) {
    throw err;
  }
}
