import { GenkitBeta } from "genkit/beta";

import { FederatedConnectionAuthorizerBase } from "@auth0/ai/FederatedConnections";
import { Auth0Interrupt } from "@auth0/ai/interrupts";
import { ToolFnOptions, ToolRunOptions } from "@genkit-ai/ai/tool";

import { createToolWrapper, toGenKitInterrupt, ToolWrapper } from "../lib";

export class FederatedConnectionAuthorizer extends FederatedConnectionAuthorizerBase<
  [any, ToolFnOptions & ToolRunOptions]
> {
  constructor(
    private readonly genkit: GenkitBeta,
    ...args: ConstructorParameters<typeof FederatedConnectionAuthorizerBase>
  ) {
    super(...args);
  }

  protected handleAuthorizationInterrupts(err: Auth0Interrupt) {
    throw toGenKitInterrupt(err);
  }

  /**
   *
   * Builds a tool authorizer that protects the tool execution with the Federated Connection Authorizer.
   *
   * @returns A tool authorizer.
   */
  authorizer(): ToolWrapper {
    return createToolWrapper(this.genkit, this.protect.bind(this));
  }
}
