/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useSourceScopedValue, useStringQueryDraft } from '@/shared/query-context';

import { loadCollectorManagementPage } from '../api/collector-management-api';
import type { CollectorActionCapabilities } from '../model/collector-action-capability';
import type { CollectorListState } from '../model/collector-model';
import { readCollectorQuery, writeCollectorQuery, type CollectorQuery } from '../model/collector-query-model';
import { buildCollectorActions } from './collector-actions';
import { resolveCollectorListState } from './collector-list-state';
import { createRuntimeSourceCoordinator } from './collector-runtime-source-coordinator';
import { useCollectorMutationController } from './use-collector-mutation-controller';
import { useCollectorIntakeController } from './use-collector-intake-controller';
import { useCollectorFileLogSourceController } from './use-collector-file-log-source-controller';
import { useCollectorPrometheusSourceController } from './use-collector-prometheus-source-controller';
import { useCollectorRuntimeApplicationController } from './use-collector-runtime-application-controller';
import { useCollectorRuntimeConfigController } from './use-collector-runtime-config-controller';
import { collectorQueryKeys } from './collector-query-keys';
import { useCollectorActionCapabilities } from './use-collector-action-capabilities';
import { useCollectorRoleLossRetirement } from './use-collector-role-loss-retirement';

export function useCollectorController() {
  const capabilities = useCollectorActionCapabilities();
  const queryClient = useQueryClient();
  const state = useCollectorQueryState(capabilities.canRead);
  const runtimeApplication = useCollectorRuntimeApplicationController();
  const mutation = useCollectorMutationController({
    query: state.query,
    queryRef: state.queryRef,
    recordsLength: state.records.length,
    visibleMutableNames: state.visibleMutableNames,
    queryClient,
    navigateQuery: state.navigateQuery,
    clearSelection: () => state.setSelected([])
  });
  const { intake, runtime, prometheus, fileLog } = useManagedCollectorEditors(
    state,
    mutation,
    queryClient,
    runtimeApplication.track
  );
  useCollectorRoleLossRetirement({ capabilities, mutation, intake, runtime, prometheus, fileLog });
  const listState = resolveCollectorListState(state.collectorQuery, mutation.proofFailure, capabilities.canRead);
  const busy = mutation.mutating || intake.saving || runtime.busy || prometheus.saving || fileLog.saving;
  return collectorPageModel(
    state,
    mutation,
    intake,
    runtime,
    prometheus,
    fileLog,
    listState,
    busy,
    runtimeApplication.state,
    capabilities
  );
}

function useManagedCollectorEditors(
  state: ReturnType<typeof useCollectorQueryState>,
  mutation: ReturnType<typeof useCollectorMutationController>,
  queryClient: ReturnType<typeof useQueryClient>,
  onManagementSaved: ReturnType<typeof useCollectorRuntimeApplicationController>['track']
) {
  const sourceCoordinator = useMemo(() => createRuntimeSourceCoordinator(), []);
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
    locked: mutation.mutating || intake.saving,
    onManagementSaved
  });
  const prometheus = useCollectorPrometheusSourceController({
    queryRef: state.queryRef,
    session: runtime.editor,
    closeRuntime: runtime.cancel,
    owner: 'prometheus',
    coordinator: sourceCoordinator,
    onManagementSaved
  });
  const fileLog = useCollectorFileLogSourceController({
    queryRef: state.queryRef,
    session: runtime.editor,
    closeRuntime: runtime.cancel,
    owner: 'fileLog',
    coordinator: sourceCoordinator,
    onManagementSaved
  });
  return { intake, runtime, prometheus, fileLog };
}

function collectorPageModel(
  state: ReturnType<typeof useCollectorQueryState>,
  mutation: ReturnType<typeof useCollectorMutationController>,
  intake: ReturnType<typeof useCollectorIntakeController>,
  runtime: ReturnType<typeof useCollectorRuntimeConfigController>,
  prometheus: ReturnType<typeof useCollectorPrometheusSourceController>,
  fileLog: ReturnType<typeof useCollectorFileLogSourceController>,
  listState: CollectorListState,
  busy: boolean,
  runtimeApplication: ReturnType<typeof useCollectorRuntimeApplicationController>['state'],
  capabilities: CollectorActionCapabilities
) {
  return {
    capabilities,
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
    prometheusEditor: prometheus.editor,
    prometheusSaving: prometheus.saving,
    prometheusFailure: prometheus.failure,
    fileLogEditor: fileLog.editor,
    fileLogSaving: fileLog.saving,
    fileLogFailure: fileLog.failure,
    runtimeApplication,
    actions: buildCollectorActions({
      capabilities,
      ...state,
      mutation,
      intake,
      runtime,
      prometheus,
      fileLog,
      refetch: state.collectorQuery.refetch
    })
  };
}

function useCollectorQueryState(canRead: boolean) {
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
    retry: false,
    enabled: canRead
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
