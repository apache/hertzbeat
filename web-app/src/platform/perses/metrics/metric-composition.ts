/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import type { HertzBeatQueryFailure } from '../datasource/hertzbeat-query-contract';
import type { MetricSeries, MetricResultState } from './metric-series';
import type { MetricPlan } from './metric-plan';

export type MetricSourceResult = {
  refId: string;
  state: MetricResultState['kind'];
  failure?: HertzBeatQueryFailure;
  series: MetricSeries[];
  provenance?: { datasource: string | null; queryMode: string | null };
};
export type MetricFormulaResult = {
  id: string;
  expression: string;
  state: 'ready' | 'empty' | 'unavailable';
  reason?: 'source' | 'grouping' | 'labels' | 'unit' | 'samples';
  series: MetricSeries[];
};
export type MetricComposition = {
  plan: MetricPlan;
  sources: MetricSourceResult[];
  formulas: MetricFormulaResult[];
};
export function compositionSeries(composition: MetricComposition) {
  return [...composition.sources, ...composition.formulas].flatMap(result => result.series);
}
