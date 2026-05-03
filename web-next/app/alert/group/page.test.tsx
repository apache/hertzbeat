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
          name: 'ops-group',
          enable: true,
          groupLabels: ['alertname', 'service'],
          groupWait: 30,
          groupInterval: 300,
          repeatInterval: 14400,
          gmtUpdate: 1713200000000
        }
      ],
      pageIndex: 0,
      pageSize: 8
    },
    labelOptions: {
      keys: ['alertname', 'service', 'severity'],
      valuesByKey: {
        severity: ['critical', 'warning']
      }
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

vi.mock('../../../components/pages/alert-group-surface', () => ({
  AlertGroupSurface: ({
    data,
    labelOptions,
    evidenceContext,
    draft
  }: {
    data: { list: { totalElements: number } };
    labelOptions?: { keys: string[] };
    evidenceContext?: { signal: string; groupLabelsText: string; returnHref?: string } | null;
    draft?: { groupLabelsText?: string };
  }) => (
    <div
      data-alert-group-surface="true"
      data-total={data.list.totalElements}
      data-label-options={labelOptions?.keys?.join('|')}
      data-alert-group-evidence-context={evidenceContext ? 'signal-route' : 'none'}
      data-alert-group-evidence-signal={evidenceContext?.signal ?? ''}
      data-alert-group-evidence-return={evidenceContext?.returnHref ?? ''}
      data-alert-group-prefill-labels={evidenceContext?.groupLabelsText ?? ''}
      data-alert-group-draft-labels={draft?.groupLabelsText ?? ''}
    />
  )
}));

vi.mock('../../../lib/api-client', () => ({
  apiMessageDelete: vi.fn(),
  apiMessageGet,
  apiMessagePost: vi.fn(),
  apiMessagePut: vi.fn()
}));

describe('alert group page', () => {
  beforeEach(() => {
    mockState.searchParams = new URLSearchParams();
    mockState.lastLoad = null;
    apiMessageGet.mockClear().mockResolvedValue(mockState.renderData.list);
  });

  it('loads the group workspace through the shared query and surface contracts', async () => {
    const { default: AlertGroupPage } = await import('./page');
    const html = renderToStaticMarkup(<AlertGroupPage />);

    expect(html).toContain('data-alert-group-surface="true"');
    expect(html).toContain('data-label-options="alertname|service|severity"');

    await mockState.lastLoad?.();

    expect(apiMessageGet).toHaveBeenCalledWith('/alert/groups?pageIndex=0&pageSize=8&sort=id&order=desc');
    expect(apiMessageGet).toHaveBeenCalledWith('/label?pageIndex=0&pageSize=9999');
  });

  it('preserves three-signal evidence context into new grouping authoring', async () => {
    mockState.searchParams = new URLSearchParams({
      signal: 'metrics',
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
      returnTo: '/metrics/manage?entityId=service%3Acommerce%2Fcheckout&returnLabel=%E6%8C%87%E6%A0%87%E5%B7%A5%E4%BD%9C%E5%8F%B0'
    });

    const { default: AlertGroupPage } = await import('./page');
    const html = renderToStaticMarkup(<AlertGroupPage />);

    expect(html).toContain('data-alert-group-evidence-context="signal-route"');
    expect(html).toContain('data-alert-group-evidence-signal="metrics"');
    expect(html).toContain('data-alert-group-evidence-return="/metrics/manage?entityId=service%3Acommerce%2Fcheckout"');
    expect(html).toContain('data-alert-group-prefill-labels="hertzbeat.entity.id, service.name, service.namespace, deployment.environment"');
    expect(html).toContain('data-alert-group-draft-labels="hertzbeat.entity.id, service.name, service.namespace, deployment.environment"');
    expect(html).not.toContain('returnLabel=');
    expect(html).not.toContain('trace_id');
    expect(html).not.toContain('span_id');
  });
});
