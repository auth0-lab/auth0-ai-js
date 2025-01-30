import { AuthorizeOptions } from "src/authorizers/ciba-authorizer";

import { Authorizer, Credentials } from "../authorizer";

export async function runAuthorizer(
  authorizer: Authorizer,
  params: AuthorizeOptions
): Promise<Credentials> {
  return await authorizer.authorize(params);
}
