import { Genkit } from "genkit";

import { AuthContext, Authorizer, WithAuthParams } from "@auth0/ai";
import {
  DistributiveOmit,
  getAuthorizer,
  ReturnTypeOf,
  runAuthorizer,
} from "@auth0/ai/utils";

type GenkitConfig = {
  genkit: Genkit;
};

type WithAuthHandlerParams = DistributiveOmit<WithAuthParams, "userId">;

export function registerAuthorizers<T extends (...args: any[]) => any>(
  authorizers: Authorizer[],
  config: GenkitConfig
) {
  // WithAuth handler
  return (params: WithAuthHandlerParams, fn: T) => {
    // Tool handler
    return async (...args: Parameters<T>): Promise<ReturnTypeOf<T>> => {
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
