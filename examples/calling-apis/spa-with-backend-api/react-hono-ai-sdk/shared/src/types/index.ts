export type ApiResponse = {
  message: string;
  success: true;
};

export type User = {
  sub: string;
  name?: string;
  email?: string;
  picture?: string;
};
