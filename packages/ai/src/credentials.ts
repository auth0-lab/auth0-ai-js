export interface Credential {
  type: string;
  value: string;
}

export interface Credentials {
  idToken?: Credential;
  accessToken: Credential;
  refreshToken?: Credential;
}
