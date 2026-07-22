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

import type { ExploreQuery, ExploreQueryPatch } from './explore-model';
import {
  isOrderedTraceDurationRange,
  parseMetricAggregation,
  parseMetricStep,
  parseTraceDuration
} from './explore-field-contract';

export { EXPLORE_METRIC_AGGREGATIONS } from './explore-field-contract';

type SharedExploreSubmissionDraft = {
  serviceName: string;
  environment: string;
  instance: string;
  endpoint: string;
  query: string;
};

export type MetricExploreSubmissionDraft = SharedExploreSubmissionDraft & {
  signal: 'metrics';
  metricFilter: string;
  groupBy: string;
  aggregation: string;
  stepSeconds: string;
};

export type LogExploreSubmissionDraft = SharedExploreSubmissionDraft & {
  signal: 'logs';
  severityText: string;
  traceId: string;
  spanId: string;
  resourceFilter: string;
  attributeFilter: string;
};

export type TraceExploreSubmissionDraft = SharedExploreSubmissionDraft & {
  signal: 'traces';
  traceId: string;
  resourceFilter: string;
  minDurationMs: string;
  maxDurationMs: string;
  errorOnly: boolean;
};

export type ExploreSubmissionDraft =
  MetricExploreSubmissionDraft | LogExploreSubmissionDraft | TraceExploreSubmissionDraft;

type ExploreSubmissionError =
  | { field: 'aggregation'; code: 'unsupported_aggregation' }
  | { field: 'stepSeconds'; code: 'invalid_step' }
  | { field: 'minDurationMs' | 'maxDurationMs'; code: 'invalid_duration' }
  | { field: 'maxDurationMs'; code: 'min_exceeds_max' };

type KeysOfUnion<T> = T extends unknown ? keyof T : never;
export type ExploreDraftField = Exclude<KeysOfUnion<ExploreSubmissionDraft>, 'signal'>;

export type ExploreDraftFieldUpdate = {
  [Field in ExploreDraftField]: {
    field: Field;
    value: Field extends 'errorOnly' ? boolean : string;
  };
}[ExploreDraftField];

export type ExploreSubmissionErrors = Partial<Record<ExploreSubmissionError['field'], ExploreSubmissionError['code']>>;

export type ExploreSubmissionViewModel = {
  draft: ExploreSubmissionDraft;
  errors: ExploreSubmissionErrors;
  updateField: (update: ExploreDraftFieldUpdate) => void;
  submit: () => void;
  removeFilter: (key: keyof ExploreQueryPatch) => boolean;
};

export type ExploreSubmissionResult =
  { valid: true; patch: ExploreQueryPatch } | { valid: false; errors: ExploreSubmissionError[] };

export function draftFromQuery(query: ExploreQuery): ExploreSubmissionDraft {
  if (query.signal === 'metrics') return metricDraftFromQuery(query);
  if (query.signal === 'logs') return logDraftFromQuery(query);
  return traceDraftFromQuery(query);
}

export function buildSubmissionPatch(draft: ExploreSubmissionDraft): ExploreSubmissionResult {
  if (draft.signal === 'metrics') return buildMetricSubmissionPatch(draft);
  if (draft.signal === 'logs') return buildLogSubmissionPatch(draft);
  return buildTraceSubmissionPatch(draft);
}

function metricDraftFromQuery(query: Extract<ExploreQuery, { signal: 'metrics' }>): MetricExploreSubmissionDraft {
  return {
    ...sharedDraftFromQuery(query),
    signal: 'metrics',
    metricFilter: query.metricFilter ?? '',
    groupBy: query.groupBy ?? '',
    aggregation: query.aggregation ?? '',
    stepSeconds: query.step ?? ''
  };
}

function logDraftFromQuery(query: Extract<ExploreQuery, { signal: 'logs' }>): LogExploreSubmissionDraft {
  return {
    ...sharedDraftFromQuery(query),
    signal: 'logs',
    severityText: query.severityText ?? '',
    traceId: query.traceId ?? '',
    spanId: query.spanId ?? '',
    resourceFilter: query.resourceFilter ?? '',
    attributeFilter: query.attributeFilter ?? ''
  };
}

function traceDraftFromQuery(query: Extract<ExploreQuery, { signal: 'traces' }>): TraceExploreSubmissionDraft {
  return {
    ...sharedDraftFromQuery(query),
    signal: 'traces',
    traceId: query.traceId ?? '',
    resourceFilter: query.resourceFilter ?? '',
    minDurationMs: query.minDurationMs == null ? '' : String(query.minDurationMs),
    maxDurationMs: query.maxDurationMs == null ? '' : String(query.maxDurationMs),
    errorOnly: Boolean(query.errorOnly)
  };
}

function sharedDraftFromQuery(query: ExploreQuery): SharedExploreSubmissionDraft {
  return {
    serviceName: query.serviceName ?? '',
    environment: query.environment ?? '',
    instance: query.instance ?? '',
    endpoint: query.endpoint ?? '',
    query: query.query ?? ''
  };
}

function buildMetricSubmissionPatch(draft: MetricExploreSubmissionDraft): ExploreSubmissionResult {
  const aggregation = parseMetricAggregation(draft.aggregation);
  const step = parseMetricStep(draft.stepSeconds);
  const errors: ExploreSubmissionError[] = [];
  if (!aggregation.valid) {
    errors.push({ field: 'aggregation', code: 'unsupported_aggregation' });
  }
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
      step: step.valid ? step.value : undefined,
      pageIndex: undefined
    }
  };
}

function buildLogSubmissionPatch(draft: LogExploreSubmissionDraft): ExploreSubmissionResult {
  return {
    valid: true,
    patch: {
      ...sharedSubmissionPatch(draft),
      severityText: normalizedValue(draft.severityText),
      traceId: normalizedValue(draft.traceId),
      spanId: normalizedValue(draft.spanId),
      resourceFilter: normalizedValue(draft.resourceFilter),
      attributeFilter: normalizedValue(draft.attributeFilter),
      pageIndex: undefined
    }
  };
}

function buildTraceSubmissionPatch(draft: TraceExploreSubmissionDraft): ExploreSubmissionResult {
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
      traceId: normalizedValue(draft.traceId),
      resourceFilter: normalizedValue(draft.resourceFilter),
      minDurationMs: minDuration.value,
      maxDurationMs: maxDuration.value,
      errorOnly: draft.errorOnly || undefined,
      pageIndex: undefined
    }
  };
}

function sharedSubmissionPatch(draft: SharedExploreSubmissionDraft): ExploreQueryPatch {
  return {
    serviceName: normalizedValue(draft.serviceName),
    environment: normalizedValue(draft.environment),
    instance: normalizedValue(draft.instance),
    endpoint: normalizedValue(draft.endpoint),
    query: normalizedValue(draft.query)
  };
}

function normalizedValue(value: string) {
  const normalized = value.trim();
  return normalized || undefined;
}
