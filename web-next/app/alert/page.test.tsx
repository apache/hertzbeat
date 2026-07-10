import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTranslatorMock } from '../../test/i18n-test-helper';
import {
  readAlertCenterRouteState,
  type AlertCenterRouteState,
  type AlertCenterSearchParams
} from '../../lib/alert-manage/query-state';

const mockState = vi.hoisted(() => ({
  replace: vi.fn(),
  lastLoad: null as null | (() => Promise<unknown>),
  lastSurfaceProps: null as null | Record<string, any>,
  renderData: {
    summary: {
      total: 3,
      dealNum: 1,
      rate: 33,
      priorityWarningNum: 1,
      priorityCriticalNum: 1,
      priorityEmergencyNum: 0
    },
    groupAlerts: {
      content: [],
      totalElements: 0,
      pageIndex: 0,
      pageSize: 8
    }
  }
}));

const loadAlertCenterDataFromFacade = vi.hoisted(() => vi.fn(async () => mockState.renderData));
const applyAlertClosureOperationFromFacade = vi.hoisted(() => vi.fn(async () => undefined));
const alertFacade = vi.hoisted(() => ({
  summary: vi.fn(async () => undefined),
  groupAlerts: vi.fn(async () => undefined),
  groupStatus: vi.fn(async () => undefined),
  groupClose: vi.fn(async () => undefined)
}));
const entityFacade = vi.hoisted(() => ({
  detail: vi.fn(async () => undefined)
}));
const alertSilenceFacade = vi.hoisted(() => ({
  create: vi.fn(async () => undefined)
}));
const alertInhibitFacade = vi.hoisted(() => ({
  create: vi.fn(async () => undefined)
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mockState.replace
  })
}));

vi.mock('../../components/providers/i18n-provider', () => ({
  useI18n: () => ({
    t: createTranslatorMock()
  })
}));

vi.mock('../../components/workbench/client-workbench', () => ({
  ClientWorkbench: ({
    children,
    load,
    loadingCopy
  }: {
    children: (data: any) => React.ReactNode;
    load: () => Promise<unknown>;
    loadingCopy?: string;
  }) => {
    mockState.lastLoad = load;
    return <div data-client-workbench="true" data-loading-copy={loadingCopy}>{children(mockState.renderData)}</div>;
  }
}));

vi.mock('../../components/pages/alert-center-surface', () => ({
  AlertCenterSurface: (props: any) => {
    mockState.lastSurfaceProps = props;
    return (
      <div
        data-alert-center-surface="otlp-cold-center-console"
        data-alert-center-style-baseline="hertzbeat-ui-matte"
        data-draft={JSON.stringify(props.draft)}
        data-rule-create={typeof props.onRuleQuickCreate}
        data-realtime-event-count={props.realtimeEventCount}
        data-realtime-group-ids={(props.realtimeGroupIds || []).join(',')}
      />
    );
  }
}));

vi.mock('../../lib/api-client', () => ({
  apiMessageDelete: vi.fn(),
  apiMessageGet: vi.fn(),
  apiMessagePost: vi.fn(),
  apiMessagePut: vi.fn()
}));

vi.mock('../../lib/alert-api-facade', () => ({
  api: {
    alerts: alertFacade,
    entities: entityFacade,
    alertSilences: alertSilenceFacade,
    alertInhibits: alertInhibitFacade
  }
}));

vi.mock('../../lib/alert-manage/controller', () => ({
  applyAlertClosureOperationFromFacade,
  loadAlertCenterDataFromFacade
}));

function buildAlertCenterRouteState(searchParams: AlertCenterSearchParams = {}): AlertCenterRouteState {
  return readAlertCenterRouteState(searchParams);
}

async function renderAlertCenterPage(initialRouteState: AlertCenterRouteState = buildAlertCenterRouteState()) {
  const { default: AlertCenterPage } = await import('./alert-center-page');
  return renderToStaticMarkup(<AlertCenterPage initialRouteState={initialRouteState} />);
}

describe('alert center page', () => {
  beforeEach(() => {
    mockState.replace.mockClear();
    mockState.lastLoad = null;
    mockState.lastSurfaceProps = null;
    loadAlertCenterDataFromFacade.mockClear().mockResolvedValue(mockState.renderData);
    applyAlertClosureOperationFromFacade.mockClear().mockResolvedValue(undefined);
    alertFacade.summary.mockClear().mockResolvedValue(undefined);
    alertFacade.groupAlerts.mockClear().mockResolvedValue(undefined);
    alertFacade.groupStatus.mockClear().mockResolvedValue(undefined);
    alertFacade.groupClose.mockClear().mockResolvedValue(undefined);
    entityFacade.detail.mockClear().mockResolvedValue(undefined);
    alertSilenceFacade.create.mockClear().mockResolvedValue(undefined);
    alertInhibitFacade.create.mockClear().mockResolvedValue(undefined);
  });

  it('keeps alert center remounts on a short settled cache window while refresh and closure operations invalidate it', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/alert/alert-center-page.tsx'), 'utf8');

    expect(source).toContain('ALERT_CENTER_SETTLED_CACHE_TTL_MS = 10_000');
    expect(source).toContain("['alert-center', alertListUrl, refreshNonce].join('|')");
    expect(source).toContain('const refreshQuery = useCallback(');
    expect(source).toContain('setRefreshNonce(current => current + 1)');
    expect(source).toContain('onRefresh={refreshQuery}');
    expect(source).toContain('cacheSettledTtlMs={ALERT_CENTER_SETTLED_CACHE_TTL_MS}');
  });

  it('loads the alert center through the shared query/controller contract', async () => {
    const html = await renderAlertCenterPage(
      buildAlertCenterRouteState({ search: 'checkout', status: 'acknowledged', severity: 'warning' })
    );

    expect(html).toContain('data-alert-center-surface="otlp-cold-center-console"');
    expect(html).toContain('data-alert-center-style-baseline="hertzbeat-ui-matte"');
    expect(html).toContain('data-loading-copy="Loading alert center"');

    await mockState.lastLoad?.();

    expect(loadAlertCenterDataFromFacade).toHaveBeenCalledWith(expect.objectContaining({
      alerts: alertFacade,
      entities: entityFacade
    }), {
      search: 'checkout',
      status: 'acknowledged',
      severity: 'warning',
      pageIndex: 0,
      pageSize: 8,
      entityId: '',
      entityName: '',
      returnTo: ''
    });
  });

  it('keeps machine entity context in shared query state and drops display labels', async () => {
    await renderAlertCenterPage(
      buildAlertCenterRouteState({
        entityId: '42',
        entityName: 'Checkout API',
        returnTo: '/entities/42?returnLabel=Checkout',
        returnLabel: 'Checkout'
      })
    );

    await mockState.lastLoad?.();

    expect(loadAlertCenterDataFromFacade).toHaveBeenCalledWith(expect.objectContaining({
      alerts: alertFacade,
      entities: entityFacade
    }), {
      search: '',
      status: 'firing',
      severity: '',
      pageIndex: 0,
      pageSize: 8,
      entityId: '42',
      entityName: 'Checkout API',
      returnTo: '/entities/42'
    });
  });

  it('keeps topology edge context when opened from the topology alert-impact action', async () => {
    const returnTo =
      '/topology?viewMode=resource-dependency&sourceKind=database-middleware-connection&edgeId=svc-checkout--res-orders-db&environment=prod&timeRange=last-1h';
    await renderAlertCenterPage(
      buildAlertCenterRouteState({
        source: 'topology',
        viewMode: 'resource-dependency',
        sourceKind: 'database-middleware-connection',
        edgeId: 'svc-checkout--res-orders-db',
        entityId: 'service:commerce/checkout',
        entityName: 'checkout-api',
        serviceName: 'checkout-api',
        serviceNamespace: 'commerce',
        environment: 'prod',
        timeRange: 'last-1h',
        returnTo: `${returnTo}&returnLabel=HertzBeat%20operations%20topology`,
        returnLabel: 'HertzBeat operations topology'
      })
    );

    await mockState.lastLoad?.();

    expect(loadAlertCenterDataFromFacade).toHaveBeenCalledWith(expect.objectContaining({
      alerts: alertFacade,
      entities: entityFacade
    }), {
      search: 'checkout-api',
      status: 'firing',
      severity: '',
      pageIndex: 0,
      pageSize: 8,
      entityId: 'service:commerce/checkout',
      entityName: 'checkout-api',
      serviceName: 'checkout-api',
      serviceNamespace: 'commerce',
      environment: 'prod',
      timeRange: 'last-1h',
      source: 'topology',
      viewMode: 'resource-dependency',
      sourceKind: 'database-middleware-connection',
      edgeId: 'svc-checkout--res-orders-db',
      returnTo
    });
  });

  it('keeps three-signal evidence context when opened from OTLP workbenches', async () => {
    await renderAlertCenterPage(
      buildAlertCenterRouteState({
        signal: 'logs',
        search: 'checkout',
        status: 'firing',
        entityId: '42',
        entityName: 'Checkout API',
        serviceName: 'checkout',
        serviceNamespace: 'payments',
        environment: 'prod',
        timeRange: 'last-1h',
        source: 'otlp',
        traceId: 'trace-123',
        spanId: 'span-456',
        collector: 'collector-a',
        template: 'spring-boot',
        returnTo: '/log/manage?traceId=trace-123&returnLabel=Logs'
      })
    );

    await mockState.lastLoad?.();

    expect(loadAlertCenterDataFromFacade).toHaveBeenCalledWith(expect.objectContaining({
      alerts: alertFacade,
      entities: entityFacade
    }), {
      search: 'checkout',
      status: 'firing',
      severity: '',
      pageIndex: 0,
      pageSize: 8,
      entityId: '42',
      entityName: 'Checkout API',
      serviceName: 'checkout',
      serviceNamespace: 'payments',
      environment: 'prod',
      timeRange: 'last-1h',
      source: 'otlp',
      signal: 'logs',
      traceId: 'trace-123',
      spanId: 'span-456',
      collector: 'collector-a',
      template: 'spring-boot',
      returnTo: '/log/manage?traceId=trace-123'
    });
  });

  it('canonicalizes dirty alert entry urls without display labels after hydration', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/alert/alert-center-page.tsx'), 'utf8');

    expect(source).toContain('if (alertCenterRouteState.shouldCleanUrl)');
    expect(source).toContain('router.replace(alertCenterRouteState.cleanUrl)');
    expect(source).toContain('buildAlertCenterRouteUrl(cleared)');
    expect(source).toContain('router.replace(buildAlertCenterRouteUrl(cleared))');
    expect(source).not.toContain("searchParams.has('returnLabel')");
    expect(source).not.toContain("searchParams.get('returnTo')?.includes('returnLabel')");
  });

  it('wires evidence-closure direct operations to the alert mutation controller', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/alert/alert-center-page.tsx'), 'utf8');

    expect(source).toContain('api.alerts');
    expect(source).toContain('applyAlertClosureOperationFromFacade');
    expect(source).not.toContain('apiMessagePut');
    expect(source).not.toContain('apiMessageDelete');
    expect(source).toContain('onClosureAction={(action, groupId) => void handleClosureAction(action, groupId, data.groupAlerts.totalElements)}');
  });

  it('surfaces success and failure feedback after alert closure operations', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/alert/alert-center-page.tsx'), 'utf8');

    expect(source).toContain('operationFeedback');
    expect(source).toContain('setOperationFeedback');
    expect(source).toContain('buildAlertClosureOperationFeedback(action, t)');
    expect(source).toContain('buildAlertClosureOperationFailureFeedback(action, t)');
    expect(source).toContain('operationFeedback={operationFeedback}');
  });

  it('subscribes the alert center list to Angular ALERT_EVENT SSE refreshes', async () => {
    const html = await renderAlertCenterPage();
    const source = readFileSync(resolve(process.cwd(), 'app/alert/alert-center-page.tsx'), 'utf8');

    expect(html).toContain('data-realtime-event-count="0"');
    expect(source).toContain('HEADER_ALERT_SSE_URL');
    expect(source).toContain('HEADER_ALERT_EVENT_TYPE');
    expect(source).toContain('parseHeaderSseJson<GroupAlert>(event.data)');
    expect(source).toContain('new window.EventSource(HEADER_ALERT_SSE_URL)');
    expect(source).toContain('eventSource.addEventListener(HEADER_ALERT_EVENT_TYPE, handleAlertEvent)');
    expect(source).toContain('resolveRealtimeGroupId(alert)');
    expect(source).toContain('setRealtimeEventCount(current => current + 1)');
    expect(source).toContain('setRealtimeGroupIds(current => [realtimeGroupId, ...current.filter(groupId => groupId !== realtimeGroupId)].slice(0, 8))');
    expect(source).toContain('realtimeEventCount={realtimeEventCount}');
    expect(source).toContain('realtimeGroupIds={realtimeGroupIds}');
    expect(source).toContain('eventSource.onerror = () =>');
  });

  it('normalizes realtime alert group ids for the Angular new-alert highlight contract', async () => {
    const { resolveRealtimeGroupId } = await import('./alert-center-page');

    expect(resolveRealtimeGroupId({ id: 42 })).toBe(42);
    expect(resolveRealtimeGroupId({ id: 0, groupKey: '43' })).toBe(43);
    expect(resolveRealtimeGroupId({ id: 0, groupKey: 'service:checkout' })).toBeNull();
    expect(resolveRealtimeGroupId(null)).toBeNull();
  });

  it('refreshes alert evidence with the post-closure query instead of dropping signal context', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/alert/alert-center-page.tsx'), 'utf8');

    expect(source).toContain('buildAlertQueryAfterClosureOperation');
    expect(source).toContain('clampAlertCenterPageIndexAfterDelete');
    expect(source).toContain('buildAlertClosureOperationFeedback');
    expect(source).toContain('buildAlertClosureOperationFeedback(action, t)');
    expect(source).toContain("return action === 'close' || action === 'delete'");
    expect(source).toContain('clampAlertCenterPageIndexAfterDelete(nextQuery, totalElements, affectedCount)');
    expect(source).toContain('const nextRouteQuery = buildPostActionQuery(query)');
    expect(source).toContain('setDraft(current => buildPostActionQuery(current))');
    expect(source).toContain('setQuery(current => buildPostActionQuery(current))');
    expect(source).toContain('router.replace(buildAlertCenterRouteUrl(nextRouteQuery))');
    expect(source).toContain('handleClosureAction(action, groupId, data.groupAlerts.totalElements)');
  });

  it('keeps alert center pagination and page-size changes reflected in the route url', async () => {
    await renderAlertCenterPage(
      buildAlertCenterRouteState({
        search: 'checkout',
        status: 'firing',
        severity: 'critical',
        pageIndex: 0,
        pageSize: 25,
        source: 'alert-center-route-1513'
      })
    );

    mockState.lastSurfaceProps?.onPageIndexChange(1);

    expect(mockState.replace).toHaveBeenLastCalledWith(
      '/alert?search=checkout&status=firing&severity=critical&pageIndex=1&pageSize=25&source=alert-center-route-1513'
    );

    mockState.lastSurfaceProps?.onPageSizeChange(15);

    expect(mockState.replace).toHaveBeenLastCalledWith(
      '/alert?search=checkout&status=firing&severity=critical&pageIndex=0&pageSize=15&source=alert-center-route-1513'
    );
  });

  it('wires alert-center quick rule dialogs to create APIs and refreshes the workbench', async () => {
    const html = await renderAlertCenterPage(
      buildAlertCenterRouteState({ entityId: '42', entityName: 'Checkout API', returnTo: '/entities/42' })
    );
    const onRuleQuickCreate = mockState.lastSurfaceProps?.onRuleQuickCreate;

    expect(html).toContain('data-rule-create="function"');
    expect(onRuleQuickCreate).toEqual(expect.any(Function));

    await onRuleQuickCreate('silence', {
      name: 'Checkout API silence',
      enable: true,
      matchAll: false,
      type: '0',
      labelsText: 'service:checkout',
      daysText: '1,2,3',
      periodStart: '2026-05-25T10:00',
      periodEnd: '2026-05-25T16:00'
    });

    expect(alertSilenceFacade.create).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Checkout API silence',
      enable: true,
      matchAll: false,
      type: 0,
      labels: { service: 'checkout' }
    }));

    await onRuleQuickCreate('inhibit', {
      name: 'Checkout API inhibit',
      enable: true,
      sourceLabelsText: 'service:checkout',
      targetLabelsText: 'service:checkout',
      equalLabelsText: 'service'
    });

    expect(alertInhibitFacade.create).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Checkout API inhibit',
      enable: true,
      sourceLabels: { service: 'checkout' },
      targetLabels: { service: 'checkout' },
      equalLabels: ['service']
    }));

    const source = readFileSync(resolve(process.cwd(), 'app/alert/alert-center-page.tsx'), 'utf8');
    expect(source).toContain('createAlertSilenceFromFacade(api.alertSilences.create');
    expect(source).toContain('createAlertInhibitFromFacade(api.alertInhibits.create');
    expect(source).not.toContain('apiMessagePost');
    expect(source).toContain('onRuleQuickCreate={handleRuleQuickCreate}');
    expect(source).toContain("setOperationFeedback({ tone: 'success', copy: t('common.notify.new-success') })");
    expect(source).toContain("copy: t('common.notify.new-fail')");
    expect(source).not.toContain("setOperationFeedback({ tone: 'success', copy: t('common.save-success') })");
    expect(source).toContain('setSelectedGroupIds([])');
    expect(source).toContain('setRefreshNonce(current => current + 1)');
  });

  it('remembers entity response result state for return links after alert operations', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/alert/alert-center-page.tsx'), 'utf8');

    expect(source).toContain('normalizeEntityResponseAction');
    expect(source).toContain('useState<AlertEntityResponseResult>(null)');
    expect(source).toContain('setEntityResponseResult({ action: normalizeEntityResponseAction(action), count: affectedCount })');
    expect(source).toContain('setEntityResponseResult({ action: mode, count })');
    expect(source).toContain('entityResponseResult={entityResponseResult}');
    expect(source).toContain('setEntityResponseResult(null)');
  });
});
