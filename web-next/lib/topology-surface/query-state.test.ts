import { describe, expect, it } from 'vitest';
import { readTopologyRouteContext } from './query-state';

describe('topology query state', () => {
  it('normalizes multi-value URL search params into the first topology route context value', () => {
    const alertReturnLabel = String.fromCodePoint(0x544a, 0x8b66);
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
        scaleProof: ['greptime-real', 'ignored-scale-proof'],
        search: ['Service 420', 'ignored-search'],
        edgeId: ['svc-checkout--res-orders-db', 'ignored-edge'],
        topologyTargetId: ['4201', 'ignored-target'],
        topologyTargetName: ['checkout-node-a', 'ignored-target-name'],
        returnTo: [`/alert?status=firing&returnLabel=${encodeURIComponent(alertReturnLabel)}`]
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
      scaleProof: 'greptime-real',
      search: 'Service 420',
      edgeId: 'svc-checkout--res-orders-db',
      topologyTargetId: '4201',
      topologyTargetName: 'checkout-node-a',
      returnTo: '/alert?status=firing'
    });
  });

  it('accepts focusEntityId as a topology entity focus alias when entityId is absent', () => {
    expect(
      readTopologyRouteContext({
        focusEntityId: ['646566130000000', 'ignored-focus'],
        environment: ['prod'],
        depth: ['2'],
        relationType: ['trace-call'],
        pageSize: ['200']
      })
    ).toMatchObject({
      entityId: '646566130000000',
      environment: 'prod',
      depth: '2',
      relationType: 'trace-call',
      pageSize: '200'
    });
  });

  it('keeps explicit entityId ahead of the focusEntityId compatibility alias', () => {
    expect(
      readTopologyRouteContext({
        entityId: ['501'],
        focusEntityId: ['999'],
        environment: ['prod']
      })
    ).toMatchObject({
      entityId: '501',
      environment: 'prod'
    });
  });
});
