/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiMessageGet, apiMessagePut } from '@/core/http/api-message';

import { CollectorContractError } from '../model/collector-model';
import { loadCollectorRuntimeConfig, saveCollectorRuntimeConfig } from './collector-runtime-config-api';

vi.mock('@/core/http/api-message', async importOriginal => ({
  ...(await importOriginal<typeof import('@/core/http/api-message')>()),
  apiMessageGet: vi.fn(),
  apiMessagePut: vi.fn()
}));

const get = vi.mocked(apiMessageGet);
const put = vi.mocked(apiMessagePut);

describe('Collector runtime config API', () => {
  beforeEach(() => vi.clearAllMocks());

  it('loads and saves the complete strict contract at the encoded Collector path', async () => {
    const config = runtimeConfig();
    get.mockResolvedValue(config);
    put.mockResolvedValue(config);

    await expect(loadCollectorRuntimeConfig(' edge/west ')).resolves.toEqual(config);
    await expect(saveCollectorRuntimeConfig('edge/west', config)).resolves.toEqual(config);

    expect(get).toHaveBeenCalledWith('/api/collector/edge%2Fwest/runtime-config');
    expect(put).toHaveBeenCalledWith('/api/collector/edge%2Fwest/runtime-config', config);
  });

  it('rejects invalid requests before transport and non-exact responses', async () => {
    await expect(saveCollectorRuntimeConfig('edge', { ...runtimeConfig(), revision: 0 })).rejects.toBeInstanceOf(
      CollectorContractError
    );
    expect(put).not.toHaveBeenCalled();

    get.mockResolvedValue({ ...runtimeConfig(), token: 'must-not-enter-ui' });
    await expect(loadCollectorRuntimeConfig('edge')).rejects.toBeInstanceOf(CollectorContractError);
  });

  it.each([1, 2] as const)('rejects schema %s writes before transport', async schemaVersion => {
    await expect(
      saveCollectorRuntimeConfig('edge', {
        ...runtimeConfig(),
        schemaVersion,
        environment: schemaVersion === 1 ? '' : 'production',
        hostMetricsScrapers: ['CPU', 'DISK', 'FILESYSTEM', 'LOAD', 'MEMORY', 'NETWORK', 'PAGING', 'PROCESSES']
      })
    ).rejects.toBeInstanceOf(CollectorContractError);
    expect(put).not.toHaveBeenCalled();
  });
});

function runtimeConfig() {
  return {
    schemaVersion: 3,
    revision: 8,
    hostMetricsEnabled: true,
    hostMetricsInterval: 'PT30S',
    prometheusTargets: [],
    fileLogSources: [],
    environment: 'production',
    resourceDetectors: ['ENV', 'SYSTEM'],
    telemetryFilterPresets: [],
    hostMetricsScrapers: ['CPU', 'MEMORY']
  };
}
