/**
 * Counts POSTs to `/oauth/token` by `grant_type` by wrapping `globalThis.fetch`. The core client
 * accepts no custom fetch, so the global is the only seam. Install it before creating the server
 * under test and call `restore()` in `afterEach`.
 */

export const TOKEN_EXCHANGE_GRANT = "urn:ietf:params:oauth:grant-type:token-exchange";

export interface FetchCounter {
  /** Count of token endpoint POSTs for one grant type. */
  count(grantType: string): number;
  /** Count of token exchange POSTs. */
  readonly exchanges: number;
  /** All counted grant types and their counts. */
  readonly byGrant: Readonly<Record<string, number>>;
  /** Zeroes the counts. */
  reset(): void;
  /** Puts the original `fetch` back. Safe to call twice. */
  restore(): void;
}

async function grantTypeOf(input: RequestInfo | URL, init?: RequestInit): Promise<string | null> {
  const request = input instanceof Request ? input : undefined;
  const url = request?.url ?? (input instanceof URL ? input.href : String(input));
  const method = (init?.method ?? request?.method ?? "GET").toUpperCase();
  if (method !== "POST" || !new URL(url).pathname.endsWith("/oauth/token")) return null;
  const body = init?.body ?? (request ? await request.clone().text() : undefined);
  if (body instanceof URLSearchParams) return body.get("grant_type") ?? "unknown";
  if (typeof body === "string") return new URLSearchParams(body).get("grant_type") ?? "unknown";
  return "unknown";
}

/** Wraps `globalThis.fetch` and starts counting. */
export function installFetchCounter(): FetchCounter {
  const original = globalThis.fetch;
  const byGrant: Record<string, number> = {};
  let installed = true;

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const grant = await grantTypeOf(input, init);
    if (grant !== null) byGrant[grant] = (byGrant[grant] ?? 0) + 1;
    return original(input, init);
  }) as typeof fetch;
  const wrapper = globalThis.fetch;

  return {
    count: (grantType) => byGrant[grantType] ?? 0,
    get exchanges() {
      return byGrant[TOKEN_EXCHANGE_GRANT] ?? 0;
    },
    byGrant,
    reset() {
      for (const key of Object.keys(byGrant)) delete byGrant[key];
    },
    restore() {
      if (installed && globalThis.fetch === wrapper) globalThis.fetch = original;
      installed = false;
    },
  };
}
