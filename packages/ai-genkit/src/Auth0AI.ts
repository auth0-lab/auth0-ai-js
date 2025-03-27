import { AuthenticationClientOptions } from "auth0";
import { z } from "genkit";

import { CIBAAuthorizerBase } from "@auth0/ai/CIBA";

import { CIBAAuthorizer } from "./CIBA";
import { FGA_AI } from "./FGA_AI";

import type { ToolFn } from "@genkit-ai/ai/tool";
import type { ToolWrapper } from "./util/types";
type AuthorizerParams = Pick<
  AuthenticationClientOptions,
  "domain" | "clientId" | "clientSecret"
>;

type CIBAParams = ConstructorParameters<typeof CIBAAuthorizerBase>[1];

export class Auth0AI {
  private readonly config: Required<AuthorizerParams>;

  constructor(params: Partial<AuthorizerParams> = {}) {
    const domain = params.domain || process.env.AUTH0_DOMAIN;
    const clientId = params.clientId || process.env.AUTH0_CLIENT_ID;
    const clientSecret = params.clientSecret || process.env.AUTH0_CLIENT_SECRET;

    if (!domain) {
      throw new Error("No domain provided");
    }

    if (!clientId) {
      throw new Error("No clientId provided");
    }

    if (!clientSecret) {
      throw new Error("No clientSecret provided");
    }

    this.config = {
      domain,
      clientId,
      clientSecret,
    };
  }

  /**
   *
   * Returns a tool authorizer that protects the tool execution
   * with the Client Initiated Base Authentication (CIBA) authorization control.
   *
   * @param params - The parameters for the CIBA authorization control.
   * @returns A tool authorizer.
   */
  withCIBA(params: CIBAParams): ToolWrapper;

  /**
   *
   * Protects a tool function with Client Initiated Base Authentication (CIBA) authorization control.
   *
   * @param params - The parameters for the CIBA authorization control.
   * @param tool - The tool to protect.
   * @returns The protected tool.
   */
  withCIBA<T extends ToolFn<z.AnyZodObject, z.AnyZodObject>>(
    params: CIBAParams,
    tool: T
  ): T;

  /**
   *
   * Builds an Client Initiated Base Authentication (CIBA) authorizer for a tool.
   * if a tool is provided, the authorizer is applied to the tool.
   * @param params - The parameters for the FGA authorization control.
   * @param tool - The tool function to protect.
   * @returns
   */
  withCIBA<T extends ToolFn<z.AnyZodObject, z.AnyZodObject>>(
    params: CIBAParams,
    tool?: T
  ) {
    const fc = new CIBAAuthorizer(this.config, params);
    const authorizer = fc.authorizer();
    if (tool) {
      return authorizer(tool);
    }
    return authorizer;
  }

  static FGA = FGA_AI;
}
