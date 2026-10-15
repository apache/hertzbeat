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

import { withCookieHeaderAdmission } from './cookie-header-admission';
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
  private opening: AbortController | undefined;
  private retryTimer: ReturnType<typeof setTimeout> | undefined;
  private consecutiveFailures = 0;
  private refreshAttemptedInFailureEpisode = false;
  private retryScheduled = false;
  private closed = false;

  constructor(
    private readonly path: string,
    private readonly handlers: BrowserEventStreamHandlers
  ) {}

  open() {
    if (this.closed) return;
    this.retryScheduled = false;
    const opening = new AbortController();
    this.opening = opening;
    void withCookieHeaderAdmission('shared', signal => this.connect(signal), opening.signal)
      .then(source => {
        if (!this.owns(source)) return;
        this.consecutiveFailures = 0;
        this.refreshAttemptedInFailureEpisode = false;
        this.notify(() => this.handlers.onOpen());
      })
      .catch(() => {
        if (!this.closed) this.scheduleRetry();
      })
      .finally(() => {
        if (this.opening === opening) this.opening = undefined;
      });
  }

  private connect(signal: AbortSignal): Promise<EventSource> {
    return new Promise((resolve, reject) => {
      signal.throwIfAborted();
      const source = new EventSource(this.path);
      this.source = source;
      let opened = false;
      const abort = () => {
        // Native close aborts its fetch and disables automatic reconnection.
        source.close();
        if (this.source === source) this.source = undefined;
        reject(new DOMException('Stream opening cancelled', 'AbortError'));
      };
      signal.addEventListener('abort', abort, { once: true });
      source.onopen = () => {
        if (!this.owns(source)) return;
        opened = true;
        signal.removeEventListener('abort', abort);
        resolve(source);
      };
      source.onerror = () => {
        if (!this.owns(source)) return;
        source.close();
        this.source = undefined;
        signal.removeEventListener('abort', abort);
        if (opened) this.scheduleRetry();
        else reject(new Error('Stream opening failed'));
      };
      for (const eventName of this.handlers.eventNames) {
        source.addEventListener(eventName, event => {
          if (!this.owns(source)) return;
          this.notify(() => this.handlers.onEvent(eventName, (event as MessageEvent<string>).data));
        });
      }
    });
  }

  close() {
    this.closed = true;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.opening?.abort();
    this.source?.close();
    this.source = undefined;
  }

  /** Consumer exceptions retire ownership; they are never network retry signals. */
  private notify(callback: () => void): boolean {
    try {
      callback();
      return true;
    } catch (reason) {
      this.close();
      // Preserve the browser's error channel after transport cleanup.
      if (typeof reportError === 'function') reportError(reason);
      else
        queueMicrotask(() => {
          throw reason;
        });
      return false;
    }
  }

  private owns(candidate: EventSource) {
    return !this.closed && this.source === candidate;
  }

  private scheduleRetry() {
    if (this.closed || this.retryScheduled) return;
    this.retryScheduled = true;
    const delay = RETRY_DELAYS_MS[this.consecutiveFailures];
    if (delay === undefined) {
      this.notify(() => this.handlers.onUnavailable());
      return;
    }
    this.consecutiveFailures += 1;
    if (!this.notify(() => this.handlers.onRetrying()) || this.closed) return;
    void this.recoverAndReconnect(delay);
  }

  private async recoverAndReconnect(delay: number) {
    // Refresh at most once per continuous failure episode. Further retries
    // only back off until a native open event proves recovery.
    if (!this.refreshAttemptedInFailureEpisode) {
      this.refreshAttemptedInFailureEpisode = true;
      try {
        await refreshBrowserSession();
      } catch {
        // The bounded EventSource retry budget owns the unavailable outcome.
      }
    }
    if (!this.closed) this.retryTimer = setTimeout(() => this.open(), delay);
  }
}
