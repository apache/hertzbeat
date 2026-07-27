/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useRef, useState } from 'react';

import {
  createMonitorDefinition,
  loadMonitorDefinitionDetail,
  MonitorDefinitionRequestError,
  updateMonitorDefinition,
  validateMonitorDefinition
} from '../api/monitor-definition-api';
import {
  buildCreateDraft,
  buildUpdateDraft,
  monitorDefinitionDraftRequiredFailure,
  monitorDefinitionNeedsCatalogReconciliation,
  type MonitorDefinitionDetail,
  type MonitorDefinitionDraft,
  type MonitorDefinitionFailureKind,
  type MonitorDefinitionValidation,
  type MonitorDefinitionWorkspace
} from '../model/monitor-definition-model';

type Pending = 'load' | 'validate' | 'save' | 'refresh' | null;

export function useMonitorDefinitionWorkspace(options: { canWrite: boolean; language: string; onChanged: () => void }) {
  const [workspace, setWorkspace] = useState<MonitorDefinitionWorkspace | null>(null);
  const command = useRef(0);
  const active = useRef(false);

  const openView = (app: string) => loadWorkspace('view', app, options.language, command, setWorkspace);
  const openEdit = (app: string) => {
    if (!options.canWrite) return Promise.resolve();
    return loadWorkspace('edit', app, options.language, command, setWorkspace);
  };
  const openCreate = () => {
    if (!options.canWrite) return;
    command.current += 1;
    setWorkspace(editWorkspace(buildCreateDraft()));
  };
  const closeWorkspace = () => {
    if (active.current || (workspace?.kind === 'edit' && workspace.pending)) return;
    command.current += 1;
    setWorkspace(null);
  };
  const setDefinition = (definition: string) => {
    setWorkspace(current =>
      current?.kind === 'edit'
        ? { ...current, draft: { ...current.draft, definition }, failure: null, validation: null }
        : current
    );
  };
  const validate = () => runEditorCommand('validate', workspace, options, command, active, setWorkspace);
  const save = () => runEditorCommand('save', workspace, options, command, active, setWorkspace);
  const refreshAuthoritativeDraft = () =>
    runEditorCommand('refresh', workspace, options, command, active, setWorkspace);
  const retryWorkspace = () =>
    workspace?.kind === 'error'
      ? loadWorkspace(workspace.mode, workspace.app, options.language, command, setWorkspace)
      : Promise.resolve();

  return {
    workspace,
    actions: {
      closeWorkspace,
      openCreate,
      openEdit,
      openView,
      refreshAuthoritativeDraft,
      retryWorkspace,
      save,
      setDefinition,
      validate
    }
  };
}

async function loadWorkspace(
  mode: 'view' | 'edit',
  app: string,
  language: string,
  command: { current: number },
  publish: (value: MonitorDefinitionWorkspace) => void
) {
  const owner = ++command.current;
  publish({ kind: 'loading', mode, app });
  try {
    const detail = await loadMonitorDefinitionDetail(app, language);
    if (owner !== command.current) return;
    publish(mode === 'view' ? { kind: 'view', detail } : editWorkspace(buildUpdateDraft(detail)));
  } catch (error) {
    if (owner !== command.current) return;
    publish({ kind: 'error', mode, app, failure: failureKind(error) });
  }
}

async function runEditorCommand(
  operation: Exclude<Pending, 'load' | null>,
  workspace: MonitorDefinitionWorkspace | null,
  options: { canWrite: boolean; language: string; onChanged: () => void },
  command: { current: number },
  active: { current: boolean },
  publish: (value: MonitorDefinitionWorkspace) => void
) {
  if (!options.canWrite || workspace?.kind !== 'edit' || workspace.pending || active.current) return;
  // Reject only missing YAML locally; the server remains the semantic YAML validator.
  const requiredFailure = operation === 'refresh' ? null : monitorDefinitionDraftRequiredFailure(workspace.draft);
  if (requiredFailure) {
    publish({ ...workspace, failure: requiredFailure, pending: null, validation: null });
    return;
  }
  active.current = true;
  const owner = ++command.current;
  publish({ ...workspace, pending: operation, failure: null });
  try {
    const next = await performEditorCommand(operation, workspace.draft, options.language);
    if (owner !== command.current) return;
    publishEditorResult(next, workspace, publish);
    if (operation === 'save') options.onChanged();
  } catch (error) {
    if (owner !== command.current) return;
    const failure = failureKind(error);
    reconcileUncertainSave(operation, failure, options.onChanged);
    publish({ ...workspace, pending: null, failure });
  } finally {
    active.current = false;
  }
}

function reconcileUncertainSave(
  operation: Exclude<Pending, 'load' | null>,
  failure: MonitorDefinitionFailureKind,
  onChanged: () => void
) {
  if (operation === 'save' && monitorDefinitionNeedsCatalogReconciliation(failure)) onChanged();
}

function publishEditorResult(
  next: MonitorDefinitionDetail | MonitorDefinitionValidation | MonitorDefinitionDraft,
  workspace: Extract<MonitorDefinitionWorkspace, { kind: 'edit' }>,
  publish: (value: MonitorDefinitionWorkspace) => void
) {
  if ('schemaVersion' in next && 'definition' in next) publish({ kind: 'view', detail: next });
  else if ('schemaVersion' in next) publish({ ...workspace, pending: null, validation: next });
  else publish(editWorkspace(next));
}

async function performEditorCommand(
  operation: 'validate' | 'save' | 'refresh',
  draft: MonitorDefinitionDraft,
  language: string
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
    ? createMonitorDefinition(draft.definition, language)
    : updateMonitorDefinition(draft.expectedApp, draft.definition, draft.revision, language);
}

function editWorkspace(
  draft: MonitorDefinitionDraft,
  failure: MonitorDefinitionFailureKind | null = null
): MonitorDefinitionWorkspace {
  return { kind: 'edit', draft, failure, pending: null, validation: null };
}

function failureKind(error: unknown): MonitorDefinitionFailureKind {
  return error instanceof MonitorDefinitionRequestError ? error.kind : 'error';
}
