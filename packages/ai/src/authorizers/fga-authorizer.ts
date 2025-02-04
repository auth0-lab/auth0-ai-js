import { ClientCheckRequest, ConsistencyPreference, CredentialsMethod, OpenFgaClient } from "@openfga/sdk";

import { Authorizer } from "../authorizer";
import { Credentials } from "../credentials";

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

export class FGAAuthorizer implements Authorizer {
  name: string;
  fgaClient: OpenFgaClient;

  constructor(params?: FGAAuthorizerParams) {
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

  async authorize(params: ClientCheckRequest): Promise<Credentials> {
    const response = await this.fgaClient.check(params, {
      consistency: ConsistencyPreference.HigherConsistency,
    });

    if (!response.allowed) {
      throw new Error("Client is not allowed to access the resource");
    }

    return {
      accessToken: {
        type: "Bearer",
        value: "",
      },
    };
  }
}
