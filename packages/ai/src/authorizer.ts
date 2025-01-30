import { AuthenticationClientOptions } from "auth0";
import { AuthorizeOptions } from "auth0/dist/cjs/auth/backchannel";

export interface AuthorizationOptions {
  userId: string;
  maxAge?: number;
  scope?: string[];
  bindingMessage?: string;
  realm?: string;
  audience?: string;
}

export interface Credential {
  type: string;
  value: string;
}

export interface Credentials {
  accessToken: Credential;
  refreshToken?: Credential;
}

export interface Authorizer {
  name: string;
  authorize(params: AuthorizeOptions): Promise<Credentials>;
}

export interface AuthorizerParams {
  name?: string;
  options?: AuthenticationClientOptions;
}
