import { ToolWrapper } from "src/util/types";

import { CIBAAuthorizerBase } from "@auth0/ai/CIBA";

/**
 * The CIBAAuthorizer class implements the CIBA authorization flow for a Genkit AI tool.
 *
 * CIBA (Client Initiated Backchannel Authentication) is a protocol that allows a client to
 * request authorization from the user via an out-of-band channel.
 */
export class CIBAAuthorizer extends CIBAAuthorizerBase<[any, any]> {
  /**
   *
   * Builds a tool authorizer that protects the tool execution with the CIBA authorization flow.
   *
   * @returns A tool authorizer.
   */
  // authorizer() {
  //   return <T extends (...args: [any, any]) => any>(fn: T): T => {
  //     return this.protect(fn) as T;
  //   };
  // }

  /**
   *
   * Builds a tool authorizer that protects the tool execution with the CIBA authorization flow.
   *
   * @returns A tool authorizer.
   */
  authorizer(): ToolWrapper {
    return ((fn) => {
      return this.protect((...args) => args, fn);
    }) as ToolWrapper;
  }
}
