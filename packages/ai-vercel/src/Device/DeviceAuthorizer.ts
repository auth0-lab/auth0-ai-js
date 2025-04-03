import { Tool, ToolExecutionOptions } from "ai";
import { Schema, z } from "zod";

import { DeviceAuthorizerBase } from "@auth0/ai/Device";

import { ToolContext } from "../util/ToolContext";

type Parameters = z.ZodTypeAny | Schema<any>;

/**
 * The DeviceAuthorizer class implements the Device Authorization Flow for a Vercel-AI tool.
 */
export class DeviceAuthorizer extends DeviceAuthorizerBase<
  [any, ToolExecutionOptions]
> {
  /**
   *
   * Builds a tool authorizer that protects the tool execution with the CIBA authorization flow.
   *
   * @returns A tool authorizer.
   */
  authorizer() {
    return <PARAMETERS extends Parameters = any, RESULT = any>(
      t: Tool<PARAMETERS, RESULT>
    ): Tool<PARAMETERS, RESULT> => {
      return {
        ...t,
        execute: this.protect(ToolContext(t), t.execute!),
      };
    };
  }
}
