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
