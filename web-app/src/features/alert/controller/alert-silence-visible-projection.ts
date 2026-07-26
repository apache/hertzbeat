/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { skipToken, useQuery, type QueryClient } from '@tanstack/react-query';

import { loadAlertSilences, loadMatchedAlertSilences } from '../api/alert-silence-api';
import type {
  AlertSilence,
  AlertSilenceManagementContext,
  AlertSilencePage,
  AlertSilenceQuery
} from '../model/alert-silence-model';
import { alertSilenceQueryKeys } from './alert-silence-query-keys';

export type AlertSilenceVisibleProjection = {
  query: AlertSilenceQuery;
  management: AlertSilenceManagementContext | null;
};

export function useAlertSilenceVisibleProjection({ query, management }: AlertSilenceVisibleProjection) {
  const matchedMode = management?.mode === 'matched';
  const matchingRuleIds = management?.matchingRuleIds ?? [];
  const listQuery = useQuery({
    queryKey: alertSilenceQueryKeys.list(query),
    queryFn: matchedMode ? skipToken : ({ signal }) => loadAlertSilences(query, signal),
    retry: false
  });
  const matchedQuery = useQuery({
    queryKey: alertSilenceQueryKeys.matched(matchingRuleIds),
    queryFn: matchedQueryFn(matchedMode, matchingRuleIds),
    retry: false
  });
  if (!matchedMode) {
    return {
      page: listQuery.data,
      pending: listQuery.isPending,
      error: listQuery.error,
      refreshing: listQuery.isFetching,
      missingCount: 0
    };
  }
  return {
    page: projectMatchedSilences(matchingRuleIds, matchedQuery.data?.records ?? [], query),
    pending: matchingRuleIds.length > 0 && matchedQuery.isPending,
    error: matchedQuery.error,
    refreshing: matchedQuery.isFetching,
    missingCount: matchedQuery.data?.missingCount ?? 0
  };
}

export async function fetchAlertSilenceVisibleProjection(
  queryClient: QueryClient,
  visible: AlertSilenceVisibleProjection
) {
  if (visible.management?.mode !== 'matched') {
    return queryClient.fetchQuery({
      queryKey: alertSilenceQueryKeys.list(visible.query),
      queryFn: ({ signal }) => loadAlertSilences(visible.query, signal),
      staleTime: 0
    });
  }
  const ids = visible.management.matchingRuleIds;
  if (ids.length === 0) return emptyMatchedPage(visible.query);
  const result = await queryClient.fetchQuery({
    queryKey: alertSilenceQueryKeys.matched(ids),
    queryFn: ({ signal }) => loadMatchedAlertSilences(ids, signal),
    staleTime: 0
  });
  return projectMatchedSilences(ids, result.records, visible.query);
}

function matchedQueryFn(matchedMode: boolean, ids: number[]) {
  if (!matchedMode || ids.length === 0) return skipToken;
  return ({ signal }: { signal: AbortSignal }) => loadMatchedAlertSilences(ids, signal);
}

function projectMatchedSilences(ids: number[], records: AlertSilence[], query: AlertSilenceQuery): AlertSilencePage {
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

function emptyMatchedPage(query: AlertSilenceQuery): AlertSilencePage {
  return {
    content: [],
    totalElements: 0,
    totalPages: 0,
    number: query.pageIndex,
    size: query.pageSize
  };
}
