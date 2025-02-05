import { AuthenticationClient, AuthenticationClientOptions } from "auth0";
import { AuthorizeResponse } from "auth0/dist/cjs/auth/backchannel";
import * as jose from "jose";

import { Credentials } from "../credentials";
import { AccessDeniedError } from "../errors/authorizationerror";
import { ToolWithAuthHandler } from "./";

type StringOrFn = (params: any) => Promise<string>;

export type CibaAuthorizerOptions = {
  userId: string | StringOrFn;
  binding_message: string | StringOrFn;
  scope: string;
  audience?: string;
  request_expiry?: string;
  subjectIssuerContext?: string;
};

/**
 * Requests authorization by prompting the user via an out-of-band channel from
 * the backend.
 *
 * @remarks It only supports the polling mode of the CIBA flow.
 */
export class CIBAAuthorizer {
  auth0: AuthenticationClient;

  private constructor(params?: AuthenticationClientOptions) {
    this.auth0 = new AuthenticationClient({
      domain: params?.domain || process.env.AUTH0_DOMAIN!,
      clientId: params?.clientId || process.env.AUTH0_CLIENT_ID!,
      clientSecret: params?.clientSecret || process.env.AUTH0_CLIENT_SECRET,
      clientAssertionSigningAlg: params?.clientAssertionSigningAlg,
      clientAssertionSigningKey: params?.clientAssertionSigningKey,
      idTokenSigningAlg: params?.idTokenSigningAlg,
      clockTolerance: params?.clockTolerance,
      useMTLS: params?.useMTLS,
    });
  }

  private async authorize<I>(
    params: CibaAuthorizerOptions,
    toolExecutionParams?: I
  ): Promise<Credentials> {
    const authorizeParams = {
      scope: params.scope,
      binding_message: "",
      userId: "",
      audience: params.audience,
      request_expiry: params.request_expiry,
      subjectIssuerContext: params.subjectIssuerContext,
    };

    if (typeof params.binding_message === "function") {
      authorizeParams.binding_message = await params.binding_message(
        toolExecutionParams as I
      );
    }

    if (typeof params.binding_message === "string") {
      authorizeParams.binding_message = params.binding_message;
    }

    if (typeof params.userId === "function") {
      authorizeParams.userId = await params.userId(toolExecutionParams as I);
    }

    if (typeof params.userId === "string") {
      authorizeParams.userId = params.userId;
    }

    const response = await this.auth0.backchannel.authorize(authorizeParams);

    return await this.poll(response);
  }

  private async poll(params: AuthorizeResponse): Promise<Credentials> {
    return new Promise((resolve, reject) => {
      const interval = setInterval(async () => {
        try {
          const response = await this.auth0.backchannel.backchannelGrant({
            auth_req_id: params.auth_req_id,
          });

          // TODO: Handle expiration
          // params.expires_in

          const credentials = {
            accessToken: {
              type: response.token_type || "bearer",
              value: response.access_token,
            },
          };

          clearInterval(interval);

          return resolve(credentials);
        } catch (e: any) {
          if (e.error == "authorization_pending") {
            return;
          }
          if (e.error == "access_denied") {
            clearInterval(interval);
            return reject(new AccessDeniedError(e.error_description, e.error));
          }
        }
      }, params.interval * 1000);
    });
  }

  static create(params?: AuthenticationClientOptions) {
    const authorizer = new CIBAAuthorizer(params);

    return (options: CibaAuthorizerOptions) => {
      return function ciba<I, O, C>(handler: ToolWithAuthHandler<I, O, C>) {
        return async (input: I, config?: C): Promise<O> => {
          const credentials = await authorizer.authorize(options, input);
          const claims = jose.decodeJwt(credentials.idToken!.value);

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
