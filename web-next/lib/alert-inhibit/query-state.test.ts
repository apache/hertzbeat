import { describe, expect, it } from 'vitest';
import { buildAlertInhibitUrl, readAlertInhibitRouteState } from './query-state';

describe('alert inhibit query state', () => {
  it('normalizes multi-value URL search params into the first alert inhibit evidence context value', () => {
    const returnTo =
      '/topology?viewMode=resource-dependency&sourceKind=database-middleware-connection&edgeId=svc-checkout--res-orders-db&returnLabel=Topology';

    expect(
      readAlertInhibitRouteState({
        source: ['topology', 'manual'],
        signal: ['traces', 'metrics'],
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
        matchingRuleType: ['inhibit', 'silence'],
        matchingRuleIds: ['12, 8, invalid, 12', '7']
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
        signal: 'traces',
        traceId: 'trace-123',
        spanId: 'span-123',
        viewMode: 'resource-dependency',
        sourceKind: 'database-middleware-connection',
        edgeId: 'svc-checkout--res-orders-db'
      },
      signal: 'traces',
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
        matchingRuleType: 'inhibit',
        matchingRuleIds: [12, 8],
        matchedViewEnabled: true
      }
    });
  });

  it('keeps the alert inhibit route evidence empty when URL context is absent', () => {
    expect(readAlertInhibitRouteState()).toEqual({
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

  it('does not treat list metadata as alert inhibit evidence without an explicit signal', () => {
    expect(
      readAlertInhibitRouteState({
        search: 'uv_alert_inhibit_required',
        pageSize: '8',
        source: 'alert-inhibit-required-proof',
        probe: 'validation-loop',
        returnTo: '/alert/inhibit?search=uv_alert_inhibit_required'
      })
    ).toEqual({
      returnContext: {
        search: 'uv_alert_inhibit_required',
        status: 'firing',
        severity: '',
        pageIndex: 0,
        pageSize: 8,
        entityId: '',
        entityName: '',
        returnTo: '/alert/inhibit?search=uv_alert_inhibit_required',
        source: 'alert-inhibit-required-proof'
      },
      signal: null,
      signalContext: {},
      managementContext: {
        entityId: '',
        entityName: '',
        returnTo: '/alert/inhibit?search=uv_alert_inhibit_required',
        returnLabel: '',
        matchMode: '',
        matchingRuleType: '',
        matchingRuleIds: [],
        matchedViewEnabled: false
      }
    });
  });

  it('builds inhibit list url with search', () => {
    expect(buildAlertInhibitUrl('cpu')).toBe('/alert/inhibits?pageIndex=0&pageSize=8&sort=id&order=desc&search=cpu');
  });

  it('builds inhibit list url with Angular-compatible page and page-size params', () => {
    expect(buildAlertInhibitUrl({ search: 'cpu', pageIndex: 2, pageSize: 15 })).toBe(
      '/alert/inhibits?pageIndex=2&pageSize=15&sort=id&order=desc&search=cpu'
    );
  });

  it('falls back to the Angular default page size when an unsupported size is requested', () => {
    expect(buildAlertInhibitUrl({ search: '', pageIndex: -1, pageSize: 20 })).toBe(
      '/alert/inhibits?pageIndex=0&pageSize=8&sort=id&order=desc'
    );
  });

  it('builds clean inhibit list url when empty', () => {
    expect(buildAlertInhibitUrl('')).toBe('/alert/inhibits?pageIndex=0&pageSize=8&sort=id&order=desc');
  });
});
