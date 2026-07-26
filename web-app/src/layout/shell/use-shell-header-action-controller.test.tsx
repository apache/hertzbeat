/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { sessionLockStorageKey } from '@/core/auth/session-lock-storage';

const runtime = vi.hoisted(() => ({
  changeLocale: vi.fn<(locale: string, options?: { signal?: AbortSignal }) => Promise<boolean>>(),
  fullscreenToggle: vi.fn(),
  go: vi.fn(),
  invalidateQueries: vi.fn(),
  logout: vi.fn(),
  messageError: vi.fn(),
  persistPreferences: vi.fn(),
  readLocale: vi.fn(),
  replaceIdentity: vi.fn(),
  requestRefresh: vi.fn(),
  setTheme: vi.fn()
}));

vi.mock('@refinedev/core', () => ({ useGo: () => runtime.go }));
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: runtime.invalidateQueries })
}));
vi.mock('antd', () => ({ App: { useApp: () => ({ message: { error: runtime.messageError } }) } }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { resolvedLanguage: 'en-US' } })
}));
vi.mock('@/core/auth/session-api', () => ({
  anonymousSession: { authenticated: false },
  logoutSession: runtime.logout
}));
vi.mock('@/core/auth/session-identity-context', () => ({
  useSessionIdentityBoundary: () => runtime.replaceIdentity
}));
vi.mock('@/core/i18n/i18n', () => ({
  loadLocale: runtime.changeLocale,
  resolveLocale: () => 'en-US'
}));
vi.mock('@/core/runtime-preferences', () => ({
  persistSystemPreferences: runtime.persistPreferences,
  readRuntimeLocale: runtime.readLocale
}));
vi.mock('@/core/runtime-theme-context', () => ({
  useRuntimeTheme: () => ({ theme: 'dark', setTheme: runtime.setTheme })
}));
vi.mock('@/shared/time', () => ({
  useSharedTime: () => ({
    headerMode: 'hidden',
    manualRefreshOwner: 'active_queries',
    requestRefresh: runtime.requestRefresh
  })
}));
vi.mock('@/shared/navigation/app-paths', () => ({
  alertRoutePaths: { center: '/canonical-alerts' },
  applicationRoutePaths: { lock: '/passport/lock' }
}));
vi.mock('@/shared/settings/settings-routes', () => ({
  settingsPaths: { system: '/canonical-settings' }
}));
vi.mock('./use-shell-fullscreen-action', () => ({
  useShellFullscreenAction: () => ({
    state: { available: true, active: false, busy: false },
    toggle: runtime.fullscreenToggle
  })
}));

import { useShellHeaderActionController } from './use-shell-header-action-controller';

describe('useShellHeaderActionController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
    runtime.readLocale.mockReturnValue('en-US');
    runtime.invalidateQueries.mockResolvedValue(undefined);
    runtime.changeLocale.mockResolvedValue(true);
    runtime.fullscreenToggle.mockResolvedValue('changed');
    runtime.logout.mockResolvedValue(undefined);
  });

  it('coordinates refresh, theme, language, and route actions', async () => {
    const { result } = renderHook(() => useShellHeaderActionController());

    await act(() => result.current.refresh());
    act(() => result.current.toggleTheme());
    await act(() => result.current.changeLanguage());
    await act(() => result.current.openAlerts());
    await act(() => result.current.openSettings());

    expect(runtime.requestRefresh).not.toHaveBeenCalled();
    expect(runtime.invalidateQueries).toHaveBeenCalledWith({ type: 'active' });
    expect(runtime.setTheme).toHaveBeenCalledWith('default');
    expect(runtime.persistPreferences).toHaveBeenCalledWith({ locale: 'zh-CN', theme: 'dark' });
    expect(runtime.changeLocale).toHaveBeenCalledWith('zh-CN', { signal: expect.any(AbortSignal) });
    expect(runtime.go).toHaveBeenCalledWith({ to: '/canonical-alerts', type: 'push' });
    expect(runtime.go).toHaveBeenCalledWith({ to: '/canonical-settings', type: 'push' });
  });

  it('reports a safe localized failure when the browser rejects full screen', async () => {
    runtime.fullscreenToggle.mockResolvedValueOnce('error');
    const { result } = renderHook(() => useShellHeaderActionController());

    await act(() => result.current.toggleFullscreen());

    expect(runtime.messageError).toHaveBeenCalledOnce();
    expect(runtime.messageError).toHaveBeenCalledWith('shell.actions.fullscreenFailed');
  });

  it('publishes and persists only the latest rapid locale selection', async () => {
    let storedLocale = 'en-US';
    let publishedLocale = 'en-US';
    const older = deferred<void>();
    runtime.readLocale.mockImplementation(() => storedLocale);
    runtime.persistPreferences.mockImplementation(({ locale }: { locale: string }) => {
      storedLocale = locale;
    });
    runtime.changeLocale
      .mockImplementationOnce(async (locale: string, options?: { signal?: AbortSignal }) => {
        await older.promise;
        if (options?.signal?.aborted) return false;
        publishedLocale = locale;
        return true;
      })
      .mockImplementationOnce((locale: string, options?: { signal?: AbortSignal }) => {
        if (options?.signal?.aborted) return Promise.resolve(false);
        publishedLocale = locale;
        return Promise.resolve(true);
      });
    const { result } = renderHook(() => useShellHeaderActionController());

    let first!: Promise<boolean>;
    let second!: Promise<boolean>;
    act(() => {
      first = result.current.changeLanguage();
      second = result.current.changeLanguage();
    });

    await expect(second).resolves.toBe(true);
    expect(publishedLocale).toBe('zh-TW');
    expect(storedLocale).toBe('zh-TW');
    expect(runtime.persistPreferences).toHaveBeenCalledTimes(1);

    older.resolve();
    await expect(first).resolves.toBe(false);
    expect(publishedLocale).toBe('zh-TW');
    expect(storedLocale).toBe('zh-TW');
    expect(runtime.persistPreferences).toHaveBeenCalledTimes(1);
  });

  it('does not publish or persist a locale after the controller unmounts', async () => {
    const pending = deferred<void>();
    let published = false;
    runtime.changeLocale.mockImplementationOnce(async (_locale: string, options?: { signal?: AbortSignal }) => {
      await pending.promise;
      if (options?.signal?.aborted) return false;
      published = true;
      return true;
    });
    const { result, unmount } = renderHook(() => useShellHeaderActionController());

    const command = result.current.changeLanguage();
    unmount();
    pending.resolve();

    await expect(command).resolves.toBe(false);
    expect(published).toBe(false);
    expect(runtime.persistPreferences).not.toHaveBeenCalled();
  });

  it('ignores an older locale failure after a newer selection succeeds', async () => {
    const older = deferred<void>();
    runtime.changeLocale
      .mockImplementationOnce(async () => {
        await older.promise;
        throw new Error('stale locale failure');
      })
      .mockResolvedValueOnce(true);
    const { result } = renderHook(() => useShellHeaderActionController());

    const first = result.current.changeLanguage();
    const second = result.current.changeLanguage();
    await expect(second).resolves.toBe(true);
    older.resolve();

    await expect(first).resolves.toBe(false);
    expect(runtime.persistPreferences).toHaveBeenCalledTimes(1);
    expect(runtime.persistPreferences).toHaveBeenLastCalledWith({ locale: 'zh-TW', theme: 'dark' });
  });

  it('does not persist a current locale failure and retries the same selection', async () => {
    runtime.changeLocale.mockRejectedValueOnce(new Error('current locale failure')).mockResolvedValueOnce(true);
    const { result } = renderHook(() => useShellHeaderActionController());

    await expect(result.current.changeLanguage()).resolves.toBe(false);
    expect(runtime.persistPreferences).not.toHaveBeenCalled();

    await expect(result.current.changeLanguage()).resolves.toBe(true);
    expect(runtime.changeLocale).toHaveBeenNthCalledWith(2, 'zh-CN', { signal: expect.any(AbortSignal) });
    expect(runtime.persistPreferences).toHaveBeenCalledOnce();
    expect(runtime.persistPreferences).toHaveBeenCalledWith({ locale: 'zh-CN', theme: 'dark' });
  });

  it('replaces the client identity only after logout succeeds', async () => {
    const { result } = renderHook(() => useShellHeaderActionController());

    await act(() => result.current.logout());

    expect(runtime.logout).toHaveBeenCalledOnce();
    expect(runtime.replaceIdentity).toHaveBeenCalledWith({ authenticated: false });
  });

  it('synchronously admits a lock with only the current identity and sanitized return target', () => {
    const { result } = renderHook(() => useShellHeaderActionController());

    expect(
      result.current.lock(
        {
          authenticated: true,
          username: 'operator',
          workspaceId: 'workspace-a',
          roles: ['ADMIN'],
          expiresAt: null
        },
        '/explore?signal=logs&access_token=must-not-store'
      )
    ).toBe(true);

    expect(runtime.go).toHaveBeenCalledWith({ to: '/passport/lock', type: 'replace' });
    const stored = window.sessionStorage.getItem(sessionLockStorageKey) ?? '';
    expect(stored).toContain('"username":"operator"');
    expect(stored).toContain('"returnTo":"/explore?signal=logs"');
    expect(stored).not.toContain('must-not-store');
  });

  it('admits only one logout when triggered twice in the same tick', async () => {
    const pending = deferred<void>();
    runtime.logout.mockReturnValue(pending.promise);
    const { result } = renderHook(() => useShellHeaderActionController());

    let first: Promise<void>;
    let second: Promise<void>;
    act(() => {
      first = result.current.logout();
      second = result.current.logout();
    });

    expect(runtime.logout).toHaveBeenCalledOnce();
    expect(result.current.loggingOut).toBe(true);

    pending.resolve();
    await act(async () => Promise.all([first!, second!]));
    expect(runtime.replaceIdentity).toHaveBeenCalledOnce();
  });

  it('retires a failed logout so retry succeeds without duplicating the failure message', async () => {
    runtime.logout.mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce(undefined);
    const { result } = renderHook(() => useShellHeaderActionController());

    await act(() => result.current.logout());

    expect(result.current.loggingOut).toBe(false);
    expect(runtime.messageError).toHaveBeenCalledOnce();
    expect(runtime.replaceIdentity).not.toHaveBeenCalled();

    await act(() => result.current.logout());

    expect(runtime.logout).toHaveBeenCalledTimes(2);
    expect(runtime.messageError).toHaveBeenCalledOnce();
    expect(runtime.replaceIdentity).toHaveBeenCalledWith({ authenticated: false });
  });

  it('ignores a stale logout failure after the controller unmounts', async () => {
    const pending = deferred<void>();
    runtime.logout.mockReturnValue(pending.promise);
    const { result, unmount } = renderHook(() => useShellHeaderActionController());

    let command: Promise<void>;
    act(() => {
      command = result.current.logout();
    });
    unmount();
    pending.reject(new Error('late failure'));
    await act(async () => command!);

    expect(runtime.messageError).not.toHaveBeenCalled();
    expect(runtime.replaceIdentity).not.toHaveBeenCalled();
  });

  it('still rotates identity when a successful logout finishes after unmount', async () => {
    const pending = deferred<void>();
    runtime.logout.mockReturnValue(pending.promise);
    const { result, unmount } = renderHook(() => useShellHeaderActionController());

    let command: Promise<void>;
    act(() => {
      command = result.current.logout();
    });
    unmount();
    pending.resolve();
    await act(async () => command!);

    expect(runtime.replaceIdentity).toHaveBeenCalledWith({ authenticated: false });
    expect(runtime.messageError).not.toHaveBeenCalled();
  });
});

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((fulfill, fail) => {
    resolve = fulfill;
    reject = fail;
  });
  return { promise, reject, resolve };
}
