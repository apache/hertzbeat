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
  parseTokenGenerationDraft: vi.fn((value: unknown) => value as {
    name: string;
    expireSeconds: number;
    scope: 'api-admin' | 'otlp-ingest' | 'readonly-query';
  }),
  parseTokenRevokeActionUrl: vi.fn((value: string) => value.endsWith('/7') ? 7 : null),
  revokeToken: vi.fn(),
  TokenApiContractError: class TokenApiContractError extends Error {},
  tokenApiUrl: '/api/account/token',
  tokenGenerateActionUrl: '/api/account/token/generate'
}));

vi.mock('../api/token-api', () => api);

import { tokenDataProvider } from './token-data-provider';

describe('Token Refine data provider', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns only the records sanitized by the API boundary', async () => {
    api.loadTokens.mockResolvedValue([{
      id: 7,
      name: 'Collector',
      tokenMask: 'eyJh****once',
      tokenScope: 'otlp-ingest',
      workspaceId: null,
      creator: null,
      gmtCreate: null,
      expireTime: null,
      lastUsedTime: null
    }]);

    await expect(tokenDataProvider.getList({ resource: 'tokens' })).resolves.toEqual({
      data: [expect.objectContaining({ id: 7, name: 'Collector' })],
      total: 1
    });
  });

  it('translates malformed API evidence without retaining wire values', async () => {
    api.loadTokens.mockRejectedValue(new api.TokenApiContractError('private-wire-value'));

    const promise = tokenDataProvider.getList({ resource: 'tokens' });
    await expect(promise).rejects.toMatchObject({
      statusCode: 502,
      code: 'TOKEN_RESPONSE_INVALID',
      message: 'Token response is invalid'
    });
    await expect(promise).rejects.not.toMatchObject({ message: expect.stringContaining('private-wire-value') });
  });

  it('restricts generation and revocation to their exact custom actions', async () => {
    api.generateToken.mockResolvedValue({ id: 'generated', token: 'hb-once' });
    api.revokeToken.mockResolvedValue(undefined);

    await expect(tokenDataProvider.custom?.({
      url: api.tokenGenerateActionUrl,
      method: 'post',
      payload: { name: 'Collector', expireSeconds: -1, scope: 'otlp-ingest' }
    })).resolves.toEqual({ data: { id: 'generated', token: 'hb-once' } });
    await expect(tokenDataProvider.custom?.({
      url: '/api/account/token/7',
      method: 'delete'
    })).resolves.toEqual({ data: { id: 7 } });

    expect(api.generateToken).toHaveBeenCalledWith({ name: 'Collector', expireSeconds: -1, scope: 'otlp-ingest' });
    expect(api.revokeToken).toHaveBeenCalledWith(7);
    await expect(tokenDataProvider.custom?.({ url: api.tokenGenerateActionUrl, method: 'delete' }))
      .rejects.toMatchObject({ statusCode: 405, code: 'TOKEN_CUSTOM_ACTION_UNSUPPORTED' });
  });

  it('reports malformed generation variables as a client contract error', async () => {
    api.parseTokenGenerationDraft.mockImplementationOnce(() => {
      throw new api.TokenApiContractError();
    });

    await expect(tokenDataProvider.custom?.({
      url: api.tokenGenerateActionUrl,
      method: 'post',
      payload: { name: '' }
    })).rejects.toMatchObject({ statusCode: 400, code: 'TOKEN_VARIABLES_INVALID' });
    expect(api.generateToken).not.toHaveBeenCalled();
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
