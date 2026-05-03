import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTranslatorMock } from '../../../test/i18n-test-helper';

const apiMessageGet = vi.fn();

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
  ClientWorkbench: ({ children, load }: { children: (data: any) => React.ReactNode; load: () => Promise<unknown> }) => {
    mockState.lastLoad = load;
    return (
      <div data-client-workbench="true">
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
  stripReturnLabelFromHref: (href?: string | null) => {
    if (!href) return undefined;
    const [path, query = ''] = href.split('?');
    const params = new URLSearchParams(query);
    params.delete('returnLabel');
    const queryString = params.toString();
    return queryString ? `${path}?${queryString}` : path;
  },
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
      meta: routeContext?.entityId ? '可打开实体详情' : '缺少实体 ID，实体详情会保持禁用'
    },
    {
      key: 'hertzbeat.collector',
      label: 'hertzbeat.collector',
      value: routeContext?.collector || 'collector-local',
      state: 'present',
      meta: '采集器来源'
    },
    {
      key: 'hertzbeat.template',
      label: 'hertzbeat.template',
      value: routeContext?.template || 'hertzbeat-self',
      state: 'present',
      meta: '监控模板归属'
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

    const { default: TraceManagePage } = await import('./page');
    const html = renderToStaticMarkup(<TraceManagePage />);
    await mockState.lastLoad?.();

    expect(html).toContain('data-trace-manage-route="otlp-cold-trace-workbench"');
    expect(html).toContain('data-trace-manage-style-baseline="hertzbeat-cold-matte"');
    expect(html).toContain('data-trace-manage-query-bar="cold-query-row"');
    expect(html).toContain('data-trace-manage-chart-band="cold-chart-band"');
    expect(html).toContain('data-trace-manage-trace-table="cold-dense-trace-list"');
    expect(html).toContain('data-trace-manage-detail-panel="cold-detail-panel"');
    expect(html).toContain('data-trace-manage-entity-context="hertzbeat-signal-entity-context"');
    expect(html).not.toContain('data-trace-manage-hertzbeat-loop="collector-template-alert-loop"');
    expect(html).toContain('链路工作台');
    expect(html).toContain('服务名称');
    expect(html).toContain('错误链路');
    expect(html).toContain('趋势带');
    expect(html).toContain('最近链路');
    expect(html).toContain('运行查询');
    expect(html).toContain('按服务、链路 ID、跨度 ID 和错误状态筛选链路，直接查看趋势、列表和详情。');
    expect(html).not.toContain('高密度工作面');
    expect(html).not.toContain('HertzBeat 采集闭环');
    expect(html).not.toContain('告警闭环');
    expect(html).not.toContain('接入质量');
    expect(html).not.toContain('链路查询继续保留接入质量、采集节点、模板归属和告警闭环上下文。');
    expect(html).toContain('/ingestion/otlp?signal=traces');
    expect(html).toContain('POST /checkout');
    expect(html).toContain('checkout');
    expect(html).toContain('ERROR');
    expect(html).toContain('实体上下文');
    expect(html).toContain('data-trace-manage-attribution-diagnostics="hertzbeat-attribute-diagnostics"');
    expect(html).toContain('归因诊断');
    expect(html).toContain('hertzbeat.entity_id');
    expect(html).toContain('缺少实体 ID，实体详情会保持禁用');
    expect(html).toContain('当前实体');
    expect(html).toContain('采集来源');
    expect(html).toContain('实体详情');
    expect(html).toContain('告警处理');
    expect(html).toContain('data-trace-manage-signal-handoff-hint="trace-log-metric-context"');
    expect(html).toContain('当前链路的 traceId、spanId 和服务上下文会带入日志与指标工作台');
    expect(html).toContain('data-trace-manage-selected-evidence="selected-trace-evidence"');
    expect(html).toContain('链路证据');
    expect(html).toContain('链路状态');
    expect(html).toContain('开始时间');
    expect(html).toContain('最近上报');
    expect(html).not.toContain('告警规则');
    expect(html).not.toContain('保存视图');
    expect(html).not.toContain('创建告警');
    expect(html).not.toContain('加入仪表盘');
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
  }, 15000);

  it('renders stable trace query selectors for browser retirement smoke', async () => {
    mockState.searchParams = new URLSearchParams('traceId=trace-123&serviceName=checkout&errorOnly=true');

    const { default: TraceManagePage } = await import('./page');
    const html = renderToStaticMarkup(<TraceManagePage />);

    expect(html).toContain('data-trace-manage-trace-id-input="true"');
    expect(html).toContain('data-trace-manage-service-input="true"');
    expect(html).toContain('data-trace-manage-status-filter="true"');
    expect(html).toContain('data-trace-manage-reset-action="true"');
    expect(html).toContain('data-trace-manage-search-action="true"');
    expect(html).toContain('data-trace-manage-open-logs-action="true"');
    expect(html).toContain('data-trace-manage-query-bar="cold-query-row"');
    expect(html).toContain('data-trace-manage-chart-band="cold-chart-band"');
    expect(html).toContain('data-trace-manage-trace-table="cold-dense-trace-list"');
    expect(html).toContain('data-trace-manage-detail-panel="cold-detail-panel"');
  });

  it('uses the shared narrow time rail in the top-right trace header with inherited route state visible', async () => {
    mockState.searchParams = new URLSearchParams(
      'traceId=trace-123&serviceName=checkout&timeRange=last-1h&start=1713200000000&end=1713203600000&refresh=30&live=false&tz=Asia%2FShanghai'
    );
    const source = readFileSync(resolve(process.cwd(), 'app/trace/manage/page.tsx'), 'utf8');

    const { default: TraceManagePage } = await import('./page');
    const html = renderToStaticMarkup(<TraceManagePage />);

    expect(source).toContain("import { buildTimeRangeControlLabels, TimeRangeControl } from '@/components/observability/time-range-control';");
    expect(source).toContain('labels={buildTimeRangeControlLabels(t)}');
    expect(source).toContain('buildTraceManageRoute(searchParams, query, appliedContext)');
    expect(source).toContain('const traceTimeRefreshKey = useMemo(');
    expect(source).toContain('traceTimeContext.timeRange');
    expect(source).toContain('traceTimeContext.refresh');
    expect(source).toContain('traceTimeContext.live');
    expect(source).toContain('traceTimeContext.tz');
    expect(source).toContain('`trace-manage:${traceUrls.listUrl}|${traceUrls.overviewUrl}|${traceTimeRefreshKey}`');
    expect(source).toContain('data-trace-manage-time-toolbar="top-right-corner"');
    expect(source).toContain('data-trace-manage-time-control="shared-time-context-control"');
    expect(source).toContain('data-trace-manage-time-control-placement="top-right"');
    expect(source).toContain('data-trace-manage-time-control-visual="narrow-top-right-rail"');
    expect(source).toContain('data-trace-manage-time-control-fit="no-clipping"');
    expect(source).toContain('variant="narrow-rail"');
    expect(source).toContain('showAbsoluteFields');
    expect(source).not.toContain('data-trace-manage-time-control="shared-time-context-control" className="min-w-[520px] flex-1"');
    expect(source.indexOf('data-trace-manage-time-control="shared-time-context-control"')).toBeLessThan(
      source.indexOf('data-trace-manage-query-bar="cold-query-row"')
    );
    expect(html).toContain('data-trace-manage-time-toolbar="top-right-corner"');
    expect(html).toContain('data-trace-manage-time-control="shared-time-context-control"');
    expect(html).toContain('data-trace-manage-time-control-placement="top-right"');
    expect(html).toContain('data-trace-manage-time-control-visual="narrow-top-right-rail"');
    expect(html).toContain('data-trace-manage-time-control-fit="no-clipping"');
    expect(html).toContain('data-time-range-control="hertzbeat-shared"');
    expect(html).toContain('data-time-range-control-visual="grafana-like-narrow-rail"');
    expect(html).toContain('data-time-range-control-layout="nowrap-top-right-rail"');
    expect(html).toContain('data-time-range-control-overflow="fit-without-scroll"');
    expect(html).toContain('data-time-range-live-toggle="paused"');
    expect(html).toContain('data-trace-manage-time-refresh-action="true"');
    expect(html).toContain('value="last-1h"');
  }, 15000);

  it('keeps the entity return action and cross-signal handoffs aligned for traced entity context', async () => {
    mockState.searchParams = new URLSearchParams(
      'entityId=7&entityName=checkout&returnTo=%2Foverview&returnLabel=Overview&traceId=trace-123&spanId=span-456&serviceName=checkout&serviceNamespace=payments&environment=prod&start=1713200000000&end=1713203600000'
    );

    const { default: TraceManagePage } = await import('./page');
    const html = renderToStaticMarkup(<TraceManagePage />);

    expect(html).toContain('href="/overview"');
    expect(html).toContain('返回来源');
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
    const source = readFileSync(resolve(process.cwd(), 'app/trace/manage/page.tsx'), 'utf8');

    expect(source).not.toContain('ThreeSignalDeskShell');
    expect(source).not.toContain('FactsStrip');
    expect(source).not.toContain('StageSection');
    expect(source).not.toContain('DataTable');
    expect(source).not.toContain('DrawerSection');
    expect(source).not.toContain('signoz-');
    expect(source).not.toContain('data-trace-manage-floating-actions');
    expect(source).not.toContain('保存视图');
    expect(source).not.toContain('创建告警');
    expect(source).not.toContain('加入仪表盘');
    expect(source).toContain('data-trace-manage-entity-context="hertzbeat-signal-entity-context"');
    expect(source).toContain('buildTraceAttributionDiagnostics(null, null, routeContext, t)');
    expect(source).toContain('buildTraceAttributionDiagnostics(detail, selectedSpan, handoffRouteContext, t)');
    expect(source).toContain('data-trace-manage-attribution-diagnostics="hertzbeat-attribute-diagnostics"');
    expect(source).toContain('data-trace-manage-attribution-diagnostic-state={row.state}');
    expect(source).toContain('归因诊断');
    expect(source).toContain('hertzbeat.entity_id');
    expect(source).toContain('实体上下文');
    expect(source).toContain('aria-label="实体上下文 当前实体 监控实例 当前服务 链路上下文 当前环境 时间范围 采集来源"');
    expect(source).not.toContain('data-trace-manage-hertzbeat-loop="collector-template-alert-loop"');
    expect(source).not.toContain('HertzBeat 采集闭环');
    expect(source).not.toContain('接入质量');
    expect(source).not.toContain('链路查询继续保留接入质量、采集节点、模板归属和告警闭环上下文。');
    expect(source).toContain('采集集群');
    expect(source).toContain('监控模板');
    expect(source).toContain('采集来源');
    expect(source).toContain('实体详情');
    expect(source).toContain('告警处理');
    expect(source).toContain('href={handoffLinks.alertHandlingHref}');
    expect(source).toContain('data-trace-manage-alert-context-hint="entity-trace-alert-handoff"');
    expect(source).toContain('按当前实体、服务和已带入的链路上下文查看相关告警');
    expect(source).toContain('data-trace-manage-empty-guidance="operator-no-data-guidance"');
    expect(source).toContain('确认时间范围、实体归因、采集器和监控模板后再查看链路。');
    expect(source).not.toContain('运行查询后会在这里展示最近链路。');
    expect(source).not.toContain('告警规则');
    expect(source).toContain('data-trace-manage-route="otlp-cold-trace-workbench"');
  });

  it('opens trace details in a side waterfall modal instead of the inline route-level demo span band', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/trace/manage/page.tsx'), 'utf8');

    expect(source).toContain('TraceWaterfallDrawer');
    expect(source).toContain('loadTraceDetailBundle');
    expect(source).toContain('openTraceDetailDrawer');
    expect(source).toContain('data-trace-manage-open-detail-action="side-waterfall-modal"');
    expect(source).toContain('data-trace-manage-detail-drawer="waterfall-side-modal"');
    expect(source).toContain('ObservabilityWaterfall');
    expect(source).toContain('autoOpenedTraceDetailKeyRef');
    expect(source).toContain('requestedTraceId');
    expect(source).toContain('const traceEventCount = waterfallRows.reduce');
    expect(source).toContain("['事件', String(traceEventCount)]");
    expect(source).toContain('title: `关联 · ${row.title}`');
    expect(source).toContain('data-trace-manage-event-detail-copy="span-event-not-span"');
    expect(source).toContain('不是新的跨度，是当前跨度上的时间点');
    expect(source).toContain('个跨度');
    expect(source).not.toContain('个 Span');
    expect(source).not.toContain("['事件', String((selectedSpan?.events || []).length)]");
    expect(source).not.toContain('Link ·');
    expect(source).not.toContain('<Button type="button" variant="subtle" onClick={onClose}>');
    expect(source).not.toContain('data-trace-manage-span-band="cold-span-band"');
    expect(source).not.toContain("tone: 'bg-[#4566e8]'");
    expect(source).not.toContain("tone: 'bg-[#6b85d7]'");
  });

  it('keeps missing-id trace handoffs visible but disabled with i18n hover guidance', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/trace/manage/page.tsx'), 'utf8');
    const messages = readFileSync(resolve(process.cwd(), 'lib/i18n-runtime-messages.ts'), 'utf8');

    expect(source).toContain("const missingTraceHandoffTitle = t('trace.manage.handoff.logs-disabled')");
    expect(source).toContain("const missingEntityHandoffTitle = t('trace.manage.handoff.entity-disabled')");
    expect(source).toContain('data-trace-manage-open-logs-action-disabled="missing-trace-id"');
    expect(source).toContain('data-trace-manage-entity-action-disabled="missing-entity-id"');
    expect(source).toContain("const canOpenEntity = handoffLinks.entityHref.startsWith('/entities/');");
    expect(source).toContain('title={missingTraceHandoffTitle}');
    expect(source).toContain('title={missingEntityHandoffTitle}');
    expect(messages).toContain("'trace.manage.handoff.logs-disabled'");
    expect(messages).toContain("'trace.manage.handoff.entity-disabled'");
  });

  it('keeps route-level actions on the cold-matte palette instead of bright blue demo buttons', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/trace/manage/page.tsx'), 'utf8');

    expect(source).toContain('data-trace-manage-search-action="true"');
    expect(source).not.toContain('border-[#4f6df0]');
    expect(source).not.toContain('bg-[#4566e8]');
    expect(source).not.toContain('hover:bg-[#5574f4]');
  });
});
