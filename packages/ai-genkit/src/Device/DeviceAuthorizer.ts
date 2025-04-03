import { GenkitBeta } from "genkit/beta";

import { DeviceAuthorizerBase } from "@auth0/ai/Device";
import { DeviceInterrupts } from "@auth0/ai/interrupts";
import { ToolFnOptions, ToolRunOptions } from "@genkit-ai/ai/tool";

import { createToolWrapper, toGenKitInterrupt, ToolWrapper } from "../lib";

/**
 * The DeviceAuthorizer class implements the device authorization flow for a Genkit AI tool.
 *
 */
export class DeviceAuthorizer extends DeviceAuthorizerBase<
  [any, ToolFnOptions & ToolRunOptions]
> {
  constructor(
    private readonly genkit: GenkitBeta,
    ...args: ConstructorParameters<typeof DeviceAuthorizerBase>
  ) {
    super(...args);
  }

  override handleAuthorizationInterrupts(
    err:
      | DeviceInterrupts.AuthorizationPendingInterrupt
      | DeviceInterrupts.AuthorizationPollingInterrupt
  ) {
    throw toGenKitInterrupt(err);
  }

  /**
   *
   * Builds a tool authorizer that protects the tool execution with the CIBA authorization flow.
   *
   * @returns A tool authorizer.
   */
  authorizer(): ToolWrapper {
    return createToolWrapper(this.genkit, this.protect.bind(this));
  }
}
