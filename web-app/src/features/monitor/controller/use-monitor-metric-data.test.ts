/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const query = vi.hoisted(() => ({ useQuery: vi.fn((options: object) => options) }));
vi.mock('@tanstack/react-query', () => ({ skipToken: Symbol('skipToken'), useQuery: query.useQuery }));

import { useMonitorMetricData } from './use-monitor-metric-data';

const monitor = { id: 7, name: 'checkout', app: 'website', instance: 'prod', status: 1 };
const metric = { key: 'summary.value', group: 'summary', field: 'value' };

describe('useMonitorMetricData refresh interval', () => {
  beforeEach(() => query.useQuery.mockClear());

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
});
