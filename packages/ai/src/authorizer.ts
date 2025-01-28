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

export interface PendingAuthorization {
  transactionId: string;
  requestId: string;
}

export interface Authorizer {
  authorize(
    params: AuthorizeOptions
  ): Promise<Credentials | PendingAuthorization>;
}

/**
 * Returns `true` if the result is pending authorization.
 *
 * @remarks
 * This function returns a {@link https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates type predicate}
 * used to narrow the result of calling authorization to an instance of
 * `PendingAuthorization`.
 *
 * @param result - The result of calling authorize.
 */
export function isPending(
  result: Credentials | PendingAuthorization
): result is PendingAuthorization {
  return (result as PendingAuthorization).transactionId !== undefined;
}
