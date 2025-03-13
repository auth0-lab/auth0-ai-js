import { asyncLocalStorage } from "@auth0/ai/FederatedConnections";

export const getAccessTokenForConnection = () => {
  const store = asyncLocalStorage.getStore();
  if (typeof store === "undefined") {
    throw new Error(
      "The tool must be wrapped with the withFederatedConnections function."
    );
  }
  return store?.accessToken;
};
