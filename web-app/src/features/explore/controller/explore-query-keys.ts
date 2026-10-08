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

import { scopedQueryKey, queryContextScopeKey, type ExactTimeWindow, type QueryContext } from '@/shared/query-context';

import { exploreQueryContext, exploreUsesExactWindow, type ExploreQuery } from '../model/explore-model';

const historyRootKey = ['explore-history'] as const;
const metricInventoryRootKey = ['explore-metric-inventory'] as const;

export const exploreQueryKeys = {
  logSourceTrend: (query: ExploreQuery, window: ExactTimeWindow | undefined, refreshRevision: number) =>
    ['explore-log-source-trend', exploreQueryKeys.history(query, window, refreshRevision), refreshRevision] as const,
  logPatterns: (path: string, revision: number) => ['explore-log-patterns', path, revision] as const,
  logCalculated: (path: string, revision: number) => ['explore-log-calculated', path, revision] as const,
  traceStructureAnalysis: (path: string, revision: number) =>
    ['explore-trace-structure-analysis', path, revision] as const,
  logTransactions: (path: string, revision: number) => ['explore-log-transactions', path, revision] as const,
  logTransactionDetail: (path: string) => ['explore-log-transaction-detail', path] as const,
  logComparison: (request: unknown) => ['explore', 'log-comparison', request] as const,
  logQuerySet: (request: unknown) => ['explore', 'log-query-set', request] as const,
  logAnalysis: (path: string) => ['explore-log-analysis', path] as const,
  traceAnalytics: (path: string) => ['explore-trace-analytics', path] as const,
  logFacets: (path: string) => ['explore-log-facets', path] as const,
  logFacetValues: (source: 'a' | 'b', path: string) => ['explore-log-facet-values', source, path] as const,
  logCalculatedFacet: (request: unknown) => ['explore-log-calculated-facet', request] as const,
  logCalculatedAnalysis: (request: unknown, revision: number) =>
    ['explore-log-calculated-analysis', request, revision] as const,
  metricLabels: (path: string, identity: string) => ['explore-metric-labels', path, identity] as const,
  logScopeSuggestions: (path: string) => ['explore-log-scope-suggestions', path] as const,
  metricInventoryScope: (query: ExploreQuery) =>
    [...metricInventoryRootKey, { context: queryContextScopeKey(exploreQueryContext(query)) }] as const,
  metricInventory: (
    query: ExploreQuery,
    window: ExactTimeWindow,
    identity: string,
    search: string,
    limit: number,
    refreshRevision = 0
  ) =>
    [
      ...scopedQueryKey(metricInventoryRootKey, exploreQueryContext(query), window, refreshRevision),
      { identity, search, limit }
    ] as const,
  traceInvestigation: (
    context: QueryContext,
    window: ExactTimeWindow,
    traceId: string,
    spanId: string | undefined,
    refreshRevision: number
  ) =>
    [
      ...scopedQueryKey(['explore-investigation', 'trace'], context, window, refreshRevision),
      { traceId, spanId }
    ] as const,
  logInvestigation: (context: QueryContext, window: ExactTimeWindow, logRecordUid: string, refreshRevision: number) =>
    [...scopedQueryKey(['explore-investigation', 'log'], context, window, refreshRevision), { logRecordUid }] as const,
  history: (query: ExploreQuery, window: ExactTimeWindow | undefined, refreshRevision: number) =>
    [
      ...scopedQueryKey(historyRootKey, exploreQueryContext(query), window, refreshRevision),
      ...historyRequestIdentity(query)
    ] as const
};

function historyRequestIdentity(query: ExploreQuery) {
  // An exact window owns the request timestamps; the route preset matters only for a relative request.
  const relativeTimeRange = exploreUsesExactWindow(query) ? undefined : query.timeRange;
  if (query.signal === 'metrics') return metricHistoryIdentity(query, relativeTimeRange);
  if (query.signal === 'logs')
    return [
      'logs',
      {
        sort: query.sort ?? 'newest',
        logSort: query.logSort,
        relativeTimeRange,
        query: query.query,
        traceId: query.traceId,
        spanId: query.spanId,
        searchSyntax: query.searchSyntax,
        logCalculatedV2: query.logCalculatedV2,
        logSubquery: query.logSubquery,
        logReferenceJoin: query.logReferenceJoin,
        logGroupSelection: query.logGroupSelection,
        logNumericRange: query.logNumericRange,
        severityText: query.severityText,
        severityCategory: query.severityCategory,
        resourceFilter: query.resourceFilter,
        attributeFilter: query.attributeFilter,
        hideInternal: query.hideInternal,
        hideNoise: query.hideNoise,
        pageIndex: query.pageIndex
      }
    ] as const;
  return [
    'traces',
    {
      relativeTimeRange,
      query: query.query,
      traceId: query.traceId,
      traceStructure: query.traceStructure,
      resourceFilter: query.resourceFilter,
      attributeFilter: query.attributeFilter,
      minDurationMs: query.minDurationMs,
      maxDurationMs: query.maxDurationMs,
      errorOnly: query.errorOnly,
      sort: query.sort ?? 'newest',
      endExclusive: query.endExclusive,
      spanScope: query.spanScope,
      hideInternal: query.hideInternal,
      pageIndex: query.pageIndex
    }
  ] as const;
}

function metricHistoryIdentity(
  query: Extract<ExploreQuery, { signal: 'metrics' }>,
  relativeTimeRange: string | undefined
) {
  return [
    'metrics',
    {
      relativeTimeRange,
      query: query.query,
      operationName: query.operationName,
      metricPlan: query.metricPlan,
      metricFilter: query.metricFilter,
      groupBy: query.groupBy,
      aggregation: query.aggregation,
      temporalAggregation: query.temporalAggregation,
      step: query.step
    }
  ] as const;
}
