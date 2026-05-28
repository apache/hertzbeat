import { describe, expect, it } from 'vitest';

import { queryKeys } from './query-keys';

describe('query keys', () => {
  it('uses stable domain-scoped monitor keys', () => {
    expect(queryKeys.monitors.list({ pageIndex: 0, pageSize: 8, status: '' })).toEqual([
      'monitors',
      'list',
      { pageIndex: 0, pageSize: 8 }
    ]);
    expect(queryKeys.monitors.detail(42)).toEqual(['monitors', 'detail', '42']);
  });

  it('preserves topology context without empty values', () => {
    expect(queryKeys.topology.graph({ entityId: '501', sourceKind: 'otlp-trace-call', environment: '' })).toEqual([
      'topology',
      'graph',
      { entityId: '501', sourceKind: 'otlp-trace-call' }
    ]);
  });

  it('uses a stable overview console key and strips empty refresh dimensions', () => {
    expect(queryKeys.overview.console({ summary: '/summary', alerts: '/alerts', refreshNonce: 0, empty: '' })).toEqual([
      'overview',
      'console',
      { summary: '/summary', alerts: '/alerts', refreshNonce: 0 }
    ]);
  });

  it('uses stable monitor history keys from the monitor YAML metric catalog', () => {
    expect(queryKeys.monitors.history(501, 'summary.responseTime', { history: '1h', interval: false, empty: '' })).toEqual([
      'monitors',
      'history',
      '501',
      'summary.responseTime',
      { history: '1h', interval: false }
    ]);
  });
});
