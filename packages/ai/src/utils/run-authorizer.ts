import { Authorizer, Credentials } from "../authorizer";
import { CibaAuthorizerOptions } from "../authorizers/ciba-authorizer";
import { DeviceAuthorizerOptions } from "../authorizers/device-authorizer";

export async function runAuthorizer<T extends (...args: any[]) => Promise<any>>(
  authorizer: Authorizer,
  params: CibaAuthorizerOptions<T> | DeviceAuthorizerOptions,
  toolExecutionParams?: Parameters<T>
): Promise<Credentials> {
  return await authorizer.authorize(params, toolExecutionParams);
}
