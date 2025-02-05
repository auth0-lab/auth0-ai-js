import { AuthenticationClientOptions } from "auth0";
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

import { Credentials } from "../credentials";
import { AuthParams, ToolWithAuthHandler } from "./";

export type DeviceAuthorizerOptions = {
  scope: string;
  audience?: string;
};

export class DeviceAuthorizer {
  domain: string;
  clientId: string;

  private constructor(params?: AuthenticationClientOptions) {
    this.domain = params?.domain || process.env.AUTH0_DOMAIN!;
    this.clientId = params?.clientId || process.env.AUTH0_CLIENT_ID!;
  }

  private async authorize(
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
          console.error("\n\nCancelled interaction");
          break;
        case "expired_token":
          console.error("\n\nDevice flow expired");
          break;
        default:
          console.error(
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

  static async start(
    options: DeviceAuthorizerOptions,
    params?: AuthenticationClientOptions
  ) {
    const authorizer = new DeviceAuthorizer(params);
    const credentials = await authorizer.authorize(options);

    let claims = {};

    if (credentials.idToken) {
      claims = jose.decodeJwt(credentials.idToken!.value);
    }

    return { accessToken: credentials.accessToken.value, claims } as AuthParams;
  }

  static create(params?: AuthenticationClientOptions) {
    const authorizer = new DeviceAuthorizer(params);

    return (options: DeviceAuthorizerOptions) => {
      return function deviceFlow<I, O, C>(
        handler: ToolWithAuthHandler<I, O, C>
      ) {
        return async (input: I, config?: C): Promise<O> => {
          const credentials = await authorizer.authorize(options);
          let claims = {};

          if (credentials.idToken) {
            claims = jose.decodeJwt(credentials.idToken!.value);
          }

          return handler(
            { accessToken: credentials.accessToken.value, claims },
            input,
            config
          );
        };
      };
    };
  }
}
