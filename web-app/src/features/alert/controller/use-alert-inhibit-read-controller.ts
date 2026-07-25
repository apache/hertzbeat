/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useLayoutEffect, useRef } from 'react';

import { loadAlertInhibits } from '../api/alert-inhibit-api';
import {
  AlertInhibitUnavailableError,
  alertInhibitFailureKind,
  type AlertInhibitPage,
  type AlertInhibitQuery
} from '../model/alert-inhibit-model';
import type { AlertInhibitListState } from '../model/alert-inhibit-state';
import { alertInhibitQueryKeys } from './alert-inhibit-query-keys';
import { useAlertInhibitPageCorrection } from './use-alert-inhibit-page-correction';
import { useAlertInhibitQueryController } from './use-alert-inhibit-query-controller';

type VisibleQuery = { identity: string; query: AlertInhibitQuery };

export function useAlertInhibitReadController() {
  const queryClient = useQueryClient();
  const queryController = useAlertInhibitQueryController();
  const { query, search, source } = queryController.state;
  const listQuery = useQuery({
    queryKey: alertInhibitQueryKeys.list(query),
    queryFn: ({ signal }) => loadAlertInhibits(query, signal),
    retry: false
  });
  const currentQueryRef = useRef<VisibleQuery>({ identity: source, query });
  useLayoutEffect(() => {
    // A pending command rereads the query currently owned by the visible route.
    currentQueryRef.current = { identity: source, query };
  }, [query, source]);
  const rereadAuthoritatively = useCallback(async () => {
    const visible = currentQueryRef.current;
    const page = await queryClient.fetchQuery({
      queryKey: alertInhibitQueryKeys.list(visible.query),
      queryFn: ({ signal }) => loadAlertInhibits(visible.query, signal),
      staleTime: 0
    });
    if (currentQueryRef.current.identity !== visible.identity) {
      throw new AlertInhibitUnavailableError('visible alert inhibit query changed during projection');
    }
    return page;
  }, [queryClient]);
  const refresh = async () => {
    try {
      await rereadAuthoritatively();
    } catch {
      // React Query owns the visible list failure for a manual refresh.
    }
  };
  const list = resolveListState(listQuery.isPending, listQuery.error, listQuery.data);
  useAlertInhibitPageCorrection(query, list, queryController.replacePageIndex);
  return {
    state: {
      list,
      query,
      refreshing: listQuery.isFetching,
      search
    },
    actions: {
      ...queryController.actions,
      refresh
    },
    rereadAuthoritatively
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
