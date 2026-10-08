/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { beforeEach, expect, it, vi } from 'vitest';
import { apiMessageGet } from '@/core/http/api-message';
import { parseMetricInventory } from './explore-metric-schema';
import { buildMetricLabelsPath, loadMetricLabels } from './explore-metric-labels-api';

vi.mock('@/core/http/api-message', () => ({ apiMessageGet: vi.fn() }));
const query = { signal: 'metrics' as const, timeRange: 'last-30m' as const, query: 'duration_bucket' };
const window = { from: 1000, to: 2000 };
beforeEach(() => vi.clearAllMocks());

it('defaults older inventory metadata to unavailable without inferring sample units', () => {
  const inventory = parseMetricInventory({
    context: null,
    source: 'greptime-inventory',
    limit: 100,
    truncated: false,
    items: [{ metricName: 'duration_seconds_bucket', family: 'latency' }]
  });
  expect(inventory.items[0]?.metadata).toMatchObject({ state: 'unavailable', sampleUnit: null, sampleRole: 'unknown' });
});

it('preserves complete scope and exact evidence time while removing chart-only controls', () => {
  const path = buildMetricLabelsPath(
    {
      ...query,
      entityId: '42',
      serviceName: 'checkout',
      serviceNamespace: 'commerce',
      environment: 'prod',
      operationName: 'GET /checkout',
      metricFilter: 'http_route!=/private',
      instance: 'instance-a',
      endpoint: '/checkout',
      aggregation: 'avg',
      groupBy: 'le',
      step: '60s'
    },
    window,
    'le'
  );
  const url = new URL(path, 'http://localhost');
  expect(url.pathname).toBe('/api/ingestion/otlp/metrics/labels');
  expect(Object.fromEntries(url.searchParams)).toEqual({
    entityId: '42',
    serviceName: 'checkout',
    serviceNamespace: 'commerce',
    environment: 'prod',
    instance: 'instance-a',
    endpoint: '/checkout',
    start: '1000',
    end: '2000',
    query: 'duration_bucket',
    operationName: 'GET /checkout',
    filter: 'http_route!=/private',
    label: 'le',
    limit: '100'
  });
});

it('rejects invalid windows, metric expressions and labels before requesting', async () => {
  expect(() => buildMetricLabelsPath(query, { from: 0, to: 2000 })).toThrow();
  expect(() => buildMetricLabelsPath(query, { from: 2000, to: 1000 })).toThrow();
  expect(() => buildMetricLabelsPath({ ...query, query: 'sum(metric)' }, window)).toThrow();
  await expect(loadMetricLabels(query, window, "label';drop")).rejects.toThrow();
  expect(apiMessageGet).not.toHaveBeenCalled();
});

const context = {
  entityId: null,
  entityType: null,
  entityName: null,
  serviceName: 'checkout',
  serviceNamespace: null,
  environment: null,
  operationName: null,
  start: 1000,
  end: 2000
};
const ready = { context, source: 'greptime-labels', state: 'ready', limit: 100, truncated: false, items: ['le'] };

it('keeps declared histogram unit separate from unknown sample unit', () => {
  const metadata = {
    state: 'available',
    source: 'opentelemetry',
    quality: 'declared',
    originalName: 'http.server.request.duration',
    declaredType: 'histogram',
    declaredUnit: 's',
    temporality: 'cumulative',
    description: null,
    sampleRole: 'unknown',
    sampleUnit: null
  };
  const inventory = parseMetricInventory({
    context: null,
    source: 'greptime-inventory',
    limit: 100,
    truncated: false,
    items: [{ metricName: 'duration_seconds_bucket', family: 'latency', metadata }]
  });
  expect(inventory.items[0]?.metadata).toEqual(metadata);
});

it('passes cancellation and preserves permission failures', async () => {
  const signal = new AbortController().signal;
  vi.mocked(apiMessageGet).mockResolvedValueOnce(ready);
  await expect(loadMetricLabels(query, window, undefined, signal)).resolves.toEqual(ready);
  expect(apiMessageGet).toHaveBeenCalledWith(buildMetricLabelsPath(query, window), { signal });
  const permission = Object.assign(new Error('Forbidden'), { status: 403 });
  vi.mocked(apiMessageGet).mockRejectedValueOnce(permission);
  await expect(loadMetricLabels(query, window)).rejects.toBe(permission);
});

it('rejects stale evidence times, impossible unavailable items, and oversized responses', async () => {
  for (const response of [
    { ...ready, context: { ...context, end: 3000 } },
    { ...ready, state: 'unavailable' },
    { ...ready, items: Array.from({ length: 101 }, () => 'le') }
  ]) {
    vi.mocked(apiMessageGet).mockResolvedValueOnce(response);
    await expect(loadMetricLabels(query, window)).rejects.toThrow();
  }
  vi.mocked(apiMessageGet).mockResolvedValueOnce({ ...ready, state: 'unavailable', items: [] });
  await expect(loadMetricLabels(query, window)).resolves.toMatchObject({ state: 'unavailable', items: [] });
});
