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
