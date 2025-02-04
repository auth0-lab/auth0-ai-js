import { ClientCheckRequest } from "@openfga/sdk";

import { CibaAuthorizerOptions } from "./authorizers/ciba-authorizer";
import { DeviceAuthorizerOptions } from "./authorizers/device-authorizer";
import { Credentials } from "./credentials";

export abstract class BaseAuthorizer {
  name: string;

  constructor(name: string) {
    this.name = name;
  }

  abstract authorize(
    params:
      | CibaAuthorizerOptions
      | DeviceAuthorizerOptions
      | ClientCheckRequest,
    toolExecutionParams?: Record<string, any>
  ): Promise<Credentials>;
}
