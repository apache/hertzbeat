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

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock('./http-client', () => ({ apiFetch }));

import { ApiMessageError, apiMessageDelete, apiMessageGet, apiMessagePostForm, apiMessagePut } from './api-message';

describe('api message errors', () => {
  beforeEach(() => vi.clearAllMocks());

  it('preserves the backend envelope code and message', async () => {
    apiFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          code: 15,
          msg: 'Status Page Organization Not Found',
          data: null
        }),
        { status: 200 }
      )
    );

    await expect(apiMessageGet('/api/status/page/org')).rejects.toMatchObject({
      name: 'ApiMessageError',
      code: 15,
      status: 200,
      message: 'Status Page Organization Not Found'
    });
  });

  it('distinguishes HTTP and network failures from envelope failures', async () => {
    apiFetch.mockResolvedValueOnce(new Response(null, { status: 503 }));
    await expect(apiMessageGet('/api/status/page/org')).rejects.toMatchObject({
      name: 'ApiMessageError',
      code: undefined,
      status: 503
    });

    apiFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    let error: unknown;
    try {
      await apiMessageGet('/api/status/page/org');
    } catch (reason) {
      error = reason;
    }
    expect(error).toBeInstanceOf(ApiMessageError);
    expect(error).toMatchObject({
      code: undefined,
      status: undefined,
      message: 'Failed to fetch'
    });
  });

  it('preserves abort failures as the request error cause', async () => {
    const abort = new DOMException('The operation was aborted', 'AbortError');
    apiFetch.mockRejectedValueOnce(abort);

    await expect(apiMessageGet('/api/status/page/org')).rejects.toMatchObject({
      name: 'ApiMessageError',
      message: 'Request failed',
      cause: abort
    });
  });

  it('preserves conditional headers on JSON PUT and DELETE requests', async () => {
    apiFetch.mockImplementation(() => Promise.resolve(jsonResponse({ code: 0, msg: null, data: null })));

    await apiMessagePut('/conditional', { definition: 'app: custom' }, { headers: { 'If-Match': '"revision"' } });
    await apiMessageDelete('/conditional', { headers: { 'If-Match': '"revision"' } });

    const put = apiFetch.mock.calls[0]?.[1] as RequestInit;
    const remove = apiFetch.mock.calls[1]?.[1] as RequestInit;
    expect(new Headers(put.headers)).toEqual(expect.objectContaining({}));
    expect(new Headers(put.headers).get('Content-Type')).toBe('application/json');
    expect(new Headers(put.headers).get('If-Match')).toBe('"revision"');
    expect(new Headers(remove.headers).get('If-Match')).toBe('"revision"');
  });

  it('posts FormData without overriding the browser multipart boundary', async () => {
    apiFetch.mockResolvedValue(jsonResponse({ code: 0, msg: null, data: null }));
    const form = new FormData();
    form.append('name', 'audit');

    await apiMessagePostForm('/multipart', form);

    expect(apiFetch).toHaveBeenCalledWith('/multipart', expect.objectContaining({ method: 'POST', body: form }));
    const request = apiFetch.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(request.headers).has('Content-Type')).toBe(false);
  });

  it.each([
    ['invalid JSON', new Response('{"code":', { status: 200 })],
    ['non-object envelope', jsonResponse([])],
    ['missing data', jsonResponse({ code: 0, msg: null })],
    ['non-integer code', jsonResponse({ code: 0.5, msg: null, data: null })],
    ['invalid message', jsonResponse({ code: 0, msg: { token: 'secret' }, data: null })],
    ['extra sensitive field', jsonResponse({ code: 0, msg: null, data: null, token: 'secret' })]
  ])('maps %s to a redacted contract error', async (_label, response) => {
    apiFetch.mockResolvedValueOnce(response);

    let error: unknown;
    try {
      await apiMessageGet('/api/status/page/org');
    } catch (reason) {
      error = reason;
    }

    expect(error).toBeInstanceOf(ApiMessageError);
    expect(error).toMatchObject({
      code: undefined,
      status: 200,
      message: 'Invalid API response'
    });
    expect(String(error)).not.toContain('secret');
    expect((error as ApiMessageError).cause).toBeUndefined();
  });
});

function jsonResponse(value: unknown) {
  return new Response(JSON.stringify(value), { status: 200 });
}
