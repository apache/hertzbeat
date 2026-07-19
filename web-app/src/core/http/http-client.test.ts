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

import { apiFetch } from './http-client';

describe('apiFetch', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('refreshes and retries a read once after an unauthorized response', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(new Response('{"data":[]}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await apiFetch('/api/monitor');

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/ui/session/refresh',
      expect.objectContaining({ method: 'POST', credentials: 'same-origin' })
    );
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('never replays a mutation', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 401 }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await apiFetch('/api/monitor', { method: 'POST', body: '{}' });

    expect(response.status).toBe(401);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

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
