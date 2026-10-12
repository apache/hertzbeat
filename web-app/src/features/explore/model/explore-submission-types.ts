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

import type { ExploreQueryPatch } from './explore-query';

export type SharedExploreSubmissionDraft = {
  source?: string;
  serviceName: string;
  serviceNamespace: string;
  environment: string;
  instance: string;
  endpoint: string;
  query: string;
};

export type MetricExploreSubmissionDraft = SharedExploreSubmissionDraft & {
  signal: 'metrics';
  metricPlan: string;
  metricFilter: string;
  groupBy: string;
  aggregation: string;
  temporalAggregation: string;
  stepSeconds: string;
};

export type LogExploreSubmissionDraft = SharedExploreSubmissionDraft & {
  signal: 'logs';
  sort?: string | undefined;
  logSort?: string | undefined;
  logAnalysis?: string | undefined;
  logAggregation?: string | undefined;
  logTransactions?: string | undefined;
  logCalculated?: string | undefined;
  logCalculatedV2?: string | undefined;
  logSubquery?: string | undefined;
  logReferenceJoin?: string | undefined;
  logGroupSelection?: string | undefined;
  logNumericRange?: string | undefined;
  searchSyntax?: string;
  severityText: string;
  severityCategory?: string;
  traceId: string;
  spanId: string;
  resourceFilter: string;
  attributeFilter: string;
  hideInternal: boolean;
  hideNoise: boolean;
};

export type TraceExploreSubmissionDraft = SharedExploreSubmissionDraft & {
  signal: 'traces';
  traceStructure?: string | undefined;
  sort: string;
  traceId: string;
  resourceFilter: string;
  attributeFilter: string;
  minDurationMs: string;
  maxDurationMs: string;
  errorOnly: boolean;
  spanScope: string;
  hideInternal: boolean;
};

export type ExploreSubmissionDraft =
  MetricExploreSubmissionDraft | LogExploreSubmissionDraft | TraceExploreSubmissionDraft;

export type ExploreSubmissionError =
  | { field: 'query'; code: 'unclosed_quote' }
  | { field: 'metricPlan'; code: 'invalid_metric_plan' }
  | { field: 'logSort'; code: 'invalid_log_sort' }
  | { field: 'logAnalysis'; code: 'invalid_log_analysis' }
  | { field: 'logTransactions'; code: 'invalid_log_transactions' }
  | { field: 'logCalculated'; code: 'invalid_log_calculated' }
  | { field: 'logCalculatedV2'; code: 'invalid_log_calculated_v2' }
  | { field: 'logSubquery'; code: 'invalid_log_subquery' }
  | { field: 'logReferenceJoin'; code: 'retired_log_reference_join' }
  | { field: 'logGroupSelection'; code: 'invalid_log_group_selection' }
  | { field: 'logNumericRange'; code: 'invalid_log_numeric_range' }
  | { field: 'aggregation'; code: 'unsupported_aggregation' }
  | { field: 'stepSeconds'; code: 'invalid_step' }
  | { field: 'minDurationMs' | 'maxDurationMs'; code: 'invalid_duration' }
  | { field: 'maxDurationMs'; code: 'min_exceeds_max' }
  | { field: 'traceStructure'; code: 'invalid_trace_structure' | 'trace_structure_conflict' };

type KeysOfUnion<T> = T extends unknown ? keyof T : never;
export type ExploreDraftField = Exclude<KeysOfUnion<ExploreSubmissionDraft>, 'signal'>;

export type ExploreDraftFieldUpdate = {
  [Field in ExploreDraftField]: {
    field: Field;
    value: Field extends
      | 'logSort'
      | 'logNumericRange'
      | 'logTransactions'
      | 'logCalculated'
      | 'logCalculatedV2'
      | 'logSubquery'
      | 'logReferenceJoin'
      | 'traceStructure'
      ? string | undefined
      : Field extends 'errorOnly' | 'hideInternal' | 'hideNoise'
        ? boolean
        : string;
  };
}[ExploreDraftField];

export type ExploreSubmissionErrors = Partial<Record<ExploreSubmissionError['field'], ExploreSubmissionError['code']>>;

export type ExploreSubmissionViewModel = {
  draft: ExploreSubmissionDraft;
  errors: ExploreSubmissionErrors;
  updateField: (update: ExploreDraftFieldUpdate) => void;
  submit: () => void;
  applyLogPatch: (patch: ExploreQueryPatch) => boolean;
  resetDraft: () => void;
  removeFilters: (keys: readonly (keyof ExploreQueryPatch)[]) => boolean;
  removeFilter: (key: keyof ExploreQueryPatch) => boolean;
};

export type ExploreSubmissionResult =
  { valid: true; patch: ExploreQueryPatch } | { valid: false; errors: ExploreSubmissionError[] };
