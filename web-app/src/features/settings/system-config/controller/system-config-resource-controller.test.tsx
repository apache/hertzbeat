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

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createRefineHttpError } from '@/shared/refine/refine-http-error';

import { systemConfigTimezonesEndpoint } from '../api/system-config-api';
import { useSystemConfigResourceController } from './system-config-resource-controller';

const refine = vi.hoisted(() => ({
  configRefetch: vi.fn(),
  notification: vi.fn(),
  timezonesRefetch: vi.fn(),
  updateMutate: vi.fn(),
  useCustom: vi.fn(),
  useNotification: vi.fn(),
  useOne: vi.fn(),
  useUpdate: vi.fn()
}));
const preferences = vi.hoisted(() => ({ persist: vi.fn(), readTheme: vi.fn(() => 'dark') }));

vi.mock('@refinedev/core', () => ({
  useCustom: refine.useCustom,
  useNotification: refine.useNotification,
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
    refine.configRefetch.mockReset();
    refine.updateMutate.mockReset();
    refine.configRefetch.mockResolvedValue({ data: { data: serverRecord }, error: null, isError: false });
    refine.useOne.mockReturnValue(buildOneResult());
    refine.useCustom.mockReturnValue(buildTimezoneResult());
    refine.useNotification.mockReturnValue({ open: refine.notification });
    refine.useUpdate.mockReturnValue({ mutate: refine.updateMutate, mutation: { isPending: false } });
  });
  afterEach(() => vi.unstubAllGlobals());

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
        url: systemConfigTimezonesEndpoint,
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
    const canonical = { id: 'current', locale: 'en_US', timeZoneId: 'UTC', theme: 'compact' };

    expect(preferences.persist).not.toHaveBeenCalled();
    act(() => {
      void callbacks?.onSuccess?.({ data: canonical });
    });
    expect(preferences.persist).toHaveBeenCalledWith(canonical);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(refine.notification).toHaveBeenCalledWith({ message: 'systemConfig.saveSuccess', type: 'success' });
  });

  it('releases the confirmed command and reloads when browser preference persistence fails', async () => {
    const reload = vi.fn();
    vi.stubGlobal('location', { reload });
    preferences.persist.mockImplementationOnce(() => {
      throw new Error('storage unavailable');
    });
    const { result } = renderHook(() => useSystemConfigResourceController());

    act(() => result.current.update('theme', 'compact'));
    act(() => result.current.save());
    const callbacks = refine.updateMutate.mock.calls[0]?.[1];
    act(() => {
      void callbacks?.onSuccess?.({ data: { ...serverRecord, theme: 'compact' } });
    });

    await waitFor(() => expect(result.current.state).toMatchObject({ kind: 'ready', dirty: false, locked: false }));
    expect(reload).toHaveBeenCalledTimes(1);
    expect(refine.notification).toHaveBeenCalledWith({ message: 'systemConfig.unavailable', type: 'error' });
  });

  it('admits one save and locks edits, discard, and reloads until completion', () => {
    const { result } = renderHook(() => useSystemConfigResourceController());
    act(() => result.current.update('theme', 'compact'));

    act(() => {
      result.current.save();
      result.current.save();
      result.current.update('locale', 'ja_JP');
      result.current.discard();
      void result.current.retry();
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
  });

  it.each(ambiguousWriteFailures)(
    'proves an ambiguous %s save by canonical GET without repeating POST',
    async (_label, failure) => {
      const canonical = { ...serverRecord, theme: 'compact' as const };
      const reload = vi.fn();
      vi.stubGlobal('location', { reload });
      refine.configRefetch.mockResolvedValue({ data: { data: canonical }, error: null, isError: false });
      const { result } = renderHook(() => useSystemConfigResourceController());

      act(() => result.current.update('theme', 'compact'));
      act(() => result.current.save());
      const callbacks = refine.updateMutate.mock.calls[0]?.[1];
      act(() => {
        void callbacks?.onError?.(failure());
      });

      await waitFor(() => expect(refine.configRefetch).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
      expect(refine.updateMutate).toHaveBeenCalledTimes(1);
      expect(preferences.persist).toHaveBeenCalledWith(canonical);
      expect(refine.notification).toHaveBeenCalledWith({ message: 'systemConfig.saveSuccess', type: 'success' });
    }
  );

  it.each(definiteWriteRejections)(
    'unlocks a corrected retry after a definite %s rejection',
    async (_label, failure) => {
      const { result } = renderHook(() => useSystemConfigResourceController());

      act(() => result.current.update('theme', 'compact'));
      act(() => result.current.save());
      const callbacks = refine.updateMutate.mock.calls[0]?.[1];
      act(() => {
        void callbacks?.onError?.(failure());
      });

      await waitFor(() => expect(result.current.state).toMatchObject({ kind: 'ready', locked: false, recovery: null }));
      expect(refine.configRefetch).not.toHaveBeenCalled();
      expect(refine.notification).toHaveBeenCalledWith({ message: 'systemConfig.saveFailed', type: 'error' });
      act(() => result.current.update('locale', 'ja_JP'));
      act(() => result.current.save());
      expect(refine.updateMutate).toHaveBeenCalledTimes(2);
      expect(refine.updateMutate.mock.calls[1]?.[0]).toMatchObject({ values: { locale: 'ja_JP', theme: 'compact' } });
    }
  );

  it('retains proof recovery and retries GET without repeating an ambiguous write', async () => {
    const canonical = { ...serverRecord, theme: 'compact' as const };
    const reload = vi.fn();
    vi.stubGlobal('location', { reload });
    refine.configRefetch
      .mockResolvedValueOnce({ data: undefined, error: { statusCode: 503 }, isError: true })
      .mockResolvedValueOnce({ data: { data: canonical }, error: null, isError: false });
    const { result } = renderHook(() => useSystemConfigResourceController());

    act(() => result.current.update('theme', 'compact'));
    act(() => result.current.save());
    const callbacks = refine.updateMutate.mock.calls[0]?.[1];
    act(() => {
      void callbacks?.onError?.(createRefineHttpError('unavailable', 503, undefined, 'http', 503));
    });

    await waitFor(() =>
      expect(result.current.state).toMatchObject({ kind: 'ready', locked: true, recovery: { phase: 'proof' } })
    );
    act(() => {
      result.current.save();
      result.current.update('locale', 'ja_JP');
      result.current.discard();
      result.current.retryTimezones();
    });
    expect(refine.updateMutate).toHaveBeenCalledTimes(1);
    expect(refine.timezonesRefetch).not.toHaveBeenCalled();

    await act(async () => result.current.retry());

    expect(refine.configRefetch).toHaveBeenCalledTimes(2);
    expect(refine.updateMutate).toHaveBeenCalledTimes(1);
    expect(preferences.persist).toHaveBeenCalledWith(canonical);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('retains the submitted draft when canonical GET does not match exactly', async () => {
    const reload = vi.fn();
    vi.stubGlobal('location', { reload });
    refine.configRefetch.mockResolvedValue({ data: { data: serverRecord }, error: null, isError: false });
    const hook = renderHook(() => useSystemConfigResourceController());

    act(() => hook.result.current.update('theme', 'compact'));
    act(() => hook.result.current.save());
    const callbacks = refine.updateMutate.mock.calls[0]?.[1];
    act(() => {
      void callbacks?.onError?.(createRefineHttpError('unavailable', 503, undefined, 'http', 503));
    });

    await waitFor(() =>
      expect(hook.result.current.state).toMatchObject({
        kind: 'ready',
        current: { theme: 'compact' },
        locked: true,
        recovery: { phase: 'proof' }
      })
    );
    refine.useOne.mockReturnValue(buildOneResult({ isError: true, error: { statusCode: 503 }, result: undefined }));
    hook.rerender();

    expect(hook.result.current.state).toMatchObject({
      kind: 'ready',
      current: { theme: 'compact' },
      locked: true,
      recovery: { phase: 'proof' }
    });
    expect(preferences.persist).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
    expect(refine.updateMutate).toHaveBeenCalledTimes(1);
  });

  it('rejects a mismatching mutation success record and retries only canonical GET', async () => {
    const canonical = { ...serverRecord, theme: 'compact' as const };
    const reload = vi.fn();
    vi.stubGlobal('location', { reload });
    refine.configRefetch.mockResolvedValue({ data: { data: canonical }, error: null, isError: false });
    const { result } = renderHook(() => useSystemConfigResourceController());

    act(() => result.current.update('theme', 'compact'));
    act(() => result.current.save());
    const callbacks = refine.updateMutate.mock.calls[0]?.[1];
    act(() => {
      void callbacks?.onSuccess?.({ data: serverRecord });
    });

    await waitFor(() =>
      expect(result.current.state).toMatchObject({
        kind: 'ready',
        current: { theme: 'compact' },
        locked: true,
        recovery: { phase: 'proof' }
      })
    );
    expect(refine.configRefetch).not.toHaveBeenCalled();
    expect(preferences.persist).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
    expect(refine.notification).not.toHaveBeenCalledWith({
      message: 'systemConfig.saveSuccess',
      type: 'success'
    });
    act(() => result.current.save());
    expect(refine.updateMutate).toHaveBeenCalledTimes(1);

    await act(async () => result.current.retry());

    expect(refine.configRefetch).toHaveBeenCalledTimes(1);
    expect(refine.updateMutate).toHaveBeenCalledTimes(1);
    expect(preferences.persist).toHaveBeenCalledWith(canonical);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('retires a late canonical proof after unmount', async () => {
    const proof = deferred<{ data: { data: typeof serverRecord }; error: null; isError: false }>();
    const reload = vi.fn();
    vi.stubGlobal('location', { reload });
    refine.configRefetch.mockReturnValue(proof.promise);
    const hook = renderHook(() => useSystemConfigResourceController());

    act(() => hook.result.current.update('theme', 'compact'));
    act(() => hook.result.current.save());
    const callbacks = refine.updateMutate.mock.calls[0]?.[1];
    act(() => {
      void callbacks?.onError?.(createRefineHttpError('unavailable', 503, undefined, 'http', 503));
    });
    hook.unmount();
    proof.resolve({ data: { data: { ...serverRecord, theme: 'compact' } }, error: null, isError: false });
    await act(async () => proof.promise);

    expect(preferences.persist).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
    expect(refine.notification).not.toHaveBeenCalled();
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

const ambiguousWriteFailures = [
  ['network', () => createRefineHttpError('network', 0, 'NETWORK_REQUEST_FAILED', 'network')],
  ['HTTP 5xx', () => createRefineHttpError('unavailable', 503, undefined, 'http', 503)],
  ['business envelope', () => createRefineHttpError('rejected', 400, 20, 'envelope', 200)],
  ['malformed success', () => createRefineHttpError('malformed', 502, 'SYSTEM_CONFIG_RESPONSE_INVALID', 'contract')]
] as const;

const definiteWriteRejections = [
  ['HTTP 4xx', () => createRefineHttpError('rejected', 422, undefined, 'http', 422)]
] as const;

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => {
    resolve = done;
  });
  return { promise, resolve };
}
