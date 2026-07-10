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
          signal: 'Trace',
          service: 'checkout',
          operation: 'POST /checkout',
          status: 'Error',
          duration: '1.25s',
          timestamp: '2026/03/30 11:50:57'
        },
        {
          key: 'log:1:trace-1:none:0',
          signalKey: 'log',
          signalTone: 'log',
          href: '/log/manage?traceId=trace-1',
          signal: 'Logs',
          service: 'payment',
          operation: 'payment failed',
          status: 'ERROR',
          duration: '-',
          timestamp: '2026/03/30 11:50:58'
        },
        {
          key: 'metric:frontend:http.server.duration',
          signalKey: 'metric',
          signalTone: 'metric',
          href: '/ingestion/otlp/metrics?query=http.server.duration&serviceName=frontend',
          signal: 'Metrics',
          service: 'frontend',
          operation: 'http.server.duration',
          status: 'Normal',
          duration: '0.91',
          timestamp: '2026/03/30 11:50:59'
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
        metrics: '/ingestion/otlp/metrics/console?query=checkout&aggregation=avg&groupBy=service_name&timeRange=last-30m'
      },
      traceTotal: 1,
      logTotal: 1,
      metricTotal: 1
    })
}));

describe('explorer page', () => {
  it('renders the OTLP cold Workbench explorer baseline in Chinese', async () => {
    const t = createTranslatorMock({ locale: 'zh-CN' });
    const { default: ExplorerPage } = await import('./page');
    const html = renderToStaticMarkup(<ExplorerPage />);

    expect(html).toContain('data-explorer-route="otlp-hertzbeat-ui-workbench"');
    expect(html).toContain('data-explorer-style-baseline="hertzbeat-ui-matte"');
    expect(html).toContain('data-explorer-api-owner="trace-log-bff-query-api"');
    expect(html).toContain('data-explorer-api-state="ready"');
    expect(html).toContain('data-explorer-api-total="3"');
    expect(html).toContain('data-explorer-api-metric-total="1"');
    expect(html).toContain('data-explorer-query-state="checkout"');
    expect(html).toContain('data-explorer-signal-filter="trace"');
    expect(html).toContain(
      'data-explorer-api-source="/traces/list?pageIndex=0&amp;pageSize=8&amp;serviceName=checkout|null|/ingestion/otlp/metrics/console?query=checkout&amp;aggregation=avg&amp;groupBy=service_name&amp;timeRange=last-30m"'
    );
    expect(html).toContain('data-explorer-shared-frame="hertzbeat-ui"');
    expect(html).toContain('data-hz-ui="explorer-frame"');
    expect(html).toContain('data-hz-density="operator-compact"');
    expect(html).toContain('data-explorer-query-bar="hertzbeat-ui-query-row"');
    expect(html).toContain('data-explorer-chart-band="hertzbeat-ui-chart-band"');
    expect(html).toContain('data-explorer-result-table="hertzbeat-ui-dense-table"');
    expect(html).toContain('data-explorer-detail-panel="hertzbeat-ui-detail-panel"');
    expect(html).toContain('data-explorer-detail-active-row="trace:trace-1"');
    expect(html).toContain('data-explorer-result-table-owner="hertzbeat-ui-data-table"');
    expect(html).toContain('data-hz-row-clickable="true"');
    expect(html).toContain('data-hz-row-selected="true"');
    expect(html).toContain('data-explorer-result-row="trace:trace-1"');
    expect(html).toContain('data-explorer-result-row-selected="true"');
    expect(html).toContain('data-explorer-result-row="log:1:trace-1:none:0"');
    expect(html).toContain('data-explorer-result-row-selected="false"');
    expect(html).toContain('data-explorer-result-row="metric:frontend:http.server.duration"');
    expect(html).toContain('data-explorer-signal-tone="trace"');
    expect(html).toContain('data-explorer-signal-tone="log"');
    expect(html).toContain('data-explorer-signal-tone="metric"');
    expect(html).toContain('border-[#394a78] bg-[#121a2a] text-[#c7d7ff]');
    expect(html).not.toContain('border-[#315b49] bg-[#0f211b] text-[#8bd8ad]');
    expect(html).toContain('href="/trace/manage?traceId=trace-1"');
    expect(html).toContain('href="/log/manage?traceId=trace-1"');
    expect(html).toContain('href="/ingestion/otlp/metrics?query=http.server.duration&amp;serviceName=frontend"');
    expect(html).toContain(t('explorer.title'));
    expect(html).toContain(t('explorer.query.label'));
    expect(html).toContain(t('explorer.query.run'));
    expect(html).toContain(t('explorer.signal.aria'));
    expect(html).toContain(t('explorer.table.service'));
    expect(html).toContain(t('explorer.table.operation'));
    expect(html).toContain('checkout');
    expect(html).toContain(t('explorer.actions.save-view'));
    expect(html).toContain(t('explorer.actions.create-alert'));
    expect(html).toContain(t('explorer.actions.add-dashboard'));
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
    expect(source).toContain('data-explorer-route="otlp-hertzbeat-ui-workbench"');
    expect(source).toContain('readExplorerQueryState');
    expect(source).toContain('buildExplorerRouteUrl');
    expect(source).toContain('loadExplorerReadData');
    expect(source).toContain('ClientWorkbench');
    expect(source).toContain('const EXPLORER_WORKBENCH_LOAD_TIMEOUT_MS = 15_000');
    expect(source).toContain('loadTimeoutMs={EXPLORER_WORKBENCH_LOAD_TIMEOUT_MS}');
    expect(source).toContain('HzExplorerFrame');
    expect(source).toContain("skipLinkLabel={t('app.frame.skip-to-workbench')}");
    expect(source).toContain('HzDataTable');
  });

  it('keeps the empty explorer state actionable and localized for first-time users', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/explorer/explorer-page.tsx'), 'utf8');

    expect(source).toContain("queryLabel={t('explorer.query.label')}");
    expect(source).toContain("emptyLabel={t('explorer.empty.table-label')}");
    expect(source).toContain('data-explorer-empty-title="query-no-results"');
    expect(source).toContain('data-explorer-empty-next-steps="query-signal-ingest"');
    expect(source).toContain('data-explorer-detail-empty-copy="select-or-broaden-query"');
    expect(source).toContain("t('explorer.detail.empty-title')");
    expect(source).not.toContain("t('common.no-data')");
  });
});
