import { describe, expect, it } from 'vitest';
import { readActionsSuggestionContext } from './query-state';

describe('actions query state', () => {
  it('normalizes multi-value URL search params into the first suggestion context value', () => {
    const alertReturnLabel = String.fromCodePoint(0x544a, 0x8b66);
    expect(
      readActionsSuggestionContext({
        source: ['alert', 'ignored-source'],
        signal: ['traces', 'logs'],
        status: ['firing', 'resolved'],
        entityId: ['service:commerce/checkout', 'service:commerce/cart'],
        entityName: ['checkout-api'],
        serviceName: ['checkout-api'],
        serviceNamespace: ['commerce'],
        environment: ['prod'],
        timeRange: ['last-1h'],
        start: ['1710000000000'],
        end: ['1710003600000'],
        traceId: ['trace-123'],
        spanId: ['span-456'],
        collector: ['edge-collector-a'],
        template: ['java-service'],
        search: ['severity:critical'],
        severity: ['critical'],
        alertGroupId: ['group-7'],
        viewMode: ['evidence'],
        sourceKind: ['topology'],
        edgeId: ['edge-9'],
        returnTo: [`/alert?status=firing&returnLabel=${alertReturnLabel}`]
      })
    ).toEqual({
      source: 'alert',
      signal: 'traces',
      status: 'firing',
      entityId: 'service:commerce/checkout',
      entityName: 'checkout-api',
      serviceName: 'checkout-api',
      serviceNamespace: 'commerce',
      environment: 'prod',
      timeRange: 'last-1h',
      start: '1710000000000',
      end: '1710003600000',
      traceId: 'trace-123',
      spanId: 'span-456',
      collector: 'edge-collector-a',
      template: 'java-service',
      search: 'severity:critical',
      severity: 'critical',
      alertGroupId: 'group-7',
      viewMode: 'evidence',
      sourceKind: 'topology',
      edgeId: 'edge-9',
      returnTo: `/alert?status=firing&returnLabel=${alertReturnLabel}`
    });
  });
});
