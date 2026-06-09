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
const originalFetch = globalThis.fetch;

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
    group: {
      groupBy: '',
      groups: []
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
  DEFAULT_LOG_DISPLAY_FORMAT: 'default',
  DEFAULT_LOG_MAX_LINES: '1',
  DEFAULT_LOG_LIST_PAGE_SIZE: '8',
  DEFAULT_LOG_LIST_PAGE_INDEX: '0',
  LOG_LIST_PAGE_SIZE_OPTIONS: ['8', '20', '50', '100', '200'],
  DEFAULT_LOG_TABLE_COLUMNS: ['time', 'severity', 'service', 'body', 'trace-id'],
  MAX_LOG_FIELD_COLUMNS: 6,
  LOG_DISPLAY_FORMAT_PARAM: 'format',
  LOG_MAX_LINES_PARAM: 'maxLines',
  LOG_TABLE_COLUMN_KEYS: ['time', 'severity', 'service', 'body', 'trace-id', 'span-id'],
  buildLogStreamUrl: (query: any, routeContext: any = {}) => {
    const params = new URLSearchParams();
    if (query.search) params.set('logContent', query.search);
    if (query.logContent) params.set('logContent', query.logContent);
    if (query.traceId) params.set('traceId', query.traceId);
    if (query.spanId) params.set('spanId', query.spanId);
    if (query.logTimeUnixNano) params.set('logTimeUnixNano', query.logTimeUnixNano);
    if (query.severityText) params.set('severityText', query.severityText);
    if (routeContext.serviceName) params.set('serviceName', routeContext.serviceName);
    if (routeContext.environment) params.set('environment', routeContext.environment);
    const queryString = params.toString();
    return queryString ? `/api/logs/sse/subscribe?${queryString}` : '/api/logs/sse/subscribe';
  },
  resolveBrowserLogStreamUrl: (streamPath: string) => streamPath,
  buildLogUrls: (query: any, routeContext: any = {}) => {
    const listPageSize = ['8', '20', '50', '100', '200'].includes(query.listPageSize) ? query.listPageSize : '8';
    const listPageIndex = /^\d+$/.test(query.listPageIndex || '') ? query.listPageIndex : '0';
    const listParams = new URLSearchParams({ pageIndex: listPageIndex, pageSize: listPageSize });
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
    if (routeContext.serviceName) {
      listParams.set('serviceName', routeContext.serviceName);
      statsParams.set('serviceName', routeContext.serviceName);
    }
    if (routeContext.environment) {
      listParams.set('environment', routeContext.environment);
      statsParams.set('environment', routeContext.environment);
    }
    const queryString = statsParams.toString();
    const groupParams = new URLSearchParams(statsParams);
    if (query.groupBy) groupParams.set('groupBy', query.groupBy);
    if (query.groupLimit) groupParams.set('limit', query.groupLimit);
    if (query.groupBy && query.groupOrder && query.groupOrder !== 'count-desc') groupParams.set('orderBy', query.groupOrder);
    if (query.groupBy && query.groupMinCount) groupParams.set('minCount', query.groupMinCount);
    const groupQueryString = groupParams.toString();
    return {
      listUrl: `/logs/list?${listParams.toString()}`,
      overviewUrl: queryString ? `/logs/stats/overview?${queryString}` : '/logs/stats/overview',
      trendUrl: queryString ? `/logs/stats/trend?${queryString}` : '/logs/stats/trend',
      coverageUrl: queryString ? `/logs/stats/trace-coverage?${queryString}` : '/logs/stats/trace-coverage',
      groupByUrl: groupQueryString ? `/logs/stats/group-by?${groupQueryString}` : '/logs/stats/group-by'
    };
  },
  queryStateFromParams: (searchParams: { get(name: string): string | null }) => ({
    search: searchParams.get('search') || searchParams.get('content') || '',
    logContent: searchParams.get('logContent') || '',
    traceId: searchParams.get('traceId') || '',
    spanId: searchParams.get('spanId') || '',
    logTimeUnixNano: /^\d+$/.test(searchParams.get('logTimeUnixNano') || '') ? searchParams.get('logTimeUnixNano') : undefined,
    severityNumber: searchParams.get('severityNumber') || '',
    severityText: searchParams.get('severityText') || '',
    groupBy: searchParams.get('groupBy') || undefined,
    groupLimit: searchParams.get('groupLimit') || undefined,
    groupOrder: searchParams.get('groupOrder') === 'count-asc' ? 'count-asc' : undefined,
    groupMinCount: searchParams.get('groupMinCount') || undefined,
    columns: (searchParams.get('columns') || 'time,severity,service,body,trace-id').split(',').filter(Boolean),
    fieldColumns: (searchParams.get('fieldColumns') || '')
      .split(',')
      .map(value => value.trim())
      .filter(value => /^(resource|attribute):[A-Za-z0-9_.:-]+$/.test(value))
      .filter((value, index, values) => values.indexOf(value) === index)
      .slice(0, 6),
    displayFormat: searchParams.get('format') === 'raw' || searchParams.get('format') === 'column' ? searchParams.get('format') : 'default',
    maxLines: /^[1-9]$|^10$/.test(searchParams.get('maxLines') || '') ? searchParams.get('maxLines') : '1',
    listPageSize: ['8', '20', '50', '100', '200'].includes(searchParams.get('listPageSize') || '') ? searchParams.get('listPageSize') || '8' : '8',
    listPageIndex: /^\d+$/.test(searchParams.get('listPageIndex') || '') ? searchParams.get('listPageIndex') || '0' : '0'
  }),
  resolveLogMaxLines: (searchParams: { get(name: string): string | null }) => (/^[1-9]$|^10$/.test(searchParams.get('maxLines') || '') ? searchParams.get('maxLines') : '1'),
  resolveLogWorkbenchView: (searchParams: { get(name: string): string | null }) => {
    const view = searchParams.get('view');
    if (view === 'stream') return 'stream';
    if (view === 'list' || view === 'history') return 'list';
    if (view === 'time-series' || view === 'timeseries') return 'time-series';
    if (view === 'table') return 'table';
    return 'stream';
  }
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
  buildLogAttributeRows: (entry: any) => {
    const t = createTranslatorMock({ locale: 'zh-CN' });
    if (!entry) {
      return [{ key: 'empty', source: '-', name: t('log.manage.attributes.empty.name'), value: t('log.manage.attributes.empty.value') }];
    }
    return [
      ...Object.entries(entry.attributes || {}).map(([key, value]) => ({
        key: `attribute-${key}`,
        source: t('log.manage.attributes.source.attribute'),
        name: key,
        value: String(value)
      })),
      ...Object.entries(entry.resource || {}).map(([key, value]) => ({
        key: `resource-${key}`,
        source: t('log.manage.attributes.source.resource'),
        name: key,
        value: String(value)
      }))
    ];
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
  buildLogAlertRuleDraft: (query: any, routeContext: any = {}) => ({
    name: routeContext.serviceName ? `${routeContext.serviceName} log alert` : 'Log alert',
    query: query.search ? `search=${query.search}` : '',
    queryType: 'logs'
  }),
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
  buildLogMetricsPreviewTargets: (metricsHref: string | null | undefined) => {
    if (!metricsHref) return [];
    const filter = new URL(metricsHref, 'http://localhost').searchParams.get('filter') || '';
    const targets = [];
    if (/k8s\.(pod|container|node|namespace)\.name\s*=/.test(filter)) {
      targets.push(
        { family: 'cpu', query: 'container.cpu.usage', source: 'k8s' },
        { family: 'memory', query: 'container.memory.working_set', source: 'k8s' }
      );
    }
    if (/host\.name\s*=/.test(filter)) {
      targets.push(
        { family: 'cpu', query: 'system.cpu.utilization', source: 'host' },
        { family: 'memory', query: 'system.memory.usage', source: 'host' }
      );
    }
    return targets;
  },
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
    const metricsParams = new URLSearchParams('traceId=trace-123&spanId=span-456&serviceName=checkout');
    const metricFilter = [
      entry?.resource?.['k8s.namespace.name'] ? `k8s.namespace.name="${entry.resource['k8s.namespace.name']}"` : '',
      entry?.resource?.['k8s.pod.name'] ? `k8s.pod.name="${entry.resource['k8s.pod.name']}"` : '',
      entry?.resource?.['k8s.node.name'] ? `k8s.node.name="${entry.resource['k8s.node.name']}"` : '',
      entry?.resource?.['k8s.container.name'] ? `k8s.container.name="${entry.resource['k8s.container.name']}"` : '',
      entry?.resource?.['host.name'] ? `host.name="${entry.resource['host.name']}"` : ''
    ].filter(Boolean).join(' and ');
    if (metricFilter) metricsParams.set('filter', metricFilter);
    if (options.metricsReturnTo) metricsParams.set('returnTo', options.metricsReturnTo);

    const alertRulesParams = new URLSearchParams('signal=logs&entityId=7&serviceName=checkout&environment=prod&timeRange=last-1h&source=otlp');
    if (options.alertDraft?.name) alertRulesParams.set('alertName', options.alertDraft.name);
    if (options.alertDraft?.query) alertRulesParams.set('alertQuery', options.alertDraft.query);
    if (options.alertDraft?.queryType) alertRulesParams.set('alertQueryType', options.alertDraft.queryType);

    return {
      intakeHref: '/ingestion/otlp?signal=logs&entityId=7&serviceName=checkout&environment=prod&timeRange=last-1h&source=otlp',
      traceHref: `/trace/manage?${traceParams.toString()}`,
      metricsHref: `/ingestion/otlp/metrics?${metricsParams.toString()}`,
      entitiesHref: '/entities?search=checkout',
      entityHref: '/entities/7?entityId=7&serviceName=checkout&environment=prod&timeRange=last-1h&source=otlp',
      alertHandlingHref: '/alert?status=firing&signal=logs&search=checkout&entityId=7&serviceName=checkout&environment=prod&timeRange=last-1h&source=otlp',
      alertRulesHref: `/alert/setting?${alertRulesParams.toString()}`,
      dashboardHref: '/dashboard?intent=add-panel&signal=logs&panelTitle=checkout&entityId=7&serviceName=checkout&environment=prod&timeRange=last-1h&source=otlp'
    };
  }
}));

vi.mock('./route-state', () => ({
  buildLogManageRoute: (routeContext: any, query: any, view?: string) => {
    const params = new URLSearchParams();
    if (query.search) params.set('search', query.search);
    if (query.traceId) params.set('traceId', query.traceId);
    if (query.spanId) params.set('spanId', query.spanId);
    if (query.logTimeUnixNano) params.set('logTimeUnixNano', query.logTimeUnixNano);
    if (query.severityText) params.set('severityText', query.severityText);
    if (query.severityNumber) params.set('severityNumber', query.severityNumber);
    if (query.resourceFilter) params.set('resourceFilter', query.resourceFilter);
    if (query.attributeFilter) params.set('attributeFilter', query.attributeFilter);
    if (query.groupBy) params.set('groupBy', query.groupBy);
    if (query.groupLimit) params.set('groupLimit', query.groupLimit);
    if (query.groupBy && query.groupOrder && query.groupOrder !== 'count-desc') params.set('groupOrder', query.groupOrder);
    if (query.groupBy && query.groupMinCount) params.set('groupMinCount', query.groupMinCount);
    if (query.columns && query.columns.join(',') !== 'time,severity,service,body,trace-id') params.set('columns', query.columns.join(','));
    if (query.fieldColumns?.length) params.set('fieldColumns', query.fieldColumns.join(','));
    if (query.displayFormat && query.displayFormat !== 'default') params.set('format', query.displayFormat);
    if (query.maxLines && query.maxLines !== '1') params.set('maxLines', query.maxLines);
    if (query.listPageSize && query.listPageSize !== '8') params.set('listPageSize', query.listPageSize);
    if (query.listPageIndex && query.listPageIndex !== '0') params.set('listPageIndex', query.listPageIndex);
    if (view) params.set('view', view);
    if (routeContext.start) params.set('start', routeContext.start);
    if (routeContext.end) params.set('end', routeContext.end);
    if (routeContext.timeRange) params.set('timeRange', routeContext.timeRange);
    if (routeContext.live) params.set('live', routeContext.live);
    if (routeContext.tz) params.set('tz', routeContext.tz);
    if (routeContext.serviceName) params.set('serviceName', routeContext.serviceName);
    if (routeContext.environment) params.set('environment', routeContext.environment);
    params.set('source', routeContext.source || 'otlp');
    return params.toString() ? `/log/manage?${params.toString()}` : '/log/manage';
  },
  buildResetLogManageRoute: () => '/log/manage'
}));

const zhT = createTranslatorMock({ locale: 'zh-CN' });

function tZh(key: string, params?: TranslationParams) {
  return zhT(key, params);
}

function htmlAttributeValue(value: string) {
  return value.replace(/"/g, '&quot;');
}

function typeInputValue(input: HTMLInputElement, value: string) {
  const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  valueSetter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function buildLogManageRouteState(): LogManageRouteState {
  const query: LogQueryState = {
    search: mockState.searchParams.get('search') || mockState.searchParams.get('content') || '',
    logContent: mockState.searchParams.get('logContent') || '',
    traceId: mockState.searchParams.get('traceId') || '',
    spanId: mockState.searchParams.get('spanId') || '',
    logTimeUnixNano: /^\d+$/.test(mockState.searchParams.get('logTimeUnixNano') || '') ? mockState.searchParams.get('logTimeUnixNano') || undefined : undefined,
    severityNumber: mockState.searchParams.get('severityNumber') || '',
    severityText: mockState.searchParams.get('severityText') || '',
    resourceFilter: mockState.searchParams.get('resourceFilter') || undefined,
    attributeFilter: mockState.searchParams.get('attributeFilter') || undefined,
    groupBy: mockState.searchParams.get('groupBy') || undefined,
    groupLimit: mockState.searchParams.get('groupLimit') || undefined,
    groupOrder: mockState.searchParams.get('groupOrder') === 'count-asc' ? 'count-asc' : undefined,
    groupMinCount: mockState.searchParams.get('groupMinCount') || undefined,
    columns: (mockState.searchParams.get('columns') || 'time,severity,service,body,trace-id').split(',').filter(Boolean) as LogQueryState['columns'],
    fieldColumns: (mockState.searchParams.get('fieldColumns') || '')
      .split(',')
      .map(value => value.trim())
      .filter(value => /^(resource|attribute):[A-Za-z0-9_.:-]+$/.test(value))
      .filter((value, index, values) => values.indexOf(value) === index)
      .slice(0, 6) as LogQueryState['fieldColumns'],
    displayFormat: (mockState.searchParams.get('format') === 'raw' || mockState.searchParams.get('format') === 'column' ? mockState.searchParams.get('format') : 'default') as LogQueryState['displayFormat'],
    maxLines: /^[1-9]$|^10$/.test(mockState.searchParams.get('maxLines') || '') ? mockState.searchParams.get('maxLines') || '1' : '1',
    listPageSize: ['8', '20', '50', '100', '200'].includes(mockState.searchParams.get('listPageSize') || '')
      ? mockState.searchParams.get('listPageSize') || '8'
      : '8',
    listPageIndex: /^\d+$/.test(mockState.searchParams.get('listPageIndex') || '')
      ? mockState.searchParams.get('listPageIndex') || '0'
      : '0'
  };
  const requestedView = mockState.searchParams.get('view');
  const currentView: LogWorkbenchView =
    requestedView === 'list' || requestedView === 'history'
      ? 'list'
      : requestedView === 'time-series' || requestedView === 'timeseries'
        ? 'time-series'
        : requestedView === 'table'
          ? 'table'
      : requestedView === 'stream'
        ? 'stream'
        : query.search || query.traceId || query.spanId || query.severityNumber || query.severityText || query.fieldColumns?.length
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
      spanId: mockState.searchParams.get('spanId') || undefined,
      operationName: mockState.searchParams.get('operationName') || undefined
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

async function flushDashboardEditPromises() {
  for (let index = 0; index < 8; index += 1) {
    await Promise.resolve();
  }
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
  globalThis.fetch = originalFetch;
});

describe('log manage page', () => {
  it('keeps log manage on the OTLP cold Workbench owner instead of the old external-product shell', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/log/manage/log-manage-page.tsx'), 'utf8');
    const messagesSource = readFileSync(resolve(process.cwd(), 'lib/i18n-runtime-messages.ts'), 'utf8');

    expect(source).toContain('data-log-manage-route="otlp-hertzbeat-ui-log-workbench"');
    expect(source).toContain('data-log-manage-style-baseline="hertzbeat-ui-matte"');
    expect(source).toContain('data-log-manage-header-padding-owner="hertzbeat-ui-panel-surface"');
    expect(source).toContain('padding="header"');
    expect(source).not.toContain('data-log-manage-header="hertzbeat-ui-compact-header" data-log-manage-panel-surface="header" className="px-5 py-4"');
    expect(source).toContain('data-log-manage-query-bar="hertzbeat-ui-query-row"');
    expect(source).toContain('data-log-manage-panel-surface-padding-owner="hertzbeat-ui-panel-surface"');
    expect(source).toContain('padding="query"');
    expect(source).not.toContain('data-log-manage-query-bar="hertzbeat-ui-query-row" data-log-manage-panel-surface="query" className="px-4 py-3"');
    expect(source).toContain('data-log-manage-api-degraded="true"');
    expect(source).toContain('data-log-manage-api-degraded-owner="hertzbeat-ui-state-notice"');
    expect(messagesSource).toContain("'log.manage.api.degraded.title':");
    expect(messagesSource).toContain("'log.manage.api.degraded.copy':");
    expect(source).toContain('data-log-manage-chart-band="hertzbeat-ui-chart-band"');
    expect(source).toContain('data-log-manage-chart-padding-owner="hertzbeat-ui-panel-surface"');
    expect(source).toContain('data-log-manage-explorer-view="time-series"');
    expect(source).toContain('data-log-manage-explorer-view-owner="hertzbeat-ui-signal-time-series"');
    expect(source).toContain('padding="chart"');
    expect(source).toContain('data-log-manage-summary-strip="inline-signal-summary"');
    expect(source).toContain('data-log-manage-summary-strip-owner="hertzbeat-ui-signal-summary-strip"');
    expect(source).toContain('HzSignalSummaryStrip');
    expect(source).not.toContain('variant="tile"');
    expect(source).not.toContain('data-log-manage-chart-band="hertzbeat-ui-chart-band" data-log-manage-panel-surface="chart" className="px-4 py-4"');
    expect(source).toContain('data-log-manage-log-list="hertzbeat-ui-dense-log-list"');
    expect(source).toContain('data-log-manage-table-chrome-owner="hertzbeat-ui-data-table"');
    expect(source).toContain('HzDataTable');
    expect(source).toContain('HzPanelHeader');
    expect(source).toContain('data-log-manage-table-header-owner="hertzbeat-ui-panel-header"');
    expect(source).toContain('data-log-manage-table-count-badge-owner="hertzbeat-ui-status-badge"');
    expect(source).toContain('data-log-manage-detail-panel="hertzbeat-ui-detail-panel"');
    expect(source).toContain('data-log-manage-detail-header-owner="hertzbeat-ui-panel-header"');
    expect(source).toContain("eyebrow={t('log.manage.detail.title')}");
    expect(source).not.toContain('data-log-manage-hertzbeat-loop="collector-template-alert-loop"');
    expect(source).toContain('data-log-manage-entity-context="hertzbeat-signal-entity-context"');
    expect(source).toContain('data-log-manage-entity-context-owner="hertzbeat-ui-detail-rows"');
    expect(source).toContain('data-log-manage-selected-evidence-owner="hertzbeat-ui-detail-rows"');
    expect(source).toContain('data-log-manage-detail-facts-owner="hertzbeat-ui-detail-rows"');
    expect(source).toContain('buildLogAttributeExistsExpression');
    expect(source).toContain('applyLogAttributeExistsFilter');
    expect(source).toContain('buildLogAttributeContainsExpression');
    expect(source).toContain('applyLogAttributeContainsFilter');
    expect(source).toContain('data-log-manage-attribute-contains-action={containsFilter.kind}');
    expect(source).toContain('buildLogAttributeNotContainsExpression');
    expect(source).toContain('applyLogAttributeNotContainsFilter');
    expect(source).toContain('data-log-manage-attribute-not-contains-action={notContainsFilter.kind}');
    expect(source).toContain('buildLogAttributeInExpression');
    expect(source).toContain('applyLogAttributeInFilter');
    expect(source).toContain('data-log-manage-attribute-in-action={inFilter.kind}');
    expect(source).toContain('buildLogAttributeNotInExpression');
    expect(source).toContain('applyLogAttributeNotInFilter');
    expect(source).toContain('data-log-manage-attribute-not-in-action={notInFilter.kind}');
    expect(source).toContain('data-log-manage-attribute-exists-action={existsFilter.kind}');
    expect(source).toContain('data-log-manage-attribute-not-exists-action={notExistsFilter.kind}');
    expect(source).toContain('buildLogAttributeNotExistsExpression');
    expect(source).toContain('data-log-manage-attribute-exists-owner="hertzbeat-ui-button"');
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
    expect(source).toContain('data-log-manage-view-switch="explorer-views"');
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
    expect(source).toContain('overlayProps={{');
    expect(source).toContain("'data-log-manage-detail-source-context': sourceContextKind");
    expect(source).toContain("'data-log-manage-detail-auto-open-key': autoOpenedTraceDetailKeyRef.current || ''");
    expect(source).toContain("'data-log-manage-detail-requested-trace': requestedTraceId");
    expect(source).toContain("'data-log-manage-detail-requested-span': requestedSpanId");
    expect(source).toContain("'data-log-manage-detail-selected-trace': detailLog?.traceId || ''");
    expect(source).toContain("'data-log-manage-detail-selected-span': detailLog?.spanId || ''");
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
      'explorer.actions.create-alert',
      'explorer.actions.add-dashboard',
      'log.manage.context.entity.aria'
    ].forEach(key => {
      expect(source).toContain(`t('${key}`);
      expect(messagesSource).toContain(`'${key}'`);
    });
    expect(source).toContain('href={handoffLinks.alertHandlingHref}');
    expect(source).toContain('href={handoffLinks.alertRulesHref}');
    expect(source).toContain('href={handoffLinks.dashboardHref}');
    expect(source).toContain('data-log-manage-header-action="create-alert"');
    expect(source).toContain('data-log-manage-header-action="add-dashboard"');
    expect(source).toContain('data-log-manage-action-row-owner="hertzbeat-ui-action-group"');
    expect(source).toContain('data-log-manage-action-row-layout-owner="hertzbeat-ui-action-group"');
    expect(source).toContain('data-log-manage-return-action="true"');
    expect(source).toContain('data-log-manage-header-action="return-source"');
    expect(source).toContain('data-log-manage-header-action-icon-owner="hertzbeat-ui-button-icon"');
    expect(source).toContain('layout="full-end"');
    expect(source).not.toContain('data-log-manage-action-row="hertzbeat-ui-workbench-actions" className="flex flex-wrap items-center justify-end gap-2"');
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

  it('uses the topology-like shared signal shell instead of a centered card workbench', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/log/manage/log-manage-page.tsx'), 'utf8');

    expect(source).toContain('HzSignalWorkbenchShell');
    expect(source).toContain('data-log-manage-shell-owner="hertzbeat-ui-signal-workbench-shell"');
    expect(source).toContain('data-log-manage-shell-chrome="topology-workbench"');
    expect(source).toContain('isDashboardReturnContext(routeContext.returnTo)');
    expect(source).toContain('data-log-manage-source-context={sourceContextKind}');
    expect(source).toContain('data-log-manage-source-context-return={routeContext.returnTo || \'\'}');
    expect(source).toContain('data-log-manage-source-context-trace={requestedTraceId}');
    expect(source).toContain('data-log-manage-source-context-span={requestedSpanId}');
    expect(source).toContain('data-log-manage-source-context-service={routeContext.serviceName || \'\'}');
    expect(source).toContain('readSignalPanelEditContext(searchParams)');
    expect(source).toContain('appendLogPanelEditContext(route, panelEditContext)');
    expect(source).toContain('const replaceLogHref = useCallback((route: string) => {');
    expect(source).toContain('router.replace(appendLogPanelEditContext(route, panelEditContext))');
    expect(source).toContain('if (!panelEditContext && logManageRouteState.shouldCleanUrl)');
    expect(source).toContain("panelEditContext\n    ? 'dashboard-panel-edit'");
    expect(source).toContain('data-log-manage-panel-edit-context={panelEditContext?.intent || \'none\'}');
    expect(source).toContain('data-log-manage-panel-edit-dashboard={panelEditContext?.dashboardKey || \'\'}');
    expect(source).toContain('data-log-manage-panel-edit-panel={panelEditContext?.panelId || \'\'}');
    expect(source).toContain('data-log-manage-panel-edit-draft={panelEditContext?.draftKey || \'\'}');
    expect(source).toContain('data-log-manage-panel-edit-return={panelEditContext?.returnTo || \'\'}');
    expect(source).toContain('applySignalDashboardPanelEditContext(createSignalDashboardPanelDraft({');
    expect(source).toContain('}), panelEditContext)');
    expect(source).toContain('saveSignalDashboardPanelEditContext(panelEditContext, draft)');
    expect(source).toContain("t(panelEditContext ? 'log.manage.dashboard-panel-draft.update-current' : 'log.manage.dashboard-panel-draft.add-current')");
    expect(source).toContain("data-log-manage-dashboard-panel-draft-action={panelEditContext ? 'update-current' : 'add-current'}");
    expect(source).toContain("data-log-manage-dashboard-panel-draft-action-mode={panelEditContext ? 'edit-panel' : 'new-panel'}");
    expect(source).toContain('data-log-manage-dashboard-panel-draft-action-dashboard={panelEditContext?.dashboardKey || \'\'}');
    expect(source).toContain('data-log-manage-dashboard-panel-draft-action-panel={panelEditContext?.panelId || \'\'}');
    expect(source).toContain('data-log-manage-dashboard-panel-draft-action-draft={panelEditContext?.draftKey || \'\'}');
    expect(source).toContain('data-log-manage-dashboard-panel-draft-status-mode={panelEditContext ? \'edit-panel\' : \'new-panel\'}');
    expect(source).toContain('data-log-manage-dashboard-panel-draft-status-dashboard={panelEditContext?.dashboardKey || \'\'}');
    expect(source).toContain('data-log-manage-dashboard-panel-draft-status-panel={panelEditContext?.panelId || \'\'}');
    expect(source).toContain("`log.manage.dashboard-panel-draft.update-${dashboardPanelDraftState}`");
    expect(source).toContain('data-log-manage-dashboard-panel-draft-return-action="dashboard"');
    expect(source).toContain('data-log-manage-dashboard-panel-draft-return-action-owner="hertzbeat-ui-button-link"');
    expect(source).toContain('data-log-manage-dashboard-panel-draft-return-action-dashboard={panelEditContext.dashboardKey || \'\'}');
    expect(source).toContain('data-log-manage-dashboard-panel-draft-return-action-panel={panelEditContext.panelId || \'\'}');
    expect(source).toContain("t('log.manage.dashboard-panel-draft.return-dashboard')");
    expect(source).toContain('layout="topology-workbench"');
    expect(source).not.toContain('mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-6 py-6');
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
      expect(html).toContain(`title="${createTranslatorMock({ locale: 'zh-CN' })('log.manage.handoff.entity-disabled')}"`);
      expect(html).toContain('disabled=""');
    } finally {
      mockState.renderData.list.content = originalContent;
    }
  }, 30000);

  it('renders the in-place log stream when the Angular stream view is requested', async () => {
    mockState.searchParams = new URLSearchParams('view=stream&traceId=trace-123&spanId=span-456&severityText=ERROR');
    const html = renderLogManagePage();

    expect(html).toContain('data-log-manage-view-switch="explorer-views"');
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
    expect(html).toContain(tZh('log.manage.stream.view.list'));
    expect(html).toContain(tZh('log.manage.stream.view.time-series'));
    expect(html).toContain(tZh('log.manage.stream.view.table'));
    expect(html).toContain(tZh('log.manage.stream.stage.title'));
    expect(html).toContain(tZh('log.manage.query.run.stream'));
    expect(html).toContain(tZh('log.manage.stream.selected.title'));
    expect(html).not.toContain('Full JSON');
    expect(html).not.toContain(tZh('log.manage.query.run.history'));
    expect(html).not.toContain('/api/logs/sse/subscribe');
    expect(html).not.toContain('data-log-manage-log-list="hertzbeat-ui-dense-log-list"');
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
    expect(source).toContain('const { listUrl, overviewUrl, trendUrl, coverageUrl, groupByUrl } = logUrls;');
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
      source.indexOf('data-log-manage-query-bar="hertzbeat-ui-query-row"')
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

  it('renders the shared query row, time series, dense log list, and detail handoffs', async () => {
    mockState.searchParams = new URLSearchParams('view=list');
    const html = renderLogManagePage();

    expect(html).toContain('data-log-manage-route="otlp-hertzbeat-ui-log-workbench"');
    expect(html).toContain(`data-loading-copy="${tZh('log.manage.loading')}"`);
    expect(html).toContain('data-log-manage-style-baseline="hertzbeat-ui-matte"');
    expect(html).toContain('data-log-manage-query-bar="hertzbeat-ui-query-row"');
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
    expect(html).toContain('data-log-manage-query-resource-filter-input="true"');
    expect(html).toContain('data-log-manage-query-resource-filter-input-owner="hertzbeat-ui-input"');
    expect(html).toContain('data-log-manage-query-attribute-filter-input="true"');
    expect(html).toContain('data-log-manage-query-attribute-filter-input-owner="hertzbeat-ui-input"');
    expect(html).toContain('data-hz-input-width="log-query-filter"');
    expect(html).toContain('placeholder="service.name = &quot;checkout&quot;"');
    expect(html).toContain(`placeholder="${htmlAttributeValue(tZh('log.manage.query.resource-filter.placeholder'))}"`);
    expect(html).toContain(`placeholder="${htmlAttributeValue(tZh('log.manage.query.attribute-filter.placeholder'))}"`);
    expect(html).toContain('data-log-manage-quick-filter-controls="logs-quick-filters"');
    expect(html).toContain('data-log-manage-quick-filter-controls-owner="hertzbeat-ui-control-stack"');
    expect(html).toContain('data-log-manage-quick-filter="severity"');
    expect(html).toContain('data-log-manage-quick-filter="serviceName"');
    expect(html).toContain('data-log-manage-quick-filter="environment"');
    expect(html).toContain('data-log-manage-quick-filter-owner="hertzbeat-ui-button"');
    expect(html).toContain('data-log-manage-quick-filter-value="checkout"');
    expect(html).toContain('data-log-manage-quick-filter-value="prod"');
    expect(html).toContain('data-log-manage-chart-band="hertzbeat-ui-chart-band"');
    expect(html).toContain('data-log-manage-explorer-view="time-series"');
    expect(html).toContain('data-log-manage-explorer-view-owner="hertzbeat-ui-signal-time-series"');
    expect(html).toContain('data-log-manage-chart-padding-owner="hertzbeat-ui-panel-surface"');
    expect(html).toContain('data-hz-panel-surface-padding="chart"');
    expect(html).toContain('data-log-manage-log-list="hertzbeat-ui-dense-log-list"');
    expect(html).toContain('data-log-manage-table-column-controls="customize-columns"');
    expect(html).toContain('data-log-manage-table-column-controls-owner="hertzbeat-ui-control-stack"');
    expect(html).toContain('data-log-manage-table-visible-columns="time,severity,service,body,trace-id"');
    expect(html).toContain('data-log-manage-display-format="default"');
    expect(html).toContain('data-log-manage-display-max-lines="1"');
    expect(html).toContain('data-log-manage-display-control="format"');
    expect(html).toContain('data-log-manage-display-control="max-lines"');
    expect(html).toContain('data-log-manage-display-control-owner="hertzbeat-ui-select"');
    expect(html).toContain('data-log-manage-display-control-owner="hertzbeat-ui-input"');
    expect(html).toContain('data-log-manage-table-body-format="default"');
    expect(html).toContain('data-log-manage-table-body-max-lines="1"');
    expect(html).toContain('data-log-manage-table-body-owner="hertzbeat-ui-log-display"');
    expect(html).toContain('data-log-manage-table-body-actions="view-filter"');
    expect(html).toContain('data-log-manage-table-body-actions-owner="hertzbeat-ui-action-group"');
    expect(html).toContain('data-log-manage-table-body-filter-action="true"');
    expect(html).toContain('data-log-manage-table-body-filter-owner="hertzbeat-ui-button"');
    expect(html).toContain('data-log-manage-table-body-filter-value="checkout timeout"');
    expect(html).toContain(tZh('log.manage.table.body-filter-action.aria', { value: 'checkout timeout' }));
    expect(html).toContain('data-log-manage-table-column-option="time"');
    expect(html).toContain('data-log-manage-table-column-option="severity"');
    expect(html).toContain('data-log-manage-table-column-option="service"');
    expect(html).toContain('data-log-manage-table-column-option="body"');
    expect(html).toContain('data-log-manage-table-column-option="trace-id"');
    expect(html).toContain('data-log-manage-table-column-option="span-id"');
    expect(html).toContain('data-log-manage-table-column-option-owner="hertzbeat-ui-checkbox"');
    expect(html).toContain('data-log-manage-table-chrome-owner="hertzbeat-ui-data-table"');
    expect(html).toContain('data-hz-ui="data-table"');
    expect(html).toContain('data-log-manage-table-severity-filter-action="ERROR"');
    expect(html).toContain('data-log-manage-table-severity-filter-owner="hertzbeat-ui-button"');
    expect(html).toContain(tZh('log.manage.table.severity-filter-action.aria', { severity: 'ERROR' }));
    expect(html).toContain('data-log-manage-table-service-filter-action="checkout"');
    expect(html).toContain('data-log-manage-table-service-filter-owner="hertzbeat-ui-button"');
    expect(html).toContain(tZh('log.manage.table.service-filter-action.aria', { service: 'checkout' }));
    expect(html).toContain('data-log-manage-table-trace-id-actions="detail-filter"');
    expect(html).toContain('data-log-manage-table-trace-id-actions-owner="hertzbeat-ui-action-group"');
    expect(html).toContain('data-log-manage-table-trace-id-filter-action="trace-123"');
    expect(html).toContain('data-log-manage-table-trace-id-filter-owner="hertzbeat-ui-button"');
    expect(html).toContain(tZh('log.manage.table.trace-id-filter-action.aria', { traceId: 'trace-123' }));
    expect(html).toContain('data-log-manage-table-header-owner="hertzbeat-ui-panel-header"');
    expect(html).toContain('data-hz-ui="panel-header"');
    expect(html).toContain('data-log-manage-table-count-badge-owner="hertzbeat-ui-status-badge"');
    expect(html).toContain('data-log-manage-detail-panel="hertzbeat-ui-detail-panel"');
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
    expect(html).toContain('data-log-manage-selected-attributes="log-attributes"');
    expect(html).toContain('data-log-manage-selected-attributes-owner="hertzbeat-ui-data-table"');
    expect(html).toContain('service.name');
    expect(html).toContain('region');
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
    expect(html).toContain(tZh('explorer.actions.create-alert'));
    expect(html).toContain(tZh('explorer.actions.add-dashboard'));
    expect(html).toContain('data-log-manage-signal-handoff-hint="log-trace-metric-context"');
    expect(html).toContain(tZh('log.manage.handoff.signal-hint'));
    expect(html).not.toContain('Alert rules');
    expect(html).not.toContain('Save view');
    expect(html).not.toContain('Create alert');
    expect(html).toContain('checkout timeout');
    expect(html).toContain('checkout');
    expect(html).toContain(tZh('log.manage.handoff.traces'));
    expect(html).toContain(tZh('log.manage.handoff.metrics'));
    expect(html).toContain('/entities/7?entityId=7');
    expect(html).toContain('/alert?status=firing&amp;signal=logs');
    expect(html).toContain('/alert/setting?signal=logs');
    expect(html).toContain('/dashboard?intent=add-panel&amp;signal=logs');
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

  it('renders route-backed customized log table columns', async () => {
    mockState.searchParams = new URLSearchParams('view=table&columns=service,body,span-id&format=raw&maxLines=3');
    const html = renderLogManagePage();

    expect(html).toContain('data-log-manage-table-column-controls="customize-columns"');
    expect(html).toContain('data-log-manage-table-visible-columns="service,body,span-id"');
    expect(html).toContain('data-log-manage-display-format="raw"');
    expect(html).toContain('data-log-manage-display-max-lines="3"');
    expect(html).toContain('data-log-manage-table-body-format="raw"');
    expect(html).toContain('data-log-manage-table-body-max-lines="3"');
    expect(html).toContain('data-log-manage-table-column-option="span-id"');
    expect(html).toContain('data-log-manage-table-column-option-checked="true"');
    expect(html).toContain('data-log-manage-span-id-cell-owner="hertzbeat-ui-data-table-cell"');
    expect(html).toContain('data-log-manage-table-span-id-filter-action="span-456"');
    expect(html).toContain('data-log-manage-table-span-id-filter-owner="hertzbeat-ui-button"');
    expect(html).toContain(tZh('log.manage.table.span-id-filter-action.aria', { spanId: 'span-456' }));
    expect(html).toContain('span-456');
  });

  it('applies typed log resource and attribute filters from the shared query row', async () => {
    mockState.searchParams = new URLSearchParams('view=list');
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      renderInteractiveLogManagePage();
      await Promise.resolve();
    });

    const resourceInput = interactionContainer.querySelector('[data-log-manage-query-resource-filter-input="true"]') as HTMLInputElement | null;
    const attributeInput = interactionContainer.querySelector('[data-log-manage-query-attribute-filter-input="true"]') as HTMLInputElement | null;
    expect(resourceInput).toBeTruthy();
    expect(attributeInput).toBeTruthy();
    expect(resourceInput?.getAttribute('data-log-manage-query-resource-filter-input-owner')).toBe('hertzbeat-ui-input');
    expect(attributeInput?.getAttribute('data-log-manage-query-attribute-filter-input-owner')).toBe('hertzbeat-ui-input');

    await act(async () => {
      typeInputValue(resourceInput!, 'service.version=1.2.3');
      typeInputValue(attributeInput!, 'http.route CONTAINS checkout');
      await Promise.resolve();
    });

    const runAction = interactionContainer.querySelector('[data-log-manage-run-query-action="true"]') as HTMLButtonElement | null;
    expect(runAction).toBeTruthy();
    mockState.replace.mockClear();

    await act(async () => {
      runAction?.click();
      await Promise.resolve();
    });

    const route = String(mockState.replace.mock.calls[0]?.[0]);
    const params = new URL(route, 'http://localhost').searchParams;
    expect(mockState.replace).toHaveBeenCalledTimes(1);
    expect(params.get('resourceFilter')).toBe('service.version=1.2.3');
    expect(params.get('attributeFilter')).toBe('http.route CONTAINS checkout');
    expect(params.get('view')).toBe('list');
    expect(params.get('source')).toBe('otlp');
  });

  it('renders route-backed log resource and attribute field columns', async () => {
    mockState.searchParams = new URLSearchParams('view=table&columns=service,body&fieldColumns=resource:hertzbeat.entity_id,attribute:region');
    const html = renderLogManagePage();

    expect(html).toContain('data-log-manage-table-column-controls="customize-columns"');
    expect(html).toContain('data-log-manage-table-visible-columns="service,body"');
    expect(html).toContain('data-log-manage-table-visible-field-columns="resource:hertzbeat.entity_id,attribute:region"');
    expect(html).toContain('data-log-manage-table-field-column="resource:hertzbeat.entity_id"');
    expect(html).toContain('data-log-manage-table-field-column-value="7"');
    expect(html).toContain('data-log-manage-table-field-column="attribute:region"');
    expect(html).toContain('data-log-manage-table-field-column-value="cn"');
    expect(html).toContain('resource:hertzbeat.entity_id');
    expect(html).toContain('attribute:region');
  });

  it('adds and removes log attribute field columns from selected attribute actions', async () => {
    mockState.searchParams = new URLSearchParams('view=table&columns=service,body');
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      renderInteractiveLogManagePage();
      await Promise.resolve();
    });

    const addResourceColumnAction = interactionContainer.querySelector(
      '[data-log-manage-attribute-field-column-action="add"][data-log-manage-attribute-field-column="resource:hertzbeat.entity_id"]'
    ) as HTMLButtonElement | null;
    expect(addResourceColumnAction).toBeTruthy();
    expect(addResourceColumnAction?.getAttribute('data-log-manage-attribute-field-column-owner')).toBe('hertzbeat-ui-button');
    expect(addResourceColumnAction?.getAttribute('data-log-manage-attribute-filter-name')).toBe('hertzbeat.entity_id');
    mockState.replace.mockClear();

    await act(async () => {
      addResourceColumnAction?.click();
      await Promise.resolve();
    });

    const addRoute = String(mockState.replace.mock.calls[0]?.[0]);
    expect(mockState.replace).toHaveBeenCalledTimes(1);
    expect(addRoute).toContain('/log/manage?');
    expect(addRoute).toContain('view=table');
    expect(addRoute).toContain('columns=service%2Cbody');
    expect(addRoute).toContain('fieldColumns=resource%3Ahertzbeat.entity_id');

    mockState.searchParams = new URLSearchParams('view=table&columns=service,body&fieldColumns=resource:hertzbeat.entity_id,attribute:region');
    await act(async () => {
      interactionRoot?.unmount();
      interactionContainer.innerHTML = '';
      interactionRoot = createRoot(interactionContainer);
      renderInteractiveLogManagePage();
      await Promise.resolve();
    });

    const removeResourceColumnAction = interactionContainer.querySelector(
      '[data-log-manage-attribute-field-column-action="remove"][data-log-manage-attribute-field-column="resource:hertzbeat.entity_id"]'
    ) as HTMLButtonElement | null;
    expect(removeResourceColumnAction).toBeTruthy();
    expect(removeResourceColumnAction?.getAttribute('data-log-manage-attribute-field-column-owner')).toBe('hertzbeat-ui-button');
    mockState.replace.mockClear();

    await act(async () => {
      removeResourceColumnAction?.click();
      await Promise.resolve();
    });

    const removeRoute = String(mockState.replace.mock.calls[0]?.[0]);
    expect(mockState.replace).toHaveBeenCalledTimes(1);
    expect(removeRoute).toContain('fieldColumns=attribute%3Aregion');
    expect(removeRoute).not.toContain('resource%3Ahertzbeat.entity_id');
  });

  it('renders only the log time series panel when the time-series explorer view is requested', async () => {
    mockState.searchParams = new URLSearchParams('view=time-series');
    const html = renderLogManagePage();

    expect(html).toContain('data-log-manage-view-option="time-series"');
    expect(html).toContain('data-log-manage-explorer-view="time-series"');
    expect(html).not.toContain('data-log-manage-log-list="hertzbeat-ui-dense-log-list"');
    expect(html).not.toContain('data-log-manage-stream-stage="hertzbeat-live-log-stream"');
  });

  it('renders only the dense log table when the table explorer view is requested', async () => {
    mockState.searchParams = new URLSearchParams('view=table');
    const html = renderLogManagePage();

    expect(html).toContain('data-log-manage-view-option="table"');
    expect(html).toContain('data-log-manage-log-list="hertzbeat-ui-dense-log-list"');
    expect(html).not.toContain('data-log-manage-explorer-view="time-series"');
    expect(html).not.toContain('data-log-manage-stream-stage="hertzbeat-live-log-stream"');
  });

  it('applies result-derived log quick filters into the route context', async () => {
    mockState.searchParams = new URLSearchParams('view=list');
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      renderInteractiveLogManagePage();
      await Promise.resolve();
    });

    const serviceQuickFilter = interactionContainer?.querySelector('[data-log-manage-quick-filter="serviceName"][data-log-manage-quick-filter-value="checkout"]') as HTMLButtonElement | null;
    expect(serviceQuickFilter).toBeTruthy();

    await act(async () => {
      serviceQuickFilter?.click();
      await Promise.resolve();
    });

    expect(mockState.replace).toHaveBeenCalledTimes(1);
    expect(String(mockState.replace.mock.calls[0]?.[0])).toContain('serviceName=checkout');
  });

  it('narrows log table rows by service from the row cell', async () => {
    mockState.searchParams = new URLSearchParams('view=list&search=timeout&severityText=ERROR&environment=prod');
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      renderInteractiveLogManagePage();
      await Promise.resolve();
    });

    const serviceCellAction = interactionContainer.querySelector(
      '[data-log-manage-table-service-filter-action="checkout"]'
    ) as HTMLButtonElement | null;
    expect(serviceCellAction).toBeTruthy();
    expect(serviceCellAction?.getAttribute('data-log-manage-table-service-filter-owner')).toBe('hertzbeat-ui-button');
    mockState.replace.mockClear();

    await act(async () => {
      serviceCellAction?.click();
      await Promise.resolve();
    });

    const route = String(mockState.replace.mock.calls[0]?.[0]);
    expect(mockState.replace).toHaveBeenCalledTimes(1);
    expect(route).toContain('search=timeout');
    expect(route).toContain('view=list');
    expect(route).toContain('serviceName=checkout');
    expect(route).toContain('environment=prod');
  });

  it('narrows log table rows by severity from the row badge', async () => {
    mockState.searchParams = new URLSearchParams('view=list&search=timeout&serviceName=checkout&environment=prod');
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      renderInteractiveLogManagePage();
      await Promise.resolve();
    });

    const severityCellAction = interactionContainer.querySelector(
      '[data-log-manage-table-severity-filter-action="ERROR"]'
    ) as HTMLButtonElement | null;
    expect(severityCellAction).toBeTruthy();
    expect(severityCellAction?.getAttribute('data-log-manage-table-severity-filter-owner')).toBe('hertzbeat-ui-button');
    mockState.replace.mockClear();

    await act(async () => {
      severityCellAction?.click();
      await Promise.resolve();
    });

    const route = String(mockState.replace.mock.calls[0]?.[0]);
    expect(mockState.replace).toHaveBeenCalledTimes(1);
    expect(route).toContain('search=timeout');
    expect(route).toContain('view=list');
    expect(route).toContain('severityText=ERROR');
    expect(route).toContain('serviceName=checkout');
    expect(route).toContain('environment=prod');
  });

  it('narrows log table rows by body text from the row message action', async () => {
    mockState.searchParams = new URLSearchParams('view=list&search=stale&severityText=ERROR&serviceName=checkout&environment=prod');
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      renderInteractiveLogManagePage();
      await Promise.resolve();
    });

    const bodyFilterAction = interactionContainer.querySelector(
      '[data-log-manage-table-body-filter-action="true"][data-log-manage-table-body-filter-value="checkout timeout"]'
    ) as HTMLButtonElement | null;
    expect(bodyFilterAction).toBeTruthy();
    expect(bodyFilterAction?.getAttribute('data-log-manage-table-body-filter-owner')).toBe('hertzbeat-ui-button');
    mockState.replace.mockClear();

    await act(async () => {
      bodyFilterAction?.click();
      await Promise.resolve();
    });

    const route = String(mockState.replace.mock.calls[0]?.[0]);
    expect(mockState.replace).toHaveBeenCalledTimes(1);
    expect(route).toContain('search=checkout+timeout');
    expect(route).not.toContain('search=stale');
    expect(route).toContain('view=list');
    expect(route).toContain('severityText=ERROR');
    expect(route).toContain('serviceName=checkout');
    expect(route).toContain('environment=prod');
  });

  it('downloads log rows in bounded pages with the selected format, row limit, and field columns from a shared UI action', async () => {
    mockState.searchParams = new URLSearchParams('view=list&search=timeout&serviceName=checkout&environment=prod&columns=service,body,span-id&fieldColumns=resource:hertzbeat.entity_id,attribute:region');
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);
    const firstExportPage = Array.from({ length: 1000 }, (_, index) => ({
          traceId: 'trace-export',
          spanId: `span-export-${index}`,
          severityText: 'WARN',
          severityNumber: 13,
          body: `exported timeout ${index}`,
          timeUnixNano: 1713200000001000000 + index,
          resource: {
            'service.name': 'checkout-worker',
            'hertzbeat.entity_id': '9'
          },
          attributes: { region: 'us' }
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
            traceId: 'trace-export',
            spanId: 'span-export-final',
            severityText: 'WARN',
            severityNumber: 13,
            body: 'exported timeout final',
            timeUnixNano: 1713200000002000000,
            resource: {
              'service.name': 'checkout-worker-final',
              'hertzbeat.entity_id': '10'
            },
            attributes: { region: 'eu' }
          }
        ],
        totalElements: 1001,
        pageIndex: 1,
        pageSize: 1000
    });
    const createObjectURL = vi.fn(() => 'blob:hertzbeat-logs');
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
      renderInteractiveLogManagePage();
      await Promise.resolve();
    });

    const downloadAction = interactionContainer.querySelector(
      '[data-log-manage-download-csv-action="current-page"]'
    ) as HTMLButtonElement | null;
    const exportFormatSelect = interactionContainer.querySelector(
      '[data-log-manage-export-format-select="true"]'
    ) as HTMLElement | null;
    const exportRowLimitSelect = interactionContainer.querySelector(
      '[data-log-manage-export-row-limit-select="true"]'
    ) as HTMLElement | null;
    expect(exportFormatSelect).toBeTruthy();
    expect(exportFormatSelect?.getAttribute('data-log-manage-export-format-owner')).toBe('hertzbeat-ui-select');
    expect(exportFormatSelect?.getAttribute('data-log-manage-export-format-value')).toBe('csv');
    expect(exportRowLimitSelect).toBeTruthy();
    expect(exportRowLimitSelect?.getAttribute('data-log-manage-export-row-limit-owner')).toBe('hertzbeat-ui-select');
    expect(exportRowLimitSelect?.getAttribute('data-log-manage-export-row-limit-value')).toBe('current');
    expect(downloadAction).toBeTruthy();
    expect(downloadAction?.getAttribute('data-log-manage-download-csv-owner')).toBe('hertzbeat-ui-button');
    expect(downloadAction?.getAttribute('data-log-manage-download-csv-row-count')).toBe('1');

    await act(async () => {
      const trigger = exportFormatSelect!.querySelector('[data-hz-ui="select-trigger"]') as HTMLButtonElement | null;
      trigger?.click();
      await Promise.resolve();
    });

    const jsonlOption = interactionContainer.querySelector(
      '[data-log-manage-export-format-option="jsonl"]'
    ) as HTMLButtonElement | null;
    expect(jsonlOption).toBeTruthy();

    await act(async () => {
      jsonlOption?.click();
      await Promise.resolve();
    });

    expect(interactionContainer.querySelector('[data-log-manage-export-format-select="true"]')?.getAttribute('data-log-manage-export-format-value')).toBe('jsonl');

    await act(async () => {
      const trigger = exportRowLimitSelect!.querySelector('[data-hz-ui="select-trigger"]') as HTMLButtonElement | null;
      trigger?.click();
      await Promise.resolve();
    });

    const rowLimitOption = interactionContainer.querySelector(
      '[data-log-manage-export-row-limit-option="10000"]'
    ) as HTMLButtonElement | null;
    expect(rowLimitOption).toBeTruthy();

    await act(async () => {
      rowLimitOption?.click();
      await Promise.resolve();
    });

    expect(interactionContainer.querySelector('[data-log-manage-export-row-limit-select="true"]')?.getAttribute('data-log-manage-export-row-limit-value')).toBe('10000');

    await act(async () => {
      downloadAction?.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(apiMessageGet).toHaveBeenCalledTimes(2);
    const exportListUrl = String(apiMessageGet.mock.calls[0]?.[0]);
    expect(exportListUrl).toContain('/logs/list?pageIndex=0&pageSize=1000');
    expect(exportListUrl).toContain('search=timeout');
    expect(exportListUrl).toContain('serviceName=checkout');
    expect(exportListUrl).toContain('environment=prod');
    expect(exportListUrl).not.toContain('fieldColumns');
    const secondExportListUrl = String(apiMessageGet.mock.calls[1]?.[0]);
    expect(secondExportListUrl).toContain('/logs/list?pageIndex=1&pageSize=1000');
    expect(secondExportListUrl).toContain('search=timeout');
    expect(secondExportListUrl).toContain('serviceName=checkout');
    expect(secondExportListUrl).toContain('environment=prod');
    expect(secondExportListUrl).not.toContain('fieldColumns');
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
    expect(exportLines[0]).toBe('{"service":"checkout-worker","message":"exported timeout 0","spanId":"span-export-0","resource:hertzbeat.entity_id":"9","attribute:region":"us"}');
    expect(exportLines[1000]).toBe('{"service":"checkout-worker-final","message":"exported timeout final","spanId":"span-export-final","resource:hertzbeat.entity_id":"10","attribute:region":"eu"}');
    expect(exportText).not.toContain('timestamp');
    expect(exportText).not.toContain('traceId');
    expect(exportText).not.toContain('checkout timeout');
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:hertzbeat-logs');
    clickSpy.mockRestore();
  });

  it('saves and restores the current logs explorer query view from shared UI controls', async () => {
    window.localStorage.removeItem('hertzbeat.log-manage.saved-query-views');
    mockState.searchParams = new URLSearchParams(
      'view=list&search=timeout&severityText=ERROR&serviceName=checkout&environment=prod&columns=service,body,span-id&format=raw&maxLines=3'
    );
    const savedViewRequests: Array<{ path: string; method: string; body?: Record<string, unknown> }> = [];
    let serverSavedViews: Record<string, unknown>[] = [];
    const savedViewFetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = String(input);
      const method = String(init?.method || 'GET').toUpperCase();
      const body = init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : undefined;
      savedViewRequests.push({ path, method, body });
      if (path.endsWith('/api/signal/saved-view/logs') && method === 'GET') {
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
      if (path.includes('/api/signal/saved-view/logs/') && method === 'DELETE') {
        const viewKey = decodeURIComponent(path.split('/').pop() || '');
        serverSavedViews = serverSavedViews.filter(view => view.viewKey !== viewKey);
        return new Response(JSON.stringify({ code: 0, data: null }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return new Response(JSON.stringify({ code: 1, msg: `Unexpected request ${method} ${path}` }), { status: 500 });
    });
    globalThis.fetch = savedViewFetch as typeof fetch;
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      renderInteractiveLogManagePage();
      await flushDashboardEditPromises();
    });

    const savedViewPanel = interactionContainer.querySelector('[data-log-manage-saved-views="route-query-views"]') as HTMLElement | null;
    expect(savedViewPanel).toBeTruthy();
    expect(savedViewPanel?.getAttribute('data-log-manage-saved-views-owner')).toBe('hertzbeat-ui-panel-surface');
    expect(savedViewPanel?.getAttribute('data-log-manage-saved-view-persistence')).toBe('server-first');
    expect(savedViewPanel?.getAttribute('data-log-manage-saved-view-persistence-owner')).toBe('hertzbeat-api');
    expect(savedViewPanel?.getAttribute('data-log-manage-saved-view-storage-key')).toBe('hertzbeat.log-manage.saved-query-views');

    const persistenceCopy = interactionContainer.querySelector('[data-log-manage-saved-view-persistence-copy="server-first"]') as HTMLElement | null;
    expect(persistenceCopy?.textContent).toContain(createTranslatorMock({ locale: 'zh-CN' })('log.manage.saved-view.persistence.server'));

    const saveAction = interactionContainer.querySelector('[data-log-manage-saved-view-action="save-current"]') as HTMLButtonElement | null;
    expect(saveAction).toBeTruthy();
    expect(saveAction?.getAttribute('data-log-manage-saved-view-action-owner')).toBe('hertzbeat-ui-button');

    const clipboardWrites: string[] = [];
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn((value: string) => {
        clipboardWrites.push(value);
        return Promise.resolve();
      }) }
    });
    const copyAction = interactionContainer.querySelector('[data-log-manage-saved-view-copy-action="current"]') as HTMLButtonElement | null;
    expect(copyAction).toBeTruthy();
    expect(copyAction?.getAttribute('data-log-manage-saved-view-copy-owner')).toBe('hertzbeat-ui-button');

    await act(async () => {
      copyAction?.click();
      await Promise.resolve();
    });

    expect(clipboardWrites[0]).toContain('/log/manage?search=timeout');
    expect(clipboardWrites[0]).toContain('severityText=ERROR');
    expect(clipboardWrites[0]).toContain('columns=service%2Cbody%2Cspan-id');
    expect(clipboardWrites[0]).toContain('format=raw');
    expect(clipboardWrites[0]).toContain('maxLines=3');
    expect(clipboardWrites[0]).toContain('view=list');

    const dashboardPanelDraftAction = interactionContainer.querySelector('[data-log-manage-dashboard-panel-draft-action="add-current"]') as HTMLButtonElement | null;
    expect(dashboardPanelDraftAction).toBeTruthy();
    expect(dashboardPanelDraftAction?.getAttribute('data-log-manage-dashboard-panel-draft-action-owner')).toBe('hertzbeat-ui-button');
    globalThis.fetch = vi.fn(async (input, init) => {
      const path = String(input);
      if (path.includes('/api/signal/dashboard-panel-draft')) {
        return new Response(JSON.stringify({
          code: 0,
          data: {
            signal: 'logs',
            draftKey: 'logs-panel-checkout',
            title: 'timeout',
            description: 'list',
            visualization: 'list',
            route: '/log/manage?search=timeout'
          }
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return savedViewFetch(input, init);
    }) as typeof fetch;

    await act(async () => {
      dashboardPanelDraftAction?.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    const dashboardPanelDraftRequest = vi.mocked(globalThis.fetch).mock.calls.find(call =>
      String(call[0]).includes('/api/signal/dashboard-panel-draft')
    );
    expect(dashboardPanelDraftRequest).toBeTruthy();
    const dashboardPanelDraftBody = JSON.parse(String(dashboardPanelDraftRequest?.[1]?.body));
    expect(dashboardPanelDraftBody).toEqual(expect.objectContaining({
      signal: 'logs',
      title: 'timeout',
      visualization: 'list',
      querySnapshot: expect.stringContaining('/log/manage?search=timeout')
    }));
    expect(dashboardPanelDraftBody.route).toContain('severityText=ERROR');
    const dashboardPanelDraftStatus = interactionContainer.querySelector('[data-log-manage-dashboard-panel-draft-status="saved"]') as HTMLElement | null;
    expect(dashboardPanelDraftStatus?.textContent).toContain(createTranslatorMock({ locale: 'zh-CN' })('log.manage.dashboard-panel-draft.saved'));
    globalThis.fetch = savedViewFetch as typeof fetch;

    await act(async () => {
      saveAction?.click();
      await flushDashboardEditPromises();
    });

    const savedViews = JSON.parse(window.localStorage.getItem('hertzbeat.log-manage.saved-query-views') || '[]');
    expect(savedViews).toHaveLength(1);
    expect(savedViews[0]?.label).toBe('timeout');
    expect(savedViews[0]?.description).toContain('list');
    expect(savedViews[0]?.description).toContain('timeout');
    expect(savedViews[0]?.description).toContain('service,body,span-id');
    expect(savedViews[0]?.description).toContain('raw');
    expect(savedViews[0]?.description).toContain('3');
    expect(savedViews[0]?.route).toContain('/log/manage?search=timeout');
    expect(savedViews[0]?.route).toContain('severityText=ERROR');
    expect(savedViews[0]?.route).toContain('columns=service%2Cbody%2Cspan-id');
    expect(savedViews[0]?.route).toContain('format=raw');
    expect(savedViews[0]?.route).toContain('maxLines=3');
    expect(savedViews[0]?.route).toContain('view=list');
    expect(savedViews[0]?.route).toContain('serviceName=checkout');
    expect(savedViews[0]?.route).toContain('environment=prod');
    const saveRequest = savedViewRequests.find(request => request.method === 'PUT' && request.body?.route === savedViews[0]?.route);
    expect(saveRequest?.path).toBe('/api/signal/saved-view');
    expect(saveRequest?.body).toEqual(expect.objectContaining({
      signal: 'logs',
      viewKey: savedViews[0]?.id,
      querySnapshot: savedViews[0]?.route,
      payload: expect.stringContaining('createdAt')
    }));
    expect(interactionContainer.querySelector('[data-log-manage-saved-views="route-query-views"]')?.getAttribute('data-log-manage-saved-view-persistence')).toBe('server-first');

    const renameSavedViewAction = interactionContainer.querySelector('[data-log-manage-saved-view-rename-action]') as HTMLButtonElement | null;
    expect(renameSavedViewAction).toBeTruthy();
    expect(renameSavedViewAction?.getAttribute('data-log-manage-saved-view-rename-owner')).toBe('hertzbeat-ui-button');

    await act(async () => {
      renameSavedViewAction?.click();
      await Promise.resolve();
    });

    const renameInput = interactionContainer.querySelector('[data-log-manage-saved-view-rename-input]') as HTMLInputElement | null;
    expect(renameInput).toBeTruthy();
    expect(renameInput?.getAttribute('data-log-manage-saved-view-rename-input-owner')).toBe('hertzbeat-ui-input');

    await act(async () => {
      renameInput!.value = 'Checkout timeouts';
      renameInput!.dispatchEvent(new Event('input', { bubbles: true }));
      await Promise.resolve();
    });

    const renameSaveAction = interactionContainer.querySelector('[data-log-manage-saved-view-rename-save-action]') as HTMLButtonElement | null;
    expect(renameSaveAction).toBeTruthy();
    expect(renameSaveAction?.getAttribute('data-log-manage-saved-view-rename-save-owner')).toBe('hertzbeat-ui-button');

    await act(async () => {
      renameSaveAction?.click();
      await flushDashboardEditPromises();
    });

    const renamedViews = JSON.parse(window.localStorage.getItem('hertzbeat.log-manage.saved-query-views') || '[]');
    expect(renamedViews).toHaveLength(1);
    expect(renamedViews[0]?.label).toBe('Checkout timeouts');
    expect(renamedViews[0]?.route).toBe(savedViews[0]?.route);

    mockState.searchParams = new URLSearchParams(
      'view=table&search=latency&severityText=WARN&serviceName=billing&environment=stage&groupBy=resource%3Aservice.version&groupLimit=7&groupOrder=count-asc&groupMinCount=5&columns=time,severity,body&format=column&maxLines=2'
    );
    await act(async () => {
      interactionRoot?.unmount();
      interactionContainer.innerHTML = '';
      interactionRoot = createRoot(interactionContainer);
      renderInteractiveLogManagePage();
      await flushDashboardEditPromises();
    });

    const updateSavedViewAction = interactionContainer.querySelector('[data-log-manage-saved-view-update-action]') as HTMLButtonElement | null;
    expect(updateSavedViewAction).toBeTruthy();
    expect(updateSavedViewAction?.getAttribute('data-log-manage-saved-view-update-owner')).toBe('hertzbeat-ui-button');

    await act(async () => {
      updateSavedViewAction?.click();
      await flushDashboardEditPromises();
    });

    const updatedViews = JSON.parse(window.localStorage.getItem('hertzbeat.log-manage.saved-query-views') || '[]');
    expect(updatedViews).toHaveLength(1);
    expect(updatedViews[0]?.label).toBe('Checkout timeouts');
    expect(updatedViews[0]?.route).not.toBe(savedViews[0]?.route);
    expect(updatedViews[0]?.route).toContain('/log/manage?search=latency');
    expect(updatedViews[0]?.route).toContain('severityText=WARN');
    expect(updatedViews[0]?.route).toContain('view=table');
    expect(updatedViews[0]?.route).toContain('serviceName=billing');
    expect(updatedViews[0]?.route).toContain('environment=stage');
    expect(updatedViews[0]?.route).toContain('groupBy=resource%3Aservice.version');
    expect(updatedViews[0]?.route).toContain('groupLimit=7');
    expect(updatedViews[0]?.route).toContain('groupOrder=count-asc');
    expect(updatedViews[0]?.route).toContain('groupMinCount=5');
    expect(updatedViews[0]?.route).toContain('columns=time%2Cseverity%2Cbody');
    expect(updatedViews[0]?.route).toContain('format=column');
    expect(updatedViews[0]?.route).toContain('maxLines=2');
    expect(updatedViews[0]?.description).toContain('resource:service.version');
    expect(updatedViews[0]?.description).toContain('7');
    expect(updatedViews[0]?.description).toContain('count-asc');
    expect(updatedViews[0]?.description).toContain('5');
    expect(updatedViews[0]?.description).toContain('time,severity,body');
    expect(updatedViews[0]?.description).toContain('column');
    expect(updatedViews[0]?.description).toContain('2');

    const savedViewAction = interactionContainer.querySelector('[data-log-manage-saved-view-select-action]') as HTMLButtonElement | null;
    expect(savedViewAction).toBeTruthy();
    expect(savedViewAction?.getAttribute('data-log-manage-saved-view-select-owner')).toBe('hertzbeat-ui-button');
    mockState.replace.mockClear();

    await act(async () => {
      savedViewAction?.click();
      await Promise.resolve();
    });

    const restoredRoute = String(mockState.replace.mock.calls[0]?.[0]);
    expect(restoredRoute).toContain('/log/manage?search=latency');
    expect(restoredRoute).toContain('severityText=WARN');
    expect(restoredRoute).toContain('view=table');
    expect(restoredRoute).toContain('serviceName=billing');
    expect(restoredRoute).toContain('environment=stage');
    expect(restoredRoute).toContain('groupBy=resource%3Aservice.version');
    expect(restoredRoute).toContain('groupLimit=7');
    expect(restoredRoute).toContain('groupOrder=count-asc');
    expect(restoredRoute).toContain('groupMinCount=5');
    expect(restoredRoute).toContain('columns=time%2Cseverity%2Cbody');
    expect(restoredRoute).toContain('format=column');
    expect(restoredRoute).toContain('maxLines=2');

    const deleteSavedViewAction = interactionContainer.querySelector('[data-log-manage-saved-view-delete-action]') as HTMLButtonElement | null;
    expect(deleteSavedViewAction).toBeTruthy();
    expect(deleteSavedViewAction?.getAttribute('data-log-manage-saved-view-delete-owner')).toBe('hertzbeat-ui-button');

    await act(async () => {
      deleteSavedViewAction?.click();
      await flushDashboardEditPromises();
    });

    expect(JSON.parse(window.localStorage.getItem('hertzbeat.log-manage.saved-query-views') || '[]')).toHaveLength(0);
    expect(savedViewRequests.some(request => request.method === 'DELETE' && request.path.includes('/api/signal/saved-view/logs/'))).toBe(true);
    expect(interactionContainer.querySelector('[data-log-manage-saved-views="route-query-views"]')?.getAttribute('data-log-manage-saved-view-persistence')).toBe('server-first');
  });

  it('updates the originating dashboard widget when saving logs in panel edit mode', async () => {
    mockState.searchParams = new URLSearchParams(
      'intent=edit-panel&dashboardKey=signals-overview&panelId=logs-errors&draftKey=logs-draft-errors&returnTo=%2Fdashboard%3Fdashboard%3Dsignals-overview&returnLabel=Signals%20overview&view=list&search=timeout&severityText=ERROR&serviceName=checkout&environment=prod&columns=service,body,span-id&format=raw&maxLines=3'
    );
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      renderInteractiveLogManagePage();
      await Promise.resolve();
    });

    const dashboardPanelDraftAction = interactionContainer.querySelector('[data-log-manage-dashboard-panel-draft-action="update-current"]') as HTMLButtonElement | null;
    expect(dashboardPanelDraftAction).toBeTruthy();
    expect(dashboardPanelDraftAction?.getAttribute('data-log-manage-dashboard-panel-draft-action-mode')).toBe('edit-panel');
    expect(dashboardPanelDraftAction?.getAttribute('data-log-manage-dashboard-panel-draft-action-dashboard')).toBe('signals-overview');
    expect(dashboardPanelDraftAction?.getAttribute('data-log-manage-dashboard-panel-draft-action-panel')).toBe('logs-errors');
    const tableViewAction = interactionContainer.querySelector('[data-log-manage-view-option="table"]') as HTMLButtonElement | null;
    expect(tableViewAction).toBeTruthy();
    mockState.replace.mockClear();

    await act(async () => {
      tableViewAction?.click();
      await Promise.resolve();
    });

    const tableRoute = String(mockState.replace.mock.calls.at(-1)?.[0]);
    expect(tableRoute).toContain('view=table');
    expect(tableRoute).toContain('intent=edit-panel');
    expect(tableRoute).toContain('dashboardKey=signals-overview');
    expect(tableRoute).toContain('panelId=logs-errors');
    expect(tableRoute).toContain('draftKey=logs-draft-errors');
    expect(tableRoute).toContain('returnTo=%2Fdashboard%3Fdashboard%3Dsignals-overview');
    expect(tableRoute).toContain('returnLabel=Signals+overview');
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
            tags: 'logs',
            layout: JSON.stringify([{ i: 'logs-errors', x: 0, y: 0, w: 6, h: 4 }]),
            widgets: JSON.stringify([{
              id: 'logs-errors',
              draftKey: 'logs-draft-errors',
              signal: 'logs',
              title: 'Old errors',
              visualization: 'table',
              route: '/log/manage?search=old',
              querySnapshot: '/log/manage?search=old'
            }]),
            panelMap: JSON.stringify({ 'logs-errors': 'logs-draft-errors' })
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
      signal: 'logs',
      draftKey: 'logs-draft-errors',
      visualization: 'list',
      querySnapshot: expect.stringContaining('/log/manage?search=timeout')
    }));
    expect(draftBody.route).toContain('severityText=ERROR');
    expect(JSON.parse(draftBody.payload)).toEqual(expect.objectContaining({
      dashboardPanelEdit: expect.objectContaining({
        intent: 'edit-panel',
        dashboardKey: 'signals-overview',
        panelId: 'logs-errors',
        draftKey: 'logs-draft-errors',
        returnTo: '/dashboard?dashboard=signals-overview',
        returnLabel: 'Signals overview'
      })
    }));
    expect(savedDashboards).toHaveLength(1);
    const savedDashboard = savedDashboards[0] as { widgets: string; panelMap: string };
    const savedWidget = JSON.parse(savedDashboard.widgets)[0];
    expect(savedWidget).toEqual(expect.objectContaining({
      id: 'logs-errors',
      draftKey: 'logs-draft-errors',
      signal: 'logs',
      visualization: 'list',
      route: expect.stringContaining('search=timeout')
    }));
    expect(savedWidget.route).toContain('severityText=ERROR');
    expect(JSON.parse(savedWidget.payload).dashboardPanelEdit).toEqual(expect.objectContaining({
      dashboardKey: 'signals-overview',
      panelId: 'logs-errors'
    }));
    expect(JSON.parse(savedDashboard.panelMap)).toEqual({ 'logs-errors': 'logs-draft-errors' });
    const dashboardPanelDraftStatus = interactionContainer.querySelector('[data-log-manage-dashboard-panel-draft-status="saved"]') as HTMLElement | null;
    expect(dashboardPanelDraftStatus?.getAttribute('data-log-manage-dashboard-panel-draft-status-mode')).toBe('edit-panel');
    expect(dashboardPanelDraftStatus?.textContent).toContain(createTranslatorMock({ locale: 'zh-CN' })('log.manage.dashboard-panel-draft.update-saved'));
  });

  it('copies a shareable link for the selected log row from the list table actions', async () => {
    mockState.searchParams = new URLSearchParams('view=table&search=timeout&severityText=ERROR&serviceName=checkout&environment=prod');
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      renderInteractiveLogManagePage();
      await Promise.resolve();
    });

    const clipboardWrites: string[] = [];
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn((value: string) => {
        clipboardWrites.push(value);
        return Promise.resolve();
      }) }
    });

    const copyLogLineAction = interactionContainer.querySelector('[data-log-manage-row-copy-link-action="true"]') as HTMLButtonElement | null;
    expect(copyLogLineAction).toBeTruthy();
    expect(copyLogLineAction?.getAttribute('data-log-manage-row-copy-link-owner')).toBe('hertzbeat-ui-button');
    expect(copyLogLineAction?.getAttribute('data-log-manage-row-copy-link-trace-id')).toBe('trace-123');

    await act(async () => {
      copyLogLineAction?.click();
      await Promise.resolve();
    });

    expect(clipboardWrites).toHaveLength(1);
    expect(clipboardWrites[0]).toContain('/log/manage?search=timeout');
    expect(clipboardWrites[0]).toContain('severityText=ERROR');
    expect(clipboardWrites[0]).toContain('serviceName=checkout');
    expect(clipboardWrites[0]).toContain('environment=prod');
    expect(clipboardWrites[0]).toContain('traceId=trace-123');
    expect(clipboardWrites[0]).toContain('spanId=span-456');
    expect(clipboardWrites[0]).toContain('logTimeUnixNano=1713200000000000000');
    expect(clipboardWrites[0]).toContain('view=table');
  });

  it('copies the selected log JSON and raw body from the detail dialog', async () => {
    mockState.searchParams = new URLSearchParams('view=table&search=timeout&severityText=ERROR');
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    const clipboardWrites: string[] = [];
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn((value: string) => {
        clipboardWrites.push(value);
        return Promise.resolve();
      }) }
    });

    await act(async () => {
      renderInteractiveLogManagePage();
      await Promise.resolve();
    });

    const detailAction = interactionContainer.querySelector('[data-log-manage-row-detail-action="true"]') as HTMLElement | null;
    expect(detailAction).toBeTruthy();

    await act(async () => {
      detailAction?.click();
      await Promise.resolve();
    });

    const copyJsonAction = interactionContainer.querySelector('[data-log-stream-detail-json-copy-action="json"]') as HTMLButtonElement | null;
    const copyRawAction = interactionContainer.querySelector('[data-log-stream-detail-raw-copy-action="raw"]') as HTMLButtonElement | null;
    const rawBodySection = interactionContainer.querySelector('[data-log-stream-detail-body-section="true"]') as HTMLElement | null;
    const rawBodyWrapAction = interactionContainer.querySelector('[data-log-stream-detail-body-wrap-action="toggle"]') as HTMLButtonElement | null;
    expect(rawBodySection).toBeTruthy();
    expect(rawBodySection?.getAttribute('data-log-stream-detail-body-wrap-state')).toBe('scroll');
    expect(rawBodySection?.textContent).toContain('checkout timeout');
    expect(rawBodyWrapAction).toBeTruthy();
    expect(rawBodyWrapAction?.getAttribute('data-log-stream-detail-body-wrap-owner')).toBe('hertzbeat-ui-button');
    expect(copyJsonAction).toBeTruthy();
    expect(copyRawAction).toBeTruthy();
    expect(copyJsonAction?.getAttribute('data-log-stream-detail-json-copy-owner')).toBe('hertzbeat-ui-button');
    expect(copyRawAction?.getAttribute('data-log-stream-detail-raw-copy-owner')).toBe('hertzbeat-ui-button');

    await act(async () => {
      copyJsonAction?.click();
      copyRawAction?.click();
      await Promise.resolve();
    });

    expect(clipboardWrites).toHaveLength(2);
    expect(clipboardWrites[0]).toContain('"traceId": "trace-123"');
    expect(clipboardWrites[0]).toContain('"body": "checkout timeout"');
    expect(clipboardWrites[1]).toBe('checkout timeout');

    await act(async () => {
      rawBodyWrapAction?.click();
      await Promise.resolve();
    });

    expect(rawBodySection?.getAttribute('data-log-stream-detail-body-wrap-state')).toBe('wrapped');
  });

  it('renders log detail metrics correlation dimensions without fabricated metric values', async () => {
    mockState.searchParams = new URLSearchParams('view=table&search=timeout&severityText=ERROR');
    const clipboardWrites: string[] = [];
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn((value: string) => {
        clipboardWrites.push(value);
        return Promise.resolve();
      }) }
    });
    apiMessageGet.mockImplementation((path: string) => {
      if (path.startsWith('/ingestion/otlp/metrics/console')) {
        const queryName = new URL(path, 'http://localhost').searchParams.get('query');
        if (!queryName) {
          return Promise.resolve({
            query: 'avg by (service_name) ({service_name="checkout", k8s_pod_name="checkout-7d9"})',
            datasource: 'prometheus',
            stats: { totalSeries: 8, nonEmptySeries: 2, latestObservedAt: 1713200000000 },
            context: { serviceName: 'checkout', serviceNamespace: 'payments', start: 1713199100000, end: 1713200060000 },
            results: {
              msg: 'ok',
              frames: [
                ...Array.from({ length: 6 }, (_, index) => ({
                  schema: {
                    labels: {
                      __name__: `http.server.duration.bucket.${index}`,
                      'service.name': 'checkout'
                    }
                  },
                  data: []
                })),
                {
                  schema: {
                    labels: {
                      __name__: 'container.cpu.discovered',
                      'k8s.pod.name': 'checkout-7d9',
                      'k8s.node.name': 'node-a'
                    }
                  },
                  data: [
                    [1713199940000, 0.21],
                    [1713200000000, 0.42]
                  ]
                },
                {
                  schema: {
                    labels: {
                      __name__: 'container.memory.discovered',
                      'k8s.pod.name': 'checkout-7d9',
                      'k8s.node.name': 'node-a'
                    }
                  },
                  data: [
                    [1713199940000, 512],
                    [1713200000000, 768]
                  ]
                }
              ]
            }
          });
        }
        if (queryName === 'container.cpu.usage' || queryName === 'container.memory.working_set') {
          return Promise.resolve({
            query: '',
            datasource: 'prometheus',
            stats: { totalSeries: 0, nonEmptySeries: 0, latestObservedAt: null },
            emptyStateReason: 'should_not_request_discovered_pod_metrics',
            context: { serviceName: 'checkout', serviceNamespace: 'payments', start: 1713199100000, end: 1713200060000 },
            results: { msg: 'ok', frames: [] }
          });
        }
        if (queryName === 'system.cpu.utilization') {
          return Promise.resolve({
            query: 'avg by (host_name) ({__name__="system_cpu_utilization", host_name="node-a"})',
            datasource: 'prometheus',
            stats: { totalSeries: 1, nonEmptySeries: 1, latestObservedAt: 1713200000000 },
            context: { serviceName: 'checkout', serviceNamespace: 'payments', start: 1713199100000, end: 1713200060000 },
            results: {
              msg: 'ok',
              frames: [
                {
                  schema: {
                    labels: {
                      __name__: 'system.cpu.utilization',
                      'host.name': 'node-a'
                    }
                  },
                  data: [
                    [1713199940000, 0.31],
                    [1713200000000, 0.62]
                  ]
                },
              ],
            }
          });
        }
        if (queryName === 'system.memory.usage') {
          return Promise.resolve({
            query: 'avg by (host_name) ({__name__="system_memory_usage", host_name="node-a"})',
            datasource: 'prometheus',
            stats: { totalSeries: 1, nonEmptySeries: 1, latestObservedAt: 1713200000000 },
            context: { serviceName: 'checkout', serviceNamespace: 'payments', start: 1713199100000, end: 1713200060000 },
            results: {
              msg: 'ok',
              frames: [
                {
                  schema: {
                    labels: {
                      __name__: 'system.memory.usage',
                      'host.name': 'node-a'
                    }
                  },
                  data: [
                    [1713199940000, 2048],
                    [1713200000000, 4096]
                  ]
                }
              ]
            }
          });
        }
        return Promise.resolve({
          query: '',
          datasource: 'prometheus',
          stats: { totalSeries: 0, nonEmptySeries: 0, latestObservedAt: null },
          emptyStateReason: 'no_series',
          context: { serviceName: 'checkout', serviceNamespace: 'payments', start: 1713199100000, end: 1713200060000 },
          results: { msg: 'ok', frames: [] }
        });
      }
      if (path.startsWith('/logs/context')) {
        return Promise.resolve({
          targetTimeUnixNano: 1713200000000000000,
          limit: 10,
          before: [],
          selected: null,
          after: [],
          hasMoreBefore: false,
          hasMoreAfter: false
        });
      }
      return Promise.resolve({});
    });
    mockState.renderData = {
      ...mockState.renderData,
      list: {
        ...mockState.renderData.list,
        content: [
          {
            ...mockState.renderData.list.content[0],
            resource: {
              ...mockState.renderData.list.content[0].resource,
              'service.namespace': 'payments',
              'k8s.namespace.name': 'shop',
              'k8s.pod.name': 'checkout-7d9',
              'k8s.node.name': 'node-a',
              'k8s.container.name': 'checkout',
              'host.name': 'node-a'
            }
          }
        ]
      }
    };
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      renderInteractiveLogManagePage();
      await Promise.resolve();
    });

    const detailAction = interactionContainer.querySelector('[data-log-manage-row-detail-action="true"]') as HTMLElement | null;
    expect(detailAction).toBeTruthy();

    await act(async () => {
      detailAction?.click();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    const metricsPanel = interactionContainer.querySelector('[data-log-stream-detail-metrics="correlation"]') as HTMLElement | null;
    const metricsLink = interactionContainer.querySelector('[data-log-stream-detail-metrics-link="open-metrics"]') as HTMLAnchorElement | null;
    const metricsPreview = interactionContainer.querySelector('[data-log-stream-detail-metrics-preview="source-backed-series"]') as HTMLElement | null;
    expect(metricsPanel).toBeTruthy();
    expect(metricsPanel?.getAttribute('data-log-stream-detail-metrics-owner')).toBe('hertzbeat-ui-detail-rows');
    expect(metricsPanel?.textContent).toContain('checkout');
    expect(metricsPanel?.textContent).toContain('payments');
    expect(metricsPanel?.textContent).toContain('shop');
    expect(metricsPanel?.textContent).toContain('checkout-7d9');
    expect(metricsPanel?.textContent).toContain('node-a');
    expect(metricsPanel?.textContent).not.toContain('CPU');
    expect(metricsPanel?.textContent).not.toContain('Memory');
    expect(metricsLink).toBeTruthy();
    expect(metricsLink?.getAttribute('data-log-stream-detail-metrics-link-owner')).toBe('hertzbeat-ui-button-link');
    expect(metricsLink?.getAttribute('href')).toContain('/ingestion/otlp/metrics');
    expect(metricsLink?.getAttribute('href')).toContain('serviceName=checkout');
    expect(metricsLink?.getAttribute('href')).toContain('filter=');
    expect(decodeURIComponent(metricsLink?.getAttribute('href') || '')).toContain('returnTo=/log/manage?');
    expect(decodeURIComponent(metricsLink?.getAttribute('href') || '')).toContain('k8s.pod.name="checkout-7d9"');
    expect(decodeURIComponent(metricsLink?.getAttribute('href') || '')).toContain('k8s.node.name="node-a"');
    const metricsPreviewCalls = apiMessageGet.mock.calls.filter(call => String(call[0]).startsWith('/ingestion/otlp/metrics/console'));
    expect(metricsPreviewCalls).toHaveLength(3);
    expect(metricsPreviewCalls.map(call => new URL(String(call[0]), 'http://localhost').searchParams.get('query'))).toEqual([
      null,
      'system.cpu.utilization',
      'system.memory.usage'
    ]);
    metricsPreviewCalls.forEach(call => {
      const decoded = decodeURIComponent(String(call[0] || ''));
      expect(decoded).toContain('k8s.pod.name="checkout-7d9"');
      expect(decoded).toContain('host.name="node-a"');
    });
    expect(metricsPreview).toBeTruthy();
    expect(metricsPreview?.getAttribute('data-log-stream-detail-metrics-preview-owner')).toBe('hertzbeat-ui-trend-frame');
    expect(metricsPreview?.textContent).toContain('container.cpu.discovered');
    expect(metricsPreview?.textContent).toContain('container.memory.discovered');
    expect(metricsPreview?.textContent).toContain('system.cpu.utilization');
    expect(metricsPreview?.textContent).toContain('system.memory.usage');
    expect(metricsPreview?.textContent).toContain(zhT('log.manage.stream.detail.metrics.preview-source.pod'));
    expect(metricsPreview?.textContent).toContain(zhT('log.manage.stream.detail.metrics.preview-source.node'));
    const previewGroups = Array.from(interactionContainer.querySelectorAll('[data-log-stream-detail-metrics-preview-group]'));
    expect(previewGroups.map(group => group.getAttribute('data-log-stream-detail-metrics-preview-group'))).toEqual(['pod', 'node']);
    expect(previewGroups[0]?.textContent).toContain(zhT('log.manage.stream.detail.metrics.preview-group.pod'));
    expect(previewGroups[1]?.textContent).toContain(zhT('log.manage.stream.detail.metrics.preview-group.node'));
    expect(previewGroups[0]?.getAttribute('data-log-stream-detail-metrics-preview-group-resource')).toBe('checkout-7d9');
    expect(previewGroups[1]?.getAttribute('data-log-stream-detail-metrics-preview-group-resource')).toBe('node-a');
    expect(metricsPreview?.textContent).toContain('CPU');
    expect(metricsPreview?.textContent).toContain(zhT('log.manage.stream.detail.metrics.preview-family.memory'));
    expect(metricsPreview?.textContent).toContain('0.42');
    expect(metricsPreview?.textContent).toContain('768');
    expect(metricsPreview?.textContent).toContain('0.62');
    expect(metricsPreview?.textContent).toContain('4096');
    expect(interactionContainer.querySelector('[data-log-stream-detail-metrics-preview-row="cpu"]')).toBeTruthy();
    expect(interactionContainer.querySelector('[data-log-stream-detail-metrics-preview-row="memory"]')).toBeTruthy();
    const previewRows = Array.from(interactionContainer.querySelectorAll('[data-log-stream-detail-metrics-preview-row]'));
    expect(previewRows.slice(0, 4).map(row => [
      row.getAttribute('data-log-stream-detail-metrics-preview-row-source'),
      row.getAttribute('data-log-stream-detail-metrics-preview-row')
    ])).toEqual([
      ['pod', 'cpu'],
      ['pod', 'memory'],
      ['node', 'cpu'],
      ['node', 'memory']
    ]);
    const previewMetricLinks = Array.from(interactionContainer.querySelectorAll('[data-log-stream-detail-metrics-preview-row-link="open-series"]')) as HTMLAnchorElement[];
    expect(previewMetricLinks).toHaveLength(4);
    expect(previewMetricLinks.every(link => link.getAttribute('data-log-stream-detail-metrics-preview-row-link-owner') === 'hertzbeat-ui-button-link')).toBe(true);
    const firstPreviewMetricHref = decodeURIComponent(previewMetricLinks[0]?.getAttribute('href') || '');
    expect(firstPreviewMetricHref).toContain('/ingestion/otlp/metrics');
    expect(firstPreviewMetricHref).toContain('query=container.cpu.discovered');
    expect(firstPreviewMetricHref).toContain('returnTo=/log/manage?');
    expect(firstPreviewMetricHref).toContain('k8s.pod.name="checkout-7d9"');
    expect(firstPreviewMetricHref).toContain('host.name="node-a"');
    const previewMetricCopyActions = Array.from(interactionContainer.querySelectorAll('[data-log-stream-detail-metrics-preview-row-copy="query"]')) as HTMLButtonElement[];
    expect(previewMetricCopyActions).toHaveLength(4);
    expect(previewMetricCopyActions.every(action => action.getAttribute('data-log-stream-detail-metrics-preview-row-copy-owner') === 'hertzbeat-ui-button')).toBe(true);
    await act(async () => {
      previewMetricCopyActions[0]?.click();
      await Promise.resolve();
    });
    expect(clipboardWrites).toEqual(['container.cpu.discovered']);
    expect(interactionContainer.querySelectorAll('[data-log-stream-detail-metrics-preview-trend-bar="real-sample"]')).toHaveLength(8);
  });

  it('uses metric names discovered from broad preview schema before static fallback targets', async () => {
    mockState.searchParams = new URLSearchParams('view=table&search=timeout&severityText=ERROR');
    apiMessageGet.mockImplementation((path: string) => {
      if (path.startsWith('/ingestion/otlp/metrics/console')) {
        const queryName = new URL(path, 'http://localhost').searchParams.get('query');
        const metricPayload = (metricName: string, labels: Record<string, string>, values: number[]) => Promise.resolve({
          query: metricName,
          datasource: 'prometheus',
          stats: { totalSeries: 1, nonEmptySeries: values.length > 0 ? 1 : 0, latestObservedAt: values.length > 0 ? 1713200000000 : null },
          context: { serviceName: 'checkout', serviceNamespace: 'payments', start: 1713199100000, end: 1713200060000 },
          results: {
            msg: 'ok',
            frames: [
              {
                schema: { labels: { __name__: metricName, ...labels } },
                data: values.map((value, index) => [1713199940000 + index * 60000, value])
              }
            ]
          }
        });
        if (!queryName) {
          return Promise.resolve({
            query: 'sum by (__name__) ({service_name="checkout"})',
            datasource: 'prometheus',
            stats: { totalSeries: 4, nonEmptySeries: 0, latestObservedAt: null },
            context: { serviceName: 'checkout', serviceNamespace: 'payments', start: 1713199100000, end: 1713200060000 },
            results: {
              msg: 'ok',
              frames: [
                {
                  schema: { labels: { __name__: 'k8s.pod.cpu.real', 'k8s.pod.name': 'checkout-7d9', 'k8s.node.name': 'node-a' } },
                  data: []
                },
                {
                  schema: { labels: { __name__: 'k8s.pod.memory.real', 'k8s.pod.name': 'checkout-7d9', 'k8s.node.name': 'node-a' } },
                  data: []
                },
                {
                  schema: { labels: { __name__: 'node.cpu.real', 'host.name': 'node-a' } },
                  data: []
                },
                {
                  schema: { labels: { __name__: 'node.memory.real', 'host.name': 'node-a' } },
                  data: []
                }
              ]
            }
          });
        }
        if (queryName === 'k8s.pod.cpu.real') {
          return metricPayload(queryName, { 'k8s.pod.name': 'checkout-7d9', 'k8s.node.name': 'node-a' }, [0.23, 0.47]);
        }
        if (queryName === 'k8s.pod.memory.real') {
          return metricPayload(queryName, { 'k8s.pod.name': 'checkout-7d9', 'k8s.node.name': 'node-a' }, [1024, 1536]);
        }
        if (queryName === 'node.cpu.real') {
          return metricPayload(queryName, { 'host.name': 'node-a' }, [0.34, 0.68]);
        }
        if (queryName === 'node.memory.real') {
          return metricPayload(queryName, { 'host.name': 'node-a' }, [4096, 8192]);
        }
        return metricPayload(queryName || 'unexpected', { 'service.name': 'checkout' }, []);
      }
      if (path.startsWith('/logs/context')) {
        return Promise.resolve({
          targetTimeUnixNano: 1713200000000000000,
          limit: 10,
          before: [],
          selected: null,
          after: [],
          hasMoreBefore: false,
          hasMoreAfter: false
        });
      }
      return Promise.resolve({});
    });
    mockState.renderData = {
      ...mockState.renderData,
      list: {
        ...mockState.renderData.list,
        content: [
          {
            ...mockState.renderData.list.content[0],
            resource: {
              ...mockState.renderData.list.content[0].resource,
              'service.namespace': 'payments',
              'k8s.namespace.name': 'shop',
              'k8s.pod.name': 'checkout-7d9',
              'k8s.node.name': 'node-a',
              'k8s.container.name': 'checkout',
              'host.name': 'node-a'
            }
          }
        ]
      }
    };
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      renderInteractiveLogManagePage();
      await Promise.resolve();
    });

    const detailAction = interactionContainer.querySelector('[data-log-manage-row-detail-action="true"]') as HTMLElement | null;
    expect(detailAction).toBeTruthy();

    await act(async () => {
      detailAction?.click();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    const metricsPreviewCalls = apiMessageGet.mock.calls.filter(call => String(call[0]).startsWith('/ingestion/otlp/metrics/console'));
    expect(metricsPreviewCalls.map(call => new URL(String(call[0]), 'http://localhost').searchParams.get('query'))).toEqual([
      null,
      'k8s.pod.cpu.real',
      'k8s.pod.memory.real',
      'node.cpu.real',
      'node.memory.real'
    ]);
    expect(metricsPreviewCalls.map(call => String(call[0]))).not.toContain(expect.stringContaining('container.cpu.usage'));
    expect(metricsPreviewCalls.map(call => String(call[0]))).not.toContain(expect.stringContaining('system.cpu.utilization'));
    const metricsPreview = interactionContainer.querySelector('[data-log-stream-detail-metrics-preview="source-backed-series"]') as HTMLElement | null;
    expect(metricsPreview).toBeTruthy();
    expect(metricsPreview?.textContent).toContain('k8s.pod.cpu.real');
    expect(metricsPreview?.textContent).toContain('k8s.pod.memory.real');
    expect(metricsPreview?.textContent).toContain('node.cpu.real');
    expect(metricsPreview?.textContent).toContain('node.memory.real');
  });

  it('prefers schema-discovered metric names matching the selected log resource filters', async () => {
    mockState.searchParams = new URLSearchParams('view=table&search=timeout&severityText=ERROR');
    apiMessageGet.mockImplementation((path: string) => {
      if (path.startsWith('/ingestion/otlp/metrics/console')) {
        const queryName = new URL(path, 'http://localhost').searchParams.get('query');
        const metricPayload = (metricName: string, labels: Record<string, string>, values: number[]) => Promise.resolve({
          query: metricName,
          datasource: 'prometheus',
          stats: { totalSeries: 1, nonEmptySeries: values.length > 0 ? 1 : 0, latestObservedAt: values.length > 0 ? 1713200000000 : null },
          context: { serviceName: 'checkout', serviceNamespace: 'payments', start: 1713199100000, end: 1713200060000 },
          results: {
            msg: 'ok',
            frames: [
              {
                schema: { labels: { __name__: metricName, ...labels } },
                data: values.map((value, index) => [1713199940000 + index * 60000, value])
              }
            ]
          }
        });
        if (!queryName) {
          return Promise.resolve({
            query: 'sum by (__name__) ({service_name="checkout"})',
            datasource: 'prometheus',
            stats: { totalSeries: 5, nonEmptySeries: 0, latestObservedAt: null },
            context: { serviceName: 'checkout', serviceNamespace: 'payments', start: 1713199100000, end: 1713200060000 },
            results: {
              msg: 'ok',
              frames: [
                {
                  schema: { labels: { __name__: 'k8s.pod.cpu.other', 'k8s.pod.name': 'billing-6c1', 'k8s.node.name': 'node-b' } },
                  data: []
                },
                {
                  schema: { labels: { __name__: 'k8s.pod.cpu.checkout', 'k8s.pod.name': 'checkout-7d9', 'k8s.node.name': 'node-a' } },
                  data: []
                },
                {
                  schema: { labels: { __name__: 'k8s.pod.memory.checkout', 'k8s.pod.name': 'checkout-7d9', 'k8s.node.name': 'node-a' } },
                  data: []
                },
                {
                  schema: { labels: { __name__: 'node.cpu.checkout', 'host.name': 'node-a' } },
                  data: []
                },
                {
                  schema: { labels: { __name__: 'node.memory.checkout', 'host.name': 'node-a' } },
                  data: []
                }
              ]
            }
          });
        }
        if (queryName === 'k8s.pod.cpu.checkout') {
          return metricPayload(queryName, { 'k8s.pod.name': 'checkout-7d9', 'k8s.node.name': 'node-a' }, [0.24, 0.48]);
        }
        if (queryName === 'k8s.pod.memory.checkout') {
          return metricPayload(queryName, { 'k8s.pod.name': 'checkout-7d9', 'k8s.node.name': 'node-a' }, [1280, 1536]);
        }
        if (queryName === 'node.cpu.checkout') {
          return metricPayload(queryName, { 'host.name': 'node-a' }, [0.36, 0.72]);
        }
        if (queryName === 'node.memory.checkout') {
          return metricPayload(queryName, { 'host.name': 'node-a' }, [4096, 8192]);
        }
        return metricPayload(queryName || 'unexpected', { 'service.name': 'checkout' }, []);
      }
      if (path.startsWith('/logs/context')) {
        return Promise.resolve({
          targetTimeUnixNano: 1713200000000000000,
          limit: 10,
          before: [],
          selected: null,
          after: [],
          hasMoreBefore: false,
          hasMoreAfter: false
        });
      }
      return Promise.resolve({});
    });
    mockState.renderData = {
      ...mockState.renderData,
      list: {
        ...mockState.renderData.list,
        content: [
          {
            ...mockState.renderData.list.content[0],
            resource: {
              ...mockState.renderData.list.content[0].resource,
              'service.namespace': 'payments',
              'k8s.namespace.name': 'shop',
              'k8s.pod.name': 'checkout-7d9',
              'k8s.node.name': 'node-a',
              'k8s.container.name': 'checkout',
              'host.name': 'node-a'
            }
          }
        ]
      }
    };
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      renderInteractiveLogManagePage();
      await Promise.resolve();
    });

    const detailAction = interactionContainer.querySelector('[data-log-manage-row-detail-action="true"]') as HTMLElement | null;
    expect(detailAction).toBeTruthy();

    await act(async () => {
      detailAction?.click();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    const metricsPreviewCalls = apiMessageGet.mock.calls.filter(call => String(call[0]).startsWith('/ingestion/otlp/metrics/console'));
    expect(metricsPreviewCalls.map(call => new URL(String(call[0]), 'http://localhost').searchParams.get('query'))).toEqual([
      null,
      'k8s.pod.cpu.checkout',
      'k8s.pod.memory.checkout',
      'node.cpu.checkout',
      'node.memory.checkout'
    ]);
    const metricsPreview = interactionContainer.querySelector('[data-log-stream-detail-metrics-preview="source-backed-series"]') as HTMLElement | null;
    expect(metricsPreview?.textContent).toContain('k8s.pod.cpu.checkout');
    expect(metricsPreview?.textContent).not.toContain('k8s.pod.cpu.other');
  });

  it('falls back to bounded metrics preview targets when the broad metrics query fails', async () => {
    mockState.searchParams = new URLSearchParams('view=table&search=timeout&severityText=ERROR');
    apiMessageGet.mockImplementation((path: string) => {
      if (path.startsWith('/ingestion/otlp/metrics/console')) {
        const queryName = new URL(path, 'http://localhost').searchParams.get('query');
        const metricPayload = (metricName: string, labels: Record<string, string>, values: number[]) => Promise.resolve({
          query: metricName,
          datasource: 'prometheus',
          stats: { totalSeries: 1, nonEmptySeries: 1, latestObservedAt: 1713200000000 },
          context: { serviceName: 'checkout', serviceNamespace: 'payments', start: 1713199100000, end: 1713200060000 },
          results: {
            msg: 'ok',
            frames: [
              {
                schema: { labels: { __name__: metricName, ...labels } },
                data: values.map((value, index) => [1713199940000 + index * 60000, value])
              }
            ]
          }
        });
        if (!queryName) {
          return Promise.reject(new Error('broad query unavailable'));
        }
        if (queryName === 'container.cpu.usage') {
          return metricPayload(queryName, { 'k8s.pod.name': 'checkout-7d9', 'k8s.node.name': 'node-a' }, [0.21, 0.42]);
        }
        if (queryName === 'container.memory.working_set') {
          return metricPayload(queryName, { 'k8s.pod.name': 'checkout-7d9', 'k8s.node.name': 'node-a' }, [512, 768]);
        }
        if (queryName === 'system.cpu.utilization') {
          return metricPayload(queryName, { 'host.name': 'node-a' }, [0.31, 0.62]);
        }
        if (queryName === 'system.memory.usage') {
          return metricPayload(queryName, { 'host.name': 'node-a' }, [2048, 4096]);
        }
      }
      if (path.startsWith('/logs/context')) {
        return Promise.resolve({
          targetTimeUnixNano: 1713200000000000000,
          limit: 10,
          before: [],
          selected: null,
          after: [],
          hasMoreBefore: false,
          hasMoreAfter: false
        });
      }
      return Promise.resolve({});
    });
    mockState.renderData = {
      ...mockState.renderData,
      list: {
        ...mockState.renderData.list,
        content: [
          {
            ...mockState.renderData.list.content[0],
            resource: {
              ...mockState.renderData.list.content[0].resource,
              'service.namespace': 'payments',
              'k8s.namespace.name': 'shop',
              'k8s.pod.name': 'checkout-7d9',
              'k8s.node.name': 'node-a',
              'k8s.container.name': 'checkout',
              'host.name': 'node-a'
            }
          }
        ]
      }
    };
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      renderInteractiveLogManagePage();
      await Promise.resolve();
    });

    const detailAction = interactionContainer.querySelector('[data-log-manage-row-detail-action="true"]') as HTMLElement | null;
    expect(detailAction).toBeTruthy();

    await act(async () => {
      detailAction?.click();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    const metricsPreviewCalls = apiMessageGet.mock.calls.filter(call => String(call[0]).startsWith('/ingestion/otlp/metrics/console'));
    expect(metricsPreviewCalls).toHaveLength(5);
    expect(metricsPreviewCalls.map(call => new URL(String(call[0]), 'http://localhost').searchParams.get('query'))).toEqual([
      null,
      'container.cpu.usage',
      'container.memory.working_set',
      'system.cpu.utilization',
      'system.memory.usage'
    ]);
    metricsPreviewCalls.forEach(call => {
      const decoded = decodeURIComponent(String(call[0] || ''));
      expect(decoded).toContain('k8s.pod.name="checkout-7d9"');
      expect(decoded).toContain('host.name="node-a"');
    });
    expect(interactionContainer.querySelector('[data-log-stream-detail-metrics-preview-error]')).toBeNull();
    const metricsPreview = interactionContainer.querySelector('[data-log-stream-detail-metrics-preview="source-backed-series"]') as HTMLElement | null;
    expect(metricsPreview).toBeTruthy();
    expect(metricsPreview?.textContent).toContain('container.cpu.usage');
    expect(metricsPreview?.textContent).toContain('container.memory.working_set');
    expect(metricsPreview?.textContent).toContain('system.cpu.utilization');
    expect(metricsPreview?.textContent).toContain('system.memory.usage');
  });

  it('uses backend related metrics candidates before static fallback targets when the broad metrics query fails', async () => {
    mockState.searchParams = new URLSearchParams('view=table&search=timeout&severityText=ERROR&operationName=POST%20%2Fcheckout');
    apiMessageGet.mockImplementation((path: string) => {
      if (path.startsWith('/ingestion/otlp/metrics/related')) {
        return Promise.resolve({
          source: 'backend-related-metrics',
          candidateCount: 4,
          candidates: [
            {
              query: 'backend.pod.cpu',
              source: 'pod',
              family: 'cpu',
              matchedLabels: ['k8s_pod_name'],
              resourceMatch: { k8s_pod_name: 'checkout-7d9' }
            },
            {
              query: 'backend.pod.memory',
              source: 'pod',
              family: 'memory',
              matchedLabels: ['k8s_pod_name'],
              resourceMatch: { k8s_pod_name: 'checkout-7d9' }
            },
            {
              query: 'backend.node.cpu',
              source: 'host',
              family: 'cpu',
              matchedLabels: ['host_name'],
              resourceMatch: { host_name: 'node-a' }
            },
            {
              query: 'backend.node.memory',
              source: 'host',
              family: 'memory',
              matchedLabels: ['host_name'],
              resourceMatch: { host_name: 'node-a' }
            }
          ]
        });
      }
      if (path.startsWith('/ingestion/otlp/metrics/console')) {
        const queryName = new URL(path, 'http://localhost').searchParams.get('query');
        const metricPayload = (metricName: string, labels: Record<string, string>, values: number[]) => Promise.resolve({
          query: metricName,
          datasource: 'prometheus',
          stats: { totalSeries: 1, nonEmptySeries: 1, latestObservedAt: 1713200000000 },
          context: { serviceName: 'checkout', serviceNamespace: 'payments', start: 1713199100000, end: 1713200060000 },
          results: {
            msg: 'ok',
            frames: [
              {
                schema: { labels: { __name__: metricName, ...labels } },
                data: values.map((value, index) => [1713199940000 + index * 60000, value])
              }
            ]
          }
        });
        if (!queryName) {
          return Promise.reject(new Error('broad query unavailable'));
        }
        if (queryName === 'backend.pod.cpu') {
          return metricPayload(queryName, { 'k8s.pod.name': 'checkout-7d9', 'k8s.node.name': 'node-a' }, [0.22, 0.44]);
        }
        if (queryName === 'backend.pod.memory') {
          return metricPayload(queryName, { 'k8s.pod.name': 'checkout-7d9', 'k8s.node.name': 'node-a' }, [512, 1024]);
        }
        if (queryName === 'backend.node.cpu') {
          return metricPayload(queryName, { 'host.name': 'node-a' }, [0.33, 0.66]);
        }
        if (queryName === 'backend.node.memory') {
          return metricPayload(queryName, { 'host.name': 'node-a' }, [2048, 4096]);
        }
      }
      if (path.startsWith('/logs/context')) {
        return Promise.resolve({
          targetTimeUnixNano: 1713200000000000000,
          limit: 10,
          before: [],
          selected: null,
          after: [],
          hasMoreBefore: false,
          hasMoreAfter: false
        });
      }
      return Promise.resolve({});
    });
    mockState.renderData = {
      ...mockState.renderData,
      list: {
        ...mockState.renderData.list,
        content: [
          {
            ...mockState.renderData.list.content[0],
            resource: {
              ...mockState.renderData.list.content[0].resource,
              'service.namespace': 'payments',
              'k8s.namespace.name': 'shop',
              'k8s.pod.name': 'checkout-7d9',
              'k8s.node.name': 'node-a',
              'k8s.container.name': 'checkout',
              'host.name': 'node-a'
            },
            attributes: {
              ...mockState.renderData.list.content[0].attributes,
              'http.route': 'POST /checkout'
            }
          }
        ]
      }
    };
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      renderInteractiveLogManagePage();
      await Promise.resolve();
    });

    const detailAction = interactionContainer.querySelector('[data-log-manage-row-detail-action="true"]') as HTMLElement | null;
    expect(detailAction).toBeTruthy();

    await act(async () => {
      detailAction?.click();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    const relatedCalls = apiMessageGet.mock.calls.filter(call => String(call[0]).startsWith('/ingestion/otlp/metrics/related'));
    expect(relatedCalls).toHaveLength(1);
    const relatedHref = decodeURIComponent(String(relatedCalls[0]?.[0] || ''));
    const relatedParams = new URL(String(relatedCalls[0]?.[0] || ''), 'http://localhost').searchParams;
    expect(relatedHref).toContain('serviceName=checkout');
    expect(relatedParams.get('operationName')).toBe('POST /checkout');
    expect(relatedHref).toContain('k8s.pod.name="checkout-7d9"');
    expect(relatedHref).toContain('host.name="node-a"');
    const metricsPreviewCalls = apiMessageGet.mock.calls.filter(call => String(call[0]).startsWith('/ingestion/otlp/metrics/console'));
    expect(metricsPreviewCalls.map(call => new URL(String(call[0]), 'http://localhost').searchParams.get('query'))).toEqual([
      null,
      'backend.pod.cpu',
      'backend.pod.memory',
      'backend.node.cpu',
      'backend.node.memory'
    ]);
    expect(metricsPreviewCalls.map(call => String(call[0]))).not.toContain(expect.stringContaining('container.cpu.usage'));
    expect(metricsPreviewCalls.map(call => String(call[0]))).not.toContain(expect.stringContaining('system.cpu.utilization'));
    const metricsPreview = interactionContainer.querySelector('[data-log-stream-detail-metrics-preview="source-backed-series"]') as HTMLElement | null;
    expect(metricsPreview).toBeTruthy();
    expect(metricsPreview?.textContent).toContain('backend.pod.cpu');
    expect(metricsPreview?.textContent).toContain('backend.pod.memory');
    expect(metricsPreview?.textContent).toContain('backend.node.cpu');
    expect(metricsPreview?.textContent).toContain('backend.node.memory');
  });

  it('opens a service-scoped context window around the selected log from the detail dialog', async () => {
    mockState.searchParams = new URLSearchParams('view=table&search=timeout&severityText=ERROR&timeRange=last-1h&source=otlp');
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      renderInteractiveLogManagePage();
      await Promise.resolve();
    });

    const detailAction = interactionContainer.querySelector('[data-log-manage-row-detail-action="true"]') as HTMLElement | null;
    expect(detailAction).toBeTruthy();

    await act(async () => {
      detailAction?.click();
      await Promise.resolve();
    });

    const contextAction = interactionContainer.querySelector('[data-log-stream-detail-context-action="show-context"]') as HTMLButtonElement | null;
    expect(contextAction).toBeTruthy();
    expect(contextAction?.getAttribute('data-log-stream-detail-context-owner')).toBe('hertzbeat-ui-button');
    mockState.replace.mockClear();

    await act(async () => {
      contextAction?.click();
      await Promise.resolve();
    });

    const contextRoute = String(mockState.replace.mock.calls[0]?.[0]);
    expect(contextRoute).toContain('/log/manage?');
    expect(contextRoute).toContain('view=list');
    expect(contextRoute).toContain('logTimeUnixNano=1713200000000000000');
    expect(contextRoute).toContain('listPageSize=20');
    expect(contextRoute).toContain('start=1713199700000');
    expect(contextRoute).toContain('end=1713200300000');
    expect(contextRoute).toContain('live=false');
    expect(contextRoute).toContain('serviceName=checkout');
    expect(contextRoute).toContain('environment=prod');
    expect(contextRoute).not.toContain('search=timeout');
    expect(contextRoute).not.toContain('severityText=ERROR');
  });

  it('loads surrounding context rows inside the log detail dialog', async () => {
    mockState.searchParams = new URLSearchParams(
      'view=table&search=timeout&severityText=ERROR&resourceFilter=service.version%3D1.2.3&attributeFilter=region%3Acn'
    );
    apiMessageGet.mockImplementation((path: string) => {
      if (path.startsWith('/logs/context')) {
        const url = new URL(path, 'http://localhost');
        const limit = url.searchParams.get('limit');
        const direction = url.searchParams.get('direction');
        return Promise.resolve({
          targetTimeUnixNano: 1713200000000000000,
          limit: Number(limit || 10),
          direction: direction || undefined,
          cursorLogTimeUnixNano: url.searchParams.get('cursorLogTimeUnixNano') || undefined,
          before: direction === 'after'
            ? []
            : direction === 'before'
              ? [
                  {
                    traceId: 'trace-before-more',
                    spanId: 'span-before-more',
                    severityText: 'INFO',
                    body: 'earlier checkout context',
                    timeUnixNano: 1713199998000000000,
                    resource: { 'service.name': 'checkout' },
                    attributes: { region: 'cn' }
                  }
                ]
              : [
                {
                  traceId: 'trace-before',
                  spanId: 'span-before',
                  severityText: 'INFO',
                  body: 'before checkout context',
                  timeUnixNano: 1713199999000000000,
                  resource: { 'service.name': 'checkout' },
                  attributes: { region: 'cn' }
                }
              ],
          selected: direction
            ? null
            : {
                traceId: 'trace-123',
                spanId: 'span-456',
                severityText: 'ERROR',
                body: 'checkout timeout',
                timeUnixNano: 1713200000000000000,
                resource: { 'service.name': 'checkout' },
                attributes: { region: 'cn' }
              },
          after: direction === 'after'
            ? [
                {
                  traceId: 'trace-after-more',
                  spanId: 'span-after-more',
                  severityText: 'INFO',
                  body: 'later checkout context',
                  timeUnixNano: 1713200002000000000,
                  resource: { 'service.name': 'checkout' },
                  attributes: { region: 'cn' }
                }
              ]
            : [
                {
                  traceId: 'trace-after',
                  spanId: 'span-after',
                  severityText: 'WARN',
                  body: 'after checkout context',
                  timeUnixNano: 1713200001000000000,
                  resource: { 'service.name': 'checkout' },
                  attributes: { region: 'cn' }
                }
              ],
          hasMoreBefore: !direction,
          hasMoreAfter: !direction
        });
      }
      return Promise.resolve({});
    });
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      renderInteractiveLogManagePage();
      await Promise.resolve();
    });

    const detailAction = interactionContainer.querySelector('[data-log-manage-row-detail-action="true"]') as HTMLElement | null;
    expect(detailAction).toBeTruthy();

    await act(async () => {
      detailAction?.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    const contextCall = apiMessageGet.mock.calls.find(call => String(call[0]).startsWith('/logs/context'));
    const contextPath = String(contextCall?.[0]);
    expect(contextPath).toContain('/logs/context?');
    expect(contextPath).toContain('logTimeUnixNano=1713200000000000000');
    expect(contextPath).toContain('limit=10');
    expect(contextPath).toContain('serviceName=checkout');
    expect(contextPath).toContain('environment=prod');
    expect(contextPath).toContain('resourceFilter=service.version%3D1.2.3');
    expect(contextPath).toContain('attributeFilter=region%3Acn');
    expect(contextPath).not.toContain('search=timeout');
    expect(contextPath).not.toContain('severityText=ERROR');

    const contextTable = interactionContainer.querySelector('[data-log-stream-detail-context="surrounding-logs"]');
    expect(contextTable).toBeTruthy();
    expect(contextTable?.getAttribute('data-log-stream-detail-context-owner')).toBe('hertzbeat-ui-data-table');
    expect(contextTable?.textContent).toContain('before checkout context');
    expect(contextTable?.textContent).toContain('checkout timeout');
    expect(contextTable?.textContent).toContain('after checkout context');
    expect(interactionContainer.textContent).toContain(tZh('log.manage.stream.detail.context.more-before'));
    expect(interactionContainer.textContent).toContain(tZh('log.manage.stream.detail.context.more-after'));

    const loadMoreBefore = interactionContainer.querySelector('[data-log-stream-detail-context-load-more="before"]') as HTMLButtonElement | null;
    const loadMoreAfter = interactionContainer.querySelector('[data-log-stream-detail-context-load-more="after"]') as HTMLButtonElement | null;
    expect(loadMoreBefore).toBeTruthy();
    expect(loadMoreBefore?.getAttribute('data-log-stream-detail-context-load-more-owner')).toBe('hertzbeat-ui-button');
    expect(loadMoreAfter).toBeTruthy();
    expect(loadMoreAfter?.getAttribute('data-log-stream-detail-context-load-more-owner')).toBe('hertzbeat-ui-button');

    await act(async () => {
      loadMoreBefore?.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    let contextCalls = apiMessageGet.mock.calls
      .map(call => String(call[0]))
      .filter(path => path.startsWith('/logs/context'));
    expect(contextCalls).toHaveLength(2);
    expect(contextCalls[1]).toContain('limit=10');
    expect(contextCalls[1]).toContain('direction=before');
    expect(contextCalls[1]).toContain('cursorLogTimeUnixNano=1713199999000000000');
    expect(contextCalls[1]).toContain('resourceFilter=service.version%3D1.2.3');
    expect(contextCalls[1]).toContain('attributeFilter=region%3Acn');
    expect(contextCalls[1]).not.toContain('search=timeout');
    expect(contextCalls[1]).not.toContain('severityText=ERROR');
    const contextTableAfterBeforeLoad = interactionContainer.querySelector('[data-log-stream-detail-context="surrounding-logs"]');
    expect(contextTableAfterBeforeLoad?.textContent).toContain('earlier checkout context');
    expect(contextTableAfterBeforeLoad?.textContent).toContain('before checkout context');
    expect(contextTableAfterBeforeLoad?.textContent).toContain('after checkout context');
    const loadMoreAfterLatest = interactionContainer.querySelector('[data-log-stream-detail-context-load-more="after"]') as HTMLButtonElement | null;
    expect(loadMoreAfterLatest).toBeTruthy();

    await act(async () => {
      loadMoreAfterLatest?.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    contextCalls = apiMessageGet.mock.calls
      .map(call => String(call[0]))
      .filter(path => path.startsWith('/logs/context'));
    expect(contextCalls).toHaveLength(3);
    expect(contextCalls[2]).toContain('limit=10');
    expect(contextCalls[2]).toContain('direction=after');
    expect(contextCalls[2]).toContain('cursorLogTimeUnixNano=1713200001000000000');
    expect(contextCalls[2]).toContain('resourceFilter=service.version%3D1.2.3');
    expect(contextCalls[2]).toContain('attributeFilter=region%3Acn');
    expect(contextCalls[2]).not.toContain('search=timeout');
    expect(contextCalls[2]).not.toContain('severityText=ERROR');
    const contextTableAfterAfterLoad = interactionContainer.querySelector('[data-log-stream-detail-context="surrounding-logs"]');
    expect(contextTableAfterAfterLoad?.textContent).toContain('earlier checkout context');
    expect(interactionContainer.textContent).toContain('later checkout context');
  });

  it('filters log detail context by an attribute without replacing the explorer route', async () => {
    mockState.searchParams = new URLSearchParams('view=table&search=timeout&severityText=ERROR');
    apiMessageGet.mockImplementation((path: string) => {
      if (path.startsWith('/logs/context')) {
        const url = new URL(path, 'http://localhost');
        const filtered = url.searchParams.get('attributeFilter') === 'region:cn';
        return Promise.resolve({
          targetTimeUnixNano: 1713200000000000000,
          limit: Number(url.searchParams.get('limit') || 10),
          before: [],
          selected: {
            traceId: 'trace-123',
            spanId: 'span-456',
            severityText: 'ERROR',
            body: filtered ? 'checkout timeout filtered context' : 'checkout timeout',
            timeUnixNano: 1713200000000000000,
            resource: { 'service.name': 'checkout' },
            attributes: { region: 'cn' }
          },
          after: [],
          hasMoreBefore: false,
          hasMoreAfter: false
        });
      }
      return Promise.resolve({});
    });
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      renderInteractiveLogManagePage();
      await Promise.resolve();
    });

    const detailAction = interactionContainer.querySelector('[data-log-manage-row-detail-action="true"]') as HTMLElement | null;
    expect(detailAction).toBeTruthy();

    await act(async () => {
      detailAction?.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    const contextFilterAction = interactionContainer.querySelector(
      '[data-log-stream-detail-context-filter-action="attribute"][data-log-manage-attribute-filter-name="region"]'
    ) as HTMLButtonElement | null;
    expect(contextFilterAction).toBeTruthy();
    expect(contextFilterAction?.getAttribute('data-log-stream-detail-context-filter-owner')).toBe('hertzbeat-ui-button');
    mockState.replace.mockClear();

    await act(async () => {
      contextFilterAction?.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    const contextCalls = apiMessageGet.mock.calls
      .map(call => String(call[0]))
      .filter(path => path.startsWith('/logs/context'));
    expect(mockState.replace).not.toHaveBeenCalled();
    expect(contextCalls).toHaveLength(2);
    expect(contextCalls[1]).toContain('attributeFilter=region%3Acn');
    expect(contextCalls[1]).not.toContain('search=timeout');
    expect(contextCalls[1]).not.toContain('severityText=ERROR');
    expect(interactionContainer.textContent).toContain('checkout timeout filtered context');
  });

  it('narrows log table rows by trace id from the row trace cell', async () => {
    mockState.searchParams = new URLSearchParams('view=list&search=timeout&severityText=ERROR&serviceName=checkout&environment=prod');
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      renderInteractiveLogManagePage();
      await Promise.resolve();
    });

    const traceIdFilterAction = interactionContainer.querySelector(
      '[data-log-manage-table-trace-id-filter-action="trace-123"]'
    ) as HTMLButtonElement | null;
    expect(traceIdFilterAction).toBeTruthy();
    expect(traceIdFilterAction?.getAttribute('data-log-manage-table-trace-id-filter-owner')).toBe('hertzbeat-ui-button');
    mockState.replace.mockClear();

    await act(async () => {
      traceIdFilterAction?.click();
      await Promise.resolve();
    });

    const route = String(mockState.replace.mock.calls[0]?.[0]);
    expect(mockState.replace).toHaveBeenCalledTimes(1);
    expect(route).toContain('traceId=trace-123');
    expect(route).toContain('search=timeout');
    expect(route).toContain('view=list');
    expect(route).toContain('severityText=ERROR');
    expect(route).toContain('serviceName=checkout');
    expect(route).toContain('environment=prod');
  });

  it('narrows log table rows by span id from the optional row span cell', async () => {
    mockState.searchParams = new URLSearchParams('view=table&columns=service,body,span-id&search=timeout&traceId=trace-123&severityText=ERROR&serviceName=checkout&environment=prod');
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      renderInteractiveLogManagePage();
      await Promise.resolve();
    });

    const spanIdFilterAction = interactionContainer.querySelector(
      '[data-log-manage-table-span-id-filter-action="span-456"]'
    ) as HTMLButtonElement | null;
    expect(spanIdFilterAction).toBeTruthy();
    expect(spanIdFilterAction?.getAttribute('data-log-manage-table-span-id-filter-owner')).toBe('hertzbeat-ui-button');
    mockState.replace.mockClear();

    await act(async () => {
      spanIdFilterAction?.click();
      await Promise.resolve();
    });

    const route = String(mockState.replace.mock.calls[0]?.[0]);
    expect(mockState.replace).toHaveBeenCalledTimes(1);
    expect(route).toContain('spanId=span-456');
    expect(route).toContain('traceId=trace-123');
    expect(route).toContain('search=timeout');
    expect(route).toContain('view=table');
    expect(route).toContain('columns=service%2Cbody%2Cspan-id');
    expect(route).toContain('severityText=ERROR');
    expect(route).toContain('serviceName=checkout');
    expect(route).toContain('environment=prod');
  });

  it('applies selected log resource and attribute rows into the query route', async () => {
    mockState.searchParams = new URLSearchParams('view=list');
    const originalContent = mockState.renderData.list.content;
    mockState.renderData.list.content = [
      {
        ...originalContent[0],
        resource: {
          ...originalContent[0].resource,
          'service.version': '1.2.3'
        },
        attributes: {
          ...originalContent[0].attributes,
          'http.route': '/checkout/:id'
        }
      }
    ];
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    try {
      await act(async () => {
        renderInteractiveLogManagePage();
        await Promise.resolve();
      });

      const resourceAction = interactionContainer.querySelector(
        '[data-log-manage-attribute-filter-action="resource"][data-log-manage-attribute-filter-name="service.version"]'
      ) as HTMLButtonElement | null;
      const attributeAction = interactionContainer.querySelector(
        '[data-log-manage-attribute-filter-action="attribute"][data-log-manage-attribute-filter-name="http.route"]'
      ) as HTMLButtonElement | null;
      expect(resourceAction).toBeTruthy();
      expect(attributeAction).toBeTruthy();
      expect(resourceAction?.getAttribute('data-log-manage-attribute-filter-owner')).toBe('hertzbeat-ui-button');
      expect(attributeAction?.getAttribute('data-log-manage-attribute-filter-owner')).toBe('hertzbeat-ui-button');
      mockState.replace.mockClear();

      await act(async () => {
        resourceAction?.click();
        await Promise.resolve();
      });

      expect(mockState.replace).toHaveBeenCalledTimes(1);
      expect(String(mockState.replace.mock.calls[0]?.[0])).toContain('resourceFilter=service.version%3D1.2.3');

      mockState.replace.mockClear();
      await act(async () => {
        attributeAction?.click();
        await Promise.resolve();
      });

      expect(mockState.replace).toHaveBeenCalledTimes(1);
      expect(String(mockState.replace.mock.calls[0]?.[0])).toContain('attributeFilter=http.route%3A%2Fcheckout%2F%3Aid');
    } finally {
      mockState.renderData.list.content = originalContent;
    }
  });

  it('excludes selected log resource and attribute values from the query route', async () => {
    mockState.searchParams = new URLSearchParams('view=list&search=timeout');
    const originalContent = mockState.renderData.list.content;
    mockState.renderData.list.content = [
      {
        ...originalContent[0],
        resource: {
          ...originalContent[0].resource,
          'service.version': '1.2.3'
        },
        attributes: {
          ...originalContent[0].attributes,
          'http.route': '/checkout/:id'
        }
      }
    ];
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    try {
      await act(async () => {
        renderInteractiveLogManagePage();
        await Promise.resolve();
      });

      const excludeResourceAction = interactionContainer.querySelector(
        '[data-log-manage-attribute-filter-out-action="resource"][data-log-manage-attribute-filter-name="service.version"]'
      ) as HTMLButtonElement | null;
      const excludeAttributeAction = interactionContainer.querySelector(
        '[data-log-manage-attribute-filter-out-action="attribute"][data-log-manage-attribute-filter-name="http.route"]'
      ) as HTMLButtonElement | null;
      expect(excludeResourceAction).toBeTruthy();
      expect(excludeAttributeAction).toBeTruthy();
      expect(excludeResourceAction?.getAttribute('data-log-manage-attribute-filter-out-owner')).toBe('hertzbeat-ui-button');
      expect(excludeAttributeAction?.getAttribute('data-log-manage-attribute-filter-out-owner')).toBe('hertzbeat-ui-button');
      mockState.replace.mockClear();

      await act(async () => {
        excludeResourceAction?.click();
        await Promise.resolve();
      });

      expect(mockState.replace).toHaveBeenCalledTimes(1);
      expect(String(mockState.replace.mock.calls[0]?.[0])).toContain('resourceFilter=service.version%21%3D1.2.3');

      mockState.replace.mockClear();
      await act(async () => {
        excludeAttributeAction?.click();
        await Promise.resolve();
      });

      expect(mockState.replace).toHaveBeenCalledTimes(1);
      expect(String(mockState.replace.mock.calls[0]?.[0])).toContain('attributeFilter=http.route%21%3D%2Fcheckout%2F%3Aid');

      const existsResourceAction = interactionContainer.querySelector(
        '[data-log-manage-attribute-exists-action="resource"][data-log-manage-attribute-filter-name="service.version"]'
      ) as HTMLButtonElement | null;
      const existsAttributeAction = interactionContainer.querySelector(
        '[data-log-manage-attribute-exists-action="attribute"][data-log-manage-attribute-filter-name="http.route"]'
      ) as HTMLButtonElement | null;
      expect(existsResourceAction).toBeTruthy();
      expect(existsAttributeAction).toBeTruthy();
      expect(existsResourceAction?.getAttribute('data-log-manage-attribute-exists-owner')).toBe('hertzbeat-ui-button');
      expect(existsAttributeAction?.getAttribute('data-log-manage-attribute-exists-owner')).toBe('hertzbeat-ui-button');

      mockState.replace.mockClear();
      await act(async () => {
        existsResourceAction?.click();
        await Promise.resolve();
      });

      expect(mockState.replace).toHaveBeenCalledTimes(1);
      expect(new URL(String(mockState.replace.mock.calls[0]?.[0]), 'http://localhost').searchParams.get('resourceFilter')).toContain('service.version EXISTS');

      mockState.replace.mockClear();
      await act(async () => {
        existsAttributeAction?.click();
        await Promise.resolve();
      });

      expect(mockState.replace).toHaveBeenCalledTimes(1);
      expect(new URL(String(mockState.replace.mock.calls[0]?.[0]), 'http://localhost').searchParams.get('attributeFilter')).toContain('http.route EXISTS');

      const notExistsResourceAction = interactionContainer.querySelector(
        '[data-log-manage-attribute-not-exists-action="resource"][data-log-manage-attribute-filter-name="service.version"]'
      ) as HTMLButtonElement | null;
      const notExistsAttributeAction = interactionContainer.querySelector(
        '[data-log-manage-attribute-not-exists-action="attribute"][data-log-manage-attribute-filter-name="http.route"]'
      ) as HTMLButtonElement | null;
      expect(notExistsResourceAction).toBeTruthy();
      expect(notExistsAttributeAction).toBeTruthy();
      expect(notExistsResourceAction?.getAttribute('data-log-manage-attribute-not-exists-owner')).toBe('hertzbeat-ui-button');
      expect(notExistsAttributeAction?.getAttribute('data-log-manage-attribute-not-exists-owner')).toBe('hertzbeat-ui-button');

      mockState.replace.mockClear();
      await act(async () => {
        notExistsResourceAction?.click();
        await Promise.resolve();
      });

      expect(mockState.replace).toHaveBeenCalledTimes(1);
      expect(new URL(String(mockState.replace.mock.calls[0]?.[0]), 'http://localhost').searchParams.get('resourceFilter')).toContain('service.version NOT EXISTS');

      mockState.replace.mockClear();
      await act(async () => {
        notExistsAttributeAction?.click();
        await Promise.resolve();
      });

      expect(mockState.replace).toHaveBeenCalledTimes(1);
      expect(new URL(String(mockState.replace.mock.calls[0]?.[0]), 'http://localhost').searchParams.get('attributeFilter')).toContain('http.route NOT EXISTS');

      const containsResourceAction = interactionContainer.querySelector(
        '[data-log-manage-attribute-contains-action="resource"][data-log-manage-attribute-filter-name="service.version"]'
      ) as HTMLButtonElement | null;
      const containsAttributeAction = interactionContainer.querySelector(
        '[data-log-manage-attribute-contains-action="attribute"][data-log-manage-attribute-filter-name="http.route"]'
      ) as HTMLButtonElement | null;
      expect(containsResourceAction).toBeTruthy();
      expect(containsAttributeAction).toBeTruthy();
      expect(containsResourceAction?.getAttribute('data-log-manage-attribute-contains-owner')).toBe('hertzbeat-ui-button');
      expect(containsAttributeAction?.getAttribute('data-log-manage-attribute-contains-owner')).toBe('hertzbeat-ui-button');

      mockState.replace.mockClear();
      await act(async () => {
        containsResourceAction?.click();
        await Promise.resolve();
      });

      expect(mockState.replace).toHaveBeenCalledTimes(1);
      expect(new URL(String(mockState.replace.mock.calls[0]?.[0]), 'http://localhost').searchParams.get('resourceFilter')).toContain('service.version CONTAINS 1.2.3');

      mockState.replace.mockClear();
      await act(async () => {
        containsAttributeAction?.click();
        await Promise.resolve();
      });

      expect(mockState.replace).toHaveBeenCalledTimes(1);
      expect(new URL(String(mockState.replace.mock.calls[0]?.[0]), 'http://localhost').searchParams.get('attributeFilter')).toContain('http.route CONTAINS /checkout/:id');

      const notContainsResourceAction = interactionContainer.querySelector(
        '[data-log-manage-attribute-not-contains-action="resource"][data-log-manage-attribute-filter-name="service.version"]'
      ) as HTMLButtonElement | null;
      const notContainsAttributeAction = interactionContainer.querySelector(
        '[data-log-manage-attribute-not-contains-action="attribute"][data-log-manage-attribute-filter-name="http.route"]'
      ) as HTMLButtonElement | null;
      expect(notContainsResourceAction).toBeTruthy();
      expect(notContainsAttributeAction).toBeTruthy();
      expect(notContainsResourceAction?.getAttribute('data-log-manage-attribute-not-contains-owner')).toBe('hertzbeat-ui-button');
      expect(notContainsAttributeAction?.getAttribute('data-log-manage-attribute-not-contains-owner')).toBe('hertzbeat-ui-button');

      mockState.replace.mockClear();
      await act(async () => {
        notContainsResourceAction?.click();
        await Promise.resolve();
      });

      expect(mockState.replace).toHaveBeenCalledTimes(1);
      expect(new URL(String(mockState.replace.mock.calls[0]?.[0]), 'http://localhost').searchParams.get('resourceFilter')).toContain('service.version NOT CONTAINS 1.2.3');

      mockState.replace.mockClear();
      await act(async () => {
        notContainsAttributeAction?.click();
        await Promise.resolve();
      });

      expect(mockState.replace).toHaveBeenCalledTimes(1);
      expect(new URL(String(mockState.replace.mock.calls[0]?.[0]), 'http://localhost').searchParams.get('attributeFilter')).toContain('http.route NOT CONTAINS /checkout/:id');

      const inResourceAction = interactionContainer.querySelector(
        '[data-log-manage-attribute-in-action="resource"][data-log-manage-attribute-filter-name="service.version"]'
      ) as HTMLButtonElement | null;
      const inAttributeAction = interactionContainer.querySelector(
        '[data-log-manage-attribute-in-action="attribute"][data-log-manage-attribute-filter-name="http.route"]'
      ) as HTMLButtonElement | null;
      expect(inResourceAction).toBeTruthy();
      expect(inAttributeAction).toBeTruthy();
      expect(inResourceAction?.getAttribute('data-log-manage-attribute-in-owner')).toBe('hertzbeat-ui-button');
      expect(inAttributeAction?.getAttribute('data-log-manage-attribute-in-owner')).toBe('hertzbeat-ui-button');

      mockState.replace.mockClear();
      await act(async () => {
        inResourceAction?.click();
        await Promise.resolve();
      });

      expect(mockState.replace).toHaveBeenCalledTimes(1);
      expect(new URL(String(mockState.replace.mock.calls[0]?.[0]), 'http://localhost').searchParams.get('resourceFilter')).toContain('service.version IN ("1.2.3")');

      mockState.replace.mockClear();
      await act(async () => {
        inAttributeAction?.click();
        await Promise.resolve();
      });

      expect(mockState.replace).toHaveBeenCalledTimes(1);
      expect(new URL(String(mockState.replace.mock.calls[0]?.[0]), 'http://localhost').searchParams.get('attributeFilter')).toContain('http.route IN ("/checkout/:id")');

      const notInResourceAction = interactionContainer.querySelector(
        '[data-log-manage-attribute-not-in-action="resource"][data-log-manage-attribute-filter-name="service.version"]'
      ) as HTMLButtonElement | null;
      const notInAttributeAction = interactionContainer.querySelector(
        '[data-log-manage-attribute-not-in-action="attribute"][data-log-manage-attribute-filter-name="http.route"]'
      ) as HTMLButtonElement | null;
      expect(notInResourceAction).toBeTruthy();
      expect(notInAttributeAction).toBeTruthy();
      expect(notInResourceAction?.getAttribute('data-log-manage-attribute-not-in-owner')).toBe('hertzbeat-ui-button');
      expect(notInAttributeAction?.getAttribute('data-log-manage-attribute-not-in-owner')).toBe('hertzbeat-ui-button');

      mockState.replace.mockClear();
      await act(async () => {
        notInResourceAction?.click();
        await Promise.resolve();
      });

      expect(mockState.replace).toHaveBeenCalledTimes(1);
      expect(new URL(String(mockState.replace.mock.calls[0]?.[0]), 'http://localhost').searchParams.get('resourceFilter')).toContain('service.version NOT IN ("1.2.3")');

      mockState.replace.mockClear();
      await act(async () => {
        notInAttributeAction?.click();
        await Promise.resolve();
      });

      expect(mockState.replace).toHaveBeenCalledTimes(1);
      expect(new URL(String(mockState.replace.mock.calls[0]?.[0]), 'http://localhost').searchParams.get('attributeFilter')).toContain('http.route NOT IN ("/checkout/:id")');
    } finally {
      mockState.renderData.list.content = originalContent;
    }
  });

  it('replaces existing log resource and attribute filters from selected rows', async () => {
    mockState.searchParams = new URLSearchParams(
      'view=list&resourceFilter=service.version%3D1.0.0&attributeFilter=http.route%3A%2Fold'
    );
    const originalContent = mockState.renderData.list.content;
    mockState.renderData.list.content = [
      {
        ...originalContent[0],
        resource: {
          ...originalContent[0].resource,
          'service.version': '1.2.3'
        },
        attributes: {
          ...originalContent[0].attributes,
          'http.route': '/checkout/:id'
        }
      }
    ];
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    try {
      await act(async () => {
        renderInteractiveLogManagePage();
        await Promise.resolve();
      });

      const replaceResourceAction = interactionContainer.querySelector(
        '[data-log-manage-attribute-filter-replace-action="resource"][data-log-manage-attribute-filter-name="service.version"]'
      ) as HTMLButtonElement | null;
      const replaceAttributeAction = interactionContainer.querySelector(
        '[data-log-manage-attribute-filter-replace-action="attribute"][data-log-manage-attribute-filter-name="http.route"]'
      ) as HTMLButtonElement | null;
      expect(replaceResourceAction).toBeTruthy();
      expect(replaceAttributeAction).toBeTruthy();
      expect(replaceResourceAction?.getAttribute('data-log-manage-attribute-filter-replace-owner')).toBe('hertzbeat-ui-button');
      expect(replaceAttributeAction?.getAttribute('data-log-manage-attribute-filter-replace-owner')).toBe('hertzbeat-ui-button');
      mockState.replace.mockClear();

      await act(async () => {
        replaceResourceAction?.click();
        await Promise.resolve();
      });

      const resourceRoute = String(mockState.replace.mock.calls[0]?.[0]);
      expect(resourceRoute).toContain('resourceFilter=service.version%3D1.2.3');
      expect(resourceRoute).not.toContain('resourceFilter=service.version%3D1.0.0');

      mockState.replace.mockClear();
      await act(async () => {
        replaceAttributeAction?.click();
        await Promise.resolve();
      });

      const attributeRoute = String(mockState.replace.mock.calls[0]?.[0]);
      expect(attributeRoute).toContain('attributeFilter=http.route%3A%2Fcheckout%2F%3Aid');
      expect(attributeRoute).not.toContain('attributeFilter=http.route%3A%2Fold');
    } finally {
      mockState.renderData.list.content = originalContent;
    }
  });

  it('groups selected log resource and attribute rows into the query route', async () => {
    mockState.searchParams = new URLSearchParams('view=list&groupBy=resource:service.namespace');
    const originalContent = mockState.renderData.list.content;
    mockState.renderData.list.content = [
      {
        ...originalContent[0],
        resource: {
          ...originalContent[0].resource,
          'service.version': '1.2.3'
        },
        attributes: {
          ...originalContent[0].attributes,
          'http.route': '/checkout/:id'
        }
      }
    ];
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    try {
      await act(async () => {
        renderInteractiveLogManagePage();
        await Promise.resolve();
      });

      const groupResourceAction = interactionContainer.querySelector(
        '[data-log-manage-attribute-group-action="resource"][data-log-manage-attribute-filter-name="service.version"]'
      ) as HTMLButtonElement | null;
      const groupAttributeAction = interactionContainer.querySelector(
        '[data-log-manage-attribute-group-action="attribute"][data-log-manage-attribute-filter-name="http.route"]'
      ) as HTMLButtonElement | null;
      expect(groupResourceAction).toBeTruthy();
      expect(groupAttributeAction).toBeTruthy();
      expect(groupResourceAction?.getAttribute('data-log-manage-attribute-group-owner')).toBe('hertzbeat-ui-button');
      expect(groupAttributeAction?.getAttribute('data-log-manage-attribute-group-owner')).toBe('hertzbeat-ui-button');
      mockState.replace.mockClear();

      await act(async () => {
        groupResourceAction?.click();
        await Promise.resolve();
      });

      const resourceRoute = String(mockState.replace.mock.calls[0]?.[0]);
      expect(resourceRoute).toContain('groupBy=resource%3Aservice.version');
      expect(resourceRoute).not.toContain('groupBy=resource%3Aservice.namespace');

      mockState.replace.mockClear();
      await act(async () => {
        groupAttributeAction?.click();
        await Promise.resolve();
      });

      const attributeRoute = String(mockState.replace.mock.calls[0]?.[0]);
      expect(attributeRoute).toContain('groupBy=attribute%3Ahttp.route');
      expect(attributeRoute).not.toContain('groupBy=resource%3Aservice.namespace');
    } finally {
      mockState.renderData.list.content = originalContent;
    }
  });

  it('filters log group result values back into the query route', async () => {
    mockState.searchParams = new URLSearchParams('view=list&groupBy=resource:service.version');
    const originalGroup = mockState.renderData.group;
    mockState.renderData.group = {
      groupBy: 'resource:service.version',
      groups: [{ value: '1.2.3', count: 7 }]
    };
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    try {
      await act(async () => {
        renderInteractiveLogManagePage();
        await Promise.resolve();
      });

      const resourceValueAction = interactionContainer.querySelector(
        '[data-log-manage-group-filter-action="resource:service.version"][data-log-manage-group-filter-value="1.2.3"]'
      ) as HTMLButtonElement | null;
      expect(resourceValueAction).toBeTruthy();
      expect(resourceValueAction?.getAttribute('data-log-manage-group-filter-owner')).toBe('hertzbeat-ui-button');
      mockState.replace.mockClear();

      await act(async () => {
        resourceValueAction?.click();
        await Promise.resolve();
      });

      expect(String(mockState.replace.mock.calls[0]?.[0])).toContain('resourceFilter=service.version%3D1.2.3');
      expect(String(mockState.replace.mock.calls[0]?.[0])).toContain('groupBy=resource%3Aservice.version');

      mockState.searchParams = new URLSearchParams('view=list&groupBy=attribute:http.route');
      mockState.renderData.group = {
        groupBy: 'attribute:http.route',
        groups: [{ value: '/checkout/:id', count: 4 }]
      };
      mockState.replace.mockClear();
      await act(async () => {
        interactionRoot?.unmount();
        interactionRoot = createRoot(interactionContainer as HTMLDivElement);
        interactionRoot?.render(<LogManagePage initialRouteState={buildLogManageRouteState()} />);
        await Promise.resolve();
      });

      const attributeValueAction = interactionContainer.querySelector(
        '[data-log-manage-group-filter-action="attribute:http.route"][data-log-manage-group-filter-value="/checkout/:id"]'
      ) as HTMLButtonElement | null;
      expect(attributeValueAction).toBeTruthy();

      await act(async () => {
        attributeValueAction?.click();
        await Promise.resolve();
      });

      expect(String(mockState.replace.mock.calls[0]?.[0])).toContain('attributeFilter=http.route%3A%2Fcheckout%2F%3Aid');
      expect(String(mockState.replace.mock.calls[0]?.[0])).toContain('groupBy=attribute%3Ahttp.route');
    } finally {
      mockState.renderData.group = originalGroup;
    }
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
      expect(html).toContain(`title="${createTranslatorMock({ locale: 'zh-CN' })('log.manage.handoff.trace-disabled')}"`);
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

  it('opens the exact copied log line by logTimeUnixNano when no trace id is present', async () => {
    mockState.searchParams = new URLSearchParams('view=list&logTimeUnixNano=1002');
    const originalContent = mockState.renderData.list.content;
    mockState.renderData.list.content = [
      {
        traceId: '',
        spanId: '',
        severityText: 'INFO',
        severityNumber: 9,
        body: 'nearby log line',
        timeUnixNano: 1001,
        resource: { 'service.name': 'checkout' },
        attributes: {}
      },
      {
        traceId: '',
        spanId: '',
        severityText: 'ERROR',
        severityNumber: 17,
        body: 'copied exact log line',
        timeUnixNano: 1002,
        resource: { 'service.name': 'checkout' },
        attributes: {}
      }
    ];
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    try {
      await act(async () => {
        renderInteractiveLogManagePage();
        await Promise.resolve();
        await Promise.resolve();
      });

      const detailDialog = interactionContainer.querySelector('[data-log-stream-detail-dialog="true"]');
      expect(detailDialog).not.toBeNull();
      expect(detailDialog?.textContent).toContain('copied exact log line');
      expect(detailDialog?.textContent).not.toContain('nearby log line');
    } finally {
      mockState.renderData.list.content = originalContent;
    }
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
      expect(detailDialog?.querySelector('[data-log-stream-detail-attributes="log-attributes"]')).not.toBeNull();
      expect(detailDialog?.querySelector('[data-log-stream-detail-attributes-owner="hertzbeat-ui-data-table"]')).not.toBeNull();
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
    expect(apiMessageGet.mock.calls.some(call => String(call[0]).startsWith('/logs/context?'))).toBe(true);
    expect(apiMessageGet.mock.calls.some(call => String(call[0]).includes('/traces/'))).toBe(false);
  });

  it('loads the same log API URLs for the current query state', async () => {
    mockState.searchParams = new URLSearchParams('search=timeout&traceId=trace-123&severityText=ERROR&severityNumber=17&listPageSize=50&listPageIndex=2');
    const originalList = mockState.renderData.list;
    const pagedList = { ...originalList, totalElements: 130, pageIndex: 2, pageSize: 50 };
    mockState.renderData.list = pagedList;
    apiMessageGet
      .mockResolvedValueOnce(mockState.renderData.overview)
      .mockResolvedValueOnce(pagedList)
      .mockResolvedValueOnce(mockState.renderData.trend)
      .mockResolvedValueOnce(mockState.renderData.coverage);
    try {
      const html = renderLogManagePage();
      await mockState.lastLoad?.();

      expect(html).toContain('data-cache-key="log-manage|list|');
      expect(html).toContain('/logs/stats/overview?search=timeout&amp;traceId=trace-123&amp;severityText=ERROR&amp;severityNumber=17');
      expect(html).toContain('/logs/list?pageIndex=2&amp;pageSize=50&amp;search=timeout&amp;traceId=trace-123&amp;severityText=ERROR&amp;severityNumber=17');
      expect(html).toContain('/logs/stats/trend?search=timeout&amp;traceId=trace-123&amp;severityText=ERROR&amp;severityNumber=17');
      expect(html).toContain('/logs/stats/trace-coverage?search=timeout&amp;traceId=trace-123&amp;severityText=ERROR&amp;severityNumber=17');
      expect(html).toContain('data-log-manage-list-pagination="shared-pagination-bar"');
      expect(html).toContain('data-log-manage-list-pagination-owner="hertzbeat-ui-pagination-bar"');
      expect(html).toContain('data-log-manage-list-page-size="50"');
      expect(html).toContain('data-log-manage-list-page-index="2"');
      expect(html).toContain('data-log-manage-list-total-elements="130"');
      expect(html).toContain('data-cache-settled-ttl="10000"');
      expect(apiMessageGet.mock.calls.map(([url]) => url)).toEqual([
        '/logs/stats/overview?search=timeout&traceId=trace-123&severityText=ERROR&severityNumber=17',
        '/logs/list?pageIndex=2&pageSize=50&search=timeout&traceId=trace-123&severityText=ERROR&severityNumber=17',
        '/logs/stats/trend?search=timeout&traceId=trace-123&severityText=ERROR&severityNumber=17',
        '/logs/stats/trace-coverage?search=timeout&traceId=trace-123&severityText=ERROR&severityNumber=17'
      ]);
      expect(apiMessageGet.mock.calls.every(([, init]) => init?.signal instanceof AbortSignal)).toBe(true);
    } finally {
      mockState.renderData.list = originalList;
    }
  });

  it('loads and renders log group-by stats when the query has a group field', async () => {
    mockState.searchParams = new URLSearchParams('view=list&search=timeout&groupBy=resource:service.version&groupLimit=7&groupOrder=count-asc&groupMinCount=5');
    const originalGroup = mockState.renderData.group;
    mockState.renderData.group = {
      groupBy: 'resource:service.version',
      groups: [{ value: '1.2.3', count: 7 }]
    };
    apiMessageGet
      .mockResolvedValueOnce(mockState.renderData.overview)
      .mockResolvedValueOnce(mockState.renderData.list)
      .mockResolvedValueOnce(mockState.renderData.trend)
      .mockResolvedValueOnce(mockState.renderData.coverage)
      .mockResolvedValueOnce(mockState.renderData.group);

    try {
      const html = renderLogManagePage();
      await mockState.lastLoad?.();

      expect(html).toContain('data-log-manage-group-panel="hertzbeat-ui-log-group-panel"');
      expect(html).toContain('data-log-manage-group-by="resource:service.version"');
      expect(html).toContain('data-log-manage-group-limit-input="true"');
      expect(html).toContain('data-log-manage-group-limit-input-owner="hertzbeat-ui-input"');
      expect(html).toContain('data-log-manage-group-order-select="true"');
      expect(html).toContain('data-log-manage-group-order-select-owner="hertzbeat-ui-select"');
      expect(html).toContain('data-log-manage-group-min-count-input="true"');
      expect(html).toContain('data-log-manage-group-min-count-input-owner="hertzbeat-ui-input"');
      expect(html).toContain('data-log-manage-group-result="1.2.3"');
      expect(apiMessageGet.mock.calls.map(([url]) => url)).toContain(
        '/logs/stats/group-by?search=timeout&groupBy=resource%3Aservice.version&limit=7&orderBy=count-asc&minCount=5'
      );
    } finally {
      mockState.renderData.group = originalGroup;
    }
  });

  it('returns an explicit degraded empty state when the log list API blocks the initial route load', async () => {
    mockState.searchParams = new URLSearchParams('view=list');
    apiMessageGet
      .mockResolvedValueOnce(mockState.renderData.overview)
      .mockRejectedValueOnce(new Error('Log API request timed out after 20000ms'))
      .mockResolvedValueOnce(mockState.renderData.trend)
      .mockResolvedValueOnce(mockState.renderData.coverage);
    renderLogManagePage();
    const result = await mockState.lastLoad?.() as any;

    expect(result.loadStatus).toEqual({
      state: 'degraded',
      message: 'Log API request timed out after 20000ms'
    });
    expect(result.list.content).toEqual([]);
    expect(result.overview.totalLogs).toBe(0);
    expect(result.trend.hourlyStats).toEqual({});
    expect(result.coverage.traceCoverage.withTrace).toBe(0);
  });

  it('keeps live log rows when non-list summary endpoints degrade', async () => {
    mockState.searchParams = new URLSearchParams('view=list&traceId=trace-123&serviceName=checkout');
    apiMessageGet
      .mockRejectedValueOnce(new Error('Log overview request timed out after 12000ms'))
      .mockResolvedValueOnce(mockState.renderData.list)
      .mockResolvedValueOnce(mockState.renderData.trend)
      .mockResolvedValueOnce(mockState.renderData.coverage);
    renderLogManagePage();
    const result = await mockState.lastLoad?.() as any;

    expect(result.loadStatus).toEqual({
      state: 'degraded',
      message: 'Log overview request timed out after 12000ms'
    });
    expect(result.list.content).toEqual(mockState.renderData.list.content);
    expect(result.list.totalElements).toBe(mockState.renderData.list.totalElements);
    expect(result.trend.hourlyStats).toEqual(mockState.renderData.trend.hourlyStats);
    expect(result.coverage.traceCoverage.withTrace).toBe(mockState.renderData.coverage.traceCoverage.withTrace);
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
