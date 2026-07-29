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

import {
  buildCreateDraft,
  monitorDefinitionWorkspaceHasUncertainWrite,
  type MonitorDefinitionWorkspace
} from '../model/monitor-definition-model';
import type { MonitorDefinitionOperationOwner } from './monitor-definition-operation-owner';
import {
  editMonitorDefinitionWorkspace,
  loadMonitorDefinitionWorkspace
} from './monitor-definition-workspace-commands';

type WorkspaceOpenContext = {
  workspace: MonitorDefinitionWorkspace | null;
  workspaceRef: { current: MonitorDefinitionWorkspace | null };
  canWriteRef: { current: boolean };
  actionEpoch: number;
  owner: MonitorDefinitionOperationOwner;
  setWorkspace: (value: MonitorDefinitionWorkspace | null) => void;
  language: string;
};

export function useMonitorDefinitionWorkspaceOpen(context: WorkspaceOpenContext) {
  const { owner, canWriteRef, actionEpoch, workspace, workspaceRef, setWorkspace, language } = context;
  return useMemo(
    () => ({
      openView: (app: string) => {
        if (workspaceOpenBlocked(owner, workspaceRef.current)) return rejectedWorkspaceOpen();
        return admittedWorkspaceOpen(loadMonitorDefinitionWorkspace('view', app, language, owner, setWorkspace));
      },
      openEdit: (app: string) => {
        if (!canWriteRef.current || !owner.matches(actionEpoch) || workspaceOpenBlocked(owner, workspaceRef.current))
          return rejectedWorkspaceOpen();
        return admittedWorkspaceOpen(loadMonitorDefinitionWorkspace('edit', app, language, owner, setWorkspace));
      },
      openCreate: () => {
        if (!canWriteRef.current || !owner.matches(actionEpoch) || workspaceOpenBlocked(owner, workspaceRef.current))
          return false;
        owner.retire();
        setWorkspace(editMonitorDefinitionWorkspace(buildCreateDraft()));
        return true;
      },
      retryWorkspace: () =>
        owner.matches(actionEpoch) &&
        workspaceRef.current === workspace &&
        !owner.busy() &&
        workspace?.kind === 'error' &&
        (workspace.mode === 'view' || canWriteRef.current)
          ? loadMonitorDefinitionWorkspace(workspace.mode, workspace.app, language, owner, setWorkspace)
          : Promise.resolve()
    }),
    [actionEpoch, canWriteRef, language, owner, setWorkspace, workspace, workspaceRef]
  );
}

function workspaceOpenBlocked(owner: MonitorDefinitionOperationOwner, workspace: MonitorDefinitionWorkspace | null) {
  return owner.busy() || monitorDefinitionWorkspaceHasUncertainWrite(workspace);
}

function rejectedWorkspaceOpen() {
  return { admitted: false as const, completion: Promise.resolve() };
}

function admittedWorkspaceOpen(completion: Promise<void>) {
  return { admitted: true as const, completion };
}
