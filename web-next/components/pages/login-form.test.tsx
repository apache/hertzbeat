import { createTranslatorMock } from '../../test/i18n-test-helper';
/* eslint-disable @next/next/no-img-element */
import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

const ZH_CN_LABEL = 'Simplified Chinese(zh_CN)';
const JA_JP_LABEL = 'Japanese(ja_JP)';
const LOGIN_NOTICE_COPY =
  '\u767b\u5f55\u6210\u529f\u540e\u4f1a\u81ea\u52a8\u6062\u590d\u5f53\u524d\u5de5\u4f5c\u53f0\u4f1a\u8bdd\uff0c\u5e76\u5728\u9700\u8981\u65f6\u5c1d\u8bd5\u5237\u65b0\u4ee4\u724c\u3002';
const HERO_TITLE = 'Open-source enterprise observability for private operations';
const HERO_LEAD = 'Collectors, monitoring templates, entities, metrics, logs, and traces';
const HERO_FOCUS = 'Handle alerts and close issues inside HertzBeat';
const HERO_BODY =
  'Collect metrics from applications, databases, operating systems, middleware, and network devices without sending data outside your deployment.';
const LOGIN_HEADING = 'Sign In HertzBeat';
const USERNAME_PROMPT = 'Please enter your username';
const PASSWORD_PROMPT = 'Please enter password';
const LOGIN_BUTTON = 'Login';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: vi.fn()
  }),
  useSearchParams: () => ({
    get: () => null
  })
}));

vi.mock('next/image', () => ({
  default: ({ alt, src, priority: _priority, ...props }: any) => <img alt={alt} src={src} {...props} />
}));

vi.mock('../providers/i18n-provider', () => ({
  useI18n: () => ({
    t: createTranslatorMock(),
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
  assertLoginSuccess: vi.fn(),
  buildLoginRequestBody: vi.fn(),
  bootstrapPostLoginSession: vi.fn(),
  persistLoginTokens: vi.fn(),
  resolvePostLoginRedirectTarget: vi.fn(() => '/overview'),
  LOGIN_REDIRECT_QUERY_KEY: 'redirect'
}));

vi.mock('../../lib/passport-login/view-model', () => ({
  buildLoginNotice: () => ({
    kind: 'session',
    copy: LOGIN_NOTICE_COPY
  }),
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
    expect(html).toContain("/assets/bg.png");
    expect(html).toContain(HERO_TITLE);
    expect(html).toContain(HERO_LEAD);
    expect(html).toContain(HERO_FOCUS);
    expect(html).toContain(HERO_BODY);
    expect(html).not.toContain('Open-source private-deployable enterprise operations observability platform');
    expect(html).not.toContain('Unified metrics platform, agentless and supports web, db, os, mid, network etc.');
    expect(html).not.toContain('Unified logs platform');
    expect(html).not.toContain('seamlessly integrates');
    expect(html).not.toContain('discord, slack, telegram');
    expect(html).toContain(LOGIN_HEADING);
    expect(html).toContain(USERNAME_PROMPT);
    expect(html).toContain(PASSWORD_PROMPT);
    expect(html).toContain(LOGIN_BUTTON);
    expect(html).toContain('placeholder="Please enter your username"');
    expect(html).toContain('placeholder="Please enter password"');
    expect(html).toContain('data-passport-login-password-eye="true"');
    expect(html).toContain('data-passport-login-panel="angular-gray-card"');
    expect(html).toContain('data-passport-login-panel-align="angular-top"');
    expect(html).toContain('data-passport-login-accent="true"');
    expect(html).toContain('data-passport-login-remember="true"');
    expect(html).toContain('data-passport-login-remember-checkbox="cold-checkbox"');
    expect(html).toContain('data-cold-checkbox-owner="cold-checkbox"');
    expect(html).toContain('data-cold-checkbox-control="native-hidden"');
    expect(html).toContain('data-cold-checkbox-box="indicator"');
    expect(html).toContain('data-cold-checkbox-label="true"');
    expect(html).toContain('data-passport-content-alignment="angular-centered"');
    expect(html).toContain('data-passport-content-gutter="angular-right-shift"');
    expect(html).toContain('data-passport-vertical-position="angular-upper-content"');
    expect(html).toContain('data-passport-hero-offset="angular-left-reference"');
    expect(html).toContain('data-passport-brand-lockup="angular-lowered"');
    expect(html).toContain('data-passport-intro-bullet-tone="angular-cyan"');
    expect(html).toContain('Remember me');
    expect(html).toContain('data-passport-locale-trigger="globe"');
    expect(html).toContain('data-passport-footer-tone="angular-muted"');
    expect(html).toContain('data-passport-footer-band="angular-raised"');
    expect(html).not.toContain(ZH_CN_LABEL);
    expect(html).toContain('Apache HertzBeat™');
    expect(html).toContain('Apache HertzBeat™ v1.8.0');
    expect(html).toContain('Licensed under the Apache License, Version 2.0');
    expect(html).not.toContain(LOGIN_NOTICE_COPY);
    expect(html).not.toContain('value="admin"');
    expect(html).not.toContain('value="hertzbeat"');
  }, 15000);

  it('removes the remaining bright auth-field residue and adopts shared ops form tokens', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/pages/login-form.tsx'), 'utf8');

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

    expect(source).toContain('text-[var(--ops-text-secondary)]');
    expect(source).toContain('text-[var(--ops-text-tertiary)]');
    expect(source).toContain('border-[var(--ops-border-color)]');
    expect(source).toContain('bg-[var(--ops-surface-panel)]');
    expect(source).toContain('bg-[var(--ops-surface-elevated)]');
    expect(source).toContain("from '../workbench/primitives'");
    expect(source).toContain("import { Checkbox } from '../ui/checkbox';");
    expect(source).toContain('StatusState');
    expect(source).toContain('data-passport-login-panel-align="angular-top"');
    expect(source).not.toContain('input type="checkbox"');
    expect(source).not.toContain('<input type="checkbox" className="sr-only" defaultChecked />');
    expect(source).not.toContain('ObservabilityStatusState');
  });
});
