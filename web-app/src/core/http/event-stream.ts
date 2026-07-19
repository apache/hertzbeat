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
  const stream = new BrowserEventStream(path, handlers);
  stream.open();
  return { close: () => stream.close() };
}

class BrowserEventStream {
  private source: EventSource | undefined;
  private retryTimer: ReturnType<typeof setTimeout> | undefined;
  private consecutiveFailures = 0;
  private refreshAttempted = false;
  private retryScheduled = false;
  private closed = false;

  constructor(
    private readonly path: string,
    private readonly handlers: BrowserEventStreamHandlers
  ) {}

  open() {
    if (this.closed) return;
    this.retryScheduled = false;
    let current: EventSource;
    try {
      current = new EventSource(this.path);
      this.source = current;
    } catch {
      this.scheduleRetry();
      return;
    }
    current.onopen = () => {
      if (!this.owns(current)) return;
      this.consecutiveFailures = 0;
      this.handlers.onOpen();
    };
    current.onerror = () => {
      if (!this.owns(current)) return;
      current.close();
      this.source = undefined;
      this.scheduleRetry();
    };
    for (const eventName of this.handlers.eventNames) {
      current.addEventListener(eventName, event => {
        if (!this.owns(current)) return;
        this.handlers.onEvent(eventName, (event as MessageEvent<string>).data);
      });
    }
  }

  close() {
    this.closed = true;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.source?.close();
  }

  private owns(candidate: EventSource) {
    return !this.closed && this.source === candidate;
  }

  private scheduleRetry() {
    if (this.closed || this.retryScheduled) return;
    this.retryScheduled = true;
    const delay = RETRY_DELAYS_MS[this.consecutiveFailures];
    if (delay === undefined) {
      this.handlers.onUnavailable();
      return;
    }
    this.consecutiveFailures += 1;
    this.handlers.onRetrying();
    void this.recoverAndReconnect(delay);
  }

  private async recoverAndReconnect(delay: number) {
    // Refresh at most once per stream. Further retries only back off so an
    // expired session cannot create a refresh storm.
    if (!this.refreshAttempted) {
      this.refreshAttempted = true;
      try {
        await refreshBrowserSession();
      } catch {
        // The bounded EventSource retry budget owns the unavailable outcome.
      }
    }
    if (!this.closed) this.retryTimer = setTimeout(() => this.open(), delay);
  }
}
