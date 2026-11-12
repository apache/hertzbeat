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

import { metricResultState, type MetricSignalEvidence } from '@/features/explore';
import { metricNumber } from '@/platform/perses';
export function dashboardMetricPreview(evidence: MetricSignalEvidence, start: number, end: number) {
  if ('kind' in evidence) return { kind: 'empty' as const };
  if (evidence.composition) {
    if (
      [...evidence.composition.sources, ...evidence.composition.formulas].some(
        item => !['ready', 'empty'].includes(item.state)
      )
    )
      return { kind: 'unavailable' as const };
  } else if (!evidence.context || evidence.context.start !== start || evidence.context.end !== end)
    return { kind: 'unavailable' as const };
  const state = metricResultState(evidence);
  if (state.kind === 'empty') return { kind: 'empty' as const };
  if (state.kind !== 'ready') return { kind: 'unavailable' as const };
  if (state.series.length > 8) return { kind: 'over_budget' as const };
  const series = state.series.map(item => ({
    name: item.name,
    unit: item.unit,
    points: item.points.map(point => {
      const time = metricNumber(point[0]);
      const value = metricNumber(point[1]);
      return time !== undefined && value !== undefined && time >= start && time <= end
        ? ([time, value] as [number, number])
        : null;
    })
  }));
  if (!series.some(item => item.points.some(Boolean))) return { kind: 'empty' as const };
  return { kind: 'ready' as const, series };
}
