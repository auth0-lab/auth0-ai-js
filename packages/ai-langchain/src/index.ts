export * from "./FGA/fga-retriever";

import { AuthorizerParams } from "@auth0/ai";
import { DynamicStructuredTool } from "@langchain/core/tools";

import { CIBAAuthorizer } from "./ciba";
import { FederatedConnectionAuthorizer } from "./FederatedConnections";
import { FGA_AI } from "./FGA_AI";
import { ToolWrapper } from "./util/ToolWrapper";

type FederatedConnectionAuthorizerParams = ConstructorParameters<
  typeof FederatedConnectionAuthorizer
>[1];

type CIBAParams = ConstructorParameters<typeof CIBAAuthorizer>[1];

export { getCIBACredentials } from "./ciba";
export { getAccessTokenForConnection } from "./FederatedConnections";
export { GraphResumer } from "./ciba/GraphResumer";

export class Auth0AI {
  private config: AuthorizerParams | undefined;

  constructor(config?: AuthorizerParams) {
    this.config = {
      domain: config?.domain || process.env.AUTH0_DOMAIN,
      clientId: config?.clientId || process.env.AUTH0_CLIENT_ID,
      clientSecret: config?.clientSecret || process.env.AUTH0_CLIENT_SECRET,
    };
    if (!this.config.domain) {
      throw new Error(
        "Auth0 configuration error: No domain provided. Please set the 'domain' in the configuration or environment variables."
      );
    }
    if (!this.config.clientId) {
      throw new Error(
        "Auth0 configuration error: No clientId provided. Please set the 'clientId' in the configuration or environment variables."
      );
    }
  }

  /**
   * Builds a CIBA Authorizer for a tool.
   * @param params - The CIBA authorizer options.
   * @returns - The authorizer.
   */
  withCIBA(params: CIBAParams): ToolWrapper;

  /**
   * Protects a tool with the CIBA authorizer.
   * @param params - The CIBA authorizer options.
   * @param tool - The tool to protect.
   * @returns The protected tool.
   */
  withCIBA(
    params: CIBAParams,
    tool: DynamicStructuredTool
  ): DynamicStructuredTool;

  /**
   *
   * Builds a CIBA Authorizer for a tool.
   * If a tool is provided, it will be protected with the CIBA authorizer.
   * Otherwise the authorizer will be returned.
   *
   * @param options - The CIBA authorizer options.
   * @param [tool] - The tool to protect.
   * @returns The authorizer or the protected tool.
   */
  withCIBA(options: CIBAParams, tool?: DynamicStructuredTool) {
    const authorizer = new CIBAAuthorizer(this.config ?? {}, options);
    if (tool) {
      return authorizer.authorizer()(tool);
    }
    return authorizer.authorizer();
  }

  /**
   * Builds a Federated Connection authorizer for a tool.
   *
   * @param params - The Federated Connections authorizer options.
   * @returns The authorizer.
   */
  withFederatedConnection(
    params: FederatedConnectionAuthorizerParams
  ): ToolWrapper;

  /**
   * Protects a tool execution with the Federated Connection authorizer.
   *
   * @param params - The Federated Connections authorizer options.
   * @param tool - The tool to protect.
   * @returns The protected tool.
   */
  withFederatedConnection(
    params: FederatedConnectionAuthorizerParams,
    tool: DynamicStructuredTool
  ): DynamicStructuredTool;

  /**
   * Protects a tool execution with the Federated Connection authorizer.
   *
   * @param options - The Federated Connections authorizer options.
   * @returns The authorizer.
   */
  withFederatedConnection(
    options: FederatedConnectionAuthorizerParams,
    tool?: DynamicStructuredTool
  ) {
    const authorizer = new FederatedConnectionAuthorizer(
      //TODO: makes types compatible...
      this.config as ConstructorParameters<
        typeof FederatedConnectionAuthorizer
      >[0],
      options
    );
    if (tool) {
      return authorizer.authorizer()(tool);
    }
    return authorizer.authorizer();
  }

  static FGA = FGA_AI;
}
