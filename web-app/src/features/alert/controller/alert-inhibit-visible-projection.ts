/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { skipToken, useQuery, type QueryClient } from '@tanstack/react-query';

import { loadAlertInhibits, loadMatchedAlertInhibits } from '../api/alert-inhibit-api';
import {
  alertInhibitFailureKind,
  type AlertInhibit,
  type AlertInhibitManagementContext,
  type AlertInhibitPage,
  type AlertInhibitQuery
} from '../model/alert-inhibit-model';
import type { AlertInhibitListState } from '../model/alert-inhibit-state';
import { alertInhibitQueryKeys } from './alert-inhibit-query-keys';

export type AlertInhibitVisibleProjection = {
  query: AlertInhibitQuery;
  management: AlertInhibitManagementContext | null;
};

export function useAlertInhibitVisibleProjection({ query, management }: AlertInhibitVisibleProjection) {
  const matchedMode = management?.mode === 'matched';
  const matchingRuleIds = management?.matchingRuleIds ?? [];
  const listQuery = useQuery({
    queryKey: alertInhibitQueryKeys.list(query),
    queryFn: matchedMode ? skipToken : ({ signal }) => loadAlertInhibits(query, signal),
    retry: false
  });
  const matchedQuery = useQuery({
    queryKey: alertInhibitQueryKeys.matched(matchingRuleIds),
    queryFn: matchedProjectionQueryFn(matchedMode, matchingRuleIds),
    retry: false
  });
  if (!matchedMode) {
    return {
      list: resolveListState(listQuery.isPending, listQuery.error, listQuery.data),
      refreshing: listQuery.isFetching,
      missingCount: 0
    };
  }
  const page = projectMatchedRules(matchingRuleIds, matchedQuery.data?.records ?? [], query);
  return {
    list: resolveListState(matchingRuleIds.length > 0 && matchedQuery.isPending, matchedQuery.error, page),
    refreshing: matchedQuery.isFetching,
    missingCount: matchedQuery.data?.missingCount ?? 0
  };
}

function matchedProjectionQueryFn(matchedMode: boolean, matchingRuleIds: number[]) {
  if (!matchedMode || matchingRuleIds.length === 0) return skipToken;
  return ({ signal }: { signal: AbortSignal }) => loadMatchedAlertInhibits(matchingRuleIds, signal);
}

export async function fetchAlertInhibitVisibleProjection(
  queryClient: QueryClient,
  visible: AlertInhibitVisibleProjection
): Promise<AlertInhibitPage> {
  if (visible.management?.mode !== 'matched') {
    return queryClient.fetchQuery({
      queryKey: alertInhibitQueryKeys.list(visible.query),
      queryFn: ({ signal }) => loadAlertInhibits(visible.query, signal),
      staleTime: 0
    });
  }
  const matchingRuleIds = visible.management.matchingRuleIds;
  if (matchingRuleIds.length === 0) return emptyMatchedPage(visible.query);
  const result = await queryClient.fetchQuery({
    queryKey: alertInhibitQueryKeys.matched(matchingRuleIds),
    queryFn: ({ signal }) => loadMatchedAlertInhibits(matchingRuleIds, signal),
    staleTime: 0
  });
  return projectMatchedRules(matchingRuleIds, result.records, visible.query);
}

function projectMatchedRules(ids: number[], records: AlertInhibit[], query: AlertInhibitQuery): AlertInhibitPage {
  if (ids.length === 0) return emptyMatchedPage(query);
  const needle = query.search.toLocaleLowerCase();
  const filtered = records
    .filter(record => !needle || record.name.toLocaleLowerCase().includes(needle))
    .sort((left, right) => right.id - left.id);
  const start = query.pageIndex * query.pageSize;
  return {
    content: filtered.slice(start, start + query.pageSize),
    totalElements: filtered.length,
    totalPages: Math.ceil(filtered.length / query.pageSize),
    number: query.pageIndex,
    size: query.pageSize
  };
}

function emptyMatchedPage(query: AlertInhibitQuery): AlertInhibitPage {
  return {
    content: [],
    totalElements: 0,
    totalPages: 0,
    number: query.pageIndex,
    size: query.pageSize
  };
}

function resolveListState(
  pending: boolean,
  error: Error | null,
  page: AlertInhibitPage | undefined
): AlertInhibitListState {
  if (pending) return { kind: 'loading' };
  if (error) return { kind: alertInhibitFailureKind(error) === 'unavailable' ? 'unavailable' : 'error' };
  if (!page) return { kind: 'error' };
  if (page.content.length === 0 && page.totalElements === 0) return { kind: 'empty' };
  return { kind: 'ready', records: page.content, total: page.totalElements };
}
