/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

type QueryOptions = { queryKey?: readonly unknown[]; queryFn?: unknown; refetchInterval?: number | false };
const query = vi.hoisted(() => ({
  skipToken: Symbol('skipToken'),
  useQuery: vi.fn((options: QueryOptions) => options)
}));
vi.mock('@tanstack/react-query', () => ({ skipToken: query.skipToken, useQuery: query.useQuery }));

const api = vi.hoisted(() => ({
  loadFavoriteMetrics: vi.fn(),
  loadHistoryMetric: vi.fn(),
  loadRealtimeMetric: vi.fn()
}));
vi.mock('../api/monitor-api', () => api);

import { useMonitorMetricData } from './use-monitor-metric-data';

const monitor = { id: 7, name: 'checkout', app: 'website', instance: 'prod', status: 1 };
const metric = { key: 'summary.value', group: 'summary', field: 'value' };

describe('useMonitorMetricData refresh interval', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    ['no monitor or metric', undefined, undefined, [false, false, false]],
    ['monitor without metric', monitor, undefined, [true, false, false]],
    ['monitor and historical metric', monitor, metric, [true, true, true]],
    ['monitor and realtime-only metric', monitor, { ...metric, historySupported: false as const }, [true, true, false]]
  ] as const)(
    'enables only safe %s query functions and refresh intervals',
    (_label, currentMonitor, currentMetric, active) => {
      useMonitorMetricData({
        monitor: currentMonitor,
        metric: currentMetric,
        metricKey: currentMetric?.key ?? '',
        history: '30m',
        refreshSeconds: 30
      });

      expect(query.useQuery).toHaveBeenCalledTimes(3);
      query.useQuery.mock.calls.forEach(([options], index) => {
        expect(options.queryFn === query.skipToken).toBe(!active[index]);
        expect(options.refetchInterval).toBe(active[index] ? 30_000 : false);
      });
    }
  );

  it('forwards each query AbortSignal without changing endpoint request inputs', () => {
    useMonitorMetricData({ monitor, metric, metricKey: metric.key, history: '12W', refreshSeconds: 30 });
    const signal = new AbortController().signal;

    queryFunction(0)({ signal });
    queryFunction(1)({ signal });
    queryFunction(2)({ signal });

    expect(api.loadFavoriteMetrics).toHaveBeenCalledWith(7, signal);
    expect(api.loadRealtimeMetric).toHaveBeenCalledWith(7, metric, signal);
    expect(api.loadHistoryMetric).toHaveBeenCalledWith(monitor, metric, '12W', signal);
  });

  it('applies the selected interval to favorites, realtime, and history', () => {
    useMonitorMetricData({ monitor, metric, metricKey: metric.key, history: '30m', refreshSeconds: 30 });

    expect(query.useQuery).toHaveBeenCalledTimes(3);
    for (const [options] of query.useQuery.mock.calls) {
      expect(options).toMatchObject({ refetchInterval: 30_000 });
    }
  });

  it('uses the disabled TanStack interval form for Off', () => {
    useMonitorMetricData({ monitor, metric, metricKey: metric.key, history: '30m', refreshSeconds: 0 });

    expect(query.useQuery).toHaveBeenCalledTimes(3);
    for (const [options] of query.useQuery.mock.calls) {
      expect(options).toMatchObject({ refetchInterval: false });
    }
  });

  it('keeps realtime active but skips history for a realtime-only representative', () => {
    const realtimeOnly = { ...metric, historySupported: false as const };

    useMonitorMetricData({
      monitor,
      metric: realtimeOnly,
      metricKey: realtimeOnly.key,
      history: '30m',
      refreshSeconds: 30
    });

    const realtime = query.useQuery.mock.calls[1]?.[0];
    const historical = query.useQuery.mock.calls[2]?.[0];
    expect(realtime).toMatchObject({ refetchInterval: 30_000 });
    expect(realtime?.queryFn).not.toBe(query.skipToken);
    expect(historical).toMatchObject({ queryFn: query.skipToken, refetchInterval: false });
  });

  it('keeps the exact long range in the history query key', () => {
    useMonitorMetricData({ monitor, metric, metricKey: metric.key, history: '12W', refreshSeconds: 30 });

    expect(query.useQuery.mock.calls[2]?.[0]?.queryKey).toEqual([
      'monitor',
      'metrics',
      'history',
      7,
      'prod',
      'checkout',
      'website',
      undefined,
      'summary.value',
      '12W'
    ]);
  });
});

function queryFunction(index: number) {
  const queryFn = query.useQuery.mock.calls[index]?.[0]?.queryFn;
  if (typeof queryFn !== 'function') throw new Error(`expected query function at index ${index}`);
  return queryFn as (context: { signal: AbortSignal }) => unknown;
}
