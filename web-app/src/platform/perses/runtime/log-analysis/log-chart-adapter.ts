/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
