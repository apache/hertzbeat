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

import { refreshBrowserSession } from './http-client';

const RETRY_DELAYS_MS = [1_000, 3_000, 10_000] as const;

export type BrowserEventStreamHandlers = {
  eventNames: readonly string[];
  onOpen: () => void;
  onEvent: (name: string, data: string) => void;
  onRetrying: () => void;
  onUnavailable: () => void;
};

export function openBrowserEventStream(path: string, handlers: BrowserEventStreamHandlers) {
  let source: EventSource | undefined;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let consecutiveFailures = 0;
  let refreshAttempted = false;
  let retryScheduled = false;
  let closed = false;

  const connect = () => {
    if (closed) return;
    retryScheduled = false;
    let current: EventSource;
    try {
      current = new EventSource(path);
      source = current;
    } catch {
      scheduleRetry();
      return;
    }
    current.onopen = () => {
      if (closed || source !== current) return;
      consecutiveFailures = 0;
      handlers.onOpen();
    };
    current.onerror = () => {
      if (closed || source !== current) return;
      current.close();
      source = undefined;
      scheduleRetry();
    };
    for (const eventName of handlers.eventNames) {
      current.addEventListener(eventName, event => {
        if (closed || source !== current) return;
        handlers.onEvent(eventName, (event as MessageEvent<string>).data);
      });
    }
  };

  const scheduleRetry = () => {
    if (closed || retryScheduled) return;
    retryScheduled = true;
    const delay = RETRY_DELAYS_MS[consecutiveFailures];
    if (delay === undefined) {
      handlers.onUnavailable();
      return;
    }
    consecutiveFailures += 1;
    handlers.onRetrying();
    const recover = refreshAttempted
      ? Promise.resolve()
      : refreshBrowserSession().then(() => undefined, () => undefined);
    refreshAttempted = true;
    void recover.then(() => {
      if (!closed) retryTimer = setTimeout(connect, delay);
    });
  };

  connect();
  return {
    close() {
      closed = true;
      if (retryTimer) clearTimeout(retryTimer);
      source?.close();
    }
  };
}
