import { Authorizer, Credentials } from "./authorizer";

export { CIBAAuthorizer } from "./authorizers/ciba-authorizer";
export { DeviceAuthorizer } from "./authorizers/device-authorizer";
export { AccessDeniedError } from "./errors/authorizationerror";

export type { Authorizer, Credentials } from "./authorizer";

type WithAuthAuthorizerParam =
  | string
  | ((authorizers: Authorizer[]) => Promise<Authorizer>);

export type WithAuthParams = {
  userId: string;
  scope: string;
  audience: string;
  binding_message?: string;
  authorizer?: WithAuthAuthorizerParam;
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

export async function runAuthorizer(
  authorizer: Authorizer,
  params: WithAuthParams
): Promise<Credentials> {
  return await authorizer.authorize({
    binding_message: params.binding_message,
    scope: params.scope,
    audience: params.audience,
    userId: params.userId,
  });
}

export async function getAuthorizer(
  authorizers: Authorizer[],
  authorizer: WithAuthAuthorizerParam
): Promise<Authorizer> {
  let current: Authorizer = authorizers[0];

  if (authorizers.length === 0) {
    throw new Error("At least one authorizer is required");
  }

  if (authorizers.length > 1 && !authorizer) {
    throw new Error(
      "Multiple authorizers are configured, but no authorizer is selected"
    );
  }

  if (typeof authorizer === "string") {
    current = authorizers.find((a) => a.name === authorizer);
  }

  if (typeof authorizer === "function") {
    current = await authorizer(
      Array.isArray(authorizers) ? authorizers : [authorizers]
    );
  }

  return current;
}

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
