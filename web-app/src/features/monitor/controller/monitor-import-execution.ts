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

import { importMonitorConfig, MonitorImportError } from '../api/monitor-import-api';
import type { MonitorImportFailureKind, MonitorImportTask } from '../model/monitor-import-model';

export type MonitorImportExecutionOwner = { generation: number; controller: AbortController };

type MonitorImportExecution = {
  owner: MonitorImportExecutionOwner;
  owns: () => boolean;
  accept: (task: MonitorImportTask) => void;
  publishFailure: (failure: MonitorImportFailureKind) => void;
  finish: () => void;
};

export async function executeMonitorImport(file: File, execution: MonitorImportExecution) {
  try {
    const task = await importMonitorConfig(file, execution.owner.controller.signal);
    if (!execution.owns()) return false;
    execution.accept(task);
    return execution.owns();
  } catch (error) {
    if (!execution.owns()) return false;
    execution.publishFailure(error instanceof MonitorImportError ? error.kind : 'error');
    return false;
  } finally {
    execution.finish();
  }
}
