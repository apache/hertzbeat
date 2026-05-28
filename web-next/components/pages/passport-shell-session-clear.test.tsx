// @vitest-environment jsdom

import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HB_UI_SESSION_USER_KEY } from '../../lib/session-client';
import { createTranslatorMock } from '../../test/i18n-test-helper';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('next/image', () => ({
  default: ({ alt, src, priority: _priority, ...props }: any) => React.createElement('img', { alt, src, ...props })
}));

vi.mock('../providers/i18n-provider', () => ({
  useI18n: () => ({
    t: createTranslatorMock({ locale: 'zh-CN' }),
    locale: 'zh-CN',
    locales: [
      { code: 'en-US', labelKey: 'settings.system-config.locale.en_US', abbr: 'gb' },
      { code: 'zh-CN', labelKey: 'settings.system-config.locale.zh_CN', abbr: 'cn' }
    ],
    setLocale: vi.fn()
  })
}));

vi.mock('../shell/locale-option-list', () => ({
  LocaleOptionList: () => <div data-locale-options="true">locale-options</div>
}));

vi.mock('../shell/platform-copyright-footer', () => ({
  PlatformCopyrightFooter: ({
    children,
    headlineClassName: _headlineClassName,
    innerClassName: _innerClassName,
    lineClassName: _lineClassName,
    linkClassName: _linkClassName,
    version: _version,
    ...props
  }: any) => <footer {...props}>{children}</footer>
}));

describe('PassportShell session clear lifecycle', () => {
  let container: HTMLDivElement;
  let root: Root;

  async function mountShell() {
    const { PassportShell } = await import('./passport-shell');
    await act(async () => {
      root.render(
        <PassportShell>
          <div data-passport-child="true">child</div>
        </PassportShell>
      );
      await Promise.resolve();
    });
  }

  async function mountLockShell() {
    const { PassportShell } = await import('./passport-shell');
    await act(async () => {
      root.render(
        <PassportShell sessionLifecycle="preserve-on-lock">
          <div data-passport-child="true">child</div>
        </PassportShell>
      );
      await Promise.resolve();
    });
  }

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    window.sessionStorage.clear();
    document.cookie = 'hb_ui_session=1; path=/';
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    window.sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it('clears Angular-style client session residue on passport entry without calling the logout API', async () => {
    window.sessionStorage.setItem(
      HB_UI_SESSION_USER_KEY,
      JSON.stringify({ name: 'admin', avatar: './assets/img/avatar.svg', email: 'administrator', role: 'ADMIN' })
    );

    await mountShell();

    expect(container.querySelector('[data-hz-ui="passport-session-clear-frame"]')).not.toBeNull();
    expect(container.querySelector('[data-passport-session-clear-contract="angular-token-service-clear-on-passport-entry"]')).not.toBeNull();
    expect(container.querySelector('[data-passport-session-clear-owner="hertzbeat-ui-passport-session-clear"]')).not.toBeNull();
    expect(container.querySelector('[data-hz-passport-session-clear-lifecycle="angular-token-service-clear-on-passport-entry"]')).not.toBeNull();
    expect(container.querySelector('[data-hz-passport-session-clear-scope="client-marker-user-snapshot"]')).not.toBeNull();
    expect(container.querySelector('[data-hz-passport-session-clear-boundary="no-api-logout-on-entry"]')).not.toBeNull();
    expect(window.sessionStorage.getItem(HB_UI_SESSION_USER_KEY)).toBeNull();
    expect(document.cookie).not.toContain('hb_ui_session=1');
    expect(global.fetch).not.toHaveBeenCalled();
  }, 15000);

  it('preserves client session residue on the Angular lock entry', async () => {
    window.sessionStorage.setItem(
      HB_UI_SESSION_USER_KEY,
      JSON.stringify({ name: 'admin', avatar: './assets/img/avatar.svg', email: 'administrator', role: 'ADMIN' })
    );

    await mountLockShell();

    expect(container.querySelector('[data-passport-session-clear-contract="angular-lock-preserve-session"]')).not.toBeNull();
    expect(container.querySelector('[data-passport-session-clear-enabled="false"]')).not.toBeNull();
    expect(container.querySelector('[data-hz-passport-session-clear-lifecycle="angular-lock-preserve-session"]')).not.toBeNull();
    expect(container.querySelector('[data-hz-passport-session-clear-scope="client-marker-user-snapshot-preserved"]')).not.toBeNull();
    expect(window.sessionStorage.getItem(HB_UI_SESSION_USER_KEY)).toContain('"name":"admin"');
    expect(document.cookie).toContain('hb_ui_session=1');
    expect(global.fetch).not.toHaveBeenCalled();
  }, 15000);
});
