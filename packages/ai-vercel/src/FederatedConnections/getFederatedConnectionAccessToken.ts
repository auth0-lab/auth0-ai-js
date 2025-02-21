import { asyncLocalStorage } from "./asyncLocalStorage";

export const getFederatedConnectionAccessToken = () => {
  const t = asyncLocalStorage.getStore();
  if (typeof t === 'undefined') {
    throw new Error("The tool must be wrapped with the withThirdPartyAPIAccess function.");
  }
  return t.getAccessToken();
};
