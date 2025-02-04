import { AuthorizerOptionsMap, AvailableAuthorizers } from "./authorizers";
import { BaseAuthorizer } from "./base-authorizer";

export { CIBAAuthorizer } from "./authorizers/ciba-authorizer";
export { DeviceAuthorizer } from "./authorizers/device-authorizer";
export { FGAAuthorizer } from "./authorizers/fga-authorizer";
export { AccessDeniedError } from "./errors/authorizationerror";

export type * from "./authorizer";

class AIAuthorization {
  private authorizers = new Map<string, BaseAuthorizer>();

  constructor(authorizers: BaseAuthorizer[]) {
    authorizers.forEach((authorizer) => {
      const name = authorizer.name;
      if (!name) {
        throw new Error("Authorizer must have a name.");
      }
      this.authorizers.set(name, authorizer);
    });
  }

  authorizeWith = <T extends AvailableAuthorizers>(
    options: AuthorizerOptionsMap[T] & { authorizer: T }
  ) => {
    return <I, O>(handler: (accessToken: string, input: I) => Promise<O>) => {
      return async (input: I): Promise<O> => {
        const authorizer = this.authorizers.get(options.authorizer);
        if (!authorizer) {
          throw new Error("Authorizer not registered.");
        }
        const credentials = await authorizer.authorize(options, input as any);

        return handler(credentials.accessToken.value, input);
      };
    };
  };
}

export const Auth0AI = (config: { authorizers: BaseAuthorizer[] }) => {
  return new AIAuthorization(config.authorizers);
};
