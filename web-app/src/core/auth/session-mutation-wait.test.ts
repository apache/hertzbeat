/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { apiFetch } from '@/core/http/http-client';
import { anonymousSession, getSession, loginSession, logoutSession, refreshSession } from './session-api';

function response() {
  return new Response(JSON.stringify({ code: 0, msg: null, data: anonymousSession }), { status: 200 });
}

async function flush() {
  for (let index = 0; index < 12; index += 1) await Promise.resolve();
}

function observe<T>(promise: Promise<T>) {
  let state = 'pending';
  let error: unknown;
  const done = promise.then(
    () => {
      state = 'fulfilled';
    },
    reason => {
      state = 'rejected';
      error = reason;
    }
  );
  return { done, state: () => state, error: () => error };
}

function abortError(signal?: AbortSignal | null): Error {
  const reason: unknown = signal?.reason;
  return reason instanceof Error ? reason : new DOMException('Synthetic request aborted', 'AbortError');
}

function contendedLocks() {
  const releases: Array<() => void> = [];
  const request = vi.fn(
    (
      _name: string,
      optionsOrCallback: { signal?: AbortSignal } | (() => Promise<unknown>),
      callback?: () => Promise<unknown>
    ) => {
      const operation = typeof optionsOrCallback === 'function' ? optionsOrCallback : callback!;
      const signal = typeof optionsOrCallback === 'function' ? undefined : optionsOrCallback.signal;
      return new Promise<unknown>((resolve, reject) => {
        const abort = () => reject(abortError(signal));
        signal?.addEventListener('abort', abort, { once: true });
        releases.push(() => {
          signal?.removeEventListener('abort', abort);
          if (signal?.aborted) return;
          void Promise.resolve().then(operation).then(resolve, reject);
        });
      });
    }
  );
  vi.stubGlobal('navigator', { locks: { request } });
  return { request, releaseAll: () => releases.splice(0).forEach(release => release()) };
}

describe('session queue admission bounds', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Keep the existing HTTP timeout on the same clock as admission tests.
    vi.spyOn(AbortSignal, 'timeout').mockImplementation(milliseconds => {
      const controller = new AbortController();
      setTimeout(() => controller.abort(new DOMException('Synthetic HTTP timeout', 'TimeoutError')), milliseconds);
      return controller.signal;
    });
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockImplementation(() => Promise.resolve(response()))
    );
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('bounds login while another tab holds its Web Lock without submitting HTTP', async () => {
    const locks = contendedLocks();
    const result = observe(loginSession('synthetic-operator', 'synthetic-test-credential'));
    try {
      await flush();
      await vi.advanceTimersByTimeAsync(30_001);
      expect(result.state()).toBe('rejected');
      expect(result.error()).toMatchObject({ kind: 'unavailable' });
      expect(fetch).not.toHaveBeenCalled();
    } finally {
      locks.releaseAll();
      await result.done;
    }
  });

  it('cancels a read waiting on a Web Lock and never sends the cancelled request', async () => {
    const locks = contendedLocks();
    const controller = new AbortController();
    const result = observe(getSession({ signal: controller.signal }));
    try {
      await flush();
      controller.abort();
      await flush();
      expect(result.state()).toBe('rejected');
      expect(result.error()).toMatchObject({ name: 'AbortError' });
      expect(fetch).not.toHaveBeenCalled();
    } finally {
      locks.releaseAll();
      await result.done;
    }
  });

  it('reports blocked logout as failure rather than completed cookie clearing', async () => {
    const locks = contendedLocks();
    const result = observe(logoutSession());
    try {
      await flush();
      await vi.advanceTimersByTimeAsync(30_001);
      expect(result.state()).toBe('rejected');
      expect(result.error()).toMatchObject({ kind: 'unavailable' });
      expect(fetch).not.toHaveBeenCalled();
    } finally {
      locks.releaseAll();
      await result.done;
    }
  });

  it('rejects a cancelled local waiter promptly behind an active fallback request', async () => {
    vi.stubGlobal('navigator', {});
    let release!: (value: Response) => void;
    vi.mocked(fetch).mockReturnValueOnce(
      new Promise<Response>(resolve => {
        release = resolve;
      })
    );
    const holder = observe(refreshSession());
    await flush();
    const controller = new AbortController();
    const waiter = observe(getSession({ signal: controller.signal }));
    try {
      controller.abort();
      await flush();
      expect(waiter.state()).toBe('rejected');
      expect(fetch).toHaveBeenCalledOnce();
    } finally {
      release(response());
      await holder.done;
      await waiter.done;
    }
    await flush();
    expect(fetch).toHaveBeenCalledOnce();
    await getSession();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('times out an active hung fetch through its AbortSignal and then admits the next request', async () => {
    vi.stubGlobal('navigator', {});
    const controller = new AbortController();
    vi.mocked(fetch).mockImplementationOnce(
      (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(abortError(init.signal)), { once: true });
        })
    );
    const holder = observe(refreshSession({ signal: controller.signal }));
    try {
      await flush();
      await vi.advanceTimersByTimeAsync(30_001);
      expect(holder.state()).toBe('rejected');
      expect(holder.error()).toMatchObject({ kind: 'unavailable' });
    } finally {
      controller.abort();
      await holder.done;
    }
    await getSession();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('refuses an expired grant after wall-clock suspension even before its timer fires', async () => {
    const locks = contendedLocks();
    const start = Date.now();
    const result = observe(getSession());
    await flush();
    vi.setSystemTime(start + 60_000);
    locks.releaseAll();
    await result.done;
    expect(result.state()).toBe('rejected');
    expect(result.error()).toMatchObject({ kind: 'unavailable' });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('recovers queue admission after the Web Lock API rejects a waiter', async () => {
    const request = vi
      .fn()
      .mockRejectedValueOnce(new Error('synthetic lock failure'))
      .mockImplementation((_name: string, _options: unknown, operation: () => Promise<unknown>) => operation());
    vi.stubGlobal('navigator', { locks: { request } });
    await expect(getSession()).rejects.toMatchObject({ kind: 'unavailable' });
    await expect(getSession()).resolves.toEqual(anonymousSession);
    expect(fetch).toHaveBeenCalledOnce();
  });

  it('does not submit another writer while a transport has not acknowledged cancellation', async () => {
    vi.stubGlobal('navigator', {});
    let release!: (value: Response) => void;
    vi.mocked(fetch).mockReturnValueOnce(
      new Promise<Response>(resolve => {
        release = resolve;
      })
    );
    const holder = observe(refreshSession());
    await flush();
    await vi.advanceTimersByTimeAsync(30_001);
    expect(holder.state()).toBe('rejected');
    const next = observe(getSession());
    await flush();
    expect(fetch).toHaveBeenCalledOnce();
    release(response());
    await holder.done;
    await next.done;
    expect(next.state()).toBe('fulfilled');
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('releases the fallback queue after a holder exception', async () => {
    vi.stubGlobal('navigator', {});
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError('synthetic transport failure'));
    await expect(refreshSession()).rejects.toMatchObject({ kind: 'unavailable' });
    await expect(getSession()).resolves.toEqual(anonymousSession);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});

describe('ordinary API late cookie clearing boundary', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('settles ordinary cookie clearing before a fresh login writes cookies', async () => {
    let release!: (value: Response) => void;
    let cookiePresent = false;
    const events: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockImplementation(input => {
        if (input === '/api/synthetic-protected') {
          return new Promise<Response>(resolve => {
            release = resolve;
          }).then(value => {
            cookiePresent = false;
            events.push('ordinary-cookie-clear');
            return value;
          });
        }
        cookiePresent = true;
        events.push('login-cookie-write');
        return Promise.resolve(response());
      })
    );
    const ordinary = apiFetch('/api/synthetic-protected');
    await flush();
    const login = loginSession('synthetic-operator', 'synthetic-test-credential');
    try {
      await flush();
      expect(events).toEqual([]);
    } finally {
      release(new Response(null, { status: 401 }));
      await Promise.all([ordinary, login]);
    }
    expect(events).toEqual(['ordinary-cookie-clear', 'login-cookie-write']);
    expect(cookiePresent).toBe(true);
  });
});
