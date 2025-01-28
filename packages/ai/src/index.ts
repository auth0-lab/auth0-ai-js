import { Authorizer } from "./authorizer";

export { PollingCIBAAuthorizer } from "./ciba/polling-authorizer";
export { AccessDeniedError } from "./errors/authorizationerror";

export type { Authorizer, Credentials } from "./authorizer";

export type WithAuthParams = {
  userId: string;
  scope: string;
  audience: string;
  binding_message?: string;
  authorizer?: string | ((authorizers: Authorizer[]) => Authorizer);
};

export interface AuthContext {
  userId: string;
  accessToken?: string;
}

export type AuthorizerConfigParams = {
  authorizer: Authorizer | Authorizer[];
};

export type FnHandler<T extends any[] = any[], R = any> = (...args: T) => R;

export type WithAuthHandler<F extends FnHandler, P> = (
  params: P,
  fn: F
) => FnHandler;

// const withAuth = Auth0Ai.setup(authorizer);

// const tool = withAuth({ scope: , audience: }, fn);

// // two authorizer
// const one = new CibaAuthorizer({ name: 'one', domain, tokenUrl, cbUrl, backchannelMode })
// const two = new RedirectAuthorizer({ name: 'two', domain, tokenUrl, backchannelMode })

// const withAuth = Auth0Ai.setup([ one, two ]);

// // configure two authorizers but dit not pick
// const tool = withAuth({ scope: , audience: }, fn); // -> throw error MissingAuthorizer

// // pick by name
// const tool = withAuth({ authorizer: 'one', scope: , audience: }, fn);

// // pick by runtime
// const tool = withAuth({ authorizer: (authorizers) => {
//     /* if chat, pick redirect, otherwise ciba */
//     return authorizers[0];
// }, scope: , audience: }, fn);
