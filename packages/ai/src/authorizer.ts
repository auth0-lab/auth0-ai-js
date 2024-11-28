export interface AuthorizationOptions {
  loginHint?: string;
  acrValues?: string[];
  maxAge?: number;
  scope?: string[];
  bindingMessage?: string;
  realm?: string
}


export interface Credential {
  type: string;
  value: string;
}

export interface Credentials {
  accessToken: Credential
  refreshToken?: Credential
}

export interface PendingAuthorization {
  transactionId: string
  requestId: string
}



export interface Authorizer {
  authorize(params: AuthorizationOptions): Promise<Credentials | PendingAuthorization>;
}
