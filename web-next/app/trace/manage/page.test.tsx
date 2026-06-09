// @vitest-environment jsdom

import React, { act } from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTranslatorMock } from '../../../test/i18n-test-helper';
import TraceManagePage from './trace-manage-page';
import type { TraceManageRouteState, TraceQueryState } from '@/lib/trace-manage/query-state';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const apiMessageGet = vi.hoisted(() => vi.fn());
const originalFetch = globalThis.fetch;

const mockState = vi.hoisted(() => ({
  searchParams: new URLSearchParams(),
  replace: vi.fn(),
  lastLoad: null as null | (() => Promise<unknown>),
  traceListOverride: null as null | Record<string, unknown>,
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
          list: mockState.traceListOverride || {
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
          },
          group: {
            groupBy: 'resource:service.version',
            groups: [
              {
                value: '1.2.3',
                traceCount: 12,
                errorTraceCount: 2,
                latencyAvgMs: 84.5,
                latencyP95Ms: 210
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
  isDashboardReturnContext: (href?: string | null) => href?.startsWith('/dashboard') || false,
  readSignalPanelEditContext: () => {
    if (mockState.searchParams.get('intent') !== 'edit-panel') return null;
    const dashboardKey = mockState.searchParams.get('dashboardKey') || undefined;
    const panelId = mockState.searchParams.get('panelId') || undefined;
    if (!dashboardKey || !panelId) return null;
    return {
      intent: 'edit-panel',
      dashboardKey,
      panelId,
      draftKey: mockState.searchParams.get('draftKey') || undefined,
      returnTo: mockState.searchParams.get('returnTo') || undefined,
      returnLabel: mockState.searchParams.get('returnLabel') || undefined
    };
  },
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

vi.mock('@/lib/trace-manage/query-state', () => {
  const defaultTraceTableColumns = ['start', 'service', 'root-span', 'duration', 'status', 'trace-id'];
  const normalizeTraceTableColumns = (columns?: string[]) => {
    const requested = new Set(columns?.length ? columns : defaultTraceTableColumns);
    requested.add('start');
    return defaultTraceTableColumns.filter(column => requested.has(column));
  };

  return {
  DEFAULT_TRACE_TABLE_COLUMNS: defaultTraceTableColumns,
  DEFAULT_TRACE_LIST_PAGE_SIZE: '8',
  DEFAULT_TRACE_LIST_PAGE_INDEX: '0',
  TRACE_LIST_PAGE_SIZE_OPTIONS: ['8', '20', '50', '100', '200'],
  TRACE_TABLE_COLUMN_KEYS: defaultTraceTableColumns,
  buildTraceRouteUrl: (query: any, options?: { view?: string }) => {
    const params = new URLSearchParams();
    if (query.traceId) params.set('traceId', query.traceId);
    if (query.spanId) params.set('spanId', query.spanId);
    if (query.serviceName) params.set('serviceName', query.serviceName);
    if (query.resourceFilter) params.set('resourceFilter', query.resourceFilter);
    if (query.attributeFilter) params.set('attributeFilter', query.attributeFilter);
    if (query.operationName) params.set('operationName', query.operationName);
    if (query.minDurationMs) params.set('minDurationMs', query.minDurationMs);
    if (query.maxDurationMs) params.set('maxDurationMs', query.maxDurationMs);
    if (query.groupBy) params.set('groupBy', query.groupBy);
    if (query.groupLimit) params.set('groupLimit', query.groupLimit);
    if (query.groupBy && query.groupOrder && query.groupOrder !== 'trace-count-desc') params.set('groupOrder', query.groupOrder);
    if (query.groupBy && query.groupMinCount) params.set('groupMinCount', query.groupMinCount);
    if (query.errorOnly) params.set('errorOnly', 'true');
    if (query.spanScope && query.spanScope !== 'root') params.set('spanScope', query.spanScope);
    if (query.listPageSize && query.listPageSize !== '8') params.set('listPageSize', query.listPageSize);
    if (query.listPageIndex && query.listPageIndex !== '0') params.set('listPageIndex', query.listPageIndex);
    const columns = normalizeTraceTableColumns(query.columns);
    if (columns.join(',') !== defaultTraceTableColumns.join(',')) params.set('columns', columns.join(','));
    if (options?.view && options.view !== 'list') params.set('view', options.view);
    const queryString = params.toString();
    return queryString ? `/trace/manage?${queryString}` : '/trace/manage';
  },
  buildTraceUrls: (query: any, routeContext: Record<string, string | undefined> = {}) => {
    const listPageSize = ['8', '20', '50', '100', '200'].includes(query.listPageSize) ? query.listPageSize : '8';
    const listPageIndex = /^\d+$/.test(query.listPageIndex || '') ? query.listPageIndex : '0';
    const listParams = new URLSearchParams({ pageIndex: listPageIndex, pageSize: listPageSize });
    const overviewParams = new URLSearchParams();
    if (query.traceId) {
      listParams.set('traceId', query.traceId);
      overviewParams.set('traceId', query.traceId);
    }
    if (query.serviceName) {
      listParams.set('serviceName', query.serviceName);
      overviewParams.set('serviceName', query.serviceName);
    }
    if (query.resourceFilter) {
      listParams.set('resourceFilter', query.resourceFilter);
      overviewParams.set('resourceFilter', query.resourceFilter);
    }
    if (query.attributeFilter) {
      listParams.set('attributeFilter', query.attributeFilter);
      overviewParams.set('attributeFilter', query.attributeFilter);
    }
    if (query.operationName) {
      listParams.set('operationName', query.operationName);
      overviewParams.set('operationName', query.operationName);
    }
    if (query.minDurationMs) {
      listParams.set('minDurationMs', query.minDurationMs);
      overviewParams.set('minDurationMs', query.minDurationMs);
    }
    if (query.maxDurationMs) {
      listParams.set('maxDurationMs', query.maxDurationMs);
      overviewParams.set('maxDurationMs', query.maxDurationMs);
    }
    if (query.errorOnly) {
      listParams.set('errorOnly', 'true');
      overviewParams.set('errorOnly', 'true');
    }
    listParams.set('spanScope', query.spanScope || 'root');
    overviewParams.set('spanScope', query.spanScope || 'root');
    ['entityId', 'serviceNamespace', 'environment', 'start', 'end'].forEach(key => {
      const value = routeContext[key];
      if (!value) return;
      listParams.set(key, value);
      overviewParams.set(key, value);
    });
    const groupByParams = new URLSearchParams(overviewParams);
    if (query.groupBy) groupByParams.set('groupBy', query.groupBy);
    if (query.groupLimit) groupByParams.set('limit', query.groupLimit);
    if (query.groupBy && query.groupOrder && query.groupOrder !== 'trace-count-desc') groupByParams.set('orderBy', query.groupOrder);
    if (query.groupBy && query.groupMinCount) groupByParams.set('minCount', query.groupMinCount);
    return {
      listUrl: `/traces/list?${listParams.toString()}`,
      overviewUrl: overviewParams.toString() ? `/traces/stats/overview?${overviewParams.toString()}` : '/traces/stats/overview',
      ...(query.groupBy ? { groupByUrl: `/traces/stats/group-by?${groupByParams.toString()}` } : {})
    };
  },
  queryStateFromParams: (searchParams: { get(name: string): string | null }) => ({
    traceId: searchParams.get('traceId') || '',
    spanId: searchParams.get('spanId') || '',
    serviceName: searchParams.get('serviceName') || '',
    resourceFilter: searchParams.get('resourceFilter') || '',
    attributeFilter: searchParams.get('attributeFilter') || '',
    operationName: searchParams.get('operationName') || '',
    minDurationMs: searchParams.get('minDurationMs') || '',
    maxDurationMs: searchParams.get('maxDurationMs') || '',
    groupBy: searchParams.get('groupBy') || '',
    groupLimit: searchParams.get('groupLimit') || '',
    groupOrder: ['error-count-desc', 'latency-p95-desc'].includes(searchParams.get('groupOrder') || '') ? searchParams.get('groupOrder') : undefined,
    groupMinCount: searchParams.get('groupMinCount') || '',
    errorOnly: searchParams.get('errorOnly') === 'true',
    spanScope: searchParams.get('spanScope') === 'all' ? 'all' : searchParams.get('spanScope') === 'entrypoint' ? 'entrypoint' : 'root',
    listPageSize: ['8', '20', '50', '100', '200'].includes(searchParams.get('listPageSize') || '') ? searchParams.get('listPageSize') || '8' : '8',
    listPageIndex: /^\d+$/.test(searchParams.get('listPageIndex') || '') ? searchParams.get('listPageIndex') || '0' : '0',
    columns: normalizeTraceTableColumns((searchParams.get('columns') || defaultTraceTableColumns.join(',')).split(',').filter(Boolean))
  })
  };
});

vi.mock('@/lib/trace-manage/view-model', () => ({
  buildSelectedSpanEventRows: () => [],
  buildSelectedSpanFacts: () => [],
  buildSelectedSpanLinkRows: () => [],
  buildTraceAttributeRows: () => [],
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
      durationMs: item.durationNanos == null ? '' : String(Math.ceil(item.durationNanos / 1_000_000)),
      status: item.status || 'UNSET',
      statusTone: item.status === 'ERROR' ? 'danger' : item.status === 'OK' ? 'success' : undefined,
      startTime: formatTime(item.startTime)
    })),
  buildTraceWaterfallRows: () => [],
  buildTraceAlertRuleDraft: (query: any, routeContext: any = {}) => ({
    name: query.serviceName || routeContext.serviceName ? `${query.serviceName || routeContext.serviceName} trace alert` : 'Trace alert',
    query: query.operationName ? `operationName=${query.operationName}` : '',
    queryType: 'traces'
  }),
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
    const serviceName = options.serviceName || 'checkout';
    const alertRulesParams = new URLSearchParams();
    alertRulesParams.set('signal', 'traces');
    alertRulesParams.set('entityId', '7');
    alertRulesParams.set('serviceName', serviceName);
    alertRulesParams.set('environment', 'prod');
    alertRulesParams.set('timeRange', 'last-1h');
    alertRulesParams.set('source', 'otlp');
    if (options.alertDraft?.name) alertRulesParams.set('alertName', options.alertDraft.name);
    if (options.alertDraft?.query) alertRulesParams.set('alertQuery', options.alertDraft.query);
    if (options.alertDraft?.queryType) alertRulesParams.set('alertQueryType', options.alertDraft.queryType);
    return {
      intakeHref: `/ingestion/otlp?signal=traces&entityId=7&serviceName=${encodeURIComponent(options.serviceName || 'checkout')}&environment=prod&timeRange=last-1h&source=otlp`,
      logsHref: `/log/manage?${sharedParams.toString()}`,
      metricsHref: `/ingestion/otlp/metrics?${sharedParams.toString()}`,
      entitiesHref: `/entities?search=${encodeURIComponent(options.serviceName || 'checkout')}`,
      entityHref: `/entities/7?entityId=7&serviceName=${encodeURIComponent(options.serviceName || 'checkout')}&environment=prod&timeRange=last-1h&source=otlp`,
      alertHandlingHref: `/alert?status=firing&signal=traces&search=${encodeURIComponent(options.serviceName || 'checkout')}&entityId=7&serviceName=${encodeURIComponent(options.serviceName || 'checkout')}&environment=prod&timeRange=last-1h&source=otlp`,
      alertRulesHref: `/alert/setting?${alertRulesParams.toString()}`
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

function normalizeTestTraceTableColumns(columns?: string[]) {
  const defaultColumns = ['start', 'service', 'root-span', 'duration', 'status', 'trace-id'];
  const requested = new Set(columns?.length ? columns : defaultColumns);
  requested.add('start');
  return defaultColumns.filter(column => requested.has(column)) as TraceQueryState['columns'];
}

function buildTraceManageRouteState(): TraceManageRouteState {
  const initialQuery: TraceQueryState = {
    traceId: mockState.searchParams.get('traceId') || '',
    spanId: mockState.searchParams.get('spanId') || '',
    serviceName: mockState.searchParams.get('serviceName') || '',
    resourceFilter: mockState.searchParams.get('resourceFilter') || '',
    attributeFilter: mockState.searchParams.get('attributeFilter') || '',
    operationName: mockState.searchParams.get('operationName') || '',
    minDurationMs: mockState.searchParams.get('minDurationMs') || '',
    maxDurationMs: mockState.searchParams.get('maxDurationMs') || '',
    groupBy: mockState.searchParams.get('groupBy') || '',
    groupLimit: mockState.searchParams.get('groupLimit') || '',
    groupOrder: ['error-count-desc', 'latency-p95-desc'].includes(mockState.searchParams.get('groupOrder') || '') ? mockState.searchParams.get('groupOrder') as TraceQueryState['groupOrder'] : undefined,
    groupMinCount: mockState.searchParams.get('groupMinCount') || '',
    errorOnly: mockState.searchParams.get('errorOnly') === 'true',
    spanScope:
      mockState.searchParams.get('spanScope') === 'all'
        ? 'all'
        : mockState.searchParams.get('spanScope') === 'entrypoint' || mockState.searchParams.get('spanScope') === 'entry'
          ? 'entrypoint'
          : 'root',
    listPageSize: ['8', '20', '50', '100', '200'].includes(mockState.searchParams.get('listPageSize') || '')
      ? mockState.searchParams.get('listPageSize') || '8'
      : '8',
    listPageIndex: /^\d+$/.test(mockState.searchParams.get('listPageIndex') || '')
      ? mockState.searchParams.get('listPageIndex') || '0'
      : '0',
    columns: normalizeTestTraceTableColumns((mockState.searchParams.get('columns') || '').split(',').filter(Boolean))
  };
  const start = mockState.searchParams.get('start');
  const end = mockState.searchParams.get('end');
  const hasDirtyTimeBound = (value: string | null) => Boolean(value?.trim() && !/^\d+$/.test(value.trim()));

  return {
    initialQuery,
    currentView:
      mockState.searchParams.get('view') === 'trace'
        ? 'trace'
        : mockState.searchParams.get('view') === 'time-series' || mockState.searchParams.get('view') === 'timeseries'
          ? 'time-series'
          : mockState.searchParams.get('view') === 'table'
            ? 'table'
            : 'list',
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

function renderInteractiveTraceManagePage(initialRouteState = buildTraceManageRouteState()) {
  interactionRoot?.render(<TraceManagePage initialRouteState={initialRouteState} />);
}

async function flushDashboardEditPromises() {
  for (let index = 0; index < 8; index += 1) {
    await Promise.resolve();
  }
}

beforeEach(() => {
  mockState.searchParams = new URLSearchParams();
  mockState.replace.mockReset();
  mockState.lastLoad = null;
  mockState.traceListOverride = null;
  mockState.translatorOverrides = {};
  mockState.translatorFallbackToKey = true;
  apiMessageGet.mockReset();
});

let interactionRoot: Root | null = null;
let interactionContainer: HTMLDivElement | null = null;

afterEach(() => {
  if (interactionRoot) {
    act(() => {
      interactionRoot?.unmount();
    });
  }
  interactionContainer?.remove();
  interactionRoot = null;
  interactionContainer = null;
  globalThis.fetch = originalFetch;
});

describe('trace manage page', () => {
  it('renders the OTLP cold trace workbench and keeps the filtered trace endpoints', async () => {
    mockState.searchParams = new URLSearchParams('traceId=trace-123&serviceName=checkout&resourceFilter=service.version%3D1.2.3&attributeFilter=http.route%20CONTAINS%20checkout&operationName=POST%20%2Fcheckout&minDurationMs=100&maxDurationMs=500&errorOnly=true');
    apiMessageGet
      .mockResolvedValueOnce({ totalTraceCount: 8, errorTraceCount: 2, latestObservedAt: 1713200000000, hasActiveTrace: true })
      .mockResolvedValueOnce({ content: [] });

    const html = renderTraceManagePage();
    const source = readFileSync(resolve(process.cwd(), 'app/trace/manage/trace-manage-page.tsx'), 'utf8');
    const messagesSource = readFileSync(resolve(process.cwd(), 'lib/i18n-runtime-messages.ts'), 'utf8');
    await mockState.lastLoad?.();

    expect(html).toContain('data-trace-manage-route="otlp-hertzbeat-ui-trace-workbench"');
    expect(html).toContain('data-loading-copy="Loading trace workbench"');
    expect(html).toContain(
      'data-cache-key="trace-manage:list:/traces/list?pageIndex=0&amp;pageSize=8&amp;traceId=trace-123&amp;serviceName=checkout&amp;resourceFilter=service.version%3D1.2.3&amp;attributeFilter=http.route+CONTAINS+checkout&amp;operationName=POST+%2Fcheckout&amp;minDurationMs=100&amp;maxDurationMs=500&amp;errorOnly=true&amp;spanScope=root|/traces/stats/overview?traceId=trace-123&amp;serviceName=checkout&amp;resourceFilter=service.version%3D1.2.3&amp;attributeFilter=http.route+CONTAINS+checkout&amp;operationName=POST+%2Fcheckout&amp;minDurationMs=100&amp;maxDurationMs=500&amp;errorOnly=true&amp;spanScope=root|no-group|last-30m'
    );
    expect(html).toContain('data-cache-settled-ttl="10000"');
    expect(html).toContain('data-trace-manage-style-baseline="hertzbeat-ui-matte"');
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
    expect(html).toContain('data-trace-manage-query-bar="hertzbeat-ui-query-row"');
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
    expect(source).toContain("placeholder={t('trace.manage.route.query.resource-filter.placeholder')}");
    expect(source).toContain("placeholder={t('trace.manage.route.query.attribute-filter.placeholder')}");
    expect(messagesSource).toContain("'trace.manage.route.query.resource-filter.placeholder': 'service.version=1.2.3, host.name CONTAINS checkout, k8s.pod.name EXISTS'");
    expect(messagesSource).toContain("'trace.manage.route.query.attribute-filter.placeholder': 'http.route CONTAINS checkout, db.system EXISTS, span.kind IN (\"server\", \"consumer\")'");
    expect(html).toContain('data-trace-manage-query-token-field-owner="hertzbeat-ui-query-token-field"');
    expect(html).toContain('data-hz-ui="query-token-field"');
    expect(html).toContain('data-hz-query-token-field-owner="hertzbeat-ui-query-token-field"');
    expect(html).toContain('data-hz-query-token-field-width="trace-id"');
    expect(html).toContain('data-hz-query-token-field-width="span-id"');
    expect(html).toContain('data-hz-query-token-input-owner="hertzbeat-ui-query-token-field"');
    expect(html).toContain('data-trace-manage-span-scope-select="shared-span-scope-select"');
    expect(html).toContain('data-trace-manage-span-scope-select-owner="hertzbeat-ui-select"');
    expect(html).toContain('data-hz-select-width="trace-span-scope"');
    expect(html).toContain('data-trace-manage-span-scope="root"');
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
    expect(html).toContain('data-trace-manage-quick-filter-controls="traces-quick-filters"');
    expect(html).toContain('data-trace-manage-quick-filter-controls-owner="hertzbeat-ui-control-stack"');
    expect(html).toContain('data-trace-manage-quick-filter="status"');
    expect(html).toContain('data-trace-manage-quick-filter="serviceName"');
    expect(html).toContain('data-trace-manage-quick-filter="operationName"');
    expect(html).toContain('data-trace-manage-quick-filter="minDurationMs"');
    expect(html).toContain('data-trace-manage-quick-filter="traceId"');
    expect(html).toContain('data-trace-manage-quick-filter-owner="hertzbeat-ui-button"');
    expect(html).toContain('data-trace-manage-quick-filter-value="error"');
    expect(html).toContain('data-trace-manage-quick-filter-value="checkout"');
    expect(html).toContain('data-trace-manage-quick-filter-value="POST /checkout"');
    expect(html).toContain('data-trace-manage-quick-filter-value="100"');
    expect(html).toContain('data-trace-manage-quick-filter-value="trace-123"');
    expect(html).toContain('data-trace-manage-quick-filter-active="true"');
    expect(html).toContain('data-trace-manage-view-switch="explorer-views"');
    expect(html).toContain('data-trace-manage-view-switch-layout="shared-view-switch"');
    expect(html).toContain('data-trace-manage-view-toggle-group="shared-action-group"');
    expect(html).toContain('data-trace-manage-view-option="list"');
    expect(html).toContain('data-trace-manage-view-option="trace"');
    expect(html).toContain('data-trace-manage-view-option="time-series"');
    expect(html).toContain('data-trace-manage-view-option="table"');
    expect(html).toContain('data-trace-manage-chart-band="hertzbeat-ui-chart-band"');
    expect(html).not.toContain('data-trace-manage-group-panel="hertzbeat-ui-trace-group-results"');
    expect(html).toContain('data-trace-manage-explorer-view="time-series"');
    expect(html).toContain('data-trace-manage-panel-surface="chart"');
    expect(html).toContain('data-trace-manage-explorer-view="time-series"');
    expect(html).toContain('data-trace-manage-explorer-view-owner="hertzbeat-ui-signal-time-series"');
    expect(html).toContain('data-trace-manage-chart-padding-owner="hertzbeat-ui-panel-surface"');
    expect(html).toContain('data-hz-panel-surface-padding="chart"');
    expect(html).toContain('data-trace-manage-chart-layout="shared-summary-trend"');
    expect(html).toContain('data-trace-manage-chart-layout-owner="hertzbeat-ui-workbench-layout"');
    expect(html).toContain('data-hz-workbench-layout-variant="chart-stack"');
    expect(html).toContain('data-trace-manage-summary-strip="inline-signal-summary"');
    expect(html).toContain('data-trace-manage-summary-strip-owner="hertzbeat-ui-signal-summary-strip"');
    expect(html).not.toContain('data-hz-stat-variant="tile"');
    expect(html).toContain('data-trace-manage-table-detail-layout="shared-table-detail"');
    expect(html).toContain('data-trace-manage-table-detail-layout-owner="hertzbeat-ui-workbench-layout"');
    expect(html).toContain('data-hz-ui="workbench-layout"');
    expect(html).toContain('data-hz-workbench-layout-variant="table-detail"');
    expect(html).toContain('data-trace-manage-trace-table="hertzbeat-ui-dense-trace-list"');
    expect(html).toContain('data-trace-manage-panel-surface-clip-owner="hertzbeat-ui-panel-surface"');
    expect(html).toContain('data-hz-panel-surface-clip="true"');
    expect(html).toContain('data-trace-manage-table-column-controls="customize-columns"');
    expect(html).toContain('data-trace-manage-table-column-controls-owner="hertzbeat-ui-control-stack"');
    expect(html).toContain('data-trace-manage-table-visible-columns="start,service,root-span,duration,status,trace-id"');
    expect(html).toContain('data-trace-manage-table-column-control-owner="hertzbeat-ui-checkbox"');
    expect(html).toContain('data-trace-manage-table-column="trace-id"');
    expect(html).toContain('data-trace-manage-table-chrome-owner="hertzbeat-ui-data-table"');
    expect(html).toContain('data-hz-ui="data-table"');
    expect(html).toContain('data-trace-manage-start-cell-owner="hertzbeat-ui-data-cell-text"');
    expect(html).toContain('data-trace-manage-service-cell-owner="hertzbeat-ui-button"');
    expect(html).toContain('data-trace-manage-table-service-filter-action="checkout"');
    expect(html).toContain('data-trace-manage-duration-cell-owner="hertzbeat-ui-data-cell-text"');
    expect(html).toContain('data-trace-manage-table-duration-filter-action="420"');
    expect(html).toContain('data-trace-manage-table-duration-filter-owner="hertzbeat-ui-button"');
    expect(html).toContain('Filter traces to minimum duration 420ms');
    expect(html).toContain('data-trace-manage-table-trace-id-filter-action="trace-123"');
    expect(html).toContain('data-trace-manage-table-trace-id-filter-owner="hertzbeat-ui-button"');
    expect(html).toContain('Filter traces to trace ID trace-123');
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
    expect(html).toContain('data-trace-manage-detail-panel="hertzbeat-ui-detail-panel"');
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
    expect(html).toContain('Trace time series');
    expect(html).toContain('Recent traces');
    expect(html).toContain('Run query');
    expect(html).toContain('Filter traces by service, trace ID, span ID, and error state, then inspect time series, list, and detail evidence.');
    expect(html).toContain('/ingestion/otlp?signal=traces');
    expect(html).toContain('POST /checkout');
    expect(html).toContain('checkout');
    expect(html).toContain('ERROR');
    expect(html).toContain('data-trace-manage-status-tone="danger"');
    expect(html).toContain('data-trace-manage-table-status-filter-action="ERROR"');
    expect(html).toContain('data-trace-manage-table-status-filter-owner="hertzbeat-ui-button"');
    expect(html).toContain('Filter traces to status ERROR');
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
    expect(html).toContain('Create alert');
    expect(html).toContain('/alert/setting?signal=traces');
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
      ['/traces/stats/overview?traceId=trace-123&serviceName=checkout&resourceFilter=service.version%3D1.2.3&attributeFilter=http.route+CONTAINS+checkout&operationName=POST+%2Fcheckout&minDurationMs=100&maxDurationMs=500&errorOnly=true&spanScope=root', { signal: expect.any(AbortSignal) }],
      ['/traces/list?pageIndex=0&pageSize=8&traceId=trace-123&serviceName=checkout&resourceFilter=service.version%3D1.2.3&attributeFilter=http.route+CONTAINS+checkout&operationName=POST+%2Fcheckout&minDurationMs=100&maxDurationMs=500&errorOnly=true&spanScope=root', { signal: expect.any(AbortSignal) }]
    ]);
  }, 60000);

  it('loads and renders trace group-by results when the route has an active groupBy', async () => {
    mockState.searchParams = new URLSearchParams('serviceName=checkout&resourceFilter=service.version%3D1.2.3&attributeFilter=http.route%20CONTAINS%20checkout&groupBy=resource%3Aservice.version&groupLimit=7&groupOrder=latency-p95-desc&groupMinCount=5');
    apiMessageGet
      .mockResolvedValueOnce({ totalTraceCount: 8, errorTraceCount: 2, latestObservedAt: 1713200000000, hasActiveTrace: true })
      .mockResolvedValueOnce({ content: [] })
      .mockResolvedValueOnce({
        groupBy: 'resource:service.version',
        groups: [
          {
            value: '1.2.3',
            traceCount: 12,
            errorTraceCount: 2,
            latencyAvgMs: 84.5,
            latencyP95Ms: 210
          }
        ]
      });

    const html = renderTraceManagePage();
    await mockState.lastLoad?.();

    expect(html).toContain('data-cache-key="trace-manage:list:');
    expect(html).toContain('/traces/stats/group-by?serviceName=checkout&amp;resourceFilter=service.version%3D1.2.3&amp;attributeFilter=http.route+CONTAINS+checkout&amp;spanScope=root&amp;groupBy=resource%3Aservice.version&amp;limit=7&amp;orderBy=latency-p95-desc&amp;minCount=5');
    expect(html).toContain('data-trace-manage-group-panel="hertzbeat-ui-trace-group-results"');
    expect(html).toContain('data-trace-manage-group-panel-owner="hertzbeat-ui-panel-surface"');
    expect(html).toContain('data-trace-manage-group-by="resource:service.version"');
    expect(html).toContain('data-trace-manage-group-limit-input="true"');
    expect(html).toContain('data-trace-manage-group-limit-input-owner="hertzbeat-ui-input"');
    expect(html).toContain('data-trace-manage-group-order-select="true"');
    expect(html).toContain('data-trace-manage-group-order-select-owner="hertzbeat-ui-select"');
    expect(html).toContain('data-trace-manage-group-min-count-input="true"');
    expect(html).toContain('data-trace-manage-group-min-count-input-owner="hertzbeat-ui-input"');
    expect(html).toContain('data-trace-manage-group-table="hertzbeat-ui-trace-group-table"');
    expect(html).toContain('data-trace-manage-group-table-owner="hertzbeat-ui-data-table"');
    expect(html).toContain('Trace groups');
    expect(html).toContain('Grouped by resource:service.version');
    expect(html).toContain('1 groups');
    expect(html).toContain('1.2.3');
    expect(html).toContain('12');
    expect(html).toContain('84.5ms');
    expect(html).toContain('210ms');
    expect(apiMessageGet.mock.calls).toEqual([
      ['/traces/stats/overview?serviceName=checkout&resourceFilter=service.version%3D1.2.3&attributeFilter=http.route+CONTAINS+checkout&spanScope=root', { signal: expect.any(AbortSignal) }],
      ['/traces/list?pageIndex=0&pageSize=8&serviceName=checkout&resourceFilter=service.version%3D1.2.3&attributeFilter=http.route+CONTAINS+checkout&spanScope=root', { signal: expect.any(AbortSignal) }],
      ['/traces/stats/group-by?serviceName=checkout&resourceFilter=service.version%3D1.2.3&attributeFilter=http.route+CONTAINS+checkout&spanScope=root&groupBy=resource%3Aservice.version&limit=7&orderBy=latency-p95-desc&minCount=5', { signal: expect.any(AbortSignal) }]
    ]);
  }, 15000);

  it('filters trace group result values back into the query route', async () => {
    mockState.searchParams = new URLSearchParams('view=list&groupBy=resource:service.version');
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      renderInteractiveTraceManagePage();
      await Promise.resolve();
    });

    const resourceValueAction = interactionContainer.querySelector(
      '[data-trace-manage-group-filter-action="resource:service.version"][data-trace-manage-group-filter-value="1.2.3"]'
    ) as HTMLButtonElement | null;
    expect(resourceValueAction).toBeTruthy();
    expect(resourceValueAction?.getAttribute('data-trace-manage-group-filter-owner')).toBe('hertzbeat-ui-button');
    mockState.replace.mockClear();

    await act(async () => {
      resourceValueAction?.click();
      await Promise.resolve();
    });

    expect(String(mockState.replace.mock.calls[0]?.[0])).toContain('resourceFilter=service.version%3D1.2.3');
    expect(String(mockState.replace.mock.calls[0]?.[0])).toContain('groupBy=resource%3Aservice.version');
  }, 15000);

  it('filters trace attribute group result values back into the attribute filter route', async () => {
    mockState.searchParams = new URLSearchParams('view=list&groupBy=attribute:http.route');
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      renderInteractiveTraceManagePage();
      await Promise.resolve();
    });

    const attributeValueAction = interactionContainer.querySelector(
      '[data-trace-manage-group-filter-action="attribute:http.route"][data-trace-manage-group-filter-value="1.2.3"]'
    ) as HTMLButtonElement | null;
    expect(attributeValueAction).toBeTruthy();
    expect(attributeValueAction?.getAttribute('data-trace-manage-group-filter-owner')).toBe('hertzbeat-ui-button');
    mockState.replace.mockClear();

    await act(async () => {
      attributeValueAction?.click();
      await Promise.resolve();
    });

    expect(String(mockState.replace.mock.calls[0]?.[0])).toContain('attributeFilter=http.route%3D1.2.3');
    expect(String(mockState.replace.mock.calls[0]?.[0])).toContain('groupBy=attribute%3Ahttp.route');
  }, 15000);

  it('saves and restores the current trace explorer query view from shared UI controls', async () => {
    window.localStorage.removeItem('hertzbeat.trace-manage.saved-query-views');
    mockState.searchParams = new URLSearchParams(
      'view=table&serviceName=checkout&resourceFilter=service.version%3D1.2.3&operationName=POST%20%2Fcheckout&minDurationMs=100&maxDurationMs=500&errorOnly=true&environment=prod&spanScope=entrypoint&columns=service,duration,trace-id'
    );
    const savedViewRequests: Array<{ path: string; method: string; body?: Record<string, unknown> }> = [];
    let serverSavedViews: Record<string, unknown>[] = [];
    globalThis.fetch = vi.fn(async (input, init) => {
      const path = String(input);
      const method = String(init?.method || 'GET').toUpperCase();
      const body = init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : undefined;
      savedViewRequests.push({ path, method, body });
      if (path.endsWith('/api/signal/saved-view/traces') && method === 'GET') {
        return new Response(JSON.stringify({ code: 0, data: serverSavedViews }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      if (path.endsWith('/api/signal/saved-view') && method === 'PUT') {
        if (body) {
          serverSavedViews = [body, ...serverSavedViews.filter(view => view.viewKey !== body.viewKey)];
        }
        return new Response(JSON.stringify({ code: 0, data: body }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      if (path.includes('/api/signal/saved-view/traces/') && method === 'DELETE') {
        const viewKey = decodeURIComponent(path.split('/').pop() || '');
        serverSavedViews = serverSavedViews.filter(view => view.viewKey !== viewKey);
        return new Response(JSON.stringify({ code: 0, data: null }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return new Response(JSON.stringify({ code: 1, msg: `Unexpected request ${method} ${path}` }), { status: 500 });
    }) as typeof fetch;
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      renderInteractiveTraceManagePage();
      await flushDashboardEditPromises();
    });

    const savedViewPanel = interactionContainer.querySelector('[data-trace-manage-saved-views="route-query-views"]') as HTMLElement | null;
    expect(savedViewPanel).toBeTruthy();
    expect(savedViewPanel?.getAttribute('data-trace-manage-saved-views-owner')).toBe('hertzbeat-ui-panel-surface');
    expect(savedViewPanel?.getAttribute('data-trace-manage-saved-view-persistence')).toBe('server-first');
    expect(savedViewPanel?.getAttribute('data-trace-manage-saved-view-persistence-owner')).toBe('hertzbeat-api');
    expect(savedViewPanel?.getAttribute('data-trace-manage-saved-view-storage-key')).toBe('hertzbeat.trace-manage.saved-query-views');

    const persistenceCopy = interactionContainer.querySelector('[data-trace-manage-saved-view-persistence-copy="server-first"]') as HTMLElement | null;
    expect(persistenceCopy?.textContent).toContain(createTranslatorMock()('trace.manage.saved-view.persistence.server'));

    const saveAction = interactionContainer.querySelector('[data-trace-manage-saved-view-action="save-current"]') as HTMLButtonElement | null;
    expect(saveAction).toBeTruthy();
    expect(saveAction?.getAttribute('data-trace-manage-saved-view-action-owner')).toBe('hertzbeat-ui-button');

    const clipboardWrites: string[] = [];
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn((value: string) => {
        clipboardWrites.push(value);
        return Promise.resolve();
      }) }
    });
    const copyAction = interactionContainer.querySelector('[data-trace-manage-saved-view-copy-action="current"]') as HTMLButtonElement | null;
    expect(copyAction).toBeTruthy();
    expect(copyAction?.getAttribute('data-trace-manage-saved-view-copy-owner')).toBe('hertzbeat-ui-button');
    const dashboardPanelDraftAction = interactionContainer.querySelector('[data-trace-manage-dashboard-panel-draft-action="add-current"]') as HTMLButtonElement | null;
    expect(dashboardPanelDraftAction).toBeTruthy();
    expect(dashboardPanelDraftAction?.getAttribute('data-trace-manage-dashboard-panel-draft-action-owner')).toBe('hertzbeat-ui-button');

    await act(async () => {
      copyAction?.click();
      await Promise.resolve();
    });

    expect(clipboardWrites[0]).toContain('/trace/manage?serviceName=checkout');
    expect(clipboardWrites[0]).toContain('operationName=POST+%2Fcheckout');
    expect(clipboardWrites[0]).toContain('spanScope=entrypoint');
    expect(clipboardWrites[0]).toContain('columns=start%2Cservice%2Cduration%2Ctrace-id');
    expect(clipboardWrites[0]).toContain('view=table');

    await act(async () => {
      saveAction?.click();
      await flushDashboardEditPromises();
    });

    const savedViews = JSON.parse(window.localStorage.getItem('hertzbeat.trace-manage.saved-query-views') || '[]');
    expect(savedViews).toHaveLength(1);
    expect(savedViews[0]?.label).toBe('POST /checkout');
    expect(savedViews[0]?.description).toContain('table');
    expect(savedViews[0]?.description).toContain('POST /checkout');
    expect(savedViews[0]?.description).toContain('entrypoint');
    expect(savedViews[0]?.description).toContain('service,duration,trace-id');
    expect(savedViews[0]?.route).toContain('/trace/manage?serviceName=checkout');
    expect(savedViews[0]?.route).toContain('resourceFilter=service.version%3D1.2.3');
    expect(savedViews[0]?.route).toContain('operationName=POST+%2Fcheckout');
    expect(savedViews[0]?.route).toContain('minDurationMs=100');
    expect(savedViews[0]?.route).toContain('maxDurationMs=500');
    expect(savedViews[0]?.route).toContain('errorOnly=true');
    expect(savedViews[0]?.route).toContain('spanScope=entrypoint');
    expect(savedViews[0]?.route).toContain('columns=start%2Cservice%2Cduration%2Ctrace-id');
    expect(savedViews[0]?.route).toContain('view=table');
    expect(savedViews[0]?.route).toContain('environment=prod');
    const saveRequest = savedViewRequests.find(request => request.method === 'PUT' && request.body?.route === savedViews[0]?.route);
    expect(saveRequest?.path).toBe('/api/signal/saved-view');
    expect(saveRequest?.body).toEqual(expect.objectContaining({
      signal: 'traces',
      viewKey: savedViews[0]?.id,
      querySnapshot: savedViews[0]?.route,
      payload: expect.stringContaining('createdAt')
    }));
    expect(interactionContainer.querySelector('[data-trace-manage-saved-views="route-query-views"]')?.getAttribute('data-trace-manage-saved-view-persistence')).toBe('server-first');

    const renameSavedViewAction = interactionContainer.querySelector('[data-trace-manage-saved-view-rename-action]') as HTMLButtonElement | null;
    expect(renameSavedViewAction).toBeTruthy();
    expect(renameSavedViewAction?.getAttribute('data-trace-manage-saved-view-rename-owner')).toBe('hertzbeat-ui-button');

    await act(async () => {
      renameSavedViewAction?.click();
      await Promise.resolve();
    });

    const renameInput = interactionContainer.querySelector('[data-trace-manage-saved-view-rename-input]') as HTMLInputElement | null;
    expect(renameInput).toBeTruthy();
    expect(renameInput?.getAttribute('data-trace-manage-saved-view-rename-input-owner')).toBe('hertzbeat-ui-input');

    await act(async () => {
      renameInput!.value = 'Checkout trace failures';
      renameInput!.dispatchEvent(new Event('input', { bubbles: true }));
      await Promise.resolve();
    });

    const renameSaveAction = interactionContainer.querySelector('[data-trace-manage-saved-view-rename-save-action]') as HTMLButtonElement | null;
    expect(renameSaveAction).toBeTruthy();
    expect(renameSaveAction?.getAttribute('data-trace-manage-saved-view-rename-save-owner')).toBe('hertzbeat-ui-button');

    await act(async () => {
      renameSaveAction?.click();
      await flushDashboardEditPromises();
    });

    const renamedViews = JSON.parse(window.localStorage.getItem('hertzbeat.trace-manage.saved-query-views') || '[]');
    expect(renamedViews).toHaveLength(1);
    expect(renamedViews[0]?.label).toBe('Checkout trace failures');
    expect(renamedViews[0]?.route).toBe(savedViews[0]?.route);

    mockState.searchParams = new URLSearchParams(
      'view=time-series&serviceName=billing&resourceFilter=service.version%3D2.0.0&operationName=GET%20%2Fbilling&minDurationMs=250&maxDurationMs=900&environment=stage&groupBy=resource%3Aservice.version&groupLimit=7&groupOrder=latency-p95-desc&groupMinCount=5&spanScope=all&columns=start,service,status'
    );
    await act(async () => {
      interactionRoot?.unmount();
      interactionContainer.innerHTML = '';
      interactionRoot = createRoot(interactionContainer);
      renderInteractiveTraceManagePage();
      await flushDashboardEditPromises();
    });

    const updateSavedViewAction = interactionContainer.querySelector('[data-trace-manage-saved-view-update-action]') as HTMLButtonElement | null;
    expect(updateSavedViewAction).toBeTruthy();
    expect(updateSavedViewAction?.getAttribute('data-trace-manage-saved-view-update-owner')).toBe('hertzbeat-ui-button');

    await act(async () => {
      updateSavedViewAction?.click();
      await flushDashboardEditPromises();
    });

    const updatedViews = JSON.parse(window.localStorage.getItem('hertzbeat.trace-manage.saved-query-views') || '[]');
    expect(updatedViews).toHaveLength(1);
    expect(updatedViews[0]?.label).toBe('Checkout trace failures');
    expect(updatedViews[0]?.route).not.toBe(savedViews[0]?.route);
    expect(updatedViews[0]?.route).toContain('/trace/manage?serviceName=billing');
    expect(updatedViews[0]?.route).toContain('resourceFilter=service.version%3D2.0.0');
    expect(updatedViews[0]?.route).toContain('operationName=GET+%2Fbilling');
    expect(updatedViews[0]?.route).toContain('minDurationMs=250');
    expect(updatedViews[0]?.route).toContain('maxDurationMs=900');
    expect(updatedViews[0]?.route).toContain('view=time-series');
    expect(updatedViews[0]?.route).toContain('environment=stage');
    expect(updatedViews[0]?.route).toContain('groupBy=resource%3Aservice.version');
    expect(updatedViews[0]?.route).toContain('groupLimit=7');
    expect(updatedViews[0]?.route).toContain('groupOrder=latency-p95-desc');
    expect(updatedViews[0]?.route).toContain('groupMinCount=5');
    expect(updatedViews[0]?.route).toContain('spanScope=all');
    expect(updatedViews[0]?.route).toContain('columns=start%2Cservice%2Cstatus');
    expect(updatedViews[0]?.description).toContain('resource:service.version');
    expect(updatedViews[0]?.description).toContain('7');
    expect(updatedViews[0]?.description).toContain('latency-p95-desc');
    expect(updatedViews[0]?.description).toContain('5');
    expect(updatedViews[0]?.description).toContain('all');
    expect(updatedViews[0]?.description).toContain('start,service,status');

    const savedViewAction = interactionContainer.querySelector('[data-trace-manage-saved-view-select-action]') as HTMLButtonElement | null;
    expect(savedViewAction).toBeTruthy();
    expect(savedViewAction?.getAttribute('data-trace-manage-saved-view-select-owner')).toBe('hertzbeat-ui-button');
    mockState.replace.mockClear();

    await act(async () => {
      savedViewAction?.click();
      await Promise.resolve();
    });

    const restoredRoute = String(mockState.replace.mock.calls[0]?.[0]);
    expect(restoredRoute).toContain('/trace/manage?serviceName=billing');
    expect(restoredRoute).toContain('resourceFilter=service.version%3D2.0.0');
    expect(restoredRoute).toContain('operationName=GET+%2Fbilling');
    expect(restoredRoute).toContain('minDurationMs=250');
    expect(restoredRoute).toContain('maxDurationMs=900');
    expect(restoredRoute).toContain('spanScope=all');
    expect(restoredRoute).toContain('columns=start%2Cservice%2Cstatus');
    expect(restoredRoute).toContain('view=time-series');
    expect(restoredRoute).toContain('environment=stage');
    expect(restoredRoute).toContain('groupBy=resource%3Aservice.version');
    expect(restoredRoute).toContain('groupLimit=7');
    expect(restoredRoute).toContain('groupOrder=latency-p95-desc');

    const deleteSavedViewAction = interactionContainer.querySelector('[data-trace-manage-saved-view-delete-action]') as HTMLButtonElement | null;
    expect(deleteSavedViewAction).toBeTruthy();
    expect(deleteSavedViewAction?.getAttribute('data-trace-manage-saved-view-delete-owner')).toBe('hertzbeat-ui-button');

    await act(async () => {
      deleteSavedViewAction?.click();
      await flushDashboardEditPromises();
    });

    expect(JSON.parse(window.localStorage.getItem('hertzbeat.trace-manage.saved-query-views') || '[]')).toHaveLength(0);
    expect(savedViewRequests.some(request => request.method === 'DELETE' && request.path.includes('/api/signal/saved-view/traces/'))).toBe(true);
    expect(interactionContainer.querySelector('[data-trace-manage-saved-views="route-query-views"]')?.getAttribute('data-trace-manage-saved-view-persistence')).toBe('server-first');
  }, 15000);

  it('updates the originating dashboard widget when saving traces in panel edit mode', async () => {
    mockState.searchParams = new URLSearchParams(
      'intent=edit-panel&dashboardKey=signals-overview&panelId=trace-errors&draftKey=trace-draft-errors&returnTo=%2Fdashboard%3Fdashboard%3Dsignals-overview&returnLabel=Signals%20overview&view=table&serviceName=checkout&resourceFilter=service.version%3D1.2.3&operationName=POST%20%2Fcheckout&minDurationMs=100&maxDurationMs=500&errorOnly=true&environment=prod&spanScope=entrypoint&columns=service,duration,trace-id'
    );
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      renderInteractiveTraceManagePage();
      await Promise.resolve();
    });

    const dashboardPanelDraftAction = interactionContainer.querySelector('[data-trace-manage-dashboard-panel-draft-action="update-current"]') as HTMLButtonElement | null;
    expect(dashboardPanelDraftAction).toBeTruthy();
    expect(dashboardPanelDraftAction?.getAttribute('data-trace-manage-dashboard-panel-draft-action-mode')).toBe('edit-panel');
    expect(dashboardPanelDraftAction?.getAttribute('data-trace-manage-dashboard-panel-draft-action-dashboard')).toBe('signals-overview');
    expect(dashboardPanelDraftAction?.getAttribute('data-trace-manage-dashboard-panel-draft-action-panel')).toBe('trace-errors');
    const timeSeriesViewAction = interactionContainer.querySelector('[data-trace-manage-view-option="time-series"]') as HTMLButtonElement | null;
    expect(timeSeriesViewAction).toBeTruthy();
    mockState.replace.mockClear();

    await act(async () => {
      timeSeriesViewAction?.click();
      await Promise.resolve();
    });

    const timeSeriesRoute = String(mockState.replace.mock.calls.at(-1)?.[0]);
    expect(timeSeriesRoute).toContain('view=time-series');
    expect(timeSeriesRoute).toContain('intent=edit-panel');
    expect(timeSeriesRoute).toContain('dashboardKey=signals-overview');
    expect(timeSeriesRoute).toContain('panelId=trace-errors');
    expect(timeSeriesRoute).toContain('draftKey=trace-draft-errors');
    expect(timeSeriesRoute).toContain('returnTo=%2Fdashboard%3Fdashboard%3Dsignals-overview');
    expect(timeSeriesRoute).toContain('returnLabel=Signals+overview');
    const savedDashboards: unknown[] = [];
    globalThis.fetch = vi.fn(async (input, init) => {
      const path = String(input);
      const method = String(init?.method || 'GET').toUpperCase();
      if (path.includes('/api/signal/dashboard-panel-draft') && method === 'PUT') {
        return new Response(JSON.stringify({ code: 0, data: JSON.parse(String(init?.body)) }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      if (path.endsWith('/api/signal/dashboard') && method === 'GET') {
        return new Response(JSON.stringify({
          code: 0,
          data: [{
            dashboardKey: 'signals-overview',
            title: 'Signals overview',
            description: 'Signals',
            tags: 'traces',
            layout: JSON.stringify([{ i: 'trace-errors', x: 0, y: 0, w: 6, h: 4 }]),
            widgets: JSON.stringify([{
              id: 'trace-errors',
              draftKey: 'trace-draft-errors',
              signal: 'traces',
              title: 'Old trace errors',
              visualization: 'trace',
              route: '/trace/manage?serviceName=old',
              querySnapshot: '/trace/manage?serviceName=old'
            }]),
            panelMap: JSON.stringify({ 'trace-errors': 'trace-draft-errors' })
          }]
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (path.endsWith('/api/signal/dashboard') && method === 'PUT') {
        const dashboard = JSON.parse(String(init?.body));
        savedDashboards.push(dashboard);
        return new Response(JSON.stringify({ code: 0, data: dashboard }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return new Response(JSON.stringify({ code: 1, msg: `Unexpected request ${method} ${path}` }), { status: 500 });
    }) as typeof fetch;

    await act(async () => {
      dashboardPanelDraftAction?.click();
      await flushDashboardEditPromises();
    });

    const draftRequest = vi.mocked(globalThis.fetch).mock.calls.find(call =>
      String(call[0]).includes('/api/signal/dashboard-panel-draft')
    );
    const draftBody = JSON.parse(String(draftRequest?.[1]?.body));
    expect(draftBody).toEqual(expect.objectContaining({
      signal: 'traces',
      draftKey: 'trace-draft-errors',
      visualization: 'table',
      querySnapshot: expect.stringContaining('/trace/manage?serviceName=checkout')
    }));
    expect(draftBody.route).toContain('operationName=POST+%2Fcheckout');
    expect(JSON.parse(draftBody.payload).dashboardPanelEdit).toEqual(expect.objectContaining({
      intent: 'edit-panel',
      dashboardKey: 'signals-overview',
      panelId: 'trace-errors',
      draftKey: 'trace-draft-errors',
      returnTo: '/dashboard?dashboard=signals-overview',
      returnLabel: 'Signals overview'
    }));
    expect(savedDashboards).toHaveLength(1);
    const savedDashboard = savedDashboards[0] as { widgets: string; panelMap: string };
    const savedWidget = JSON.parse(savedDashboard.widgets)[0];
    expect(savedWidget).toEqual(expect.objectContaining({
      id: 'trace-errors',
      draftKey: 'trace-draft-errors',
      signal: 'traces',
      visualization: 'table',
      route: expect.stringContaining('serviceName=checkout')
    }));
    expect(savedWidget.route).toContain('operationName=POST+%2Fcheckout');
    expect(JSON.parse(savedWidget.payload).dashboardPanelEdit).toEqual(expect.objectContaining({
      dashboardKey: 'signals-overview',
      panelId: 'trace-errors'
    }));
    expect(JSON.parse(savedDashboard.panelMap)).toEqual({ 'trace-errors': 'trace-draft-errors' });
    const dashboardPanelDraftStatus = interactionContainer.querySelector('[data-trace-manage-dashboard-panel-draft-status="saved"]') as HTMLElement | null;
    expect(dashboardPanelDraftStatus?.getAttribute('data-trace-manage-dashboard-panel-draft-status-mode')).toBe('edit-panel');
    expect(dashboardPanelDraftStatus?.textContent).toContain(createTranslatorMock()('trace.manage.dashboard-panel-draft.update-saved'));
  }, 15000);

  it('downloads trace rows in bounded pages with the selected format and visible columns from a shared UI action', async () => {
    mockState.searchParams = new URLSearchParams(
      'view=table&serviceName=checkout&operationName=POST%20%2Fcheckout&minDurationMs=100&errorOnly=true&environment=prod&spanScope=entrypoint&columns=service,root-span,trace-id'
    );
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);
    const firstExportPage = Array.from({ length: 1000 }, (_, index) => ({
      traceId: `trace-export-${index}`,
      rootSpanId: `span-export-${index}`,
      rootSpanName: `POST /checkout ${index}`,
      serviceName: 'checkout-worker',
      serviceNamespace: 'payments',
      durationNanos: 420000000 + index,
      status: 'OK',
      startTime: 1713200000000 + index
    }));
    apiMessageGet
      .mockResolvedValueOnce({
        content: firstExportPage,
        totalElements: 1001,
        pageIndex: 0,
        pageSize: 1000
      })
      .mockResolvedValueOnce({
        content: [
          {
            traceId: 'trace-export-final',
            rootSpanId: 'span-export-final',
            rootSpanName: 'POST /checkout final',
            serviceName: 'checkout-worker-final',
            serviceNamespace: 'payments',
            durationNanos: 960000000,
            status: 'ERROR',
            startTime: 1713200002000
          }
        ],
        totalElements: 1001,
        pageIndex: 1,
        pageSize: 1000
      });
    const createObjectURL = vi.fn(() => 'blob:hertzbeat-traces');
    const revokeObjectURL = vi.fn();
    Object.defineProperty(window.URL, 'createObjectURL', {
      configurable: true,
      value: createObjectURL
    });
    Object.defineProperty(window.URL, 'revokeObjectURL', {
      configurable: true,
      value: revokeObjectURL
    });
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    await act(async () => {
      renderInteractiveTraceManagePage();
      await Promise.resolve();
    });

    const downloadAction = interactionContainer.querySelector(
      '[data-trace-manage-download-csv-action="current-query"]'
    ) as HTMLButtonElement | null;
    const exportFormatSelect = interactionContainer.querySelector(
      '[data-trace-manage-export-format-select="true"]'
    ) as HTMLElement | null;
    const exportRowLimitSelect = interactionContainer.querySelector(
      '[data-trace-manage-export-row-limit-select="true"]'
    ) as HTMLElement | null;
    expect(exportFormatSelect).toBeTruthy();
    expect(exportFormatSelect?.getAttribute('data-trace-manage-export-format-owner')).toBe('hertzbeat-ui-select');
    expect(exportFormatSelect?.getAttribute('data-trace-manage-export-format-value')).toBe('csv');
    expect(exportRowLimitSelect).toBeTruthy();
    expect(exportRowLimitSelect?.getAttribute('data-trace-manage-export-row-limit-owner')).toBe('hertzbeat-ui-select');
    expect(exportRowLimitSelect?.getAttribute('data-trace-manage-export-row-limit-value')).toBe('current');
    expect(downloadAction).toBeTruthy();
    expect(downloadAction?.getAttribute('data-trace-manage-download-csv-owner')).toBe('hertzbeat-ui-button');
    expect(downloadAction?.getAttribute('data-trace-manage-download-csv-row-count')).toBe('1');

    await act(async () => {
      const trigger = exportFormatSelect!.querySelector('[data-hz-ui="select-trigger"]') as HTMLButtonElement | null;
      trigger?.click();
      await Promise.resolve();
    });

    const jsonlOption = interactionContainer.querySelector(
      '[data-trace-manage-export-format-option="jsonl"]'
    ) as HTMLButtonElement | null;
    expect(jsonlOption).toBeTruthy();

    await act(async () => {
      jsonlOption?.click();
      await Promise.resolve();
    });

    expect(interactionContainer.querySelector('[data-trace-manage-export-format-select="true"]')?.getAttribute('data-trace-manage-export-format-value')).toBe('jsonl');

    await act(async () => {
      const trigger = exportRowLimitSelect!.querySelector('[data-hz-ui="select-trigger"]') as HTMLButtonElement | null;
      trigger?.click();
      await Promise.resolve();
    });

    const rowLimitOption = interactionContainer.querySelector(
      '[data-trace-manage-export-row-limit-option="10000"]'
    ) as HTMLButtonElement | null;
    expect(rowLimitOption).toBeTruthy();

    await act(async () => {
      rowLimitOption?.click();
      await Promise.resolve();
    });

    expect(interactionContainer.querySelector('[data-trace-manage-export-row-limit-select="true"]')?.getAttribute('data-trace-manage-export-row-limit-value')).toBe('10000');

    await act(async () => {
      downloadAction?.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(apiMessageGet).toHaveBeenCalledTimes(2);
    const exportListUrl = String(apiMessageGet.mock.calls[0]?.[0]);
    expect(exportListUrl).toContain('/traces/list?pageIndex=0&pageSize=1000');
    expect(exportListUrl).toContain('serviceName=checkout');
    expect(exportListUrl).toContain('operationName=POST+%2Fcheckout');
    expect(exportListUrl).toContain('minDurationMs=100');
    expect(exportListUrl).toContain('errorOnly=true');
    expect(exportListUrl).toContain('environment=prod');
    expect(exportListUrl).toContain('spanScope=entrypoint');
    expect(exportListUrl).not.toContain('columns');
    const secondExportListUrl = String(apiMessageGet.mock.calls[1]?.[0]);
    expect(secondExportListUrl).toContain('/traces/list?pageIndex=1&pageSize=1000');
    expect(secondExportListUrl).toContain('serviceName=checkout');
    expect(secondExportListUrl).toContain('operationName=POST+%2Fcheckout');
    expect(secondExportListUrl).toContain('environment=prod');
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const exportBlob = createObjectURL.mock.calls[0]?.[0] as Blob;
    expect(exportBlob.type).toBe('application/x-ndjson;charset=utf-8');
    const exportText = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsText(exportBlob);
    });
    const exportLines = exportText.split('\n');
    expect(exportLines).toHaveLength(1001);
    expect(exportLines[0]).toBe('{"startTime":"2026-04-16 22:00:00","service":"checkout-worker","rootSpan":"POST /checkout 0","traceId":"trace-export-0"}');
    expect(exportLines[1000]).toBe('{"startTime":"2026-04-16 22:00:00","service":"checkout-worker-final","rootSpan":"POST /checkout final","traceId":"trace-export-final"}');
    expect(exportText).not.toContain('duration');
    expect(exportText).not.toContain('status');
    expect(exportText).not.toContain('trace-123');
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:hertzbeat-traces');
    clickSpy.mockRestore();
  }, 15000);

  it('renders only the trace time series panel when the time-series explorer view is requested', async () => {
    mockState.searchParams = new URLSearchParams('view=time-series');
    const html = renderTraceManagePage();

    expect(html).toContain('data-trace-manage-view-option="time-series"');
    expect(html).toContain('data-trace-manage-explorer-view="time-series"');
    expect(html).not.toContain('data-trace-manage-trace-table="hertzbeat-ui-dense-trace-list"');
    expect(html).not.toContain('data-trace-manage-detail-panel="hertzbeat-ui-detail-panel"');
  });

  it('renders only the trace table and detail panel when the table explorer view is requested', async () => {
    mockState.searchParams = new URLSearchParams('view=table');
    const html = renderTraceManagePage();

    expect(html).toContain('data-trace-manage-view-option="table"');
    expect(html).toContain('data-trace-manage-trace-table="hertzbeat-ui-dense-trace-list"');
    expect(html).toContain('data-trace-manage-detail-panel="hertzbeat-ui-detail-panel"');
    expect(html).not.toContain('data-trace-manage-explorer-view="time-series"');
  });

  it('renders route-backed customized trace table columns', async () => {
    mockState.searchParams = new URLSearchParams('view=table&columns=service,duration,trace-id');
    const html = renderTraceManagePage();

    expect(html).toContain('data-trace-manage-table-column-controls="customize-columns"');
    expect(html).toContain('data-trace-manage-table-visible-columns="start,service,duration,trace-id"');
    expect(html).toContain('data-trace-manage-table-column-required="start"');
    expect(html).toContain('data-trace-manage-start-cell-owner="hertzbeat-ui-data-cell-text"');
    expect(html).toContain('data-trace-manage-service-cell-owner="hertzbeat-ui-button"');
    expect(html).toContain('data-trace-manage-table-service-filter-action="checkout"');
    expect(html).toContain('data-trace-manage-table-duration-filter-action="420"');
    expect(html).toContain('data-trace-manage-duration-cell-owner="hertzbeat-ui-data-cell-text"');
    expect(html).toContain('data-trace-manage-trace-id-cell-owner="hertzbeat-ui-data-cell-text"');
    expect(html).not.toContain('data-trace-manage-row-action-owner="hertzbeat-ui-table-row-action-button"');
    expect(html).not.toContain('data-trace-manage-status-badge-owner="hertzbeat-ui-status-badge"');
  });

  it('keeps span scope as a route-backed trace list API contract', async () => {
    mockState.searchParams = new URLSearchParams('view=table&spanScope=entrypoint&listPageSize=50&listPageIndex=2&traceId=trace-123&serviceName=checkout');
    mockState.traceListOverride = { content: [], totalElements: 130, pageIndex: 2, pageSize: 50 };
    apiMessageGet
      .mockResolvedValueOnce({ totalTraceCount: 8, errorTraceCount: 2, latestObservedAt: 1713200000000, hasActiveTrace: true })
      .mockResolvedValueOnce({ content: [], totalElements: 130, pageIndex: 2, pageSize: 50 });

    const html = renderTraceManagePage();
    await mockState.lastLoad?.();

    expect(html).toContain('data-trace-manage-span-scope-select="shared-span-scope-select"');
    expect(html).toContain('data-trace-manage-span-scope="entrypoint"');
    expect(html).toContain('data-trace-manage-span-scope-contract="trace-list-api-span-scope"');
    expect(html).toContain('data-trace-manage-list-page-size-select="shared-list-page-size-select"');
    expect(html).toContain('data-trace-manage-list-page-size="50"');
    expect(html).toContain('data-trace-manage-list-pagination="shared-list-pagination"');
    expect(html).toContain('data-trace-manage-list-page-index="2"');
    expect(html).toContain('data-trace-manage-list-total-elements="130"');
    expect(html).toContain('data-trace-manage-list-prev-page-owner="hertzbeat-ui-button"');
    expect(html).toContain('data-trace-manage-list-next-page-owner="hertzbeat-ui-button"');
    expect(apiMessageGet.mock.calls).toEqual([
      ['/traces/stats/overview?traceId=trace-123&serviceName=checkout&spanScope=entrypoint', { signal: expect.any(AbortSignal) }],
      ['/traces/list?pageIndex=2&pageSize=50&traceId=trace-123&serviceName=checkout&spanScope=entrypoint', { signal: expect.any(AbortSignal) }]
    ]);
  });

  it('degrades failed trace API loads without dropping the topology-like workbench contract', async () => {
    const source = readFileSync(resolve(process.cwd(), 'app/trace/manage/trace-manage-page.tsx'), 'utf8');
    apiMessageGet.mockRejectedValueOnce(new Error('Trace API request failed'));

    const html = renderTraceManagePage();
    const loadedData = await mockState.lastLoad?.();

    expect(source).toContain('function apiMessageGetWithTimeout');
    expect(source).toContain('const TRACE_MANAGE_API_TIMEOUT_MS = 20_000');
    expect(source).toContain('data-trace-manage-api-degraded="true"');
    expect(source).toContain('data-trace-manage-api-degraded-owner="hertzbeat-ui-state-notice"');
    expect(source).toContain("title={t('trace.manage.api.degraded.title')}");
    expect(source).toContain("description={t('trace.manage.api.degraded.copy')}");
    expect(source).toContain('return emptyTraceManageData(describeTraceManageLoadFailure(error));');
    expect(html).toContain('data-trace-manage-shell-chrome="topology-workbench"');
    expect(html).toContain('data-hz-signal-workbench-shell-layout="topology-workbench"');
    expect(loadedData).toMatchObject({
      overview: {
        totalTraceCount: 0,
        errorTraceCount: 0,
        latestObservedAt: null,
        hasActiveTrace: false
      },
      list: {
        content: [],
        totalElements: 0,
        pageIndex: 0,
        pageSize: 8
      },
      loadStatus: {
        state: 'degraded',
        message: 'Trace API request failed'
      }
    });
  }, 15000);

  it('renders stable trace query selectors for browser retirement smoke', async () => {
    mockState.searchParams = new URLSearchParams('traceId=trace-123&serviceName=checkout&errorOnly=true');

    const html = renderTraceManagePage();

    expect(html).toContain('data-trace-manage-trace-id-input="true"');
    expect(html).toContain('data-trace-manage-service-input="true"');
    expect(html).toContain('data-trace-manage-resource-filter-input="true"');
    expect(html).toContain('data-trace-manage-resource-filter-input-owner="hertzbeat-ui-query-token-field"');
    expect(html).toContain('data-trace-manage-operation-input="true"');
    expect(html).toContain('data-trace-manage-min-duration-input="true"');
    expect(html).toContain('data-trace-manage-max-duration-input="true"');
    expect(html).toContain('data-trace-manage-duration-input-owner="hertzbeat-ui-input"');
    expect(html).toContain('data-trace-manage-status-filter="true"');
    expect(html).toContain('data-trace-manage-reset-action="true"');
    expect(html).toContain('data-trace-manage-search-action="true"');
    expect(html).toContain('data-trace-manage-open-logs-action="true"');
    expect(html).toContain('data-trace-manage-query-bar="hertzbeat-ui-query-row"');
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
    expect(html).toContain('data-trace-manage-chart-band="hertzbeat-ui-chart-band"');
    expect(html).toContain('data-trace-manage-table-detail-layout="shared-table-detail"');
    expect(html).toContain('data-trace-manage-table-detail-layout-owner="hertzbeat-ui-workbench-layout"');
    expect(html).toContain('data-trace-manage-trace-table="hertzbeat-ui-dense-trace-list"');
    expect(html).toContain('data-trace-manage-table-chrome-owner="hertzbeat-ui-data-table"');
    expect(html).toContain('data-trace-manage-detail-panel="hertzbeat-ui-detail-panel"');
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
    expect(source).toContain('buildTraceManageRoute(routeContext, query, { view: currentView, timeContext: appliedContext })');
    expect(source).toContain('const traceTimeRefreshKey = useMemo(');
    expect(source).toContain('traceTimeContext.timeRange');
    expect(source).toContain('traceTimeContext.refresh');
    expect(source).toContain('traceTimeContext.live');
    expect(source).toContain('traceTimeContext.tz');
    expect(source).toContain("`trace-manage:${currentView}:${traceUrls.listUrl}|${traceUrls.overviewUrl}|${traceUrls.groupByUrl || 'no-group'}|${traceTimeRefreshKey}`");
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
      source.indexOf('data-trace-manage-query-bar="hertzbeat-ui-query-row"')
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
    expect(source).toContain('data-trace-manage-action-row="hertzbeat-ui-workbench-actions"');
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
    expect(source).toContain('data-trace-manage-shell-chrome="topology-workbench"');
    expect(source).toContain('isDashboardReturnContext(routeContext.returnTo)');
    expect(source).toContain('data-trace-manage-source-context={sourceContextKind}');
    expect(source).toContain('data-trace-manage-source-context-return={routeContext.returnTo || \'\'}');
    expect(source).toContain('data-trace-manage-source-context-trace={requestedTraceId}');
    expect(source).toContain('data-trace-manage-source-context-span={requestedSpanId}');
    expect(source).toContain('data-trace-manage-source-context-service={draft.serviceName || routeContext.serviceName || \'\'}');
    expect(source).toContain('readSignalPanelEditContext(searchParams)');
    expect(source).toContain('appendTracePanelEditContext(route, panelEditContext)');
    expect(source).toContain('const replaceTraceHref = useCallback((route: string) => {');
    expect(source).toContain('router.replace(appendTracePanelEditContext(route, panelEditContext))');
    expect(source).toContain('if (!panelEditContext && traceManageRouteState.shouldCleanUrl)');
    expect(source).toContain("panelEditContext\n    ? 'dashboard-panel-edit'");
    expect(source).toContain('data-trace-manage-panel-edit-context={panelEditContext?.intent || \'none\'}');
    expect(source).toContain('data-trace-manage-panel-edit-dashboard={panelEditContext?.dashboardKey || \'\'}');
    expect(source).toContain('data-trace-manage-panel-edit-panel={panelEditContext?.panelId || \'\'}');
    expect(source).toContain('data-trace-manage-panel-edit-draft={panelEditContext?.draftKey || \'\'}');
    expect(source).toContain('data-trace-manage-panel-edit-return={panelEditContext?.returnTo || \'\'}');
    expect(source).toContain('applySignalDashboardPanelEditContext(createSignalDashboardPanelDraft({');
    expect(source).toContain('}), panelEditContext)');
    expect(source).toContain('saveSignalDashboardPanelEditContext(panelEditContext, panelDraft)');
    expect(source).toContain("t(panelEditContext ? 'trace.manage.dashboard-panel-draft.update-current' : 'trace.manage.dashboard-panel-draft.add-current')");
    expect(source).toContain("data-trace-manage-dashboard-panel-draft-action={panelEditContext ? 'update-current' : 'add-current'}");
    expect(source).toContain("data-trace-manage-dashboard-panel-draft-action-mode={panelEditContext ? 'edit-panel' : 'new-panel'}");
    expect(source).toContain('data-trace-manage-dashboard-panel-draft-action-dashboard={panelEditContext?.dashboardKey || \'\'}');
    expect(source).toContain('data-trace-manage-dashboard-panel-draft-action-panel={panelEditContext?.panelId || \'\'}');
    expect(source).toContain('data-trace-manage-dashboard-panel-draft-action-draft={panelEditContext?.draftKey || \'\'}');
    expect(source).toContain('data-trace-manage-dashboard-panel-draft-status-mode={panelEditContext ? \'edit-panel\' : \'new-panel\'}');
    expect(source).toContain('data-trace-manage-dashboard-panel-draft-status-dashboard={panelEditContext?.dashboardKey || \'\'}');
    expect(source).toContain('data-trace-manage-dashboard-panel-draft-status-panel={panelEditContext?.panelId || \'\'}');
    expect(source).toContain("`trace.manage.dashboard-panel-draft.update-${dashboardPanelDraftState}`");
    expect(source).toContain('data-trace-manage-dashboard-panel-draft-return-action="dashboard"');
    expect(source).toContain('data-trace-manage-dashboard-panel-draft-return-action-owner="hertzbeat-ui-button-link"');
    expect(source).toContain('data-trace-manage-dashboard-panel-draft-return-action-dashboard={panelEditContext.dashboardKey || \'\'}');
    expect(source).toContain('data-trace-manage-dashboard-panel-draft-return-action-panel={panelEditContext.panelId || \'\'}');
    expect(source).toContain("t('trace.manage.dashboard-panel-draft.return-dashboard')");
    expect(source).toContain('layout="topology-workbench"');
    expect(source).not.toContain('mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-6 py-6');
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
    expect(source).toContain('data-trace-manage-view-option="table"');
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
    expect(source).toContain('href={handoffLinks.alertRulesHref}');
    expect(source).toContain('href={handoffLinks.dashboardHref}');
    expect(source).toContain('data-trace-manage-header-action="create-alert"');
    expect(source).toContain('data-trace-manage-header-action="add-dashboard"');
    expect(source).toContain("t('explorer.actions.create-alert')");
    expect(source).toContain("t('explorer.actions.add-dashboard')");
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
    expect(source).toContain('variant="chart-stack"');
    expect(source).toContain('data-trace-manage-summary-strip="inline-signal-summary"');
    expect(source).toContain('data-trace-manage-summary-strip-owner="hertzbeat-ui-signal-summary-strip"');
    expect(source).not.toContain('variant="tile"');
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
    expect(source).toContain('data-trace-manage-table-operation-actions="detail-filter"');
    expect(source).toContain('data-trace-manage-table-operation-actions-owner="hertzbeat-ui-action-group"');
    expect(source).toContain('data-trace-manage-row-action-owner="hertzbeat-ui-table-row-action-button"');
    expect(source).toContain('width="root-span"');
    expect(source).toContain('data-trace-manage-table-operation-filter-action={row.name}');
    expect(source).toContain('data-trace-manage-table-operation-filter-owner="hertzbeat-ui-button"');
    expect(source).toContain("applyTraceQuickFilter('operationName', row.name)");
    expect(source).not.toContain('className="max-w-[240px] justify-start truncate font-semibold"');
    expect(source).toContain('data-trace-manage-route="otlp-hertzbeat-ui-trace-workbench"');
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
    expect(source).toContain('data-trace-manage-drawer-stage-stats="inline-signal-summary"');
    expect(source).toContain('data-trace-manage-drawer-stage-stats-owner="hertzbeat-ui-signal-summary-strip"');
    expect(source).toContain('HzSignalSummaryStrip');
    expect(source).toContain('layout="detail"');
    expect(source).toContain('items={[');
    expect(source).toContain('density="compact"');
    expect(source).not.toContain('className="min-h-[64px]"');
    expect(source).toContain('data-trace-manage-drawer-selected-facts-owner="hertzbeat-ui-detail-rows"');
    expect(source).toContain('buildTraceAttributeRows(');
    expect(source).toContain('selectedSpanAttributeRows');
    expect(source).toContain('selectedResourceAttributeRows');
    expect(source).toContain('buildTraceResourceFilterExpression');
    expect(source).toContain('buildTraceResourceExcludeFilterExpression');
    expect(source).toContain('buildTraceResourceExistsFilterExpression');
    expect(source).toContain('buildTraceSpanAttributeFilterExpression');
    expect(source).toContain('buildTraceSpanAttributeExcludeFilterExpression');
    expect(source).toContain('buildTraceSpanAttributeExistsFilterExpression');
    expect(source).toContain('buildTraceSpanAttributeGroupBy');
    expect(source).toContain('mergeTraceResourceFilterExpression');
    expect(source).toContain('applyTraceResourceFilter');
    expect(source).toContain('excludeTraceResourceFilter');
    expect(source).toContain('applyTraceResourceExistsFilter');
    expect(source).toContain('replaceTraceResourceFilter');
    expect(source).toContain('applyTraceSpanAttributeFilter');
    expect(source).toContain('excludeTraceSpanAttributeFilter');
    expect(source).toContain('applyTraceSpanAttributeExistsFilter');
    expect(source).toContain('replaceTraceSpanAttributeFilter');
    expect(source).toContain('applyTraceSpanAttributeGroupBy');
    expect(source).toContain('buildTraceResourceGroupBy');
    expect(source).toContain('applyTraceResourceGroupBy');
    expect(source).toContain('data-trace-manage-drawer-span-attributes="span-attributes"');
    expect(source).toContain('data-trace-manage-drawer-span-attributes-owner="hertzbeat-ui-detail-rows"');
    expect(source).toContain('data-trace-manage-drawer-span-attribute-filter-action="true"');
    expect(source).toContain('data-trace-manage-drawer-span-attribute-filter-action-owner="hertzbeat-ui-button"');
    expect(source).toContain('data-trace-manage-drawer-span-attribute-filter-out-action="true"');
    expect(source).toContain('data-trace-manage-drawer-span-attribute-filter-out-action-owner="hertzbeat-ui-button"');
    expect(source).toContain('data-trace-manage-drawer-span-attribute-exists-action="true"');
    expect(source).toContain('data-trace-manage-drawer-span-attribute-exists-action-owner="hertzbeat-ui-button"');
    expect(source).toContain('data-trace-manage-drawer-span-attribute-replace-action="true"');
    expect(source).toContain('data-trace-manage-drawer-span-attribute-replace-action-owner="hertzbeat-ui-button"');
    expect(source).toContain('data-trace-manage-drawer-span-attribute-group-action="true"');
    expect(source).toContain('data-trace-manage-drawer-span-attribute-group-action-owner="hertzbeat-ui-button"');
    expect(source).toContain('attributeFilter: mergeTraceResourceFilterExpression(draft.attributeFilter, expression)');
    expect(source).toContain('attributeFilter: expression');
    expect(source).toContain("heading={t('trace.manage.drawer.attributes.span.title')}");
    expect(source).toContain("aria-label={t('trace.manage.drawer.attributes.span.aria')}");
    expect(source).toContain('data-trace-manage-drawer-resource-attributes="resource-attributes"');
    expect(source).toContain('data-trace-manage-drawer-resource-attributes-owner="hertzbeat-ui-detail-rows"');
    expect(source).toContain('data-trace-manage-drawer-resource-filter-action="true"');
    expect(source).toContain('data-trace-manage-drawer-resource-filter-action-owner="hertzbeat-ui-button"');
    expect(source).toContain("t('trace.manage.drawer.attributes.filter-action')");
    expect(source).toContain('data-trace-manage-drawer-resource-filter-out-action="true"');
    expect(source).toContain('data-trace-manage-drawer-resource-filter-out-action-owner="hertzbeat-ui-button"');
    expect(source).toContain("t('trace.manage.drawer.attributes.filter-out-action')");
    expect(source).toContain('data-trace-manage-drawer-resource-exists-action="true"');
    expect(source).toContain('data-trace-manage-drawer-resource-exists-action-owner="hertzbeat-ui-button"');
    expect(source).toContain("t('trace.manage.drawer.attributes.exists-action')");
    expect(source).toContain('data-trace-manage-drawer-resource-replace-action="true"');
    expect(source).toContain('data-trace-manage-drawer-resource-replace-action-owner="hertzbeat-ui-button"');
    expect(source).toContain("t('trace.manage.drawer.attributes.replace-action')");
    expect(source).toContain('data-trace-manage-drawer-resource-group-action="true"');
    expect(source).toContain('data-trace-manage-drawer-resource-group-action-owner="hertzbeat-ui-button"');
    expect(source).toContain("t('trace.manage.drawer.attributes.group-action')");
    expect(source).toContain('type TraceRelatedLogsState = {');
    expect(source).toContain('function buildTraceRelatedLogsApiUrl(');
    expect(source).toContain("apiMessageGetWithTimeout<PageResult<LogEntry>>(relatedLogsUrl)");
    expect(source).toContain('data-trace-manage-drawer-related-logs="backend-related-logs"');
    expect(source).toContain('data-trace-manage-drawer-related-logs-owner="hertzbeat-ui-detail-rows"');
    expect(source).toContain('data-trace-manage-drawer-related-logs-url={relatedLogsUrl || \'\'}');
    expect(source).toContain('data-trace-manage-drawer-related-logs-state={relatedLogsState.loading ? \'loading\' : relatedLogsState.error ? \'error\' : relatedLogEntries.length > 0 ? \'ready\' : \'empty\'}');
    expect(source).toContain("heading={t('trace.manage.drawer.related-logs.title')}");
    expect(source).toContain("aria-label={t('trace.manage.drawer.related-logs.aria')}");
    expect(source).toContain('data-trace-manage-drawer-related-log-action="open-logs"');
    expect(source).toContain('data-trace-manage-drawer-related-log-action-owner="hertzbeat-ui-button-link"');
    expect(source).toContain('data-trace-manage-drawer-related-log-trace={traceId}');
    expect(source).toContain('data-trace-manage-drawer-related-log-span={spanId}');
    expect(source).toContain('data-trace-manage-group-panel="hertzbeat-ui-trace-group-results"');
    expect(source).toContain('data-trace-manage-group-table="hertzbeat-ui-trace-group-table"');
    expect(source).toContain("heading={t('trace.manage.drawer.attributes.resource.title')}");
    expect(source).toContain("aria-label={t('trace.manage.drawer.attributes.resource.aria')}");
    expect(source).toContain('ObservabilityWaterfall');
    expect(source).toContain('autoOpenedTraceDetailKeyRef');
    expect(source).toContain('requestedTraceId');
    expect(source).toContain('autoOpenKey={autoOpenedTraceDetailKeyRef.current || \'\'}');
    expect(source).toContain('const drawerSourceContextKind = isDashboardReturnContext(routeContext.returnTo)');
    expect(source).toContain("'data-trace-manage-drawer-source-context': drawerSourceContextKind");
    expect(source).toContain("'data-trace-manage-drawer-auto-open-key': autoOpenKey || ''");
    expect(source).toContain("'data-trace-manage-drawer-requested-trace': requestedTraceId || ''");
    expect(source).toContain("'data-trace-manage-drawer-requested-span': requestedSpanId || ''");
    expect(source).toContain("'data-trace-manage-drawer-selected-trace': detail?.traceId || ''");
    expect(source).toContain("'data-trace-manage-drawer-selected-span': selectedSpan?.spanId || state.selectedSpanId || ''");
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
    expect(source).not.toContain('data-trace-manage-header="hertzbeat-ui-compact-header" data-trace-manage-panel-surface="header" className="px-5 py-4"');
    expect(source).not.toContain('data-trace-manage-query-bar="hertzbeat-ui-query-row" data-trace-manage-panel-surface="query" className="px-4 py-3"');
    expect(source).not.toContain('data-trace-manage-chart-band="hertzbeat-ui-chart-band" data-trace-manage-panel-surface="chart" className="px-4 py-4"');
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
