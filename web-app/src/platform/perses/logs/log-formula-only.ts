/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import type { LogAnalysisResult } from './log-analysis';
import { normalizeLogBucketValue } from './log-throughput';
import { evaluateQueryFormula, parseQueryFormula } from '@/shared/query-context/query-formula';

export function formulaOnlyValues(data: LogAnalysisResult, formula: string) {
  const ast = parseQueryFormula(formula).ast;
  const evaluate = (value: number | null) => evaluateQueryFormula(ast, { a: value });
  const durationMs = data.window.end - data.window.start;
  return {
    truncated: data.truncated,
    groups: data.groups.map(group => {
      const a = normalizeLogBucketValue(
        data.measure ? (group.measurement?.value ?? null) : group.count,
        durationMs,
        data.transform
      );
      return {
        group,
        a,
        value: evaluate(a),
        buckets: group.buckets.map(bucket => ({
          start: bucket.start,
          value: evaluate(
            normalizeLogBucketValue(
              data.measure ? (bucket.measurement?.value ?? null) : bucket.count,
              data.intervalMs!,
              data.transform
            )
          )
        }))
      };
    })
  };
}
