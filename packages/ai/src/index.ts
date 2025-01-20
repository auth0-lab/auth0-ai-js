import { Authorizer, Credentials } from "./authorizer";

export { interact } from "./interact";
export { resume } from "./resume";
export { CIBAAuthorizer } from "./ciba/auth0/polling-authorizer";
export { FSStateStore } from "./state/fs-state-store";
export { AuthorizationError } from "./errors/authorizationerror";

type WithAuthParams = {
  user: string;
  scope: string;
  audience: string;
  authorizer?: string | ((authorizers: Authorizer[]) => Authorizer);
};

type withAccessTokenFn<T> = (accessToken: string) => T;

type withAuth<T> = (
  params: WithAuthParams,
  fn: withAccessTokenFn<T>
) => Promise<T>;

export class Auth0AI {
  static initialize<T>(authorizer: Authorizer | Authorizer[]): withAuth<T> {
    console.log(authorizer);

    return async (params: WithAuthParams, fn) => {
      if (Array.isArray(authorizer)) {
        throw new Error("Temporary error");
      }

      const result = (await authorizer.authorize({
        scope: params.scope.split(" "),
        audience: params.audience,
        loginHint: params.user,
      })) as Credentials;

      const fn2 = fn(result.accessToken.value);
      return fn2;
    };
  }
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
