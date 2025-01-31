import { AuthenticationClientOptions } from "auth0";

import { CibaAuthorizerOptions } from "./authorizers/ciba-authorizer";
import { DeviceAuthorizerOptions } from "./authorizers/device-authorizer";

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
  authorize(
    params: CibaAuthorizerOptions | DeviceAuthorizerOptions
  ): Promise<Credentials>;
}

export interface AuthorizerParams {
  name?: string;
  options?: AuthenticationClientOptions;
}

export type AuthorizerByNameOrFn =
  | string
  | ((authorizers: Authorizer[]) => Promise<Authorizer>);

export type WithAuthParams = {
  userId: string;
  authorizer?: AuthorizerByNameOrFn;
} & (CibaAuthorizerOptions | DeviceAuthorizerOptions);

export interface AuthContext {
  userId: string;
  accessToken?: string;
}
