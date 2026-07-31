/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

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
