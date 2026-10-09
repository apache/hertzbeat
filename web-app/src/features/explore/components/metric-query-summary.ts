/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import type { TFunction } from 'i18next';
import type { MetricQueryRow } from '@/platform/perses';

export function metricAdvancedSummary(row: MetricQueryRow, t: TFunction) {
  const values: string[] = [];
  if (row.temporalAggregation && row.temporalAggregation !== 'raw')
    values.push(t(`exploreMetric.temporalAggregationValues.${row.temporalAggregation}`));
  if (row.step) values.push(t('explore.metricComposition.stepSummary', { value: row.step }));
  if (row.timeShiftSeconds) values.push(t('explore.metricComposition.shiftSummary', { value: row.timeShiftSeconds }));
  if (row.rollup) values.push(`${row.rollup.aggregation}(${row.rollup.intervalSeconds} s)`);
  if (row.nestedRollup) values.push(`→ ${row.nestedRollup.aggregation}(${row.nestedRollup.intervalSeconds} s)`);
  return values.join(' · ');
}
