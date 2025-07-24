export type ApiResponse = {
  message: string;
  success: true;
};

export type Auth0Config = {
  domain: string;
  clientId: string;
  audience: string;
};

export type User = {
  sub: string;
  name?: string;
  email?: string;
  picture?: string;
};
