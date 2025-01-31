import { Authorizer, Credentials } from "../authorizer";
import { CibaAuthorizerOptions } from "../authorizers/ciba-authorizer";
import { DeviceAuthorizerOptions } from "../authorizers/device-authorizer";

export async function runAuthorizer(
  authorizer: Authorizer,
  params: CibaAuthorizerOptions | DeviceAuthorizerOptions
): Promise<Credentials> {
  return await authorizer.authorize(params);
}
