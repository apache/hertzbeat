/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { Injectable, NgZone } from '@angular/core';
import { Observable } from 'rxjs';

import { LocalStorageService } from './local-storage.service';

/**
 * Reads a server sent event stream with the bearer token attached.
 *
 * The browser's own `EventSource` cannot carry an `Authorization` header, which is why the
 * alert and manager streams used to be reachable without any credential at all. Reading the
 * stream through `fetch` instead lets the token travel with the request, so the endpoints can
 * be moved behind the same rbac rules as the rest of the api.
 *
 * The returned observable starts the request on subscribe and aborts it on unsubscribe.
 * Events are emitted outside the angular zone; a caller that touches component state should
 * re-enter the zone itself, as it would with any other stream.
 *
 * A dropped connection is re-established rather than surfaced as an error, because the
 * server closes an idle subscription on purpose once its emitter times out. `EventSource`
 * used to reconnect on its own, so reading through `fetch` has to carry that behaviour over
 * or a stream would simply stop delivering. Only a rejected credential ends the observable:
 * reconnecting cannot change that answer, and retrying would hammer the endpoint.
 */
@Injectable({ providedIn: 'root' })
export class AuthorizedSseService {
  /**
   * Delay before the first reconnect attempt; doubles on each consecutive failure.
   * An instance field rather than a constant so a test can drive the reconnect without
   * waiting a real second.
   */
  initialRetryDelayMillis = 1000;

  /** Ceiling for the doubling above, so a server that stays down is polled at a fixed rate. */
  maxRetryDelayMillis = 30000;

  constructor(private localStorageService: LocalStorageService, private ngZone: NgZone) {}

  /**
   * @param url stream endpoint, relative to the origin
   * @param eventName name of the sse event to emit; other events are ignored
   * @returns the `data` payload of every matching event, as raw text
   */
  stream(url: string, eventName: string): Observable<string> {
    return new Observable<string>(subscriber => {
      let controller: AbortController | undefined;
      let retryTimer: ReturnType<typeof setTimeout> | undefined;
      let retryDelay = this.initialRetryDelayMillis;
      let stopped = false;

      const scheduleReconnect = (): void => {
        if (stopped) {
          return;
        }
        const delay = retryDelay;
        retryDelay = Math.min(retryDelay * 2, this.maxRetryDelayMillis);
        retryTimer = setTimeout(connect, delay);
      };

      const connect = (): void => {
        if (stopped) {
          return;
        }
        const current = new AbortController();
        controller = current;
        // read the token on every attempt: it may have been refreshed since the last one
        const token = this.localStorageService.getAuthorizationToken();
        const headers: Record<string, string> = {
          Accept: 'text/event-stream',
          'Cache-Control': 'no-cache'
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        this.ngZone.runOutsideAngular(() => {
          fetch(url, { method: 'GET', headers, signal: current.signal })
            .then(async response => {
              if (response.status === 401 || response.status === 403) {
                stopped = true;
                subscriber.error(new Error(`SSE request to ${url} failed with status ${response.status}`));
                return;
              }
              if (!response.ok) {
                throw new Error(`SSE request to ${url} failed with status ${response.status}`);
              }
              const reader = response.body?.getReader();
              if (!reader) {
                throw new Error(`SSE response from ${url} has no readable body`);
              }
              // the stream is up, so a later drop starts its backoff from the bottom again
              retryDelay = this.initialRetryDelayMillis;

              const decoder = new TextDecoder();
              let buffer = '';
              while (!current.signal.aborted) {
                const { value, done } = await reader.read();
                if (done) {
                  // the server closed it, most likely an emitter timeout; reconnect below
                  return;
                }

                buffer += decoder.decode(value, { stream: true });
                const frames = buffer.split(/\r?\n\r?\n/);
                buffer = frames.pop() ?? '';

                for (const frame of frames) {
                  let frameEvent = '';
                  const dataLines: string[] = [];
                  for (const line of frame.split(/\r?\n/)) {
                    if (line.startsWith('event:')) {
                      frameEvent = line.substring(6).trim();
                    } else if (line.startsWith('data:')) {
                      dataLines.push(line.substring(5));
                    }
                  }
                  if (frameEvent !== eventName || dataLines.length === 0) {
                    continue;
                  }
                  subscriber.next(dataLines.join('\n'));
                }
              }
            })
            .then(() => {
              if (!stopped && !current.signal.aborted) {
                scheduleReconnect();
              }
            })
            .catch(error => {
              if (stopped || current.signal.aborted) {
                return;
              }
              console.error(`SSE connection to ${url} interrupted, reconnecting`, error);
              scheduleReconnect();
            });
        });
      };

      connect();

      return () => {
        stopped = true;
        if (retryTimer) {
          clearTimeout(retryTimer);
        }
        controller?.abort();
      };
    });
  }
}
