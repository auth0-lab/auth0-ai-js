import { Tool, ToolExecutionOptions } from "ai";
import { Schema, z } from "zod";

import { CIBAAuthorizerBase } from "@auth0/ai/CIBA";

import { ToolContext } from "../util/ToolContext";

type Parameters = z.ZodTypeAny | Schema<any>;

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
