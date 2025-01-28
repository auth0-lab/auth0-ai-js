import { Genkit } from "genkit";

import {
  AuthContext,
  AuthorizerConfigParams,
  Credentials,
  FnHandler,
  WithAuthHandler,
  WithAuthParams,
} from "@auth0/ai";

type WithAuthHandlerParams = Omit<WithAuthParams, "userId">;

type GenkitAutorizerConfig = AuthorizerConfigParams & {
  genkit: Genkit;
};

export function createAuthorizer<T extends FnHandler>(
  config: GenkitAutorizerConfig
): WithAuthHandler<T, WithAuthHandlerParams> {
  return (params: WithAuthHandlerParams, fn: T) => {
    return async (...args: any[]) => {
      if (Array.isArray(config.authorizer)) {
        throw new Error("Not Implemented");
      }

      const session = config.genkit.currentSession<AuthContext>();
      const userId = session.state!.userId;

      const result = (await config.authorizer.authorize({
        binding_message: params.binding_message,
        scope: params.scope,
        audience: params.audience,
        userId,
      })) as Credentials;

      await config.genkit.currentSession<AuthContext>().updateState({
        userId,
        accessToken: result.accessToken.value,
      });

      return fn(...args);
    };
  };
}
