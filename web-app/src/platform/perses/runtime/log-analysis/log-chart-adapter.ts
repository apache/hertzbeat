/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import type { ExactTimeWindow } from '@/shared/query-context';
import type { HertzBeatMetricQuery } from '../../datasource/hertzbeat-query-contract';
import type { HertzBeatMetricQueryOutcome } from '../hertzbeat-perses-primitives';
type HertzBeatMetricData = Extract<HertzBeatMetricQueryOutcome, { state: 'ready' }>['data'];
export function createLogTrendPersesResult(
  trend: { buckets: { start: number; count: number }[]; start: number; end: number; intervalMs: number },
  timeWindow: ExactTimeWindow,
  runtimeIdentity: string
) {
  const query: HertzBeatMetricQuery = {
    signal: 'metrics',
    queryKind: 'time-series',
    timeWindow,
    metric: { name: 'hertzbeat_log_count' },
    limit: 1
  };
  const data: HertzBeatMetricData = {
    timeWindow,
    source: 'greptime_logs',
    series: [
      {
        key: 'log-count',
        name: 'hertzbeat_log_count',
        labels: {},
        points: trend.buckets.map(bucket => ({ timestamp: bucket.start, value: bucket.count }))
      }
    ]
  };
  return {
    query,
    outcome: { state: 'ready' as const, truncated: false, data },
    runtimeIdentity: `${runtimeIdentity}:trend`
  };
}
