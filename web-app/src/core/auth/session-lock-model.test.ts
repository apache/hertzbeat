/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';

import { anonymousSession, type UiSession } from './session-api';
import {
  buildSessionLockMarker,
  resolveSessionLockAdmission,
  sessionLockFailureMessageKey
} from './session-lock-model';
import {
  clearSessionLockMarker,
  persistSessionLockMarker,
  readSessionLockMarker,
  sessionLockStorageKey
} from './session-lock-storage';

const authenticated: UiSession = {
  authenticated: true,
  username: 'operator',
  roles: ['ADMIN'],
  workspaceId: 'workspace-a',
  expiresAt: null
};

describe('session lock marker', () => {
  afterEach(() => window.sessionStorage.clear());

  it('persists only versioned identity and a sanitized local return target across reload', () => {
    const marker = buildSessionLockMarker(
      authenticated,
      '/explore?service=checkout&access_token=must-not-store#?tab=logs&client_secret=also-secret'
    );

    expect(marker).toEqual({
      version: 1,
      username: 'operator',
      workspaceId: 'workspace-a',
      returnTo: '/explore?service=checkout#?tab=logs'
    });
    expect(persistSessionLockMarker(marker)).toBe(true);
    expect(readSessionLockMarker()).toEqual({ kind: 'valid', marker });
    const stored = window.sessionStorage.getItem(sessionLockStorageKey) ?? '';
    expect(stored).not.toContain('must-not-store');
    expect(stored).not.toContain('also-secret');
    expect(stored).not.toMatch(/credential|password|token|secret/i);
  });

  it('fails closed for malformed and identity-mismatched markers until explicitly cleared', () => {
    window.sessionStorage.setItem(sessionLockStorageKey, '{not-json');
    expect(readSessionLockMarker()).toEqual({ kind: 'invalid' });
    expect(resolveSessionLockAdmission(readSessionLockMarker(), authenticated)).toEqual({ kind: 'contract' });
    expect(window.sessionStorage.getItem(sessionLockStorageKey)).toBe('{not-json');

    window.sessionStorage.setItem(
      sessionLockStorageKey,
      JSON.stringify({ version: 1, username: 'other', workspaceId: 'workspace-a', returnTo: '/dashboard' })
    );
    expect(resolveSessionLockAdmission(readSessionLockMarker(), authenticated)).toEqual({ kind: 'contract' });
    expect(clearSessionLockMarker()).toBe(true);
    expect(readSessionLockMarker()).toEqual({ kind: 'absent' });
  });

  it('distinguishes an expired anonymous session and redacts every presentation failure', () => {
    const marker = buildSessionLockMarker(authenticated, '//outside.example')!;
    expect(marker.returnTo).toBe('/dashboard');
    expect(resolveSessionLockAdmission({ kind: 'valid', marker }, anonymousSession)).toEqual({
      kind: 'session-expired'
    });
    expect(sessionLockFailureMessageKey('invalid-credentials')).toBe('auth.lock.invalidCredentials');
    expect(sessionLockFailureMessageKey('unavailable')).toBe('common.unavailable');
    expect(sessionLockFailureMessageKey('session-expired')).toBe('auth.lock.sessionExpired');
    expect(sessionLockFailureMessageKey('contract')).toBe('common.routeError.description');
  });

  it('rejects oversized or extra marker evidence instead of expanding session storage', () => {
    window.sessionStorage.setItem(
      sessionLockStorageKey,
      JSON.stringify({
        version: 1,
        username: 'operator',
        workspaceId: 'workspace-a',
        returnTo: `/explore?query=${'x'.repeat(4096)}`
      })
    );
    expect(readSessionLockMarker()).toEqual({ kind: 'invalid' });

    window.sessionStorage.setItem(
      sessionLockStorageKey,
      JSON.stringify({
        version: 1,
        username: 'operator',
        workspaceId: 'workspace-a',
        returnTo: '/dashboard',
        credential: 'forbidden'
      })
    );
    expect(readSessionLockMarker()).toEqual({ kind: 'invalid' });
  });
});
