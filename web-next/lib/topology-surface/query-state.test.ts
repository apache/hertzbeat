import { describe, expect, it } from 'vitest';
import { readTopologyRouteContext } from './query-state';

describe('topology query state', () => {
  it('normalizes multi-value URL search params into the first topology route context value', () => {
    expect(
      readTopologyRouteContext({
        entityId: ['service:commerce/checkout', '3.2'],
        entityName: ['checkout-api'],
        serviceName: ['checkout-api'],
        serviceNamespace: ['commerce'],
        environment: ['prod'],
        timeRange: ['last-1h'],
        source: ['otlp'],
        traceId: ['trace-123'],
        spanId: ['span-456'],
        collector: ['edge-collector-a'],
        template: ['java-service'],
        depth: ['1', '2'],
        relationType: ['trace-call', 'ignored-relation'],
        hideInternal: ['true', 'false'],
        pageIndex: ['2', '1'],
        pageSize: ['50', '8'],
        viewMode: ['resource-dependency', 'service-call'],
        sourceKind: ['database-middleware-connection', 'alert-impact'],
        groupBy: ['source-kind', 'environment'],
        edgeId: ['svc-checkout--res-orders-db', 'ignored-edge'],
        returnTo: ['/alert?status=firing&returnLabel=告警']
      })
    ).toEqual({
      entityId: 'service:commerce/checkout',
      entityName: 'checkout-api',
      serviceName: 'checkout-api',
      serviceNamespace: 'commerce',
      environment: 'prod',
      timeRange: 'last-1h',
      source: 'otlp',
      traceId: 'trace-123',
      spanId: 'span-456',
      collector: 'edge-collector-a',
      template: 'java-service',
      depth: '1',
      relationType: 'trace-call',
      hideInternal: 'true',
      pageIndex: '2',
      pageSize: '50',
      viewMode: 'resource-dependency',
      sourceKind: 'database-middleware-connection',
      groupBy: 'source-kind',
      edgeId: 'svc-checkout--res-orders-db',
      returnTo: '/alert?status=firing'
    });
  });
});
