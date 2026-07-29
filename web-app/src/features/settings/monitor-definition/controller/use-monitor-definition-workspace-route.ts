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
  monitorDefinitionWorkspaceApp,
  monitorDefinitionWorkspaceHasUncertainWrite,
  type MonitorDefinitionWorkspace
} from '../model/monitor-definition-model';
import type { MonitorDefinitionOperationOwner } from './monitor-definition-operation-owner';
import { loadMonitorDefinitionWorkspace } from './monitor-definition-workspace-commands';

type WorkspaceRouteContext = {
  workspaceRef: { current: MonitorDefinitionWorkspace | null };
  owner: MonitorDefinitionOperationOwner;
  setWorkspace: (value: MonitorDefinitionWorkspace | null) => void;
  language: string;
};

export function useMonitorDefinitionWorkspaceRoute(context: WorkspaceRouteContext) {
  const { owner, workspaceRef, setWorkspace, language } = context;
  return useMemo(
    () => ({
      followRoute: (app: string | null) => {
        const current = workspaceRef.current;
        if (app && monitorDefinitionWorkspaceApp(current) === app) return true;
        // Route identity may retire reads and ordinary drafts, but never owns an exclusive or uncertain command.
        if (owner.closeBlocked() || monitorDefinitionWorkspaceHasUncertainWrite(current)) return false;
        if (!app) {
          if (!current) return true;
          owner.retire();
          setWorkspace(null);
          return true;
        }
        void loadMonitorDefinitionWorkspace('view', app, language, owner, setWorkspace);
        return true;
      }
    }),
    [language, owner, setWorkspace, workspaceRef]
  );
}
