import { AsyncLocalStorage } from "node:async_hooks";

export const agentAsyncStorage = new AsyncLocalStorage<{
  user: { id: string; name: string };
  session: { id: string; expires: Date };
  tokens: { accessToken: string; refreshToken: string };
}>();
