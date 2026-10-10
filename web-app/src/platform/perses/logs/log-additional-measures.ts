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
