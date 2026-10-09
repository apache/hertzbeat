/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import type { TFunction } from 'i18next';
import { isLogPercentile, type LogMeasure, type LogMeasurement } from '../../logs/log-measure';
import { type LogComparisonGroup } from '../../logs/log-comparison-result';
import { type ComparisonSource } from '../../logs/log-comparison-values';

import { logGroupingFieldLabel } from './log-grouping-display';
import { LogMeasureValue } from './log-measure-value';
import styles from './log-additional-measures.module.css';
export function AdditionalMeasureHeaders({
  measures,
  t,
  paired = false
}: {
  measures: LogMeasure[] | undefined;
  t: TFunction;
  paired?: boolean;
}) {
  return measures?.map(measure => (
    <th
      data-log-stat
      style={{ width: paired ? 170 : 140 }}
      key={JSON.stringify(measure)}
      title={`${measure.function}(${measure.field})`}
    >
      {t(`explore.logAnalysis.${measure.function}`)}
      <br />
      <span className={styles.heading}>{logGroupingFieldLabel(measure.field, t)}</span>
    </th>
  ));
}
function MeasureSample({
  measure,
  value,
  t,
  source
}: {
  measure: LogMeasure;
  value: LogMeasurement;
  t: TFunction;
  source?: string;
}) {
  return (
    <span className={styles.sample}>
      <span>
        {source && <strong>{source}: </strong>}
        <LogMeasureValue measurement={value} approximate={isLogPercentile(measure)} t={t} />
      </span>
      <small>{t('explore.logAnalysis.sampleCount', { count: value.sampleCount })}</small>
    </span>
  );
}
export function AdditionalMeasureCells({
  measures,
  values,
  t
}: {
  measures: LogMeasure[] | undefined;
  values: LogMeasurement[] | undefined;
  t: TFunction;
}) {
  return measures?.map((measure, index) => (
    <td data-log-stat key={JSON.stringify(measure)}>
      <MeasureSample measure={measure} value={values![index]!} t={t} />
    </td>
  ));
}
export function AdditionalComparisonCells({
  measures,
  group,
  visible,
  t
}: {
  measures: LogMeasure[] | undefined;
  group: LogComparisonGroup;
  visible: ComparisonSource[];
  t: TFunction;
}) {
  return measures?.map((measure, index) => (
    <td data-log-stat key={JSON.stringify(measure)}>
      {(['a', 'b'] as const)
        .filter(source => visible.includes(source))
        .map(source => (
          <MeasureSample
            key={source}
            source={source}
            measure={measure}
            value={group[source].additionalMeasurements![index]!}
            t={t}
          />
        ))}
    </td>
  ));
}
