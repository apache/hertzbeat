/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLayoutEffect, useRef } from 'react';

import { loadAlertGroups } from '../api/alert-group-api';
import { alertGroupFailureKind, type AlertGroupQuery } from '../model/alert-group-model';
import { resolveAlertGroupListState } from '../model/alert-group-state';
import { alertGroupQueryKeys } from './alert-group-query-keys';

export function useAlertGroupReadController(query: AlertGroupQuery) {
  const queryClient = useQueryClient();
  const latestQueryRef = useRef(query);
  // A pending command may outlive route changes, so its final reread must use the committed query.
  useLayoutEffect(() => {
    latestQueryRef.current = query;
  }, [query]);
  const listQuery = useQuery({
    queryKey: alertGroupQueryKeys.list(query),
    queryFn: ({ signal }) => loadAlertGroups(query, signal),
    retry: false
  });
  const failure = alertGroupListFailure(listQuery.error);
  const rereadList = () => {
    const latestQuery = latestQueryRef.current;
    return queryClient.fetchQuery({
      queryKey: alertGroupQueryKeys.list(latestQuery),
      queryFn: ({ signal }) => loadAlertGroups(latestQuery, signal),
      staleTime: 0
    });
  };
  const refresh = async () => {
    try {
      await rereadList();
    } catch {
      // The query state owns visible refresh failures.
    }
  };

  return {
    state: {
      list: resolveAlertGroupListState(listQuery.isPending, failure, listQuery.data),
      refreshing: listQuery.isFetching
    },
    rereadList,
    refresh
  };
}

function alertGroupListFailure(reason: unknown): 'unavailable' | 'error' | null {
  if (!reason) return null;
  if (alertGroupFailureKind(reason) === 'unavailable') return 'unavailable';
  return 'error';
}
