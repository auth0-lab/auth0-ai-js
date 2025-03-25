import { GenkitBeta } from "genkit/beta";

import { FederatedConnectionAuthorizerBase } from "@auth0/ai/FederatedConnections";
import { ToolFnOptions, ToolRunOptions } from "@genkit-ai/ai/tool";

import { createToolWrapper, ToolWrapper } from "../lib";

export class FederatedConnectionAuthorizer extends FederatedConnectionAuthorizerBase<
  [any, ToolFnOptions & ToolRunOptions]
> {
  constructor(
    private readonly genkit: GenkitBeta,
    ...args: ConstructorParameters<typeof FederatedConnectionAuthorizerBase>
  ) {
    super(...args);
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
