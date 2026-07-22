/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SessionContext, type SessionState } from '@/core/auth/session-context';
import { SessionIdentityProvider } from '@/core/auth/session-identity-provider';
import { SessionRequestError, type UiSession } from '@/core/auth/session-api';
import { buildSessionLockMarker } from '@/core/auth/session-lock-model';
import { persistSessionLockMarker, readSessionLockMarker } from '@/core/auth/session-lock-storage';

const sessionApi = vi.hoisted(() => ({ loginSession: vi.fn(), logoutSession: vi.fn() }));
const router = vi.hoisted(() => ({ navigate: vi.fn() }));
vi.mock('@/core/auth/session-api', async () => ({
  ...(await vi.importActual<typeof import('@/core/auth/session-api')>('@/core/auth/session-api')),
  loginSession: sessionApi.loginSession,
  logoutSession: sessionApi.logoutSession
}));
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => {
      const navigate = actual.useNavigate();
      return (...args: Parameters<typeof navigate>) => {
        router.navigate(...args);
        return navigate(...args);
      };
    }
  };
});

import { useSessionLockController } from './use-session-lock-controller';

const authenticated: UiSession = {
  authenticated: true,
  username: 'operator',
  roles: ['ADMIN'],
  workspaceId: 'workspace-a',
  expiresAt: null
};

describe('useSessionLockController', () => {
  let location = '';
  const replaceIdentity = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    replaceIdentity.mockReset();
    router.navigate.mockReset();
    window.sessionStorage.clear();
    persistSessionLockMarker(buildSessionLockMarker(authenticated, '/explore?signal=logs'));
    sessionApi.loginSession.mockResolvedValue(authenticated);
    sessionApi.logoutSession.mockResolvedValue(undefined);
  });
  afterEach(() => window.sessionStorage.clear());

  it('re-authenticates the current identity, rotates cache ownership, clears secrets, and replace-navigates safely', async () => {
    const { result } = renderController();
    act(() => result.current.setPassword('in-memory-password'));
    replaceIdentity.mockImplementationOnce(() => {
      expect(readSessionLockMarker()).toEqual({ kind: 'absent' });
      expect(location).toBe('/passport/lock');
    });

    await act(() => result.current.unlock());

    expect(sessionApi.loginSession).toHaveBeenCalledWith('operator', 'in-memory-password');
    expect(replaceIdentity).toHaveBeenCalledWith(authenticated);
    expect(readSessionLockMarker()).toEqual({ kind: 'absent' });
    expect(result.current.password).toBe('');
    expect(location).toBe('/explore?signal=logs');
  });

  it('rejects a returned identity mismatch without clearing the marker or rotating the cache', async () => {
    sessionApi.loginSession.mockResolvedValue({ ...authenticated, workspaceId: 'workspace-b' });
    const { result } = renderController();
    act(() => result.current.setPassword('credential'));

    await act(() => result.current.unlock());

    expect(result.current.failure).toBe('contract');
    expect(readSessionLockMarker().kind).toBe('valid');
    expect(replaceIdentity).not.toHaveBeenCalled();
    expect(location).toBe('/passport/lock');
  });

  it('admits only one same-tick command across duplicate unlock and logout submissions', async () => {
    const pending = deferred<UiSession>();
    sessionApi.loginSession.mockReturnValue(pending.promise);
    const { result } = renderController();
    act(() => result.current.setPassword('credential'));
    let first!: Promise<void>;
    let second!: Promise<void>;
    act(() => {
      first = result.current.unlock();
      second = result.current.unlock();
      void result.current.logout();
    });

    expect(sessionApi.loginSession).toHaveBeenCalledOnce();
    expect(sessionApi.logoutSession).not.toHaveBeenCalled();
    pending.resolve(authenticated);
    await act(() => Promise.all([first, second]));
  });

  it.each([
    [new SessionRequestError('invalid-credentials'), 'invalid-credentials'],
    [new SessionRequestError('unavailable'), 'unavailable'],
    [new SessionRequestError('contract'), 'contract']
  ] as const)('keeps the lock after a redacted unlock failure %#', async (error, expected) => {
    sessionApi.loginSession.mockRejectedValue(error);
    const { result } = renderController();
    act(() => result.current.setPassword('credential'));

    await act(() => result.current.unlock());

    expect(result.current.failure).toBe(expected);
    expect(readSessionLockMarker().kind).toBe('valid');
    expect(replaceIdentity).not.toHaveBeenCalled();
  });

  it('does not call login for an expired anonymous session', async () => {
    const { result } = renderController({
      session: { authenticated: false, username: null, workspaceId: null, roles: [], expiresAt: null }
    });
    act(() => result.current.setPassword('credential'));
    await act(() => result.current.unlock());

    expect(result.current.failure).toBe('session-expired');
    expect(sessionApi.loginSession).not.toHaveBeenCalled();
  });

  it('keeps the marker and identity when real server logout fails', async () => {
    sessionApi.logoutSession.mockRejectedValue(new SessionRequestError('unavailable'));
    const { result } = renderController();

    await act(() => result.current.logout());

    expect(result.current.failure).toBe('unavailable');
    expect(readSessionLockMarker().kind).toBe('valid');
    expect(replaceIdentity).not.toHaveBeenCalled();
    expect(location).toBe('/passport/lock');
  });

  it('clears the lock and password, rotates anonymous identity, and replaces to login after real logout', async () => {
    const { result } = renderController();
    act(() => result.current.setPassword('in-memory-password'));
    replaceIdentity.mockImplementationOnce(() => {
      expect(readSessionLockMarker()).toEqual({ kind: 'absent' });
      expect(location).toBe('/passport/lock');
    });

    await act(() => result.current.logout());

    expect(sessionApi.logoutSession).toHaveBeenCalledOnce();
    expect(readSessionLockMarker()).toEqual({ kind: 'absent' });
    expect(result.current.password).toBe('');
    expect(replaceIdentity).toHaveBeenCalledWith({
      authenticated: false,
      username: null,
      roles: [],
      workspaceId: null,
      expiresAt: null
    });
    expect(location).toBe('/passport/login');
  });

  it('admits only one same-tick real logout', async () => {
    const pending = deferred<void>();
    sessionApi.logoutSession.mockReturnValue(pending.promise);
    const { result } = renderController();
    let first!: Promise<void>;
    let second!: Promise<void>;
    act(() => {
      first = result.current.logout();
      second = result.current.logout();
    });

    expect(sessionApi.logoutSession).toHaveBeenCalledOnce();
    pending.resolve(undefined);
    await act(() => Promise.all([first, second]));
    expect(replaceIdentity).toHaveBeenCalledOnce();
  });

  it('keeps successful logout authoritative after unmount without invoking stale navigation', async () => {
    const pending = deferred<void>();
    sessionApi.logoutSession.mockReturnValue(pending.promise);
    const { result, unmount } = renderController();
    let logout!: Promise<void>;
    act(() => {
      logout = result.current.logout();
    });
    unmount();

    pending.resolve(undefined);
    await act(() => logout);

    expect(readSessionLockMarker()).toEqual({ kind: 'absent' });
    expect(replaceIdentity).toHaveBeenCalledWith({
      authenticated: false,
      username: null,
      roles: [],
      workspaceId: null,
      expiresAt: null
    });
    expect(router.navigate).not.toHaveBeenCalled();
  });

  function renderController(overrides: Partial<SessionState> = {}) {
    const state: SessionState = { loading: false, retry: vi.fn(), session: authenticated, ...overrides };
    return renderHook(() => useSessionLockController(), {
      wrapper: ({ children }: PropsWithChildren) => (
        <SessionIdentityProvider replaceIdentity={replaceIdentity}>
          <SessionContext.Provider value={state}>
            <MemoryRouter initialEntries={['/passport/lock']}>
              <LocationCapture />
              {children}
            </MemoryRouter>
          </SessionContext.Provider>
        </SessionIdentityProvider>
      )
    });
  }

  function LocationCapture() {
    const current = useLocation();
    location = `${current.pathname}${current.search}${current.hash}`;
    return null;
  }
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(fulfill => {
    resolve = fulfill;
  });
  return { promise, resolve };
}
