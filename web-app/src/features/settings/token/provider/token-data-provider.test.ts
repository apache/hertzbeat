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

import { ApiMessageError } from '@/core/http/api-message';
import { createRefineHttpError } from '@/shared/refine/refine-http-error';
import { TokenRequestFailure } from '../model/token-failure';

const api = vi.hoisted(() => ({
  generateToken: vi.fn(),
  loadTokens: vi.fn(),
  parseTokenGenerationDraft: vi.fn(
    (value: unknown) =>
      value as {
        name: string;
        expireSeconds: number;
        scope: 'api-admin' | 'otlp-ingest' | 'readonly-query';
      }
  ),
  parseTokenRevokeActionUrl: vi.fn((value: string) => (value.endsWith('/7') ? 7 : null)),
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
    api.loadTokens.mockResolvedValue([
      {
        id: 7,
        name: 'Collector',
        tokenMask: 'eyJh****once',
        tokenScope: 'otlp-ingest',
        workspaceId: null,
        creator: null,
        gmtCreate: null,
        expireTime: null,
        lastUsedTime: null
      }
    ]);

    await expect(tokenDataProvider.getList({ resource: 'tokens' })).resolves.toEqual({
      data: [expect.objectContaining({ id: 7, name: 'Collector' })],
      total: 1
    });
  });

  it('translates malformed API evidence without retaining wire values', async () => {
    api.loadTokens.mockRejectedValue(new api.TokenApiContractError('private-wire-value'));

    const promise = tokenDataProvider.getList({ resource: 'tokens' });
    await expect(promise).rejects.toMatchObject({
      code: 'TOKEN_RESPONSE_INVALID',
      kind: 'invalid',
      message: 'Token request failed',
      writeOutcome: 'uncertain'
    });
    await expect(promise).rejects.not.toMatchObject({ message: expect.stringContaining('private-wire-value') });
  });

  it('restricts generation and revocation to their exact custom actions', async () => {
    api.generateToken.mockResolvedValue({ id: 'generated', token: 'hb-once' });
    api.revokeToken.mockResolvedValue({ id: 7, status: 'deleted' });

    await expect(
      tokenDataProvider.custom?.({
        url: api.tokenGenerateActionUrl,
        method: 'post',
        payload: { name: 'Collector', expireSeconds: -1, scope: 'otlp-ingest' }
      })
    ).resolves.toEqual({ data: { id: 'generated', token: 'hb-once' } });
    await expect(
      tokenDataProvider.custom?.({
        url: '/api/account/token/7',
        method: 'delete'
      })
    ).resolves.toEqual({ data: { id: 7, status: 'deleted' } });

    expect(api.generateToken).toHaveBeenCalledWith({ name: 'Collector', expireSeconds: -1, scope: 'otlp-ingest' });
    expect(api.revokeToken).toHaveBeenCalledWith(7);
    await expect(
      tokenDataProvider.custom?.({ url: api.tokenGenerateActionUrl, method: 'delete' })
    ).rejects.toMatchObject({
      code: 'TOKEN_CUSTOM_ACTION_UNSUPPORTED',
      kind: 'invalid',
      writeOutcome: 'rejected'
    });
  });

  it('preserves a safe missing revoke result for the controller proof flow', async () => {
    api.revokeToken.mockResolvedValue({ id: 7, status: 'missing' });

    await expect(tokenDataProvider.custom?.({ url: '/api/account/token/7', method: 'delete' })).resolves.toEqual({
      data: { id: 7, status: 'missing' }
    });
  });

  it('reports malformed generation variables as a client contract error', async () => {
    api.parseTokenGenerationDraft.mockImplementationOnce(() => {
      throw new api.TokenApiContractError();
    });

    await expect(
      tokenDataProvider.custom?.({
        url: api.tokenGenerateActionUrl,
        method: 'post',
        payload: { name: '' }
      })
    ).rejects.toMatchObject({ code: 'TOKEN_VARIABLES_INVALID', kind: 'invalid', writeOutcome: 'rejected' });
    expect(api.generateToken).not.toHaveBeenCalled();
  });

  it('rejects unsupported CRUD before transport', async () => {
    await expect(tokenDataProvider.getOne({ resource: 'tokens', id: 7 })).rejects.toMatchObject({
      code: 'TOKEN_GET_ONE_UNSUPPORTED',
      kind: 'invalid',
      writeOutcome: 'rejected'
    });
    await expect(tokenDataProvider.create({ resource: 'tokens', variables: {} })).rejects.toMatchObject({
      code: 'TOKEN_CREATE_UNSUPPORTED',
      kind: 'invalid',
      writeOutcome: 'rejected'
    });
    await expect(tokenDataProvider.update({ resource: 'tokens', id: 7, variables: {} })).rejects.toMatchObject({
      code: 'TOKEN_UPDATE_UNSUPPORTED',
      kind: 'invalid',
      writeOutcome: 'rejected'
    });
    await expect(tokenDataProvider.deleteOne({ resource: 'tokens', id: 7 })).rejects.toMatchObject({
      code: 'TOKEN_DELETE_UNSUPPORTED',
      kind: 'invalid',
      writeOutcome: 'rejected'
    });
    expect(api.loadTokens).not.toHaveBeenCalled();
    expect(api.generateToken).not.toHaveBeenCalled();
    expect(api.revokeToken).not.toHaveBeenCalled();
  });

  it('normalizes raw fallback evidence with the provider operation context', async () => {
    api.loadTokens.mockRejectedValueOnce(new ApiMessageError('private-network'));
    api.generateToken.mockRejectedValueOnce(new ApiMessageError('private-business', { code: 20, status: 200 }));

    await expect(tokenDataProvider.getList({ resource: 'tokens' })).rejects.toMatchObject({
      kind: 'unavailable',
      writeOutcome: 'uncertain'
    });
    await expect(
      tokenDataProvider.custom?.({
        url: api.tokenGenerateActionUrl,
        method: 'post',
        payload: { name: 'Collector', expireSeconds: -1, scope: 'otlp-ingest' }
      })
    ).rejects.toMatchObject({ kind: 'error', writeOutcome: 'uncertain' });
  });

  it('distinguishes an HTTP rejection from an ambiguous success-envelope failure', async () => {
    api.generateToken
      .mockRejectedValueOnce(createRefineHttpError('private-envelope', 400, 20, 'envelope', 200))
      .mockRejectedValueOnce(createRefineHttpError('private-http', 400, undefined, 'http', 400))
      .mockRejectedValueOnce(createRefineHttpError('private-display-http', 400, undefined, 'http'))
      .mockRejectedValueOnce(createRefineHttpError('private-contract', 400, undefined, 'contract'))
      .mockRejectedValueOnce(createRefineHttpError('private-unexpected', 400, undefined, 'unexpected'));

    const command = {
      url: api.tokenGenerateActionUrl,
      method: 'post' as const,
      payload: { name: 'Collector', expireSeconds: -1, scope: 'otlp-ingest' as const }
    };
    await expect(tokenDataProvider.custom?.(command)).rejects.toMatchObject({
      kind: 'error',
      message: 'Token request failed',
      writeOutcome: 'uncertain'
    });
    await expect(tokenDataProvider.custom?.(command)).rejects.toMatchObject({
      kind: 'error',
      message: 'Token request failed',
      writeOutcome: 'rejected'
    });
    await expect(tokenDataProvider.custom?.(command)).rejects.toMatchObject({
      kind: 'unavailable',
      message: 'Token request failed',
      writeOutcome: 'uncertain'
    });
    await expect(tokenDataProvider.custom?.(command)).rejects.toMatchObject({
      kind: 'error',
      message: 'Token request failed',
      writeOutcome: 'uncertain'
    });
    await expect(tokenDataProvider.custom?.(command)).rejects.toMatchObject({
      kind: 'error',
      message: 'Token request failed',
      writeOutcome: 'uncertain'
    });
  });

  it('uses only source write evidence and never classifies collection reads as rejected', async () => {
    const causeBearingHttp = createRefineHttpError('private-cause-http', 400, 20, 'http', 400);
    Object.defineProperty(causeBearingHttp, 'cause', { value: new Error('private-cause') });
    api.generateToken
      .mockRejectedValueOnce(createRefineHttpError('private-timeout', 408, undefined, 'http', 408))
      .mockRejectedValueOnce(causeBearingHttp)
      .mockRejectedValueOnce(createRefineHttpError('private-status-zero', 400, undefined, 'http', 0))
      .mockRejectedValueOnce(createRefineHttpError('private-source', 400, 20, 'http', 422));
    api.loadTokens.mockRejectedValueOnce(createRefineHttpError('private-read', 400, undefined, 'http', 400));

    const command = {
      url: api.tokenGenerateActionUrl,
      method: 'post' as const,
      payload: { name: 'Collector', expireSeconds: -1, scope: 'otlp-ingest' as const }
    };
    await expect(tokenDataProvider.custom?.(command)).rejects.toMatchObject({ writeOutcome: 'uncertain' });
    await expect(tokenDataProvider.custom?.(command)).rejects.toMatchObject({ writeOutcome: 'uncertain' });
    await expect(tokenDataProvider.custom?.(command)).rejects.toMatchObject({ writeOutcome: 'uncertain' });
    await expect(tokenDataProvider.custom?.(command)).rejects.toMatchObject({ writeOutcome: 'rejected' });
    await expect(tokenDataProvider.getList({ resource: 'tokens' })).rejects.toMatchObject({
      writeOutcome: 'uncertain'
    });
  });

  it('derives unavailability only from source transport evidence', async () => {
    api.generateToken
      .mockRejectedValueOnce(createRefineHttpError('private-display', 503, undefined, 'contract'))
      .mockRejectedValueOnce(createRefineHttpError('private-envelope', 503, 20, 'envelope', 200))
      .mockRejectedValueOnce(createRefineHttpError('private-source', 400, undefined, 'http', 503));

    const command = {
      url: api.tokenGenerateActionUrl,
      method: 'post' as const,
      payload: { name: 'Collector', expireSeconds: -1, scope: 'otlp-ingest' as const }
    };
    await expect(tokenDataProvider.custom?.(command)).rejects.toMatchObject({
      kind: 'error',
      writeOutcome: 'uncertain'
    });
    await expect(tokenDataProvider.custom?.(command)).rejects.toMatchObject({
      kind: 'error',
      writeOutcome: 'uncertain'
    });
    await expect(tokenDataProvider.custom?.(command)).rejects.toMatchObject({
      kind: 'unavailable',
      writeOutcome: 'uncertain'
    });
  });

  it('preserves typed failure identity without copying private evidence', async () => {
    const failure = new TokenRequestFailure('unavailable', 'uncertain');
    api.loadTokens.mockRejectedValueOnce(failure);

    await expect(tokenDataProvider.getList({ resource: 'tokens' })).rejects.toBe(failure);
  });

  it('never leaks rejected write ownership through a collection operation', async () => {
    api.loadTokens.mockRejectedValueOnce(
      new TokenRequestFailure('error', 'rejected', { code: 'TOKEN_UPSTREAM_REJECTED' })
    );

    await expect(tokenDataProvider.getList({ resource: 'tokens' })).rejects.toMatchObject({
      code: 'TOKEN_UPSTREAM_REJECTED',
      kind: 'error',
      writeOutcome: 'uncertain'
    });
  });
});
