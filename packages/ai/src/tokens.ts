import { agentAsyncStorage } from "./async-storage";

export function tokens() {
  const store = agentAsyncStorage.getStore();
  return store.tokens || { accessToken: "" };
}
