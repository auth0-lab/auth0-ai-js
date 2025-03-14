import { asyncLocalStorage } from "@auth0/ai/FederatedConnections";

export const getAccessTokenForConnection = () => {
  const t = asyncLocalStorage.getStore();
  if (typeof t === "undefined") {
    throw new Error(
      "The tool must be wrapped with the withTokenForConnection function."
    );
  }
  return t.accessToken;
};
