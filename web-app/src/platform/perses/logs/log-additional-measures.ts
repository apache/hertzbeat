/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { z } from 'zod';
import {
  logMeasureSchema,
  logMeasurementSchema,
  sameLogMeasure,
  validLogMeasurement,
  type LogMeasure,
  type LogMeasurement
} from './log-measure';
export const additionalMeasuresSchema = z.array(logMeasureSchema).min(1).max(3).optional();
export const additionalMeasurementsSchema = z.array(logMeasurementSchema).min(1).max(3).optional();
export function validAdditionalMeasures(value: {
  measure?: LogMeasure | null | undefined;
  additionalMeasures?: LogMeasure[] | undefined;
}) {
  const list = value.additionalMeasures;
  return (
    list === undefined ||
    (list.length > 0 &&
      list.length <= 3 &&
      list.every(
        (measure, index) =>
          !sameLogMeasure(measure, value.measure ?? undefined) &&
          !list.slice(0, index).some(other => sameLogMeasure(measure, other))
      ))
  );
}
export function requestedAdditionalMeasures(value: {
  representation: string;
  additionalMeasures?: LogMeasure[] | undefined;
}) {
  return value.representation === 'table' ? value.additionalMeasures : undefined;
}
export function sameAdditionalMeasures(a: LogMeasure[] | undefined, b: LogMeasure[] | undefined) {
  return a === undefined || b === undefined
    ? a === b
    : a.length === b.length && a.every((measure, index) => sameLogMeasure(measure, b[index]));
}
export function validAdditionalMeasurements(
  measures: LogMeasure[] | undefined,
  values: LogMeasurement[] | undefined,
  count: number
) {
  return measures === undefined
    ? values === undefined
    : values !== undefined &&
        measures.length === values.length &&
        measures.every((measure, index) => validLogMeasurement(measure, values[index], count));
}
export function validAdditionalResult(value: {
  view: string;
  measure?: LogMeasure | null | undefined;
  additionalMeasures?: LogMeasure[] | undefined;
}) {
  return validAdditionalMeasures(value) && (value.view === 'groups' || value.additionalMeasures === undefined);
}
