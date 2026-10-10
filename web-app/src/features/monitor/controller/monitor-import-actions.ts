/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { QueryClient } from '@tanstack/react-query';
import type { Dispatch, SetStateAction } from 'react';

import {
  validateMonitorImportFile,
  type MonitorImportDraft,
  type MonitorImportFailureKind,
  type MonitorImportInvalidKind
} from '../model/monitor-import-model';
import { executeMonitorImport, type MonitorImportExecutionOwner } from './monitor-import-execution';
import { monitorQueryKeys } from './monitor-query-keys';

type MonitorImportActionLifecycle = {
  retire: () => void;
  canStart: () => boolean;
  begin: () => MonitorImportExecutionOwner | null;
  owns: (owner: MonitorImportExecutionOwner) => boolean;
  finish: (owner: MonitorImportExecutionOwner) => boolean;
};

type MonitorImportActionsOptions = {
  lifecycle: MonitorImportActionLifecycle;
  queryClient: QueryClient;
  open: boolean;
  draft: MonitorImportDraft | null;
  activeTaskId: string | null;
  setOpen: Dispatch<SetStateAction<boolean>>;
  setDraft: Dispatch<SetStateAction<MonitorImportDraft | null>>;
  setInvalid: Dispatch<SetStateAction<MonitorImportInvalidKind | null>>;
  setFailure: Dispatch<SetStateAction<MonitorImportFailureKind | null>>;
  setBusy: Dispatch<SetStateAction<boolean>>;
  setActiveTaskId: Dispatch<SetStateAction<string | null>>;
};

export function createMonitorImportActions(options: MonitorImportActionsOptions) {
  const { lifecycle, queryClient, open, draft, activeTaskId } = options;
  const openDialog = () => {
    if (!lifecycle.canStart()) return;
    options.setOpen(true);
    options.setDraft({ file: null });
    options.setInvalid(null);
    options.setFailure(null);
    options.setActiveTaskId(null);
  };
  const selectFile = (file: File | null) => {
    if (!lifecycle.canStart() || !open || activeTaskId) return;
    options.setDraft({ file });
    options.setInvalid(null);
    options.setFailure(null);
  };
  const submit = async () => {
    if (!lifecycle.canStart() || !open || !draft) return false;
    const validation = validateMonitorImportFile(draft.file);
    if (!validation.valid) {
      options.setInvalid(validation.reason);
      return false;
    }
    const owner = lifecycle.begin();
    if (!owner) return false;
    options.setBusy(true);
    options.setFailure(null);
    return executeMonitorImport(validation.file, {
      owner,
      owns: () => lifecycle.owns(owner),
      accept: accepted => {
        queryClient.setQueryData(monitorQueryKeys.importTask(accepted.taskId), accepted);
        options.setActiveTaskId(accepted.taskId);
        options.setDraft({ file: null });
      },
      publishFailure: options.setFailure,
      finish: () => {
        if (lifecycle.finish(owner)) options.setBusy(false);
      }
    });
  };
  return { open: openDialog, cancel: lifecycle.retire, selectFile, submit };
}
