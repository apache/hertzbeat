/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { openBrowserEventStream } from '@/core/http/event-stream';

import { parseMonitorImportTaskReread } from './monitor-import-task-schema';

const managerSseEndpoint = '/api/manager/sse/subscribe';
const importTaskEventNames = ['manager-ready', 'IMPORT_TASK_EVENT'] as const;

export function openMonitorImportTaskStream(handlers: {
  onCanonicalReread: (eventName: (typeof importTaskEventNames)[number]) => void;
}) {
  return openBrowserEventStream(managerSseEndpoint, {
    eventNames: importTaskEventNames,
    onOpen: () => undefined,
    onRetrying: () => undefined,
    onUnavailable: () => undefined,
    onEvent: (eventName, payload) => {
      if (parseMonitorImportTaskReread(payload)) {
        handlers.onCanonicalReread(eventName as (typeof importTaskEventNames)[number]);
      }
    }
  });
}
