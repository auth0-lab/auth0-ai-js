import { CibaAuthorizerOptions } from "./ciba-authorizer";
import { DeviceAuthorizerOptions } from "./device-authorizer";

export type AuthorizerOptionsMap = {
  "device-authorizer": DeviceAuthorizerOptions;
  "ciba-authorizer": CibaAuthorizerOptions;
};

export type AvailableAuthorizers = keyof AuthorizerOptionsMap;
