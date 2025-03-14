import { Tool, ToolExecutionOptions } from "ai";
import { Schema, z } from "zod";

import {
  AuthorizationPending,
  AuthorizationPollingError,
  Credentials,
} from "@auth0/ai";
import { AuthorizeResponse, CIBAAuthorizerBase } from "@auth0/ai/CIBA";

import { CIBAuthorizationError } from "./CIBAuthorizationError";

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
   * Overrides the getCredentials method to handle the CIBA authorization errors.
   *
   * @param params
   * @returns
   */
  protected override async getCredentials(
    params: AuthorizeResponse
  ): Promise<Credentials | undefined> {
    try {
      return await super.getCredentials(params);
    } catch (err) {
      if (err instanceof Error) {
        throw new CIBAuthorizationError(
          err.message,
          err.name !== AuthorizationPending.name &&
            err.name !== AuthorizationPollingError.name
        );
      }
    }
  }

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
        execute: this.protect((params, ctx) => ctx, t.execute!),
      };
    };
  }
}
