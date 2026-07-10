import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { createTranslatorMock } from '../../test/i18n-test-helper';
import { AppSidebar } from './app-sidebar';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.ComponentProps<'a'> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  )
}));

const t = createTranslatorMock({ locale: 'zh-CN' });

describe('AppSidebar', () => {
  it('renders translated navigation groups without the old operator footer card', () => {
    const html = renderToStaticMarkup(<AppSidebar pathname="/overview" t={t} />);

    expect(html).toContain('data-app-sidebar="true"');
    expect(html).toContain('data-app-sidebar-nav="true"');
    expect(html).toContain('data-shell-nav-item="overview-home"');
    expect(html).toContain(t('menu.section.ingestion'));
    expect(html).toContain(t('menu.section.objects'));
    expect(html).toContain(t('menu.section.observability'));
    expect(html).toContain(t('menu.section.alerting'));
    expect(html).toContain(t('menu.section.dashboards'));
    expect(html).toContain(t('menu.section.settings'));
    expect(html).toContain('data-shell-nav-item="settings-mcp-server"');
    expect(html).toContain(t('menu.advanced.mcp-server'));
    expect(html).toContain('data-shell-nav-item="help-center"');
    expect(html).toContain(t('menu.extras.help'));
    expect(html).not.toContain('data-shell-nav-item="incidents"');
    expect(html).not.toContain('data-shell-nav-item="actions"');
    expect(html).not.toContain('data-shell-nav-item="status-public"');
    expect(html).toContain('href="/overview"');
    expect(html).not.toContain('data-app-sidebar-operator="true"');
    expect(html).not.toMatch(/\u64cd\u4f5c\u5458/);
    expect(html).not.toMatch(/\u5df2\u8ba4\u8bc1\u4f1a\u8bdd/);
  });

  it('flattens shared nav rows so the sidebar no longer renders every item as a bordered card with a boxed icon', () => {
    const html = renderToStaticMarkup(<AppSidebar pathname="/overview" t={t} />);

    expect(html).toContain('data-shell-nav-item="entities"');
    expect(html).not.toContain('rounded-[2px] border px-3 py-1.5');
    expect(html).not.toContain('rounded-[2px] border transition-colors');
  });

  it('renders top-level nav rows with a left rail active treatment instead of filled card states', () => {
    const html = renderToStaticMarkup(<AppSidebar pathname="/monitors/640360126405888" t={t} />);

    expect(html).toContain('data-app-sidebar-visual="left-rail-primary-nav"');
    expect(html).toContain('data-shell-nav-visual="left-rail"');
    expect(html).toContain('data-shell-nav-item-active="true"');
    expect(html).toContain('data-shell-nav-active-rail="true"');
    expect(html).toContain('data-shell-nav-icon-key="monitor"');
    expect(html).not.toContain('bg-[var(--ops-surface-raised)]');
    expect(html).not.toContain('hover:bg-[var(--ops-surface-panel)]');
  });

  it('keeps visible primary menu icons specific to each operator workflow', () => {
    const html = renderToStaticMarkup(<AppSidebar pathname="/monitors" t={t} />);

    [
      'data-shell-nav-icon-key="otlp"',
      'data-shell-nav-icon-key="monitor"',
      'data-shell-nav-icon-key="collector"',
      'data-shell-nav-icon-key="monitor-template"',
      'data-shell-nav-icon-key="entity-discovery"',
      'data-shell-nav-icon-key="entity-definition"',
      'data-shell-nav-icon-key="alert-group"',
      'data-shell-nav-icon-key="alert-silence"',
      'data-shell-nav-icon-key="plugins"',
      'data-shell-nav-icon-key="help"'
    ].forEach(marker => expect(html).toContain(marker));
  });

  it('bounds the navigation scroll area so long menus do not create page-level footer whitespace', () => {
    const html = renderToStaticMarkup(<AppSidebar pathname="/alert/silence" t={t} />);

    expect(html).toContain('data-app-sidebar-scroll-owner="bounded-sidebar-nav"');
    expect(html).toContain('flex h-full min-h-0 flex-col overflow-hidden');
    expect(html).toContain('md:h-[calc(100vh-64px)]');
    expect(html).toContain('mt-1 min-h-0 flex-1 space-y-1 overflow-y-auto overflow-x-hidden');
  });

  it('accepts shell placement classes for desktop and mobile drawer reuse', () => {
    const html = renderToStaticMarkup(<AppSidebar pathname="/overview" t={t} className="mobile-drawer-proof" />);

    expect(html).toContain('mobile-drawer-proof');
    expect(html).toContain('data-app-sidebar="true"');
  });
});
