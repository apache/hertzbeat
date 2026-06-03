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
        contentLabel="Settings content"
        kicker="Settings"
        navigationLabel="Settings sections"
        title="Keep system configuration, message channels, and access credentials together"
        subtitle="Review system configuration, servers, object storage, and access tokens on one page."
        items={[
          { href: '/setting/settings/config', label: 'System configuration' },
          { href: '/setting/settings/server', label: 'Message service configuration' }
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
    expect(html).toContain('data-settings-console-active-title="System configuration"');
    expect(html).toContain('data-settings-console-active-title-marker="System configuration"');
    expect(html).toContain('aria-label="Settings sections"');
    expect(html).toContain('aria-label="Settings content"');
    expect(html).toContain('data-settings-console-menu-item="/setting/settings/config"');
    expect(html).toContain('data-settings-console-active="true"');
    expect(html).toContain('data-settings-console-selected-contract="angular-nz-selected"');
    expect(html).toContain('Settings');
    expect(html).toContain('Keep system configuration, message channels, and access credentials together');
    expect(html).toContain('Review system configuration, servers, object storage, and access tokens on one page.');
    expect(html).toContain('System configuration');
    expect(html).toContain('Message service configuration');
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
