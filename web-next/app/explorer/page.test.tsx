import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { createTranslatorMock } from '../../test/i18n-test-helper';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  )
}));

const replaceMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: replaceMock
  }),
  useSearchParams: () => new URLSearchParams('q=checkout&signal=trace')
}));

vi.mock('../../components/providers/i18n-provider', () => ({
  useI18n: () => ({
    t: createTranslatorMock({ locale: 'zh-CN' })
  })
}));

vi.mock('../../components/workbench/client-workbench', () => ({
  ClientWorkbench: ({ children }: { children: (data: any) => React.ReactNode }) =>
    children({
      rows: [
        {
          key: 'trace:trace-1',
          signalKey: 'trace',
          signalTone: 'trace',
          href: '/trace/manage?traceId=trace-1',
          signal: '链路',
          service: 'checkout',
          operation: 'POST /checkout',
          status: '错误',
          duration: '1.25s',
          timestamp: '2026/03/30 11:50:57'
        },
        {
          key: 'log:1:trace-1:none:0',
          signalKey: 'log',
          signalTone: 'log',
          href: '/log/manage?traceId=trace-1',
          signal: '日志',
          service: 'payment',
          operation: 'payment failed',
          status: 'ERROR',
          duration: '-',
          timestamp: '2026/03/30 11:50:58'
        }
      ],
      apiState: 'ready',
      apiOwner: 'trace-log-bff-query-api',
      query: {
        q: 'checkout',
        signal: 'trace'
      },
      sourceUrls: {
        traces: '/traces/list?pageIndex=0&pageSize=8&serviceName=checkout',
        logs: null,
        metrics: null
      },
      traceTotal: 1,
      logTotal: 1,
      metricTotal: 0
    })
}));

describe('explorer page', () => {
  it('renders the OTLP cold Workbench explorer baseline in Chinese', async () => {
    const { default: ExplorerPage } = await import('./page');
    const html = renderToStaticMarkup(<ExplorerPage />);

    expect(html).toContain('data-explorer-route="otlp-cold-workbench"');
    expect(html).toContain('data-explorer-style-baseline="hertzbeat-cold-matte"');
    expect(html).toContain('data-explorer-api-owner="trace-log-bff-query-api"');
    expect(html).toContain('data-explorer-api-state="ready"');
    expect(html).toContain('data-explorer-api-total="2"');
    expect(html).toContain('data-explorer-api-metric-total="0"');
    expect(html).toContain('data-explorer-query-state="checkout"');
    expect(html).toContain('data-explorer-signal-filter="trace"');
    expect(html).toContain('data-explorer-api-source="/traces/list?pageIndex=0&amp;pageSize=8&amp;serviceName=checkout|null|null"');
    expect(html).toContain('data-explorer-shared-frame="hertzbeat-ui"');
    expect(html).toContain('data-hz-ui="explorer-frame"');
    expect(html).toContain('data-hz-density="operator-compact"');
    expect(html).toContain('data-explorer-query-bar="cold-query-row"');
    expect(html).toContain('data-explorer-chart-band="cold-chart-band"');
    expect(html).toContain('data-explorer-result-table="cold-dense-table"');
    expect(html).toContain('data-explorer-detail-panel="cold-detail-panel"');
    expect(html).toContain('data-explorer-result-table-owner="hertzbeat-ui-data-table"');
    expect(html).toContain('data-explorer-signal-tone="trace"');
    expect(html).toContain('data-explorer-signal-tone="log"');
    expect(html).toContain('href="/trace/manage?traceId=trace-1"');
    expect(html).toContain('href="/log/manage?traceId=trace-1"');
    expect(html).toContain('查询工作台');
    expect(html).toContain('运行查询');
    expect(html).toContain('信号类型');
    expect(html).toContain('服务');
    expect(html).toContain('操作');
    expect(html).toContain('checkout');
    expect(html).toContain('保存视图');
    expect(html).toContain('创建告警');
    expect(html).toContain('加入仪表盘');
    expect(html).toContain('data-explorer-query-input="url-owned"');
    expect(html).toContain('data-explorer-signal-select="url-owned"');
    expect(html).toContain('data-explorer-query-url="/explorer?q=checkout&amp;signal=trace"');

    expect(html).not.toContain('signoz-');
    expect(html).not.toContain('Explorer');
    expect(html).not.toContain('Funnels');
    expect(html).not.toContain('Views');
    expect(html).not.toContain('Search and Filter based on resource attributes.');
    expect(html).not.toContain('Run Query');
    expect(html).not.toContain('Save this view');
    expect(html).not.toContain('Create an Alert');
    expect(html).not.toContain('Add to Dashboard');
  });

  it('keeps cross-signal handoffs without reverting to old cards', async () => {
    const { default: ExplorerPage } = await import('./page');
    const html = renderToStaticMarkup(<ExplorerPage />);

    expect(html).toContain('href="/log/manage"');
    expect(html).toContain('href="/trace/manage"');
    expect(html).toContain('href="/ingestion/otlp/metrics"');
    expect(html).toContain('href="/entities"');
  });

  it('does not keep the old placeholder surface owner', () => {
    const routeSource = readFileSync(resolve(process.cwd(), 'app/explorer/page.tsx'), 'utf8');
    const source = readFileSync(resolve(process.cwd(), 'app/explorer/explorer-page.tsx'), 'utf8');

    expect(routeSource).not.toMatch(/^['"]use client['"]/);
    expect(routeSource).toContain("import ExplorerPage from './explorer-page'");
    expect(source).not.toContain('OpsSurfacePage');
    expect(source).not.toContain('buildExplorerSurfaceConfig');
    expect(source).not.toContain('buildExplorerResultRows');
    expect(source).not.toContain('data-explorer-floating-actions');
    expect(source).toContain('data-explorer-route="otlp-cold-workbench"');
    expect(source).toContain('readExplorerQueryState');
    expect(source).toContain('buildExplorerRouteUrl');
    expect(source).toContain('loadExplorerReadData');
    expect(source).toContain('ClientWorkbench');
    expect(source).toContain('HzExplorerFrame');
    expect(source).toContain('HzDataTable');
  });
});
