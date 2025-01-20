import { AuthorizationOptions } from "../../authorizer";
import {
  CIBAAuthorizerOptions,
  PollingCIBAAuthorizer,
} from "../polling-authorizer";

interface Auth0CIBAAuthorizerOptions extends CIBAAuthorizerOptions {
  domain?: string;
}

/**
 * Requests authorization by prompting the user via an out-of-band channel from
 * the backend.
 */
export class CIBAAuthorizer extends PollingCIBAAuthorizer {
  constructor(options: Auth0CIBAAuthorizerOptions) {
    if (options.domain) {
      options.authorizationURL = "https://" + options.domain + "/bc-authorize";
      options.tokenURL = "https://" + options.domain + "/oauth/token";
    }
    super(options);
  }

  async authorize(params: AuthorizationOptions) {
    const url = new URL(this.authorizationURL);
    url.pathname = "/";

    // Auth0 wants a JSON object, as recommended by FAPI...
    if (params.loginHint) {
      params.loginHint = JSON.stringify({
        format: "iss_sub",
        iss: url.toString(),
        sub: params.loginHint,
      });
    }
    // Auth0 always wants a binding mesage...
    if (!params.bindingMessage) {
      params.bindingMessage = "IGNORE";
    }

    return super.authorize(params);
  }
}
