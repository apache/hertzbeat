/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { evaluateQueryFormula, type QueryFormulaNode } from '@/shared/query-context/query-formula';
import type { LogQuerySetCell, LogQuerySetResult } from '../logs/log-query-set-result';
import { normalizeLogBucketValue } from '../logs/log-throughput';

/** Calculates aligned cells; callers own grouping and result validation. */
export function logQuerySetCellValues(
  sources: LogQuerySetResult['sources'],
  formulas: { refId: string; ast: QueryFormulaNode }[],
  cells: LogQuerySetCell[],
  duration: number
) {
  const sourceValues = Object.fromEntries(
    sources.map((source, index) => {
      const cell = cells[index]!;
      return [
        source.refId,
        normalizeLogBucketValue(
          source.analysis.measure ? (cell.measurement?.value ?? null) : cell.count,
          duration,
          source.analysis.transform
        )
      ];
    })
  ) as Record<string, number | null>;
  return Object.assign(
    sourceValues,
    Object.fromEntries(formulas.map(formula => [formula.refId, evaluateQueryFormula(formula.ast, sourceValues)]))
  );
}
