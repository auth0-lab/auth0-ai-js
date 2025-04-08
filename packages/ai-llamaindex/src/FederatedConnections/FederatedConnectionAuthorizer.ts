import { FederatedConnectionAuthorizerBase } from "@auth0/ai/FederatedConnections";
import { Auth0Interrupt } from "@auth0/ai/interrupts";

import { createToolWrapper } from "../lib";
import { ToolWrapper } from "../types";

export class FederatedConnectionAuthorizer extends FederatedConnectionAuthorizerBase<
  [any, object | undefined]
> {
  authorizer(): ToolWrapper {
    return createToolWrapper(this.protect.bind(this));
  }

  handleAuthorizationInterrupts(err: Auth0Interrupt) {
    return err;
  }
}
