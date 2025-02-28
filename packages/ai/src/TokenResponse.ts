export type TokenResponse = {
  /** Bearer token for API authorization */
  access_token: string;
  /** Refresh token (requires `offline_access` scope) */
  refresh_token?: string;
  /** JWT containing user identity claims */
  id_token: string;
  /** Typically "Bearer" */
  token_type?: string;
  /** Token validity in seconds (default: 86400) */
  expires_in: number;
  /** Granted permissions space */
  scope: string;
};
