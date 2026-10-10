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

import { openBrowserEventStream } from '@/core/http/event-stream';

import { parseMonitorImportTaskReread } from './monitor-import-task-schema';

const managerSseEndpoint = '/api/manager/sse/subscribe';
const importTaskEventNames = ['manager-ready', 'IMPORT_TASK_EVENT'] as const;

export function openMonitorImportTaskStream(handlers: {
  onCanonicalReread: (eventName: (typeof importTaskEventNames)[number]) => void;
}) {
  let stream: ReturnType<typeof openBrowserEventStream> | undefined;
  const close = () => {
    stream?.close();
    stream = undefined;
  };
  const update = () => {
    if (document.visibilityState === 'hidden') close();
    else
      stream ??= openBrowserEventStream(managerSseEndpoint, {
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
  };
  document.addEventListener('visibilitychange', update);
  update();
  return {
    close: () => {
      document.removeEventListener('visibilitychange', update);
      close();
    }
  };
}
