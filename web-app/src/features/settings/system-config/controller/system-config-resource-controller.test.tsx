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

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useSystemConfigResourceController } from './system-config-resource-controller';

const refine = vi.hoisted(() => ({
  configRefetch: vi.fn(),
  timezonesRefetch: vi.fn(),
  updateMutate: vi.fn(),
  useCustom: vi.fn(),
  useOne: vi.fn(),
  useUpdate: vi.fn()
}));
const preferences = vi.hoisted(() => ({ persist: vi.fn(), readTheme: vi.fn(() => 'dark') }));

vi.mock('@refinedev/core', () => ({
  useCustom: refine.useCustom,
  useOne: refine.useOne,
  useUpdate: refine.useUpdate
}));
vi.mock('@/core/runtime-preferences', () => ({
  persistSystemPreferences: preferences.persist,
  readRuntimeTheme: preferences.readTheme
}));
vi.mock('@/core/i18n/i18n', () => ({ resolveLocale: () => 'en-US' }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ i18n: { resolvedLanguage: 'en-US' }, t: (key: string) => key })
}));

const serverRecord = { id: 'current', locale: 'en_US', timeZoneId: 'UTC', theme: 'default' };
const timezoneRecord = {
  id: 'timezones',
  items: [{ zoneId: 'UTC', offset: 'UTC+00:00', displayName: 'UTC' }]
};

describe('System Config resource controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    refine.useOne.mockReturnValue(buildOneResult());
    refine.useCustom.mockReturnValue(buildTimezoneResult());
    refine.useUpdate.mockReturnValue({ mutate: refine.updateMutate, mutation: { isPending: false } });
  });

  it('uses the named singleton provider and custom timezone read', () => {
    const { result } = renderHook(() => useSystemConfigResourceController());

    expect(refine.useOne).toHaveBeenCalledWith(
      expect.objectContaining({
        resource: 'system-config',
        id: 'current',
        dataProviderName: 'system-config'
      })
    );
    expect(refine.useCustom).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/api/config/timezones',
        method: 'get',
        dataProviderName: 'system-config'
      })
    );
    expect(result.current.state).toMatchObject({
      kind: 'ready',
      current: { locale: 'en_US', timeZoneId: 'UTC', theme: 'dark' },
      timezoneOptions: [{ value: 'UTC', label: 'UTC (UTC+00:00) UTC' }]
    });
  });

  it.each([
    ['loading', { isPending: true }],
    ['unavailable', { isError: true, error: { statusCode: 503 }, result: undefined }],
    [
      'error',
      {
        isError: true,
        error: { statusCode: 502, code: 'SYSTEM_CONFIG_RESPONSE_INVALID' },
        result: undefined
      }
    ],
    ['error', { isError: true, error: { statusCode: 500 }, result: undefined }],
    ['error', { result: undefined }]
  ])('maps config evidence to %s', (kind, override) => {
    refine.useOne.mockReturnValue(buildOneResult(override));
    const { result } = renderHook(() => useSystemConfigResourceController());
    expect(result.current.state.kind).toBe(kind);
  });

  it('persists and reloads only the canonical successful response', () => {
    const reload = vi.fn();
    vi.stubGlobal('location', { reload });
    const { result } = renderHook(() => useSystemConfigResourceController());
    act(() => result.current.update('theme', 'compact'));
    act(() => result.current.save());
    const callbacks = refine.updateMutate.mock.calls[0]?.[1];
    const canonical = { id: 'current', locale: 'ja_JP', timeZoneId: 'Asia/Tokyo', theme: 'compact' };

    expect(preferences.persist).not.toHaveBeenCalled();
    act(() => {
      void callbacks?.onSuccess?.({ data: canonical });
    });
    expect(preferences.persist).toHaveBeenCalledWith(canonical);
    expect(reload).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });

  it('admits one save and locks edits, discard, and reloads until completion', () => {
    const { result } = renderHook(() => useSystemConfigResourceController());
    act(() => result.current.update('theme', 'compact'));

    act(() => {
      result.current.save();
      result.current.save();
      result.current.update('locale', 'ja_JP');
      result.current.discard();
      result.current.retry();
      result.current.retryTimezones();
    });

    expect(refine.updateMutate).toHaveBeenCalledTimes(1);
    expect(refine.configRefetch).not.toHaveBeenCalled();
    expect(refine.timezonesRefetch).not.toHaveBeenCalled();
    expect(result.current.state).toMatchObject({
      kind: 'ready',
      current: { locale: 'en_US', timeZoneId: 'UTC', theme: 'compact' },
      saving: true
    });
  });

  it('ignores a successful save completion after the controller unmounts', () => {
    const reload = vi.fn();
    vi.stubGlobal('location', { reload });
    const hook = renderHook(() => useSystemConfigResourceController());
    act(() => hook.result.current.update('theme', 'compact'));
    act(() => hook.result.current.save());
    const callbacks = refine.updateMutate.mock.calls[0]?.[1];

    hook.unmount();
    act(() => {
      void callbacks?.onSuccess?.({ data: serverRecord });
    });

    expect(preferences.persist).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});

function buildOneResult(override: Record<string, unknown> = {}) {
  return {
    query: { error: null, isError: false, isPending: false, refetch: refine.configRefetch, ...override },
    result: Object.hasOwn(override, 'result') ? override.result : serverRecord
  };
}

function buildTimezoneResult(override: Record<string, unknown> = {}) {
  return {
    query: { isError: false, isPending: false, refetch: refine.timezonesRefetch, ...override },
    result: { data: timezoneRecord }
  };
}
