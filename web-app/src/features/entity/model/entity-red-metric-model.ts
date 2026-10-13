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

import type { HertzBeatMetricQueryOutcome } from '@/platform/perses';
import type { ExactTimeWindow } from '@/shared/query-context';

import type { EntityRedPoint, EntityRedReadySignal } from './entity-signal-contract';

export function redMetricOutcomes(red: EntityRedReadySignal) {
  const window = { from: red.window.start, to: red.window.end };
  return {
    requestRate: metricOutcome(
      red,
      window,
      'request_rate_per_second',
      'requests/s',
      point => point.requestRatePerSecond
    ),
    errorRate: metricOutcome(red, window, 'error_rate', 'ratio', point => point.errorRate),
    latencyP95: metricOutcome(red, window, 'latency_p95_ms', 'milliseconds', point => point.latencyP95Ms)
  };
}

function metricOutcome(
  red: EntityRedReadySignal,
  timeWindow: ExactTimeWindow,
  name: string,
  unit: string,
  select: (point: EntityRedPoint) => number | null
): HertzBeatMetricQueryOutcome {
  const points = red.series.flatMap(point => {
    const value = select(point);
    return value == null ? [] : [{ timestamp: point.timestamp, value }];
  });
  if (points.length === 0) return { state: 'empty', truncated: false };
  return {
    state: 'ready',
    truncated: false,
    data: {
      timeWindow,
      source: red.source,
      series: [
        {
          key: `${name}-${red.identity.entityId}`,
          name,
          unit,
          labels: { entity_id: red.identity.entityId, source: red.source },
          points
        }
      ]
    }
  };
}
