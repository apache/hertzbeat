/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const runtime = vi.hoisted(() => ({
  changeLocale: vi.fn(),
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
  useSharedTime: () => ({ headerMode: 'hidden', requestRefresh: runtime.requestRefresh })
}));

import { useShellHeaderActionController } from './use-shell-header-action-controller';

describe('useShellHeaderActionController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runtime.readLocale.mockReturnValue('en-US');
    runtime.invalidateQueries.mockResolvedValue(undefined);
    runtime.changeLocale.mockResolvedValue(undefined);
    runtime.logout.mockResolvedValue(undefined);
  });

  it('coordinates refresh, theme, language, and route actions', async () => {
    const { result } = renderHook(() => useShellHeaderActionController());

    await act(() => result.current.refresh());
    act(() => result.current.toggleTheme());
    await act(() => result.current.changeLanguage());
    await act(() => result.current.openAlerts());

    expect(runtime.requestRefresh).toHaveBeenCalledOnce();
    expect(runtime.invalidateQueries).toHaveBeenCalledWith({ type: 'active' });
    expect(runtime.setTheme).toHaveBeenCalledWith('default');
    expect(runtime.persistPreferences).toHaveBeenCalledWith({ locale: 'zh-CN', theme: 'dark' });
    expect(runtime.changeLocale).toHaveBeenCalledWith('zh-CN');
    expect(runtime.go).toHaveBeenCalledWith({ to: '/alerts', type: 'push' });
  });

  it('replaces the client identity only after logout succeeds', async () => {
    const { result } = renderHook(() => useShellHeaderActionController());

    await act(() => result.current.logout());

    expect(runtime.logout).toHaveBeenCalledOnce();
    expect(runtime.replaceIdentity).toHaveBeenCalledWith({ authenticated: false });
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
