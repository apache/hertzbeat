import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { AppSidebar } from './app-sidebar';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.ComponentProps<'a'> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  )
}));

describe('AppSidebar', () => {
  it('renders translated navigation groups without the old operator footer card', () => {
    const html = renderToStaticMarkup(
      <AppSidebar pathname="/overview" t={key => `translated:${key}`} />
    );

    expect(html).toContain('data-app-sidebar="true"');
    expect(html).toContain('data-app-sidebar-nav="true"');
    expect(html).toContain('data-shell-nav-item="overview-home"');
    expect(html).toContain('translated:menu.section.ingestion');
    expect(html).toContain('translated:menu.section.objects');
    expect(html).toContain('translated:menu.section.observability');
    expect(html).toContain('translated:menu.section.alerting');
    expect(html).toContain('translated:menu.section.dashboards');
    expect(html).toContain('translated:menu.section.settings');
    expect(html).not.toContain('translated:menu.home');
    expect(html).not.toContain('>translated:menu.monitor</div>');
    expect(html).toContain('data-shell-nav-item="settings-mcp-server"');
    expect(html).toContain('translated:menu.advanced.mcp-server');
    expect(html).toContain('data-shell-nav-item="help-center"');
    expect(html).toContain('translated:menu.extras.help');
    expect(html).not.toContain('data-shell-nav-item="incidents"');
    expect(html).not.toContain('data-shell-nav-item="actions"');
    expect(html).not.toContain('data-shell-nav-item="status-public"');
    expect(html).toContain('href="/overview"');
    expect(html).not.toContain('data-app-sidebar-operator="true"');
    expect(html).not.toContain('translated:common.operator');
    expect(html).not.toContain('translated:common.session.authenticated');
  });

  it('flattens shared nav rows so the sidebar no longer renders every item as a bordered card with a boxed icon', () => {
    const html = renderToStaticMarkup(
      <AppSidebar pathname="/overview" t={key => `translated:${key}`} />
    );

    expect(html).toContain('data-shell-nav-item="entities"');
    expect(html).not.toContain('rounded-[2px] border px-3 py-1.5');
    expect(html).not.toContain('rounded-[2px] border transition-colors');
  });

  it('bounds the navigation scroll area so long menus do not create page-level footer whitespace', () => {
    const html = renderToStaticMarkup(
      <AppSidebar pathname="/alert/silence" t={key => `translated:${key}`} />
    );

    expect(html).toContain('data-app-sidebar-scroll-owner="bounded-sidebar-nav"');
    expect(html).toContain('flex h-full min-h-0 flex-col overflow-hidden');
    expect(html).toContain('lg:h-[calc(100vh-64px)]');
    expect(html).toContain('mt-1 min-h-0 flex-1 space-y-1 overflow-y-auto overflow-x-hidden');
  });
});
