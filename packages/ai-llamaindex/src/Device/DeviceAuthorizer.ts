import { DeviceAuthorizerBase } from "@auth0/ai/Device";

import { createToolWrapper } from "../lib";
import { ToolWrapper } from "../types";

/**
 * The DeviceAuthorizer class implements the Device Authorization Flow for a Vercel-AI tool.
 */
export class DeviceAuthorizer extends DeviceAuthorizerBase<
  [any, object | undefined]
> {
  /**
   *
   * Builds a tool authorizer that protects the tool execution with the CIBA authorization flow.
   *
   * @returns A tool authorizer.
   */
  authorizer(): ToolWrapper {
    return createToolWrapper(this.protect.bind(this));
  }
}
