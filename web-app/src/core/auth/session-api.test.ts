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

import { getSession, loginSession, logoutSession, refreshSession, SessionRequestError } from './session-api';

const authenticatedSession = {
  authenticated: true,
  username: 'operator',
  roles: ['ADMIN'],
  workspaceId: 'default',
  expiresAt: '2030-01-01T00:00:00Z'
};

describe('UI session API contract', () => {
  beforeEach(() => {
    document.cookie = 'hb_ui_csrf=csrf-proof; path=/';
  });
  afterEach(() => vi.unstubAllGlobals());

  it('uses the frozen GET, login POST, refresh POST, and logout DELETE endpoints', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(success(authenticatedSession))
      .mockResolvedValueOnce(success(authenticatedSession))
      .mockResolvedValueOnce(success(authenticatedSession))
      .mockResolvedValueOnce(success(null));
    vi.stubGlobal('fetch', fetchMock);

    await getSession();
    await loginSession('operator', 'credential-value');
    await refreshSession();
    await logoutSession();

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/ui/session',
      expect.objectContaining({ method: 'GET', credentials: 'same-origin' })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/ui/session',
      expect.objectContaining({
        method: 'POST',
        credentials: 'same-origin',
        body: JSON.stringify({ type: 0, identifier: 'operator', credential: 'credential-value' })
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      '/api/ui/session/refresh',
      expect.objectContaining({ method: 'POST', credentials: 'same-origin' })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      '/api/ui/session',
      expect.objectContaining({ method: 'DELETE', credentials: 'same-origin' })
    );
    for (const call of [fetchMock.mock.calls[2], fetchMock.mock.calls[3]]) {
      expect(new Headers(call?.[1]?.headers).get('X-HertzBeat-CSRF')).toBe('csrf-proof');
    }
    expect(fetchMock.mock.calls[1]?.[0]).not.toContain('credential-value');
  });

  it('rejects session payloads that expose tokens or violate authenticated identity', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(success({ ...authenticatedSession, token: 'must-not-cross-boundary' }))
      .mockResolvedValueOnce(success({ ...authenticatedSession, username: null }))
      .mockResolvedValueOnce(success({ ...authenticatedSession, roles: ['ADMIN', 'ADMIN'] }))
      .mockResolvedValueOnce(success({ ...authenticatedSession, expiresAt: 'not-a-timestamp' }))
      .mockResolvedValueOnce(
        success({
          authenticated: false,
          username: 'unexpected',
          roles: [],
          workspaceId: null,
          expiresAt: null
        })
      );
    vi.stubGlobal('fetch', fetchMock);

    await expect(getSession()).rejects.toMatchObject({ kind: 'contract' });
    await expect(getSession()).rejects.toMatchObject({ kind: 'contract' });
    await expect(getSession()).rejects.toMatchObject({ kind: 'contract' });
    await expect(getSession()).rejects.toMatchObject({ kind: 'contract' });
    await expect(getSession()).rejects.toMatchObject({ kind: 'contract' });
  });

  it('rejects extra envelope fields without exposing backend payload details', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            code: 0,
            msg: null,
            data: authenticatedSession,
            token: 'must-not-cross-boundary'
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ code: 0, msg: null }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    let error: unknown;
    try {
      await getSession();
    } catch (reason) {
      error = reason;
    }
    expect(error).toBeInstanceOf(SessionRequestError);
    expect(error).toMatchObject({ kind: 'contract', status: 200, cause: undefined });
    expect((error as Error).message).not.toContain('must-not-cross-boundary');
    await expect(getSession()).rejects.toMatchObject({ kind: 'contract', status: 200 });
  });

  it('classifies login rejection without exposing the raw backend message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValue(
        new Response(
          JSON.stringify({
            code: 16,
            msg: 'internal authentication detail',
            data: null
          }),
          { status: 200 }
        )
      )
    );

    let error: unknown;
    try {
      await loginSession('operator', 'bad-credential');
    } catch (reason) {
      error = reason;
    }
    expect(error).toBeInstanceOf(SessionRequestError);
    expect(error).toMatchObject({ kind: 'invalid-credentials' });
    expect((error as Error).message).not.toContain('internal authentication detail');
  });

  it('distinguishes unavailable transport from a malformed response contract', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new TypeError('network detail'))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ code: 0, data: { authenticated: false } }), {
          status: 200
        })
      );
    vi.stubGlobal('fetch', fetchMock);

    await expect(getSession()).rejects.toMatchObject({ kind: 'unavailable' });
    await expect(getSession()).rejects.toMatchObject({ kind: 'contract' });
  });
});

function success(data: unknown) {
  return new Response(JSON.stringify({ code: 0, msg: null, data }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
