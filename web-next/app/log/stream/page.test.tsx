import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { createTranslatorMock } from '../../../test/i18n-test-helper';

vi.mock('../manage/log-manage-page', () => ({
  default: ({ forcedView, showViewToggle, initialRouteState }: { forcedView: string; showViewToggle: boolean; initialRouteState?: any }) => (
    <div
      data-log-manage-page="true"
      data-forced-view={forcedView}
      data-show-view-toggle={String(showViewToggle)}
      data-route-entity-id={initialRouteState?.routeContext?.entityId || ''}
      data-route-entity-type={initialRouteState?.routeContext?.entityType || ''}
      data-route-return-to={initialRouteState?.routeContext?.returnTo || ''}
      data-route-service-name={initialRouteState?.routeContext?.serviceName || ''}
      data-route-service-namespace={initialRouteState?.routeContext?.serviceNamespace || ''}
      data-route-environment={initialRouteState?.routeContext?.environment || ''}
      data-route-collector={initialRouteState?.routeContext?.collector || ''}
      data-route-template={initialRouteState?.routeContext?.template || ''}
      data-route-source={initialRouteState?.routeContext?.source || ''}
      data-query-trace-id={initialRouteState?.initialQuery?.traceId || ''}
      data-query-span-id={initialRouteState?.initialQuery?.spanId || ''}
    />
  )
}));

describe('log stream route', () => {
  it('uses the canonical EventSource-backed virtualized stream instead of a static compatibility shell', async () => {
    const expectedT = createTranslatorMock({ locale: 'zh-CN' });
    const { default: LogStreamPage } = await import('./page');
    const html = renderToStaticMarkup(
      await LogStreamPage({
        searchParams: Promise.resolve({
          traceId: 'trace-123',
          spanId: 'span-456',
          entityId: '42',
          entityName: 'Checkout API',
          serviceName: 'checkout-api',
          returnTo: '/trace/manage?traceId=trace-123'
        })
      })
    );
    const source = readFileSync(resolve(process.cwd(), 'app/log/stream/page.tsx'), 'utf8');

    expect(html).toContain('data-log-stream-canonical-live-route="log-manage-stream"');
    expect(html).toContain('data-log-manage-page="true"');
    expect(html).toContain('data-forced-view="stream"');
    expect(html).toContain('data-show-view-toggle="false"');
    expect(html).toContain('data-route-entity-id="42"');
    expect(html).toContain('data-route-return-to="/trace/manage?traceId=trace-123"');
    expect(html).toContain('data-route-service-name="checkout-api"');
    expect(html).toContain('data-query-trace-id="trace-123"');
    expect(html).toContain('data-query-span-id="span-456"');
    expect(source).toContain('LogManagePage');
    expect(source).toContain('readLogManageRouteState');
    expect(source).toContain('initialRouteState={routeState}');
    expect(source).toContain('forcedView="stream"');
    expect(source).toContain('showViewToggle={false}');
    expect(source).not.toContain('data-log-stream-surface="angular-log-stream"');
    expect(source).not.toContain(`${expectedT('log.manage.stream.status.connecting')}...`);
    expect(source).not.toContain(expectedT('log.manage.stream.count', { count: 0 }));
    expect(source).not.toContain('filterFields.map');
  });

  it('preserves the full trace-to-log entity context from a live stream deep link', async () => {
    const { default: LogStreamPage } = await import('./page');
    const html = renderToStaticMarkup(
      await LogStreamPage({
        searchParams: Promise.resolve({
          traceId: '12271227122712271227122712271227',
          spanId: '2227122712271227',
          entityId: '657285122700001',
          entityType: 'service',
          entityName: 'Codex PD 1227 Checkout API',
          serviceName: 'codex-pd-1227-checkout',
          serviceNamespace: 'product-design-1227',
          environment: 'prod',
          collector: 'codex-pd-1227-collector',
          template: 'codex-pd-1227-template',
          source: 'product-design-1231',
          returnTo: '/trace/manage?traceId=12271227122712271227122712271227&spanId=2227122712271227'
        })
      })
    );

    expect(html).toContain('data-log-stream-canonical-live-route="log-manage-stream"');
    expect(html).toContain('data-forced-view="stream"');
    expect(html).toContain('data-show-view-toggle="false"');
    expect(html).toContain('data-query-trace-id="12271227122712271227122712271227"');
    expect(html).toContain('data-query-span-id="2227122712271227"');
    expect(html).toContain('data-route-entity-id="657285122700001"');
    expect(html).toContain('data-route-entity-type="service"');
    expect(html).toContain('data-route-service-name="codex-pd-1227-checkout"');
    expect(html).toContain('data-route-service-namespace="product-design-1227"');
    expect(html).toContain('data-route-environment="prod"');
    expect(html).toContain('data-route-collector="codex-pd-1227-collector"');
    expect(html).toContain('data-route-template="codex-pd-1227-template"');
    expect(html).toContain('data-route-source="product-design-1231"');
    expect(html).toContain(
      'data-route-return-to="/trace/manage?traceId=12271227122712271227122712271227&amp;spanId=2227122712271227"'
    );
  });
});
