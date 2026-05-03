// @vitest-environment jsdom

import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTranslatorMock } from '../../test/i18n-test-helper';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockState = vi.hoisted(() => ({
  routerReplace: vi.fn(),
  searchParams: new URLSearchParams()
}));

const setLocale = vi.fn(async () => {});
const t = createTranslatorMock();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mockState.routerReplace
  }),
  useSearchParams: () => ({
    get: (key: string) => mockState.searchParams.get(key)
  })
}));

vi.mock('next/image', () => ({
  default: ({ alt, src, priority: _priority, ...props }: any) => <img alt={alt} src={src} {...props} />
}));

vi.mock('../providers/i18n-provider', () => ({
  useI18n: () => ({
    t,
    locale: 'en-US',
    locales: [
      { code: 'en-US', labelKey: 'settings.system-config.locale.en_US', abbr: '🇬🇧' },
      { code: 'zh-CN', labelKey: 'settings.system-config.locale.zh_CN', abbr: '🇨🇳' },
      { code: 'ja-JP', labelKey: 'settings.system-config.locale.ja-JP', abbr: '🇯🇵' }
    ],
    setLocale
  })
}));

vi.mock('../ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>
}));

vi.mock('../ui/input', () => ({
  Input: (props: any) => <input {...props} />
}));

describe('login form submit flow', () => {
  let container: HTMLDivElement;
  let root: Root;

  async function mountForm() {
    const { LoginForm } = await import('./login-form');
    await act(async () => {
      root.render(<LoginForm />);
      await Promise.resolve();
    });
  }

  function setInputValue(index: number, value: string) {
    const input = container.querySelectorAll('input')[index] as HTMLInputElement | undefined;
    if (!input) throw new Error(`Missing input index ${index}`);
    const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
    descriptor?.set?.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    mockState.searchParams = new URLSearchParams();
    mockState.routerReplace.mockReset();
    setLocale.mockClear();
    window.localStorage.clear();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.unstubAllGlobals();
  });

  it('persists tokens, warms bootstrap config, and restores the guarded return path after login', async () => {
    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ code: 0, data: { token: 'access-token', refreshToken: 'refresh-token' } })
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ code: 0, data: { locale: 'en-US' } })
      });

    mockState.searchParams = new URLSearchParams('redirect=%2Fmonitors%3Fapp%3Dwebsite');

    await mountForm();

    await act(async () => {
      setInputValue(0, 'ops-admin');
      setInputValue(1, 'custom-secret');
      (container.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/account/auth/form',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 0, identifier: 'ops-admin', credential: 'custom-secret' })
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/config/system',
      expect.objectContaining({
        cache: 'no-store',
        headers: expect.objectContaining({
          Authorization: 'Bearer access-token'
        })
      })
    );
    expect(window.localStorage.getItem('Authorization')).toBe('access-token');
    expect(window.localStorage.getItem('refresh-token')).toBe('refresh-token');
    expect(mockState.routerReplace).toHaveBeenCalledWith('/monitors?app=website');
  }, 15000);

  it('falls back to the overview workbench when the redirect target is unsafe', async () => {
    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ code: 0, data: { token: 'access-token', refreshToken: 'refresh-token' } })
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ code: 0, data: { locale: 'en-US' } })
      });

    mockState.searchParams = new URLSearchParams('redirect=https%3A%2F%2Fevil.example');

    await mountForm();

    await act(async () => {
      setInputValue(0, 'ops-admin');
      setInputValue(1, 'custom-secret');
      (container.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockState.routerReplace).toHaveBeenCalledWith('/overview');
  }, 15000);
});
