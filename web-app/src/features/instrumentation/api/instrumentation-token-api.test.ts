/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
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
