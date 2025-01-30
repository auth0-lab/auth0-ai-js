import { Genkit } from "genkit";

import {
  AuthContext,
  Authorizer,
  Credentials,
  FnHandler,
  getAuthorizer,
  runAuthorizer,
  WithAuthHandler,
  WithAuthParams,
} from "@auth0/ai";

type WithAuthHandlerParams = Omit<WithAuthParams, "userId">;

type GenkitAutorizerConfig = {
  genkit: Genkit;
};

export function registerAuthorizers<T extends FnHandler>(
  authorizers: Authorizer[],
  config: GenkitAutorizerConfig
): WithAuthHandler<T, WithAuthHandlerParams> {
  return (params: WithAuthHandlerParams, fn: T) => {
    return async (...args: any[]) => {
      const authorizer = await getAuthorizer(authorizers, params.authorizer);
      const session = config.genkit.currentSession<AuthContext>();
      const userId = session.state!.userId;
      const result = await runAuthorizer(authorizer, { ...params, userId });

      await config.genkit.currentSession<AuthContext>().updateState({
        userId,
        accessToken: result.accessToken.value,
      });

      return fn(...args);
    };
  };
}
