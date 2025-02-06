import { AuthenticationClientOptions } from "auth0";
import * as jose from "jose";

export type AuthParams = {
  allowed?: boolean;
  accessToken?: string;
  claims?: jose.JWTPayload;
};

export type ToolWithAuthHandler<I, O, C> = (
  authParams: AuthParams,
  input: I,
  config?: C
) => Promise<O>;

export type AuthorizerParams = Omit<
  AuthenticationClientOptions,
  "domain" | "clientId"
> & {
  domain?: string;
  clientId?: string;
};
