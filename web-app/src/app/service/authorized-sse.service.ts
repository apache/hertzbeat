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
 */
@Injectable({ providedIn: 'root' })
export class AuthorizedSseService {
  constructor(private localStorageService: LocalStorageService, private ngZone: NgZone) {}

  /**
   * @param url stream endpoint, relative to the origin
   * @param eventName name of the sse event to emit; other events are ignored
   * @returns the `data` payload of every matching event, as raw text
   */
  stream(url: string, eventName: string): Observable<string> {
    return new Observable<string>(subscriber => {
      const abortController = new AbortController();
      const token = this.localStorageService.getAuthorizationToken();
      const headers: Record<string, string> = {
        Accept: 'text/event-stream',
        'Cache-Control': 'no-cache'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      this.ngZone.runOutsideAngular(() => {
        fetch(url, { method: 'GET', headers, signal: abortController.signal })
          .then(async response => {
            if (!response.ok) {
              throw new Error(`SSE request to ${url} failed with status ${response.status}`);
            }
            const reader = response.body?.getReader();
            if (!reader) {
              throw new Error(`SSE response from ${url} has no readable body`);
            }

            const decoder = new TextDecoder();
            let buffer = '';
            while (!abortController.signal.aborted) {
              const { value, done } = await reader.read();
              if (done) {
                throw new Error(`SSE connection to ${url} closed`);
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
          .catch(error => {
            if (abortController.signal.aborted) {
              return;
            }
            subscriber.error(error);
          });
      });

      return () => abortController.abort();
    });
  }
}
