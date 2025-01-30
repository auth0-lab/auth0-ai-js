import { AuthenticationClientOptions } from "auth0";

import { AuthorizeOptions } from "./authorizers/ciba-authorizer";

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

export type WithAuthAuthorizerParam =
  | string
  | ((authorizers: Authorizer[]) => Promise<Authorizer>);

export type WithAuthParams = {
  userId: string;
  authorizer?: WithAuthAuthorizerParam;
} & AuthorizerParams;

export interface AuthContext {
  userId: string;
  accessToken?: string;
}

export type FnHandler<T extends any[] = any[], R = any> = (...args: T) => R;

export type WithAuthHandler<F extends FnHandler, P> = (
  params: P,
  fn: F
) => FnHandler;
