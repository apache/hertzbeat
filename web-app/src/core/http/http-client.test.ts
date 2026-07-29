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

import { apiFetch, registerBrowserSessionRefreshCoordinator } from './http-client';

describe('apiFetch', () => {
  let unregisterRefreshCoordinator: (() => void) | undefined;

  afterEach(() => {
    unregisterRefreshCoordinator?.();
    unregisterRefreshCoordinator = undefined;
    document.cookie = 'hb_ui_csrf=; Max-Age=0; path=/';
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('refreshes and retries a read once after an unauthorized response', async () => {
    const refresh = vi.fn().mockResolvedValue({ status: 'renewed' } as const);
    unregisterRefreshCoordinator = registerBrowserSessionRefreshCoordinator(refresh);
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response('{"data":[]}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await apiFetch('/api/monitor');

    expect(response.status).toBe(200);
    expect(refresh).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('returns the unauthorized read when the session coordinator cannot recover', async () => {
    const refresh = vi.fn().mockResolvedValue({ status: 'uncertain', failure: 'unavailable' } as const);
    unregisterRefreshCoordinator = registerBrowserSessionRefreshCoordinator(refresh);
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 401 }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await apiFetch('/api/monitor');

    expect(response.status).toBe(401);
    expect(refresh).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('never replays a mutation', async () => {
    const refresh = vi.fn().mockResolvedValue({ status: 'renewed' } as const);
    unregisterRefreshCoordinator = registerBrowserSessionRefreshCoordinator(refresh);
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 401 }));
    vi.stubGlobal('fetch', fetchMock);
    document.cookie = 'hb_ui_csrf=monitor-csrf-token; path=/';

    const response = await apiFetch('/api/monitor', { method: 'POST', body: '{}' });

    expect(response.status).toBe(401);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(refresh).toHaveBeenCalledOnce();
    const request = fetchMock.mock.calls[0]?.[1];
    expect(new Headers(request?.headers).get('X-HertzBeat-CSRF')).toBe('monitor-csrf-token');
  });

  it('does not recursively refresh when the refresh endpoint itself rejects the session', async () => {
    const refresh = vi.fn().mockResolvedValue({ status: 'renewed' } as const);
    unregisterRefreshCoordinator = registerBrowserSessionRefreshCoordinator(refresh);
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 401 }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await apiFetch('/api/ui/session/refresh', { method: 'POST' });

    expect(response.status).toBe(401);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(refresh).not.toHaveBeenCalled();
  });

  it.each([new URL('http://localhost/api/ui/session/refresh'), new Request('http://localhost/api/ui/session/refresh')])(
    'recognizes the refresh endpoint from URL and Request inputs',
    async input => {
      const refresh = vi.fn().mockResolvedValue({ status: 'renewed' } as const);
      unregisterRefreshCoordinator = registerBrowserSessionRefreshCoordinator(refresh);
      const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 401 }));
      vi.stubGlobal('fetch', fetchMock);

      const response = await apiFetch(input, { method: 'POST' });

      expect(response.status).toBe(401);
      expect(fetchMock).toHaveBeenCalledOnce();
      expect(refresh).not.toHaveBeenCalled();
    }
  );

  it('aborts a stalled request instead of leaving consumers pending indefinitely', async () => {
    const timeout = new AbortController();
    const timeoutSpy = vi.spyOn(AbortSignal, 'timeout').mockReturnValue(timeout.signal);
    const fetchMock = pendingFetchUntilAbort();
    vi.stubGlobal('fetch', fetchMock);

    const request = apiFetch('/api/notice/templates?preset=false');

    expect(timeoutSpy).toHaveBeenCalledWith(30_000);
    expect(fetchMock.mock.calls[0]?.[1]?.signal).toBeDefined();
    timeout.abort(new DOMException('Request timed out', 'TimeoutError'));
    await expect(request).rejects.toMatchObject({ name: 'TimeoutError' });
  });

  it('preserves caller cancellation while adding the request timeout', async () => {
    const caller = new AbortController();
    const timeout = new AbortController();
    vi.spyOn(AbortSignal, 'timeout').mockReturnValue(timeout.signal);
    const fetchMock = pendingFetchUntilAbort();
    vi.stubGlobal('fetch', fetchMock);

    const request = apiFetch('/api/monitor', { signal: caller.signal });
    caller.abort(new DOMException('Caller cancelled', 'AbortError'));

    await expect(request).rejects.toMatchObject({ name: 'AbortError' });
  });
});

function pendingFetchUntilAbort() {
  return vi.fn<typeof fetch>(
    (_input, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener(
          'abort',
          () => {
            reject(abortReason(init.signal?.reason));
          },
          { once: true }
        );
      })
  );
}

function abortReason(reason: unknown) {
  if (reason instanceof Error) return reason;
  const error = new Error('Request aborted');
  if (reason && typeof reason === 'object' && 'name' in reason && typeof reason.name === 'string') {
    error.name = reason.name;
  }
  return error;
}
