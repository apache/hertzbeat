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

import { ApiMessageError } from '@/core/http/api-message';
import { createRefineHttpError, toRefineHttpError } from '@/shared/refine/refine-http-error';

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
const access = vi.hoisted(() => ({ roles: ['ADMIN'] as string[] }));
const api = vi.hoisted(() => ({ loadSystemConfig: vi.fn() }));

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
vi.mock('@/core/auth/session-context', () => ({
  useSession: () => ({ session: { roles: access.roles } })
}));
vi.mock('@/core/i18n/i18n', () => ({ resolveLocale: () => 'en-US' }));
vi.mock('../api/system-config-api', async importOriginal => ({
  ...(await importOriginal<typeof import('../api/system-config-api')>()),
  loadSystemConfig: api.loadSystemConfig
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ i18n: { resolvedLanguage: 'en-US' }, t: (key: string) => key })
}));

const serverRecord = { id: 'current', locale: 'en_US', timeZoneId: 'UTC', theme: 'dark-ops' };
const timezoneRecord = {
  id: 'timezones',
  items: [{ zoneId: 'UTC', offset: 'UTC+00:00', displayName: 'UTC' }]
};

describe('System Config resource controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    access.roles = ['ADMIN'];
    refine.configRefetch.mockReset();
    refine.updateMutate.mockReset();
    refine.configRefetch.mockResolvedValue({ data: { data: serverRecord }, error: null, isError: false });
    api.loadSystemConfig.mockResolvedValue(serverRecord);
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
      canConfigure: true,
      current: { locale: 'en_US', timeZoneId: 'UTC', theme: 'dark-ops' },
      timezoneOptions: [{ value: 'UTC', label: 'UTC (UTC+00:00) UTC' }]
    });
  });

  it.each([
    ['loading', { isPending: true }],
    ['missing', { isError: true, error: { statusCode: 404, code: 'SYSTEM_CONFIG_MISSING' }, result: undefined }],
    ['permission', { isError: true, error: { statusCode: 403 }, result: undefined }],
    ['unavailable', { isError: true, error: { statusCode: 503 }, result: undefined }],
    [
      'invalid',
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
    expect(preferences.persist).toHaveBeenCalledWith({ locale: 'en_US', theme: 'compact' });
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
      void result.current.retryRead();
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
      api.loadSystemConfig.mockResolvedValue(canonical);
      const { result } = renderHook(() => useSystemConfigResourceController());

      act(() => result.current.update('theme', 'compact'));
      act(() => result.current.save());
      const callbacks = refine.updateMutate.mock.calls[0]?.[1];
      act(() => {
        void callbacks?.onError?.(failure());
      });

      await waitFor(() => expect(api.loadSystemConfig).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
      expect(refine.updateMutate).toHaveBeenCalledTimes(1);
      expect(preferences.persist).toHaveBeenCalledWith({ locale: 'en_US', theme: 'compact' });
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
      expect(api.loadSystemConfig).not.toHaveBeenCalled();
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
    api.loadSystemConfig
      .mockRejectedValueOnce(createRefineHttpError('unavailable', 503, undefined, 'http', 503))
      .mockResolvedValueOnce(canonical);
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

    await act(async () => result.current.retrySave());

    expect(api.loadSystemConfig).toHaveBeenCalledTimes(2);
    expect(refine.updateMutate).toHaveBeenCalledTimes(1);
    expect(preferences.persist).toHaveBeenCalledWith({ locale: 'en_US', theme: 'compact' });
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('retains the submitted draft when canonical GET does not match exactly', async () => {
    const reload = vi.fn();
    vi.stubGlobal('location', { reload });
    api.loadSystemConfig.mockResolvedValue(serverRecord);
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

  it('offers the mismatching canonical proof and adopts it without replaying the write', async () => {
    const reload = vi.fn();
    vi.stubGlobal('location', { reload });
    api.loadSystemConfig.mockResolvedValue(serverRecord);
    const hook = renderHook(() => useSystemConfigResourceController());

    act(() => hook.result.current.update('theme', 'compact'));
    act(() => hook.result.current.save());
    const callbacks = refine.updateMutate.mock.calls[0]?.[1];
    act(() => void callbacks?.onError?.(createRefineHttpError('unavailable', 503, undefined, 'http', 503)));

    await waitFor(() =>
      expect(hook.result.current.state).toMatchObject({
        kind: 'ready',
        current: { theme: 'compact' },
        locked: true,
        canUseCurrentServerSettings: true,
        recovery: { phase: 'proof' }
      })
    );
    expect(refine.updateMutate).toHaveBeenCalledTimes(1);
    expect(preferences.persist).not.toHaveBeenCalled();

    act(() => hook.result.current.useCurrentServerSettings());

    expect(refine.updateMutate).toHaveBeenCalledTimes(1);
    expect(preferences.persist).toHaveBeenCalledWith({ locale: 'en_US', theme: 'dark' });
    expect(reload).toHaveBeenCalledTimes(1);
    expect(refine.notification).not.toHaveBeenCalledWith({
      message: 'systemConfig.saveSuccess',
      type: 'success'
    });
    expect(hook.result.current.state).toMatchObject({
      kind: 'ready',
      current: { theme: 'dark-ops' },
      dirty: false,
      locked: false,
      recovery: null
    });
  });

  it('keeps canonical proof locked when runtime adoption fails', async () => {
    const reload = vi.fn();
    vi.stubGlobal('location', { reload });
    preferences.persist.mockImplementationOnce(() => {
      throw new Error('storage unavailable');
    });
    api.loadSystemConfig.mockResolvedValue(serverRecord);
    const hook = renderHook(() => useSystemConfigResourceController());
    act(() => hook.result.current.update('theme', 'compact'));
    act(() => hook.result.current.save());
    const callbacks = refine.updateMutate.mock.calls[0]?.[1];
    act(() => void callbacks?.onError?.(createRefineHttpError('unavailable', 503, undefined, 'http', 503)));
    await waitFor(() => expect(hook.result.current.state).toMatchObject({ canUseCurrentServerSettings: true }));

    act(() => hook.result.current.useCurrentServerSettings());

    expect(reload).toHaveBeenCalledOnce();
    expect(refine.notification).toHaveBeenCalledWith({ message: 'systemConfig.unavailable', type: 'error' });
    expect(hook.result.current.state).toMatchObject({
      kind: 'ready',
      locked: true,
      canUseCurrentServerSettings: true,
      recovery: { phase: 'proof' }
    });
    expect(refine.updateMutate).toHaveBeenCalledOnce();
  });

  it.each([
    ['missing', () => Promise.resolve(null)],
    ['malformed', () => Promise.resolve({ locale: 'bogus' })],
    ['unavailable', () => Promise.reject(createRefineHttpError('unavailable', 503, undefined, 'http', 503))]
  ])('keeps %s proof locked without a canonical adoption action', async (_label, reread) => {
    const reload = vi.fn();
    vi.stubGlobal('location', { reload });
    api.loadSystemConfig.mockImplementationOnce(reread);
    const hook = renderHook(() => useSystemConfigResourceController());

    act(() => hook.result.current.update('theme', 'compact'));
    act(() => hook.result.current.save());
    const callbacks = refine.updateMutate.mock.calls[0]?.[1];
    act(() => void callbacks?.onError?.(createRefineHttpError('unavailable', 503, undefined, 'http', 503)));

    await waitFor(() =>
      expect(hook.result.current.state).toMatchObject({
        kind: 'ready',
        locked: true,
        canUseCurrentServerSettings: false,
        recovery: { phase: 'proof' }
      })
    );
    act(() => hook.result.current.useCurrentServerSettings());

    expect(refine.updateMutate).toHaveBeenCalledTimes(1);
    expect(preferences.persist).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
    expect(hook.result.current.state).toMatchObject({ locked: true, recovery: { phase: 'proof' } });
  });

  it('makes retained canonical adoption fail closed after role loss', async () => {
    const reload = vi.fn();
    vi.stubGlobal('location', { reload });
    api.loadSystemConfig.mockResolvedValue(serverRecord);
    const hook = renderHook(() => useSystemConfigResourceController());
    act(() => hook.result.current.update('theme', 'compact'));
    act(() => hook.result.current.save());
    const callbacks = refine.updateMutate.mock.calls[0]?.[1];
    act(() => void callbacks?.onError?.(createRefineHttpError('unavailable', 503, undefined, 'http', 503)));
    await waitFor(() => expect(hook.result.current.state).toMatchObject({ canUseCurrentServerSettings: true }));
    const retained = hook.result.current.useCurrentServerSettings;

    access.roles = ['USER'];
    act(() => hook.rerender());
    act(() => retained());

    expect(preferences.persist).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
    expect(hook.result.current.state).toMatchObject({
      canConfigure: false,
      dirty: false,
      locked: false,
      recovery: null
    });
  });

  it('rejects a retained canonical proof after a newer proof replaces its epoch', async () => {
    const reload = vi.fn();
    vi.stubGlobal('location', { reload });
    api.loadSystemConfig.mockResolvedValue(serverRecord);
    const hook = renderHook(() => useSystemConfigResourceController());
    act(() => hook.result.current.update('theme', 'compact'));
    act(() => hook.result.current.save());
    let callbacks = refine.updateMutate.mock.calls[0]?.[1];
    act(() => void callbacks?.onError?.(createRefineHttpError('unavailable', 503, undefined, 'http', 503)));
    await waitFor(() => expect(hook.result.current.state).toMatchObject({ canUseCurrentServerSettings: true }));
    const staleAdoption = hook.result.current.useCurrentServerSettings;

    access.roles = ['USER'];
    act(() => hook.rerender());
    access.roles = ['ADMIN'];
    act(() => hook.rerender());
    act(() => hook.result.current.update('locale', 'ja_JP'));
    act(() => hook.result.current.save());
    callbacks = refine.updateMutate.mock.calls[1]?.[1];
    act(() => void callbacks?.onError?.(createRefineHttpError('unavailable', 503, undefined, 'http', 503)));
    await waitFor(() => expect(hook.result.current.state).toMatchObject({ canUseCurrentServerSettings: true }));

    act(() => staleAdoption());
    expect(preferences.persist).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
    expect(hook.result.current.state).toMatchObject({ locked: true, canUseCurrentServerSettings: true });

    act(() => hook.result.current.useCurrentServerSettings());
    expect(preferences.persist).toHaveBeenCalledWith({ locale: 'en_US', theme: 'dark' });
    expect(reload).toHaveBeenCalledOnce();
    expect(refine.updateMutate).toHaveBeenCalledTimes(2);
  });

  it('makes canonical adoption inert after unmount', async () => {
    const reload = vi.fn();
    vi.stubGlobal('location', { reload });
    api.loadSystemConfig.mockResolvedValue(serverRecord);
    const hook = renderHook(() => useSystemConfigResourceController());
    act(() => hook.result.current.update('theme', 'compact'));
    act(() => hook.result.current.save());
    const callbacks = refine.updateMutate.mock.calls[0]?.[1];
    act(() => void callbacks?.onError?.(createRefineHttpError('unavailable', 503, undefined, 'http', 503)));
    await waitFor(() => expect(hook.result.current.state).toMatchObject({ canUseCurrentServerSettings: true }));
    const retained = hook.result.current.useCurrentServerSettings;

    hook.unmount();
    act(() => retained());

    expect(preferences.persist).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
  });

  it('rejects a mismatching mutation success record and retries only canonical GET', async () => {
    const canonical = { ...serverRecord, theme: 'compact' as const };
    const reload = vi.fn();
    vi.stubGlobal('location', { reload });
    api.loadSystemConfig.mockResolvedValue(canonical);
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
    expect(api.loadSystemConfig).not.toHaveBeenCalled();
    expect(preferences.persist).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
    expect(refine.notification).not.toHaveBeenCalledWith({
      message: 'systemConfig.saveSuccess',
      type: 'success'
    });
    act(() => result.current.save());
    expect(refine.updateMutate).toHaveBeenCalledTimes(1);

    await act(async () => result.current.retrySave());

    expect(api.loadSystemConfig).toHaveBeenCalledTimes(1);
    expect(refine.updateMutate).toHaveBeenCalledTimes(1);
    expect(preferences.persist).toHaveBeenCalledWith({ locale: 'en_US', theme: 'compact' });
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('retires a late canonical proof after unmount', async () => {
    const proof = deferred<typeof serverRecord>();
    const reload = vi.fn();
    vi.stubGlobal('location', { reload });
    api.loadSystemConfig.mockReturnValue(proof.promise);
    const hook = renderHook(() => useSystemConfigResourceController());

    act(() => hook.result.current.update('theme', 'compact'));
    act(() => hook.result.current.save());
    const callbacks = refine.updateMutate.mock.calls[0]?.[1];
    act(() => {
      void callbacks?.onError?.(createRefineHttpError('unavailable', 503, undefined, 'http', 503));
    });
    hook.unmount();
    proof.resolve({ ...serverRecord, theme: 'compact' });
    await act(async () => proof.promise);

    expect(preferences.persist).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
    expect(refine.notification).not.toHaveBeenCalled();
  });

  it.each([['USER'], ['GUEST']] as const)(
    'denies retained write commands for %s while preserving read retries',
    async role => {
      access.roles = [...role];
      const { result } = renderHook(() => useSystemConfigResourceController());
      const retained = {
        discard: result.current.discard,
        retrySave: result.current.retrySave,
        save: result.current.save,
        update: result.current.update
      };

      act(() => {
        retained.update('theme', 'compact');
        retained.discard();
        retained.save();
      });
      await act(async () => retained.retrySave());
      act(() => {
        void result.current.retryRead();
        result.current.retryTimezones();
      });

      expect(result.current.state).toMatchObject({
        kind: 'ready',
        canConfigure: false,
        current: { theme: 'dark-ops' }
      });
      expect(refine.updateMutate).not.toHaveBeenCalled();
      expect(api.loadSystemConfig).not.toHaveBeenCalled();
      expect(refine.configRefetch).toHaveBeenCalledTimes(1);
      expect(refine.timezonesRefetch).toHaveBeenCalledTimes(1);
    }
  );

  it('retires a draft, proof recovery, and retained commands when ADMIN loses write access', async () => {
    api.loadSystemConfig.mockRejectedValue(createRefineHttpError('unavailable', 503, undefined, 'http', 503));
    const hook = renderHook(() => useSystemConfigResourceController());
    act(() => hook.result.current.update('theme', 'compact'));
    act(() => hook.result.current.save());
    const callbacks = refine.updateMutate.mock.calls[0]?.[1];
    act(() => void callbacks?.onError?.(createRefineHttpError('unavailable', 503, undefined, 'http', 503)));
    await waitFor(() => expect(hook.result.current.state).toMatchObject({ recovery: { phase: 'proof' } }));
    const retained = hook.result.current;

    access.roles = ['USER'];
    act(() => hook.rerender());
    await act(async () => retained.retrySave());
    act(() => {
      retained.update('locale', 'ja_JP');
      retained.discard();
      retained.save();
    });

    expect(hook.result.current.state).toMatchObject({
      kind: 'ready',
      canConfigure: false,
      current: { locale: 'en_US', theme: 'dark-ops' },
      dirty: false,
      recovery: null
    });
    expect(api.loadSystemConfig).toHaveBeenCalledTimes(1);
    expect(refine.updateMutate).toHaveBeenCalledTimes(1);
  });

  it('makes a late mutation completion inert after ADMIN loses write access', () => {
    const reload = vi.fn();
    vi.stubGlobal('location', { reload });
    const hook = renderHook(() => useSystemConfigResourceController());
    act(() => hook.result.current.update('theme', 'compact'));
    act(() => hook.result.current.save());
    const callbacks = refine.updateMutate.mock.calls[0]?.[1];

    access.roles = ['GUEST'];
    act(() => hook.rerender());
    act(() => void callbacks?.onSuccess?.({ data: { ...serverRecord, theme: 'compact' } }));

    expect(preferences.persist).not.toHaveBeenCalled();
    expect(refine.notification).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
    expect(hook.result.current.state).toMatchObject({ canConfigure: false, dirty: false, recovery: null });
  });

  it('makes a late proof completion inert after ADMIN loses write access', async () => {
    const proof = deferred<typeof serverRecord>();
    const reload = vi.fn();
    vi.stubGlobal('location', { reload });
    api.loadSystemConfig.mockReturnValue(proof.promise);
    const hook = renderHook(() => useSystemConfigResourceController());
    act(() => hook.result.current.update('theme', 'compact'));
    act(() => hook.result.current.save());
    const callbacks = refine.updateMutate.mock.calls[0]?.[1];
    act(() => void callbacks?.onError?.(createRefineHttpError('unavailable', 503, undefined, 'http', 503)));
    await waitFor(() => expect(api.loadSystemConfig).toHaveBeenCalledTimes(1));

    access.roles = ['USER'];
    act(() => hook.rerender());
    proof.resolve({ ...serverRecord, theme: 'compact' });
    await act(async () => proof.promise);

    expect(preferences.persist).not.toHaveBeenCalled();
    expect(refine.notification).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
    expect(hook.result.current.state).toMatchObject({
      canConfigure: false,
      current: { theme: 'dark-ops' },
      dirty: false,
      recovery: null
    });
  });

  it('maps an authoritative light server theme to the browser runtime theme', () => {
    const reload = vi.fn();
    vi.stubGlobal('location', { reload });
    const hook = renderHook(() => useSystemConfigResourceController());
    act(() => hook.result.current.update('theme', 'light-ops'));
    act(() => hook.result.current.save());
    const callbacks = refine.updateMutate.mock.calls[0]?.[1];
    act(() => void callbacks?.onSuccess?.({ data: { ...serverRecord, theme: 'light-ops' } }));

    expect(preferences.persist).toHaveBeenCalledWith({ locale: 'en_US', theme: 'default' });
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
  ['HTTP 408', () => createRefineHttpError('timeout', 408, undefined, 'http', 408)],
  [
    'direct cause-bearing HTTP 4xx',
    () =>
      Object.assign(createRefineHttpError('private', 422, undefined, 'http', 422), {
        cause: new TypeError('private-system-config-cause')
      })
  ],
  [
    'cause-bearing HTTP 4xx',
    () =>
      toRefineHttpError(
        new ApiMessageError('private-system-config-message', {
          status: 422,
          cause: new TypeError('private-system-config-cause')
        })
      )
  ],
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
