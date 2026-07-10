import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { createTranslatorMock } from '../../../test/i18n-test-helper';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: vi.fn()
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
      { code: 'en-US', labelKey: 'settings.system-config.locale.en_US', abbr: '🇬🇧' },
      { code: 'zh-CN', labelKey: 'settings.system-config.locale.zh_CN', abbr: '🇨🇳' }
    ],
    setLocale: vi.fn()
  })
}));

vi.mock('../../../components/pages/passport-shell', () => ({
  PassportShell: ({ children, panelClassName, sessionLifecycle }: any) => (
    <div
      data-login-shell="passport"
      data-passport-shell="true"
      data-passport-shell-panel-class={panelClassName}
      data-passport-session-clear-contract={sessionLifecycle === 'preserve-on-lock' ? 'angular-lock-preserve-session' : 'angular-token-service-clear-on-passport-entry'}
      data-passport-session-clear-enabled={sessionLifecycle === 'preserve-on-lock' ? 'false' : 'true'}
      data-hz-passport-session-clear-lifecycle={sessionLifecycle === 'preserve-on-lock' ? 'angular-lock-preserve-session' : 'angular-token-service-clear-on-passport-entry'}
      data-hz-passport-session-clear-scope={sessionLifecycle === 'preserve-on-lock' ? 'client-marker-user-snapshot-preserved' : 'client-marker-user-snapshot'}
      data-passport-shell-visual="ops-dark-entry"
    >
      <div>Apache HertzBeat™</div>
      {children}
    </div>
  ),
  PassportPanel: ({ children, className }: any) => <section data-passport-panel="true" className={className}>{children}</section>
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />
}));

vi.mock('@/components/observability', () => ({
  ObservabilityStatusState: ({ title, copy }: any) => (
    <div data-status-state="true">
      <strong>{title}</strong>
      <span>{copy}</span>
    </div>
  )
}));

describe('passport lock page', () => {
  it('renders inside the shared passport shell with the angular-style unlock panel', async () => {
    const expectedT = createTranslatorMock({ locale: 'zh-CN' });
    const { default: PassportLockPage } = await import('./page');
    const html = renderToStaticMarkup(<PassportLockPage />);

    expect(html).toContain('data-passport-shell="true"');
    expect(html).toContain('data-passport-session-clear-contract="angular-lock-preserve-session"');
    expect(html).toContain('data-passport-session-clear-enabled="false"');
    expect(html).toContain('data-hz-passport-session-clear-lifecycle="angular-lock-preserve-session"');
    expect(html).toContain('data-hz-passport-session-clear-scope="client-marker-user-snapshot-preserved"');
    expect(html).toContain('data-passport-panel="true"');
    expect(html).toContain('data-passport-lock="true"');
    expect(html).toContain('data-passport-lock-panel="angular-wide"');
    expect(html).toContain('data-passport-lock-panel-owner="hertzbeat-ui-passport-lock"');
    expect(html).toContain('data-passport-lock-avatar-contract="angular-settings-user-avatar"');
    expect(html).toContain('data-passport-lock-session-contract="angular-lock-preserve-session"');
    expect(html).toContain('data-passport-lock-submit-lifecycle-contract="angular-mark-dirty-required-then-dashboard"');
    expect(html).toContain('data-passport-lock-submit-lifecycle-owner="hertzbeat-ui-passport-lock"');
    expect(html).toContain('data-passport-lock-redirect-contract="angular-dashboard-next-overview"');
    expect(html).toContain('data-passport-lock-required-mode-contract="angular-required-no-trim"');
    expect(html).toContain('data-passport-lock-required-mode-owner="hertzbeat-ui-passport-lock"');
    expect(html).toContain('data-hz-ui="passport-lock-surface"');
    expect(html).toContain('data-hz-passport-lock-owner="hertzbeat-ui-passport-lock"');
    expect(html).toContain('data-hz-passport-lock-density="angular-lock-card"');
    expect(html).toContain('data-hz-passport-lock-submit-lifecycle="angular-mark-dirty-required-then-dashboard"');
    expect(html).toContain('data-hz-passport-lock-required-fields="password"');
    expect(html).toContain('data-hz-passport-lock-required-mode="angular-required-no-trim"');
    expect(html).toContain('data-hz-passport-lock-redirect="angular-dashboard-next-overview"');
    expect(html).toContain('data-hz-passport-lock-submit-disabled="angular-invalid-disabled"');
    expect(html).toContain('data-hz-passport-lock-avatar="angular-floating"');
    expect(html).toContain('data-hz-passport-lock-avatar-source="fallback-user-icon"');
    expect(html).toContain('data-hz-passport-lock-submit-state="disabled"');
    expect(html).toContain('max-w-[712px]');
    expect(html).toContain('rounded-none');
    expect(html).toContain(expectedT('app.lock'));
    expect(html).toContain(expectedT('app.lock.placeholder'));
    expect(html).toContain('data-passport-shell-visual="ops-dark-entry"');
    expect(html).not.toContain('/assets/bg.png');
    expect(html).toContain('Apache HertzBeat™');
  }, 30000);
});
