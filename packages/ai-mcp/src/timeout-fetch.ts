/** Default limit, in milliseconds, for each outbound HTTP request of the core client. */
export const DEFAULT_REQUEST_TIMEOUT_MS = 10_000;

/** Largest delay `setTimeout` accepts. A larger value would fire immediately. */
const MAX_TIMEOUT_MS = 2_147_483_647;

/**
 * Returns `value` when it is a usable timeout, otherwise throws a `RangeError`.
 * A usable timeout is a finite number greater than zero and at most 2,147,483,647.
 */
export function assertValidTimeout(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0 || value > MAX_TIMEOUT_MS) {
    throw new RangeError('must be a finite number greater than 0 and at most 2147483647');
  }
  return value;
}

/**
 * Wraps `fetch` so each request is aborted after `timeoutMs`.
 *
 * The abort cancels the network call itself, so nothing is left running. The timer is not
 * cleared when the response headers arrive, which keeps a stalled response body bounded
 * too. It is unref'd, so it never holds a process open. A caller supplied `signal` is
 * honoured as well. `globalThis.fetch` is read on every call, so test doubles installed
 * later still apply.
 */
export function createTimeoutFetch(timeoutMs: number): typeof fetch {
  return (input, init) => {
    const controller = new AbortController();
    const upstream = init?.signal;
    const onUpstreamAbort = () => controller.abort(upstream?.reason);

    if (upstream?.aborted) {
      controller.abort(upstream.reason);
    } else {
      upstream?.addEventListener('abort', onUpstreamAbort, { once: true });
    }

    const timer = setTimeout(() => {
      upstream?.removeEventListener('abort', onUpstreamAbort);
      controller.abort(new DOMException(`The request timed out after ${timeoutMs} ms.`, 'TimeoutError'));
    }, timeoutMs);
    timer.unref?.();

    // On success the caller signal stays linked, so aborting it still cancels the body read.
    return globalThis.fetch(input, { ...init, signal: controller.signal }).catch((error: unknown) => {
      clearTimeout(timer);
      upstream?.removeEventListener('abort', onUpstreamAbort);
      throw error;
    });
  };
}
