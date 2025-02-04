import Enquirer from "enquirer";
import open from "open";
import {
  discovery,
  initiateDeviceAuthorization,
  pollDeviceAuthorizationGrant,
  TokenEndpointResponse,
  TokenEndpointResponseHelpers,
} from "openid-client";

import { AuthorizerParams } from "../authorizer";
import { BaseAuthorizer } from "../base-authorizer";
import { Credentials } from "../credentials";

export type DeviceAuthorizerOptions = {
  scope: string;
  audience: string;
};

export class DeviceAuthorizer extends BaseAuthorizer {
  domain: string;
  clientId: string;

  constructor(params?: AuthorizerParams) {
    super("device-authorizer");

    this.domain = params?.options?.domain || process.env.AUTH0_DOMAIN!;
    this.clientId = params?.options?.clientId || process.env.AUTH0_CLIENT_ID!;
  }

  async authorize(params: DeviceAuthorizerOptions): Promise<Credentials> {
    const config = await discovery(
      new URL(`https://${this.domain}`),
      this.clientId
    );

    const handle = await initiateDeviceAuthorization(config, {
      scope: params.scope,
      audience: params.audience!,
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
}
