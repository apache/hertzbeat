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
import { systemConfigTimezonesEndpoint } from '../api/system-config-api';

type SystemConfigApi = typeof import('../api/system-config-api');
const api = vi.hoisted(() => ({
  loadSystemConfig: vi.fn<SystemConfigApi['loadSystemConfig']>(),
  loadTimezones: vi.fn<SystemConfigApi['loadTimezones']>(),
  saveSystemConfig: vi.fn<SystemConfigApi['saveSystemConfig']>()
}));
vi.mock('../api/system-config-api', async importOriginal => ({
  ...(await importOriginal<SystemConfigApi>()),
  ...api
}));

import { systemConfigDataProvider } from './system-config-data-provider';

const config = { locale: 'en_US', timeZoneId: 'UTC', theme: 'dark-ops' };

describe('System Config Refine data provider', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects an inexact timezone endpoint or HTTP verb before transport', async () => {
    const unsupportedRequests = [
      { url: `${systemConfigTimezonesEndpoint}/other`, method: 'get' as const },
      { url: systemConfigTimezonesEndpoint, method: 'post' as const }
    ];
    for (const request of unsupportedRequests) {
      await expect(systemConfigDataProvider.custom?.(request)).rejects.toMatchObject({
        code: 'SYSTEM_CONFIG_CUSTOM_UNSUPPORTED',
        statusCode: 400
      });
    }
    expect(api.loadTimezones).not.toHaveBeenCalled();
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

  it('rejects an inexact singleton resource or id before transport', async () => {
    await expect(systemConfigDataProvider.getOne({ resource: 'settings', id: 'current' })).rejects.toMatchObject({
      code: 'SYSTEM_CONFIG_RESOURCE_UNSUPPORTED',
      statusCode: 400
    });
    await expect(systemConfigDataProvider.getOne({ resource: 'system-config', id: 'other' })).rejects.toMatchObject({
      code: 'SYSTEM_CONFIG_ID_INVALID',
      statusCode: 400
    });
    expect(api.loadSystemConfig).not.toHaveBeenCalled();
  });

  it('uses the authoritative POST response directly without a redundant GET', async () => {
    const canonical = { locale: 'ja_JP', timeZoneId: 'Asia/Tokyo', theme: 'compact' };
    api.saveSystemConfig.mockResolvedValue(canonical);

    await expect(
      systemConfigDataProvider.update({
        resource: 'system-config',
        id: 'current',
        variables: config
      })
    ).resolves.toEqual({ data: { id: 'current', ...canonical } });
    expect(api.saveSystemConfig).toHaveBeenCalledTimes(1);
    expect(api.loadSystemConfig).not.toHaveBeenCalled();
  });

  it('keeps an ambiguous POST failure as mutation evidence without issuing GET', async () => {
    api.saveSystemConfig.mockRejectedValue(new ApiMessageError('Unavailable', { status: 503 }));

    await expect(
      systemConfigDataProvider.update({ resource: 'system-config', id: 'current', variables: config })
    ).rejects.toMatchObject({ statusCode: 503 });
    expect(api.loadSystemConfig).not.toHaveBeenCalled();
  });

  it('distinguishes a missing singleton from an invalid response', async () => {
    api.loadSystemConfig.mockResolvedValueOnce(null).mockResolvedValueOnce({
      locale: 'private-invalid-locale',
      timeZoneId: 'UTC',
      theme: 'dark-ops'
    });

    await expect(systemConfigDataProvider.getOne({ resource: 'system-config', id: 'current' })).rejects.toMatchObject({
      code: 'SYSTEM_CONFIG_MISSING',
      statusCode: 404
    });
    const invalid = systemConfigDataProvider.getOne({ resource: 'system-config', id: 'current' });
    await expect(invalid).rejects.toMatchObject({ code: 'SYSTEM_CONFIG_RESPONSE_INVALID', statusCode: 502 });
    await expect(invalid).rejects.not.toHaveProperty('message', expect.stringContaining('private-invalid-locale'));
  });

  it('rejects malformed write input and timezone evidence without exposing their values', async () => {
    const privateLocale = 'private-invalid-locale';
    let writeFailure: unknown;
    try {
      await systemConfigDataProvider.update({
        resource: 'system-config',
        id: 'current',
        variables: { ...config, locale: privateLocale }
      });
    } catch (reason) {
      writeFailure = reason;
    }
    expect(writeFailure).toMatchObject({ code: 'SYSTEM_CONFIG_VARIABLES_INVALID', statusCode: 400 });
    expect(JSON.stringify(writeFailure)).not.toContain(privateLocale);
    expect(api.saveSystemConfig).not.toHaveBeenCalled();

    const privateZone = 'private-zone-value';
    api.loadTimezones.mockResolvedValue([{ zoneId: privateZone, offset: '', displayName: 'Private' }]);
    let timezoneFailure: unknown;
    try {
      await systemConfigDataProvider.custom?.({ url: systemConfigTimezonesEndpoint, method: 'get' });
    } catch (reason) {
      timezoneFailure = reason;
    }
    expect(timezoneFailure).toMatchObject({ code: 'SYSTEM_TIMEZONES_RESPONSE_INVALID', statusCode: 502 });
    expect(JSON.stringify(timezoneFailure)).not.toContain(privateZone);
  });

  it('accepts only own System Config fields from mutation input', async () => {
    const inheritedConfig = Object.create(config) as typeof config;

    await expect(
      systemConfigDataProvider.update({ resource: 'system-config', id: 'current', variables: inheritedConfig })
    ).rejects.toMatchObject({ code: 'SYSTEM_CONFIG_VARIABLES_INVALID', statusCode: 400 });
    expect(api.saveSystemConfig).not.toHaveBeenCalled();
  });
});
