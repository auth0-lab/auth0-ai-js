import { FederatedConnectionAuthorizerBase } from "@auth0/ai/FederatedConnections";

import { createToolWrapper } from "../lib";
import { ToolWrapper } from "../types";

export class FederatedConnectionAuthorizer extends FederatedConnectionAuthorizerBase<
  [any, object | undefined]
> {
  authorizer(): ToolWrapper {
    return createToolWrapper(this.protect.bind(this));
  }
}
