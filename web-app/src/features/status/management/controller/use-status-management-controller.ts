/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */
import { useExclusiveOperation } from '@/shared/exclusive-operation/use-exclusive-operation';
import { useLayoutEffect, useRef, useState } from 'react';

import { statusManagementFailureKind, type StatusManagementFailureKind } from '../api/status-management-api';
import {
  type StatusComponentRecord,
  type StatusIncidentPage,
  type StatusIncidentRecord,
  type StatusOrgRecord
} from '../model/status-management-contract';
import {
  isStatusOrgNotFound,
  type StatusCollectionState,
  type StatusIncidentCollectionState,
  type StatusRecordState
} from '../model/status-management-model';
import { useStatusComponentTransactions } from './use-status-component-transactions';
import { useStatusComponentEditor } from './use-status-component-editor';
import { useStatusIncidentEditor } from './use-status-incident-editor';
import { useStatusIncidentQuery } from './use-status-incident-query';
import { useStatusIncidentTransactions } from './use-status-incident-transactions';
import { useStatusManagementNotifications } from './use-status-management-notifications';
import { useStatusManagementActionCapabilities } from './use-status-management-action-capabilities';
import { useStatusManagementActions } from './use-status-management-actions';
import { useStatusManagementResources } from './use-status-management-resources';
import { useStatusOrgSave } from './use-status-org-save';

export function useStatusManagementController() {
  const capabilities = useStatusManagementActionCapabilities();
  const canRefresh = useStatusReadAdmission(capabilities.canRead);
  const command = useExclusiveOperation('status-management-command');
  const incidentQuery = useStatusIncidentQuery();
  const resources = useStatusManagementResources(incidentQuery.query, capabilities.canRead);
  const notify = useStatusManagementNotifications();
  const componentEditor = useStatusComponentEditor(command);
  const incidentEditor = useStatusIncidentEditor(command);
  const orgSave = useStatusOrgSave(resources.org.data, command, notify);
  const components = useStatusComponentTransactions(command, componentEditor, notify, incidentEditor.retireDetail);
  const incidents = useStatusIncidentTransactions(incidentQuery.query, command, incidentEditor, notify);
  const orgState = capabilities.canRead
    ? resolveOrgState(resources.org.isPending, resources.org.error, resources.org.data)
    : ({ kind: 'permission' } as const);
  const componentState = capabilities.canRead
    ? resolveComponentState(resources.components.isPending, resources.components.error, resources.components.data)
    : ({ kind: 'permission' } as const);
  const incidentState = capabilities.canRead
    ? resolveIncidentState(resources.incidents.isPending, resources.incidents.error, resources.incidents.data)
    : ({ kind: 'permission' } as const);
  const actions = useStatusManagementActions({
    capabilities,
    command,
    orgState,
    componentEditor,
    incidentEditor,
    orgSave,
    components,
    incidents
  });

  return {
    org: orgState,
    components: componentState,
    incidents: incidentState,
    incidentQuery: guardedIncidentQuery(incidentQuery, command.isLocked),
    commandLocked: command.pending,
    componentEditor: componentEditor.component,
    componentWriteRecovery: components.writeRecovery,
    componentDeleteRecovery: components.deleteRecovery,
    componentDeleteRecoveryPending: components.deleteRecoveryPending,
    incidentEditor: incidentEditor.incident,
    incidentWriteRecovery: incidents.writeRecovery,
    incidentDeleteRecovery: incidents.deleteRecovery,
    incidentDeleteRecoveryPending: incidents.deleteRecoveryPending,
    incidentDetailLoading: incidentEditor.loading,
    incidentDetailState: incidentEditor.error ? statusManagementFailureKind(incidentEditor.error) : undefined,
    orgSaving: orgSave.saving,
    componentSaving: components.saving,
    incidentSaving: incidents.saving,
    orgWriteRecovery: orgSave.writeRecovery,
    ...actions,
    refreshComponents: () => (canRefresh() ? components.refresh() : Promise.resolve(false)),
    refreshIncidents: () => (canRefresh() ? incidents.refresh() : Promise.resolve(false))
  };
}

function useStatusReadAdmission(canRead: boolean) {
  const [epoch, setEpoch] = useState(0);
  const currentEpoch = useRef(0);
  const previousCanRead = useRef(canRead);
  useLayoutEffect(() => {
    if (previousCanRead.current && !canRead) {
      currentEpoch.current += 1;
      setEpoch(currentEpoch.current);
    }
    previousCanRead.current = canRead;
  }, [canRead]);
  return () => canRead && currentEpoch.current === epoch;
}

function guardedIncidentQuery<
  T extends {
    setDraftSearch: (value: string) => void;
    submit: () => void;
    changePage: (pageIndex: number, pageSize: number) => void;
  }
>(query: T, isLocked: () => boolean): T {
  return {
    ...query,
    setDraftSearch: value => {
      if (!isLocked()) query.setDraftSearch(value);
    },
    submit: () => {
      if (!isLocked()) query.submit();
    },
    changePage: (pageIndex, pageSize) => {
      if (!isLocked()) query.changePage(pageIndex, pageSize);
    }
  };
}

function resolveOrgState(
  pending: boolean,
  error: Error | null,
  record: StatusOrgRecord | undefined
): StatusRecordState<StatusOrgRecord> {
  if (pending) return { kind: 'loading' };
  if (error) {
    if (isStatusOrgNotFound(error)) return { kind: 'missing' };
    const kind = statusManagementFailureKind(error);
    return { kind: kind === 'unavailable' || kind === 'permission' ? kind : 'error' };
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

function failureCollectionState(kind: StatusManagementFailureKind): { kind: 'permission' | 'unavailable' | 'error' } {
  return { kind: kind === 'unavailable' || kind === 'permission' ? kind : 'error' };
}
