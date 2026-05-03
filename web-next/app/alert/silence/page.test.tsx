import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTranslatorMock } from '../../../test/i18n-test-helper';

const mockState = vi.hoisted(() => ({
  searchParams: new URLSearchParams(),
  lastLoad: null as null | (() => Promise<unknown>),
  renderData: {
    list: {
      totalElements: 1,
      content: [
        {
          id: 7,
          name: 'weekday',
          enable: true,
          matchAll: false,
          labels: { service: 'checkout' },
          type: 1,
          days: [1, 2, 3, 4, 5],
          times: 2
        }
      ],
      pageIndex: 0,
      pageSize: 8
    }
  }
}));

const apiMessageGet = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  useSearchParams: () =>
    ({
      get: (key: string) => mockState.searchParams.get(key)
    }) as { get(name: string): string | null }
}));

vi.mock('../../../components/providers/i18n-provider', () => ({
  useI18n: () => ({
    t: createTranslatorMock()
  })
}));

vi.mock('../../../components/workbench/client-workbench', () => ({
  ClientWorkbench: ({ children, load }: { children: (data: any) => React.ReactNode; load: () => Promise<unknown> }) => {
    mockState.lastLoad = load;
    return <div data-client-workbench="true">{children(mockState.renderData)}</div>;
  }
}));

vi.mock('../../../components/pages/alert-silence-surface', () => ({
  AlertSilenceSurface: ({
    data,
    returnContext,
    evidenceContext,
    draft
  }: {
    data: { list: { totalElements: number } };
    returnContext?: Record<string, string>;
    evidenceContext?: { signal: string; labelsText: string; returnHref?: string } | null;
    draft?: { labelsText?: string };
  }) => (
    <div
      data-alert-silence-surface="true"
      data-total={data.list.totalElements}
      data-return-context={JSON.stringify(returnContext ?? {})}
      data-alert-silence-evidence-context={evidenceContext ? 'signal-route' : 'none'}
      data-alert-silence-evidence-signal={evidenceContext?.signal ?? ''}
      data-alert-silence-evidence-return={evidenceContext?.returnHref ?? ''}
      data-alert-silence-prefill-labels={evidenceContext?.labelsText ?? ''}
      data-alert-silence-draft-labels={draft?.labelsText ?? ''}
    />
  )
}));

vi.mock('../../../lib/api-client', () => ({
  apiMessageDelete: vi.fn(),
  apiMessageGet,
  apiMessagePost: vi.fn(),
  apiMessagePut: vi.fn()
}));

describe('alert silence page', () => {
  beforeEach(() => {
    mockState.searchParams = new URLSearchParams();
    mockState.lastLoad = null;
    apiMessageGet.mockClear().mockResolvedValue(mockState.renderData.list);
  });

  it('loads the silence workbench through the shared query and surface contracts', async () => {
    const { default: AlertSilencePage } = await import('./page');
    const html = renderToStaticMarkup(<AlertSilencePage />);

    expect(html).toContain('data-alert-silence-surface="true"');

    await mockState.lastLoad?.();

    expect(apiMessageGet).toHaveBeenCalledWith('/alert/silences?pageIndex=0&pageSize=8&sort=id&order=desc');
  });

  it('passes topology edge return context into the silence surface', async () => {
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

    const { default: AlertSilencePage } = await import('./page');
    const html = renderToStaticMarkup(<AlertSilencePage />);

    expect(html).toContain('&quot;edgeId&quot;:&quot;svc-checkout--res-orders-db&quot;');
    expect(html).toContain('&quot;viewMode&quot;:&quot;resource-dependency&quot;');
    expect(html).toContain('&quot;sourceKind&quot;:&quot;database-middleware-connection&quot;');
    expect(html).toContain('&quot;returnTo&quot;:&quot;/topology?viewMode=resource-dependency&amp;sourceKind=database-middleware-connection&amp;edgeId=svc-checkout--res-orders-db');
    expect(html).not.toContain('returnLabel=');
    expect(html).not.toContain('HertzBeat 企业运维拓扑');
  });

  it('preserves three-signal evidence context into new silence authoring', async () => {
    mockState.searchParams = new URLSearchParams({
      signal: 'logs',
      source: 'otlp',
      entityId: 'service:commerce/checkout',
      entityName: 'checkout-api',
      serviceName: 'checkout',
      serviceNamespace: 'commerce',
      environment: 'prod',
      traceId: 'trace-123',
      spanId: 'span-456',
      collector: 'edge-collector-a',
      template: 'java-service',
      returnTo: '/log/manage?view=list&traceId=trace-123&returnLabel=%E6%97%A5%E5%BF%97%E5%B7%A5%E4%BD%9C%E5%8F%B0'
    });

    const { default: AlertSilencePage } = await import('./page');
    const html = renderToStaticMarkup(<AlertSilencePage />);

    expect(html).toContain('data-alert-silence-evidence-context="signal-route"');
    expect(html).toContain('data-alert-silence-evidence-signal="logs"');
    expect(html).toContain('data-alert-silence-evidence-return="/log/manage?view=list&amp;traceId=trace-123"');
    expect(html).toContain('hertzbeat.signal:logs');
    expect(html).toContain('service.name:checkout');
    expect(html).toContain('trace_id:trace-123');
    expect(html).toContain('span_id:span-456');
    expect(html).toContain('hertzbeat.collector:edge-collector-a');
    expect(html).toContain('data-alert-silence-draft-labels="hertzbeat.signal:logs');
    expect(html).not.toContain('returnLabel=');
  });
});
