/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';

import { classifyAlertGroupReadError, loadAlertGroups } from '../alert-group-api';
import type { AlertGroupQuery } from '../alert-group-model';
import { resolveAlertGroupListState } from '../alert-group-state';
import { alertGroupQueryKeys } from './alert-group-query-keys';

export function useAlertGroupReadController(query: AlertGroupQuery) {
  const queryClient = useQueryClient();
  const listQuery = useQuery({
    queryKey: alertGroupQueryKeys.list(query),
    queryFn: () => loadAlertGroups(query),
    retry: false
  });
  const failure = listQuery.error
    ? classifyAlertGroupReadError(listQuery.error) === 'unavailable' ? 'unavailable' : 'error'
    : null;
  const rereadList = () => queryClient.fetchQuery({
    queryKey: alertGroupQueryKeys.list(query),
    queryFn: () => loadAlertGroups(query),
    staleTime: 0
  });

  return {
    state: {
      list: resolveAlertGroupListState(listQuery.isPending, failure, listQuery.data),
      refreshing: listQuery.isFetching
    },
    rereadList,
    refresh: () => rereadList().then(() => undefined).catch(() => undefined)
  };
}
