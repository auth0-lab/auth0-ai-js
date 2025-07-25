// Global auth context type for tools
export interface AuthContext {
  userSub: string;
  accessToken: string;
  domain: string;
  clientId: string;
  clientSecret: string;
}

// Global declaration
declare global {
  var authContext: AuthContext | undefined;
}
