/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { App } from 'antd';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  deleteStatusComponent,
  deleteStatusIncident,
  isStatusManagementMissing,
  loadStatusComponent,
  loadStatusComponents,
  loadStatusIncident,
  loadStatusIncidents,
  loadStatusOrg,
  saveStatusComponent,
  saveStatusIncident,
  saveStatusOrg,
  statusManagementFailureKind,
  type StatusManagementFailureKind
} from '../api/status-management-api';
import { useStatusIncidentEditor } from '../hooks/use-status-incident-editor';
import { useStatusIncidentQuery } from '../hooks/use-status-incident-query';
import {
  StatusManagementContractError,
  type StatusComponent,
  type StatusComponentRecord,
  type StatusIncident,
  type StatusIncidentPage,
  type StatusIncidentRecord,
  type StatusOrg,
  type StatusOrgRecord
} from '../model/status-management-contract';
import type { StatusIncidentQuery } from '../model/status-incident-query';
import {
  isStatusOrgNotFound,
  type StatusCollectionState,
  type StatusIncidentCollectionState,
  type StatusRecordState
} from '../model/status-management-model';

const orgKey = ['status-page-org'] as const;
const componentKey = ['status-page-components'] as const;
type Notify = { saveSuccess: () => void; saveFailed: () => void; deleteSuccess: () => void; deleteFailed: () => void };

export function useStatusManagementController() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const incidentQuery = useStatusIncidentQuery();
  const queries = useStatusQueries(incidentQuery.query);
  const [componentEditor, setComponentEditor] = useState<Partial<StatusComponent>>();
  const incidentEditor = useStatusIncidentEditor();
  const notify: Notify = {
    saveSuccess: () => void message.success(t('statusManagement.saveSuccess')),
    saveFailed: () => void message.error(t('statusManagement.saveFailed')),
    deleteSuccess: () => void message.success(t('statusManagement.deleteSuccess')),
    deleteFailed: () => void message.error(t('statusManagement.deleteFailed'))
  };
  const orgSave = useOrgSave(queryClient, queries.org.data, notify);
  const components = useComponentTransactions(queryClient, setComponentEditor, notify);
  const incidents = useIncidentTransactions(
    queryClient,
    incidentQuery.query,
    queries.incidentKey,
    incidentEditor.close,
    notify
  );
  const orgState = resolveOrgState(queries.org.isPending, queries.org.error, queries.org.data);
  const componentState = resolveComponentState(
    queries.components.isPending,
    queries.components.error,
    queries.components.data
  );
  const incidentState = resolveIncidentState(
    queries.incidents.isPending,
    queries.incidents.error,
    queries.incidents.data
  );

  return {
    org: orgState,
    components: componentState,
    incidents: incidentState,
    incidentQuery,
    componentEditor,
    incidentEditor: incidentEditor.incident,
    incidentDetailLoading: incidentEditor.loading,
    incidentDetailState: incidentEditor.error ? statusManagementFailureKind(incidentEditor.error) : undefined,
    orgSaving: orgSave.isPending,
    componentSaving: components.save.isPending,
    incidentSaving: incidents.save.isPending,
    saveOrg: orgSave.mutateAsync,
    openNewComponent: () => setComponentEditor({ orgId: orgState.kind === 'ready' ? orgState.record.id : 0 }),
    editComponent: setComponentEditor,
    closeComponent: () => setComponentEditor(undefined),
    saveComponent: components.save.mutate,
    deleteComponent: components.remove.mutate,
    openNewIncident: () => incidentEditor.openNew(orgState.kind === 'ready' ? orgState.record.id : undefined),
    openIncident: incidentEditor.edit,
    closeIncident: incidentEditor.close,
    saveIncident: incidents.save.mutate,
    deleteIncident: incidents.remove.mutate,
    refreshComponents: components.refresh,
    refreshIncidents: incidents.refresh
  };
}

function useStatusQueries(query: StatusIncidentQuery) {
  const incidentKey = useMemo(() => ['status-page-incidents', query] as const, [query]);
  return {
    incidentKey,
    org: useQuery({ queryKey: orgKey, queryFn: loadStatusOrg, retry: false }),
    components: useQuery({ queryKey: componentKey, queryFn: loadStatusComponents, retry: false }),
    incidents: useQuery({ queryKey: incidentKey, queryFn: () => loadStatusIncidents(query), retry: false })
  };
}

function useOrgSave(queryClient: QueryClient, org: StatusOrgRecord | undefined, notify: Notify) {
  return useMutation({
    mutationFn: (value: StatusOrg) => saveStatusOrg({ ...org, ...value }),
    onSuccess: canonical => {
      queryClient.setQueryData(orgKey, canonical);
      notify.saveSuccess();
    },
    onError: notify.saveFailed
  });
}

function useComponentTransactions(
  queryClient: QueryClient,
  setEditor: (value: Partial<StatusComponent> | undefined) => void,
  notify: Notify
) {
  const refresh = () => void queryClient.fetchQuery({
    queryKey: componentKey,
    queryFn: loadStatusComponents,
    staleTime: 0
  }).catch(() => undefined);
  const save = useMutation({
    mutationFn: async (value: StatusComponent) => {
      const isNew = value.id == null;
      await saveStatusComponent(value, isNew);
      if (!isNew) {
        const id = requireId(value.id);
        requireExactId((await loadStatusComponent(id)).id, id);
      }
      await queryClient.fetchQuery({ queryKey: componentKey, queryFn: loadStatusComponents, staleTime: 0 });
    },
    onSuccess: () => {
      setEditor(undefined);
      notify.saveSuccess();
    },
    onError: notify.saveFailed
  });
  const remove = useMutation({
    mutationFn: async (id: number) => {
      const exactId = requireId(id);
      await deleteStatusComponent(exactId);
      await proveMissing(() => loadStatusComponent(exactId));
      await queryClient.fetchQuery({ queryKey: componentKey, queryFn: loadStatusComponents, staleTime: 0 });
    },
    onSuccess: notify.deleteSuccess,
    onError: notify.deleteFailed
  });
  return { save, remove, refresh };
}

function useIncidentTransactions(
  queryClient: QueryClient,
  query: StatusIncidentQuery,
  incidentKey: readonly ['status-page-incidents', StatusIncidentQuery],
  closeEditor: () => void,
  notify: Notify
) {
  const refreshQuery = () => queryClient.fetchQuery({
    queryKey: incidentKey,
    queryFn: () => loadStatusIncidents(query),
    staleTime: 0
  });
  const refresh = () => void refreshQuery().catch(() => undefined);
  const save = useMutation({
    mutationFn: async (value: StatusIncident) => {
      const isNew = value.id == null;
      await saveStatusIncident(value, isNew);
      if (!isNew) {
        const id = requireId(value.id);
        requireExactId((await loadStatusIncident(id)).id, id);
      }
      await refreshQuery();
    },
    onSuccess: () => {
      closeEditor();
      notify.saveSuccess();
    },
    onError: notify.saveFailed
  });
  const remove = useMutation({
    mutationFn: async (id: number) => {
      const exactId = requireId(id);
      await deleteStatusIncident(exactId);
      await proveMissing(() => loadStatusIncident(exactId));
      await refreshQuery();
    },
    onSuccess: notify.deleteSuccess,
    onError: notify.deleteFailed
  });
  return { save, remove, refresh };
}

function resolveOrgState(
  pending: boolean,
  error: Error | null,
  record: StatusOrgRecord | undefined
): StatusRecordState<StatusOrgRecord> {
  if (pending) return { kind: 'loading' };
  if (error) {
    if (isStatusOrgNotFound(error)) return { kind: 'missing' };
    return { kind: statusManagementFailureKind(error) === 'unavailable' ? 'unavailable' : 'error' };
  }
  return record ? { kind: 'ready', record } : { kind: 'error' };
}

function resolveComponentState(
  pending: boolean,
  error: unknown,
  records: StatusComponentRecord[] | undefined
): StatusCollectionState<StatusComponentRecord> {
  if (pending) return { kind: 'loading' };
  if (error) return failureCollectionState(statusManagementFailureKind(error));
  if (!records) return { kind: 'error' };
  return records.length === 0 ? { kind: 'empty' } : { kind: 'ready', records };
}

function resolveIncidentState(
  pending: boolean,
  error: unknown,
  page: StatusIncidentPage | undefined
): StatusIncidentCollectionState<StatusIncidentRecord> {
  if (pending) return { kind: 'loading' };
  if (error) return failureCollectionState(statusManagementFailureKind(error));
  if (!page) return { kind: 'error' };
  if (page.content.length === 0 && page.totalElements === 0) return { kind: 'empty' };
  return { kind: 'ready', records: page.content, total: page.totalElements };
}

function failureCollectionState(kind: StatusManagementFailureKind): { kind: 'unavailable' | 'error' } {
  return { kind: kind === 'unavailable' ? 'unavailable' : 'error' };
}

function requireId(id: number | undefined) {
  if (!Number.isSafeInteger(id) || (id ?? 0) < 1) throw new StatusManagementContractError();
  return id as number;
}

function requireExactId(actual: number, expected: number) {
  if (actual !== expected) throw new StatusManagementContractError();
}

async function proveMissing(load: () => Promise<unknown>) {
  try {
    await load();
  } catch (error) {
    if (isStatusManagementMissing(error)) return;
    throw error;
  }
  throw new StatusManagementContractError();
}
