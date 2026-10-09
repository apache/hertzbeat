/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import type { LogAnalysisState } from '@/platform/perses';

export function calculatedGroupByAnalysis(current: LogAnalysisState, name: string): LogAnalysisState | undefined {
  if (hasUnsupportedAnalysis(current)) return undefined;
  const field = `calculated:${name}`;
  const dimensions =
    current.grouping?.dimensions ?? (current.field ? [{ field: current.field, limit: current.limit }] : []);
  if (dimensions.some(item => item.field === field)) return { ...current, representation: 'timeseries' };
  if (dimensions.length >= 4) return undefined;
  if (!dimensions.length) return { ...current, representation: 'timeseries', field, limit: 20 };
  const budget = Math.floor(100 / current.limit);
  if (budget < 2) return undefined;
  const next = [...dimensions, { field, limit: Math.min(20, budget) }];
  const rest = { ...current };
  delete rest.field;
  return {
    ...rest,
    representation: 'timeseries',
    grouping: { version: 1, dimensions: next },
    limit: next.reduce((product, item) => product * item.limit, 1)
  };
}

function hasUnsupportedAnalysis(current: LogAnalysisState) {
  return Boolean(current.transform || current.additionalMeasures?.length || current.comparison || current.querySet);
}
