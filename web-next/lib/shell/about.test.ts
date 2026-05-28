import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ABOUT_AUTO_SHOW_AFTER_LOGIN_KEY,
  ABOUT_NOT_SHOW_NEXT_LOGIN_KEY,
  consumeAboutAutoShowAfterLogin,
  markAboutAutoShowAfterLogin,
  readAboutNotShowNextLogin,
  writeAboutNotShowNextLogin
} from './about';

function installLocalStorageMock() {
  const storage = new Map<string, string>();
  const sessionStorage = {
    getItem: (key: string) => storage.get(`session:${key}`) ?? null,
    setItem: (key: string, value: string) => storage.set(`session:${key}`, value),
    removeItem: (key: string) => storage.delete(`session:${key}`),
    clear: () => {
      for (const key of Array.from(storage.keys())) {
        if (key.startsWith('session:')) storage.delete(key);
      }
    }
  };
  vi.stubGlobal('window', {
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
      clear: () => storage.clear()
    },
    sessionStorage
  } as any);
  vi.stubGlobal('sessionStorage', sessionStorage);
}

describe('header about modal persistence', () => {
  beforeEach(() => {
    installLocalStorageMock();
  });

  afterEach(() => {
    window.localStorage?.clear();
    vi.unstubAllGlobals();
  });

  it('keeps the Angular not-show-next-login storage key and JSON value', () => {
    expect(readAboutNotShowNextLogin()).toBe(false);
    writeAboutNotShowNextLogin(true);
    expect(window.localStorage.getItem(ABOUT_NOT_SHOW_NEXT_LOGIN_KEY)).toBe('true');
    expect(readAboutNotShowNextLogin()).toBe(true);
  });

  it('marks and consumes the one-shot post-login auto-show signal', () => {
    expect(consumeAboutAutoShowAfterLogin()).toBe(false);
    markAboutAutoShowAfterLogin();
    expect(window.sessionStorage.getItem(ABOUT_AUTO_SHOW_AFTER_LOGIN_KEY)).toBe('true');
    expect(consumeAboutAutoShowAfterLogin()).toBe(true);
    expect(window.sessionStorage.getItem(ABOUT_AUTO_SHOW_AFTER_LOGIN_KEY)).toBeNull();
    expect(consumeAboutAutoShowAfterLogin()).toBe(false);
  });

  it('treats missing browser storage as a safe no-op', () => {
    vi.stubGlobal('window', {} as any);

    expect(readAboutNotShowNextLogin()).toBe(false);
    expect(consumeAboutAutoShowAfterLogin()).toBe(false);
    expect(() => writeAboutNotShowNextLogin(true)).not.toThrow();
    expect(() => markAboutAutoShowAfterLogin()).not.toThrow();
  });
});
