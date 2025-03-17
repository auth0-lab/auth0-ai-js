import { Credentials } from "@auth0/ai";
import { asyncLocalStorage } from "@auth0/ai/CIBA";

export const getCIBACredentials = (): Credentials | undefined => {
  const t = asyncLocalStorage.getStore();
  if (typeof t === "undefined") {
    throw new Error("The tool must be wrapped with the withCIBA function.");
  }
  return t.credentials;
};
