/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { useMemo } from 'react';

import { monitorDefinitionWorkspaceIsDirty, type MonitorDefinitionWorkspace } from '../model/monitor-definition-model';
import {
  proveOwnedMonitorDefinitionCatalog,
  type MonitorDefinitionCatalogProof
} from './monitor-definition-catalog-proof';
import type { MonitorDefinitionOperationOwner } from './monitor-definition-operation-owner';
import { runMonitorDefinitionEditorCommand } from './monitor-definition-workspace-commands';

type WorkspaceEditorContext = {
  workspace: MonitorDefinitionWorkspace | null;
  workspaceRef: { current: MonitorDefinitionWorkspace | null };
  canWriteRef: { current: boolean };
  actionEpoch: number;
  owner: MonitorDefinitionOperationOwner;
  setWorkspace: (value: MonitorDefinitionWorkspace | null) => void;
  catalogProof: MonitorDefinitionCatalogProof;
  language: string;
};

type WorkspaceProofContext = Pick<
  WorkspaceEditorContext,
  'workspace' | 'workspaceRef' | 'canWriteRef' | 'actionEpoch' | 'owner' | 'setWorkspace' | 'catalogProof'
>;

export function useMonitorDefinitionWorkspaceEditor(context: WorkspaceEditorContext) {
  const { owner, canWriteRef, actionEpoch, workspace, workspaceRef, setWorkspace, catalogProof, language } = context;
  return useMemo(
    () =>
      createWorkspaceEditorActions({
        owner,
        canWriteRef,
        actionEpoch,
        workspace,
        workspaceRef,
        setWorkspace,
        catalogProof,
        language
      }),
    [actionEpoch, canWriteRef, catalogProof, language, owner, setWorkspace, workspace, workspaceRef]
  );
}

function createWorkspaceEditorActions(context: WorkspaceEditorContext) {
  return {
    closeWorkspace: () => closeMonitorDefinitionWorkspace(context),
    cancelEdit: () => cancelMonitorDefinitionEdit(context),
    setDefinition: (definition: string) => setMonitorDefinitionDraft(context, definition),
    validate: () => runWorkspaceEditorCommand(context, 'validate'),
    save: () =>
      monitorDefinitionWorkspaceIsDirty(context.workspace)
        ? runWorkspaceEditorCommand(context, 'save')
        : Promise.resolve(),
    refreshAuthoritativeDraft: () => runWorkspaceEditorCommand(context, 'refresh'),
    retryWorkspaceProof: () => retryWorkspaceCatalogProof(context)
  };
}

function runWorkspaceEditorCommand(context: WorkspaceEditorContext, operation: 'validate' | 'save' | 'refresh') {
  const { workspace, actionEpoch, workspaceRef, canWriteRef, catalogProof, language, owner, setWorkspace } = context;
  return runMonitorDefinitionEditorCommand(
    operation,
    workspace,
    actionEpoch,
    workspaceRef,
    { canWriteRef, catalogProof, language },
    owner,
    setWorkspace
  );
}

function closeMonitorDefinitionWorkspace(context: WorkspaceEditorContext) {
  const { workspace, workspaceRef, actionEpoch, owner, setWorkspace } = context;
  if (
    !owner.matches(actionEpoch) ||
    workspaceRef.current !== workspace ||
    owner.closeBlocked() ||
    monitorDefinitionWorkspaceIsDirty(workspace) ||
    (workspace?.kind === 'edit' && workspace.pending && workspace.pending !== 'proof')
  )
    return false;
  owner.retire();
  setWorkspace(null);
  return true;
}

function cancelMonitorDefinitionEdit(context: WorkspaceEditorContext) {
  const { workspace, workspaceRef, actionEpoch, owner, setWorkspace } = context;
  if (
    !owner.matches(actionEpoch) ||
    workspaceRef.current !== workspace ||
    workspace?.kind !== 'edit' ||
    owner.closeBlocked() ||
    (workspace.pending && workspace.pending !== 'proof')
  )
    return false;
  owner.retire();
  setWorkspace(workspace.authority ? { kind: 'view', detail: workspace.authority } : null);
  return true;
}

function setMonitorDefinitionDraft(context: WorkspaceEditorContext, definition: string) {
  const { workspace, workspaceRef, canWriteRef, actionEpoch, owner, setWorkspace } = context;
  if (
    !canWriteRef.current ||
    !owner.matches(actionEpoch) ||
    workspaceRef.current !== workspace ||
    workspace?.kind !== 'edit' ||
    workspace.writeRecovery
  )
    return;
  setWorkspace({ ...workspace, draft: { ...workspace.draft, definition }, failure: null, validation: null });
}

async function retryWorkspaceCatalogProof(context: WorkspaceProofContext) {
  const { workspace, workspaceRef, canWriteRef, actionEpoch, owner, catalogProof, setWorkspace } = context;
  if (
    !canWriteRef.current ||
    !owner.matches(actionEpoch) ||
    workspaceRef.current !== workspace ||
    workspace?.kind !== 'edit' ||
    workspace.writeRecovery !== 'uncertain' ||
    owner.busy()
  )
    return;
  const operation = owner.begin('catalog-proof');
  setWorkspace({ ...workspace, pending: 'proof' });
  await proveOwnedMonitorDefinitionCatalog(catalogProof, operation, owner);
  if (owner.owns(operation)) {
    owner.complete(operation);
    setWorkspace({ ...workspace, pending: null });
  }
}
