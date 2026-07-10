import { describe, expect, it } from 'vitest';
import { readAlertNoticeRouteState } from './query-state';

describe('alert notice query state', () => {
  it('normalizes multi-value URL search params into the first alert notice evidence context value', () => {
    const returnTo = '/log/manage?traceId=trace-123&returnLabel=Logs';

    expect(
      readAlertNoticeRouteState({
        source: ['otlp', 'manual'],
        signal: ['logs', 'metrics'],
        entityId: ['7', '8'],
        entityName: ['Checkout API', 'Ignored API'],
        serviceName: ['checkout', 'payments'],
        serviceNamespace: ['commerce', 'billing'],
        environment: ['prod', 'stage'],
        timeRange: ['last-1h', 'last-6h'],
        traceId: ['trace-123', 'trace-456'],
        spanId: ['span-123', 'span-456'],
        collector: ['edge-collector-a', 'edge-collector-b'],
        template: ['java-service', 'node-service'],
        returnTo: [returnTo, '//evil.example']
      })
    ).toEqual({
      signal: 'logs',
      signalContext: {
        entityId: '7',
        entityName: 'Checkout API',
        serviceName: 'checkout',
        serviceNamespace: 'commerce',
        environment: 'prod',
        timeRange: 'last-1h',
        source: 'otlp',
        traceId: 'trace-123',
        spanId: 'span-123',
        collector: 'edge-collector-a',
        template: 'java-service',
        returnTo: '/log/manage?traceId=trace-123'
      }
    });
  });

  it('keeps the alert notice route evidence empty when URL context is absent', () => {
    expect(readAlertNoticeRouteState()).toEqual({
      signal: null,
      signalContext: {}
    });
  });

  it('does not treat list metadata as alert notice evidence without an explicit signal', () => {
    expect(
      readAlertNoticeRouteState({
        search: 'uv_alert_notice_required',
        pageSize: '8',
        source: 'alert-notice-required-proof',
        probe: 'validation-loop',
        returnTo: '/alert/notice?search=uv_alert_notice_required'
      })
    ).toEqual({
      signal: null,
      signalContext: {}
    });
  });
});
