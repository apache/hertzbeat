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

import { afterEach, describe, expect, it, vi } from 'vitest';

import { apiFetch, apiStreamFetch, registerBrowserSessionRefreshCoordinator } from './http-client';

async function flush() {
  for (let i = 0; i < 24; i += 1) await Promise.resolve();
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(complete => {
    resolve = complete;
  });
  return { promise, resolve };
}
const ok = () => new Response(null, { status: 200 });

describe('cookie response header ordering', () => {
  let unregister: (() => void) | undefined;
  afterEach(() => {
    unregister?.();
    unregister = undefined;
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('keeps readers concurrent while a queued writer precedes later readers', async () => {
    vi.stubGlobal('navigator', {});
    const first = deferred<Response>();
    const second = deferred<Response>();
    const writer = deferred<Response>();
    const events: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(input => {
        const path = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
        events.push(path);
        if (path === '/first') return first.promise;
        if (path === '/second') return second.promise;
        if (path === '/api/ui/session') return writer.promise;
        return Promise.resolve(ok());
      })
    );
    const a = apiFetch('/first');
    const b = apiFetch('/second');
    await flush();
    expect(events).toEqual(['/first', '/second']);
    const w = apiFetch('/api/ui/session', { method: 'POST' });
    const late = apiFetch('/late');
    try {
      await flush();
      expect(events).toEqual(['/first', '/second']);
      first.resolve(ok());
      await a;
      await flush();
      expect(events).toHaveLength(2);
      second.resolve(ok());
      await b;
      await flush();
      expect(events).toEqual(['/first', '/second', '/api/ui/session']);
      writer.resolve(ok());
      await w;
      await late;
      expect(events).toEqual(['/first', '/second', '/api/ui/session', '/late']);
    } finally {
      first.resolve(ok());
      second.resolve(ok());
      writer.resolve(ok());
      await Promise.all([a, b, w, late]);
    }
  });

  it('releases a rejected read before coordinator refresh and safe replay', async () => {
    vi.stubGlobal('navigator', {});
    const paths: string[] = [];
    let reads = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(input => {
        const path = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
        paths.push(path);
        return Promise.resolve(new Response(null, { status: path === '/read' && reads++ === 0 ? 401 : 200 }));
      })
    );
    unregister = registerBrowserSessionRefreshCoordinator(async () => {
      await apiFetch('/api/ui/session/refresh', { method: 'POST' });
      return { status: 'renewed' };
    });
    expect((await apiFetch('/read')).status).toBe(200);
    expect(paths).toEqual(['/read', '/api/ui/session/refresh', '/read']);
  });

  it('releases stream admission at headers and keeps caller body cancellation', async () => {
    vi.stubGlobal('navigator', {});
    const caller = new AbortController();
    let transportSignal: AbortSignal | null | undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>((input, init) => {
        if (input === '/stream') {
          transportSignal = init?.signal;
          return Promise.resolve(
            new Response(
              new ReadableStream({
                start() {
                  /* deliberately open body */
                }
              })
            )
          );
        }
        return Promise.resolve(ok());
      })
    );
    const stream = await apiStreamFetch('/stream', { signal: caller.signal });
    expect(stream.body).not.toBeNull();
    await apiFetch('/api/ui/session', { method: 'POST' });
    caller.abort();
    expect(transportSignal?.aborted).toBe(true);
    await stream.body?.cancel();
  });

  it('keeps a writer blocked until cancelled stream transport actually settles', async () => {
    vi.stubGlobal('navigator', {});
    const headers = deferred<Response>();
    const caller = new AbortController();
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(input => (input === '/stream' ? headers.promise : Promise.resolve(ok())))
    );
    const stream = apiStreamFetch('/stream', { signal: caller.signal }).catch(reason => reason as unknown);
    await flush();
    const writer = apiFetch('/api/ui/session', { method: 'POST' });
    caller.abort();
    await stream;
    await flush();
    try {
      expect(fetch).toHaveBeenCalledOnce();
    } finally {
      headers.resolve(ok());
      await writer;
    }
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('never submits a cancelled queued reader and permits writer completion', async () => {
    vi.stubGlobal('navigator', {});
    const headers = deferred<Response>();
    const caller = new AbortController();
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockReturnValueOnce(headers.promise));
    const writer = apiFetch('/api/ui/session', { method: 'POST' });
    await flush();
    const queued = apiFetch('/read', { signal: caller.signal }).catch(reason => reason as unknown);
    caller.abort();
    await queued;
    headers.resolve(ok());
    await writer;
    expect(fetch).toHaveBeenCalledOnce();
  });
});
