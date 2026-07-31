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
  type MonitorDefinitionDetail,
  type MonitorDefinitionDraft,
  type MonitorDefinitionFailureKind,
  type MonitorDefinitionValidation,
  type MonitorDefinitionWorkspace
} from '../model/monitor-definition-model';
import {
  monitorDefinitionWriteNeedsCatalogProof,
  proveOwnedMonitorDefinitionCatalog,
  type MonitorDefinitionCatalogProof
} from './monitor-definition-catalog-proof';
import type { MonitorDefinitionOperation, MonitorDefinitionOperationOwner } from './monitor-definition-operation-owner';

type Pending = 'load' | 'validate' | 'save' | 'refresh' | 'proof' | null;
type EditorCommandOptions = {
  canWriteRef: { current: boolean };
  catalogProof: MonitorDefinitionCatalogProof;
  language: string;
};
type EditorCommandResult =
  | MonitorDefinitionDetail
  | MonitorDefinitionValidation
  | MonitorDefinitionDraft
  | {
      kind: 'canonical-write';
      detail: MonitorDefinitionDetail;
      catalog: Awaited<ReturnType<MonitorDefinitionCatalogProof['load']>>;
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
    const detail = await loadMonitorDefinitionDetail(app, language, operation.abort.signal);
    if (!owner.owns(operation)) return;
    if (mode === 'edit' && !detail.editable) {
      publish({ kind: 'error', mode, app: detail.app, failure: 'immutable' });
    } else {
      publish(mode === 'view' ? { kind: 'view', detail } : editMonitorDefinitionWorkspace(buildUpdateDraft(detail)));
    }
  } catch (error) {
    if (!owner.owns(operation)) return;
    publish({ kind: 'error', mode, app, failure: monitorDefinitionFailureKind(error) });
  } finally {
    owner.complete(operation);
  }
}

export async function runMonitorDefinitionEditorCommand(
  operation: Exclude<Pending, 'load' | 'proof' | null>,
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
    const next = await performEditorCommand(
      operation,
      workspace.draft,
      options.language,
      options.catalogProof,
      command
    );
    if (!owner.owns(command)) return;
    publishEditorCommandResult(next, workspace, options.catalogProof, publish);
  } catch (error) {
    if (!owner.owns(command)) return;
    const failure = monitorDefinitionFailureKind(error);
    const writeUncertain = operation === 'save' && monitorDefinitionWriteNeedsCatalogProof(error);
    if (writeUncertain) {
      owner.markCatalogProof(command);
      publish({ ...workspace, pending: 'proof', failure, writeRecovery: 'uncertain' });
      await proveOwnedMonitorDefinitionCatalog(options.catalogProof, command, owner);
    }
    if (!owner.owns(command)) return;
    publish({ ...workspace, pending: null, failure, writeRecovery: writeUncertain ? 'uncertain' : null });
  } finally {
    owner.complete(command);
  }
}

export function editMonitorDefinitionWorkspace(
  draft: MonitorDefinitionDraft,
  failure: MonitorDefinitionFailureKind | null = null
): MonitorDefinitionWorkspace {
  return { kind: 'edit', draft, failure, pending: null, validation: null, writeRecovery: null };
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
    workspace.writeRecovery === null &&
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

function publishEditorCommandResult(
  next: EditorCommandResult,
  workspace: Extract<MonitorDefinitionWorkspace, { kind: 'edit' }>,
  catalogProof: MonitorDefinitionCatalogProof,
  publish: (value: MonitorDefinitionWorkspace) => void
) {
  if (isCanonicalEditorWrite(next)) {
    catalogProof.publish(next.catalog);
    publishEditorResult(next.detail, workspace, publish);
    return;
  }
  publishEditorResult(next, workspace, publish);
}

function isCanonicalEditorWrite(
  next: EditorCommandResult
): next is Extract<EditorCommandResult, { kind: 'canonical-write' }> {
  return 'kind' in next && next.kind === 'canonical-write';
}

async function performEditorCommand(
  operation: 'validate' | 'save' | 'refresh',
  draft: MonitorDefinitionDraft,
  language: string,
  catalogProof: MonitorDefinitionCatalogProof,
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
    return buildUpdateDraft(await loadMonitorDefinitionDetail(draft.expectedApp, language, command.abort.signal));
  }
  if (operation === 'refresh') return draft;
  let committed = false;
  try {
    const receipt = await (draft.mode === 'create'
      ? createMonitorDefinition(draft.definition, language, command.abort.signal)
      : updateMonitorDefinition(draft.expectedApp, draft.definition, draft.revision, language, command.abort.signal));
    committed = true;
    const [detail, catalog] = await Promise.all([
      loadMonitorDefinitionDetail(receipt.app, language, command.abort.signal),
      catalogProof.load(command.abort.signal)
    ]);
    return { kind: 'canonical-write' as const, detail, catalog };
  } catch (error) {
    if (!committed) throw error;
    throw committedWriteProofError(error);
  }
}

function monitorDefinitionFailureKind(error: unknown): MonitorDefinitionFailureKind {
  return error instanceof MonitorDefinitionRequestError ? error.kind : 'error';
}

function committedWriteProofError(error: unknown) {
  return new MonitorDefinitionRequestError(monitorDefinitionFailureKind(error), 'uncertain');
}
