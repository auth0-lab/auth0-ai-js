
import { FederatedConnectionAuthorizerBase } from "@auth0/ai/FederatedConnections";

import { ToolContext } from "../util/ToolContext";
import { ToolWrapper } from "../util/ToolWrapper";

export class FederatedConnectionAuthorizer extends FederatedConnectionAuthorizerBase<
  [any, any]
> {
  authorizer(): ToolWrapper {
    return (t) => {
      return {
        ...t,
        execute: this.protect(ToolContext(t), t.execute!),
      };
    };
  }
}
