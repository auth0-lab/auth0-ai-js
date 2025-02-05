import { AuthParams } from "./authorizers";

export { CIBAAuthorizer } from "./authorizers/ciba-authorizer";
export { DeviceAuthorizer } from "./authorizers/device-authorizer";
export { FGAAuthorizer } from "./authorizers/fga-authorizer";
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

  if (authorizers[0].name !== "fga" && authorizers[1].name !== "fga") {
    throw new Error("FGA must be one of the authorizers");
  }

  return async (input: I): Promise<O> => {
    const fgaAuthorizer = authorizers.find((a) => a.name === "fga");
    const authorizer = authorizers.find((a) => a.name != "fga");
    const authorizerHandler = (authParams: AuthParams) => authParams;

    const authorizerResponse: AuthParams = await authorizer(authorizerHandler)(
      input
    );
    const fgaAuthorizerResponse: AuthParams = await fgaAuthorizer(
      authorizerHandler
    )({ ...input, userId: authorizerResponse.claims?.sub });

    const authParams = { ...authorizerResponse, ...fgaAuthorizerResponse };

    return handler(authParams, input);
  };
};
