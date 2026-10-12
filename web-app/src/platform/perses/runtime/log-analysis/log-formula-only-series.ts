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

import type { LogAnalysisResult } from '../../logs/log-analysis';
import { formulaOnlyValues } from '../../logs/log-formula-only';
import { normalizeLogBucketValue } from '../../logs/log-throughput';
import { groupIdentity } from '../../logs/log-grouping';
import { createLogTrendPersesResult } from './log-chart-adapter';

export function formulaOnlySeries(
  data: LogAnalysisResult,
  formula: string,
  hidden: readonly string[],
  groupLabel: (group: LogAnalysisResult['groups'][number]) => string
) {
  const result = createLogTrendPersesResult(
    { start: data.window.start, end: data.window.end, intervalMs: data.intervalMs!, buckets: [] },
    { from: data.window.start, to: data.window.end },
    JSON.stringify({ data, formula })
  );
  result.query.limit = data.groups.length * 2;
  result.outcome.truncated = data.truncated;
  result.outcome.data.series = formulaOnlyValues(data, formula).groups.flatMap(({ group, buckets }) => {
    const name = groupLabel(group);
    const a = hidden.includes('a')
      ? []
      : [
          {
            key: `${groupIdentity(group)}:a`,
            name: `${name} · a`,
            labels: {},
            points: group.buckets.map(bucket => ({
              timestamp: bucket.start,
              value: normalizeLogBucketValue(
                data.measure ? (bucket.measurement?.value ?? null) : bucket.count,
                data.intervalMs!,
                data.transform
              )
            }))
          }
        ];
    const f1 = hidden.includes('formula')
      ? []
      : [
          {
            key: `${groupIdentity(group)}:f1`,
            name: `${name} · f1`,
            labels: {},
            points: buckets.map(bucket => ({ timestamp: bucket.start, value: bucket.value }))
          }
        ];
    return [...a, ...f1];
  });
  return result;
}
