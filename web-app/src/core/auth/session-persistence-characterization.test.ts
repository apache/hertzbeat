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

import { anonymousSession, getSession, refreshSession, type UiSession } from './session-api';
import { startForegroundSessionRevalidation } from './session-foreground-revalidation';

const renewed: UiSession = {
  authenticated: true,
  username: 'synthetic-operator',
  roles: ['ADMIN'],
  workspaceId: 'synthetic-workspace',
  expiresAt: '2030-01-01T01:00:00Z'
};

function response(data: UiSession) {
  return new Response(JSON.stringify({ code: 0, msg: null, data }), { status: 200 });
}

function fetchWithAvailableRefresh() {
  const fetchMock = vi
    .fn<typeof fetch>()
    .mockImplementation(input =>
      Promise.resolve(response(input === '/api/ui/session/refresh' ? renewed : anonymousSession))
    );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

// These tests characterize the current recovery gap, rather than claim that
// a browser's real refresh cookie was retained or that the gap is fixed.
describe('session persistence recovery characterization', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('returns anonymous on an initial read without trying the available refresh endpoint', async () => {
    const fetchMock = fetchWithAvailableRefresh();

    await expect(getSession()).resolves.toEqual(anonymousSession);

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith('/api/ui/session', expect.objectContaining({ method: 'GET' }));
  });

  it('retires a cached identity on foreground anonymous read without attempting refresh', async () => {
    const fetchMock = fetchWithAvailableRefresh();
    const cached = { ...renewed, expiresAt: '2000-01-01T00:00:00Z' };
    const replaceIdentity = vi.fn();
    const updateSession = vi.fn();
    const stop = startForegroundSessionRevalidation({
      getSnapshot: () => ({ generation: 7, session: cached }),
      replaceIdentity,
      updateSession
    });
    try {
      window.dispatchEvent(new Event('focus'));
      await vi.waitFor(() => expect(replaceIdentity).toHaveBeenCalledWith(anonymousSession));
      expect(fetchMock).toHaveBeenCalledOnce();
      expect(updateSession).not.toHaveBeenCalled();
    } finally {
      stop();
    }
  });

  it('can restore the synthetic identity when refresh is explicitly requested', async () => {
    const fetchMock = fetchWithAvailableRefresh();

    await expect(refreshSession()).resolves.toEqual(renewed);

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/ui/session/refresh',
      expect.objectContaining({ method: 'POST', credentials: 'same-origin' })
    );
  });

  it('does not publish a stale foreground read after the identity generation changes', async () => {
    let resolve!: (value: Response) => void;
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockReturnValue(
        new Promise<Response>(done => {
          resolve = done;
        })
      )
    );
    let generation = 7;
    const replaceIdentity = vi.fn();
    const updateSession = vi.fn();
    const stop = startForegroundSessionRevalidation({
      getSnapshot: () => ({ generation, session: renewed }),
      replaceIdentity,
      updateSession
    });
    try {
      window.dispatchEvent(new Event('focus'));
      await vi.waitFor(() => expect(fetch).toHaveBeenCalledOnce());
      generation = 8;
      resolve(response(anonymousSession));
      await new Promise<void>(done => setTimeout(done, 0));
      expect(replaceIdentity).not.toHaveBeenCalled();
      expect(updateSession).not.toHaveBeenCalled();
    } finally {
      stop();
    }
  });
});
