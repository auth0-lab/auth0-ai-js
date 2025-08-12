// Global type declarations for the server
declare global {
  var authContext:
    | {
        userSub: string;
        accessToken: string;
      }
    | undefined;
}

export {};
