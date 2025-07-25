export interface FederatedTokenExchangeOptions {
  domain: string;
  clientId: string;
  clientSecret: string;
  connection: string;
  loginHint: string;
  subjectToken: string;
}

export interface FederatedTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
}

/**
 * Performs a federated token exchange to get an access token for a specific connection
 *
 * // TODO: this new functionality should be moved into the auth0 ai package's
 * implementation, allowing access tokens for federated token exchanges instead of refresh tokens
 */
export async function getAccessTokenForConnection(
  options: FederatedTokenExchangeOptions
): Promise<string> {
  const {
    domain,
    clientId,
    clientSecret,
    connection,
    loginHint,
    subjectToken,
  } = options;

  const tokenUrl = `https://${domain}/oauth/token`;

  const params = new URLSearchParams({
    grant_type:
      "urn:auth0:params:oauth:grant-type:token-exchange:federated-connection-access-token",
    client_id: clientId,
    client_secret: clientSecret,
    subject_token_type: "urn:ietf:params:oauth:token-type:access_token",
    requested_token_type:
      "http://auth0.com/oauth/token-type/federated-connection-access-token",
    connection,
    // is currently causing `401 Unauthorized { "error": "user_not_found", "description": "Identity User not found." }` errors, so removing for now...
    // login_hint: loginHint,
    subject_token: subjectToken,
  });

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Federated token exchange failed: ${response.status} ${response.statusText} - ${errorBody}`
    );
  }

  const tokenData = (await response.json()) as FederatedTokenResponse;

  if (!tokenData.access_token) {
    throw new Error("No access token received from federated token exchange");
  }

  console.log(
    "Federated exchange succeeded, new access token issued:",
    tokenData.access_token
  );

  return tokenData.access_token;
}
