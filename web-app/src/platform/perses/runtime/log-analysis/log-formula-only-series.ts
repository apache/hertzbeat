/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
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
