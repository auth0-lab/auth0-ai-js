import Enquirer from "enquirer";
import * as jose from "jose";
import open from "open";
import {
  discovery,
  initiateDeviceAuthorization,
  pollDeviceAuthorizationGrant,
  TokenEndpointResponse,
  TokenEndpointResponseHelpers,
} from "openid-client";
import {
  AccessDeniedError,
  AuthorizationRequestExpiredError,
} from "src/errors";

import { Credentials } from "../credentials";
import { AuthorizerParams, AuthParams, ToolWithAuthHandler } from "./";

export type DeviceAuthorizerOptions = {
  scope: string;
  audience?: string;
};

export class DeviceAuthorizer {
  domain: string;
  clientId: string;

  private constructor(params?: AuthorizerParams) {
    this.domain = params?.domain || process.env.AUTH0_DOMAIN!;
    this.clientId = params?.clientId || process.env.AUTH0_CLIENT_ID!;
  }

  private async _authorize(
    params: DeviceAuthorizerOptions
  ): Promise<Credentials> {
    const config = await discovery(
      new URL(`https://${this.domain}`),
      this.clientId
    );

    const handle = await initiateDeviceAuthorization(config, {
      ...params,
    });

    const { verification_uri_complete, user_code, expires_in } = handle;

    const enquirer = new Enquirer();
    await enquirer.prompt({
      type: "input",
      name: "confirmation",
      message: `Press Enter to open the browser to log in or press Ctrl+C to abort. You should see the following code: ${user_code}. It expires in ${
        expires_in % 60 === 0
          ? `${expires_in / 60} minutes`
          : `${expires_in} seconds`
      }.`,
    });

    await open(verification_uri_complete!);

    let tokens: (TokenEndpointResponse & TokenEndpointResponseHelpers) | null =
      null;

    try {
      tokens = await pollDeviceAuthorizationGrant(config, handle);
    } catch (err: any) {
      switch (err.error) {
        case "access_denied":
          throw new AccessDeniedError(err.error_description);
        case "expired_token":
          throw new AuthorizationRequestExpiredError(
            "Authorization request has expired"
          );
        default:
          throw new Error(
            `Error: ${err.error}; Description: ${err.error_description}`
          );
      }
    }

    if (!tokens) {
      throw new Error("Failed to obtain tokens");
    }

    const credentials: Credentials = {
      accessToken: {
        type: tokens.token_type || "bearer",
        value: tokens.access_token,
      },
    };

    if (tokens.id_token) {
      credentials.idToken = {
        type: tokens.token_type || "bearer",
        value: tokens.id_token,
      };
    }

    return credentials;
  }

  static async authorize(
    options: DeviceAuthorizerOptions,
    params?: AuthorizerParams
  ) {
    const authorizer = new DeviceAuthorizer(params);
    const credentials = await authorizer._authorize(options);

    let claims = {};

    if (credentials.idToken) {
      claims = jose.decodeJwt(credentials.idToken!.value);
    }

    return { accessToken: credentials.accessToken.value, claims } as AuthParams;
  }

  static create(params?: AuthorizerParams): DeviceFlowInstance {
    const authorizer = new DeviceAuthorizer(params);

    return (options: DeviceAuthorizerOptions) => {
      return function deviceFlow<I, O, C>(
        handler: ToolWithAuthHandler<I, O, C>,
        onError?: (error: Error) => Promise<O>
      ) {
        return async (input: I, config?: C): Promise<O> => {
          try {
            const credentials = await authorizer._authorize(options);
            let claims = {};

            if (credentials.idToken) {
              claims = jose.decodeJwt(credentials.idToken!.value);
            }

            return handler(
              { accessToken: credentials.accessToken.value, claims },
              input,
              config
            );
          } catch (e: any) {
            if (typeof onError === "function") {
              return onError(e);
            }

            return "Access denied." as O;
          }
        };
      };
    };
  }
}

export type DeviceFlowInstance = (
  options: DeviceAuthorizerOptions
) => <I, O, C>(
  handler: ToolWithAuthHandler<I, O, C>,
  onError?: (error: Error) => Promise<O>
) => (input: I, config?: C) => Promise<O>;
