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

import type { ExploreQuery } from './explore-query';
import { traceSortValue } from './explore-parity-filter-model';
import type {
  SharedExploreSubmissionDraft,
  ExploreSubmissionDraft,
  MetricExploreSubmissionDraft,
  LogExploreSubmissionDraft,
  TraceExploreSubmissionDraft
} from './explore-submission-types';

export function draftFromQuery(query: ExploreQuery): ExploreSubmissionDraft {
  if (query.signal === 'metrics') return metricDraftFromQuery(query);
  if (query.signal === 'logs') return logDraftFromQuery(query);
  return traceDraftFromQuery(query);
}

function metricDraftFromQuery(query: Extract<ExploreQuery, { signal: 'metrics' }>): MetricExploreSubmissionDraft {
  return {
    ...sharedDraftFromQuery(query),
    signal: 'metrics',
    metricPlan: query.metricPlan ?? '',
    metricFilter: query.metricFilter ?? '',
    groupBy: query.groupBy ?? '',
    aggregation: query.aggregation ?? '',
    temporalAggregation: query.temporalAggregation ?? '',
    stepSeconds: query.step ?? ''
  };
}

function logDraftFromQuery(query: Extract<ExploreQuery, { signal: 'logs' }>): LogExploreSubmissionDraft {
  return {
    ...sharedDraftFromQuery(query),
    signal: 'logs',
    sort: query.sort ?? 'newest',
    logSort: query.logSort,
    logAnalysis: query.logAnalysis,
    logAggregation: query.logAggregation,
    logTransactions: query.logTransactions,
    logCalculated: query.logCalculated,
    logCalculatedV2: query.logCalculatedV2,
    logSubquery: query.logSubquery,
    logReferenceJoin: query.logReferenceJoin,
    logGroupSelection: query.logGroupSelection,
    logNumericRange: query.logNumericRange,
    searchSyntax: query.searchSyntax ?? '',
    severityText: query.severityText ?? '',
    severityCategory: query.severityCategory ?? '',
    traceId: query.traceId ?? '',
    spanId: query.spanId ?? '',
    resourceFilter: query.resourceFilter ?? '',
    attributeFilter: query.attributeFilter ?? '',
    hideInternal: Boolean(query.hideInternal),
    hideNoise: Boolean(query.hideNoise)
  };
}

function traceDraftFromQuery(query: Extract<ExploreQuery, { signal: 'traces' }>): TraceExploreSubmissionDraft {
  return {
    ...sharedDraftFromQuery(query),
    signal: 'traces',
    traceStructure: query.traceStructure,
    sort: traceSortValue(query.sort),
    traceId: query.traceId ?? '',
    resourceFilter: query.resourceFilter ?? '',
    attributeFilter: query.attributeFilter ?? '',
    minDurationMs: query.minDurationMs == null ? '' : String(query.minDurationMs),
    maxDurationMs: query.maxDurationMs == null ? '' : String(query.maxDurationMs),
    errorOnly: Boolean(query.errorOnly),
    spanScope: query.spanScope ?? '',
    hideInternal: Boolean(query.hideInternal)
  };
}

function sharedDraftFromQuery(query: ExploreQuery): SharedExploreSubmissionDraft {
  return {
    ...(query.source ? { source: query.source } : {}),
    serviceName: query.serviceName ?? '',
    serviceNamespace: query.serviceNamespace ?? '',
    environment: query.environment ?? '',
    instance: query.instance ?? '',
    endpoint: query.endpoint ?? '',
    query: query.query ?? ''
  };
}
