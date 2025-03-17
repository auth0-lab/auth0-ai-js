import { CredentialsMethod, OpenFgaClient } from "@openfga/sdk";

export type FGAClientParams = {
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
export function buildOpenFgaClient(
  fgaClientParams?: FGAClientParams | null
): OpenFgaClient {
  return new OpenFgaClient({
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
