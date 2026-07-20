/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */
import { useExclusiveOperation } from '@/shared/exclusive-operation/use-exclusive-operation';

import { statusManagementFailureKind, type StatusManagementFailureKind } from '../api/status-management-api';
import {
  type StatusComponent,
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
import { useStatusManagementResources } from './use-status-management-resources';
import { useStatusOrgSave } from './use-status-org-save';

export function useStatusManagementController() {
  const command = useExclusiveOperation('status-management-command');
  const incidentQuery = useStatusIncidentQuery();
  const resources = useStatusManagementResources(incidentQuery.query);
  const notify = useStatusManagementNotifications();
  const componentEditor = useStatusComponentEditor(command);
  const incidentEditor = useStatusIncidentEditor(command);
  const orgSave = useStatusOrgSave(resources.org.data, command, notify);
  const components = useStatusComponentTransactions(command, componentEditor, notify, incidentEditor.retireDetail);
  const incidents = useStatusIncidentTransactions(incidentQuery.query, command, incidentEditor, notify);
  const orgState = resolveOrgState(resources.org.isPending, resources.org.error, resources.org.data);
  const componentState = resolveComponentState(
    resources.components.isPending,
    resources.components.error,
    resources.components.data
  );
  const incidentState = resolveIncidentState(
    resources.incidents.isPending,
    resources.incidents.error,
    resources.incidents.data
  );
  const editorCommands = createEditorCommands({
    command,
    orgState,
    componentEditor,
    incidentEditor
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
    saveOrg: orgSave.save,
    retryOrgWrite: orgSave.retryWrite,
    orgWriteRecovery: orgSave.writeRecovery,
    ...editorCommands,
    saveComponent: components.save,
    retryComponentWrite: components.retryWrite,
    deleteComponent: components.remove,
    saveIncident: incidents.save,
    retryIncidentWrite: incidents.retryWrite,
    deleteIncident: incidents.remove,
    refreshComponents: components.refresh,
    refreshIncidents: incidents.refresh
  };
}

function createEditorCommands(context: {
  command: ReturnType<typeof useExclusiveOperation>;
  orgState: StatusRecordState<StatusOrgRecord>;
  componentEditor: ReturnType<typeof useStatusComponentEditor>;
  incidentEditor: ReturnType<typeof useStatusIncidentEditor>;
}) {
  const { command, orgState, componentEditor, incidentEditor } = context;
  return {
    openNewComponent: () => {
      if (command.isLocked() || orgState.kind !== 'ready') return;
      componentEditor.openNew(orgState.record.id);
    },
    editComponent: (value: StatusComponent) => {
      if (command.isLocked()) return;
      componentEditor.edit(value);
    },
    closeComponent: () => {
      if (command.isLocked()) return;
      componentEditor.close();
    },
    openNewIncident: () => {
      if (command.isLocked() || orgState.kind !== 'ready') return;
      incidentEditor.openNew(orgState.record.id);
    },
    openIncident: (id: number) => {
      if (command.isLocked()) return;
      incidentEditor.edit(id);
    },
    closeIncident: () => {
      if (command.isLocked()) return;
      incidentEditor.close();
    }
  };
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
