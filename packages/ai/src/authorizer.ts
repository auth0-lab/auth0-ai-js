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
    params: CibaAuthorizerOptions | DeviceAuthorizerOptions,
    toolExecutionParams?: Record<string, any>
  ): Promise<Credentials>;
}

export interface AuthorizerParams {
  name?: string;
  options?: AuthenticationClientOptions;
}

export type AuthorizerByNameOrFn =
  | string
  | ((authorizers: Authorizer[]) => Promise<Authorizer>);

export type WithAuthParams<T extends (...args: any[]) => Promise<any>> = {
  userId: string;
  authorizer?: AuthorizerByNameOrFn;
} & (CibaAuthorizerOptions<T> | DeviceAuthorizerOptions);

export interface AuthContext {
  userId: string;
  accessToken?: string;
}
