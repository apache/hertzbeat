import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EntityDetailPage from './page';
import { createTranslatorMock } from '../../../test/i18n-test-helper';

const mockState = vi.hoisted(() => ({
  lastLoad: null as null | (() => Promise<unknown>),
  renderData: {
    entity: {
      entity: {
        id: 42,
        name: 'checkout-api',
        displayName: 'Checkout API',
        type: 'service',
        status: 'healthy',
        owner: 'platform',
        environment: 'prod',
        system: 'payments',
        description: 'Checkout service'
      }
    },
    evidenceSummary: {
      downMonitorCount: 1
    },
    monitorSummary: {
      totalBoundMonitors: 2
    },
    logSummary: {
      hintCount: 3,
      preferredQueryTitle: 'checkout errors'
    },
    traceSummary: {
      recentTraceCount: 4,
      recentErrorTraceCount: 1
    },
    nextActions: [
      {
        title: 'Open monitors',
        summary: 'Inspect abnormal monitors first.',
        actionLabel: 'Open monitors'
      }
    ]
  },
  searchParams: new URLSearchParams(),
  refresh: vi.fn(),
  push: vi.fn()
}));

const loadEntityDetail = vi.hoisted(() => vi.fn(async () => mockState.renderData));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  )
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: mockState.refresh,
    push: mockState.push
  }),
  useSearchParams: () => mockState.searchParams
}));

vi.mock('@/components/providers/i18n-provider', () => ({
  useI18n: () => ({
    t: createTranslatorMock()
  })
}));

vi.mock('@/components/workbench/client-workbench', () => ({
  ClientWorkbench: ({
    children,
    load
  }: {
    children: (data: any) => React.ReactNode;
    load: () => Promise<unknown>;
  }) => {
    mockState.lastLoad = load;
    return <div data-client-workbench="true">{children(mockState.renderData)}</div>;
  }
}));

vi.mock('@/components/pages/entity-detail-surface', () => ({
  EntityDetailSurface: ({ detail, routeContext }: any) => {
    const entity = detail.entity?.entity || {};
    return (
      <main
        data-entity-detail-surface="otlp-cold-entity-detail"
        data-entity-detail-style-baseline="hertzbeat-cold-matte"
        data-entity-detail-layout="full-width-workbench"
        data-entity-detail-route-monitor-id={routeContext?.monitorId || ''}
        data-entity-detail-route-time-range={routeContext?.timeRange || ''}
      >
        <header data-entity-detail-header="cold-compact-header">
          实体详情
          对象优先调查
          <div data-entity-detail-command-row="standard-equal-buttons">
            <span data-href="/entities">全部实体</span>
            <button>刷新</button>
            <span data-href={`/entities/${entity.id}/definition`}>编辑定义</span>
            <button>删除</button>
            <span data-href={`/entities/${entity.id}/edit`}>编辑</span>
          </div>
        </header>
        <div data-entity-detail-count-strip="cold-inline-counts" />
        <div data-entity-detail-signal-grid="cold-detail-grid">
          <section data-entity-detail-overview-panel="cold-overview-panel">上下文</section>
          <section data-entity-detail-related-panel="cold-related-panel">相关信号</section>
          <section data-entity-detail-next-panel="cold-next-panel">下一步</section>
          <section data-entity-detail-drilldown-panel="cold-drilldown-panel">高级入口</section>
        </div>
      </main>
    );
  }
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  buttonVariants: () => 'btn'
}));

vi.mock('@/lib/api-client', () => ({
  apiMessageDelete: vi.fn(),
  apiMessageGet: vi.fn()
}));

vi.mock('@/lib/entity-detail/controller', () => ({
  loadEntityDetail
}));

describe('EntityDetailPage', () => {
  beforeEach(() => {
    mockState.lastLoad = null;
    mockState.searchParams = new URLSearchParams();
    mockState.refresh.mockReset();
    mockState.push.mockReset();
    loadEntityDetail.mockClear().mockResolvedValue(mockState.renderData);
  });

  it('renders the cold full-width entity detail workbench without old Workbench side panels', async () => {
    const source = readFileSync(resolve(process.cwd(), 'app/entities/[entityId]/page.tsx'), 'utf8');
    const html = renderToStaticMarkup(<EntityDetailPage params={Promise.resolve({ entityId: '42' })} />);

    expect(html).toContain('data-entity-detail-surface="otlp-cold-entity-detail"');
    expect(html).toContain('data-entity-detail-style-baseline="hertzbeat-cold-matte"');
    expect(html).toContain('data-entity-detail-layout="full-width-workbench"');
    expect(html).toContain('data-entity-detail-header="cold-compact-header"');
    expect(html).toContain('data-entity-detail-command-row="standard-equal-buttons"');
    expect(html).toContain('data-entity-detail-count-strip="cold-inline-counts"');
    expect(html).toContain('data-entity-detail-signal-grid="cold-detail-grid"');
    expect(html).toContain('data-entity-detail-overview-panel="cold-overview-panel"');
    expect(html).toContain('data-entity-detail-related-panel="cold-related-panel"');
    expect(html).toContain('data-entity-detail-next-panel="cold-next-panel"');
    expect(html).toContain('data-entity-detail-drilldown-panel="cold-drilldown-panel"');
    expect(html).toContain('实体详情');
    expect(html).toContain('对象优先调查');
    expect(html).toContain('刷新');
    expect(html).toContain('编辑定义');
    expect(html).toContain('删除');
    expect(html).toContain('编辑');
    expect(html).toContain('/entities/42/definition');
    expect(html).not.toContain('Refresh');
    expect(html).not.toContain('Edit definition');
    expect(html).not.toContain('Next steps');
    expect(html).not.toContain('Review the summary first');
    expect(html).not.toContain('data-workbench-actions');
    expect(html).not.toContain('data-stage-section');
    expect(html).not.toContain('data-drawer-section');

    expect(source).toContain("from '@/components/pages/entity-detail-surface'");
    expect(source).not.toContain('window.confirm');
    expect(source).not.toContain('confirm(');
    expect(source).not.toContain("from '@/components/observability'");
    expect(source).not.toContain("from '@/components/workbench/workbench-page'");
    expect(source).not.toContain('WorkbenchPage');
    expect(source).not.toContain('StageSection');
    expect(source).not.toContain('DrawerSection');
    expect(source).not.toContain('ObservabilityStatusState');
    expect(source).not.toContain("from '@/components/workbench/primitives'");

    await mockState.lastLoad?.();

    expect(loadEntityDetail).toHaveBeenCalledWith(expect.any(Function), '42');
  });

  it('passes inherited time and monitor context into the entity detail surface', () => {
    mockState.searchParams = new URLSearchParams({
      timeRange: 'last-45m',
      start: '1713200000000',
      end: '1713202700000',
      refresh: '30',
      live: 'false',
      tz: 'Asia/Shanghai',
      source: 'monitor',
      monitorId: '632051474676992',
      monitorName: 'checkout-http',
      monitorApp: 'website',
      monitorInstance: 'example.com:443'
    });

    const html = renderToStaticMarkup(<EntityDetailPage params={Promise.resolve({ entityId: '42' })} />);

    expect(html).toContain('data-entity-detail-route-monitor-id="632051474676992"');
    expect(html).toContain('data-entity-detail-route-time-range="last-45m"');
  });
});
