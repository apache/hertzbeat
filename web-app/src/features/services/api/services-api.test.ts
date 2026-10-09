/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { apiMessageGet } from '@/core/http/api-message';
import { loadEntities, loadEntityDetail } from '@/features/entity/queries';
import { loadServices, loadServiceDetail, loadServiceOperations, loadServiceTraceFreshness } from './services-api';
vi.mock('@/core/http/api-message', async original => ({
  ...(await original<typeof import('@/core/http/api-message')>()),
  apiMessageGet: vi.fn()
}));
vi.mock('@/features/entity/queries', async original => ({
  ...(await original<typeof import('@/features/entity/queries')>()),
  loadEntities: vi.fn(),
  loadEntityDetail: vi.fn()
}));
const query = { entityId: '7', start: 1750000000000, end: 1750000060000, timeZone: 'UTC' };
beforeEach(() => vi.clearAllMocks());
describe('bounded service reads', () => {
  it.each([null, undefined])(
    'keeps legal empty overview freshness %s unavailable without zero or failure',
    async latestObservedAt => {
      vi.mocked(apiMessageGet).mockResolvedValue({
        totalTraceCount: 0,
        errorTraceCount: 0,
        hasActiveTrace: false,
        ...(latestObservedAt === undefined ? {} : { latestObservedAt })
      });
      expect(await loadServiceTraceFreshness(query)).toBeNull();
    }
  );
  it('rejects missing overview contract instead of inventing no telemetry', async () => {
    vi.mocked(apiMessageGet).mockResolvedValue({});
    await expect(loadServiceTraceFreshness(query)).rejects.toThrow();
  });

  it('keeps an empty catalog distinct from telemetry absence', async () => {
    vi.mocked(loadEntities).mockResolvedValue({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 10 });
    expect(await loadServices({})).toMatchObject({ content: [], totalElements: 0 });
    expect(loadEntities).toHaveBeenCalledWith(expect.objectContaining({ type: 'service', pageSize: 10 }), undefined);
  });
  it('rejects nonservice list and selected identity', async () => {
    vi.mocked(loadEntities).mockResolvedValue({
      content: [{ id: 7, type: 'host' }],
      totalElements: 1,
      totalPages: 1,
      number: 0,
      size: 10
    } as never);
    vi.mocked(loadEntityDetail).mockResolvedValue({ entity: { id: 7, type: 'host' } } as never);
    await expect(loadServices({})).rejects.toThrow('service');
    await expect(loadServiceDetail(7)).rejects.toThrow('service');
  });
  it('reads only bounded root operation groups and preserves nullable latency', async () => {
    vi.mocked(apiMessageGet).mockResolvedValue({
      groupBy: 'operation.name',
      groups: [{ value: 'checkout', traceCount: 3, errorTraceCount: 1, latencyAvgMs: null, latencyP95Ms: null }]
    });
    const signal = new AbortController().signal;
    expect(await loadServiceOperations(query, signal)).toEqual([
      { value: 'checkout', traceCount: 3, errorTraceCount: 1, latencyAvgMs: null, latencyP95Ms: null }
    ]);
    const [path, options] = vi.mocked(apiMessageGet).mock.calls[0]!;
    expect(options).toEqual({ signal });
    const params = new URL(path, 'https://hertzbeat.local').searchParams;
    expect(Object.fromEntries(params)).toEqual({
      entityId: '7',
      start: String(query.start),
      end: String(query.end),
      groupBy: 'operation.name',
      spanScope: 'root',
      orderBy: 'error-count-desc',
      limit: '20',
      minCount: '1'
    });
  });
  it.each([
    { value: 'x', traceCount: 1, errorTraceCount: 2, latencyAvgMs: 0, latencyP95Ms: null },
    { value: 'x', traceCount: 1, errorTraceCount: 0, latencyAvgMs: -1, latencyP95Ms: null }
  ])('rejects impossible group evidence', async group => {
    vi.mocked(apiMessageGet).mockResolvedValue({ groupBy: 'operation.name', groups: [group] });
    await expect(loadServiceOperations(query)).rejects.toThrow();
  });
});
