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
  default: ({ alt, src, priority: _priority, ...props }: any) => <img alt={alt} src={src} {...props} />
}));

vi.mock('@/components/providers/i18n-provider', () => ({
  useI18n: () => ({
    t: createTranslatorMock(),
    locale: 'zh-CN',
    locales: [
      { code: 'en-US', labelKey: 'settings.system-config.locale.en_US', abbr: '🇬🇧' },
      { code: 'zh-CN', labelKey: 'settings.system-config.locale.zh_CN', abbr: '🇨🇳' }
    ],
    setLocale: vi.fn()
  })
}));

vi.mock('../../../components/pages/passport-shell', () => ({
  PassportShell: ({ children, panelClassName }: any) => (
    <div
      data-login-shell="passport"
      data-passport-shell="true"
      data-passport-shell-panel-class={panelClassName}
      style={{ backgroundImage: "url('/assets/bg.png')" }}
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
    const { default: PassportLockPage } = await import('./page');
    const html = renderToStaticMarkup(<PassportLockPage />);

    expect(html).toContain('data-passport-shell="true"');
    expect(html).toContain('data-passport-panel="true"');
    expect(html).toContain('data-passport-lock="true"');
    expect(html).toContain('data-passport-lock-panel="angular-wide"');
    expect(html).toContain('max-w-[712px]');
    expect(html).toContain('rounded-none');
    expect(html).toContain('Unlock');
    expect(html).toContain('Enter Any To Unlock');
    expect(html).toContain('/assets/bg.png');
    expect(html).toContain('Apache HertzBeat™');
  }, 15000);
});
