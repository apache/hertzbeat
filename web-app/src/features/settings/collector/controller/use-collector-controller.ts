/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

import { ApiMessageError } from '@/core/http/api-message';
import { useSourceScopedValue, useStringQueryDraft } from '@/shared/query-context';

import { loadCollectorManagementPage } from '../api/collector-management-api';
import type { CollectorListState, CollectorPage } from '../model/collector-model';
import {
  readCollectorQuery,
  writeCollectorQuery,
  type CollectorPageSize,
  type CollectorQuery
} from '../model/collector-query-model';
import { useCollectorMutationController } from './use-collector-mutation-controller';
import { collectorQueryKeys } from './collector-query-keys';

export function useCollectorController() {
  const queryClient = useQueryClient();
  const state = useCollectorQueryState();
  const mutation = useCollectorMutationController({
    query: state.query,
    queryRef: state.queryRef,
    recordsLength: state.records.length,
    visibleMutableNames: state.visibleMutableNames,
    queryClient,
    navigateQuery: state.navigateQuery,
    clearSelection: () => state.setSelected([])
  });
  const listState = resolveCollectorListState(state.collectorQuery, mutation.proofFailure);

  return {
    query: state.query,
    nameDraft: state.nameDraft,
    listState,
    selected: state.selected,
    refreshing: state.collectorQuery.isFetching,
    mutating: mutation.mutating,
    mutationFailure: mutation.mutationFailure,
    pendingAction: mutation.pendingAction,
    actions: buildCollectorActions({ ...state, mutation, refetch: state.collectorQuery.refetch })
  };
}

function useCollectorQueryState() {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchSource = searchParams.toString();
  const query = useMemo(() => readCollectorQuery(new URLSearchParams(searchSource)), [searchSource]);
  const queryRef = useRef(query);
  const canonicalSearch = writeCollectorQuery(query).toString();
  const { value: nameDraft, setValue: setNameDraft } = useStringQueryDraft(searchSource, query.name);
  const { value: selected, setValue: setSelected } = useSourceScopedValue<string[]>(searchSource, []);
  const collectorQuery = useQuery({
    queryKey: collectorQueryKeys.page(query),
    queryFn: ({ signal }) => loadCollectorManagementPage(query, signal),
    retry: false
  });

  useLayoutEffect(() => {
    queryRef.current = query;
  }, [query]);
  useEffect(() => {
    if (searchSource !== canonicalSearch) setSearchParams(canonicalSearch, { replace: true });
  }, [canonicalSearch, searchSource, setSearchParams]);

  const records = useMemo(() => collectorQuery.data?.content ?? [], [collectorQuery.data]);
  const visibleMutableNames = useMemo(
    () => records.filter(record => !record.immutable).map(record => record.name),
    [records]
  );
  const navigateQuery = useCallback(
    (next: CollectorQuery, replace = false) => {
      queryRef.current = next;
      setSearchParams(writeCollectorQuery(next), { replace });
    },
    [setSearchParams]
  );
  return {
    query,
    queryRef,
    nameDraft,
    setNameDraft,
    selected,
    setSelected,
    collectorQuery,
    records,
    visibleMutableNames,
    navigateQuery
  };
}

type ActionOptions = {
  nameDraft: string;
  queryRef: { current: CollectorQuery };
  selected: string[];
  visibleMutableNames: string[];
  setNameDraft: (name: string) => void;
  setSelected: (selected: string[]) => void;
  navigateQuery: (next: CollectorQuery, replace?: boolean) => void;
  mutation: ReturnType<typeof useCollectorMutationController>;
  refetch: () => unknown;
};

function buildCollectorActions(options: ActionOptions) {
  return {
    setNameDraft: options.setNameDraft,
    submitName: () => {
      const name = options.nameDraft.trim();
      const current = options.queryRef.current;
      options.navigateQuery({ ...current, name, pageIndex: name === current.name ? current.pageIndex : 0 });
    },
    setPage: (pageIndex: number, pageSize: CollectorPageSize) =>
      options.navigateQuery({ ...options.queryRef.current, pageIndex, pageSize }),
    refresh: () => options.mutation.refresh(options.refetch),
    requestAction: options.mutation.requestAction,
    cancelAction: options.mutation.cancelAction,
    confirmAction: options.mutation.confirmAction,
    toggleSelection: (name: string, checked: boolean) => {
      if (options.mutation.mutating || !options.visibleMutableNames.includes(name)) return;
      options.setSelected(
        checked ? [...new Set([...options.selected, name])] : options.selected.filter(candidate => candidate !== name)
      );
    },
    toggleAll: (checked: boolean) => {
      if (!options.mutation.mutating) options.setSelected(checked ? options.visibleMutableNames : []);
    }
  };
}

function resolveCollectorListState(query: UseQueryResult<CollectorPage>, proofFailure: boolean): CollectorListState {
  if (proofFailure) return { kind: 'unavailable' };
  if (query.isPending) return { kind: 'loading' };
  if (query.error) return { kind: classifyCollectorReadFailure(query.error) };
  if (!query.data) return { kind: 'error' };
  if (query.data.content.length === 0) return { kind: 'empty' };
  return { kind: 'ready', records: query.data.content, total: query.data.totalElements };
}

function classifyCollectorReadFailure(error: unknown): 'unavailable' | 'error' {
  if (!(error instanceof ApiMessageError)) return 'error';
  return error.status === undefined || error.status === 0 || error.status >= 500 || error.cause !== undefined
    ? 'unavailable'
    : 'error';
}
