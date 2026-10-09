/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { normalizeLogBucketValue } from './log-throughput';
import { evaluateQueryFormula, parseQueryFormula } from '@/shared/query-context/query-formula';
import type { LogComparisonGroup, LogComparisonResult } from './log-comparison-result';
export type ComparisonSource = 'a' | 'b' | 'formula';
export function comparisonValues(data: LogComparisonResult, buckets = false) {
  const ast = data.formula ? parseQueryFormula(data.formula).ast : undefined;
  return (pair: Pick<LogComparisonGroup, 'a' | 'b'>, source: ComparisonSource): number | null => {
    const value = (id: 'a' | 'b') => {
      const raw = data.analysis.measure ? pair[id].measurement!.value : pair[id].count;
      return buckets ? normalizeLogBucketValue(raw, data.intervalMs!, data.analysis.transform) : raw;
    };
    return source === 'formula'
      ? ast
        ? evaluateQueryFormula(ast, { a: value('a'), b: value('b') })
        : null
      : value(source);
  };
}
