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
import { systemConfigTimezonesEndpoint } from '@/features/settings/system-config/api/system-config-api';
import systemConfigApiSource from '@/features/settings/system-config/api/system-config-api.ts?raw';
import systemConfigControllerSource from '@/features/settings/system-config/controller/system-config-resource-controller.ts?raw';

import systemConfigProviderSource from './system-config-data-provider.ts?raw';

type SystemConfigApi = typeof import('@/features/settings/system-config/api/system-config-api');
const api = vi.hoisted(() => ({
  loadSystemConfig: vi.fn<SystemConfigApi['loadSystemConfig']>(),
  loadTimezones: vi.fn<SystemConfigApi['loadTimezones']>(),
  saveSystemConfig: vi.fn<SystemConfigApi['saveSystemConfig']>()
}));
vi.mock('@/features/settings/system-config/api/system-config-api', async importOriginal => ({
  ...(await importOriginal<SystemConfigApi>()),
  ...api
}));

import { systemConfigDataProvider } from './system-config-data-provider';

const config = { locale: 'en_US', timeZoneId: 'UTC', theme: 'dark' };

describe('System Config Refine data provider', () => {
  beforeEach(() => vi.clearAllMocks());

  it('keeps the timezone endpoint owned by the feature API', () => {
    expect(systemConfigApiSource).toMatch(
      /export const systemConfigTimezonesEndpoint\s*=\s*['"]\/api\/config\/timezones['"]/
    );
    for (const consumerSource of [systemConfigControllerSource, systemConfigProviderSource]) {
      expect(consumerSource).toContain('systemConfigTimezonesEndpoint');
      expect(consumerSource).not.toMatch(/['"]\/api\/config\/timezones['"]/);
    }
  });

  it('reads the singleton and auxiliary timezone collection', async () => {
    api.loadSystemConfig.mockResolvedValue(config);
    api.loadTimezones.mockResolvedValue([{ zoneId: 'UTC', offset: 'UTC+00:00', displayName: 'UTC' }]);

    await expect(systemConfigDataProvider.getOne({ resource: 'system-config', id: 'current' })).resolves.toEqual({
      data: { id: 'current', ...config }
    });
    await expect(
      systemConfigDataProvider.custom?.({
        url: systemConfigTimezonesEndpoint,
        method: 'get',
        headers: {}
      })
    ).resolves.toEqual({
      data: {
        id: 'timezones',
        items: [{ zoneId: 'UTC', offset: 'UTC+00:00', displayName: 'UTC' }]
      }
    });
  });

  it('resolves update only after an authoritative canonical reread', async () => {
    const canonical = { locale: 'ja_JP', timeZoneId: 'Asia/Tokyo', theme: 'compact' };
    api.saveSystemConfig.mockResolvedValue('Update config success');
    api.loadSystemConfig.mockResolvedValue(canonical);

    await expect(
      systemConfigDataProvider.update({
        resource: 'system-config',
        id: 'current',
        variables: config
      })
    ).resolves.toEqual({ data: { id: 'current', ...canonical } });
    expect(api.saveSystemConfig.mock.invocationCallOrder[0]).toBeLessThan(
      api.loadSystemConfig.mock.invocationCallOrder[0] ?? 0
    );
  });

  it('fails closed on null or malformed canonical rereads', async () => {
    api.saveSystemConfig.mockResolvedValue('Update config success');
    api.loadSystemConfig.mockResolvedValueOnce(null).mockResolvedValueOnce({
      locale: 'private-invalid-locale',
      timeZoneId: 'UTC',
      theme: 'dark'
    });

    await expect(
      systemConfigDataProvider.update({ resource: 'system-config', id: 'current', variables: config })
    ).rejects.toMatchObject({ code: 'SYSTEM_CONFIG_CANONICAL_REREAD_MISSING' });
    let error: unknown;
    try {
      await systemConfigDataProvider.update({ resource: 'system-config', id: 'current', variables: config });
    } catch (reason) {
      error = reason;
    }
    expect(error).toMatchObject({ code: 'SYSTEM_CONFIG_RESPONSE_INVALID' });
    expect(JSON.stringify(error)).not.toContain('private-invalid-locale');
  });

  it.each([
    ['HTTP 4xx', () => new ApiMessageError('Forbidden', { status: 403 })],
    ['backend envelope', () => new ApiMessageError('Rejected', { code: 20, status: 200 })]
  ])('marks a post-write canonical %s failure as uncertainty', async (_label, failure) => {
    api.saveSystemConfig.mockResolvedValue('Update config success');
    api.loadSystemConfig.mockRejectedValue(failure());

    await expect(
      systemConfigDataProvider.update({ resource: 'system-config', id: 'current', variables: config })
    ).rejects.toMatchObject({
      statusCode: 502,
      code: 'SYSTEM_CONFIG_CANONICAL_REREAD_FAILED',
      kind: 'contract'
    });
    expect(api.saveSystemConfig).toHaveBeenCalledTimes(1);
    expect(api.loadSystemConfig).toHaveBeenCalledTimes(1);
  });
});
