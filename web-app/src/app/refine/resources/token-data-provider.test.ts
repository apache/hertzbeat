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

const api = vi.hoisted(() => ({
  generateToken: vi.fn(),
  loadTokens: vi.fn(),
  revokeToken: vi.fn()
}));

vi.mock('@/features/settings/token/api/token-api', () => api);

import {
  tokenDataProvider,
  tokenGenerateActionUrl,
  tokenRevokeActionUrl
} from './token-data-provider';

describe('Token Refine data provider', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns only sanitized authoritative list metadata', async () => {
    api.loadTokens.mockResolvedValue([{
      id: 7,
      name: 'Collector',
      tokenHash: 'server-hash',
      tokenMask: 'eyJh****once',
      tokenScope: 'otlp-ingest',
      unknown: 'discard'
    }]);

    await expect(tokenDataProvider.getList({ resource: 'tokens' })).resolves.toEqual({
      data: [{
        id: 7,
        name: 'Collector',
        tokenMask: 'eyJh****once',
        tokenScope: 'otlp-ingest',
        workspaceId: null,
        creator: null,
        gmtCreate: null,
        expireTime: null,
        lastUsedTime: null
      }],
      total: 1
    });
  });

  it('fails closed when list or one-time generation evidence is malformed', async () => {
    api.loadTokens.mockResolvedValue(null);
    await expect(tokenDataProvider.getList({ resource: 'tokens' }))
      .rejects.toMatchObject({ statusCode: 502, code: 'TOKEN_RESPONSE_INVALID' });

    api.generateToken.mockResolvedValue('');
    await expect(tokenDataProvider.custom?.({
      url: tokenGenerateActionUrl,
      method: 'post',
      payload: { name: 'Collector', expireSeconds: -1, scope: 'otlp-ingest' }
    })).rejects.toMatchObject({ statusCode: 502, code: 'TOKEN_RESPONSE_INVALID' });
  });

  it('restricts generation and revocation to their exact custom actions', async () => {
    api.generateToken.mockResolvedValue('hb-once');
    api.revokeToken.mockResolvedValue(undefined);

    await expect(tokenDataProvider.custom?.({
      url: tokenGenerateActionUrl,
      method: 'post',
      payload: { name: 'Collector', expireSeconds: -1, scope: 'otlp-ingest' }
    })).resolves.toEqual({ data: { id: 'generated', token: 'hb-once' } });
    await expect(tokenDataProvider.custom?.({
      url: tokenRevokeActionUrl(7),
      method: 'delete'
    })).resolves.toEqual({ data: { id: 7 } });

    expect(api.generateToken).toHaveBeenCalledWith({ name: 'Collector', expireSeconds: -1, scope: 'otlp-ingest' });
    expect(api.revokeToken).toHaveBeenCalledWith(7);
    await expect(tokenDataProvider.custom?.({ url: tokenGenerateActionUrl, method: 'delete' }))
      .rejects.toMatchObject({ statusCode: 405, code: 'TOKEN_CUSTOM_ACTION_UNSUPPORTED' });
  });

  it('rejects unsupported CRUD before transport', async () => {
    await expect(tokenDataProvider.getOne({ resource: 'tokens', id: 7 }))
      .rejects.toMatchObject({ statusCode: 405, code: 'TOKEN_GET_ONE_UNSUPPORTED' });
    await expect(tokenDataProvider.create({ resource: 'tokens', variables: {} }))
      .rejects.toMatchObject({ statusCode: 405, code: 'TOKEN_CREATE_UNSUPPORTED' });
    await expect(tokenDataProvider.update({ resource: 'tokens', id: 7, variables: {} }))
      .rejects.toMatchObject({ statusCode: 405, code: 'TOKEN_UPDATE_UNSUPPORTED' });
    await expect(tokenDataProvider.deleteOne({ resource: 'tokens', id: 7 }))
      .rejects.toMatchObject({ statusCode: 405, code: 'TOKEN_DELETE_UNSUPPORTED' });
    expect(api.loadTokens).not.toHaveBeenCalled();
    expect(api.generateToken).not.toHaveBeenCalled();
    expect(api.revokeToken).not.toHaveBeenCalled();
  });
});
