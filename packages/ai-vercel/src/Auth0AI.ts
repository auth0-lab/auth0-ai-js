import { Tool } from "ai";
import { AuthenticationClient, AuthenticationClientOptions } from "auth0";

import { FederatedConnectionAuthorizer } from "./FederatedConnections";

type FederatedConnectionAuthorizerParams =
  Partial<Pick<AuthenticationClientOptions, 'domain' | 'clientSecret' | 'clientId'>>;

type ToolWrapper = ReturnType<FederatedConnectionAuthorizer['authorizer']>;
type FederatedConnectionParams = ConstructorParameters<typeof FederatedConnectionAuthorizer>[1];

export class Auth0AI {
  readonly domain: string;
  readonly clientId: string;
  readonly clientSecret: string;
  readonly authClient: AuthenticationClient;

  constructor(params: FederatedConnectionAuthorizerParams = {}) {
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
    this.domain = domain;
    this.clientId = clientId;
    this.clientSecret = clientSecret;

    this.authClient = new AuthenticationClient({
      domain: this.domain,
      clientId: this.clientId,
      clientSecret: this.clientSecret,
    });
  }

  withFederatedConnection(
    params: FederatedConnectionParams,
  ): ToolWrapper;

  withFederatedConnection(
    params: FederatedConnectionParams,
    tool: Tool
  ): Tool;

  withFederatedConnection(
    params: FederatedConnectionParams,
    tool?: Tool
  ) {
    const fc = new FederatedConnectionAuthorizer(this, params);
    const authorizer = fc.authorizer();
    if (tool) {
      return authorizer(tool);
    }
    return authorizer;
  }
};
