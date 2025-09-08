import { CIBAAuthorizerBase } from "@auth0/ai/CIBA";

import { ToolContext, ToolExecutionOptions } from "../util/ToolContext";
import { ToolWrapper } from "../util/ToolWrapper";

/**
 * The CIBAAuthorizer class implements the CIBA authorization flow for a Vercel-AI tool.
 *
 * CIBA (Client Initiated Backchannel Authentication) is a protocol that allows a client to
 * request authorization from the user via an out-of-band channel.
 */
export class CIBAAuthorizer extends CIBAAuthorizerBase<
  [any, ToolExecutionOptions]
> {
  /**
   *
   * Builds a tool authorizer that protects the tool execution with the CIBA authorization flow.
   *
   * @returns A tool authorizer.
   */
  authorizer(): ToolWrapper {
    return (t) => {
      return {
        ...t,
        execute: this.protect(ToolContext(t), t.execute!),
      };
    };
  }
}
