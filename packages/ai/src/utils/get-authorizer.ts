import { Authorizer, WithAuthAuthorizerParam } from "../authorizer";

export async function getAuthorizer(
  authorizers: Authorizer[],
  authorizer?: WithAuthAuthorizerParam
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
    const authorizerFound = authorizers.find((a) => a.name === authorizer);

    if (!authorizerFound) {
      throw new Error(`Authorizer ${authorizer} not found`);
    }

    current = authorizerFound;
  }

  if (typeof authorizer === "function") {
    current = await authorizer(authorizers);
  }

  return current;
}
