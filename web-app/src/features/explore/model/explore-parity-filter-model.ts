/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type {
  ExploreQueryPatch,
  MetricRollupControl,
  MetricTemporalAggregation,
  TraceSort,
  TraceSpanScope
} from './explore-query';

export const METRIC_TEMPORAL_AGGREGATIONS: MetricTemporalAggregation[] = ['raw', 'rate', 'increase', 'delta'];
export const TRACE_SPAN_SCOPES: TraceSpanScope[] = ['root', 'entrypoint'];

export function temporalAggregationValue(value: unknown): MetricTemporalAggregation | MetricRollupControl | undefined {
  if (METRIC_TEMPORAL_AGGREGATIONS.includes(value as MetricTemporalAggregation))
    return value as MetricTemporalAggregation;
  // Keep unsupported standalone controls visible to the plan guard instead of silently querying raw samples.
  if (typeof value === 'string' && value.length <= 128 && (value.startsWith('rollup_') || value.startsWith('nested_')))
    return value as MetricRollupControl;
  return undefined;
}

export function traceSpanScopeValue(value: unknown): TraceSpanScope | undefined {
  return TRACE_SPAN_SCOPES.includes(value as TraceSpanScope) ? (value as TraceSpanScope) : undefined;
}

export function enabledFilterValue(value: unknown) {
  return value === true || value === 'true' ? true : undefined;
}

export function traceSortValue(value: unknown): TraceSort {
  return value === 'duration_desc' ? 'duration_desc' : 'newest';
}

export function metricQueryFields(query: ExploreQueryPatch) {
  return {
    operationName: query.operationName,
    metricPlan: query.metricPlan,
    metricView: query.metricView,
    metricFilter: query.metricFilter,
    groupBy: query.groupBy,
    aggregation: query.aggregation,
    temporalAggregation: temporalAggregationValue(query.temporalAggregation),
    step: query.step
  };
}
