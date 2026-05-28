import { describe, expect, it } from 'vitest';
import {
  buildAlertSettingAppEntries,
  buildAlertSettingSearchTerms,
  buildDefineListUrl,
  normalizeDefineSearch,
  readAlertSettingRouteState
} from './query-state';

describe('alert setting query state', () => {
  it('keeps alert-rule define list search under the alert setting route owner', () => {
    expect(normalizeDefineSearch(' cpu > 90 ')).toBe('%5B%22cpu%20%3E%2090%22%5D');
    expect(buildDefineListUrl('cpu > 90')).toBe('/alert/defines?pageIndex=0&pageSize=8&sort=id&order=desc&search=%5B%22cpu%20%3E%2090%22%5D');
    expect(buildDefineListUrl('cpu > 90', 2, 15)).toBe('/alert/defines?pageIndex=2&pageSize=15&sort=id&order=desc&search=%5B%22cpu%20%3E%2090%22%5D');
    expect(buildDefineListUrl('')).toBe('/alert/defines?pageIndex=0&pageSize=8&sort=id&order=desc');
  });

  it('maps localized app labels through the Angular app-entry search contract before querying defines', () => {
    const entries = buildAlertSettingAppEntries({
      mysql: 'MySQL数据库',
      linux: 'Linux主机',
      ignored: 7
    });

    expect(entries).toEqual([
      { key: 'mysql', value: 'MySQL数据库' },
      { key: 'linux', value: 'Linux主机' }
    ]);
    expect(buildAlertSettingSearchTerms(' 数据库 ', entries)).toEqual(['mysql']);
    expect(normalizeDefineSearch('数据库', entries)).toBe('%5B%22mysql%22%5D');
    expect(buildDefineListUrl('数据库', 0, 8, entries)).toBe(
      '/alert/defines?pageIndex=0&pageSize=8&sort=id&order=desc&search=%5B%22mysql%22%5D'
    );
    expect(buildAlertSettingSearchTerms('custom threshold', entries)).toEqual(['custom threshold']);
  });

  it('normalizes multi-value URL search params into the first alert setting evidence context value', () => {
    expect(
      readAlertSettingRouteState({
        signal: ['logs', 'metrics'],
        entityId: ['7', '8'],
        entityName: ['Checkout API', 'Ignored API'],
        serviceName: ['checkout', 'ignored'],
        serviceNamespace: ['commerce', 'ignored'],
        environment: ['prod', 'stage'],
        timeRange: ['last-1h', 'last-6h'],
        source: ['otlp', 'manual'],
        traceId: ['trace-123', 'trace-456'],
        spanId: ['span-123', 'span-456'],
        returnTo: ['/log/manage?traceId=trace-123&returnLabel=Logs', '//evil.example']
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
        returnTo: '/log/manage?traceId=trace-123'
      }
    });
  });

  it('keeps the alert setting route evidence empty when URL context is absent', () => {
    expect(readAlertSettingRouteState()).toEqual({
      signal: null,
      signalContext: {}
    });
  });
});
