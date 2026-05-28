import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { createTranslatorMock } from '../../../test/i18n-test-helper';

describe('settings settings layout client', () => {
  it('renders localized header chrome and menu labels through the shared settings shell', async () => {
    const t = createTranslatorMock({ locale: 'zh-CN' });

    vi.resetModules();
    vi.doMock('next/navigation', () => ({
      usePathname: () => '/setting/settings/config'
    }));
    vi.doMock('@/components/providers/i18n-provider', () => ({
      useI18n: () => ({ t })
    }));
    vi.doMock('@/components/settings/settings-console-shell', () => ({
      SettingsConsoleShell: ({
        activeHref,
        children,
        contentLabel,
        items,
        kicker,
        navigationLabel,
        subtitle,
        title
      }: {
        activeHref?: string | null;
        children: React.ReactNode;
        contentLabel?: string;
        items: Array<{ href: string; label: string }>;
        kicker?: string;
        navigationLabel?: string;
        subtitle?: string;
        title?: string;
      }) => (
        <section data-active-href={activeHref}>
          <p>{kicker}</p>
          <h1>{title}</h1>
          <p>{subtitle}</p>
          <nav aria-label={navigationLabel}>
            {items.map(item => (
              <a key={item.href} href={item.href}>
                {item.label}
              </a>
            ))}
          </nav>
          <main aria-label={contentLabel}>{children}</main>
        </section>
      )
    }));

    const { default: SettingsSettingsLayoutClient } = await import('./settings-layout-client');
    const html = renderToStaticMarkup(
      <SettingsSettingsLayoutClient>
        <div>content</div>
      </SettingsSettingsLayoutClient>
    );

    expect(html).toContain('data-active-href="/setting/settings/config"');
    expect(html).toContain('设置');
    expect(html).toContain('系统设置');
    expect(html).toContain('在同一控制台配置系统、消息服务、对象存储和令牌。');
    expect(html).toContain('aria-label="设置分区"');
    expect(html).toContain('aria-label="设置内容"');
    expect(html).toContain('系统配置');
    expect(html).toContain('消息服务配置');
    expect(html).toContain('文件服务配置');
    expect(html).toContain('令牌管理');
    expect(html).toContain('content');
    expect(html).not.toContain('settings.console.');
  });
});
