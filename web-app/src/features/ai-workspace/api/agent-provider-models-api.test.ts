/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
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
import { discoverAgentProviderModels } from './agent-provider-models-api';
const input = {
  type: 'protocol',
  code: 'openai-responses',
  protocol: 'openai-responses',
  baseUrl: 'https://example.invalid/v1',
  model: ''
};
afterEach(() => vi.unstubAllGlobals());
describe('model catalog browser transport', () => {
  it('posts drafts and propagates cancellation through the authenticated API transport', async () => {
    const catalog = { status: 'ready', models: [{ id: 'one', name: 'One' }], truncated: false };
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ code: 0, data: catalog }));
    vi.stubGlobal('fetch', fetchMock);
    const abort = new AbortController();
    expect(await discoverAgentProviderModels(input, abort.signal)).toEqual(catalog);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/agent/model-providers/models',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(input),
        credentials: 'same-origin',
        signal: expect.any(AbortSignal)
      })
    );
    abort.abort();
    expect(fetchMock.mock.calls[0]?.[1].signal.aborted).toBe(true);
  });
  it('rejects malformed upstream catalogs instead of exposing arbitrary response details', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          Response.json({ code: 0, data: { status: 'ready', models: [{ name: 'missing ID' }], truncated: false } })
        )
    );
    await expect(discoverAgentProviderModels(input, new AbortController().signal)).rejects.toThrow();
  });
});
