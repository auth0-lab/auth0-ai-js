import {
  ClientCheckRequest,
  ConsistencyPreference,
  CredentialsMethod,
  OpenFgaClient,
} from "@openfga/sdk";

export type FGAAuthorizerParams = {
  apiUrl?: string;
  storeId?: string;
  credentials?: {
    method: any;
    config: {
      apiTokenIssuer: string;
      apiAudience: string;
      clientId: string;
      clientSecret: string;
    };
  };
};

export type FGAAuthorizerOptions<ToolExecuteArgs extends any[]> = {
  buildQuery: (...args: ToolExecuteArgs) => Promise<ClientCheckRequest>;
  onUnauthorized?: (...args: ToolExecuteArgs) => any;
};

export class FGAAuthorizerBase<ToolExecuteArgs extends any[]> {
  fgaClient: OpenFgaClient;

  constructor(
    fgaClientParams: FGAAuthorizerParams | undefined | null,
    private authorizeOptions: FGAAuthorizerOptions<ToolExecuteArgs>
  ) {
    this.fgaClient = new OpenFgaClient({
      apiUrl:
        fgaClientParams?.apiUrl ||
        process.env.FGA_API_URL ||
        "https://api.us1.fga.dev",
      storeId: fgaClientParams?.storeId || process.env.FGA_STORE_ID!,
      credentials: {
        method:
          fgaClientParams?.credentials?.method ||
          CredentialsMethod.ClientCredentials,
        config: {
          apiTokenIssuer:
            fgaClientParams?.credentials?.config.apiTokenIssuer ||
            process.env.FGA_API_TOKEN_ISSUER ||
            "auth.fga.dev",
          apiAudience:
            fgaClientParams?.credentials?.config.apiAudience ||
            process.env.FGA_API_AUDIENCE ||
            "https://api.us1.fga.dev/",
          clientId:
            fgaClientParams?.credentials?.config.clientId ||
            process.env.FGA_CLIENT_ID!,
          clientSecret:
            fgaClientParams?.credentials?.config.clientSecret ||
            process.env.FGA_CLIENT_SECRET!,
        },
      },
    });
  }

  /**
   *
   * Wraps the execute method of an AI tool to handle FGA authorization.
   *
   * @param execute - The tool execute method.
   * @returns The wrapped execute method.
   */
  protect(
    execute: (...args: ToolExecuteArgs) => any
  ): (...args: ToolExecuteArgs) => any {
    return async (...args: ToolExecuteArgs) => {
      const check = await this.authorizeOptions.buildQuery(...args);
      const { allowed } = await this.fgaClient.check(check, {
        consistency: ConsistencyPreference.HigherConsistency,
      });
      if (!allowed) {
        if (typeof this.authorizeOptions.onUnauthorized === "function") {
          return this.authorizeOptions.onUnauthorized(...args);
        } else {
          return "The user is not allowed to perform the action.";
        }
      }
      return execute(...args);
    };
  }
}
