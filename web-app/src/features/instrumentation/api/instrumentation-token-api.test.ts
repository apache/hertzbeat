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

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiMessagePost } = vi.hoisted(() => ({ apiMessagePost: vi.fn() }));
vi.mock('@/core/http/api-message', async importOriginal => ({
  ...(await importOriginal<typeof import('@/core/http/api-message')>()),
  apiMessagePost
}));

import {
  buildCollectorIntakeTokenGenerationPath,
  generateCollectorIntakeAccessToken
} from './instrumentation-token-api';

describe('instrumentation Collector token API', () => {
  beforeEach(() => vi.clearAllMocks());

  it('binds token generation to the selected Collector and workspace', async () => {
    apiMessagePost.mockResolvedValueOnce({ token: 'hb-collector-once' });

    await expect(
      generateCollectorIntakeAccessToken({
        collectorId: ' edge-west ',
        workspaceId: ' default ',
        expireSeconds: 2_592_000
      })
    ).resolves.toEqual({ id: 'generated', token: 'hb-collector-once' });

    expect(apiMessagePost).toHaveBeenCalledWith(
      '/api/account/token/collector-intake/generate?collectorId=edge-west&workspaceId=default&expireSeconds=2592000',
      {}
    );
  });

  it('rejects missing identity context before transport', () => {
    expect(() =>
      buildCollectorIntakeTokenGenerationPath({ collectorId: '', workspaceId: 'default', expireSeconds: -1 })
    ).toThrow();
    expect(apiMessagePost).not.toHaveBeenCalled();
  });
});
