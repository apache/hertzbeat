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

import { importMonitorConfig, MonitorImportError } from '../api/monitor-import-api';
import type { MonitorImportFailureKind } from '../model/monitor-import-model';

export type MonitorImportExecutionOwner = { generation: number; controller: AbortController };

type MonitorImportExecution = {
  owner: MonitorImportExecutionOwner;
  owns: () => boolean;
  onImported: () => void;
  closeDraft: () => void;
  reread: () => Promise<unknown>;
  warnRefresh: () => void;
  publishFailure: (failure: MonitorImportFailureKind) => void;
  finish: () => void;
};

export async function executeMonitorImport(file: File, execution: MonitorImportExecution) {
  const { owner, owns } = execution;
  try {
    await importMonitorConfig(file, owner.controller.signal);
    // Abort is advisory: ignored cancellation can still resolve, so every
    // callback, reread, notification, and state publication needs ownership.
    if (!owns()) return false;
    execution.onImported();
    if (!owns()) return false;
    execution.closeDraft();
    if (!owns()) return false;
    // Manager SSE owns task completion. The canonical reread remains
    // deterministic if its supplemental progress stream is unavailable.
    try {
      await execution.reread();
    } catch {
      if (owns()) execution.warnRefresh();
    }
    return owns();
  } catch (error) {
    if (!owns()) return false;
    execution.publishFailure(error instanceof MonitorImportError ? error.kind : 'error');
    return false;
  } finally {
    execution.finish();
  }
}
