import {
  ClientCheckRequest,
  ConsistencyPreference,
  CredentialsMethod,
  OpenFgaClient,
} from "@openfga/sdk";

import { ToolWithAuthHandler } from "./";

export type FGAAuthorizerParams = {
  name: string;
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

export type FGAAuthorizerOptions = {
  buildQuery: (params: any) => Promise<ClientCheckRequest>;
};

export class FGAAuthorizer {
  name: string;
  fgaClient: OpenFgaClient;

  private constructor(params?: FGAAuthorizerParams) {
    this.name = params?.name || "fga";
    this.fgaClient = new OpenFgaClient({
      apiUrl:
        params?.apiUrl || process.env.FGA_API_URL || "https://api.us1.fga.dev",
      storeId: params?.storeId || process.env.FGA_STORE_ID!,
      credentials: {
        method:
          params?.credentials?.method || CredentialsMethod.ClientCredentials,
        config: {
          apiTokenIssuer:
            params?.credentials?.config.apiTokenIssuer ||
            process.env.FGA_API_TOKEN_ISSUER ||
            "fga.us.auth0.com",
          apiAudience:
            params?.credentials?.config.apiAudience ||
            process.env.FGA_API_AUDIENCE ||
            "https://api.us1.fga.dev/",
          clientId:
            params?.credentials?.config.clientId || process.env.FGA_CLIENT_ID!,
          clientSecret:
            params?.credentials?.config.clientSecret ||
            process.env.FGA_CLIENT_SECRET!,
        },
      },
    });
  }

  private async authorize<I>(
    params: FGAAuthorizerOptions,
    toolExecutionParams?: I
  ): Promise<boolean | undefined> {
    const check = await params.buildQuery(toolExecutionParams);

    const response = await this.fgaClient.check(check, {
      consistency: ConsistencyPreference.HigherConsistency,
    });

    return response.allowed;
  }

  static create(params?: FGAAuthorizerParams) {
    const authorizer = new FGAAuthorizer(params);

    return (options: FGAAuthorizerOptions) => {
      return function fga<I, O>(handler: ToolWithAuthHandler<I, O>) {
        return async (input: I): Promise<O> => {
          const checkResponse = await authorizer.authorize(options, input);

          return handler({ allowed: checkResponse }, input);
        };
      };
    };
  }
}
