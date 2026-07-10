import { createTranslatorMock } from '../../test/i18n-test-helper';
import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

const zhT = createTranslatorMock({ locale: 'zh-CN' });
const ZH_CN_LABEL = zhT('settings.system-config.locale.zh_CN');
const JA_JP_LABEL = 'Japanese(ja_JP)';
const LOGIN_NOTICE_COPY =
  '\u767b\u5f55\u6210\u529f\u540e\u4f1a\u81ea\u52a8\u6062\u590d\u5f53\u524d\u5de5\u4f5c\u53f0\u4f1a\u8bdd\uff0c\u5e76\u5728\u9700\u8981\u65f6\u5c1d\u8bd5\u5237\u65b0\u4ee4\u724c\u3002';
const HERO_TITLE = zhT('app.passport.desc');
const HERO_LEAD = zhT('app.passport.intro-1');
const HERO_FOCUS = zhT('app.passport.intro-2');
const HERO_BODY = zhT('about.point.1');
const LOGIN_HEADING = zhT('app.login.tab-login-credentials');
const USERNAME_PROMPT = zhT('app.login.message-need-identifier');
const PASSWORD_PROMPT = zhT('app.login.message-need-credential');
const PASSWORD_TOGGLE_LABEL = zhT('app.login.password-show');
const REMEMBER_ME_LABEL = zhT('app.login.remember-me');
const LOGIN_BUTTON = zhT('app.login.login');
const RETURN_NOTICE_TITLE = zhT('passport.login.return-notice.title');
const RETURN_NOTICE_TARGET = '/entities/discovery?identityKey=service.name&identityValue=billing-api';
const RETURN_NOTICE_ROUTE = '/entities/discovery?identityKey=service.name&amp;identityValue=billing-api';
const RETURN_NOTICE_LABEL = zhT('passport.login.return-target.entity-discovery');
const RETURN_NOTICE_COPY = zhT('passport.login.return-notice.copy', {
  target: RETURN_NOTICE_LABEL
}).replaceAll('&', '&amp;');

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: vi.fn()
  })
}));

vi.mock('next/image', () => ({
  default: ({ alt, src, priority: _priority, ...props }: any) => React.createElement('img', { alt, src, ...props })
}));

vi.mock('../providers/i18n-provider', () => ({
  useI18n: () => ({
    t: zhT,
    locale: 'zh-CN',
    locales: [
      { code: 'en-US', labelKey: 'settings.system-config.locale.en_US', abbr: '🇬🇧' },
      { code: 'zh-CN', labelKey: 'settings.system-config.locale.zh_CN', abbr: '🇨🇳' },
      { code: 'ja-JP', labelKey: 'settings.system-config.locale.ja-JP', abbr: '🇯🇵' }
    ],
    setLocale: vi.fn()
  })
}));

vi.mock('../ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>
}));

vi.mock('../ui/input', () => ({
  Input: (props: any) => <input {...props} />
}));

vi.mock('../../lib/passport-login/controller', () => ({
  assertSessionLoginSuccess: vi.fn(),
  buildLoginRequestBody: vi.fn(),
  bootstrapPostLoginSession: vi.fn(),
  resolvePostLoginRedirectTarget: vi.fn(() => '/overview'),
  LOGIN_REDIRECT_QUERY_KEY: 'redirect'
}));

vi.mock('../../lib/passport-login/view-model', () => ({
  buildLoginNotice: () => ({
    kind: 'session',
    copy: LOGIN_NOTICE_COPY
  }),
  normalizeCredentialLoginError: (message: string) => message,
  resolveLoginReturnTargetLabel: (_target: string, t: (key: string) => string) => t('passport.login.return-target.entity-discovery'),
  shouldWarnDefaultPassword: vi.fn(() => false)
}));

vi.mock('../../lib/api-client', () => ({
  apiGet: vi.fn()
}));

describe('LoginForm', () => {
  it('renders the angular-style passport shell with background hero and credential form', async () => {
    const { LoginForm } = await import('./login-form');
    const html = renderToStaticMarkup(<LoginForm />);

    expect(html).toContain('data-login-shell="passport"');
    expect(html).toContain('data-passport-shell-visual="ops-dark-entry"');
    expect(html).toContain('data-passport-background-tone="ops-dark"');
    expect(html).not.toContain("/assets/bg.png");
    expect(html).toContain(HERO_TITLE);
    expect(html).toContain(HERO_LEAD);
    expect(html).toContain(HERO_FOCUS);
    expect(html).toContain(HERO_BODY);
    expect(html).not.toContain('Open-source enterprise observability for private operations');
    expect(html).not.toContain('Unified metrics platform, agentless and supports web, db, os, mid, network etc.');
    expect(html).not.toContain('Unified logs platform');
    expect(html).not.toContain('seamlessly integrates');
    expect(html).not.toContain('discord, slack, telegram');
    expect(html).toContain(LOGIN_HEADING);
    expect(html).toContain(USERNAME_PROMPT);
    expect(html).toContain(PASSWORD_PROMPT);
    expect(html).toContain(LOGIN_BUTTON);
    expect(html).toContain(`placeholder="${USERNAME_PROMPT}"`);
    expect(html).toContain(`placeholder="${PASSWORD_PROMPT}"`);
    expect(html).toContain('id="passport-login-identifier"');
    expect(html).toContain('name="identifier"');
    expect(html).toContain('autoComplete="username"');
    expect(html).toContain('id="passport-login-credential"');
    expect(html).toContain('name="credential"');
    expect(html).toContain('autoComplete="current-password"');
    expect(html).toContain(`aria-label="${PASSWORD_TOGGLE_LABEL}"`);
    expect(html).toContain('data-passport-login-password-eye="true"');
    expect(html).toContain('data-passport-login-panel="angular-gray-card"');
    expect(html).toContain('data-passport-login-panel-visual="ops-dark-card"');
    expect(html).toContain('data-passport-login-panel-align="angular-top"');
    expect(html).toContain('data-passport-login-submit-lifecycle-contract="angular-required-default-warning-session-bootstrap-redirect"');
    expect(html).toContain('data-passport-login-submit-lifecycle-owner="hertzbeat-ui-passport-login-action"');
    expect(html).toContain('data-passport-login-required-mode-contract="angular-required-no-trim"');
    expect(html).toContain('data-passport-login-required-mode-owner="hertzbeat-ui-passport-login-action"');
    expect(html).toContain('data-passport-login-session-user-name-contract="angular-raw-identifier"');
    expect(html).toContain('data-passport-login-session-user-name-owner="hertzbeat-ui-passport-login-action"');
    expect(html).toContain('data-hz-ui="passport-login-action-frame"');
    expect(html).toContain('data-hz-passport-login-action-owner="hertzbeat-ui-passport-login-action"');
    expect(html).toContain('data-hz-passport-login-submit-lifecycle="angular-required-default-warning-session-bootstrap-redirect"');
    expect(html).toContain('data-hz-passport-login-required-fields="identifier-credential"');
    expect(html).toContain('data-hz-passport-login-required-mode="angular-required-no-trim"');
    expect(html).toContain('data-hz-passport-login-default-password="angular-first-submit-warning"');
    expect(html).toContain('data-hz-passport-login-default-password-lifecycle="angular-sticky-until-submit"');
    expect(html).toContain('data-passport-login-default-password-lifecycle-contract="angular-sticky-until-submit"');
    expect(html).toContain('data-hz-passport-login-token-boundary="bff-cookie-no-localstorage"');
    expect(html).toContain('data-hz-passport-login-session-bootstrap="angular-startup-load-after-success"');
    expect(html).toContain('data-hz-passport-login-session-user-name="angular-raw-identifier"');
    expect(html).toContain('data-hz-passport-login-startup-failure="angular-exception-500"');
    expect(html).toContain('data-passport-login-startup-failure-contract="angular-exception-500"');
    expect(html).toContain('data-hz-passport-login-redirect="angular-referrer-non-passport-fallback"');
    expect(html).toContain('data-hz-passport-login-redirect-fallback="angular-root-fallback"');
    expect(html).toContain('data-passport-login-redirect-fallback-contract="angular-root-fallback"');
    expect(html).toContain('data-hz-passport-login-remember-default="true"');
    expect(html).toContain('data-passport-login-accent="true"');
    expect(html).toContain('data-passport-login-remember="true"');
    expect(html).toContain('data-passport-login-remember-checkbox="hertzbeat-ui-checkbox"');
    expect(html).toContain('data-hz-checkbox-owner="hertzbeat-ui-checkbox"');
    expect(html).toContain('data-hz-checkbox-control="native-hidden"');
    expect(html).toContain('data-hz-checkbox-box="indicator"');
    expect(html).toContain('data-hz-checkbox-label="true"');
    expect(html).toContain('data-passport-content-alignment="angular-centered"');
    expect(html).toContain('data-passport-content-gutter="angular-right-shift"');
    expect(html).toContain('data-passport-vertical-position="angular-upper-content"');
    expect(html).toContain('data-passport-hero-offset="angular-left-reference"');
    expect(html).toContain('data-passport-brand-lockup="angular-lowered"');
    expect(html).toContain('data-passport-intro-bullet-tone="angular-cyan"');
    expect(html).toContain(REMEMBER_ME_LABEL);
    expect(html).toContain('data-passport-locale-trigger="globe"');
    expect(html).toContain('data-passport-footer-tone="angular-muted"');
    expect(html).toContain('data-passport-footer-visual-tone="ops-muted"');
    expect(html).toContain('data-passport-footer-band="angular-raised"');
    expect(html).not.toContain(ZH_CN_LABEL);
    expect(html).toContain('Apache HertzBeat™');
    expect(html).toContain('Apache HertzBeat™ v1.8.0');
    expect(html).toContain('Copyright ©');
    expect(html).not.toContain(zhT('platform.footer.license'));
    expect(html).not.toContain(LOGIN_NOTICE_COPY);
    expect(html).not.toContain('data-passport-login-return-notice="guarded-deep-link"');
    expect(html).not.toContain('value="admin"');
    expect(html).not.toContain('value="hertzbeat"');
  }, 60000);

  it('explains the guarded deep-link return target before credential entry', async () => {
    const { LoginForm } = await import('./login-form');
    const html = renderToStaticMarkup(
      <LoginForm
        initialRouteState={{
          redirectTarget: RETURN_NOTICE_TARGET
        }}
      />
    );

    expect(html).toContain('data-passport-login-return-notice="guarded-deep-link"');
    expect(html).toContain(RETURN_NOTICE_TITLE);
    expect(html).toContain(RETURN_NOTICE_COPY);
    expect(html).toContain(RETURN_NOTICE_LABEL);
    expect(html).toContain(RETURN_NOTICE_ROUTE);
    expect(html).toContain('data-hz-ui="passport-login-action-frame"');
  }, 60000);

  it('removes the remaining bright auth-field residue and adopts shared ops form tokens', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/pages/login-form.tsx'), 'utf8');
    const uiSource = readFileSync(resolve(process.cwd(), 'packages/hertzbeat-ui/src/index.tsx'), 'utf8');

    expect(source).not.toContain('text-[#424955]');
    expect(source).not.toContain('text-[#697180]');
    expect(source).not.toContain('border-[#c7ceda]');
    expect(source).not.toContain('bg-white/92');
    expect(source).not.toContain('border-[#d69ae1]');
    expect(source).not.toContain('bg-[#fff4fb]/92');
    expect(source).not.toContain('text-[#6f134f]');
    expect(source).not.toContain('text-[#b421cc]');
    expect(source).not.toContain('border-[#d8899a]');
    expect(source).not.toContain('bg-[#fff1f3]/92');
    expect(source).not.toContain('text-[#8f1d37]');
    expect(source).not.toContain('pt-8 lg:pt-7');

    expect(uiSource).toContain('text-[var(--ops-text-secondary)]');
    expect(source).toContain('text-[var(--ops-text-tertiary)]');
    expect(source).toContain('border-[var(--ops-border-color)]');
    expect(source).toContain('bg-[var(--ops-surface-panel)]');
    expect(source).toContain('bg-[rgba(14,18,24,0.94)]');
    expect(source).toContain('data-passport-login-panel-visual="ops-dark-card"');
    expect(source).toContain('text-[var(--ops-text-secondary)]');
    expect(source).not.toContain('bg-[#5f5f66]');
    expect(source).not.toContain('text-[#17181c]');
    expect(uiSource).toContain('bg-[var(--ops-surface-elevated)]');
    expect(source).toContain("import { HzPassportLoginActionFrame, HzPassportLoginNotice, HzPassportLoginValidationNotice } from '@hertzbeat/ui';");
    expect(source).toContain('<HzPassportLoginActionFrame');
    expect(source).toContain("import { Checkbox } from '../ui/checkbox';");
    expect(source).toContain('<HzPassportLoginNotice copy={notice.copy} href={notice.href} />');
    expect(source).toContain('<HzPassportLoginValidationNotice title={t(\'common.attention\')} copy={error} />');
    expect(source).toContain('validateCredentialLoginDraft(identifier, credential, t)');
    expect(source).toContain("import { resetWorkbenchLoadCache } from '../../lib/workbench-load-cache';");
    expect(source).toContain('resetWorkbenchLoadCache();');
    expect(source).toContain('await bootstrapPostLoginSession(apiGet);');
    expect(source).toContain('data-passport-login-panel-align="angular-top"');
    expect(source).not.toContain('<AlertTriangle');
    expect(source).not.toContain('input type="checkbox"');
    expect(source).not.toContain('<input type="checkbox" className="sr-only" defaultChecked />');
    expect(source).not.toContain('StatusState');
    expect(source).not.toContain('ObservabilityStatusState');
    expect(source).toContain("aria-label={showCredential ? t('app.login.password-hide') : t('app.login.password-show')}");
    expect(source).toContain("label={t('app.login.remember-me')}");
  });
});
