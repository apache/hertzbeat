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

import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, NgZone } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';

import { AuthService } from './auth.service';
import { LocalStorageService } from './local-storage.service';

type RefreshOutcome = 'refreshed' | 'refused' | 'unavailable';

/** What a stream does about an attempt the server rejected. */
type StreamRecovery = 'reconnect' | 'retry-later' | 'end';

/**
 * Spaces out the reconnect attempts of one stream, doubling the wait after each attempt that
 * did not get the stream running and starting over once one did.
 */
class ReconnectBackoff {
  private timer?: ReturnType<typeof setTimeout>;

  private delayMillis: number;

  constructor(private initialMillis: number, private maxMillis: number) {
    this.delayMillis = initialMillis;
  }

  schedule(attempt: () => void): void {
    const wait = this.delayMillis;
    this.delayMillis = Math.min(this.delayMillis * 2, this.maxMillis);
    this.timer = setTimeout(attempt, wait);
  }

  /** Called once a connection is up, so the next drop is retried without any accumulated wait. */
  reset(): void {
    this.delayMillis = this.initialMillis;
  }

  cancel(): void {
    if (this.timer) {
      clearTimeout(this.timer);
    }
  }
}

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
 * or a stream would simply stop delivering.
 *
 * An expired token is refreshed and the connection retried, because a subscription outlives
 * its credential: the access token is good for an hour while the server closes a subscription
 * every half hour, so a reconnect eventually lands on an expired token. This request does not
 * go through `HttpClient`, so the interceptor that refreshes on 401 never sees it and the
 * refresh has to happen here. Only a credential that is still refused after a refresh ends the
 * observable: reconnecting cannot change that answer, and retrying would hammer the endpoint.
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

  /**
   * The refresh in flight, shared by every stream this service runs. Two streams are open at
   * once and their tokens expire together. Sharing avoids duplicate requests and prevents
   * two successful responses from racing to replace the stored token pair.
   */
  private refreshInFlight?: Promise<RefreshOutcome>;

  constructor(private localStorageService: LocalStorageService, private authService: AuthService, private ngZone: NgZone) {}

  /**
   * @param url stream endpoint, relative to the origin
   * @param eventName name of the sse event to emit; other events are ignored
   * @returns the `data` payload of every matching event, as raw text
   */
  stream(url: string, eventName: string): Observable<string> {
    return new Observable<string>(subscriber => {
      let controller: AbortController | undefined;
      let stopped = false;
      // one refresh per rejection, so a server that refuses the fresh token too ends the
      // stream instead of looping between refreshing and being refused
      let refreshed = false;
      const backoff = new ReconnectBackoff(this.initialRetryDelayMillis, this.maxRetryDelayMillis);

      const scheduleReconnect = (): void => {
        if (stopped) {
          return;
        }
        backoff.schedule(connect);
      };

      const connect = (): void => {
        if (stopped) {
          return;
        }
        const current = new AbortController();
        controller = current;

        this.ngZone.runOutsideAngular(() => {
          fetch(url, { method: 'GET', headers: this.authorizedHeaders(), signal: current.signal })
            .then(async response => {
              // A response from the stream endpoint proves that the preceding refresh was
              // accepted. Even an unrelated server error must allow a later 401 to refresh
              // again instead of permanently ending this stream.
              if (response.status !== 401) {
                refreshed = false;
              }
              if (response.status === 401 || response.status === 403) {
                const recovery = await this.recoverFromRejection(response.status, refreshed);
                // abort first, so what happens next is the only thing that happens: the
                // handler that follows this one schedules its own reconnect unless the
                // attempt was aborted
                current.abort();
                if (recovery === 'reconnect') {
                  refreshed = true;
                  connect();
                } else if (recovery === 'retry-later') {
                  scheduleReconnect();
                } else {
                  stopped = true;
                  subscriber.error(new Error(`SSE request to ${url} failed with status ${response.status}`));
                }
                return;
              }
              const reader = this.readerOf(response, url);
              // the stream is up, so a later drop starts its backoff from the bottom again,
              // and the token it is holding may be refreshed again when it in turn expires
              backoff.reset();
              refreshed = false;

              await this.pumpEvents(reader, current.signal, eventName, data => subscriber.next(data));
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
        backoff.cancel();
        controller?.abort();
      };
    });
  }

  /**
   * @returns The headers every attempt carries, with the stored token attached when there is
   *          one; it is read per attempt because it may have been refreshed since the last
   */
  private authorizedHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'text/event-stream',
      'Cache-Control': 'no-cache'
    };
    const token = this.localStorageService.getAuthorizationToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  /**
   * Decides what a rejected attempt means for the stream.
   *
   * @param status the status the stream endpoint answered with, either 401 or 403
   * @param alreadyRefreshed whether this stream has refreshed its token since it last had a
   *        working connection; a second rejection in a row cannot be fixed by refreshing again
   * @returns `reconnect` to retry at once with the fresh token, `retry-later` to back off and
   *          try again, `end` when the answer is settled and reconnecting cannot change it
   */
  private async recoverFromRejection(status: number, alreadyRefreshed: boolean): Promise<StreamRecovery> {
    // a refused role is not an expired token, so there is nothing to refresh
    if (status !== 401 || alreadyRefreshed) {
      return 'end';
    }
    const outcome = await this.refreshAuthToken();
    if (outcome === 'refreshed') {
      return 'reconnect';
    }
    return outcome === 'unavailable' ? 'retry-later' : 'end';
  }

  /**
   * @returns The reader over the response body
   * @throws Error When the response cannot be read as a stream, which the caller turns into a
   *         reconnect the same way it treats a connection that dropped
   */
  private readerOf(response: Response, url: string): ReadableStreamDefaultReader<Uint8Array> {
    if (!response.ok) {
      throw new Error(`SSE request to ${url} failed with status ${response.status}`);
    }
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error(`SSE response from ${url} has no readable body`);
    }
    return reader;
  }

  /**
   * Reads the response until the server closes it or the caller aborts, handing every
   * matching event to `emit`.
   *
   * <p>An event can be split across chunks, so what a read returns is appended to a buffer
   * and only whole frames are taken off it.
   */
  private async pumpEvents(
    reader: ReadableStreamDefaultReader<Uint8Array>,
    signal: AbortSignal,
    eventName: string,
    emit: (data: string) => void
  ): Promise<void> {
    const decoder = new TextDecoder();
    let buffer = '';
    while (!signal.aborted) {
      const { value, done } = await reader.read();
      if (done) {
        // the server closed it, most likely an emitter timeout; the caller reconnects
        return;
      }

      buffer += decoder.decode(value, { stream: true });
      const frames = buffer.split(/\r?\n\r?\n/);
      buffer = frames.pop() ?? '';

      for (const frame of frames) {
        const payload = this.payloadOf(frame, eventName);
        if (payload !== undefined) {
          emit(payload);
        }
      }
    }
  }

  /**
   * @returns The `data` of the frame when it carries the event this stream subscribes to, and
   *          `undefined` for every other frame
   */
  private payloadOf(frame: string, eventName: string): string | undefined {
    let frameEvent = '';
    const dataLines: string[] = [];
    for (const line of frame.split(/\r?\n/)) {
      if (line.startsWith('event:')) {
        frameEvent = line.substring(6).trim();
      } else if (line.startsWith('data:')) {
        dataLines.push(line.substring(5));
      }
    }
    return frameEvent === eventName && dataLines.length > 0 ? dataLines.join('\n') : undefined;
  }

  /**
   * Exchanges the refresh token for a new pair and stores it.
   *
   * @returns whether the token was refreshed, explicitly refused, or temporarily unavailable
   */
  private refreshAuthToken(): Promise<RefreshOutcome> {
    if (!this.refreshInFlight) {
      this.refreshInFlight = this.requestFreshToken().finally(() => (this.refreshInFlight = undefined));
    }
    return this.refreshInFlight;
  }

  private async requestFreshToken(): Promise<RefreshOutcome> {
    const refreshToken = this.localStorageService.getRefreshToken();
    if (!refreshToken) {
      return 'refused';
    }
    try {
      const message = await firstValueFrom(this.authService.refreshToken(refreshToken, true));
      if (message.code !== 0 || !message.data?.token) {
        console.warn('SSE token refresh was refused', message.msg);
        return 'refused';
      }
      // The request may finish after logout, or after another refresh/login replaced the
      // session. Never let that stale response restore or overwrite credentials. If another
      // session is already present, its access token is the one the reconnect should use.
      if (this.localStorageService.getRefreshToken() !== refreshToken) {
        return this.localStorageService.getAuthorizationToken() === null ? 'refused' : 'refreshed';
      }
      this.localStorageService.storageAuthorizationToken(message.data.token);
      if (message.data.refreshToken) {
        this.localStorageService.storageRefreshToken(message.data.refreshToken);
      }
      return 'refreshed';
    } catch (error) {
      if (error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403)) {
        console.warn('SSE token refresh was refused', error.status);
        return 'refused';
      }
      console.warn('SSE token refresh is temporarily unavailable', error);
      return 'unavailable';
    }
  }
}
