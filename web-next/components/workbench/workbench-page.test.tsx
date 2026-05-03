import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { MetricGrid, RowList, WaterfallDemo, WorkbenchPage } from './workbench-page';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  )
}));

describe('workbench page delegation', () => {
  it('renders delegated workbench page layout', () => {
    const html = renderToStaticMarkup(
      <WorkbenchPage
        kicker="Logs"
        title="Log Workbench"
        subtitle="Shared layout"
        facts={[{ label: 'Total', value: '12' }]}
        actions={<button>Refresh</button>}
        main={<div>main-body</div>}
        side={<div>side-body</div>}
      />
    );

    expect(html).toContain('Log Workbench');
    expect(html).toContain('main-body');
    expect(html).toContain('side-body');
    expect(html).toContain('Refresh');
  });

  it('renders the shared operator tab strip when workspace tabs are provided', () => {
    const html = renderToStaticMarkup(
      <WorkbenchPage
        kicker="Entity catalog"
        title="Checkout API"
        subtitle="Shared operator shell"
        facts={[{ label: 'Workspace', value: 'entity/detail' }]}
        tone="operator"
        tabs={[
          { key: 'entity', label: 'Entity', href: '/entities/42', active: true },
          { key: 'monitors', label: 'Monitors', href: '/monitors?entityId=42' },
          { key: 'logs', label: 'Logs', href: '/log/manage?entityId=42' }
        ]}
        actions={<button>Refresh</button>}
        main={<div>main-body</div>}
        side={<div>side-body</div>}
      />
    );

    expect(html).toContain('data-observability-header="operator-sheet"');
    expect(html).toContain('/entities/42');
    expect(html).toContain('/monitors?entityId=42');
    expect(html).toContain('/log/manage?entityId=42');
    expect(html).toContain('main-body');
    expect(html).toContain('side-body');
  });

  it('delegates compact fact pills to the shared page header when requested', () => {
    const html = renderToStaticMarkup(
      <WorkbenchPage
        kicker="告警中心"
        title="集中查看并处理当前告警"
        subtitle="Shared operator shell"
        facts={[{ label: '全部告警组', value: '0' }]}
        factsVariant="pills"
        tone="operator"
        main={<div>main-body</div>}
      />
    );

    expect(html).toContain('data-observability-stat-grid="pills"');
    expect(html).toContain('全部告警组');
    expect(html).not.toContain('divide-x');
  });

  it('delegates the plain kicker variant for route headers', () => {
    const html = renderToStaticMarkup(
      <WorkbenchPage
        kicker="对象优先调查"
        kickerVariant="plain"
        title="导入实体定义"
        subtitle="支持一次导入多个定义。"
        facts={[]}
        tone="operator"
        main={<div>main-body</div>}
      />
    );

    expect(html).toContain('data-observability-kicker="plain"');
    expect(html).toContain('对象优先调查');
    expect(html).not.toContain('data-badge');
  });

  it('renders delegated metric grid', () => {
    const html = renderToStaticMarkup(
      <MetricGrid
        items={[
          { label: 'Latest', value: '2026-04-12 21:00' },
          { label: 'Coverage', value: '91%' }
        ]}
      />
    );

    expect(html).toContain('Latest');
    expect(html).toContain('2026-04-12 21:00');
    expect(html).toContain('Coverage');
    expect(html).toContain('91%');
  });

  it('renders shared row list entries with cold-workbench tokens', () => {
    const html = renderToStaticMarkup(
      <RowList rows={[{ title: 'checkout', copy: 'timeout on db', meta: 'trace-123' }]} />
    );

    expect(html).toContain('divide-[var(--ops-border-color)]');
    expect(html).toContain('text-[var(--ops-text-primary)]');
    expect(html).toContain('text-[var(--ops-text-secondary)]');
    expect(html).toContain('text-[var(--ops-text-tertiary)]');
    expect(html).not.toContain('text-white/62');
    expect(html).not.toContain('text-white/30');
  });

  it('renders delegated waterfall demo', () => {
    const html = renderToStaticMarkup(<WaterfallDemo />);

    expect(html).toContain('Span');
    expect(html).toContain('Timeline');
    expect(html).toContain('POST /checkout');
    expect(html).toContain('db.query orders');
  });
});
