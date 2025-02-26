import { AuthParams } from "./authorizers";

export type { AuthParams, AuthorizerParams } from "./authorizers";
export type * from "./credentials";
export * from "./authorizers/ciba-authorizer";
export * from "./authorizers/device-authorizer";
export * from "./authorizers/fga-authorizer";
export * from "./errors";

export const usePipeline = <I, O>(
  authorizers: any[],
  handler: (authParams: AuthParams, input: I) => Promise<O>
) => {
  if (authorizers.length === 0) {
    throw new Error("No authorizers provided");
  }

  if (authorizers.length > 2) {
    throw new Error("Only 2 authorizers are allowed");
  }

  if (
    authorizers[0].name !== "fga" &&
    authorizers[1].name !== "fga" &&
    authorizers[0].name !== "ciba" &&
    authorizers[1].name !== "ciba"
  ) {
    throw new Error("FGA or CIBA must be one of the authorizers");
  }

  return async (input: I): Promise<O> => {
    const fgaAuthorizer = authorizers.find((a) => a.name === "fga");
    const cibaAuthorizer = authorizers.find((a) => a.name === "ciba");
    const authorizer = authorizers.find(
      (a) => a.name != "fga" && a.name != "ciba"
    );
    const authorizerHandler = (authParams: AuthParams) => authParams;
    const authorizerResponse: AuthParams = await authorizer(authorizerHandler)(
      input
    );

    const secondAuthorizer = cibaAuthorizer || fgaAuthorizer;

    const response: AuthParams = await secondAuthorizer(authorizerHandler)({
      ...input,
      userId: authorizerResponse.claims?.sub,
    });

    const authParams = { ...authorizerResponse, ...response };

    return handler(authParams, input);
  };
};
