import { afterEach, describe, expect, it, vi } from 'vitest';
import { assertValidTimeout, createTimeoutFetch } from '../src/timeout-fetch.js';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

/** A fetch that never answers and rejects when its signal aborts. */
function hangingFetch() {
  const seen: AbortSignal[] = [];
  const impl = vi.fn((_input: unknown, init?: RequestInit) => {
    const signal = init?.signal as AbortSignal;
    seen.push(signal);
    return new Promise<Response>((_resolve, reject) => {
      if (signal.aborted) return reject(signal.reason);
      signal.addEventListener('abort', () => reject(signal.reason), { once: true });
    });
  });
  vi.stubGlobal('fetch', impl);
  return { impl, seen };
}

describe('createTimeoutFetch', () => {
  it('aborts the underlying request with a TimeoutError once the limit passes', async () => {
    vi.useFakeTimers();
    const { seen } = hangingFetch();
    const pending = createTimeoutFetch(1000)('https://tenant.example.com/oauth/token');
    const outcome = pending.then(
      () => undefined,
      (error: Error) => error
    );

    await vi.advanceTimersByTimeAsync(999);
    expect(seen[0]?.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);

    const error = await outcome;
    expect(seen[0]?.aborted).toBe(true);
    expect(error?.name).toBe('TimeoutError');
  });

  it('passes a response through when it arrives in time', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('ok')));
    const response = await createTimeoutFetch(1000)('https://tenant.example.com/x');
    expect(await response.text()).toBe('ok');
  });

  it('forwards the request init apart from the signal', async () => {
    const impl = vi.fn(async () => new Response('ok'));
    vi.stubGlobal('fetch', impl);
    await createTimeoutFetch(1000)('https://tenant.example.com/x', { method: 'POST', body: 'a=b' });
    const init = (impl.mock.calls[0] as unknown as [unknown, RequestInit])[1];
    expect(init.method).toBe('POST');
    expect(init.body).toBe('a=b');
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('honours a caller supplied signal', async () => {
    const { seen } = hangingFetch();
    const caller = new AbortController();
    const pending = createTimeoutFetch(60_000)('https://tenant.example.com/x', { signal: caller.signal });
    caller.abort(new Error('caller gave up'));
    await expect(pending).rejects.toThrow('caller gave up');
    expect(seen[0]?.aborted).toBe(true);
  });

  it('aborts at once when the caller signal is already aborted', async () => {
    hangingFetch();
    const caller = new AbortController();
    caller.abort(new Error('already'));
    await expect(createTimeoutFetch(60_000)('https://tenant.example.com/x', { signal: caller.signal })).rejects.toThrow(
      'already'
    );
  });
});

describe('assertValidTimeout', () => {
  it.each([1, 10_000, 2_147_483_647, 0.5])('accepts %s', (value) => {
    expect(assertValidTimeout(value)).toBe(value);
  });

  it.each([0, -1, Number.NaN, Infinity, 2_147_483_648, '1000', null, undefined, {}])('rejects %s', (value) => {
    expect(() => assertValidTimeout(value)).toThrow(RangeError);
  });
});
