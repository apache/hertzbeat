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
