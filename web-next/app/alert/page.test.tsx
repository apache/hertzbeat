import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTranslatorMock } from '../../test/i18n-test-helper';

const mockState = vi.hoisted(() => ({
  searchParams: new URLSearchParams(),
  replace: vi.fn(),
  lastLoad: null as null | (() => Promise<unknown>),
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

const loadAlertCenterData = vi.hoisted(() => vi.fn(async () => mockState.renderData));
const applyAlertClosureOperation = vi.hoisted(() => vi.fn(async () => undefined));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mockState.replace
  }),
  useSearchParams: () =>
    ({
      get: (key: string) => mockState.searchParams.get(key),
      has: (key: string) => mockState.searchParams.has(key)
    }) as { get(name: string): string | null; has(name: string): boolean }
}));

vi.mock('../../components/providers/i18n-provider', () => ({
  useI18n: () => ({
    t: createTranslatorMock()
  })
}));

vi.mock('../../components/workbench/client-workbench', () => ({
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

vi.mock('../../components/pages/alert-center-surface', () => ({
  AlertCenterSurface: ({ draft, data }: { draft: Record<string, string>; data: { groupAlerts: { totalElements: number } } }) => (
    <div
      data-alert-center-surface="otlp-cold-center-console"
      data-alert-center-style-baseline="hertzbeat-cold-matte"
      data-draft={JSON.stringify(draft)}
    />
  )
}));

vi.mock('../../lib/api-client', () => ({
  apiMessageDelete: vi.fn(),
  apiMessageGet: vi.fn(),
  apiMessagePut: vi.fn()
}));

vi.mock('../../lib/alert-manage/controller', () => ({
  applyAlertClosureOperation,
  loadAlertCenterData
}));

describe('alert center page', () => {
  beforeEach(() => {
    mockState.searchParams = new URLSearchParams('search=checkout&status=acknowledged&severity=warning');
    mockState.replace.mockClear();
    mockState.lastLoad = null;
    loadAlertCenterData.mockClear().mockResolvedValue(mockState.renderData);
    applyAlertClosureOperation.mockClear().mockResolvedValue(undefined);
  });

  it('loads the alert center through the shared query/controller contract', async () => {
    const { default: AlertCenterPage } = await import('./page');
    const html = renderToStaticMarkup(<AlertCenterPage />);

    expect(html).toContain('data-alert-center-surface="otlp-cold-center-console"');
    expect(html).toContain('data-alert-center-style-baseline="hertzbeat-cold-matte"');

    await mockState.lastLoad?.();

    expect(loadAlertCenterData).toHaveBeenCalledWith(expect.any(Function), {
      search: 'checkout',
      status: 'acknowledged',
      severity: 'warning',
      entityId: '',
      entityName: '',
      returnTo: ''
    });
  });

  it('keeps machine entity context in shared query state and drops display labels', async () => {
    mockState.searchParams = new URLSearchParams(
      'entityId=42&entityName=Checkout%20API&returnTo=%2Fentities%2F42%3FreturnLabel%3DCheckout&returnLabel=Checkout'
    );

    const { default: AlertCenterPage } = await import('./page');
    renderToStaticMarkup(<AlertCenterPage />);

    await mockState.lastLoad?.();

    expect(loadAlertCenterData).toHaveBeenCalledWith(expect.any(Function), {
      search: '',
      status: 'firing',
      severity: '',
      entityId: '42',
      entityName: 'Checkout API',
      returnTo: '/entities/42'
    });
  });

  it('keeps topology edge context when opened from the topology alert-impact action', async () => {
    const returnTo =
      '/topology?viewMode=resource-dependency&sourceKind=database-middleware-connection&edgeId=svc-checkout--res-orders-db&environment=prod&timeRange=last-1h';
    mockState.searchParams = new URLSearchParams({
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
      returnTo: `${returnTo}&returnLabel=HertzBeat%20%E4%BC%81%E4%B8%9A%E8%BF%90%E7%BB%B4%E6%8B%93%E6%89%91`,
      returnLabel: 'HertzBeat 企业运维拓扑'
    });

    const { default: AlertCenterPage } = await import('./page');
    renderToStaticMarkup(<AlertCenterPage />);

    await mockState.lastLoad?.();

    expect(loadAlertCenterData).toHaveBeenCalledWith(expect.any(Function), {
      search: 'checkout-api',
      status: 'firing',
      severity: '',
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
    mockState.searchParams = new URLSearchParams({
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
    });

    const { default: AlertCenterPage } = await import('./page');
    renderToStaticMarkup(<AlertCenterPage />);

    await mockState.lastLoad?.();

    expect(loadAlertCenterData).toHaveBeenCalledWith(expect.any(Function), {
      search: 'checkout',
      status: 'firing',
      severity: '',
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
    const source = readFileSync(resolve(process.cwd(), 'app/alert/page.tsx'), 'utf8');

    expect(source).toContain("searchParams.has('returnLabel')");
    expect(source).toContain("searchParams.get('returnTo')?.includes('returnLabel')");
    expect(source).toContain('router.replace(buildAlertCompatRouteUrl(searchParams))');
  });

  it('wires evidence-closure direct operations to the alert mutation controller', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/alert/page.tsx'), 'utf8');

    expect(source).toContain('apiMessagePut');
    expect(source).toContain('apiMessageDelete');
    expect(source).toContain('applyAlertClosureOperation');
    expect(source).toContain('onClosureAction={(action, groupId) => void handleClosureAction(action, groupId)}');
  });

  it('surfaces success and failure feedback after alert closure operations', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/alert/page.tsx'), 'utf8');

    expect(source).toContain('operationFeedback');
    expect(source).toContain('setOperationFeedback');
    expect(source).toContain('buildAlertClosureOperationFeedback(action, t)');
    expect(source).toContain('alert.center.operation.failed');
    expect(source).toContain('operationFeedback={operationFeedback}');
  });

  it('refreshes alert evidence with the post-closure query instead of dropping signal context', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/alert/page.tsx'), 'utf8');

    expect(source).toContain('buildAlertQueryAfterClosureOperation');
    expect(source).toContain('buildAlertClosureOperationFeedback');
    expect(source).toContain('buildAlertClosureOperationFeedback(action, t)');
    expect(source).toContain('setDraft(current => buildAlertQueryAfterClosureOperation(current, action))');
    expect(source).toContain('setQuery(current => buildAlertQueryAfterClosureOperation(current, action))');
  });
});
