// @vitest-environment jsdom

import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTranslatorMock } from '../../test/i18n-test-helper';
import type { PassportLoginRouteState } from '../../lib/passport-login/controller';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockState = vi.hoisted(() => ({
  resetWorkbenchLoadCache: vi.fn(),
  routerReplace: vi.fn()
}));

const setLocale = vi.fn(async () => {});
const t = createTranslatorMock();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mockState.routerReplace
  })
}));

vi.mock('next/image', () => ({
  default: ({ alt, src, priority: _priority, ...props }: any) => React.createElement('img', { alt, src, ...props })
}));

vi.mock('../providers/i18n-provider', () => ({
  useI18n: () => ({
    t,
    locale: 'en-US',
    locales: [
      { code: 'en-US', labelKey: 'settings.system-config.locale.en_US', abbr: 'gb' },
      { code: 'zh-CN', labelKey: 'settings.system-config.locale.zh_CN', abbr: 'cn' },
      { code: 'ja-JP', labelKey: 'settings.system-config.locale.ja-JP', abbr: 'jp' }
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

vi.mock('../../lib/workbench-load-cache', () => ({
  resetWorkbenchLoadCache: mockState.resetWorkbenchLoadCache
}));

describe('login form submit copy', () => {
  let container: HTMLDivElement;
  let root: Root;

  async function mountForm(initialRouteState: PassportLoginRouteState = { redirectTarget: '/' }) {
    const { LoginForm } = await import('./login-form');
    await act(async () => {
      root.render(<LoginForm initialRouteState={initialRouteState} />);
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

  async function flushAsyncWork(turns = 8) {
    for (let index = 0; index < turns; index += 1) {
      await Promise.resolve();
    }
  }

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    mockState.resetWorkbenchLoadCache.mockReset();
    mockState.routerReplace.mockReset();
    setLocale.mockClear();
    window.localStorage.clear();
    window.sessionStorage.clear();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.unstubAllGlobals();
  });

  it('uses the BFF cookie session without writing access or refresh tokens to localStorage', async () => {
    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ code: 0, data: { authenticated: true, tokenBoundary: 'bff-cookie', role: 'ADMIN' } })
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ code: 0, data: { locale: 'zh_CN' } })
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ code: 0, data: [] })
      });

    await mountForm({ redirectTarget: '/monitors?app=website' });

    expect(container.querySelector('[data-hz-ui="passport-login-action-frame"]')).not.toBeNull();
    expect(container.querySelector('[data-hz-passport-login-submit-lifecycle="angular-required-default-warning-session-bootstrap-redirect"]')).not.toBeNull();
    expect(container.querySelector('[data-hz-passport-login-token-boundary="bff-cookie-no-localstorage"]')).not.toBeNull();
    expect(container.querySelector('[data-hz-passport-login-session-bootstrap="angular-startup-load-after-success"]')).not.toBeNull();
    expect(container.querySelector('[data-hz-passport-login-session-user-name="angular-raw-identifier"]')).not.toBeNull();
    expect(container.querySelector('[data-hz-passport-login-startup-failure="angular-exception-500"]')).not.toBeNull();
    expect(container.querySelector('[data-passport-login-startup-failure-contract="angular-exception-500"]')).not.toBeNull();
    expect(container.querySelector('[data-passport-login-session-user-name-contract="angular-raw-identifier"]')).not.toBeNull();
    expect(container.querySelector('[data-hz-passport-login-required-mode="angular-required-no-trim"]')).not.toBeNull();
    expect(container.querySelector('[data-passport-login-required-mode-contract="angular-required-no-trim"]')).not.toBeNull();
    expect(container.querySelector('[data-hz-passport-login-redirect="angular-referrer-non-passport-fallback"]')).not.toBeNull();
    expect(container.querySelector('[data-hz-passport-login-redirect-fallback="angular-root-fallback"]')).not.toBeNull();
    expect(container.querySelector('[data-passport-login-redirect-fallback-contract="angular-root-fallback"]')).not.toBeNull();

    await act(async () => {
      setInputValue(0, 'ops-admin');
      setInputValue(1, 'custom-secret');
      (container.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await flushAsyncWork(12);
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
        credentials: 'same-origin',
        headers: expect.not.objectContaining({
          Authorization: expect.any(String)
        })
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      '/api/apps/hierarchy?lang=zh-CN',
      expect.objectContaining({
        cache: 'no-store',
        credentials: 'same-origin',
        headers: expect.not.objectContaining({
          Authorization: expect.any(String)
        })
      })
    );
    expect(window.localStorage.getItem('Authorization')).toBeNull();
    expect(window.localStorage.getItem('refresh-token')).toBeNull();
    expect(window.sessionStorage.getItem('HB_UI_SESSION_USER')).toContain('"name":"ops-admin"');
    expect(window.sessionStorage.getItem('HB_UI_SESSION_USER')).toContain('"role":"ADMIN"');
    expect(window.sessionStorage.getItem('HB_UI_SESSION_USER')).not.toContain('token');
    expect(window.sessionStorage.getItem('HB_ABOUT_AUTO_SHOW_AFTER_LOGIN')).toBeNull();
    expect(mockState.resetWorkbenchLoadCache).toHaveBeenCalledTimes(1);
    expect(mockState.routerReplace).toHaveBeenCalledWith('/monitors?app=website');
  }, 60000);

  it('keeps the About auto-show marker only for default workbench login', async () => {
    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ code: 0, data: { authenticated: true, tokenBoundary: 'bff-cookie', role: 'ADMIN' } })
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ code: 0, data: { locale: 'zh_CN' } })
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ code: 0, data: [] })
      });

    await mountForm();

    await act(async () => {
      setInputValue(0, 'ops-admin');
      setInputValue(1, 'custom-secret');
      (container.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await flushAsyncWork(12);
    });

    expect(window.sessionStorage.getItem('HB_ABOUT_AUTO_SHOW_AFTER_LOGIN')).toBe('true');
    expect(mockState.routerReplace).toHaveBeenCalledWith('/');
  }, 60000);

  it('routes to the Angular startup failure page when post-login hierarchy bootstrap fails', async () => {
    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ code: 0, data: { authenticated: true, tokenBoundary: 'bff-cookie', role: 'ADMIN' } })
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ code: 0, data: { locale: 'zh_CN' } })
      })
      .mockRejectedValueOnce(new Error('hierarchy failed'));

    await mountForm({ redirectTarget: '/monitors?app=website' });

    await act(async () => {
      setInputValue(0, 'ops-admin');
      setInputValue(1, 'custom-secret');
      (container.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await flushAsyncWork(12);
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      '/api/apps/hierarchy?lang=zh-CN',
      expect.objectContaining({
        cache: 'no-store',
        credentials: 'same-origin'
      })
    );
    expect(window.sessionStorage.getItem('HB_UI_SESSION_USER')).toContain('"name":"ops-admin"');
    expect(window.sessionStorage.getItem('HB_ABOUT_AUTO_SHOW_AFTER_LOGIN')).toBeNull();
    expect(mockState.routerReplace).toHaveBeenCalledWith('/exception/500');
    expect(mockState.routerReplace).not.toHaveBeenCalledWith('/monitors?app=website');
  }, 60000);

  it('keeps Angular default-password warning as the first submit instead of posting immediately', async () => {
    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;

    await mountForm();

    await act(async () => {
      setInputValue(0, 'admin');
      setInputValue(1, 'hertzbeat');
      (container.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await flushAsyncWork();
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(container.querySelector('[data-hz-ui="passport-login-notice"]')).not.toBeNull();
    expect(container.querySelector('[data-hz-passport-login-notice-link="account-modify"]')).not.toBeNull();
    expect(container.querySelector('[data-hz-passport-login-default-password="angular-first-submit-warning"]')).not.toBeNull();
    expect(container.querySelector('[data-hz-passport-login-default-password-lifecycle="angular-sticky-until-submit"]')).not.toBeNull();
    expect(container.querySelector('[data-passport-login-default-password-lifecycle-contract="angular-sticky-until-submit"]')).not.toBeNull();
  }, 60000);

  it('keeps the Angular default-password notice sticky after the credential changes', async () => {
    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ code: 1, msg: 'bad credential' })
    });

    await mountForm();

    await act(async () => {
      setInputValue(0, 'admin');
      setInputValue(1, 'hertzbeat');
      (container.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await flushAsyncWork();
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(container.querySelector('[data-hz-ui="passport-login-notice"]')).not.toBeNull();

    await act(async () => {
      setInputValue(1, 'custom-secret');
      await flushAsyncWork();
    });

    expect(container.querySelector('[data-hz-ui="passport-login-notice"]')).not.toBeNull();

    await act(async () => {
      (container.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await flushAsyncWork(12);
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(container.querySelector('[data-hz-ui="passport-login-notice"]')).not.toBeNull();
    expect(container.textContent).toContain('bad credential');
  }, 60000);

  it('keeps Angular credential required-field validation on the client before posting', async () => {
    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;

    await mountForm();

    await act(async () => {
      (container.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await flushAsyncWork();
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(container.textContent).toContain('Please enter your username');
    expect(container.querySelector('[data-hz-ui="passport-login-validation-notice"]')).not.toBeNull();
    expect(container.querySelector('[data-hz-passport-login-validation-density="angular-error-alert"]')).not.toBeNull();

    await act(async () => {
      setInputValue(0, 'ops-admin');
      (container.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await flushAsyncWork();
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(container.textContent).toContain('Please enter password');
  }, 60000);

  it('allows Angular required whitespace credentials through without trimming before posting', async () => {
    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ code: 1, msg: 'bad credential' })
    });

    await mountForm();

    await act(async () => {
      setInputValue(0, 'ops-admin');
      setInputValue(1, '   ');
      (container.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await flushAsyncWork(12);
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/account/auth/form',
      expect.objectContaining({
        body: JSON.stringify({ type: 0, identifier: 'ops-admin', credential: '   ' })
      })
    );
    expect(container.textContent).toContain('bad credential');
  }, 60000);

  it('keeps Angular post-login user snapshot name as the raw submitted identifier', async () => {
    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ code: 0, data: { authenticated: true, tokenBoundary: 'bff-cookie', role: 'ADMIN' } })
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ code: 0, data: { locale: 'zh_CN' } })
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ code: 0, data: [] })
      });

    await mountForm();

    await act(async () => {
      setInputValue(0, ' ops-admin ');
      setInputValue(1, 'custom-secret');
      (container.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await flushAsyncWork(12);
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/account/auth/form',
      expect.objectContaining({
        body: JSON.stringify({ type: 0, identifier: ' ops-admin ', credential: 'custom-secret' })
      })
    );
    expect(window.sessionStorage.getItem('HB_UI_SESSION_USER')).toContain('"name":" ops-admin "');
    expect(mockState.routerReplace).toHaveBeenCalledWith('/');
  }, 60000);

  it('renders localized loading and fallback login errors', async () => {
    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    let resolveLoginResponse: ((value: unknown) => void) | undefined;
    const loginResponse = new Promise(resolve => {
      resolveLoginResponse = resolve;
    });
    fetchMock.mockReturnValueOnce(loginResponse);

    await mountForm();

    await act(async () => {
      setInputValue(0, 'ops-admin');
      setInputValue(1, 'custom-secret');
      (container.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await flushAsyncWork();
    });

    expect((container.querySelector('button[type="submit"]') as HTMLButtonElement | null)?.textContent).toContain('Logging in');

    await act(async () => {
      resolveLoginResponse?.({
        ok: false,
        status: 503,
        json: async () => ({ code: 1 })
      });
      await loginResponse;
      await flushAsyncWork(12);
    });

    expect(container.textContent).toContain('Login failed: 503');
    expect(mockState.routerReplace).not.toHaveBeenCalled();
  }, 60000);

  it('renders the status fallback when the login response body is empty', async () => {
    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => {
        throw new SyntaxError('Unexpected end of JSON input');
      }
    });

    await mountForm();

    await act(async () => {
      setInputValue(0, 'ops-admin');
      setInputValue(1, 'custom-secret');
      (container.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await flushAsyncWork(12);
    });

    expect(container.textContent).toContain('Login failed: 500');
    expect(container.textContent).not.toContain('Unexpected end of JSON input');
    expect(mockState.routerReplace).not.toHaveBeenCalled();
  }, 60000);

  it('renders the localized generic fallback when login throws a non-Error value', async () => {
    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockRejectedValueOnce('network-cancelled');

    await mountForm();

    await act(async () => {
      setInputValue(0, 'ops-admin');
      setInputValue(1, 'custom-secret');
      (container.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await flushAsyncWork(12);
    });

    expect(container.textContent).toContain('Login failed. Check username or password.');
    expect(mockState.routerReplace).not.toHaveBeenCalled();
  }, 60000);
});
