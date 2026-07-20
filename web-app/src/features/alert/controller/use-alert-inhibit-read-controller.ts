/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useLayoutEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useStringQueryDraft } from '@/shared/query-context';

import { classifyAlertInhibitReadError, loadAlertInhibits } from '../alert-inhibit-api';
import {
  AlertInhibitUnavailableError,
  readAlertInhibitQuery,
  writeAlertInhibitQuery,
  type AlertInhibitPage,
  type AlertInhibitQuery
} from '../alert-inhibit-model';
import type { AlertInhibitListState } from '../model/alert-inhibit-state';

const listKey = (query: AlertInhibitQuery) => ['alert-inhibit-policies', query] as const;
type VisibleQuery = { identity: string; query: AlertInhibitQuery };

export function useAlertInhibitReadController() {
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const query = readAlertInhibitQuery(params);
  const source = writeAlertInhibitQuery(query).toString();
  const { value: search, setValue: setSearch } = useStringQueryDraft(source, query.search);
  const listQuery = useQuery({ queryKey: listKey(query), queryFn: () => loadAlertInhibits(query), retry: false });
  const currentQueryRef = useRef<VisibleQuery>({ identity: source, query });
  useLayoutEffect(() => {
    // A pending command rereads the query currently owned by the visible route.
    currentQueryRef.current = { identity: source, query };
  }, [query, source]);
  const rereadAuthoritatively = useCallback(async () => {
    const visible = currentQueryRef.current;
    const page = await queryClient.fetchQuery({
      queryKey: listKey(visible.query),
      queryFn: () => loadAlertInhibits(visible.query),
      staleTime: 0
    });
    if (currentQueryRef.current.identity !== visible.identity) {
      throw new AlertInhibitUnavailableError('visible alert inhibit query changed during projection');
    }
    return page;
  }, [queryClient]);
  const updateQuery = (patch: Partial<AlertInhibitQuery>) => {
    setParams(writeAlertInhibitQuery({ ...query, ...patch }));
  };
  const refresh = async () => {
    try {
      await rereadAuthoritatively();
    } catch {
      // React Query owns the visible list failure for a manual refresh.
    }
  };
  return {
    state: {
      list: resolveListState(listQuery.isPending, listQuery.error, listQuery.data),
      query,
      refreshing: listQuery.isFetching,
      search
    },
    actions: {
      setSearch,
      submitSearch: () => updateQuery({ search: search.trim(), pageIndex: 0 }),
      changePage: (page: number, pageSize: number) =>
        updateQuery({
          pageIndex: pageSize === query.pageSize ? page - 1 : 0,
          pageSize
        }),
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
  if (error) return { kind: classifyAlertInhibitReadError(error) === 'unavailable' ? 'unavailable' : 'error' };
  if (!page) return { kind: 'error' };
  if (page.content.length === 0 && page.totalElements === 0) return { kind: 'empty' };
  return { kind: 'ready', records: page.content, total: page.totalElements };
}
