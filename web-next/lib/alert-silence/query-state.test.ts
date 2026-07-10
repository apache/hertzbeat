import { describe, expect, it } from 'vitest';
import { buildAlertSilenceUrl, readAlertSilenceRouteState } from './query-state';

describe('alert silence query state', () => {
  it('normalizes multi-value URL search params into the first alert silence evidence context value', () => {
    const returnTo =
      '/topology?viewMode=resource-dependency&sourceKind=database-middleware-connection&edgeId=svc-checkout--res-orders-db&returnLabel=Topology';

    expect(
      readAlertSilenceRouteState({
        source: ['topology', 'manual'],
        signal: ['logs', 'metrics'],
        viewMode: ['resource-dependency', 'service-map'],
        sourceKind: ['database-middleware-connection', 'service'],
        edgeId: ['svc-checkout--res-orders-db', 'ignored-edge'],
        entityId: ['service:commerce/checkout', 'ignored'],
        entityName: ['checkout-api', 'ignored'],
        serviceName: ['checkout', 'ignored'],
        serviceNamespace: ['commerce', 'ignored'],
        environment: ['prod', 'stage'],
        timeRange: ['last-1h', 'last-6h'],
        traceId: ['trace-123', 'trace-456'],
        spanId: ['span-123', 'span-456'],
        returnTo: [returnTo, '//evil.example'],
        returnLabel: ['Topology', 'ignored'],
        matchMode: ['entity-noise-controls', 'ignored'],
        matchingRuleType: ['silence', 'ignored'],
        matchingRuleIds: ['10, 11, bad, 10', '99']
      })
    ).toEqual({
      returnContext: {
        search: 'checkout',
        status: 'firing',
        severity: '',
        pageIndex: 0,
        pageSize: 8,
        entityId: 'service:commerce/checkout',
        entityName: 'checkout-api',
        returnTo: '/topology?viewMode=resource-dependency&sourceKind=database-middleware-connection&edgeId=svc-checkout--res-orders-db',
        serviceName: 'checkout',
        serviceNamespace: 'commerce',
        environment: 'prod',
        timeRange: 'last-1h',
        source: 'topology',
        signal: 'logs',
        traceId: 'trace-123',
        spanId: 'span-123',
        viewMode: 'resource-dependency',
        sourceKind: 'database-middleware-connection',
        edgeId: 'svc-checkout--res-orders-db'
      },
      signal: 'logs',
      signalContext: {
        entityId: 'service:commerce/checkout',
        entityName: 'checkout-api',
        serviceName: 'checkout',
        serviceNamespace: 'commerce',
        environment: 'prod',
        timeRange: 'last-1h',
        source: 'topology',
        traceId: 'trace-123',
        spanId: 'span-123',
        returnTo: '/topology?viewMode=resource-dependency&sourceKind=database-middleware-connection&edgeId=svc-checkout--res-orders-db'
      },
      managementContext: {
        entityId: 'service:commerce/checkout',
        entityName: 'checkout-api',
        returnTo: '/topology?viewMode=resource-dependency&sourceKind=database-middleware-connection&edgeId=svc-checkout--res-orders-db',
        returnLabel: '',
        matchMode: 'entity-noise-controls',
        matchingRuleType: 'silence',
        matchingRuleIds: [10, 11],
        matchedViewEnabled: true
      }
    });
  });

  it('keeps the alert silence route evidence empty when URL context is absent', () => {
    expect(readAlertSilenceRouteState()).toEqual({
      returnContext: {
        search: '',
        status: '',
        severity: '',
        pageIndex: 0,
        pageSize: 8,
        entityId: '',
        entityName: '',
        returnTo: ''
      },
      signal: null,
      signalContext: {},
      managementContext: {
        entityId: '',
        entityName: '',
        returnTo: '',
        returnLabel: '',
        matchMode: '',
        matchingRuleType: '',
        matchingRuleIds: [],
        matchedViewEnabled: false
      }
    });
  });

  it('does not treat list metadata as alert silence evidence without an explicit signal', () => {
    expect(
      readAlertSilenceRouteState({
        search: 'uv_alert_silence_required',
        pageSize: '8',
        source: 'alert-silence-required-proof',
        probe: 'validation-loop',
        returnTo: '/alert/silence?search=uv_alert_silence_required'
      })
    ).toEqual({
      returnContext: {
        search: 'uv_alert_silence_required',
        status: 'firing',
        severity: '',
        pageIndex: 0,
        pageSize: 8,
        entityId: '',
        entityName: '',
        returnTo: '/alert/silence?search=uv_alert_silence_required',
        source: 'alert-silence-required-proof'
      },
      signal: null,
      signalContext: {},
      managementContext: {
        entityId: '',
        entityName: '',
        returnTo: '/alert/silence?search=uv_alert_silence_required',
        returnLabel: '',
        matchMode: '',
        matchingRuleType: '',
        matchingRuleIds: [],
        matchedViewEnabled: false
      }
    });
  });

  it('builds silence list url with search', () => {
    expect(buildAlertSilenceUrl('cpu')).toBe('/alert/silences?pageIndex=0&pageSize=8&sort=id&order=desc&search=cpu');
  });

  it('builds silence list url with Angular-compatible page and page-size params', () => {
    expect(buildAlertSilenceUrl({ search: 'cpu', pageIndex: 2, pageSize: 15 })).toBe(
      '/alert/silences?pageIndex=2&pageSize=15&sort=id&order=desc&search=cpu'
    );
  });

  it('falls back to the Angular default page size when an unsupported size is requested', () => {
    expect(buildAlertSilenceUrl({ search: '', pageIndex: -1, pageSize: 20 })).toBe(
      '/alert/silences?pageIndex=0&pageSize=8&sort=id&order=desc'
    );
  });

  it('builds clean silence list url when empty', () => {
    expect(buildAlertSilenceUrl('')).toBe('/alert/silences?pageIndex=0&pageSize=8&sort=id&order=desc');
  });
});
