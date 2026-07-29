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

import type { MonitorDefinitionWorkspace } from '../model/monitor-definition-model';
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
  onChanged: () => void;
};

type WorkspaceProofContext = Pick<
  WorkspaceEditorContext,
  'workspace' | 'workspaceRef' | 'canWriteRef' | 'actionEpoch' | 'owner' | 'setWorkspace' | 'catalogProof'
>;

export function useMonitorDefinitionWorkspaceEditor(context: WorkspaceEditorContext) {
  const { owner, canWriteRef, actionEpoch, workspace, workspaceRef, setWorkspace, catalogProof, language, onChanged } =
    context;
  return useMemo(() => {
    const run = (operation: 'validate' | 'save' | 'refresh') =>
      runMonitorDefinitionEditorCommand(
        operation,
        workspace,
        actionEpoch,
        workspaceRef,
        { canWriteRef, catalogProof, language, onChanged },
        owner,
        setWorkspace
      );
    return {
      closeWorkspace: () => {
        if (
          !owner.matches(actionEpoch) ||
          workspaceRef.current !== workspace ||
          owner.closeBlocked() ||
          (workspace?.kind === 'edit' && workspace.pending && workspace.pending !== 'proof')
        )
          return false;
        owner.retire();
        setWorkspace(null);
        return true;
      },
      setDefinition: (definition: string) => {
        if (
          !canWriteRef.current ||
          !owner.matches(actionEpoch) ||
          workspaceRef.current !== workspace ||
          workspace?.kind !== 'edit' ||
          workspace.writeRecovery
        )
          return;
        setWorkspace({ ...workspace, draft: { ...workspace.draft, definition }, failure: null, validation: null });
      },
      validate: () => run('validate'),
      save: () => run('save'),
      refreshAuthoritativeDraft: () => run('refresh'),
      retryWorkspaceProof: () =>
        retryWorkspaceCatalogProof({
          workspace,
          workspaceRef,
          canWriteRef,
          actionEpoch,
          owner,
          catalogProof,
          setWorkspace
        })
    };
  }, [actionEpoch, canWriteRef, catalogProof, language, onChanged, owner, setWorkspace, workspace, workspaceRef]);
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
