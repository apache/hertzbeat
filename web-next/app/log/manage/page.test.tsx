// @vitest-environment jsdom

import React, { act } from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTranslatorMock } from '../../../test/i18n-test-helper';
import type { TranslationParams } from '@/lib/i18n';
import LogManagePage from './log-manage-page';
import type { LogManageRouteState, LogQueryState, LogWorkbenchView } from '@/lib/log-manage/query-state';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const apiMessageGet = vi.hoisted(() => vi.fn());

const mockState = vi.hoisted(() => ({
  searchParams: new URLSearchParams(),
  replace: vi.fn(),
  lastLoad: null as null | (() => Promise<unknown>),
  renderData: {
    overview: {
      totalLogs: 8,
      errorLogs: 2,
      distinctTraceCount: 1,
      latestObservedAt: 1713200000000,
      hasActiveLog: true
    },
    list: {
      content: [
        {
          traceId: 'trace-123',
          spanId: 'span-456',
          severityText: 'ERROR',
          severityNumber: 17,
          body: 'checkout timeout',
          timeUnixNano: 1713200000000000000,
          resource: {
            'service.name': 'checkout',
            'deployment.environment.name': 'prod',
            'hertzbeat.entity_id': '7',
            'hertzbeat.entity_name': 'Checkout API'
          },
          attributes: { region: 'cn' }
        }
      ]
    },
    trend: {
      hourlyStats: { '10:00': 4, '11:00': 8 }
    },
    coverage: {
      traceCoverage: {
        withTrace: 4,
        withSpan: 3,
        withBothTraceAndSpan: 2
      }
    },
    query: {
      search: '',
      logContent: '',
      traceId: '',
      spanId: '',
      severityNumber: '',
      severityText: ''
    }
  }
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
    t: createTranslatorMock({ locale: 'zh-CN' })
  })
}));

vi.mock('@/components/workbench/client-workbench', () => ({
  ClientWorkbench: ({
    children,
    load,
    cacheKey,
    cacheSettledTtlMs,
    loadingCopy
  }: {
    children: (data: any) => React.ReactNode;
    load: () => Promise<unknown>;
    cacheKey?: string;
    cacheSettledTtlMs?: number;
    loadingCopy?: string;
  }) => {
    mockState.lastLoad = load;
    return (
      <div
        data-client-workbench="true"
        data-cache-key={cacheKey}
        data-cache-settled-ttl={cacheSettledTtlMs}
        data-loading-copy={loadingCopy}
      >
        {children(mockState.renderData)}
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

vi.mock('@/lib/format', () => ({
  bodyText: (value: unknown) => String(value),
  formatTime: () => '2026-04-16 22:00:00'
}));

vi.mock('@/lib/log-manage/display-mapping', () => ({
  logSeverityTone: (severity?: string | number | null) => {
    const normalized = String(severity ?? '').toUpperCase();
    if (normalized.includes('ERROR') || normalized.includes('FATAL')) return 'danger';
    if (normalized.includes('WARN')) return 'warning';
    if (normalized.includes('INFO')) return 'success';
    return 'neutral';
  },
  severityLabel: (entry: any) => entry.severityText || 'LOG'
}));

vi.mock('@/lib/log-manage/query-state', () => ({
  buildLogStreamUrl: (query: any) => {
    const params = new URLSearchParams();
    if (query.search) params.set('logContent', query.search);
    if (query.logContent) params.set('logContent', query.logContent);
    if (query.traceId) params.set('traceId', query.traceId);
    if (query.spanId) params.set('spanId', query.spanId);
    if (query.severityText) params.set('severityText', query.severityText);
    const queryString = params.toString();
    return queryString ? `/api/logs/sse/subscribe?${queryString}` : '/api/logs/sse/subscribe';
  },
  resolveBrowserLogStreamUrl: (streamPath: string) => streamPath,
  buildLogUrls: (query: any) => {
    const listParams = new URLSearchParams({ pageIndex: '0', pageSize: '8' });
    const statsParams = new URLSearchParams();
    if (query.search) {
      listParams.set('search', query.search);
      statsParams.set('search', query.search);
    }
    if (query.traceId) {
      listParams.set('traceId', query.traceId);
      statsParams.set('traceId', query.traceId);
    }
    if (query.spanId) {
      listParams.set('spanId', query.spanId);
      statsParams.set('spanId', query.spanId);
    }
    if (query.severityText) {
      listParams.set('severityText', query.severityText);
      statsParams.set('severityText', query.severityText);
    }
    if (query.severityNumber) {
      listParams.set('severityNumber', query.severityNumber);
      statsParams.set('severityNumber', query.severityNumber);
    }
    const queryString = statsParams.toString();
    return {
      listUrl: `/logs/list?${listParams.toString()}`,
      overviewUrl: queryString ? `/logs/stats/overview?${queryString}` : '/logs/stats/overview',
      trendUrl: queryString ? `/logs/stats/trend?${queryString}` : '/logs/stats/trend',
      coverageUrl: queryString ? `/logs/stats/trace-coverage?${queryString}` : '/logs/stats/trace-coverage'
    };
  },
  queryStateFromParams: (searchParams: { get(name: string): string | null }) => ({
    search: searchParams.get('search') || searchParams.get('content') || '',
    logContent: searchParams.get('logContent') || '',
    traceId: searchParams.get('traceId') || '',
    spanId: searchParams.get('spanId') || '',
    severityNumber: searchParams.get('severityNumber') || '',
    severityText: searchParams.get('severityText') || ''
  }),
  resolveLogWorkbenchView: (searchParams: { get(name: string): string | null }) => {
    const view = searchParams.get('view');
    if (view === 'stream') return 'stream';
    if (view === 'list' || view === 'history') return 'list';
    return 'stream';
  }
}));

vi.mock('@/lib/signal-route-context', () => ({
  buildSignalEntityContextRows: () => {
    const t = createTranslatorMock({ locale: 'zh-CN' });

    return [
      { label: t('signal.context.entity.label'), value: 'checkout', meta: 'entityId 7' },
      { label: t('signal.context.service.label'), value: 'checkout', meta: 'payments' },
      { label: t('signal.context.environment.label'), value: 'prod', meta: t('signal.context.environment.meta') },
      { label: t('signal.context.time.label'), value: 'last-1h', meta: t('signal.context.time.meta.default') },
      { label: t('signal.context.source.label'), value: 'OTLP', meta: t('signal.context.source.otlp.meta') }
    ];
  },
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

vi.mock('@/lib/log-manage/view-model', () => ({
  buildSelectedLogFacts: (entry: any) => {
    const t = createTranslatorMock({ locale: 'zh-CN' });

    return entry
      ? [
          { label: t('log.manage.detail.severity'), value: entry.severityText || 'LOG' },
          { label: t('log.manage.detail.trace-id'), value: entry.traceId || '-', monospace: true }
        ]
      : [];
  },
  buildLogAttributionDiagnostics: (entry: any) => {
    const t = createTranslatorMock({ locale: 'zh-CN' });

    return entry
      ? [
          {
            key: 'hertzbeat.entity_id',
            label: 'hertzbeat.entity_id',
            value: entry.resource?.['hertzbeat.entity_id'] || '-',
            state: entry.resource?.['hertzbeat.entity_id'] ? 'present' : 'missing',
            meta: entry.resource?.['hertzbeat.entity_id']
              ? t('log.manage.attribution.entity-id.present')
              : t('log.manage.attribution.entity-id.missing')
          },
          {
            key: 'hertzbeat.collector',
            label: 'hertzbeat.collector',
            value: entry.resource?.['hertzbeat.collector'] || '-',
            state: entry.resource?.['hertzbeat.collector'] ? 'present' : 'missing',
            meta: t('log.manage.attribution.collector')
          },
          {
            key: 'hertzbeat.template',
            label: 'hertzbeat.template',
            value: entry.resource?.['hertzbeat.template'] || '-',
            state: entry.resource?.['hertzbeat.template'] ? 'present' : 'missing',
            meta: t('log.manage.attribution.template')
          }
        ]
      : [];
  },
  buildSelectedLogRows: (entry: any) => {
    const t = createTranslatorMock({ locale: 'zh-CN' });

    return entry
      ? [
          { title: 'checkout', copy: String(entry.body), meta: entry.traceId },
          { title: t('log.manage.selected.resource-keys'), copy: '1', meta: 'attributes 1' }
        ]
      : [];
  },
  buildLogCodeNavigationUrl: () => undefined,
  buildLogExplorerRows: (entries: any[]) =>
    entries.map(entry => ({
      key: entry.traceId || entry.body,
      timestamp: '2026-04-16 22:00:00',
      message: String(entry.body),
      service: entry.resource?.['service.name'] || '-',
      severity: entry.severityText || 'LOG',
      severityTone: entry.severityText === 'ERROR' ? 'danger' : entry.severityText === 'WARN' ? 'warning' : 'neutral',
      traceId: entry.traceId || '-',
      spanId: entry.spanId || '-'
    })),
  buildLogHandoffLinks: (entry: any, routeContext: any = {}, options: any = {}) => {
    const traceParams = new URLSearchParams();
    const traceId = entry?.traceId || routeContext.traceId;
    const spanId = entry?.spanId || routeContext.spanId;
    const serviceName = entry?.resource?.['service.name'] || routeContext.serviceName || 'checkout';
    if (traceId) traceParams.set('traceId', traceId);
    if (spanId) traceParams.set('spanId', spanId);
    if (serviceName) traceParams.set('serviceName', serviceName);
    traceParams.set('source', routeContext.source || 'otlp');
    if (options.traceReturnTo) traceParams.set('returnTo', options.traceReturnTo);

    return {
      intakeHref: '/ingestion/otlp?signal=logs&entityId=7&serviceName=checkout&environment=prod&timeRange=last-1h&source=otlp',
      traceHref: `/trace/manage?${traceParams.toString()}`,
      metricsHref: '/ingestion/otlp/metrics?traceId=trace-123&spanId=span-456&serviceName=checkout',
      entitiesHref: '/entities?search=checkout',
      entityHref: '/entities/7?entityId=7&serviceName=checkout&environment=prod&timeRange=last-1h&source=otlp',
      alertHandlingHref: '/alert?status=firing&signal=logs&search=checkout&entityId=7&serviceName=checkout&environment=prod&timeRange=last-1h&source=otlp',
      alertRulesHref: '/alert/setting?signal=logs&entityId=7&serviceName=checkout&environment=prod&timeRange=last-1h&source=otlp'
    };
  }
}));

vi.mock('./route-state', () => ({
  buildLogManageRoute: (routeContext: any, query: any, view?: string) => {
    const params = new URLSearchParams();
    if (query.search) params.set('search', query.search);
    if (query.traceId) params.set('traceId', query.traceId);
    if (query.spanId) params.set('spanId', query.spanId);
    if (view) params.set('view', view);
    params.set('source', routeContext.source || 'otlp');
    return params.toString() ? `/log/manage?${params.toString()}` : '/log/manage';
  },
  buildResetLogManageRoute: () => '/log/manage'
}));

const zhT = createTranslatorMock({ locale: 'zh-CN' });

function tZh(key: string, params?: TranslationParams) {
  return zhT(key, params);
}

function buildLogManageRouteState(): LogManageRouteState {
  const query: LogQueryState = {
    search: mockState.searchParams.get('search') || mockState.searchParams.get('content') || '',
    logContent: mockState.searchParams.get('logContent') || '',
    traceId: mockState.searchParams.get('traceId') || '',
    spanId: mockState.searchParams.get('spanId') || '',
    severityNumber: mockState.searchParams.get('severityNumber') || '',
    severityText: mockState.searchParams.get('severityText') || ''
  };
  const requestedView = mockState.searchParams.get('view');
  const currentView: LogWorkbenchView =
    requestedView === 'list' || requestedView === 'history'
      ? 'list'
      : requestedView === 'stream'
        ? 'stream'
        : query.search || query.traceId || query.spanId || query.severityNumber || query.severityText
          ? 'list'
          : 'stream';

  return {
    initialQuery: query,
    currentView,
    routeContext: {
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
    },
    shouldCleanUrl: Boolean(mockState.searchParams.get('returnLabel') || mockState.searchParams.get('returnTo')?.includes('returnLabel='))
  };
}

function renderLogManagePage(initialRouteState = buildLogManageRouteState()) {
  return renderToStaticMarkup(<LogManagePage initialRouteState={initialRouteState} />);
}

function renderInteractiveLogManagePage(initialRouteState = buildLogManageRouteState()) {
  interactionRoot?.render(<LogManagePage initialRouteState={initialRouteState} />);
}

beforeEach(() => {
  mockState.searchParams = new URLSearchParams();
  mockState.replace.mockReset();
  mockState.lastLoad = null;
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
});

describe('log manage page', () => {
  it('keeps log manage on the OTLP cold Workbench owner instead of the old external-product shell', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/log/manage/log-manage-page.tsx'), 'utf8');
    const messagesSource = readFileSync(resolve(process.cwd(), 'lib/i18n-runtime-messages.ts'), 'utf8');

    expect(source).toContain('data-log-manage-route="otlp-cold-log-workbench"');
    expect(source).toContain('data-log-manage-style-baseline="hertzbeat-cold-matte"');
    expect(source).toContain('data-log-manage-header-padding-owner="hertzbeat-ui-panel-surface"');
    expect(source).toContain('padding="header"');
    expect(source).not.toContain('data-log-manage-header="cold-compact-header" data-log-manage-panel-surface="header" className="px-5 py-4"');
    expect(source).toContain('data-log-manage-query-bar="cold-query-row"');
    expect(source).toContain('data-log-manage-panel-surface-padding-owner="hertzbeat-ui-panel-surface"');
    expect(source).toContain('padding="query"');
    expect(source).not.toContain('data-log-manage-query-bar="cold-query-row" data-log-manage-panel-surface="query" className="px-4 py-3"');
    expect(source).toContain('data-log-manage-api-degraded="true"');
    expect(source).toContain('data-log-manage-api-degraded-owner="hertzbeat-ui-state-notice"');
    expect(messagesSource).toContain("'log.manage.api.degraded.title':");
    expect(messagesSource).toContain("'log.manage.api.degraded.copy':");
    expect(source).toContain('data-log-manage-chart-band="cold-chart-band"');
    expect(source).toContain('data-log-manage-chart-padding-owner="hertzbeat-ui-panel-surface"');
    expect(source).toContain('padding="chart"');
    expect(source).not.toContain('data-log-manage-chart-band="cold-chart-band" data-log-manage-panel-surface="chart" className="px-4 py-4"');
    expect(source).toContain('data-log-manage-log-list="cold-dense-log-list"');
    expect(source).toContain('data-log-manage-table-chrome-owner="hertzbeat-ui-data-table"');
    expect(source).toContain('HzDataTable');
    expect(source).toContain('HzPanelHeader');
    expect(source).toContain('data-log-manage-table-header-owner="hertzbeat-ui-panel-header"');
    expect(source).toContain('data-log-manage-table-count-badge-owner="hertzbeat-ui-status-badge"');
    expect(source).toContain('data-log-manage-detail-panel="cold-detail-panel"');
    expect(source).toContain('data-log-manage-detail-header-owner="hertzbeat-ui-panel-header"');
    expect(source).toContain("eyebrow={t('log.manage.detail.title')}");
    expect(source).not.toContain('data-log-manage-hertzbeat-loop="collector-template-alert-loop"');
    expect(source).toContain('data-log-manage-entity-context="hertzbeat-signal-entity-context"');
    expect(source).toContain('data-log-manage-entity-context-owner="hertzbeat-ui-detail-rows"');
    expect(source).toContain('data-log-manage-selected-evidence-owner="hertzbeat-ui-detail-rows"');
    expect(source).toContain('data-log-manage-detail-facts-owner="hertzbeat-ui-detail-rows"');
    expect(source).toContain('data-log-manage-stream-selected-detail-owner="hertzbeat-ui-detail-rows"');
    expect(source).toContain('data-log-manage-stream-detail-action-stack="shared-control-stack"');
    expect(source).toContain('data-log-manage-stream-detail-action-stack-owner="hertzbeat-ui-control-stack"');
    expect(source).toContain('data-log-manage-history-detail-action-stack="shared-control-stack"');
    expect(source).toContain('data-log-manage-history-detail-action-stack-owner="hertzbeat-ui-control-stack"');
    expect(source).not.toContain('className="mt-4 flex flex-col gap-2"');
    expect(source).toContain("aria-label={t('log.manage.context.entity.aria')}");
    expect(source).not.toContain('data-log-manage-intake-quality="logs-collector-quality"');
    expect(source).not.toContain('data-log-manage-intake-quality-row={row.key}');
    expect(source).not.toContain('buildLogIntakeQualityRows');
    expect(source).toContain('data-log-manage-view-switch="stream-history"');
    expect(source).toContain('data-log-manage-view-switch-panel-surface-owner="hertzbeat-ui-panel-surface"');
    expect(source).toContain('padding="view-switch"');
    expect(source).toContain('data-log-manage-view-switch-layout="shared-view-switch"');
    expect(source).toContain('data-log-manage-view-switch-layout-owner="hertzbeat-ui-workbench-layout"');
    expect(source).toContain('variant="view-switch"');
    expect(source).toContain('data-log-manage-view-toggle-group="shared-action-group"');
    expect(source).toContain('data-log-manage-view-toggle-group-owner="hertzbeat-ui-action-group"');
    expect(source).toContain('layout="end-wrap"');
    expect(source).not.toContain('className="flex flex-wrap items-center justify-between gap-2"');
    expect(source).not.toContain('className="ml-auto flex flex-wrap items-center justify-end gap-2"');
    expect(source).not.toContain('data-log-manage-panel-surface="view-switch" className="px-3 py-3"');
    expect(source).toContain('data-log-manage-stream-stage="hertzbeat-live-log-stream"');
    expect(source).toContain('data-log-manage-stream-stage-panel-surface-owner="hertzbeat-ui-panel-surface"');
    expect(source).toContain('clip');
    expect(source).toContain('data-log-manage-stream-stage-layout="shared-stream-stage"');
    expect(source).toContain('data-log-manage-stream-stage-layout-owner="hertzbeat-ui-workbench-layout"');
    expect(source).toContain('variant="stream-stage"');
    expect(source).not.toContain('className="grid min-h-[520px] lg:grid-cols-[minmax(0,1fr)_320px]"');
    expect(source).not.toContain(`data-log-manage-stream-live-state={isStreamPaused ? 'paused' : 'live'}
        className="overflow-hidden"`);
    expect(source).toContain('data-log-manage-stream-stage-header-owner="hertzbeat-ui-panel-header"');
    expect(source).toContain('data-log-manage-stream-selected-header-owner="hertzbeat-ui-panel-header"');
    expect(source).toContain('data-log-manage-stream-pause-notice-owner="hertzbeat-ui-state-notice"');
    expect(source).toContain('data-log-manage-stream-selected-helper-owner="hertzbeat-ui-state-notice"');
    expect(source).toContain("warning={detailSelection?.selectionState === 'detached' ? t('log.manage.stream.detail.detached-warning') : undefined}");
    expect(source).toContain("eyebrow={t('log.manage.stream.stage.kicker')}");
    expect(source).toContain("eyebrow={t('log.manage.stream.selected.title')}");
    expect(source).toContain('data-log-manage-reconnect-action="true"');
    expect(source).toContain("'data-log-manage-row-detail-action': 'true'");
    expect(source).toContain('data-log-manage-row-trace-detail-action="true"');
    expect(source).toContain('LogStreamDetailDialog');
    expect(source).toContain('buildLogAttributionDiagnostics(detailLog, t)');
    expect(source).toContain('attributionDiagnostics={detailAttributionDiagnostics}');
    expect(source).toContain('HzAttributeDiagnostics');
    expect(source).toContain('data-log-manage-selected-attribution-diagnostics-owner="hertzbeat-ui-attribute-diagnostics"');
    expect(source).toContain("t('log.manage.context.entity.title')");
    expect(source).not.toContain('HertzBeat collection loop');
    expect(source).not.toContain('Alert loop');
    expect(source).not.toContain('Log troubleshooting can return to intake overview, collector clusters, monitor templates, and alert handling context.');
    [
      'log.manage.route.action.collector',
      'log.manage.route.action.templates',
      'log.manage.route.action.return-source',
      'log.manage.route.action.entity',
      'log.manage.route.action.alerts',
      'log.manage.context.entity.aria'
    ].forEach(key => {
      expect(source).toContain(`t('${key}`);
      expect(messagesSource).toContain(`'${key}'`);
    });
    expect(source).toContain('href={handoffLinks.alertHandlingHref}');
    expect(source).toContain('data-log-manage-action-row-owner="hertzbeat-ui-action-group"');
    expect(source).toContain('data-log-manage-action-row-layout-owner="hertzbeat-ui-action-group"');
    expect(source).toContain('data-log-manage-return-action="true"');
    expect(source).toContain('data-log-manage-header-action="return-source"');
    expect(source).toContain('data-log-manage-header-action-icon-owner="hertzbeat-ui-button-icon"');
    expect(source).toContain('layout="full-end"');
    expect(source).not.toContain('data-log-manage-action-row="cold-workbench-actions" className="flex flex-wrap items-center justify-end gap-2"');
    expect(source).not.toContain('data-log-manage-header-action="collector">\n                  <Server className="h-4 w-4"');
    expect(source).not.toContain('data-log-manage-header-action="templates">\n                  <ListChecks className="h-4 w-4"');
    expect(source).not.toContain('data-log-manage-header-action="alerts">\n                  <BellRing className="h-4 w-4"');
    expect(source).toContain('data-log-manage-alert-context-hint="entity-trace-alert-handoff"');
    expect(source).toContain("t('log.manage.handoff.alert-hint')");
    expect(source).not.toContain('Alert rules');
    expect(source).not.toContain('signoz-');
    expect(source).not.toContain('data-log-manage-floating-actions');
    expect(source).not.toContain('Run Query');
    expect(source).not.toContain('Save this view');
    expect(source).not.toContain('Create an Alert');
    expect(source).not.toContain('Add to Dashboard');
    expect(source).not.toContain('Logs Workbench');
    expect(source).not.toContain("returnLabel: 'Logs Workbench'");
    expect(source).not.toContain("returnLabel: 'Trace Workbench'");
    expect(source).not.toContain('Save view');
    expect(source).not.toContain('Create alert');
    expect(source).not.toContain('Add to dashboard');
    expect(source).not.toContain('ThreeSignalDeskShell');
    expect(source).not.toContain('FactsStrip');
    expect(source).not.toContain('StageSection');
    expect(source).not.toContain('SummaryMetricGrid');
    expect(source).not.toContain('DrawerSection');
    expect(source).not.toContain('VirtualList');
    expect(source).not.toContain('<DataTable');
    expect(source).not.toContain('import { DataTable');
  });

  it('keeps log route-level actions on the cold-matte palette instead of bright blue demo buttons', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/log/manage/log-manage-page.tsx'), 'utf8');

    expect(source).toContain('data-log-manage-run-query-action="true"');
    expect(source).not.toContain('border-[#4f6df0]');
    expect(source).not.toContain('bg-[#4566e8]');
    expect(source).not.toContain('hover:bg-[#5574f4]');
  });

  it('renders a shared return action when logs inherit a trace return path', () => {
    mockState.searchParams = new URLSearchParams(
      'view=list&traceId=trace-123&spanId=span-456&serviceName=checkout&returnTo=%2Ftrace%2Fmanage%3FtraceId%3Dtrace-123%26spanId%3Dspan-456%26serviceName%3Dcheckout'
    );

    const html = renderLogManagePage();

    expect(html).toContain('data-log-manage-action-row-owner="hertzbeat-ui-action-group"');
    expect(html).toContain('data-hz-action-group-layout="full-end"');
    expect(html).toContain('data-log-manage-return-action="true"');
    expect(html).toContain('data-log-manage-header-action="return-source"');
    expect(html).toContain('data-log-manage-header-action-icon="return-source"');
    expect(html).toContain('data-log-manage-header-action-icon-owner="hertzbeat-ui-button-icon"');
    expect(html).toContain('href="/trace/manage?traceId=trace-123&amp;spanId=span-456&amp;serviceName=checkout"');
    expect(html).toContain(tZh('log.manage.route.action.return-source'));
  });

  it('keeps the Angular log-to-trace drilldown contract as drawer preview before route navigation', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/log/manage/log-manage-page.tsx'), 'utf8');

    expect(source).toContain('LogStreamDetailDialog');
    expect(source).toContain('LogRelatedTraceDialog');
    expect(source).toContain('loadTraceDetailBundle');
    expect(source).toContain('openRelatedTracePreview');
    expect(source).toContain('openTraceDrilldownFromLog');
    expect(source).toContain('data-log-manage-row-trace-detail-action="true"');
    expect(source).toContain('data-log-manage-open-log-detail-before-trace="true"');
    expect(source).toContain("onRowClick={row => openLogDetails(logEntryByRowKey.get(row.key) ?? null, 'history')}");
    expect(source).toContain('data-log-related-trace-open-workspace-action="true"');
    expect(source).toContain('data-log-manage-results-open-trace-action="true"');
    expect(source).toContain("t('log.manage.related-trace.open-workspace')");
    expect(source).not.toContain('data-log-manage-row-trace-link="context-preserved"');
    expect(source).not.toContain('data-log-manage-row-trace-preview-action="true"');
    expect(source).not.toContain('href={row.traceId !== \'-\' ? rowHandoffLinks.traceHref : \'/trace/manage\'}');
  });

  it('keeps the log related-trace drawer language in HertzBeat operations wording', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/log/manage/log-manage-page.tsx'), 'utf8');

    expect(source).toContain('buildSelectedSpanFacts');
    expect(source).toContain("t('log.manage.related-trace.spans-count'");
    expect(source).toContain("badges={relatedTraceDetail ? [t('log.manage.related-trace.badge')] : []}");
    expect(source).toContain("label: t('log.manage.related-trace.fact.links')");
    expect(source).not.toContain('`${relatedTraceRows.length} spans`');
    expect(source).not.toContain("badges={relatedTraceDetail ? ['SPAN'] : []}");
    expect(source).not.toContain("label: 'Links'");
    expect(source).not.toContain("title: 'service / namespace'");
    expect(source).not.toContain("meta: relatedTraceSelectedSpan.traceState || 'trace state -'");
  });

  it('keeps missing trace handoffs visible but disabled with i18n hover guidance', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/log/manage/log-manage-page.tsx'), 'utf8');
    const messages = readFileSync(resolve(process.cwd(), 'lib/i18n-runtime-messages.ts'), 'utf8');

    expect(source).toContain("const missingTraceHandoffTitle = t('log.manage.handoff.trace-disabled')");
    expect(source).toContain('data-log-manage-results-open-trace-action-disabled="missing-trace-id"');
    expect(source).toContain('data-log-related-trace-open-workspace-action-disabled="missing-trace-id"');
    expect(source).toContain('title={missingTraceHandoffTitle}');
    expect(messages).toContain("'log.manage.handoff.trace-disabled'");
    expect(messages).toContain("'log.manage.handoff.full-trace-disabled'");
  });

  it('keeps missing entity handoffs visible but disabled with i18n hover guidance', async () => {
    const source = readFileSync(resolve(process.cwd(), 'app/log/manage/log-manage-page.tsx'), 'utf8');
    const messages = readFileSync(resolve(process.cwd(), 'lib/i18n-runtime-messages.ts'), 'utf8');
    const originalContent = mockState.renderData.list.content;
    mockState.searchParams = new URLSearchParams('view=list&traceId=trace-123&spanId=span-456&source=otlp');
    mockState.renderData.list.content = [
      {
        ...originalContent[0],
        body: 'self monitor heartbeat without entity id',
        resource: {
          'service.name': 'HertzBeat',
          'hertzbeat.collector': 'collector-local',
          'hertzbeat.template': 'hertzbeat-self'
        }
      }
    ];

    try {
      const html = renderLogManagePage();

      expect(source).toContain("const missingEntityHandoffTitle = t('log.manage.handoff.entity-disabled')");
      expect(source).toContain('data-log-manage-entity-action-disabled="missing-entity-id"');
      expect(source).toContain('title={missingEntityHandoffTitle}');
      expect(messages).toContain("'log.manage.handoff.entity-disabled'");
      expect(html).toContain('data-log-manage-entity-action="true"');
      expect(html).toContain('data-log-manage-entity-action-disabled="missing-entity-id"');
      expect(html).toContain('title="log.manage.handoff.entity-disabled"');
      expect(html).toContain('disabled=""');
    } finally {
      mockState.renderData.list.content = originalContent;
    }
  }, 30000);

  it('renders the in-place log stream when the Angular stream view is requested', async () => {
    mockState.searchParams = new URLSearchParams('view=stream&traceId=trace-123&spanId=span-456&severityText=ERROR');
    const html = renderLogManagePage();

    expect(html).toContain('data-log-manage-view-switch="stream-history"');
    expect(html).toContain('data-log-manage-view-switch-layout="shared-view-switch"');
    expect(html).toContain('data-log-manage-view-switch-layout-owner="hertzbeat-ui-workbench-layout"');
    expect(html).toContain('data-hz-workbench-layout-variant="view-switch"');
    expect(html).toContain('data-log-manage-view-toggle-group="shared-action-group"');
    expect(html).toContain('data-log-manage-view-toggle-group-owner="hertzbeat-ui-action-group"');
    expect(html).toContain('data-hz-action-group-layout="end-wrap"');
    expect(html).toContain('data-log-manage-stream-stage="hertzbeat-live-log-stream"');
    expect(html).toContain('data-log-manage-stream-stage-panel-surface-owner="hertzbeat-ui-panel-surface"');
    expect(html).toContain('data-hz-panel-surface-clip="true"');
    expect(html).toContain('data-log-manage-stream-stage-layout="shared-stream-stage"');
    expect(html).toContain('data-log-manage-stream-stage-layout-owner="hertzbeat-ui-workbench-layout"');
    expect(html).toContain('data-hz-workbench-layout-variant="stream-stage"');
    expect(html).toContain('data-log-manage-stream-stage-header-owner="hertzbeat-ui-panel-header"');
    expect(html).toContain('data-log-manage-stream-selected-header-owner="hertzbeat-ui-panel-header"');
    expect(html).toContain('data-log-manage-stream-detail-action-stack="shared-control-stack"');
    expect(html).toContain('data-log-manage-stream-detail-action-stack-owner="hertzbeat-ui-control-stack"');
    expect(html).toContain('data-hz-control-stack-layout="stack"');
    expect(html).toContain('data-hz-panel-header-eyebrow="true"');
    expect(html).not.toContain('data-log-manage-stream-selected-helper-owner="hertzbeat-ui-state-notice"');
    expect(html).toContain('data-log-manage-reconnect-action="true"');
    expect(html).toContain('data-log-manage-stream-row="true"');
    expect(html).toContain('data-log-manage-stream-severity-tone="danger"');
    expect(html).toContain('checkout timeout');
    expect(html).not.toContain('data-log-manage-stream-empty-state="true"');
    expect(html).toContain(tZh('log.manage.stream.view.stream'));
    expect(html).toContain(tZh('log.manage.stream.view.history'));
    expect(html).toContain(tZh('log.manage.stream.stage.title'));
    expect(html).toContain(tZh('log.manage.query.run.stream'));
    expect(html).toContain(tZh('log.manage.stream.selected.title'));
    expect(html).not.toContain('Full JSON');
    expect(html).not.toContain(tZh('log.manage.query.run.history'));
    expect(html).not.toContain('/api/logs/sse/subscribe');
    expect(html).not.toContain('data-log-manage-log-list="cold-dense-log-list"');
  }, 30000);

  it('keeps live stream rows keyed by a monotonic sequence without surfacing normal retention as backpressure', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/log/manage/log-manage-page.tsx'), 'utf8');

    expect(source).toContain('streamSequenceRef');
    expect(source).toContain('buildStreamItemKey(entry, sequence)');
    expect(source).not.toContain('buildLogEntryKey(entry, nextIndex)');
    expect(source).not.toContain('cannot enter frontend buffer');
    expect(source).not.toContain('log stream too fast');
  });

  it('keeps no-log empty guidance operator-facing instead of generic storage copy', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/log/manage/log-manage-page.tsx'), 'utf8');
    const messagesSource = readFileSync(resolve(process.cwd(), 'lib/i18n-runtime-messages.ts'), 'utf8');

    expect(source).toContain('data-log-manage-empty-guidance="operator-no-data-guidance"');
    expect(source).toContain('data-log-manage-empty-state-owner="hertzbeat-ui-empty-state"');
    expect(source).toContain('data-log-manage-stream-empty-owner="hertzbeat-ui-empty-state"');
    expect(source).toContain('HzEmptyState');
    expect(source).toContain("t('log.manage.empty.copy')");
    expect(messagesSource).toContain("'log.manage.empty.copy':");
    expect(source).not.toContain('Logs appear here in reverse chronological order after writes.');
  });

  it('renders live log stream rows through a virtualized viewport backed by EventSource', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/log/manage/log-manage-page.tsx'), 'utf8');

    expect(source).toContain('new EventSource(streamUrl)');
    expect(source).toContain('const maxStreamEntries = 10000');
    expect(source).toContain('const maxPendingStreamEntries = 1000');
    expect(source).toContain('pendingStreamItemsRef');
    expect(source).toContain('requestAnimationFrame(flushPendingStreamItems)');
    expect(source).toContain('resolveBrowserLogStreamUrl(buildLogStreamUrl(query, routeContext))');
    expect(source).toContain("useState(() => routeContext.live === 'false')");
    expect(source).toContain('const logUrls = useMemo(() => buildLogUrls(query, routeContext), [query, routeContext]);');
    expect(source).toContain('const { listUrl, overviewUrl, trendUrl, coverageUrl } = logUrls;');
    expect(source).toContain('resolveStreamWindow');
    expect(source).toContain('readStreamViewportState');
    expect(source).toContain('STREAM_VIEWPORT_ROW_HEIGHT');
    expect(source).toContain('anchorIndex: streamViewport.isPinnedToLatest ? null : selectedStreamIndex');
    expect(source).toContain('HzScrollViewport');
    expect(source).toContain('HzLogStreamLiveRow');
    expect(source).toContain('HzDetailAside');
    expect(source).toContain('HzDetailBodyStack');
    expect(source).toContain('data-log-manage-stream-viewport="virtualized-log-stream"');
    expect(source).toContain('data-log-manage-stream-viewport-owner="hertzbeat-ui-scroll-viewport"');
    expect(source).toContain('variant="log-stream"');
    expect(source).not.toContain('className="hb-scrollbar max-h-[620px] overflow-auto"');
    expect(source).toContain('data-log-manage-stream-window');
    expect(source).toContain('data-log-manage-stream-row-owner="hertzbeat-ui-log-stream-row"');
    expect(source).toContain('data-log-manage-stream-row-style="compact-live-row"');
    expect(source).toContain('data-log-manage-stream-selected-aside="shared-detail-aside"');
    expect(source).toContain('data-log-manage-stream-selected-aside-owner="hertzbeat-ui-detail-aside"');
    expect(source).toContain('data-log-manage-stream-selected-body="shared-detail-body-stack"');
    expect(source).toContain('data-log-manage-stream-selected-body-owner="hertzbeat-ui-detail-body-stack"');
    expect(source).toContain('visibleStreamItems.map');
    expect(source).not.toContain('className={`grid w-full grid-cols-[58px_minmax(0,112px)_minmax(0,1fr)]');
    expect(source).not.toContain('<aside className="border-l border-[#252b35] bg-[#0b0e13] px-4 py-4">');
    expect(source).not.toContain('<div className="mt-4 space-y-2">');
    expect(source).not.toContain('log stream too fast');
    expect(source).not.toContain('frontend has hidden');
    expect(source).not.toContain('shouldShowStreamBackpressureNotice');
    expect(source).not.toContain('streamItems.map(item =>');
  });

  it('syncs inherited live=false into a visible paused stream state before opening EventSource', async () => {
    mockState.searchParams = new URLSearchParams(
      'view=stream&timeRange=last-1h&start=1713200000000&end=1713203600000&refresh=30&live=false&tz=Asia%2FShanghai&serviceName=checkout'
    );
    const source = readFileSync(resolve(process.cwd(), 'app/log/manage/log-manage-page.tsx'), 'utf8');
    const html = renderLogManagePage();

    expect(source).toContain("useEffect(() => {\n    setIsStreamPaused(routeContext.live === 'false');\n  }, [routeContext.live]);");
    expect(source).toContain("if (isStreamPaused) {\n      setStreamStatus('disconnected');\n      return undefined;\n    }");
    expect(source).toContain("data-log-manage-stream-live-state={isStreamPaused ? 'paused' : 'live'}");
    expect(html).toContain('data-log-manage-stream-stage="hertzbeat-live-log-stream"');
    expect(html).toContain('data-log-manage-stream-live-state="paused"');
    expect(html).toContain('data-log-manage-stream-stage-header-owner="hertzbeat-ui-panel-header"');
    expect(html).toContain('data-log-manage-stream-selected-aside="shared-detail-aside"');
    expect(html).toContain('data-log-manage-stream-selected-aside-owner="hertzbeat-ui-detail-aside"');
    expect(html).toContain('data-hz-ui="detail-aside"');
    expect(html).toContain('data-log-manage-stream-selected-body="shared-detail-body-stack"');
    expect(html).toContain('data-log-manage-stream-selected-body-owner="hertzbeat-ui-detail-body-stack"');
    expect(html).toContain('data-hz-ui="detail-body-stack"');
    expect(html).toContain('data-log-manage-stream-pause-notice-owner="hertzbeat-ui-state-notice"');
    expect(html).toContain('data-log-manage-stream-pause-notice="paused-buffer-visible"');
    expect(html).toContain('data-hz-ui="state-notice"');
    expect(html).toContain(tZh('log.manage.stream.state.paused'));
    expect(html).toContain(tZh('log.manage.stream.action.resume'));
  }, 15000);

  it('uses the shared narrow time rail in the top-right page header instead of the log query row', async () => {
    mockState.searchParams = new URLSearchParams(
      'view=list&timeRange=last-1h&start=1713200000000&end=1713203600000&refresh=30&live=false&tz=Asia%2FShanghai&serviceName=checkout'
    );
    const source = readFileSync(resolve(process.cwd(), 'app/log/manage/log-manage-page.tsx'), 'utf8');
    const html = renderLogManagePage();

    expect(source).toContain("import { buildTimeRangeControlLabels, TimeRangeControl } from '@/components/observability/time-range-control';");
    expect(source).toContain('labels={buildTimeRangeControlLabels(t)}');
    expect(source).toContain("live: routeContext.live || 'true'");
    expect(source).toContain('buildLogManageRoute(routeContext, query, currentView, appliedContext)');
    expect(source).toContain('data-log-manage-time-control="shared-time-context-control"');
    expect(source).toContain('data-log-manage-time-control-placement="top-right"');
    expect(source).toContain('data-log-manage-time-control-visual="narrow-top-right-rail"');
    expect(source).toContain('data-log-manage-time-toolbar="top-right-corner"');
    expect(source).toContain('className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start"');
    expect(source).toContain('variant="narrow-rail"');
    expect(source).toContain('showAbsoluteFields');
    expect(source).toContain('data-log-manage-time-control-fit="no-clipping"');
    expect(source).not.toContain('data-log-manage-time-control-layout="compact-rail"');
    expect(source).not.toContain('data-log-manage-time-control="shared-time-context-control" className="min-w-[520px] flex-1"');
    expect(source).not.toContain('value="last-30-minutes"');
    expect(source.indexOf('data-log-manage-time-control="shared-time-context-control"')).toBeLessThan(
      source.indexOf('data-log-manage-query-bar="cold-query-row"')
    );
    expect(html).toContain('data-log-manage-time-control="shared-time-context-control"');
    expect(html).toContain('data-log-manage-time-control-placement="top-right"');
    expect(html).toContain('data-log-manage-time-control-visual="narrow-top-right-rail"');
    expect(html).toContain('data-log-manage-time-toolbar="top-right-corner"');
    expect(html).toContain('data-log-manage-time-control-fit="no-clipping"');
    expect(html).toContain('data-time-range-control-layout="nowrap-top-right-rail"');
    expect(html).toContain('data-time-range-control="hertzbeat-shared"');
    expect(html).toContain('data-time-range-control-visual="grafana-like-narrow-rail"');
    expect(html).toContain('data-time-range-control-overflow="fit-without-scroll"');
    expect(html).toContain('data-time-range-control-absolute-draft="visible"');
    expect(html).toContain('data-time-range-live-toggle="paused"');
    expect(html).toContain('data-log-manage-time-refresh-action="true"');
    expect(html).toContain('value="last-1h"');
    expect(html).not.toContain('last-30-minutes');
  }, 15000);

  it('renders the cold query row, trend band, dense log list, and detail handoffs', async () => {
    mockState.searchParams = new URLSearchParams('view=list');
    const html = renderLogManagePage();

    expect(html).toContain('data-log-manage-route="otlp-cold-log-workbench"');
    expect(html).toContain(`data-loading-copy="${tZh('log.manage.loading')}"`);
    expect(html).toContain('data-log-manage-style-baseline="hertzbeat-cold-matte"');
    expect(html).toContain('data-log-manage-query-bar="cold-query-row"');
    expect(html).toContain('data-log-manage-panel-surface-padding-owner="hertzbeat-ui-panel-surface"');
    expect(html).toContain('data-hz-panel-surface-padding="query"');
    expect(html).toContain('data-log-manage-query-search-frame="shared-search-field-frame"');
    expect(html).toContain('data-log-manage-query-search-frame-owner="hertzbeat-ui-search-field-frame"');
    expect(html).toContain('data-hz-search-field-frame-width="log-query"');
    expect(html).toContain('data-log-manage-query-search-icon-owner="hertzbeat-ui-search-field-icon"');
    expect(html).toContain('data-log-manage-query-search-input-owner="hertzbeat-ui-input"');
    expect(html).toContain('data-hz-input-inset="search-icon"');
    expect(html).toContain('data-hz-input-width="log-query-expression"');
    expect(html).toContain('data-log-manage-query-severity-select="shared-log-severity-select"');
    expect(html).toContain('data-log-manage-query-severity-select-owner="hertzbeat-ui-select"');
    expect(html).toContain('data-hz-select-width="log-severity"');
    expect(html).toContain('data-hz-select-trigger-tone="signal-query"');
    expect(html).toContain('data-log-manage-query-token-input="trace-id"');
    expect(html).toContain('data-log-manage-query-token-input="span-id"');
    expect(html).toContain('data-log-manage-query-token-input-owner="hertzbeat-ui-input"');
    expect(html).toContain('data-hz-input-width="log-query-token"');
    expect(html).toContain('data-log-manage-query-body-input="shared-log-body-input"');
    expect(html).toContain('data-log-manage-query-body-input-owner="hertzbeat-ui-input"');
    expect(html).toContain('data-hz-input-width="log-query-body"');
    expect(html).toContain('placeholder="service.name = &quot;checkout&quot;"');
    expect(html).toContain('data-log-manage-chart-band="cold-chart-band"');
    expect(html).toContain('data-log-manage-chart-padding-owner="hertzbeat-ui-panel-surface"');
    expect(html).toContain('data-hz-panel-surface-padding="chart"');
    expect(html).toContain('data-log-manage-log-list="cold-dense-log-list"');
    expect(html).toContain('data-log-manage-table-chrome-owner="hertzbeat-ui-data-table"');
    expect(html).toContain('data-hz-ui="data-table"');
    expect(html).toContain('data-log-manage-table-header-owner="hertzbeat-ui-panel-header"');
    expect(html).toContain('data-hz-ui="panel-header"');
    expect(html).toContain('data-log-manage-table-count-badge-owner="hertzbeat-ui-status-badge"');
    expect(html).toContain('data-log-manage-detail-panel="cold-detail-panel"');
    expect(html).toContain('data-log-manage-detail-header-owner="hertzbeat-ui-panel-header"');
    expect(html).toContain('data-hz-panel-header-eyebrow="true"');
    expect(html).toContain('data-log-manage-row-detail-action="true"');
    expect(html).toContain('data-log-manage-severity-tone="danger"');
    expect(html).toContain(tZh('log.manage.stream.action.view-log'));
    expect(html).toContain('data-log-manage-selected-evidence="selected-log-evidence"');
    expect(html).toContain('data-log-manage-selected-evidence-owner="hertzbeat-ui-detail-rows"');
    expect(html).toContain('data-log-manage-detail-facts-owner="hertzbeat-ui-detail-rows"');
    expect(html).toContain(tZh('log.manage.evidence.title'));
    expect(html).toContain(tZh('log.manage.evidence.time.title'));
    expect(html).toContain(tZh('log.manage.evidence.severity.title'));
    expect(html).toContain(tZh('log.manage.evidence.body.title'));
    expect(html).toContain(tZh('log.manage.evidence.latest.title'));
    expect(html).not.toContain('data-log-manage-hertzbeat-loop="collector-template-alert-loop"');
    expect(html).toContain('data-log-manage-entity-context="hertzbeat-signal-entity-context"');
    expect(html).toContain('data-log-manage-entity-context-owner="hertzbeat-ui-detail-rows"');
    expect(html).toContain('data-log-manage-selected-attribution-diagnostics-owner="hertzbeat-ui-attribute-diagnostics"');
    expect(html).toContain('data-hz-ui="attribute-diagnostics"');
    expect(html).not.toContain('data-log-manage-intake-quality="logs-collector-quality"');
    expect(html).not.toContain('data-log-manage-intake-quality-row=');
    expect(html).toContain('data-log-manage-row-trace-detail-action="true"');
    expect(html).toContain(tZh('log.manage.route.title'));
    expect(html).toContain(tZh('log.manage.route.subtitle'));
    expect(html).not.toContain('Log troubleshooting can return to intake overview, collector clusters, monitor templates, and alert handling context.');
    expect(html).not.toContain('Keep query, trend, list, and detail in one dense workbench');
    expect(html).not.toContain('Log query continues to retain');
    expect(html).toContain(tZh('log.manage.query.run.history'));
    expect(html).toContain(tZh('log.manage.query.severity.aria'));
    expect(html).toContain(tZh('log.manage.trend.title'));
    expect(html).toContain(tZh('log.manage.list.title'));
    expect(html).not.toContain('HertzBeat collection loop');
    expect(html).not.toContain('Alert loop');
    expect(html).not.toContain('Intake quality');
    expect(html).not.toContain('Log collection quality');
    expect(html).not.toContain('Received volume');
    expect(html).not.toContain('Parse failures');
    expect(html).not.toContain('Entity merge failures');
    expect(html).not.toContain('Collector nodes');
    expect(html).toContain('/ingestion/otlp?signal=logs');
    expect(html).toContain(tZh('log.manage.context.entity.title'));
    expect(html).toContain(tZh('signal.context.entity.label'));
    expect(html).toContain(tZh('signal.context.source.label'));
    expect(html).toContain(tZh('log.manage.route.action.entity'));
    expect(html).toContain(tZh('log.manage.route.action.alerts'));
    expect(html).toContain('data-log-manage-signal-handoff-hint="log-trace-metric-context"');
    expect(html).toContain(tZh('log.manage.handoff.signal-hint'));
    expect(html).not.toContain('Alert rules');
    expect(html).not.toContain('Save view');
    expect(html).not.toContain('Create alert');
    expect(html).not.toContain('Add to dashboard');
    expect(html).toContain('checkout timeout');
    expect(html).toContain('checkout');
    expect(html).toContain(tZh('log.manage.handoff.traces'));
    expect(html).toContain(tZh('log.manage.handoff.metrics'));
    expect(html).toContain('/entities/7?entityId=7');
    expect(html).toContain('/alert?status=firing&amp;signal=logs');
    expect(html).not.toContain('signoz-');
    expect(html).not.toContain('data-log-manage-floating-actions');
    expect(html).not.toContain('Explorer');
    expect(html).not.toContain('Pipelines');
    expect(html).not.toContain('Views');
    expect(html).not.toContain('Run Query');
    expect(html).not.toContain('Save this view');
    expect(html).not.toContain('Create an Alert');
    expect(html).not.toContain('Add to Dashboard');
    expect(html).not.toContain('data-workspace-shell');
    expect(html).not.toContain('Query Results');
    expect(html).not.toContain('Connection status');
  });

  it('disables log-to-trace actions with translated hover text when the selected log has no traceId', async () => {
    mockState.searchParams = new URLSearchParams('view=list');
    const originalContent = mockState.renderData.list.content;
    mockState.renderData.list.content = [
      {
        ...originalContent[0],
        traceId: '',
        spanId: '',
        body: 'self monitor heartbeat without trace context'
      }
    ];

    try {
      const html = renderLogManagePage();

      expect(html).toContain('data-log-manage-results-open-trace-action="true"');
      expect(html).toContain('data-log-manage-results-open-trace-action-disabled="missing-trace-id"');
      expect(html).toContain('title="log.manage.handoff.trace-disabled"');
      expect(html).toContain('disabled=""');
    } finally {
      mockState.renderData.list.content = originalContent;
    }
  });

  it('opens the first trace-matched log in the side detail when a trace route lands on history', async () => {
    mockState.searchParams = new URLSearchParams('view=list&traceId=trace-123&spanId=span-456');
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      renderInteractiveLogManagePage();
      await Promise.resolve();
      await Promise.resolve();
    });

    const detailDialog = interactionContainer.querySelector('[data-log-stream-detail-dialog="true"]');
    const openTraceAction = detailDialog?.querySelector('[data-log-manage-results-open-trace-action="true"]') as HTMLButtonElement | null;

    expect(detailDialog).not.toBeNull();
    expect(detailDialog?.getAttribute('data-log-stream-detail-trace-id')).toBe('trace-123');
    expect(detailDialog?.textContent).toContain('checkout timeout');
    expect(openTraceAction).not.toBeNull();
    expect(openTraceAction?.disabled).toBe(false);
    expect(openTraceAction?.getAttribute('data-log-manage-results-open-trace-action-disabled')).toBeNull();
  });

  it('opens the first trace-matched seeded stream row in the side detail when a trace route lands on stream', async () => {
    mockState.searchParams = new URLSearchParams('view=stream&traceId=trace-123&spanId=span-456');
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      renderInteractiveLogManagePage();
      await Promise.resolve();
      await Promise.resolve();
    });

    const detailDialog = interactionContainer.querySelector('[data-log-stream-detail-dialog="true"]');
    const selectedStreamRow = interactionContainer.querySelector('[data-log-manage-stream-selected="true"]');

    expect(detailDialog).not.toBeNull();
    expect(detailDialog?.getAttribute('data-log-stream-detail-trace-id')).toBe('trace-123');
    expect(detailDialog?.getAttribute('data-log-stream-detail-selection')).toBe('attached');
    expect(selectedStreamRow).not.toBeNull();
  });

  it('shows HertzBeat attribution diagnostics in the log detail drawer for self-monitoring logs without entity id', async () => {
    mockState.searchParams = new URLSearchParams('view=list');
    const originalContent = mockState.renderData.list.content;
    mockState.renderData.list.content = [
      {
        ...originalContent[0],
        traceId: '',
        spanId: '',
        body: 'self monitor heartbeat without trace context',
        resource: {
          'service.name': 'HertzBeat',
          'hertzbeat.collector': 'collector-local',
          'hertzbeat.template': 'hertzbeat-self'
        },
        attributes: {
          'hertzbeat.event_id': 'event-1'
        }
      }
    ];

    try {
      interactionContainer = document.createElement('div');
      document.body.appendChild(interactionContainer);
      interactionRoot = createRoot(interactionContainer);

      await act(async () => {
        renderInteractiveLogManagePage();
        await Promise.resolve();
      });

      const row = interactionContainer.querySelector('[data-log-manage-row-detail-action="true"]') as HTMLElement | null;
      expect(row).not.toBeNull();

      await act(async () => {
        row?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await Promise.resolve();
      });

      const detailDialog = interactionContainer.querySelector('[data-log-stream-detail-dialog="true"]');
      expect(detailDialog).not.toBeNull();
      expect(detailDialog?.textContent).toContain(tZh('log.manage.selected.attribution.title'));
      expect(detailDialog?.textContent).toContain('hertzbeat.entity_id');
      expect(detailDialog?.textContent).toContain(tZh('log.manage.attribution.entity-id.missing'));
      expect(detailDialog?.textContent).toContain('hertzbeat.collector');
      expect(detailDialog?.textContent).toContain('collector-local');
      expect(detailDialog?.textContent).toContain('hertzbeat.template');
      expect(detailDialog?.textContent).toContain('hertzbeat-self');
    } finally {
      mockState.renderData.list.content = originalContent;
    }
  });

  it('shows HertzBeat attribution diagnostics in the selected log panel before opening the detail drawer', async () => {
    mockState.searchParams = new URLSearchParams('view=list');
    const originalContent = mockState.renderData.list.content;
    mockState.renderData.list.content = [
      {
        ...originalContent[0],
        traceId: '',
        spanId: '',
        body: 'self monitor heartbeat without entity context',
        resource: {
          'service.name': 'HertzBeat',
          'hertzbeat.collector': 'collector-local',
          'hertzbeat.template': 'hertzbeat-self'
        },
        attributes: {
          'hertzbeat.event_id': 'event-1'
        }
      }
    ];

    try {
      const html = renderLogManagePage();

      expect(html).toContain('data-log-manage-selected-attribution-diagnostics="hertzbeat-attribute-diagnostics"');
      expect(html).toContain(tZh('log.manage.selected.attribution.title'));
      expect(html).toContain('hertzbeat.entity_id');
      expect(html).toContain(tZh('log.manage.attribution.entity-id.missing'));
      expect(html).toContain('hertzbeat.collector');
      expect(html).toContain('collector-local');
      expect(html).toContain('hertzbeat.template');
      expect(html).toContain('hertzbeat-self');
    } finally {
      mockState.renderData.list.content = originalContent;
    }
  });

  it('opens log detail first, then the related trace drawer with a full-trace workspace action', async () => {
    mockState.searchParams = new URLSearchParams('view=list');
    apiMessageGet.mockImplementation(async (url: string) => {
      if (url === '/traces/trace-123') {
        return {
          traceId: 'trace-123',
          rootSpanId: 'span-456',
          serviceName: 'checkout',
          serviceNamespace: 'payments',
          rootSpanName: 'POST /checkout',
          durationNanos: 420_000_000,
          status: 'ERROR',
          startTime: 1713200000000,
          errorSpanCount: 1,
          spans: []
        };
      }
      if (url === '/traces/trace-123/spans') {
        return [
          {
            traceId: 'trace-123',
            spanId: 'span-456',
            parentSpanId: null,
            spanName: 'POST /checkout',
            serviceName: 'checkout',
            status: 'ERROR',
            spanKind: 'SERVER',
            durationNanos: 420_000_000,
            startTime: 1713200000000,
            resourceAttributes: {
              'service.namespace': 'payments'
            },
            spanAttributes: {
              'http.route': '/checkout'
            },
            events: [],
            links: []
          },
          {
            traceId: 'trace-123',
            spanId: 'span-db',
            parentSpanId: 'span-456',
            spanName: 'SELECT inventory',
            serviceName: 'inventory',
            status: 'ERROR',
            spanKind: 'CLIENT',
            durationNanos: 120_000_000,
            startTime: 1713200000060,
            resourceAttributes: {
              'service.namespace': 'payments'
            },
            spanAttributes: {
              'db.system': 'postgres'
            },
            events: [
              { name: 'db.wait', timeUnixNano: 1713200000100000000, attributes: { queue: 'inventory' } },
              { name: 'exception', timeUnixNano: 1713200000140000000, attributes: { error: 'timeout' } }
            ],
            links: []
          }
        ];
      }
      throw new Error(`Unexpected trace preview URL: ${url}`);
    });
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      renderInteractiveLogManagePage();
      await Promise.resolve();
    });

    const traceCellAction = interactionContainer.querySelector('[data-log-manage-row-trace-detail-action="true"]') as HTMLButtonElement | null;
    expect(traceCellAction).not.toBeNull();

    await act(async () => {
      traceCellAction?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    const detailDialog = interactionContainer.querySelector('[data-log-stream-detail-dialog="true"]');
    expect(detailDialog).not.toBeNull();
    expect(interactionContainer.querySelector('[data-log-related-trace-dialog="true"]')).toBeNull();

    const openTraceAction = detailDialog?.querySelector('[data-log-manage-results-open-trace-action="true"]') as HTMLButtonElement | null;
    expect(openTraceAction).not.toBeNull();

    await act(async () => {
      openTraceAction?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    const relatedTraceDialog = interactionContainer.querySelector('[data-log-related-trace-dialog="true"]');
    const fullTraceAction = relatedTraceDialog?.querySelector('[data-log-related-trace-open-workspace-action="true"]') as HTMLAnchorElement | null;

    expect(apiMessageGet).toHaveBeenCalledWith('/traces/trace-123');
    expect(apiMessageGet).toHaveBeenCalledWith('/traces/trace-123/spans');
    expect(relatedTraceDialog).not.toBeNull();
    expect(relatedTraceDialog?.textContent).toContain('POST /checkout');
    expect(relatedTraceDialog?.textContent).toContain(tZh('log.manage.related-trace.badge'));
    expect(relatedTraceDialog?.textContent).toContain(tZh('log.manage.related-trace.spans-count', { count: 2 }));
    expect(relatedTraceDialog?.textContent).toContain(tZh('log.manage.related-trace.fact.events'));
    expect(relatedTraceDialog?.textContent).toContain(tZh('trace.manage.selected-span.service-namespace'));
    expect(relatedTraceDialog?.textContent).toContain(tZh('trace.manage.trace-state-empty'));
    expect(relatedTraceDialog?.textContent).toContain(tZh('log.manage.related-trace.fact.links'));
    const stageFacts = relatedTraceDialog?.querySelector('[data-log-related-trace-stage-facts="true"]');
    expect(stageFacts?.textContent).toContain(tZh('log.manage.related-trace.fact.events'));
    expect(stageFacts?.textContent).toContain('2');
    expect(relatedTraceDialog?.querySelectorAll('[data-waterfall-event-marker="true"]')).toHaveLength(2);
    expect(relatedTraceDialog?.querySelectorAll('[data-waterfall-minimap-event-marker="true"]')).toHaveLength(2);
    expect(relatedTraceDialog?.querySelector('[aria-label="exception"]')).not.toBeNull();
    expect(relatedTraceDialog?.textContent).not.toContain('4 spans');
    expect(relatedTraceDialog?.textContent).not.toContain('service / namespace');
    expect(relatedTraceDialog?.textContent).not.toContain('trace state -');
    expect(relatedTraceDialog?.textContent).not.toContain('Links');
    expect(fullTraceAction).not.toBeNull();
    const fullTraceHref = fullTraceAction?.getAttribute('href') || '';
    const fullTraceUrl = new URL(fullTraceHref, 'https://example.com');
    expect(fullTraceUrl.pathname).toBe('/trace/manage');
    expect(fullTraceUrl.searchParams.get('traceId')).toBe('trace-123');
    expect(fullTraceUrl.searchParams.get('spanId')).toBe('span-456');
    expect(fullTraceUrl.searchParams.get('source')).toBe('otlp');
    const returnTo = fullTraceUrl.searchParams.get('returnTo');
    expect(returnTo).toBeTruthy();
    const returnToUrl = new URL(String(returnTo), 'https://example.com');
    expect(returnToUrl.pathname).toBe('/log/manage');
    expect(returnToUrl.searchParams.get('view')).toBe('list');
    expect(returnToUrl.searchParams.get('source')).toBe('otlp');
    expect(returnToUrl.searchParams.get('returnLabel')).toBeNull();
    expect(fullTraceUrl.searchParams.get('returnLabel')).toBeNull();
  });

  it('keeps side-panel trace actions on the log detail drawer before loading trace preview', async () => {
    mockState.searchParams = new URLSearchParams('view=list');
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      renderInteractiveLogManagePage();
      await Promise.resolve();
    });

    const sidePanelTraceAction = interactionContainer.querySelector(
      '[data-log-manage-open-log-detail-before-trace="true"]'
    ) as HTMLButtonElement | null;
    expect(sidePanelTraceAction).not.toBeNull();

    await act(async () => {
      sidePanelTraceAction?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    const detailDialog = interactionContainer.querySelector('[data-log-stream-detail-dialog="true"]');

    expect(detailDialog).not.toBeNull();
    expect(detailDialog?.textContent).toContain('checkout timeout');
    expect(interactionContainer.querySelector('[data-log-related-trace-dialog="true"]')).toBeNull();
    expect(apiMessageGet).not.toHaveBeenCalled();
  });

  it('loads the same log API URLs for the current query state', async () => {
    mockState.searchParams = new URLSearchParams('search=timeout&traceId=trace-123&severityText=ERROR&severityNumber=17');
    apiMessageGet
      .mockResolvedValueOnce(mockState.renderData.overview)
      .mockResolvedValueOnce(mockState.renderData.list)
      .mockResolvedValueOnce(mockState.renderData.trend)
      .mockResolvedValueOnce(mockState.renderData.coverage);
    const html = renderLogManagePage();
    await mockState.lastLoad?.();

    expect(html).toContain('data-cache-key="log-manage|list|');
    expect(html).toContain('/logs/stats/overview?search=timeout&amp;traceId=trace-123&amp;severityText=ERROR&amp;severityNumber=17');
    expect(html).toContain('/logs/list?pageIndex=0&amp;pageSize=8&amp;search=timeout&amp;traceId=trace-123&amp;severityText=ERROR&amp;severityNumber=17');
    expect(html).toContain('/logs/stats/trend?search=timeout&amp;traceId=trace-123&amp;severityText=ERROR&amp;severityNumber=17');
    expect(html).toContain('/logs/stats/trace-coverage?search=timeout&amp;traceId=trace-123&amp;severityText=ERROR&amp;severityNumber=17');
    expect(html).toContain('data-cache-settled-ttl="10000"');
    expect(apiMessageGet.mock.calls.map(([url]) => url)).toEqual([
      '/logs/stats/overview?search=timeout&traceId=trace-123&severityText=ERROR&severityNumber=17',
      '/logs/list?pageIndex=0&pageSize=8&search=timeout&traceId=trace-123&severityText=ERROR&severityNumber=17',
      '/logs/stats/trend?search=timeout&traceId=trace-123&severityText=ERROR&severityNumber=17',
      '/logs/stats/trace-coverage?search=timeout&traceId=trace-123&severityText=ERROR&severityNumber=17'
    ]);
    expect(apiMessageGet.mock.calls.every(([, init]) => init?.signal instanceof AbortSignal)).toBe(true);
  });

  it('returns an explicit degraded empty state when the log API blocks the initial route load', async () => {
    mockState.searchParams = new URLSearchParams('view=list');
    apiMessageGet.mockRejectedValueOnce(new Error('Log API request timed out after 3500ms'));
    renderLogManagePage();
    const result = await mockState.lastLoad?.() as any;

    expect(result.loadStatus).toEqual({
      state: 'degraded',
      message: 'Log API request timed out after 3500ms'
    });
    expect(result.list.content).toEqual([]);
    expect(result.overview.totalLogs).toBe(0);
    expect(result.trend.hourlyStats).toEqual({});
    expect(result.coverage.traceCoverage.withTrace).toBe(0);
  });

  it('normalizes live log overview counters before rendering status cards', async () => {
    mockState.searchParams = new URLSearchParams('view=list');
    apiMessageGet
      .mockResolvedValueOnce({
        totalCount: 42,
        errorCount: 5,
        warnCount: 7,
        infoCount: 30,
        traceCount: 1
      })
      .mockResolvedValueOnce(mockState.renderData.list)
      .mockResolvedValueOnce(mockState.renderData.trend)
      .mockResolvedValueOnce(mockState.renderData.coverage);
    renderLogManagePage();
    const result = await mockState.lastLoad?.() as any;

    expect(result.overview.totalLogs).toBe(42);
    expect(result.overview.errorLogs).toBe(5);
    expect(result.overview.totalCount).toBe(42);
    expect(result.overview.errorCount).toBe(5);
  });
});
