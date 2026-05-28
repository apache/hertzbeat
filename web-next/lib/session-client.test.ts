// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  HB_UI_SESSION_USER_KEY,
  clearClientSession,
  clearClientSessionUserSnapshot,
  readClientSessionUserSnapshot,
  writeClientSessionUserSnapshot
} from './session-client';

describe('session client helpers', () => {
  afterEach(() => {
    window.sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it('stores and reads the Angular-style post-login user snapshot without token material', () => {
    writeClientSessionUserSnapshot({
      name: 'ops-admin',
      avatar: './assets/img/avatar.svg',
      email: 'administrator',
      role: 'ADMIN'
    });

    expect(readClientSessionUserSnapshot()).toEqual({
      name: 'ops-admin',
      avatar: './assets/img/avatar.svg',
      email: 'administrator',
      role: 'ADMIN'
    });
    expect(window.sessionStorage.getItem(HB_UI_SESSION_USER_KEY)).not.toContain('token');
    expect(window.sessionStorage.getItem(HB_UI_SESSION_USER_KEY)).not.toContain('refresh');
  });

  it('clears stale user snapshots during logout cleanup', async () => {
    writeClientSessionUserSnapshot({
      name: 'ops-admin',
      avatar: './assets/img/avatar.svg',
      email: 'administrator'
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 200 })));

    await clearClientSession();

    expect(readClientSessionUserSnapshot()).toBeNull();
    expect(global.fetch).toHaveBeenCalledWith('/api/account/session', {
      method: 'DELETE',
      credentials: 'same-origin',
      cache: 'no-store'
    });
  });

  it('clears local session markers even when logout cleanup request fails', async () => {
    writeClientSessionUserSnapshot({
      name: 'ops-admin',
      avatar: './assets/img/avatar.svg',
      email: 'administrator'
    });
    Object.defineProperty(document, 'cookie', {
      value: 'hb_ui_session=1',
      writable: true,
      configurable: true
    });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

    await expect(clearClientSession()).rejects.toThrow('offline');

    expect(readClientSessionUserSnapshot()).toBeNull();
    expect(document.cookie).toContain('hb_ui_session=');
    expect(global.fetch).toHaveBeenCalledWith('/api/account/session', {
      method: 'DELETE',
      credentials: 'same-origin',
      cache: 'no-store'
    });
  });

  it('drops malformed user snapshots instead of crashing the shell', () => {
    window.sessionStorage.setItem(HB_UI_SESSION_USER_KEY, '{bad-json');

    expect(readClientSessionUserSnapshot()).toBeNull();

    clearClientSessionUserSnapshot();
    expect(window.sessionStorage.getItem(HB_UI_SESSION_USER_KEY)).toBeNull();
  });
});
