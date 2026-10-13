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

import { parseMetricPlan, validateMetricPlan, parseLogAnalysis } from '@/platform/perses';
import { parseTraceStructure } from './explore-trace-structure';
import { logModeError, logFilterError } from './explore-log-submission-validation';

import { readValue as normalizedValue } from './explore-url-values';
import { sharedSubmissionPatch } from './explore-submission-shared';
import {
  isOrderedTraceDurationRange,
  parseMetricAggregation,
  parseMetricStep,
  parseTraceDuration
} from './explore-field-contract';
import {
  enabledFilterValue,
  temporalAggregationValue,
  traceSortValue,
  traceSpanScopeValue
} from './explore-parity-filter-model';

export { EXPLORE_METRIC_AGGREGATIONS } from './explore-field-contract';

export type * from './explore-submission-types';
import type {
  ExploreSubmissionError,
  MetricExploreSubmissionDraft,
  LogExploreSubmissionDraft,
  TraceExploreSubmissionDraft,
  ExploreSubmissionDraft,
  ExploreSubmissionResult
} from './explore-submission-types';

export { draftFromQuery } from './explore-submission-draft';

export function buildSubmissionPatch(draft: ExploreSubmissionDraft): ExploreSubmissionResult {
  if (draft.signal === 'metrics') return buildMetricSubmissionPatch(draft);
  if (draft.signal === 'logs') return buildLogSubmissionPatch(draft);
  return buildTraceSubmissionPatch(draft);
}

function buildMetricSubmissionPatch(draft: MetricExploreSubmissionDraft): ExploreSubmissionResult {
  if (draft.metricPlan) return buildCompositionSubmissionPatch(draft);
  const aggregation = parseMetricAggregation(draft.aggregation);
  const step = parseMetricStep(draft.stepSeconds);
  const errors: ExploreSubmissionError[] = [];
  if (!aggregation.valid) errors.push({ field: 'aggregation', code: 'unsupported_aggregation' });
  if (!step.valid) {
    errors.push({ field: 'stepSeconds', code: 'invalid_step' });
  }
  if (errors.length) return { valid: false, errors };
  return {
    valid: true,
    patch: {
      ...sharedSubmissionPatch(draft),
      metricFilter: normalizedValue(draft.metricFilter),
      groupBy: normalizedValue(draft.groupBy),
      aggregation: aggregation.valid ? aggregation.value : undefined,
      temporalAggregation: temporalAggregationValue(draft.temporalAggregation.trim()),
      step: step.valid ? step.value : undefined,
      pageIndex: undefined
    }
  };
}

function buildLogSubmissionPatch(draft: LogExploreSubmissionDraft): ExploreSubmissionResult {
  const failure = logModeError(draft) ?? logFilterError(draft);
  if (failure) return { valid: false, errors: [failure] };
  const querySet = draft.logAnalysis ? parseLogAnalysis(draft.logAnalysis).querySet : undefined;
  return {
    valid: true,
    patch: {
      ...sharedSubmissionPatch(draft),
      ...(querySet ? { query: undefined } : {}),
      sort: draft.sort,
      logSort: draft.logSort,
      logAnalysis: draft.logAnalysis,
      logAggregation: draft.logAggregation,
      logTransactions: draft.logTransactions,
      logCalculated: draft.logCalculated,
      logCalculatedV2: draft.logCalculatedV2,
      logSubquery: draft.logSubquery,
      logReferenceJoin: draft.logReferenceJoin,
      logGroupSelection: draft.logGroupSelection,
      logNumericRange: draft.logNumericRange,
      searchSyntax: querySet ? undefined : normalizedValue(draft.searchSyntax ?? ''),
      severityText: normalizedValue(draft.severityText),
      severityCategory: normalizedValue(draft.severityCategory ?? ''),
      traceId: normalizedValue(draft.traceId),
      spanId: normalizedValue(draft.spanId),
      resourceFilter: normalizedValue(draft.resourceFilter),
      attributeFilter: normalizedValue(draft.attributeFilter),
      hideInternal: enabledFilterValue(draft.hideInternal),
      hideNoise: enabledFilterValue(draft.hideNoise),
      pageIndex: undefined
    }
  };
}

function buildTraceSubmissionPatch(draft: TraceExploreSubmissionDraft): ExploreSubmissionResult {
  if (draft.traceStructure !== undefined) {
    if (!parseTraceStructure(draft.traceStructure)) {
      return { valid: false, errors: [{ field: 'traceStructure', code: 'invalid_trace_structure' }] };
    }
    if (hasTraceStructureConflict(draft))
      return { valid: false, errors: [{ field: 'traceStructure', code: 'trace_structure_conflict' }] };
    return {
      valid: true,
      patch: {
        ...sharedSubmissionPatch(draft),
        traceStructure: draft.traceStructure,
        traceId: undefined,
        resourceFilter: undefined,
        attributeFilter: undefined,
        minDurationMs: undefined,
        maxDurationMs: undefined,
        errorOnly: undefined,
        sort: undefined,
        spanScope: undefined,
        hideInternal: undefined,
        traceView: undefined,
        endExclusive: undefined,
        pageIndex: undefined,
        traceStructureView: undefined
      }
    };
  }
  const minDuration = parseTraceDuration(draft.minDurationMs);
  const maxDuration = parseTraceDuration(draft.maxDurationMs);
  const errors: ExploreSubmissionError[] = [];
  if (!minDuration.valid) errors.push({ field: 'minDurationMs', code: 'invalid_duration' });
  if (!maxDuration.valid) errors.push({ field: 'maxDurationMs', code: 'invalid_duration' });
  if (!minDuration.valid || !maxDuration.valid) return { valid: false, errors };
  if (!isOrderedTraceDurationRange(minDuration.value, maxDuration.value)) {
    return { valid: false, errors: [{ field: 'maxDurationMs', code: 'min_exceeds_max' }] };
  }
  return {
    valid: true,
    patch: {
      ...sharedSubmissionPatch(draft),
      traceStructure: undefined,
      traceStructureView: undefined,
      traceId: normalizedValue(draft.traceId),
      resourceFilter: normalizedValue(draft.resourceFilter),
      attributeFilter: normalizedValue(draft.attributeFilter),
      minDurationMs: minDuration.value,
      maxDurationMs: maxDuration.value,
      errorOnly: draft.errorOnly || undefined,
      sort: traceSortValue(draft.sort),
      spanScope: traceSpanScopeValue(draft.spanScope.trim()),
      hideInternal: enabledFilterValue(draft.hideInternal),
      pageIndex: undefined
    }
  };
}

function hasTraceStructureConflict(draft: TraceExploreSubmissionDraft) {
  return (
    [
      draft.serviceName,
      draft.serviceNamespace,
      draft.environment,
      draft.instance,
      draft.endpoint,
      draft.query,
      draft.traceId,
      draft.resourceFilter,
      draft.attributeFilter,
      draft.minDurationMs,
      draft.maxDurationMs,
      draft.spanScope
    ].some(Boolean) ||
    draft.errorOnly ||
    draft.hideInternal ||
    draft.sort !== 'newest'
  );
}

function buildCompositionSubmissionPatch(draft: MetricExploreSubmissionDraft): ExploreSubmissionResult {
  try {
    const plan = parseMetricPlan(draft.metricPlan);
    if (validateMetricPlan(plan).length) throw new Error('Invalid metric plan');
    const first = plan.queries[0]!;
    return {
      valid: true,
      patch: {
        ...sharedSubmissionPatch(draft),
        metricPlan: draft.metricPlan,
        query: first.metric,
        metricFilter: first.metricFilter,
        groupBy: first.groupBy,
        aggregation: first.aggregation,
        temporalAggregation: first.temporalAggregation,
        step: first.step,
        pageIndex: undefined
      }
    };
  } catch {
    return { valid: false, errors: [{ field: 'metricPlan', code: 'invalid_metric_plan' }] };
  }
}
