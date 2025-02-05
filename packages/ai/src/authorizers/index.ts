import * as jose from "jose";

export type AuthParams = {
  allowed?: boolean;
  accessToken?: string;
  claims?: jose.JWTPayload;
};

export type ToolWithAuthHandler<I, O> = (
  authParams: AuthParams,
  input: I
) => Promise<O>;
