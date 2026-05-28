import { describe, expect, it } from 'vitest';
import { buildAlertGroupUrl, readAlertGroupRouteState } from './query-state';

describe('alert group query state', () => {
  it('normalizes multi-value URL search params into the first alert group evidence context value', () => {
    const returnTo =
      '/metrics/manage?entityId=service%3Acommerce%2Fcheckout&returnLabel=Metrics';

    expect(
      readAlertGroupRouteState({
        source: ['otlp', 'topology'],
        signal: ['metrics', 'logs'],
        entityId: ['service:commerce/checkout', 'ignored'],
        entityName: ['checkout-api', 'ignored'],
        serviceName: ['checkout', 'ignored'],
        serviceNamespace: ['commerce', 'ignored'],
        environment: ['prod', 'stage'],
        timeRange: ['last-1h', 'last-6h'],
        traceId: ['trace-123', 'trace-456'],
        spanId: ['span-123', 'span-456'],
        collector: ['edge-collector-a', 'edge-collector-b'],
        template: ['java-service', 'node-service'],
        returnTo: [returnTo, '//evil.example']
      })
    ).toEqual({
      signal: 'metrics',
      signalContext: {
        entityId: 'service:commerce/checkout',
        entityName: 'checkout-api',
        serviceName: 'checkout',
        serviceNamespace: 'commerce',
        environment: 'prod',
        timeRange: 'last-1h',
        source: 'otlp',
        traceId: 'trace-123',
        spanId: 'span-123',
        collector: 'edge-collector-a',
        template: 'java-service',
        returnTo: '/metrics/manage?entityId=service%3Acommerce%2Fcheckout'
      }
    });
  });

  it('keeps the alert group route evidence empty when URL context is absent', () => {
    expect(readAlertGroupRouteState()).toEqual({
      signal: null,
      signalContext: {}
    });
  });

  it('builds group list url with search', () => {
    expect(buildAlertGroupUrl('cpu')).toBe('/alert/groups?pageIndex=0&pageSize=8&sort=id&order=desc&search=cpu');
  });

  it('builds group list url with Angular-compatible page and page-size params', () => {
    expect(buildAlertGroupUrl({ search: 'cpu', pageIndex: 2, pageSize: 15 })).toBe(
      '/alert/groups?pageIndex=2&pageSize=15&sort=id&order=desc&search=cpu'
    );
  });

  it('falls back to the Angular default page size when an unsupported size is requested', () => {
    expect(buildAlertGroupUrl({ search: '', pageIndex: -1, pageSize: 20 })).toBe(
      '/alert/groups?pageIndex=0&pageSize=8&sort=id&order=desc'
    );
  });

  it('builds clean group list url when empty', () => {
    expect(buildAlertGroupUrl('')).toBe('/alert/groups?pageIndex=0&pageSize=8&sort=id&order=desc');
  });
});
