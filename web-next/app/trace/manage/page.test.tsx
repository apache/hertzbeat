import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTranslatorMock } from '../../../test/i18n-test-helper';
import TraceManagePage from './trace-manage-page';
import type { TraceManageRouteState, TraceQueryState } from '@/lib/trace-manage/query-state';

const apiMessageGet = vi.hoisted(() => vi.fn());

const mockState = vi.hoisted(() => ({
  searchParams: new URLSearchParams(),
  replace: vi.fn(),
  lastLoad: null as null | (() => Promise<unknown>),
  translatorOverrides: {} as Record<string, string>,
  translatorFallbackToKey: true
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => <a href={href} {...props}>{children}</a>
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mockState.replace
  }),
  useSearchParams: () =>
    ({
      get: (key: string) => mockState.searchParams.get(key)
    }) as { get(name: string): string | null }
}));

vi.mock('@/components/providers/i18n-provider', () => ({
  useI18n: () => ({
    t: createTranslatorMock({
      overrides: mockState.translatorOverrides,
      fallbackToKey: mockState.translatorFallbackToKey
    })
  })
}));

vi.mock('@/components/workbench/client-workbench', () => ({
  ClientWorkbench: ({
    children,
    load,
    loadingCopy,
    cacheKey,
    cacheSettledTtlMs
  }: {
    children: (data: any) => React.ReactNode;
    load: () => Promise<unknown>;
    loadingCopy?: string;
    cacheKey?: string;
    cacheSettledTtlMs?: number;
  }) => {
    mockState.lastLoad = load;
    return (
      <div data-client-workbench="true" data-loading-copy={loadingCopy} data-cache-key={cacheKey} data-cache-settled-ttl={cacheSettledTtlMs}>
        {children({
          overview: {
            totalTraceCount: 8,
            errorTraceCount: 2,
            latestObservedAt: 1713200000000,
            hasActiveTrace: true
          },
          list: {
            content: [
              {
                traceId: 'trace-123',
                rootSpanId: 'span-456',
                rootSpanName: 'POST /checkout',
                serviceName: 'checkout',
                serviceNamespace: 'payments',
                durationNanos: 420000000,
                status: 'ERROR',
                startTime: 1713200000000
              }
            ]
          }
        })}
      </div>
    );
  }
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, containerClassName: _containerClassName, ...props }: any) => <select {...props}>{children}</select>
}));

vi.mock('@/lib/api-client', () => ({
  apiMessageGet
}));

vi.mock('@/lib/signal-route-context', () => ({
  readEpochMillisRouteParam: (value: string | null | undefined) => {
    if (!value) return undefined;
    const trimmed = value.trim();
    return /^\d+$/.test(trimmed) ? trimmed : undefined;
  },
  copySignalRouteContextParams: (searchParams: { get(name: string): string | null }, target: URLSearchParams) => {
    ['entityId', 'entityName', 'returnTo', 'serviceName', 'serviceNamespace', 'environment', 'start', 'end', 'timeRange', 'source'].forEach(key => {
      const value = searchParams.get(key);
      if (value) target.set(key, value);
    });
  },
  appendSignalRouteContext: (target: URLSearchParams, routeContext: Record<string, string | undefined>) => {
    ['entityId', 'entityName', 'returnTo', 'serviceName', 'serviceNamespace', 'environment', 'start', 'end', 'timeRange', 'source'].forEach(key => {
      const value = routeContext[key];
      if (!value) return;
      if (key === 'returnTo') {
        const [path, query = ''] = value.split('?');
        const params = new URLSearchParams(query);
        params.delete('returnLabel');
        const queryString = params.toString();
        target.set(key, queryString ? `${path}?${queryString}` : path);
        return;
      }
      target.set(key, value);
    });
  },
  stripReturnLabelFromHref: (href?: string | null) => {
    if (!href) return undefined;
    const [path, query = ''] = href.split('?');
    const params = new URLSearchParams(query);
    params.delete('returnLabel');
    const queryString = params.toString();
    return queryString ? `${path}?${queryString}` : path;
  },
  buildSignalEntityContextRows: () => [
    { label: 'Current entity', value: 'checkout', meta: 'entityId 7' },
    { label: 'Current service', value: 'checkout', meta: 'payments' },
    { label: 'Current environment', value: 'prod', meta: 'environment' },
    { label: 'Time range', value: 'last-1h', meta: 'query window' },
    { label: 'Collection source', value: 'OTLP', meta: 'HertzBeat OTLP intake' }
  ],
  readSignalRouteContext: () => ({
    entityId: mockState.searchParams.get('entityId') || undefined,
    entityName: mockState.searchParams.get('entityName') || undefined,
    returnTo: mockState.searchParams.get('returnTo') || undefined,
    serviceName: mockState.searchParams.get('serviceName') || undefined,
    serviceNamespace: mockState.searchParams.get('serviceNamespace') || undefined,
    environment: mockState.searchParams.get('environment') || undefined,
    start: mockState.searchParams.get('start') || undefined,
    end: mockState.searchParams.get('end') || undefined,
    timeRange: mockState.searchParams.get('timeRange') || undefined,
    refresh: mockState.searchParams.get('refresh') || undefined,
    live: mockState.searchParams.get('live') || undefined,
    tz: mockState.searchParams.get('tz') || undefined,
    source: mockState.searchParams.get('source') || undefined,
    traceId: mockState.searchParams.get('traceId') || undefined,
    spanId: mockState.searchParams.get('spanId') || undefined
  })
}));

vi.mock('@/lib/format', () => ({
  formatDurationNanos: (value?: number | null) => (value == null ? '-' : `${value}ns`),
  formatTime: () => '2026-04-16 22:00:00'
}));

vi.mock('@/lib/trace-manage/query-state', () => ({
  buildTraceRouteUrl: (query: any) => {
    const params = new URLSearchParams();
    if (query.traceId) params.set('traceId', query.traceId);
    if (query.spanId) params.set('spanId', query.spanId);
    if (query.serviceName) params.set('serviceName', query.serviceName);
    if (query.errorOnly) params.set('errorOnly', 'true');
    const queryString = params.toString();
    return queryString ? `/trace/manage?${queryString}` : '/trace/manage';
  },
  buildTraceUrls: (query: any) => {
    const listParams = new URLSearchParams({ pageIndex: '0', pageSize: '8' });
    const overviewParams = new URLSearchParams();
    if (query.traceId) {
      listParams.set('traceId', query.traceId);
      overviewParams.set('traceId', query.traceId);
    }
    if (query.serviceName) {
      listParams.set('serviceName', query.serviceName);
      overviewParams.set('serviceName', query.serviceName);
    }
    if (query.errorOnly) {
      listParams.set('errorOnly', 'true');
      overviewParams.set('errorOnly', 'true');
    }
    return {
      listUrl: `/traces/list?${listParams.toString()}`,
      overviewUrl: overviewParams.toString() ? `/traces/stats/overview?${overviewParams.toString()}` : '/traces/stats/overview'
    };
  },
  queryStateFromParams: (searchParams: { get(name: string): string | null }) => ({
    traceId: searchParams.get('traceId') || '',
    spanId: searchParams.get('spanId') || '',
    serviceName: searchParams.get('serviceName') || '',
    errorOnly: searchParams.get('errorOnly') === 'true'
  })
}));

vi.mock('@/lib/trace-manage/view-model', () => ({
  buildSelectedSpanEventRows: () => [],
  buildSelectedSpanFacts: () => [],
  buildSelectedSpanLinkRows: () => [],
  buildTraceAttributionDiagnostics: (_detail: any, _span: any, routeContext: any) => [
    {
      key: 'hertzbeat.entity_id',
      label: 'hertzbeat.entity_id',
      value: routeContext?.entityId || '-',
      state: routeContext?.entityId ? 'present' : 'missing',
      meta: routeContext?.entityId ? 'Entity detail available' : 'Missing entity ID keeps entity detail disabled'
    },
    {
      key: 'hertzbeat.collector',
      label: 'hertzbeat.collector',
      value: routeContext?.collector || 'collector-local',
      state: 'present',
      meta: 'Collector source'
    },
    {
      key: 'hertzbeat.template',
      label: 'hertzbeat.template',
      value: routeContext?.template || 'hertzbeat-self',
      state: 'present',
      meta: 'Monitor template owner'
    }
  ],
  buildTraceExplorerRows: (items: any[], formatDurationNanos: any, formatTime: any) =>
    items.map(item => ({
      key: item.traceId,
      traceId: item.traceId,
      rootSpanId: item.rootSpanId || '-',
      name: item.rootSpanName || item.traceId,
      service: item.serviceName || '-',
      namespace: item.serviceNamespace || 'default',
      duration: formatDurationNanos(item.durationNanos),
      status: item.status || 'UNSET',
      statusTone: item.status === 'ERROR' ? 'danger' : item.status === 'OK' ? 'success' : undefined,
      startTime: formatTime(item.startTime)
    })),
  buildTraceWaterfallRows: () => [],
  buildTraceExplorerState: (_overview: any, listCount: number) => ({
    traceCountLabel: '8 traces',
    errorCountLabel: '2 errors',
    listCountLabel: `${listCount} rows`,
    latestObservedLabel: '2026-04-16 22:00:00',
    hasResults: listCount > 0
  }),
  buildTraceHandoffLinks: (_detail: unknown, _span: unknown, routeContext: any, options: any) => {
    const sharedParams = new URLSearchParams();
    if (options.traceId) sharedParams.set('traceId', options.traceId);
    if (options.spanId) sharedParams.set('spanId', options.spanId);
    if (options.serviceName) sharedParams.set('serviceName', options.serviceName);
    if (options.serviceNamespace) sharedParams.set('serviceNamespace', options.serviceNamespace);
    if (routeContext.environment) sharedParams.set('environment', routeContext.environment);
    return {
      intakeHref: `/ingestion/otlp?signal=traces&entityId=7&serviceName=${encodeURIComponent(options.serviceName || 'checkout')}&environment=prod&timeRange=last-1h&source=otlp`,
      logsHref: `/log/manage?${sharedParams.toString()}`,
      metricsHref: `/ingestion/otlp/metrics?${sharedParams.toString()}`,
      entitiesHref: `/entities?search=${encodeURIComponent(options.serviceName || 'checkout')}`,
      entityHref: `/entities/7?entityId=7&serviceName=${encodeURIComponent(options.serviceName || 'checkout')}&environment=prod&timeRange=last-1h&source=otlp`,
      alertHandlingHref: `/alert?status=firing&signal=traces&search=${encodeURIComponent(options.serviceName || 'checkout')}&entityId=7&serviceName=${encodeURIComponent(options.serviceName || 'checkout')}&environment=prod&timeRange=last-1h&source=otlp`,
      alertRulesHref: `/alert/setting?signal=traces&entityId=7&serviceName=${encodeURIComponent(options.serviceName || 'checkout')}&environment=prod&timeRange=last-1h&source=otlp`
    };
  }
}));

function stripReturnLabelFromRoute(href?: string | null) {
  if (!href) return undefined;
  const [path, query = ''] = href.split('?');
  const params = new URLSearchParams(query);
  params.delete('returnLabel');
  const queryString = params.toString();
  return queryString ? `${path}?${queryString}` : path;
}

function buildTraceManageRouteState(): TraceManageRouteState {
  const initialQuery: TraceQueryState = {
    traceId: mockState.searchParams.get('traceId') || '',
    spanId: mockState.searchParams.get('spanId') || '',
    serviceName: mockState.searchParams.get('serviceName') || '',
    errorOnly: mockState.searchParams.get('errorOnly') === 'true'
  };
  const start = mockState.searchParams.get('start');
  const end = mockState.searchParams.get('end');
  const hasDirtyTimeBound = (value: string | null) => Boolean(value?.trim() && !/^\d+$/.test(value.trim()));

  return {
    initialQuery,
    routeContext: {
      entityId: mockState.searchParams.get('entityId') || undefined,
      entityName: mockState.searchParams.get('entityName') || undefined,
      returnTo: stripReturnLabelFromRoute(mockState.searchParams.get('returnTo')),
      serviceName: mockState.searchParams.get('serviceName') || undefined,
      serviceNamespace: mockState.searchParams.get('serviceNamespace') || undefined,
      environment: mockState.searchParams.get('environment') || undefined,
      start: start && !hasDirtyTimeBound(start) ? start : undefined,
      end: end && !hasDirtyTimeBound(end) ? end : undefined,
      timeRange: mockState.searchParams.get('timeRange') || undefined,
      refresh: mockState.searchParams.get('refresh') || undefined,
      live: mockState.searchParams.get('live') || undefined,
      tz: mockState.searchParams.get('tz') || undefined,
      source: mockState.searchParams.get('source') || undefined,
      traceId: mockState.searchParams.get('traceId') || undefined,
      spanId: mockState.searchParams.get('spanId') || undefined
    },
    shouldCleanUrl: Boolean(
      mockState.searchParams.get('returnLabel') ||
        mockState.searchParams.get('returnTo')?.includes('returnLabel=') ||
        hasDirtyTimeBound(start) ||
        hasDirtyTimeBound(end)
    )
  };
}

function renderTraceManagePage(initialRouteState = buildTraceManageRouteState()) {
  return renderToStaticMarkup(<TraceManagePage initialRouteState={initialRouteState} />);
}

beforeEach(() => {
  mockState.searchParams = new URLSearchParams();
  mockState.replace.mockReset();
  mockState.lastLoad = null;
  mockState.translatorOverrides = {};
  mockState.translatorFallbackToKey = true;
  apiMessageGet.mockReset();
});

describe('trace manage page', () => {
  it('renders the OTLP cold trace workbench and keeps the filtered trace endpoints', async () => {
    mockState.searchParams = new URLSearchParams('traceId=trace-123&serviceName=checkout&errorOnly=true');
    apiMessageGet
      .mockResolvedValueOnce({ totalTraceCount: 8, errorTraceCount: 2, latestObservedAt: 1713200000000, hasActiveTrace: true })
      .mockResolvedValueOnce({ content: [] });

    const html = renderTraceManagePage();
    await mockState.lastLoad?.();

    expect(html).toContain('data-trace-manage-route="otlp-cold-trace-workbench"');
    expect(html).toContain('data-loading-copy="Loading trace workbench"');
    expect(html).toContain(
      'data-cache-key="trace-manage:/traces/list?pageIndex=0&amp;pageSize=8&amp;traceId=trace-123&amp;serviceName=checkout&amp;errorOnly=true|/traces/stats/overview?traceId=trace-123&amp;serviceName=checkout&amp;errorOnly=true|last-30m'
    );
    expect(html).toContain('data-cache-settled-ttl="10000"');
    expect(html).toContain('data-trace-manage-style-baseline="hertzbeat-cold-matte"');
    expect(html).toContain('data-trace-manage-panel-surface="header"');
    expect(html).toContain('data-trace-manage-header-padding-owner="hertzbeat-ui-panel-surface"');
    expect(html).toContain('data-hz-panel-surface-padding="header"');
    expect(html).toContain('data-trace-manage-header-layout="shared-header-actions"');
    expect(html).toContain('data-trace-manage-header-layout-owner="hertzbeat-ui-workbench-layout"');
    expect(html).toContain('data-hz-workbench-layout-variant="header-actions"');
    expect(html).toContain('data-trace-manage-action-row-layout-owner="hertzbeat-ui-action-group"');
    expect(html).toContain('data-hz-action-group-layout="full-end"');
    expect(html).toContain('data-trace-manage-header-action-icon="intake"');
    expect(html).toContain('data-trace-manage-header-action-icon="collector"');
    expect(html).toContain('data-trace-manage-header-action-icon="entity"');
    expect(html).toContain('data-trace-manage-header-action-icon="alerts"');
    expect(html).toContain('data-trace-manage-header-action-icon="templates"');
    expect(html).toContain('data-trace-manage-header-action-icon-owner="hertzbeat-ui-button-icon"');
    expect(html).toContain('data-hz-ui="disabled-action-shell"');
    expect(html).toContain('data-hz-disabled-action-shell-owner="hertzbeat-ui-disabled-action-shell"');
    expect(html).toContain('data-trace-manage-disabled-action-owner="hertzbeat-ui-disabled-action-shell"');
    expect(html).toContain('data-trace-manage-disabled-action-scope="header"');
    expect(html).toContain('data-trace-manage-query-bar="cold-query-row"');
    expect(html).toContain('data-trace-manage-panel-surface="query"');
    expect(html).toContain('data-trace-manage-panel-surface-padding-owner="hertzbeat-ui-panel-surface"');
    expect(html).toContain('data-hz-panel-surface-padding="query"');
    expect(html).toContain('data-trace-manage-query-search-frame="shared-search-field-frame"');
    expect(html).toContain('data-trace-manage-query-search-frame-owner="hertzbeat-ui-search-field-frame"');
    expect(html).toContain('data-hz-ui="search-field-frame"');
    expect(html).toContain('data-hz-search-field-frame-owner="hertzbeat-ui-search-field-frame"');
    expect(html).toContain('data-hz-search-field-frame-icon="true"');
    expect(html).toContain('data-trace-manage-query-search-icon="service"');
    expect(html).toContain('data-trace-manage-query-search-icon-owner="hertzbeat-ui-search-field-icon"');
    expect(html).toContain('data-hz-ui="search-field-icon"');
    expect(html).toContain('data-hz-search-field-icon-owner="hertzbeat-ui-search-field-icon"');
    expect(html).toContain('data-hz-search-field-icon-size="md"');
    expect(html).toContain('data-trace-manage-query-search-input-owner="hertzbeat-ui-input"');
    expect(html).toContain('data-hz-input-inset="search-icon"');
    expect(html).toContain('data-trace-manage-query-token-field="trace-id"');
    expect(html).toContain('data-trace-manage-query-token-field="span-id"');
    expect(html).toContain('data-trace-manage-query-token-field-owner="hertzbeat-ui-query-token-field"');
    expect(html).toContain('data-hz-ui="query-token-field"');
    expect(html).toContain('data-hz-query-token-field-owner="hertzbeat-ui-query-token-field"');
    expect(html).toContain('data-hz-query-token-field-width="trace-id"');
    expect(html).toContain('data-hz-query-token-field-width="span-id"');
    expect(html).toContain('data-hz-query-token-input-owner="hertzbeat-ui-query-token-field"');
    expect(html).toContain('data-trace-manage-query-status-select="shared-query-status-select"');
    expect(html).toContain('data-trace-manage-query-status-select-owner="hertzbeat-ui-query-status-select"');
    expect(html).toContain('data-hz-query-status-select-owner="hertzbeat-ui-query-status-select"');
    expect(html).toContain('data-hz-query-status-select-width="status"');
    expect(html).toContain('data-trace-manage-query-action-group="shared-query-action-group"');
    expect(html).toContain('data-trace-manage-query-action-group-owner="hertzbeat-ui-query-action-group"');
    expect(html).toContain('data-hz-query-action-group-owner="hertzbeat-ui-query-action-group"');
    expect(html).toContain('data-hz-query-action-group-kind="run-reset"');
    expect(html).toContain('data-trace-manage-query-action-icon="run"');
    expect(html).toContain('data-trace-manage-query-action-icon="reset"');
    expect(html).toContain('data-trace-manage-query-action-icon-owner="hertzbeat-ui-button-icon"');
    expect(html).toContain('data-hz-button-icon-owner="hertzbeat-ui-button-icon"');
    expect(html).toContain('data-trace-manage-chart-band="cold-chart-band"');
    expect(html).toContain('data-trace-manage-panel-surface="chart"');
    expect(html).toContain('data-trace-manage-chart-padding-owner="hertzbeat-ui-panel-surface"');
    expect(html).toContain('data-hz-panel-surface-padding="chart"');
    expect(html).toContain('data-trace-manage-chart-layout="shared-summary-trend"');
    expect(html).toContain('data-trace-manage-chart-layout-owner="hertzbeat-ui-workbench-layout"');
    expect(html).toContain('data-hz-workbench-layout-variant="summary-trend"');
    expect(html).toContain('data-trace-manage-table-detail-layout="shared-table-detail"');
    expect(html).toContain('data-trace-manage-table-detail-layout-owner="hertzbeat-ui-workbench-layout"');
    expect(html).toContain('data-hz-ui="workbench-layout"');
    expect(html).toContain('data-hz-workbench-layout-variant="table-detail"');
    expect(html).toContain('data-trace-manage-trace-table="cold-dense-trace-list"');
    expect(html).toContain('data-trace-manage-panel-surface-clip-owner="hertzbeat-ui-panel-surface"');
    expect(html).toContain('data-hz-panel-surface-clip="true"');
    expect(html).toContain('data-trace-manage-table-chrome-owner="hertzbeat-ui-data-table"');
    expect(html).toContain('data-hz-ui="data-table"');
    expect(html).toContain('data-trace-manage-start-cell-owner="hertzbeat-ui-data-cell-text"');
    expect(html).toContain('data-trace-manage-service-cell-owner="hertzbeat-ui-data-cell-text"');
    expect(html).toContain('data-trace-manage-duration-cell-owner="hertzbeat-ui-data-cell-text"');
    expect(html).toContain('data-trace-manage-trace-id-cell-owner="hertzbeat-ui-data-cell-text"');
    expect(html).toContain('data-trace-manage-row-action-owner="hertzbeat-ui-table-row-action-button"');
    expect(html).toContain('data-hz-table-row-action-owner="hertzbeat-ui-table-row-action-button"');
    expect(html).toContain('data-hz-table-row-action-width="root-span"');
    expect(html).toContain('data-hz-ui="data-cell-text"');
    expect(html).toContain('data-hz-data-cell-variant="timestamp"');
    expect(html).toContain('data-hz-data-cell-variant="identifier"');
    expect(html).toContain('data-hz-data-cell-width="trace-id"');
    expect(html).toContain('data-trace-manage-table-header-owner="hertzbeat-ui-panel-header"');
    expect(html).toContain('data-hz-ui="panel-header"');
    expect(html).toContain('data-trace-manage-table-count-badge-owner="hertzbeat-ui-status-badge"');
    expect(html).toContain('data-trace-manage-detail-panel="cold-detail-panel"');
    expect(html).toContain('data-trace-manage-panel-surface-clip-owner="hertzbeat-ui-panel-surface"');
    expect(html).toContain('data-trace-manage-detail-header-owner="hertzbeat-ui-panel-header"');
    expect(html).toContain('data-trace-manage-detail-body-layout="shared-detail-stack"');
    expect(html).toContain('data-trace-manage-detail-body-layout-owner="hertzbeat-ui-workbench-layout"');
    expect(html).toContain('data-hz-workbench-layout-variant="detail-stack"');
    expect(html).toContain('data-hz-panel-header-eyebrow="true"');
    expect(html).toContain('data-trace-manage-entity-context="hertzbeat-signal-entity-context"');
    expect(html).toContain('data-trace-manage-entity-context-owner="hertzbeat-ui-detail-rows"');
    expect(html).toContain('data-trace-manage-selected-evidence-owner="hertzbeat-ui-detail-rows"');
    expect(html).toContain('data-trace-manage-detail-facts-owner="hertzbeat-ui-detail-rows"');
    expect(html).not.toContain('data-trace-manage-hertzbeat-loop="collector-template-alert-loop"');
    expect(html).toContain('Traces Workbench');
    expect(html).toContain('Service name');
    expect(html).toContain('Error traces');
    expect(html).toContain('Trend band');
    expect(html).toContain('Recent traces');
    expect(html).toContain('Run query');
    expect(html).toContain('Filter traces by service, trace ID, span ID, and error state, then inspect trend, list, and detail evidence.');
    expect(html).toContain('/ingestion/otlp?signal=traces');
    expect(html).toContain('POST /checkout');
    expect(html).toContain('checkout');
    expect(html).toContain('ERROR');
    expect(html).toContain('data-trace-manage-status-tone="danger"');
    expect(html).toContain('Entity context');
    expect(html).toContain('data-trace-manage-attribution-diagnostics="hertzbeat-attribute-diagnostics"');
    expect(html).toContain('data-trace-manage-attribution-diagnostics-owner="hertzbeat-ui-attribute-diagnostics"');
    expect(html).toContain('data-hz-ui="attribute-diagnostics"');
    expect(html).toContain('Attribution diagnostics');
    expect(html).toContain('hertzbeat.entity_id');
    expect(html).toContain('Missing entity ID keeps entity detail disabled');
    expect(html).toContain('Current entity');
    expect(html).toContain('Collection source');
    expect(html).toContain('Entity detail');
    expect(html).toContain('Alert handling');
    expect(html).toContain('data-trace-manage-signal-handoff-hint="trace-log-metric-context"');
    expect(html).toContain('The current traceId, spanId, and service context carry into logs and metrics workbenches.');
    expect(html).toContain('data-trace-manage-selected-evidence="selected-trace-evidence"');
    expect(html).toContain('data-trace-manage-selected-evidence-owner="hertzbeat-ui-detail-rows"');
    expect(html).toContain('Trace evidence');
    expect(html).toContain('Trace status');
    expect(html).toContain('Start time');
    expect(html).toContain('Latest observed');
    expect(html).not.toContain('signoz-');
    expect(html).not.toContain('data-trace-manage-floating-actions');
    expect(html).not.toContain('Explorer');
    expect(html).not.toContain('Funnels');
    expect(html).not.toContain('Views');
    expect(html).not.toContain('Search and Filter based on resource attributes.');
    expect(html).not.toContain('Run Query');
    expect(html).not.toContain('Save this view');
    expect(html).not.toContain('Create an Alert');
    expect(html).not.toContain('Add to Dashboard');
    expect(apiMessageGet.mock.calls).toEqual([
      ['/traces/stats/overview?traceId=trace-123&serviceName=checkout&errorOnly=true'],
      ['/traces/list?pageIndex=0&pageSize=8&traceId=trace-123&serviceName=checkout&errorOnly=true']
    ]);
  }, 60000);

  it('renders stable trace query selectors for browser retirement smoke', async () => {
    mockState.searchParams = new URLSearchParams('traceId=trace-123&serviceName=checkout&errorOnly=true');

    const html = renderTraceManagePage();

    expect(html).toContain('data-trace-manage-trace-id-input="true"');
    expect(html).toContain('data-trace-manage-service-input="true"');
    expect(html).toContain('data-trace-manage-status-filter="true"');
    expect(html).toContain('data-trace-manage-reset-action="true"');
    expect(html).toContain('data-trace-manage-search-action="true"');
    expect(html).toContain('data-trace-manage-open-logs-action="true"');
    expect(html).toContain('data-trace-manage-query-bar="cold-query-row"');
    expect(html).toContain('data-trace-manage-query-control-stack="shared-inline-controls"');
    expect(html).toContain('data-trace-manage-query-control-stack-owner="hertzbeat-ui-control-stack"');
    expect(html).toContain('data-hz-control-stack-layout="inline-wrap"');
    expect(html).toContain('data-trace-manage-query-search-frame="shared-search-field-frame"');
    expect(html).toContain('data-trace-manage-query-search-frame-owner="hertzbeat-ui-search-field-frame"');
    expect(html).toContain('data-hz-search-field-frame-owner="hertzbeat-ui-search-field-frame"');
    expect(html).toContain('data-trace-manage-query-search-input-owner="hertzbeat-ui-input"');
    expect(html).toContain('data-hz-input-inset="search-icon"');
    expect(html).toContain('data-trace-manage-query-token-field-owner="hertzbeat-ui-query-token-field"');
    expect(html).toContain('data-hz-query-token-field-owner="hertzbeat-ui-query-token-field"');
    expect(html).toContain('data-trace-manage-query-status-select-owner="hertzbeat-ui-query-status-select"');
    expect(html).toContain('data-hz-query-status-select-owner="hertzbeat-ui-query-status-select"');
    expect(html).toContain('data-trace-manage-query-action-group-owner="hertzbeat-ui-query-action-group"');
    expect(html).toContain('data-hz-query-action-group-owner="hertzbeat-ui-query-action-group"');
    expect(html).toContain('data-trace-manage-chart-band="cold-chart-band"');
    expect(html).toContain('data-trace-manage-table-detail-layout="shared-table-detail"');
    expect(html).toContain('data-trace-manage-table-detail-layout-owner="hertzbeat-ui-workbench-layout"');
    expect(html).toContain('data-trace-manage-trace-table="cold-dense-trace-list"');
    expect(html).toContain('data-trace-manage-table-chrome-owner="hertzbeat-ui-data-table"');
    expect(html).toContain('data-trace-manage-detail-panel="cold-detail-panel"');
    expect(html).toContain('data-trace-manage-detail-footer-layout="shared-detail-footer"');
    expect(html).toContain('data-trace-manage-detail-footer-layout-owner="hertzbeat-ui-workbench-layout"');
    expect(html).toContain('data-hz-workbench-layout-variant="detail-footer"');
    expect(html).toContain('data-trace-manage-detail-footer-action-icon="entity"');
    expect(html).toContain('data-trace-manage-detail-footer-action-icon="alerts"');
    expect(html).toContain('data-trace-manage-detail-footer-action-icon="logs"');
    expect(html).toContain('data-trace-manage-detail-footer-action-icon="metrics"');
    expect(html).toContain('data-trace-manage-detail-footer-action-icon="entities"');
    expect(html).toContain('data-trace-manage-detail-footer-action-icon-owner="hertzbeat-ui-button-icon"');
  }, 15000);

  it('uses the shared narrow time rail in the top-right trace header with inherited route state visible', async () => {
    mockState.searchParams = new URLSearchParams(
      'traceId=trace-123&serviceName=checkout&timeRange=last-1h&start=1713200000000&end=1713203600000&refresh=30&live=false&tz=Asia%2FShanghai'
    );
    const source = readFileSync(resolve(process.cwd(), 'app/trace/manage/trace-manage-page.tsx'), 'utf8');

    const html = renderTraceManagePage();

    expect(source).toContain("import { buildTimeRangeControlLabels, TimeRangeControl } from '@/components/observability/time-range-control';");
    expect(source).toContain('labels={buildTimeRangeControlLabels(t)}');
    expect(source).toContain('buildTraceManageRoute(routeContext, query, appliedContext)');
    expect(source).toContain('const traceTimeRefreshKey = useMemo(');
    expect(source).toContain('traceTimeContext.timeRange');
    expect(source).toContain('traceTimeContext.refresh');
    expect(source).toContain('traceTimeContext.live');
    expect(source).toContain('traceTimeContext.tz');
    expect(source).toContain('`trace-manage:${traceUrls.listUrl}|${traceUrls.overviewUrl}|${traceTimeRefreshKey}`');
    expect(source).toContain('data-trace-manage-time-toolbar="top-right-corner"');
    expect(source).toContain('data-trace-manage-time-toolbar-owner="hertzbeat-ui-workbench-layout"');
    expect(source).toContain('variant="time-toolbar"');
    expect(source).toContain('data-trace-manage-time-control="shared-time-context-control"');
    expect(source).toContain('data-trace-manage-time-control-owner="hertzbeat-ui-control-stack"');
    expect(source).toContain('layout="end-inline"');
    expect(source).toContain('data-trace-manage-time-control-placement="top-right"');
    expect(source).toContain('data-trace-manage-time-control-visual="narrow-top-right-rail"');
    expect(source).toContain('data-trace-manage-time-control-fit="no-clipping"');
    expect(source).toContain('variant="narrow-rail"');
    expect(source).toContain('data-trace-manage-time-range-control-owner="hertzbeat-shared-time-range-control"');
    expect(source).toContain('showAbsoluteFields');
    expect(source).not.toContain('data-trace-manage-time-control="shared-time-context-control" className="min-w-[520px] flex-1"');
    expect(source).not.toContain('className="flex max-w-full justify-end"');
    expect(source).not.toContain('className="justify-end"');
    expect(source).not.toContain('className="ml-auto grid w-full min-w-0 max-w-[1120px] gap-2 xl:w-auto"');
    expect(source.indexOf('data-trace-manage-time-control="shared-time-context-control"')).toBeLessThan(
      source.indexOf('data-trace-manage-query-bar="cold-query-row"')
    );
    expect(html).toContain('data-trace-manage-time-toolbar="top-right-corner"');
    expect(html).toContain('data-trace-manage-time-toolbar-owner="hertzbeat-ui-workbench-layout"');
    expect(html).toContain('data-hz-workbench-layout-variant="time-toolbar"');
    expect(html).toContain('data-trace-manage-time-control="shared-time-context-control"');
    expect(html).toContain('data-trace-manage-time-control-owner="hertzbeat-ui-control-stack"');
    expect(html).toContain('data-hz-control-stack-layout="end-inline"');
    expect(html).toContain('data-trace-manage-time-control-placement="top-right"');
    expect(html).toContain('data-trace-manage-time-control-visual="narrow-top-right-rail"');
    expect(html).toContain('data-trace-manage-time-control-fit="no-clipping"');
    expect(html).toContain('data-time-range-control="hertzbeat-shared"');
    expect(html).toContain('data-time-range-control-visual="grafana-like-narrow-rail"');
    expect(html).toContain('data-time-range-control-layout="nowrap-top-right-rail"');
    expect(html).toContain('data-time-range-control-align="end"');
    expect(html).toContain('data-time-range-control-overflow="fit-without-scroll"');
    expect(html).toContain('data-trace-manage-time-range-control-owner="hertzbeat-shared-time-range-control"');
    expect(html).toContain('data-time-range-live-toggle="paused"');
    expect(html).toContain('data-trace-manage-time-refresh-action="true"');
    expect(html).toContain('value="last-1h"');
  }, 15000);

  it('keeps the entity return action and cross-signal handoffs aligned for traced entity context', async () => {
    mockState.searchParams = new URLSearchParams(
      'entityId=7&entityName=checkout&returnTo=%2Foverview&returnLabel=Overview&traceId=trace-123&spanId=span-456&serviceName=checkout&serviceNamespace=payments&environment=prod&start=1713200000000&end=1713203600000'
    );

    const html = renderTraceManagePage();

    expect(html).toContain('href="/overview"');
    expect(html).toContain('Return to source');
    expect(html).not.toContain('Overview');
    expect(html).toContain('data-trace-manage-return-action="true"');
    expect(html).toContain('/log/manage?traceId=trace-123');
    expect(html).toContain('/ingestion/otlp/metrics?traceId=trace-123');
    expect(html).toContain('/entities?search=checkout');
    expect(html).toContain('/entities/7?entityId=7');
    expect(html).toContain('/alert?status=firing&amp;signal=traces');
    expect(html).toContain('spanId=span-456');
    expect(html).toContain('serviceNamespace=payments');
    expect(html).toContain('environment=prod');
  }, 15000);

  it('does not keep the old Angular or external-product workbench owners inside the cold trace workbench', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/trace/manage/trace-manage-page.tsx'), 'utf8');

    expect(source).not.toContain('ThreeSignalDeskShell');
    expect(source).not.toContain('FactsStrip');
    expect(source).not.toContain('StageSection');
    expect(source).not.toContain("components/observability/data-table");
    expect(source).not.toContain('<DataTable');
    expect(source).not.toContain('DrawerSection');
    expect(source).not.toContain('signoz-');
    expect(source).not.toContain('data-trace-manage-floating-actions');
    expect(source).toContain('data-trace-manage-entity-context="hertzbeat-signal-entity-context"');
    expect(source).toContain('data-trace-manage-entity-context-owner="hertzbeat-ui-detail-rows"');
    expect(source).toContain('data-trace-manage-selected-evidence-owner="hertzbeat-ui-detail-rows"');
    expect(source).toContain('data-trace-manage-detail-facts-owner="hertzbeat-ui-detail-rows"');
    expect(source).toContain('buildTraceAttributionDiagnostics(null, null, routeContext, t)');
    expect(source).toContain('buildTraceAttributionDiagnostics(detail, selectedSpan, handoffRouteContext, t)');
    expect(source).toContain('data-trace-manage-attribution-diagnostics="hertzbeat-attribute-diagnostics"');
    expect(source).toContain('HzAttributeDiagnostics');
    expect(source).toContain('data-trace-manage-attribution-diagnostics-owner="hertzbeat-ui-attribute-diagnostics"');
    expect(source).toContain("'data-trace-manage-attribution-diagnostic-state': row.state");
    expect(source).toContain("t('trace.manage.attribution-diagnostics.title')");
    expect(source).toContain("t('trace.manage.attribution-diagnostics.present')");
    expect(source).toContain("t('trace.manage.attribution-diagnostics.missing')");
    expect(source).toContain('hertzbeat.entity_id');
    expect(source).toContain("t('trace.manage.route.entity-context.title')");
    expect(source).toContain("aria-label={t('trace.manage.route.entity-context.aria')}");
    expect(source).not.toContain('data-trace-manage-hertzbeat-loop="collector-template-alert-loop"');
    expect(source).toContain("t('trace.manage.route.action.collectors')");
    expect(source).toContain("t('trace.manage.route.action.templates')");
    expect(source).toContain("t('trace.manage.route.action.entity')");
    expect(source).toContain("t('trace.manage.route.action.alerts')");
    expect(source).toContain('HzActionGroup');
    expect(source).toContain('data-trace-manage-action-row="cold-workbench-actions"');
    expect(source).toContain('data-trace-manage-action-row-owner="hertzbeat-ui-action-group"');
    expect(source).toContain('data-trace-manage-action-row-layout-owner="hertzbeat-ui-action-group"');
    expect(source).toContain('layout="full-end"');
    expect(source).toContain('data-trace-manage-header-layout="shared-header-actions"');
    expect(source).toContain('data-trace-manage-header-layout-owner="hertzbeat-ui-workbench-layout"');
    expect(source).toContain('variant="header-actions"');
    expect(source).toContain('HzWorkbenchHeaderCopy');
    expect(source).toContain('data-trace-manage-header-copy="shared-workbench-header-copy"');
    expect(source).toContain('data-trace-manage-header-copy-owner="hertzbeat-ui-workbench-header-copy"');
    expect(source).toContain("eyebrow={t('trace.manage.route.kicker')}");
    expect(source).toContain("title={t('trace.manage.route.title')}");
    expect(source).toContain("copy={t('trace.manage.route.subtitle')}");
    expect(source).toContain('data-trace-manage-time-toolbar-owner="hertzbeat-ui-workbench-layout"');
    expect(source).toContain('variant="time-toolbar"');
    expect(source).toContain('data-trace-manage-time-control-owner="hertzbeat-ui-control-stack"');
    expect(source).toContain('layout="end-inline"');
    expect(source).toContain('data-trace-manage-time-range-control-owner="hertzbeat-shared-time-range-control"');
    expect(source).not.toContain('className="justify-end"');
    expect(source).toContain('data-trace-manage-header-action-icon-owner="hertzbeat-ui-button-icon"');
    expect(source).toContain('data-trace-manage-header-action-icon="collector"');
    expect(source).toContain('data-trace-manage-header-action-icon="templates"');
    expect(source).not.toContain('<Server className="h-4 w-4" aria-hidden="true" />');
    expect(source).not.toContain('<ListChecks className="h-4 w-4" aria-hidden="true" />');
    expect(source).toContain('data-trace-manage-query-search-input-owner="hertzbeat-ui-input"');
    expect(source).toContain('data-trace-manage-query-search-icon-owner="hertzbeat-ui-search-field-icon"');
    expect(source).toContain('inset="search-icon"');
    expect(source).toContain('data-trace-manage-query-action-icon-owner="hertzbeat-ui-button-icon"');
    expect(source).not.toContain('<Play className="h-4 w-4" aria-hidden="true" />');
    expect(source).not.toContain('<RotateCcw className="h-4 w-4" aria-hidden="true" />');
    expect(source).not.toContain('className="w-full pl-9"');
    expect(source).not.toContain('icon={<Search className="h-4 w-4" aria-hidden="true" />}');
    expect(source).not.toContain('className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start"');
    expect(source).not.toContain('<div className="min-w-0">');
    expect(source).not.toContain('<p className="mb-2 text-[12px] font-semibold tracking-[0.08em] text-[#8792a5]">');
    expect(source).not.toContain('<h1 className="text-[30px] font-semibold tracking-normal text-[#f4f7fb]">');
    expect(source).not.toContain('<p className="mt-3 max-w-[820px] text-[13px] leading-6 text-[#9ca7ba]">');
    expect(source).not.toContain('className="ml-auto grid w-full min-w-0 max-w-[1120px] gap-2 xl:w-auto"');
    expect(source).not.toContain('className="flex max-w-full justify-end"');
    expect(source).toContain('href={handoffLinks.alertHandlingHref}');
    expect(source).toContain('data-trace-manage-alert-context-hint="entity-trace-alert-handoff"');
    expect(source).toContain("t('trace.manage.route.handoff.alert-hint')");
    expect(source).toContain('data-trace-manage-empty-guidance="operator-no-data-guidance"');
    expect(source).toContain('data-trace-manage-empty-state-owner="hertzbeat-ui-empty-state"');
    expect(source).toContain('layout="table-panel"');
    expect(source).not.toContain('className="mx-auto h-[260px] max-w-[420px] border-y-0 text-left"');
    expect(source).toContain('data-trace-manage-table-chrome-owner="hertzbeat-ui-data-table"');
    expect(source).toContain('HzDataTable');
    expect(source).toContain('HzWorkbenchLayout');
    expect(source).toContain('data-trace-manage-chart-layout="shared-summary-trend"');
    expect(source).toContain('data-trace-manage-chart-layout-owner="hertzbeat-ui-workbench-layout"');
    expect(source).toContain('variant="summary-trend"');
    expect(source).toContain('data-trace-manage-detail-body-layout="shared-detail-stack"');
    expect(source).toContain('data-trace-manage-detail-body-layout-owner="hertzbeat-ui-workbench-layout"');
    expect(source).toContain('variant="detail-stack"');
    expect(source).toContain('data-trace-manage-detail-footer-layout="shared-detail-footer"');
    expect(source).toContain('data-trace-manage-detail-footer-layout-owner="hertzbeat-ui-workbench-layout"');
    expect(source).toContain('variant="detail-footer"');
    expect(source).toContain('data-trace-manage-detail-footer-action-icon-owner="hertzbeat-ui-button-icon"');
    expect(source).toContain('data-trace-manage-detail-footer-action-icon="metrics"');
    expect(source).toContain('data-trace-manage-detail-footer-action-icon="entities"');
    expect(source).toContain('variant="table-detail"');
    expect(source).toContain('data-trace-manage-table-detail-layout="shared-table-detail"');
    expect(source).toContain('data-trace-manage-table-detail-layout-owner="hertzbeat-ui-workbench-layout"');
    expect(source).toContain('HzPanelHeader');
    expect(source).toContain('data-trace-manage-table-header-owner="hertzbeat-ui-panel-header"');
    expect(source).toContain('data-trace-manage-table-count-badge-owner="hertzbeat-ui-status-badge"');
    expect(source).toContain('data-trace-manage-detail-header-owner="hertzbeat-ui-panel-header"');
    expect(source).toContain("eyebrow={t('trace.manage.route.detail.title')}");
    expect(source).toContain('HzEmptyState');
    expect(source).toContain("t('trace.manage.route.empty.copy')");
    expect(source).not.toContain('className="flex flex-wrap items-center justify-end gap-2"');
    expect(source).not.toContain('className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_330px]"');
    expect(source).not.toContain('className="grid gap-3 lg:grid-cols-[repeat(4,minmax(0,160px))_minmax(0,1fr)]"');
    expect(source).not.toContain('className="space-y-3 px-4 py-4"');
    expect(source).not.toContain('className="grid gap-2 border-t border-[#252b35] px-4 py-4"');
    expect(source).toContain('HzTableRowActionButton');
    expect(source).toContain('data-trace-manage-row-action-owner="hertzbeat-ui-table-row-action-button"');
    expect(source).toContain('width="root-span"');
    expect(source).not.toContain('className="max-w-[240px] justify-start truncate font-semibold"');
    expect(source).toContain('data-trace-manage-route="otlp-cold-trace-workbench"');
    expect(source).toContain('HzSignalWorkbenchShell');
    expect(source).toContain('data-trace-manage-shell-owner="hertzbeat-ui-signal-workbench-shell"');
    expect(source).not.toContain('className="min-h-[calc(100vh-56px)] bg-[#07090b] text-[#e8edf5]"');
    expect(source).not.toContain('<div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-6 py-6">');
  });

  it('opens trace details in a side waterfall modal instead of the inline route-level demo span band', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/trace/manage/trace-manage-page.tsx'), 'utf8');

    expect(source).toContain('TraceWaterfallDrawer');
    expect(source).toContain('loadTraceDetailBundle');
    expect(source).toContain('openTraceDetailDrawer');
    expect(source).toContain('function buildSelectedTraceReturnHref(');
    expect(source).toContain(
      'const selectedTraceReturnHref = buildSelectedTraceReturnHref(currentTraceReturnHref, detail, selectedSpan, handoffRouteContext);'
    );
    expect(source).toContain('logsReturnTo: selectedTraceReturnHref');
    expect(source).toContain('metricsReturnTo: selectedTraceReturnHref');
    expect(source).toContain('data-trace-manage-open-detail-action="side-waterfall-modal"');
    expect(source).toContain('data-trace-manage-detail-drawer="waterfall-side-modal"');
    expect(source).toContain('data-trace-manage-detail-drawer-owner="hertzbeat-ui-dialog-body-layout"');
    expect(source).toContain('data-trace-manage-drawer-body-layout="shared-waterfall-detail"');
    expect(source).toContain('data-trace-manage-drawer-body-layout-owner="hertzbeat-ui-dialog-body-layout"');
    expect(source).toContain('data-trace-manage-drawer-side-stack="selected-facts"');
    expect(source).toContain('data-trace-manage-drawer-side-stack-owner="hertzbeat-ui-dialog-body-layout"');
    expect(source).toContain('HzDialogBodyLayout');
    expect(source).toContain('variant="waterfall-detail"');
    expect(source).toContain('variant="side-stack"');
    expect(source).toContain('data-trace-manage-drawer-meta="shared-chip-group"');
    expect(source).toContain('data-trace-manage-drawer-meta-owner="hertzbeat-ui-toolbar-chips"');
    expect(source).toContain('data-trace-manage-drawer-meta-item="trace-id"');
    expect(source).toContain('data-trace-manage-drawer-meta-item="span-count"');
    expect(source).toContain('data-trace-manage-drawer-meta-item="duration"');
    expect(source).toContain('data-trace-manage-drawer-meta-item-owner="hertzbeat-ui-dialog-meta-item"');
    expect(source).toContain('HzChipGroup');
    expect(source).toContain('data-trace-manage-drawer-action-group-layout-owner="hertzbeat-ui-action-group"');
    expect(source).toContain('layout="full-end"');
    expect(source).toContain('HzDialogMetaItem');
    expect(source).not.toContain('className="h-6 max-w-[320px] font-mono text-[11px]"');
    expect(source).not.toContain('className="h-6 max-w-[180px] text-[11px]"');
    expect(source).not.toContain('className="h-6 max-w-[160px] text-[11px]"');
    expect(source).toContain('data-trace-manage-drawer-action-group="handoff-actions"');
    expect(source).toContain('data-trace-manage-drawer-action-group-owner="hertzbeat-ui-action-group"');
    expect(source).toContain('data-trace-manage-drawer-stage-stats="shared-stat-strip"');
    expect(source).toContain('data-trace-manage-drawer-stage-stats-owner="hertzbeat-ui-stat-strip"');
    expect(source).toContain('HzStatStrip');
    expect(source).toContain('data-trace-manage-drawer-stage-stat-owner="hertzbeat-ui-stat-cell"');
    expect(source).toContain('data-trace-manage-drawer-stage-stat={item.id}');
    expect(source).toContain('HzStatCell');
    expect(source).toContain('density="compact"');
    expect(source).not.toContain('className="min-h-[64px]"');
    expect(source).toContain('data-trace-manage-drawer-selected-facts-owner="hertzbeat-ui-detail-rows"');
    expect(source).toContain('ObservabilityWaterfall');
    expect(source).toContain('autoOpenedTraceDetailKeyRef');
    expect(source).toContain('requestedTraceId');
    expect(source).toContain('const traceEventCount = waterfallRows.reduce');
    expect(source).toContain("t('trace.manage.drawer.stat.events')");
    expect(source).toContain("t('trace.manage.drawer.link-prefix')");
    expect(source).toContain("t('trace.manage.drawer.event-prefix')");
    expect(source).toContain('data-trace-manage-event-detail-copy="span-event-not-span"');
    expect(source).toContain('data-trace-manage-event-detail-type="span-event"');
    expect(source).toContain('data-trace-manage-event-detail-owner="hertzbeat-ui-dialog-event-notice"');
    expect(source).toContain('HzDialogEventNotice');
    expect(source).toContain('HzDialogEventText');
    expect(source).toContain('data-trace-manage-event-detail-text-owner="hertzbeat-ui-dialog-event-text"');
    expect(source).not.toContain('className="border-x-0 border-b border-t-0 bg-transparent px-0 pb-2 pt-0"');
    expect(source).not.toContain('<span data-trace-manage-event-detail-copy="span-event-not-span">');
    expect(source).not.toContain('<span data-trace-manage-event-detail-meta="span-event-label">');
    expect(source).toContain('data-trace-manage-event-detail-meta="span-event-label"');
    expect(source).toContain('variant="hint"');
    expect(source).toContain("t('trace.manage.drawer.event-detail.copy')");
    expect(source).toContain("t('trace.manage.drawer.span-count'");
    expect(source).toContain("t('trace.manage.drawer.waterfall.span')");
    expect(source).toContain("t('trace.manage.drawer.waterfall.duration')");
    expect(source).toContain("t('trace.manage.drawer.waterfall.timeline')");
    expect(source).not.toContain('Link ·');
    expect(source).not.toContain('<Button type="button" variant="subtle" onClick={onClose}>');
    expect(source).not.toContain('data-trace-manage-span-band="cold-span-band"');
    expect(source).not.toContain("tone: 'bg-[#4566e8]'");
    expect(source).not.toContain("tone: 'bg-[#6b85d7]'");
    expect(source).not.toContain('className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(280px,.75fr)]"');
    expect(source).not.toContain('className="grid gap-3"');
    expect(source).not.toContain('className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--ops-text-secondary)]"');
    expect(source).not.toContain('className="flex flex-wrap justify-end gap-2"');
    expect(source).not.toContain('className="w-full justify-end"');
    expect(source).not.toContain('className="overflow-hidden"');
    expect(source).not.toContain('data-trace-manage-header="cold-compact-header" data-trace-manage-panel-surface="header" className="px-5 py-4"');
    expect(source).not.toContain('data-trace-manage-query-bar="cold-query-row" data-trace-manage-panel-surface="query" className="px-4 py-3"');
    expect(source).not.toContain('data-trace-manage-chart-band="cold-chart-band" data-trace-manage-panel-surface="chart" className="px-4 py-4"');
  });

  it('keeps missing-id trace handoffs visible but disabled with i18n hover guidance', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/trace/manage/trace-manage-page.tsx'), 'utf8');
    const messages = readFileSync(resolve(process.cwd(), 'lib/i18n-runtime-messages.ts'), 'utf8');

    expect(source).toContain("const missingTraceHandoffTitle = t('trace.manage.handoff.logs-disabled')");
    expect(source).toContain("const missingEntityHandoffTitle = t('trace.manage.handoff.entity-disabled')");
    expect(source).toContain('data-trace-manage-open-logs-action-disabled="missing-trace-id"');
    expect(source).toContain('data-trace-manage-entity-action-disabled="missing-entity-id"');
    expect(source).toContain("const canOpenEntity = handoffLinks.entityHref.startsWith('/entities/');");
    expect(source).toContain('HzDisabledActionShell');
    expect(source).toContain('data-trace-manage-disabled-action-owner="hertzbeat-ui-disabled-action-shell"');
    expect(source).toContain('data-trace-manage-disabled-action-scope="header"');
    expect(source).toContain('data-trace-manage-disabled-action-scope="drawer-footer"');
    expect(source).toContain('data-trace-manage-disabled-action-scope="detail-footer"');
    expect(source).toContain('title={missingTraceHandoffTitle}');
    expect(source).toContain('title={missingEntityHandoffTitle}');
    expect(source).not.toContain('<span className="inline-flex" title={missingTraceHandoffTitle}>');
    expect(source).not.toContain('<span className="inline-flex" title={missingEntityHandoffTitle}>');
    expect(messages).toContain("'trace.manage.handoff.logs-disabled'");
    expect(messages).toContain("'trace.manage.handoff.entity-disabled'");
  });

  it('keeps route-level actions on the cold-matte palette instead of bright blue demo buttons', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/trace/manage/trace-manage-page.tsx'), 'utf8');

    expect(source).toContain('data-trace-manage-search-action="true"');
    expect(source).toContain('HzControlStack');
    expect(source).toContain('data-trace-manage-query-control-stack="shared-inline-controls"');
    expect(source).toContain('data-trace-manage-query-control-stack-owner="hertzbeat-ui-control-stack"');
    expect(source).not.toContain('border-[#4f6df0]');
    expect(source).not.toContain('bg-[#4566e8]');
    expect(source).not.toContain('hover:bg-[#5574f4]');
  });
});
