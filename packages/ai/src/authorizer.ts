import { AuthenticationClientOptions } from "auth0";

import { ClientCheckRequest } from "@openfga/sdk";

import { CibaAuthorizerOptions } from "./authorizers/ciba-authorizer";
import { DeviceAuthorizerOptions } from "./authorizers/device-authorizer";
import { Credentials } from "./credentials";

export interface Authorizer {
  name: string;
  authorize(
    params:
      | CibaAuthorizerOptions
      | DeviceAuthorizerOptions
      | ClientCheckRequest,
    toolExecutionParams?: Record<string, any>
  ): Promise<Credentials>;
}

export interface AuthorizerParams {
  options?: AuthenticationClientOptions;
}

export type AuthorizerByNameOrFn =
  | string
  | ((authorizers: Authorizer[]) => Promise<Authorizer>);

export interface AuthContext {
  userId: string;
  accessToken?: string;
}
