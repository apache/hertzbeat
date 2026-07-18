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

const { apiMessageDelete, apiMessageGet, apiMessagePost } = vi.hoisted(() => ({
  apiMessageDelete: vi.fn(),
  apiMessageGet: vi.fn(),
  apiMessagePost: vi.fn()
}));

vi.mock('@/core/http/api-message', () => ({ apiMessageDelete, apiMessageGet, apiMessagePost }));

import {
  buildGenerateTokenPath,
  generateToken,
  loadTokens,
  parseTokenRevokeActionUrl,
  revokeToken
} from './token-api';
import { createTokenDraft } from '../model/token-model';

describe('token API', () => {
  beforeEach(() => vi.clearAllMocks());

  it('uses the established list, generate, and revoke endpoints', async () => {
    apiMessageGet.mockResolvedValueOnce([]);
    apiMessagePost.mockResolvedValueOnce({ token: 'hb-once' });
    apiMessageDelete.mockResolvedValueOnce(undefined);

    await expect(loadTokens()).resolves.toEqual([]);
    await expect(generateToken({ ...createTokenDraft(), name: 'collector' }))
      .resolves.toEqual({ id: 'generated', token: 'hb-once' });
    await expect(revokeToken(7)).resolves.toBeUndefined();

    expect(apiMessageGet).toHaveBeenCalledWith('/api/account/token');
    expect(apiMessagePost).toHaveBeenCalledWith('/api/account/token/generate?name=collector&expireSeconds=-1&scope=api-admin', {});
    expect(apiMessageDelete).toHaveBeenCalledWith('/api/account/token/7');
  });

  it('owns generation serialization and exact revoke endpoint recognition', () => {
    const draft = {
      ...createTokenDraft(),
      name: ' CI integration ',
      expireSeconds: 2_592_000,
      scope: 'readonly-query' as const
    };

    expect(buildGenerateTokenPath(draft))
      .toBe('/api/account/token/generate?name=CI+integration&expireSeconds=2592000&scope=readonly-query');
    expect(parseTokenRevokeActionUrl('/api/account/token/7')).toBe(7);
    expect(parseTokenRevokeActionUrl('/api/account/token/0')).toBeNull();
    expect(parseTokenRevokeActionUrl('/api/account/token/7?token=private')).toBeNull();
  });
});
