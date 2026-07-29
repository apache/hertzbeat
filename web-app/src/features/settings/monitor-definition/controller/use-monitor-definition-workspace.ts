/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { buildCreateDraft, type MonitorDefinitionWorkspace } from '../model/monitor-definition-model';
import {
  createMonitorDefinitionOperationOwner,
  type MonitorDefinitionOperationOwner
} from './monitor-definition-operation-owner';
import {
  editMonitorDefinitionWorkspace,
  loadMonitorDefinitionWorkspace,
  monitorDefinitionWorkspaceRequiresWrite,
  runMonitorDefinitionEditorCommand
} from './monitor-definition-workspace-commands';

export function useMonitorDefinitionWorkspace(options: { canWrite: boolean; language: string; onChanged: () => void }) {
  const [workspace, setWorkspace] = useState<MonitorDefinitionWorkspace | null>(null);
  const owner = useMemo(() => createMonitorDefinitionOperationOwner(), []);
  const canWriteRef = useRef(options.canWrite);
  const workspaceRef = useRef(workspace);
  canWriteRef.current = options.canWrite;
  workspaceRef.current = workspace;
  const actionEpoch = owner.snapshot();
  useLayoutEffect(() => {
    if (options.canWrite) return;
    if (monitorDefinitionWorkspaceRequiresWrite(workspaceRef.current)) {
      owner.retire();
      setWorkspace(null);
    }
  }, [options.canWrite, owner]);
  useEffect(() => () => owner.retire(), [owner]);
  const context = { workspace, workspaceRef, canWriteRef, actionEpoch, owner, setWorkspace, ...options };
  return { workspace, actions: { ...workspaceOpenActions(context), ...workspaceEditorActions(context) } };
}

type WorkspaceActionContext = {
  workspace: MonitorDefinitionWorkspace | null;
  workspaceRef: { current: MonitorDefinitionWorkspace | null };
  canWriteRef: { current: boolean };
  actionEpoch: number;
  owner: MonitorDefinitionOperationOwner;
  setWorkspace: (value: MonitorDefinitionWorkspace | null) => void;
  canWrite: boolean;
  language: string;
  onChanged: () => void;
};

function workspaceOpenActions(context: WorkspaceActionContext) {
  const { owner, canWriteRef, actionEpoch, workspace, workspaceRef, setWorkspace, language } = context;
  return {
    openView: (app: string) =>
      owner.busy() ? Promise.resolve() : loadMonitorDefinitionWorkspace('view', app, language, owner, setWorkspace),
    openEdit: (app: string) =>
      !canWriteRef.current || !owner.matches(actionEpoch) || owner.busy()
        ? Promise.resolve()
        : loadMonitorDefinitionWorkspace('edit', app, language, owner, setWorkspace),
    openCreate: () => {
      if (!canWriteRef.current || !owner.matches(actionEpoch) || owner.busy()) return;
      owner.retire();
      setWorkspace(editMonitorDefinitionWorkspace(buildCreateDraft()));
    },
    retryWorkspace: () =>
      owner.matches(actionEpoch) &&
      workspaceRef.current === workspace &&
      !owner.busy() &&
      workspace?.kind === 'error' &&
      (workspace.mode === 'view' || canWriteRef.current)
        ? loadMonitorDefinitionWorkspace(workspace.mode, workspace.app, language, owner, setWorkspace)
        : Promise.resolve()
  };
}

function workspaceEditorActions(context: WorkspaceActionContext) {
  const { owner, canWriteRef, actionEpoch, workspace, workspaceRef, setWorkspace, language, onChanged } = context;
  const run = (operation: 'validate' | 'save' | 'refresh') =>
    runMonitorDefinitionEditorCommand(
      operation,
      workspace,
      actionEpoch,
      workspaceRef,
      { canWriteRef, language, onChanged },
      owner,
      setWorkspace
    );
  return {
    closeWorkspace: () => {
      if (
        !owner.matches(actionEpoch) ||
        workspaceRef.current !== workspace ||
        owner.closeBlocked() ||
        (workspace?.kind === 'edit' && workspace.pending)
      )
        return;
      owner.retire();
      setWorkspace(null);
    },
    setDefinition: (definition: string) => {
      if (!canWriteRef.current || !owner.matches(actionEpoch) || workspaceRef.current !== workspace) return;
      setWorkspace(
        workspace?.kind === 'edit'
          ? { ...workspace, draft: { ...workspace.draft, definition }, failure: null, validation: null }
          : workspace
      );
    },
    validate: () => run('validate'),
    save: () => run('save'),
    refreshAuthoritativeDraft: () => run('refresh')
  };
}
