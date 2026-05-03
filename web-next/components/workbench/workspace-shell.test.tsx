import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { WorkspaceShell } from './workspace-shell';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  )
}));

describe('workspace shell', () => {
  it('renders the shared workspace header, tabs, and split rail layout', () => {
    const html = renderToStaticMarkup(
      <WorkspaceShell
        kicker="Logs"
        title="Logs Workbench"
        subtitle="Shared Angular-style shell"
        tabs={[
          { key: 'logs', label: 'Logs', href: '/log/manage', active: true },
          { key: 'traces', label: 'Traces', href: '/trace/manage', badge: '2' }
        ]}
        actions={<button>Refresh</button>}
        main={<div>main-body</div>}
        rail={<div>rail-body</div>}
        showRail
        allowRailCollapse
        railCollapsed={false}
        collapseRailLabel="Collapse Rail"
        expandRailLabel="Expand Rail"
      />
    );

    expect(html).toContain('data-workspace-shell="true"');
    expect(html).toContain('data-workspace-shell-header="true"');
    expect(html).toContain('data-workspace-shell-surface="true"');
    expect(html).toContain('data-workspace-shell-main="true"');
    expect(html).toContain('data-workspace-shell-rail="true"');
    expect(html).toContain('Logs Workbench');
    expect(html).toContain('Shared Angular-style shell');
    expect(html).toContain('main-body');
    expect(html).toContain('rail-body');
    expect(html).toContain('/trace/manage');
    expect(html).toContain('Collapse Rail');
    expect(html).toContain('rounded-[10px]');
    expect(html).toContain('xl:grid-cols-[minmax(0,1fr)_minmax(288px,320px)]');
  });

  it('hides the rail when collapsed', () => {
    const html = renderToStaticMarkup(
      <WorkspaceShell
        title="Trace Workbench"
        tabs={[{ key: 'traces', label: 'Traces', href: '/trace/manage', active: true }]}
        main={<div>trace-main</div>}
        rail={<div>trace-rail</div>}
        showRail
        allowRailCollapse
        railCollapsed
        collapseRailLabel="Collapse Rail"
        expandRailLabel="Expand Rail"
      />
    );

    expect(html).toContain('trace-main');
    expect(html).not.toContain('trace-rail');
    expect(html).toContain('Expand Rail');
  });

  it('keeps footer content inside the bounded workspace surface when a route enables the shared footer region', () => {
    const html = renderToStaticMarkup(
      <WorkspaceShell
        title="Overview"
        subtitle="Dashboard shell"
        main={<div>overview-main</div>}
        rail={<div>overview-rail</div>}
        footer={<div>recent-activity</div>}
        showRail
        showFooter
      />
    );

    expect(html).toContain('data-workspace-shell-surface-footer="true"');
    expect(html).toContain('recent-activity');
  });

  it('supports a wider dashboard rail split for routes that need current overview composition', () => {
    const html = renderToStaticMarkup(
      <WorkspaceShell
        title="Overview"
        main={<div>overview-main</div>}
        rail={<div>overview-rail</div>}
        showRail
        railWidth="wide"
      />
    );

    expect(html).toContain('data-workspace-shell-rail-width="wide"');
    expect(html).toContain('xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.92fr)]');
  });
});
