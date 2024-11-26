import { agentAsyncStorage } from './async-storage'

export function session() {
  const store = agentAsyncStorage.getStore();
  store.session = store.session || {};
  return store.session;
}
