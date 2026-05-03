// @vitest-environment jsdom

import React, { act } from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTranslatorMock } from '../../../test/i18n-test-helper';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const apiMessageGet = vi.fn();

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
    t: createTranslatorMock()
  })
}));

vi.mock('@/components/workbench/client-workbench', () => ({
  ClientWorkbench: ({ children, load }: { children: (data: any) => React.ReactNode; load: () => Promise<unknown> }) => {
    mockState.lastLoad = load;
    return <div data-client-workbench="true">{children(mockState.renderData)}</div>;
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
  buildSignalEntityContextRows: () => [
    { label: '当前实体', value: 'checkout', meta: 'entityId 7' },
    { label: '当前服务', value: 'checkout', meta: 'payments' },
    { label: '当前环境', value: 'prod', meta: '环境' },
    { label: '时间范围', value: 'last-1h', meta: '查询窗口' },
    { label: '采集来源', value: 'OTLP', meta: 'HertzBeat OTLP 接入' }
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

vi.mock('@/lib/log-manage/view-model', () => ({
  buildSelectedLogFacts: (entry: any) =>
    entry
      ? [
          { label: '严重级别', value: entry.severityText || 'LOG' },
          { label: '链路 ID', value: entry.traceId || '-', monospace: true }
        ]
      : [],
  buildLogAttributionDiagnostics: (entry: any) =>
    entry
      ? [
          {
            key: 'hertzbeat.entity_id',
            label: 'hertzbeat.entity_id',
            value: entry.resource?.['hertzbeat.entity_id'] || '-',
            state: entry.resource?.['hertzbeat.entity_id'] ? 'present' : 'missing',
            meta: entry.resource?.['hertzbeat.entity_id'] ? '可打开实体详情' : '缺少实体 ID，实体详情会保持禁用'
          },
          {
            key: 'hertzbeat.collector',
            label: 'hertzbeat.collector',
            value: entry.resource?.['hertzbeat.collector'] || '-',
            state: entry.resource?.['hertzbeat.collector'] ? 'present' : 'missing',
            meta: '采集器来源'
          },
          {
            key: 'hertzbeat.template',
            label: 'hertzbeat.template',
            value: entry.resource?.['hertzbeat.template'] || '-',
            state: entry.resource?.['hertzbeat.template'] ? 'present' : 'missing',
            meta: '监控模板归属'
          }
        ]
      : [],
  buildSelectedLogRows: (entry: any) =>
    entry
      ? [
          { title: 'checkout', copy: String(entry.body), meta: entry.traceId },
          { title: '资源', copy: '1', meta: 'attributes 1' }
        ]
      : [],
  buildLogCodeNavigationUrl: () => undefined,
  buildLogExplorerRows: (entries: any[]) =>
    entries.map(entry => ({
      key: entry.traceId || entry.body,
      timestamp: '2026-04-16 22:00:00',
      message: String(entry.body),
      service: entry.resource?.['service.name'] || '-',
      severity: entry.severityText || 'LOG',
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
  buildLogManageRoute: (_searchParams: any, query: any) => {
    const params = new URLSearchParams();
    if (query.search) params.set('search', query.search);
    if (query.traceId) params.set('traceId', query.traceId);
    if (query.spanId) params.set('spanId', query.spanId);
    const view = _searchParams.get('view');
    if (view) params.set('view', view);
    params.set('source', _searchParams.get('source') || 'otlp');
    return params.toString() ? `/log/manage?${params.toString()}` : '/log/manage';
  },
  buildResetLogManageRoute: () => '/log/manage'
}));

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

    expect(source).toContain('data-log-manage-route="otlp-cold-log-workbench"');
    expect(source).toContain('data-log-manage-style-baseline="hertzbeat-cold-matte"');
    expect(source).toContain('data-log-manage-query-bar="cold-query-row"');
    expect(source).toContain('data-log-manage-chart-band="cold-chart-band"');
    expect(source).toContain('data-log-manage-log-list="cold-dense-log-list"');
    expect(source).toContain('data-log-manage-detail-panel="cold-detail-panel"');
    expect(source).not.toContain('data-log-manage-hertzbeat-loop="collector-template-alert-loop"');
    expect(source).toContain('data-log-manage-entity-context="hertzbeat-signal-entity-context"');
    expect(source).toContain('aria-label="实体上下文 当前实体 监控实例 当前服务 链路上下文 当前环境 时间范围 采集来源"');
    expect(source).not.toContain('data-log-manage-intake-quality="logs-collector-quality"');
    expect(source).not.toContain('data-log-manage-intake-quality-row={row.key}');
    expect(source).not.toContain('buildLogIntakeQualityRows');
    expect(source).toContain('data-log-manage-view-switch="stream-history"');
    expect(source).toContain('data-log-manage-stream-stage="hertzbeat-live-log-stream"');
    expect(source).toContain('data-log-manage-reconnect-action="true"');
    expect(source).toContain('data-log-manage-row-detail-action="true"');
    expect(source).toContain('data-log-manage-row-trace-detail-action="true"');
    expect(source).toContain('LogStreamDetailDialog');
    expect(source).toContain('buildLogAttributionDiagnostics(detailLog, t)');
    expect(source).toContain('attributionDiagnostics={detailAttributionDiagnostics}');
    expect(source).toContain('实体上下文');
    expect(source).not.toContain('HertzBeat 采集闭环');
    expect(source).not.toContain('告警闭环');
    expect(source).not.toContain('日志排查可返回接入总览、采集集群、监控模板和告警处理上下文。');
    expect(source).toContain('采集集群');
    expect(source).toContain('监控模板');
    expect(source).toContain('采集来源');
    expect(source).toContain('实体详情');
    expect(source).toContain('告警处理');
    expect(source).toContain('href={handoffLinks.alertHandlingHref}');
    expect(source).toContain('data-log-manage-alert-context-hint="entity-trace-alert-handoff"');
    expect(source).toContain('按当前实体、服务和已带入的链路上下文查看相关告警');
    expect(source).not.toContain('告警规则');
    expect(source).not.toContain('signoz-');
    expect(source).not.toContain('data-log-manage-floating-actions');
    expect(source).not.toContain('Run Query');
    expect(source).not.toContain('Save this view');
    expect(source).not.toContain('Create an Alert');
    expect(source).not.toContain('Add to Dashboard');
    expect(source).not.toContain('Logs Workbench');
    expect(source).not.toContain("returnLabel: '日志工作台'");
    expect(source).not.toContain("returnLabel: '链路工作台'");
    expect(source).not.toContain('保存视图');
    expect(source).not.toContain('创建告警');
    expect(source).not.toContain('加入仪表盘');
    expect(source).not.toContain('ThreeSignalDeskShell');
    expect(source).not.toContain('FactsStrip');
    expect(source).not.toContain('StageSection');
    expect(source).not.toContain('SummaryMetricGrid');
    expect(source).not.toContain('DrawerSection');
    expect(source).not.toContain('VirtualList');
    expect(source).not.toContain('DataTable');
  });

  it('keeps log route-level actions on the cold-matte palette instead of bright blue demo buttons', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/log/manage/log-manage-page.tsx'), 'utf8');

    expect(source).toContain('data-log-manage-run-query-action="true"');
    expect(source).not.toContain('border-[#4f6df0]');
    expect(source).not.toContain('bg-[#4566e8]');
    expect(source).not.toContain('hover:bg-[#5574f4]');
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
    expect(source).toContain("openLogDetails(entry, 'history');");
    expect(source).toContain('data-log-related-trace-open-workspace-action="true"');
    expect(source).toContain('data-log-manage-results-open-trace-action="true"');
    expect(source).toContain('查看完整链路');
    expect(source).not.toContain('data-log-manage-row-trace-link="context-preserved"');
    expect(source).not.toContain('data-log-manage-row-trace-preview-action="true"');
    expect(source).not.toContain('href={row.traceId !== \'-\' ? rowHandoffLinks.traceHref : \'/trace/manage\'}');
  });

  it('keeps the log related-trace drawer language in HertzBeat operations wording', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/log/manage/log-manage-page.tsx'), 'utf8');

    expect(source).toContain('buildSelectedSpanFacts');
    expect(source).toContain('`${relatedTraceRows.length} 个跨度`');
    expect(source).toContain("badges={relatedTraceDetail ? ['链路预览'] : []}");
    expect(source).toContain("label: '关联'");
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
      const { default: LogManagePage } = await import('./page');
      const html = renderToStaticMarkup(<LogManagePage />);

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
  }, 15000);

  it('renders the in-place log stream when the Angular stream view is requested', async () => {
    mockState.searchParams = new URLSearchParams('view=stream&traceId=trace-123&spanId=span-456&severityText=ERROR');

    const { default: LogManagePage } = await import('./page');
    const html = renderToStaticMarkup(<LogManagePage />);

    expect(html).toContain('data-log-manage-view-switch="stream-history"');
    expect(html).toContain('data-log-manage-stream-stage="hertzbeat-live-log-stream"');
    expect(html).toContain('data-log-manage-reconnect-action="true"');
    expect(html).toContain('data-log-manage-stream-row="true"');
    expect(html).toContain('checkout timeout');
    expect(html).not.toContain('data-log-manage-stream-empty-state="true"');
    expect(html).toContain('日志流');
    expect(html).toContain('历史检索');
    expect(html).toContain('实时日志流');
    expect(html).toContain('应用到日志流');
    expect(html).toContain('选中日志');
    expect(html).not.toContain('完整 JSON');
    expect(html).not.toContain('运行查询');
    expect(html).not.toContain('/api/logs/sse/subscribe');
    expect(html).not.toContain('data-log-manage-log-list="cold-dense-log-list"');
  });

  it('keeps live stream rows keyed by a monotonic sequence without surfacing normal retention as backpressure', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/log/manage/log-manage-page.tsx'), 'utf8');

    expect(source).toContain('streamSequenceRef');
    expect(source).toContain('buildStreamItemKey(entry, sequence)');
    expect(source).not.toContain('buildLogEntryKey(entry, nextIndex)');
    expect(source).not.toContain('无法进入前端缓冲区');
    expect(source).not.toContain('日志流过快');
  });

  it('keeps no-log empty guidance operator-facing instead of generic storage copy', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/log/manage/log-manage-page.tsx'), 'utf8');

    expect(source).toContain('data-log-manage-empty-guidance="operator-no-data-guidance"');
    expect(source).toContain('确认时间范围、实体归因、采集器和监控模板后再查看日志。');
    expect(source).not.toContain('日志写入后会在这里按时间倒序展示。');
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
    expect(source).toContain('const { listUrl, overviewUrl, trendUrl, coverageUrl } = buildLogUrls(query, routeContext);');
    expect(source).toContain('resolveStreamWindow');
    expect(source).toContain('readStreamViewportState');
    expect(source).toContain('STREAM_VIEWPORT_ROW_HEIGHT');
    expect(source).toContain('anchorIndex: streamViewport.isPinnedToLatest ? null : selectedStreamIndex');
    expect(source).toContain('data-log-manage-stream-viewport="virtualized-log-stream"');
    expect(source).toContain('data-log-manage-stream-window');
    expect(source).toContain('data-log-manage-stream-row-style="compact-live-row"');
    expect(source).toContain('visibleStreamItems.map');
    expect(source).not.toContain('日志流过快');
    expect(source).not.toContain('前端已隐藏');
    expect(source).not.toContain('shouldShowStreamBackpressureNotice');
    expect(source).not.toContain('streamItems.map(item =>');
  });

  it('syncs inherited live=false into a visible paused stream state before opening EventSource', async () => {
    mockState.searchParams = new URLSearchParams(
      'view=stream&timeRange=last-1h&start=1713200000000&end=1713203600000&refresh=30&live=false&tz=Asia%2FShanghai&serviceName=checkout'
    );
    const source = readFileSync(resolve(process.cwd(), 'app/log/manage/log-manage-page.tsx'), 'utf8');

    const { default: LogManagePage } = await import('./page');
    const html = renderToStaticMarkup(<LogManagePage />);

    expect(source).toContain("useEffect(() => {\n    setIsStreamPaused(routeContext.live === 'false');\n  }, [routeContext.live]);");
    expect(source).toContain("if (isStreamPaused) {\n      setStreamStatus('disconnected');\n      return undefined;\n    }");
    expect(source).toContain("data-log-manage-stream-live-state={isStreamPaused ? 'paused' : 'live'}");
    expect(html).toContain('data-log-manage-stream-stage="hertzbeat-live-log-stream"');
    expect(html).toContain('data-log-manage-stream-live-state="paused"');
    expect(html).toContain('已暂停');
    expect(html).toContain('继续');
  }, 15000);

  it('uses the shared narrow time rail in the top-right page header instead of the log query row', async () => {
    mockState.searchParams = new URLSearchParams(
      'view=list&timeRange=last-1h&start=1713200000000&end=1713203600000&refresh=30&live=false&tz=Asia%2FShanghai&serviceName=checkout'
    );
    const source = readFileSync(resolve(process.cwd(), 'app/log/manage/log-manage-page.tsx'), 'utf8');

    const { default: LogManagePage } = await import('./page');
    const html = renderToStaticMarkup(<LogManagePage />);

    expect(source).toContain("import { buildTimeRangeControlLabels, TimeRangeControl } from '@/components/observability/time-range-control';");
    expect(source).toContain('labels={buildTimeRangeControlLabels(t)}');
    expect(source).toContain("live: routeContext.live || 'true'");
    expect(source).toContain('buildLogManageRoute(searchParams, query, currentView, appliedContext)');
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

    const { default: LogManagePage } = await import('./page');
    const html = renderToStaticMarkup(<LogManagePage />);

    expect(html).toContain('data-log-manage-route="otlp-cold-log-workbench"');
    expect(html).toContain('data-log-manage-style-baseline="hertzbeat-cold-matte"');
    expect(html).toContain('data-log-manage-query-bar="cold-query-row"');
    expect(html).toContain('data-log-manage-chart-band="cold-chart-band"');
    expect(html).toContain('data-log-manage-log-list="cold-dense-log-list"');
    expect(html).toContain('data-log-manage-detail-panel="cold-detail-panel"');
    expect(html).toContain('data-log-manage-row-detail-action="true"');
    expect(html).toContain('查看日志');
    expect(html).toContain('data-log-manage-selected-evidence="selected-log-evidence"');
    expect(html).toContain('日志证据');
    expect(html).toContain('日志时间');
    expect(html).toContain('日志级别');
    expect(html).toContain('正文摘要');
    expect(html).toContain('最近上报');
    expect(html).not.toContain('data-log-manage-hertzbeat-loop="collector-template-alert-loop"');
    expect(html).toContain('data-log-manage-entity-context="hertzbeat-signal-entity-context"');
    expect(html).not.toContain('data-log-manage-intake-quality="logs-collector-quality"');
    expect(html).not.toContain('data-log-manage-intake-quality-row=');
    expect(html).toContain('data-log-manage-row-trace-detail-action="true"');
    expect(html).toContain('日志工作台');
    expect(html).toContain('围绕采集来源、实体、链路和告警处理筛选日志');
    expect(html).not.toContain('日志排查可返回接入总览、采集集群、监控模板和告警处理上下文。');
    expect(html).not.toContain('保留查询、趋势、列表和详情在一个高密度工作面中');
    expect(html).not.toContain('日志查询继续保留');
    expect(html).toContain('运行查询');
    expect(html).toContain('严重级别');
    expect(html).toContain('趋势带');
    expect(html).toContain('最近日志');
    expect(html).not.toContain('HertzBeat 采集闭环');
    expect(html).not.toContain('告警闭环');
    expect(html).not.toContain('接入质量');
    expect(html).not.toContain('日志采集质量');
    expect(html).not.toContain('接收量');
    expect(html).not.toContain('解析失败');
    expect(html).not.toContain('实体归并失败');
    expect(html).not.toContain('Collector 节点');
    expect(html).toContain('/ingestion/otlp?signal=logs');
    expect(html).toContain('实体上下文');
    expect(html).toContain('当前实体');
    expect(html).toContain('采集来源');
    expect(html).toContain('实体详情');
    expect(html).toContain('告警处理');
    expect(html).toContain('data-log-manage-signal-handoff-hint="log-trace-metric-context"');
    expect(html).toContain('当前日志的链路、跨度和服务上下文会带入链路与指标工作台');
    expect(html).not.toContain('告警规则');
    expect(html).not.toContain('保存视图');
    expect(html).not.toContain('创建告警');
    expect(html).not.toContain('加入仪表盘');
    expect(html).toContain('checkout timeout');
    expect(html).toContain('checkout');
    expect(html).toContain('查看链路');
    expect(html).toContain('查看指标');
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
      const { default: LogManagePage } = await import('./page');
      const html = renderToStaticMarkup(<LogManagePage />);

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

    const { default: LogManagePage } = await import('./page');
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      interactionRoot?.render(<LogManagePage />);
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

    const { default: LogManagePage } = await import('./page');
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      interactionRoot?.render(<LogManagePage />);
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
      const { default: LogManagePage } = await import('./page');
      interactionContainer = document.createElement('div');
      document.body.appendChild(interactionContainer);
      interactionRoot = createRoot(interactionContainer);

      await act(async () => {
        interactionRoot?.render(<LogManagePage />);
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
      expect(detailDialog?.textContent).toContain('归因诊断');
      expect(detailDialog?.textContent).toContain('hertzbeat.entity_id');
      expect(detailDialog?.textContent).toContain('缺少实体 ID，实体详情会保持禁用');
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
      const { default: LogManagePage } = await import('./page');
      const html = renderToStaticMarkup(<LogManagePage />);

      expect(html).toContain('data-log-manage-selected-attribution-diagnostics="hertzbeat-attribute-diagnostics"');
      expect(html).toContain('归因诊断');
      expect(html).toContain('hertzbeat.entity_id');
      expect(html).toContain('缺少实体 ID，实体详情会保持禁用');
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

    const { default: LogManagePage } = await import('./page');
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      interactionRoot?.render(<LogManagePage />);
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
    expect(relatedTraceDialog?.textContent).toContain('链路预览');
    expect(relatedTraceDialog?.textContent).toContain('2 个跨度');
    expect(relatedTraceDialog?.textContent).toContain('2 个事件');
    expect(relatedTraceDialog?.textContent).toContain('服务与命名空间');
    expect(relatedTraceDialog?.textContent).toContain('暂无链路状态');
    expect(relatedTraceDialog?.textContent).toContain('关联');
    const stageFacts = relatedTraceDialog?.querySelector('[data-log-related-trace-stage-facts="true"]');
    expect(stageFacts?.textContent).toContain('事件');
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

    const { default: LogManagePage } = await import('./page');
    interactionContainer = document.createElement('div');
    document.body.appendChild(interactionContainer);
    interactionRoot = createRoot(interactionContainer);

    await act(async () => {
      interactionRoot?.render(<LogManagePage />);
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

    const { default: LogManagePage } = await import('./page');
    renderToStaticMarkup(<LogManagePage />);
    await mockState.lastLoad?.();

    expect(apiMessageGet.mock.calls).toEqual([
      ['/logs/stats/overview?search=timeout&traceId=trace-123&severityText=ERROR&severityNumber=17'],
      ['/logs/list?pageIndex=0&pageSize=8&search=timeout&traceId=trace-123&severityText=ERROR&severityNumber=17'],
      ['/logs/stats/trend?search=timeout&traceId=trace-123&severityText=ERROR&severityNumber=17'],
      ['/logs/stats/trace-coverage?search=timeout&traceId=trace-123&severityText=ERROR&severityNumber=17']
    ]);
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

    const { default: LogManagePage } = await import('./page');
    renderToStaticMarkup(<LogManagePage />);
    const result = await mockState.lastLoad?.() as any;

    expect(result.overview.totalLogs).toBe(42);
    expect(result.overview.errorLogs).toBe(5);
    expect(result.overview.totalCount).toBe(42);
    expect(result.overview.errorCount).toBe(5);
  });
});
