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

import { beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest';

import type {
  SystemConfigValue as ModelSystemConfigValue,
  TimezoneOption as ModelTimezoneOption
} from '../model/system-config-contract';

const { apiMessageGet, apiMessagePost } = vi.hoisted(() => ({ apiMessageGet: vi.fn(), apiMessagePost: vi.fn() }));
vi.mock('@/core/http/api-message', () => ({ apiMessageGet, apiMessagePost }));

import {
  loadSystemConfig,
  loadTimezones,
  saveSystemConfig,
  systemConfigTimezonesEndpoint,
  type SystemConfigValue as ApiSystemConfigValue,
  type TimezoneOption as ApiTimezoneOption
} from './system-config-api';
import { SystemConfigContractError } from './system-config-schema';

describe('system configuration API', () => {
  beforeEach(() => vi.clearAllMocks());

  it('keeps its public types aligned with the model-owned contract', () => {
    expectTypeOf<ApiSystemConfigValue>().toEqualTypeOf<ModelSystemConfigValue>();
    expectTypeOf<ApiTimezoneOption>().toEqualTypeOf<ModelTimezoneOption>();
  });

  it('uses the established general configuration endpoints', async () => {
    apiMessageGet.mockResolvedValueOnce({ locale: 'en_US', timeZoneId: 'UTC', theme: 'dark' });
    apiMessageGet.mockResolvedValueOnce([{ zoneId: 'UTC', offset: 'UTC+00:00', displayName: 'UTC' }]);
    apiMessagePost.mockResolvedValueOnce('Update config success');
    const config = { locale: 'en_US' as const, timeZoneId: 'UTC', theme: 'dark' as const };
    await expect(loadSystemConfig()).resolves.toEqual(config);
    await expect(loadTimezones()).resolves.toHaveLength(1);
    await expect(saveSystemConfig(config)).resolves.toBe('Update config success');
    expect(apiMessageGet).toHaveBeenNthCalledWith(1, '/api/config/system');
    expect(apiMessageGet).toHaveBeenNthCalledWith(2, systemConfigTimezonesEndpoint);
    expect(apiMessagePost).toHaveBeenCalledWith('/api/config/system', config);
  });

  it('rejects malformed configuration responses at the domain boundary', async () => {
    apiMessageGet.mockResolvedValueOnce({ locale: 'en_US', timeZoneId: 'UTC', theme: 'dark', token: 'secret' });
    apiMessageGet.mockResolvedValueOnce([{ zoneId: 'UTC', offset: 0, displayName: 'UTC' }]);
    apiMessagePost.mockResolvedValueOnce({ message: 'not a string' });

    await expect(loadSystemConfig()).rejects.toBeInstanceOf(SystemConfigContractError);
    await expect(loadTimezones()).rejects.toBeInstanceOf(SystemConfigContractError);
    await expect(saveSystemConfig({ locale: 'en_US', timeZoneId: 'UTC', theme: 'dark' })).rejects.toBeInstanceOf(
      SystemConfigContractError
    );
  });

  it('preserves nullable configuration and applies strict timezone validation', async () => {
    apiMessageGet.mockResolvedValueOnce(null);
    apiMessageGet.mockResolvedValueOnce([{ zoneId: 'UTC', offset: 'UTC+00:00', displayName: 'UTC', internal: true }]);

    await expect(loadSystemConfig()).resolves.toBeNull();
    await expect(loadTimezones()).rejects.toBeInstanceOf(SystemConfigContractError);
  });
});
