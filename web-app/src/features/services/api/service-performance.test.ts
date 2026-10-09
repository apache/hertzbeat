/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { describe, expect, it, vi } from 'vitest';
import { apiMessageGet } from '@/core/http/api-message';
import { loadServicePerformance } from './service-performance';
vi.mock('@/core/http/api-message', () => ({ apiMessageGet: vi.fn() }));
const query = { start: 1000, end: 61000, sort: 'errorCount', order: 'desc', pageIndex: 1 };
const entity = {
  entity: { id: 7, type: 'service', name: 'catalog', displayName: 'Alias' },
  identityCount: 1,
  monitorCount: 0,
  relationCount: 0,
  activeAlertCount: 0
};
const identity = {
  workspaceId: 'default',
  entityId: '7',
  entityType: 'service',
  serviceName: 'checkout',
  serviceNamespace: null,
  deploymentEnvironment: 'prod'
};
const summary = {
  requestCount: 100,
  errorCount: 2,
  errorRate: 0.02,
  requestRatePerSecond: 1,
  latencyAverageMs: null,
  latencyP95Ms: null
};
const page = {
  state: 'ready',
  candidateLimit: 500,
  totalElements: 11,
  pageIndex: 1,
  pageSize: 10,
  sort: 'errorCount',
  order: 'desc',
  window: { start: 1000, end: 61000 },
  population: 'observed_server_spans',
  source: 'greptime_flow',
  resolutionSeconds: 60,
  content: [{ entity, identity, summary, state: 'ready' }]
};
describe('service performance contract', () => {
  it('maps nested existing entity summaries and preserves fractions/null values and server order', async () => {
    vi.mocked(apiMessageGet).mockResolvedValue(page);
    const result = await loadServicePerformance(query);
    expect(result.content[0]).toMatchObject({
      entity: { id: 7, name: 'catalog', displayName: 'Alias' },
      summary: { errorRate: 0.02, latencyP95Ms: null }
    });
    expect(vi.mocked(apiMessageGet).mock.lastCall?.[0]).toContain('pageIndex=1');
  });
  it.each([
    { ...page, state: 'unavailable', totalElements: null },
    { ...page, state: 'scope_too_large', totalElements: 501 },
    { ...page, window: { start: 1, end: 61000 } },
    { ...page, pageSize: 20 },
    { ...page, content: [{ entity, identity: { ...identity, entityId: '8' }, summary, state: 'ready' }] },
    { ...page, content: [{ entity, identity, summary: null, state: 'ready' }] }
  ])('rejects contradictory or mismatched ranking response', async value => {
    vi.mocked(apiMessageGet).mockResolvedValue(value);
    await expect(loadServicePerformance(query)).rejects.toThrow();
  });
});
it.each(['scope_too_large', 'unavailable'] as const)('accepts explicit %s with no ranking', async state => {
  vi.mocked(apiMessageGet).mockResolvedValue({
    ...page,
    state,
    totalElements: state === 'unavailable' ? null : 501,
    content: []
  });
  expect(await loadServicePerformance(query)).toMatchObject({ state, content: [] });
});
it.each(['empty', 'unresolved'] as const)('retains %s as null observation, not zero', async state => {
  vi.mocked(apiMessageGet).mockResolvedValue({
    ...page,
    content: [{ entity, identity: state === 'empty' ? identity : null, state, summary: null }]
  });
  expect((await loadServicePerformance(query)).content[0]?.summary).toBeNull();
});
