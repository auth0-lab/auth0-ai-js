import { AsyncLocalStorage } from "node:async_hooks";

import { asyncLocalStorage as asyncLocalStorageInt, AsyncStorageValue } from "@auth0/ai/FederatedConnections";

export const asyncLocalStorage = asyncLocalStorageInt as AsyncLocalStorage<
  AsyncStorageValue<{
    thread_id: string;
    checkpoint_ns: string;
    run_id: string;
    tool_call_id: string;
  }>
>;
