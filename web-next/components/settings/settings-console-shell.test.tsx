import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  )
}));

describe('settings console shell', () => {
  it('renders the OTLP cold-matte settings navigation and marks the active route', async () => {
    const { SettingsConsoleShell } = await import('./settings-console-shell');
    const html = renderToStaticMarkup(
      <SettingsConsoleShell
        activeHref="/setting/settings/config"
        contentLabel="设置内容"
        kicker="设置"
        navigationLabel="设置分区"
        title="把系统配置、消息通道和接入凭证放在一起"
        subtitle="在同一页查看系统配置、服务器、对象存储和接入令牌。"
        items={[
          { href: '/setting/settings/config', label: '系统配置' },
          { href: '/setting/settings/server', label: '消息服务配置' }
        ]}
      >
        <div>content</div>
      </SettingsConsoleShell>
    );

    expect(html).toContain('data-settings-console-surface="otlp-cold-settings-console"');
    expect(html).toContain('data-settings-console-style-baseline="hertzbeat-cold-matte"');
    expect(html).toContain('data-settings-console-route-contract="angular-settings-shell"');
    expect(html).toContain('data-settings-console-menu-contract="angular-config-server-object-store-token"');
    expect(html).toContain('data-settings-console-menu-mode-contract="angular-inline-horizontal-responsive"');
    expect(html).toContain('data-settings-console-active-title-contract="angular-active-child-title"');
    expect(html).toContain('data-settings-console-header="cold-compact-header"');
    expect(html).toContain('data-settings-console-main="cold-settings-workspace"');
    expect(html).toContain('data-settings-console-menu="cold-static-list"');
    expect(html).toContain('data-settings-console-menu-mode="angular-responsive-inline-horizontal"');
    expect(html).toContain('data-settings-console-content="cold-settings-content"');
    expect(html).toContain('data-settings-console-active-title="系统配置"');
    expect(html).toContain('data-settings-console-active-title-marker="系统配置"');
    expect(html).toContain('aria-label="设置分区"');
    expect(html).toContain('aria-label="设置内容"');
    expect(html).toContain('data-settings-console-menu-item="/setting/settings/config"');
    expect(html).toContain('data-settings-console-active="true"');
    expect(html).toContain('data-settings-console-selected-contract="angular-nz-selected"');
    expect(html).toContain('设置');
    expect(html).toContain('把系统配置、消息通道和接入凭证放在一起');
    expect(html).toContain('在同一页查看系统配置、服务器、对象存储和接入令牌。');
    expect(html).toContain('系统配置');
    expect(html).toContain('消息服务配置');
    expect(html).toContain('content');
    expect(html).toContain('href="/setting/settings/config"');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('href="/setting/settings/server"');
    expect(html).toContain('rounded-[4px]');
    expect(html).toContain('rounded-[3px]');
    expect(html).toContain('flex-row');
    expect(html).toContain('lg:flex-col');
    expect(html).toContain('overflow-x-auto');
    expect(html).toContain('border-[#2b3039]');
    expect(html).toContain('bg-[#0b0c0e]');
    expect(html).toContain('bg-[#101217]');
    expect(html).toContain('text-[#a9b0bb]');
    expect(html).not.toContain('angular-page-shell');
    expect(html).not.toContain('angular-bordered-main');
    expect(html).not.toContain('angular-menu');
    expect(html).not.toContain('data-settings-console-summary-rail');
  }, 15000);

  it('uses the shared cold visual owner and keeps the shell free of old markers', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/settings/settings-console-shell.tsx'), 'utf8');

    expect(source).toContain('coldOpsCatalogVisual');
    expect(source).toContain('data-settings-console-surface="otlp-cold-settings-console"');
    expect(source).toContain('data-settings-console-style-baseline={coldSettingsVisual.canvasName}');
    expect(source).toContain('data-settings-console-route-contract="angular-settings-shell"');
    expect(source).toContain('data-settings-console-menu-contract="angular-config-server-object-store-token"');
    expect(source).toContain('data-settings-console-menu-mode-contract="angular-inline-horizontal-responsive"');
    expect(source).toContain('data-settings-console-active-title-contract="angular-active-child-title"');
    expect(source).toContain('data-settings-console-main="cold-settings-workspace"');
    expect(source).toContain('data-settings-console-menu-mode="angular-responsive-inline-horizontal"');
    expect(source).toContain('data-settings-console-active-title={activeItem?.label ?? \'\'}');
    expect(source).toContain('data-settings-console-active-title-marker={activeItem?.label ?? \'\'}');
    expect(source).toContain('data-settings-console-selected-contract');
    expect(source).toContain('lg:flex-col');
    expect(source).not.toContain('angular-page-shell');
    expect(source).not.toContain('angular-page-header');
    expect(source).not.toContain('angular-bordered-main');
    expect(source).not.toContain('angular-menu');
    expect(source).not.toContain('angular-content');
    expect(source).not.toContain('data-settings-console-summary-rail');
    expect(source).not.toContain('border-[#20232b]');
    expect(source).not.toContain('bg-[#121317]');
  });
});
