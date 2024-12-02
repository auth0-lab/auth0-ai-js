import { agentAsyncStorage } from './async-storage'

export function user() {
  const store = agentAsyncStorage.getStore();
  return store.user;
}
