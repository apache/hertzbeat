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
import { readCollectorQuery, writeCollectorQuery, type CollectorQuery } from '../model/collector-query-model';
import { buildCollectorActions } from './collector-actions';
import { useCollectorMutationController } from './use-collector-mutation-controller';
import { useCollectorIntakeController } from './use-collector-intake-controller';
import { useCollectorRuntimeConfigController } from './use-collector-runtime-config-controller';
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
  const intake = useCollectorIntakeController({
    query: state.query,
    queryRef: state.queryRef,
    records: state.records,
    queryClient,
    locked: mutation.mutating
  });
  const runtime = useCollectorRuntimeConfigController({
    query: state.query,
    queryRef: state.queryRef,
    records: state.records,
    locked: mutation.mutating || intake.saving
  });
  const listState = resolveCollectorListState(state.collectorQuery, mutation.proofFailure);
  const busy = mutation.mutating || intake.saving || runtime.busy;

  return {
    query: state.query,
    nameDraft: state.nameDraft,
    listState,
    selected: state.selected,
    refreshing: state.collectorQuery.isFetching,
    mutating: busy,
    mutationFailure: mutation.mutationFailure,
    intakeFailure: intake.failure,
    pendingAction: mutation.pendingAction,
    intakeEditor: intake.editor,
    intakeSaving: intake.saving,
    runtimeEditor: runtime.editor,
    runtimeBusy: runtime.busy,
    runtimeLoading: runtime.loading,
    runtimeSaving: runtime.saving,
    runtimeFailure: runtime.failure,
    actions: buildCollectorActions({ ...state, mutation, intake, runtime, refetch: state.collectorQuery.refetch })
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
