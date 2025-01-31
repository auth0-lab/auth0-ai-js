import { AuthenticationClient } from "auth0";
import { AuthorizeResponse } from "auth0/dist/cjs/auth/backchannel";

import { Authorizer, AuthorizerParams, Credentials } from "../authorizer";
import { AccessDeniedError } from "../errors/authorizationerror";

type DynamicBindingMessage<
  T extends (...args: any[]) => Promise<any> = (...args: any[]) => Promise<any>
> = (...args: Parameters<T>) => Promise<string>;

export type CibaAuthorizerOptions<
  T extends (...args: any[]) => Promise<string> = (
    ...args: any[]
  ) => Promise<any>
> = {
  userId: string;
  binding_message: string | DynamicBindingMessage<T>;
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
export class CIBAAuthorizer implements Authorizer {
  auth0: AuthenticationClient;
  name: string;

  constructor(params?: AuthorizerParams) {
    this.name = params?.name || "ciba";

    this.auth0 = new AuthenticationClient({
      domain: params?.options?.domain || process.env.AUTH0_DOMAIN!,
      clientId: params?.options?.clientId || process.env.AUTH0_CLIENT_ID!,
      clientSecret:
        params?.options?.clientSecret || process.env.AUTH0_CLIENT_SECRET,
      clientAssertionSigningAlg: params?.options?.clientAssertionSigningAlg,
      clientAssertionSigningKey: params?.options?.clientAssertionSigningKey,
      idTokenSigningAlg: params?.options?.idTokenSigningAlg,
      clockTolerance: params?.options?.clockTolerance,
      useMTLS: params?.options?.useMTLS,
    });
  }

  async authorize(
    params: CibaAuthorizerOptions,
    toolExecutionParams?: Record<string, any>
  ): Promise<Credentials> {
    const authorizeParams = {
      scope: params.scope,
      binding_message: "",
      userId: params.userId,
      audience: params.audience,
      request_expiry: params.request_expiry,
      subjectIssuerContext: params.subjectIssuerContext,
    };

    if (params.binding_message instanceof Function) {
      // send params to the function
      authorizeParams.binding_message = await params.binding_message(
        toolExecutionParams
      );
    }

    if (typeof params.binding_message === "string") {
      authorizeParams.binding_message = params.binding_message;
    }

    const response = await this.auth0.backchannel.authorize(authorizeParams);

    return await this.poll(response);
  }

  async poll(params: AuthorizeResponse): Promise<Credentials> {
    return new Promise((resolve, reject) => {
      const interval = setInterval(async () => {
        try {
          const response = await this.auth0.backchannel.backchannelGrant({
            auth_req_id: params.auth_req_id,
          });

          const credentials = {
            accessToken: {
              type: response.token_type || "bearer",
              value: response.access_token,
            },
          };

          clearInterval(interval);

          return resolve(credentials);
        } catch (e: any) {
          console.log(e);
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
}
