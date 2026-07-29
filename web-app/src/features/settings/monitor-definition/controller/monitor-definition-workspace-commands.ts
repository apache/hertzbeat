/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import {
  createMonitorDefinition,
  loadMonitorDefinitionDetail,
  MonitorDefinitionRequestError,
  updateMonitorDefinition,
  validateMonitorDefinition
} from '../api/monitor-definition-api';
import {
  buildUpdateDraft,
  monitorDefinitionDraftRequiredFailure,
  monitorDefinitionNeedsCatalogReconciliation,
  type MonitorDefinitionDetail,
  type MonitorDefinitionDraft,
  type MonitorDefinitionFailureKind,
  type MonitorDefinitionValidation,
  type MonitorDefinitionWorkspace
} from '../model/monitor-definition-model';
import type { MonitorDefinitionOperation, MonitorDefinitionOperationOwner } from './monitor-definition-operation-owner';

type Pending = 'load' | 'validate' | 'save' | 'refresh' | null;
type EditorCommandOptions = {
  canWriteRef: { current: boolean };
  language: string;
  onChanged: () => void;
};

export async function loadMonitorDefinitionWorkspace(
  mode: 'view' | 'edit',
  app: string,
  language: string,
  owner: MonitorDefinitionOperationOwner,
  publish: (value: MonitorDefinitionWorkspace) => void
) {
  const operation = owner.begin('detail-load');
  publish({ kind: 'loading', mode, app });
  try {
    const detail = await loadMonitorDefinitionDetail(app, language);
    if (!owner.owns(operation)) return;
    publish(mode === 'view' ? { kind: 'view', detail } : editMonitorDefinitionWorkspace(buildUpdateDraft(detail)));
  } catch (error) {
    if (!owner.owns(operation)) return;
    publish({ kind: 'error', mode, app, failure: monitorDefinitionFailureKind(error) });
  } finally {
    owner.complete(operation);
  }
}

export async function runMonitorDefinitionEditorCommand(
  operation: Exclude<Pending, 'load' | null>,
  workspace: MonitorDefinitionWorkspace | null,
  actionEpoch: number,
  workspaceRef: { current: MonitorDefinitionWorkspace | null },
  options: EditorCommandOptions,
  owner: MonitorDefinitionOperationOwner,
  publish: (value: MonitorDefinitionWorkspace) => void
) {
  if (!editorCommandAllowed(workspace, actionEpoch, workspaceRef, options.canWriteRef, owner)) return;
  const requiredFailure = operation === 'refresh' ? null : monitorDefinitionDraftRequiredFailure(workspace.draft);
  if (requiredFailure) return publish({ ...workspace, failure: requiredFailure, pending: null, validation: null });
  const command = owner.begin('exclusive-command');
  publish({ ...workspace, pending: operation, failure: null });
  try {
    const next = await performEditorCommand(operation, workspace.draft, options.language, command);
    if (!owner.owns(command)) return;
    publishEditorResult(next, workspace, publish);
    if (operation === 'save') options.onChanged();
  } catch (error) {
    if (!owner.owns(command)) return;
    const failure = monitorDefinitionFailureKind(error);
    if (operation === 'save' && monitorDefinitionNeedsCatalogReconciliation(failure)) options.onChanged();
    publish({ ...workspace, pending: null, failure });
  } finally {
    owner.complete(command);
  }
}

export function editMonitorDefinitionWorkspace(
  draft: MonitorDefinitionDraft,
  failure: MonitorDefinitionFailureKind | null = null
): MonitorDefinitionWorkspace {
  return { kind: 'edit', draft, failure, pending: null, validation: null };
}

export function monitorDefinitionWorkspaceRequiresWrite(workspace: MonitorDefinitionWorkspace | null) {
  return (
    workspace?.kind === 'edit' ||
    ((workspace?.kind === 'loading' || workspace?.kind === 'error') && workspace.mode === 'edit')
  );
}

function editorCommandAllowed(
  workspace: MonitorDefinitionWorkspace | null,
  actionEpoch: number,
  workspaceRef: { current: MonitorDefinitionWorkspace | null },
  canWriteRef: { current: boolean },
  owner: MonitorDefinitionOperationOwner
): workspace is Extract<MonitorDefinitionWorkspace, { kind: 'edit' }> {
  return (
    canWriteRef.current &&
    owner.matches(actionEpoch) &&
    workspaceRef.current === workspace &&
    workspace?.kind === 'edit' &&
    !workspace.pending &&
    !owner.busy()
  );
}

function publishEditorResult(
  next: MonitorDefinitionDetail | MonitorDefinitionValidation | MonitorDefinitionDraft,
  workspace: Extract<MonitorDefinitionWorkspace, { kind: 'edit' }>,
  publish: (value: MonitorDefinitionWorkspace) => void
) {
  if ('schemaVersion' in next && 'definition' in next) publish({ kind: 'view', detail: next });
  else if ('schemaVersion' in next) publish({ ...workspace, pending: null, validation: next });
  else publish(editMonitorDefinitionWorkspace(next));
}

async function performEditorCommand(
  operation: 'validate' | 'save' | 'refresh',
  draft: MonitorDefinitionDraft,
  language: string,
  command: MonitorDefinitionOperation
) {
  if (operation === 'validate') {
    return validateMonitorDefinition({
      operation: draft.mode,
      expectedApp: draft.expectedApp,
      definition: draft.definition
    });
  }
  if (operation === 'refresh' && draft.mode === 'update') {
    return buildUpdateDraft(await loadMonitorDefinitionDetail(draft.expectedApp, language));
  }
  if (operation === 'refresh') return draft;
  return draft.mode === 'create'
    ? createMonitorDefinition(draft.definition, language, command.abort.signal)
    : updateMonitorDefinition(draft.expectedApp, draft.definition, draft.revision, language, command.abort.signal);
}

function monitorDefinitionFailureKind(error: unknown): MonitorDefinitionFailureKind {
  return error instanceof MonitorDefinitionRequestError ? error.kind : 'error';
}
