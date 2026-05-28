// @vitest-environment jsdom

import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTranslatorMock } from '../../../test/i18n-test-helper';
import { HB_UI_SESSION_USER_KEY } from '../../../lib/session-client';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockState = vi.hoisted(() => ({
  routerReplace: vi.fn()
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mockState.routerReplace
  })
}));

vi.mock('next/image', () => ({
  default: ({ alt, src, priority: _priority, ...props }: any) => React.createElement('img', { alt, src, ...props })
}));

vi.mock('@/components/providers/i18n-provider', () => ({
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

describe('passport lock submit flow', () => {
  let container: HTMLDivElement;
  let root: Root;

  async function mountPage() {
    const { default: PassportLockPage } = await import('./passport-lock-page');
    await act(async () => {
      root.render(<PassportLockPage />);
      await Promise.resolve();
    });
  }

  function setPassword(value: string) {
    const input = container.querySelector('[data-hz-passport-lock-password-input="shared"]') as HTMLInputElement | null;
    if (!input) throw new Error('Missing lock password input');
    const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
    descriptor?.set?.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    mockState.routerReplace.mockReset();
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    document.cookie = 'hb_ui_session=; Max-Age=0; path=/';
  });

  it('blocks empty unlock drafts and navigates to the workbench after a password is entered', async () => {
    window.sessionStorage.setItem(
      HB_UI_SESSION_USER_KEY,
      JSON.stringify({ name: 'ops-admin', avatar: './assets/img/avatar.svg', email: 'administrator', role: 'ADMIN' })
    );
    document.cookie = 'hb_ui_session=1; path=/';
    await mountPage();

    expect(container.querySelector('[data-hz-passport-lock-submit-lifecycle="angular-mark-dirty-required-then-dashboard"]')).not.toBeNull();
    expect(container.querySelector('[data-passport-lock-submit-lifecycle-contract="angular-mark-dirty-required-then-dashboard"]')).not.toBeNull();
    expect(container.querySelector('[data-passport-lock-required-mode-contract="angular-required-no-trim"]')).not.toBeNull();
    expect(container.querySelector('[data-hz-passport-lock-required-mode="angular-required-no-trim"]')).not.toBeNull();
    expect(container.querySelector('[data-passport-session-clear-contract="angular-lock-preserve-session"]')).not.toBeNull();
    expect(container.querySelector('[data-passport-session-clear-enabled="false"]')).not.toBeNull();
    expect(container.querySelector('[data-hz-passport-session-clear-lifecycle="angular-lock-preserve-session"]')).not.toBeNull();
    expect(container.querySelector('[data-hz-passport-session-clear-scope="client-marker-user-snapshot-preserved"]')).not.toBeNull();
    expect(container.querySelector('[data-passport-lock-avatar-contract="angular-settings-user-avatar"]')).not.toBeNull();
    expect(container.querySelector('[data-hz-passport-lock-avatar-source="settings-user-avatar"]')).not.toBeNull();
    expect(container.querySelector('[data-hz-passport-lock-avatar-img="settings-user-avatar"]')).not.toBeNull();
    expect((container.querySelector('[data-hz-passport-lock-avatar-img="settings-user-avatar"]') as HTMLImageElement).getAttribute('src')).toBe('./assets/img/avatar.svg');
    expect((container.querySelector('[data-hz-passport-lock-avatar-img="settings-user-avatar"]') as HTMLImageElement).getAttribute('alt')).toBe('ops-admin');
    expect(window.sessionStorage.getItem(HB_UI_SESSION_USER_KEY)).toContain('"name":"ops-admin"');
    expect(document.cookie).toContain('hb_ui_session=1');
    expect(container.querySelector('[data-hz-passport-lock-submit-state="disabled"]')).not.toBeNull();

    await act(async () => {
      (container.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await Promise.resolve();
    });

    expect(mockState.routerReplace).not.toHaveBeenCalled();

    await act(async () => {
      setPassword('   ');
      await Promise.resolve();
    });

    expect(container.querySelector('[data-hz-passport-lock-submit-state="ready"]')).not.toBeNull();

    await act(async () => {
      (container.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await Promise.resolve();
    });

    expect(mockState.routerReplace).toHaveBeenCalledWith('/overview');
  }, 30000);
});
