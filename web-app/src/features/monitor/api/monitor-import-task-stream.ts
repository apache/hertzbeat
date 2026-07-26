/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { openBrowserEventStream } from '@/core/http/event-stream';

import { parseMonitorImportTaskEvent, type MonitorImportTaskEvent } from './monitor-import-task-schema';

const managerSseEndpoint = '/api/manager/sse/subscribe';
const importTaskEventName = 'IMPORT_TASK_EVENT';

export function openMonitorImportTaskStream(handlers: { onTask: (event: MonitorImportTaskEvent) => void }) {
  return openBrowserEventStream(managerSseEndpoint, {
    eventNames: [importTaskEventName],
    onOpen: () => undefined,
    onRetrying: () => undefined,
    onUnavailable: () => undefined,
    onEvent: (_name, payload) => {
      const event = parseMonitorImportTaskEvent(payload);
      if (event) handlers.onTask(event);
    }
  });
}
