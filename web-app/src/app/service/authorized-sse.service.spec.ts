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
import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';

import { AuthService } from './auth.service';
import { AuthorizedSseService } from './authorized-sse.service';
import { LocalStorageService } from './local-storage.service';

describe('AuthorizedSseService', () => {
  let service: AuthorizedSseService;
  let localStorageService: jasmine.SpyObj<LocalStorageService>;
  let authService: jasmine.SpyObj<AuthService>;

  /** Serves the given chunks as a readable body, the way a live sse response arrives. */
  function respondWith(chunks: string[], ok = true, status = 200): void {
    const encoder = new TextEncoder();
    let index = 0;
    const reader = {
      read: () => (index < chunks.length ? Promise.resolve({ value: encoder.encode(chunks[index++]), done: false }) : new Promise(() => {})) // an open stream never completes on its own
    };
    spyOn(window, 'fetch').and.returnValue(Promise.resolve({ ok, status, body: { getReader: () => reader } } as any));
  }

  /**
   * Serves one response per connection attempt, so a test can let the first one end and
   * assert on what the service does next. A `null` entry stands for a request that fails
   * outright rather than returning a response.
   */
  function respondPerAttempt(attempts: Array<string[] | null>): void {
    const encoder = new TextEncoder();
    let attempt = 0;
    spyOn(window, 'fetch').and.callFake(() => {
      const chunks = attempts[Math.min(attempt++, attempts.length - 1)];
      if (chunks === null) {
        return Promise.reject(new Error('network down'));
      }
      let index = 0;
      const reader = {
        // once the chunks run out the server closes the stream, as an emitter timeout does
        read: () =>
          index < chunks.length
            ? Promise.resolve({ value: encoder.encode(chunks[index++]), done: false })
            : Promise.resolve({ value: undefined, done: true })
      };
      return Promise.resolve({ ok: true, status: 200, body: { getReader: () => reader } } as any);
    });
  }

  /**
   * Serves one outcome per connection attempt: a status code for a response the server
   * refuses, or a list of chunks for a stream that stays open.
   */
  function respondPerOutcome(outcomes: Array<number | string[]>): void {
    const encoder = new TextEncoder();
    let attempt = 0;
    spyOn(window, 'fetch').and.callFake(() => {
      const outcome = outcomes[Math.min(attempt++, outcomes.length - 1)];
      if (typeof outcome === 'number') {
        return Promise.resolve({ ok: false, status: outcome, body: null } as any);
      }
      let index = 0;
      const reader = {
        read: () =>
          index < outcome.length ? Promise.resolve({ value: encoder.encode(outcome[index++]), done: false }) : new Promise(() => {})
      };
      return Promise.resolve({ ok: true, status: 200, body: { getReader: () => reader } } as any);
    });
  }

  beforeEach(() => {
    localStorageService = jasmine.createSpyObj('LocalStorageService', [
      'getAuthorizationToken',
      'getRefreshToken',
      'storageAuthorizationToken',
      'storageRefreshToken'
    ]);
    authService = jasmine.createSpyObj('AuthService', ['refreshToken']);
    TestBed.configureTestingModule({
      providers: [
        { provide: LocalStorageService, useValue: localStorageService },
        { provide: AuthService, useValue: authService }
      ]
    });
    service = TestBed.inject(AuthorizedSseService);
  });

  it('sends the stored token so the stream can require a credential', done => {
    localStorageService.getAuthorizationToken.and.returnValue('a-token');
    respondWith(['event:ALERT_EVENT\ndata:{"id":1}\n\n']);

    const subscription = service.stream('/api/alert/sse/subscribe', 'ALERT_EVENT').subscribe(() => {
      const [, init] = (window.fetch as jasmine.Spy).calls.mostRecent().args;
      expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer a-token');
      subscription.unsubscribe();
      done();
    });
  });

  it('emits the data payload of a matching event', done => {
    localStorageService.getAuthorizationToken.and.returnValue('a-token');
    respondWith(['event:ALERT_EVENT\ndata:{"id":1}\n\n']);

    const subscription = service.stream('/api/alert/sse/subscribe', 'ALERT_EVENT').subscribe(data => {
      expect(data).toBe('{"id":1}');
      subscription.unsubscribe();
      done();
    });
  });

  it('ignores events of another name on the same stream', done => {
    localStorageService.getAuthorizationToken.and.returnValue('a-token');
    respondWith(['event:OTHER_EVENT\ndata:{"id":1}\n\n', 'event:ALERT_EVENT\ndata:{"id":2}\n\n']);

    const subscription = service.stream('/api/alert/sse/subscribe', 'ALERT_EVENT').subscribe(data => {
      expect(data).toBe('{"id":2}');
      subscription.unsubscribe();
      done();
    });
  });

  it('reassembles an event split across chunks', done => {
    localStorageService.getAuthorizationToken.and.returnValue('a-token');
    respondWith(['event:ALERT_EVENT\ndata:{"id"', ':3}\n\n']);

    const subscription = service.stream('/api/alert/sse/subscribe', 'ALERT_EVENT').subscribe(data => {
      expect(data).toBe('{"id":3}');
      subscription.unsubscribe();
      done();
    });
  });

  it('surfaces a rejected subscription as an error', done => {
    localStorageService.getAuthorizationToken.and.returnValue(null as any);
    localStorageService.getRefreshToken.and.returnValue(null);
    respondWith([], false, 401);

    service.stream('/api/alert/sse/subscribe', 'ALERT_EVENT').subscribe({
      error: error => {
        expect(String(error)).toContain('401');
        done();
      }
    });
  });

  /**
   * The server closes a subscription once its emitter times out, so a stream that gave up
   * at the first close would stop delivering alerts half an hour in. `EventSource` used to
   * reconnect on its own; reading through `fetch` has to do it here instead.
   */
  it('reconnects after the server closes the stream', done => {
    localStorageService.getAuthorizationToken.and.returnValue('a-token');
    respondPerAttempt([['event:ALERT_EVENT\ndata:{"id":1}\n\n'], ['event:ALERT_EVENT\ndata:{"id":2}\n\n']]);
    service.initialRetryDelayMillis = 0;

    const received: string[] = [];
    const subscription = service.stream('/api/alert/sse/subscribe', 'ALERT_EVENT').subscribe(data => {
      received.push(data);
      if (received.length === 2) {
        expect(received).toEqual(['{"id":1}', '{"id":2}']);
        expect((window.fetch as jasmine.Spy).calls.count()).toBe(2);
        subscription.unsubscribe();
        done();
      }
    });
  });

  it('reconnects after a failed connection attempt', done => {
    localStorageService.getAuthorizationToken.and.returnValue('a-token');
    respondPerAttempt([null, ['event:ALERT_EVENT\ndata:{"id":9}\n\n']]);
    service.initialRetryDelayMillis = 0;

    const subscription = service.stream('/api/alert/sse/subscribe', 'ALERT_EVENT').subscribe(data => {
      expect(data).toBe('{"id":9}');
      expect((window.fetch as jasmine.Spy).calls.count()).toBe(2);
      subscription.unsubscribe();
      done();
    });
  });

  it('re-reads the token on every attempt so a refreshed one is used', done => {
    localStorageService.getAuthorizationToken.and.returnValues('stale-token', 'fresh-token');
    respondPerAttempt([['event:ALERT_EVENT\ndata:{"id":1}\n\n'], ['event:ALERT_EVENT\ndata:{"id":2}\n\n']]);
    service.initialRetryDelayMillis = 0;

    let count = 0;
    const subscription = service.stream('/api/alert/sse/subscribe', 'ALERT_EVENT').subscribe(() => {
      if (++count === 2) {
        const [, init] = (window.fetch as jasmine.Spy).calls.mostRecent().args;
        expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer fresh-token');
        subscription.unsubscribe();
        done();
      }
    });
  });

  it('stops reconnecting once the subscription is closed', done => {
    localStorageService.getAuthorizationToken.and.returnValue('a-token');
    respondPerAttempt([['event:ALERT_EVENT\ndata:{"id":1}\n\n']]);
    service.initialRetryDelayMillis = 0;

    const subscription = service.stream('/api/alert/sse/subscribe', 'ALERT_EVENT').subscribe(() => {
      subscription.unsubscribe();
      const attemptsAtUnsubscribe = (window.fetch as jasmine.Spy).calls.count();
      setTimeout(() => {
        expect((window.fetch as jasmine.Spy).calls.count()).toBe(attemptsAtUnsubscribe);
        done();
      }, 20);
    });
  });

  /**
   * A credential the server refuses is the one failure reconnecting cannot fix, so it has to
   * end the observable instead of turning into a retry loop against the endpoint.
   */
  it('does not retry a rejected credential', done => {
    localStorageService.getAuthorizationToken.and.returnValue('a-token');
    localStorageService.getRefreshToken.and.returnValue('a-refresh-token');
    respondWith([], false, 403);
    service.initialRetryDelayMillis = 0;

    service.stream('/api/alert/sse/subscribe', 'ALERT_EVENT').subscribe({
      error: () => {
        setTimeout(() => {
          expect((window.fetch as jasmine.Spy).calls.count()).toBe(1);
          // a refused role is not an expired token, so there is nothing to refresh
          expect(authService.refreshToken).not.toHaveBeenCalled();
          done();
        }, 20);
      }
    });
  });

  /**
   * A subscription outlives its credential: the access token is good for an hour while the
   * server closes a subscription every half hour, so a reconnect eventually carries an
   * expired token. This request never reaches the interceptor that refreshes on 401, so
   * without refreshing here the stream would stop delivering for the rest of the session.
   */
  it('refreshes an expired token and reconnects', done => {
    localStorageService.getAuthorizationToken.and.returnValues('expired-token', 'fresh-token');
    localStorageService.getRefreshToken.and.returnValue('a-refresh-token');
    authService.refreshToken.and.returnValue(
      of({ code: 0, msg: '', data: { token: 'fresh-token', refreshToken: 'next-refresh-token' } } as any)
    );
    respondPerOutcome([401, ['event:ALERT_EVENT\ndata:{"id":7}\n\n']]);
    service.initialRetryDelayMillis = 0;

    const subscription = service.stream('/api/alert/sse/subscribe', 'ALERT_EVENT').subscribe({
      next: data => {
        expect(data).toBe('{"id":7}');
        expect(authService.refreshToken).toHaveBeenCalledWith('a-refresh-token', true);
        expect(localStorageService.storageAuthorizationToken).toHaveBeenCalledWith('fresh-token');
        expect(localStorageService.storageRefreshToken).toHaveBeenCalledWith('next-refresh-token');
        const [, init] = (window.fetch as jasmine.Spy).calls.mostRecent().args;
        expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer fresh-token');
        subscription.unsubscribe();
        done();
      },
      error: error => done.fail(`stream ended instead of reconnecting: ${error}`)
    });
  });

  /**
   * Logging out invalidates the session even when a refresh request is already in flight.
   * A late response must not put credentials back after logout cleared local storage.
   */
  it('does not restore credentials after logout during a refresh', done => {
    const refreshResponse = new Subject<any>();
    let storedAccessToken: string | null = 'expired-token';
    let storedRefreshToken: string | null = 'a-refresh-token';
    localStorageService.getAuthorizationToken.and.callFake(() => storedAccessToken as any);
    localStorageService.getRefreshToken.and.callFake(() => storedRefreshToken);
    authService.refreshToken.and.returnValue(refreshResponse);
    respondPerOutcome([401]);

    const subscription = service.stream('/api/alert/sse/subscribe', 'ALERT_EVENT').subscribe();
    setTimeout(() => {
      expect(authService.refreshToken).toHaveBeenCalledWith('a-refresh-token', true);
      storedAccessToken = null;
      storedRefreshToken = null;
      subscription.unsubscribe();
      refreshResponse.next({ code: 0, msg: '', data: { token: 'late-token', refreshToken: 'late-refresh-token' } });
      refreshResponse.complete();

      setTimeout(() => {
        expect(localStorageService.storageAuthorizationToken).not.toHaveBeenCalled();
        expect(localStorageService.storageRefreshToken).not.toHaveBeenCalled();
        done();
      });
    });
  });

  /**
   * A session that is genuinely over has to end the observable rather than turn into a loop
   * of refresh attempts against an endpoint that keeps refusing.
   */
  it('ends the stream when the refresh is refused', done => {
    localStorageService.getAuthorizationToken.and.returnValue('expired-token');
    localStorageService.getRefreshToken.and.returnValue('a-refresh-token');
    authService.refreshToken.and.returnValue(throwError(() => new HttpErrorResponse({ status: 401 })));
    respondPerOutcome([401]);
    service.initialRetryDelayMillis = 0;

    service.stream('/api/alert/sse/subscribe', 'ALERT_EVENT').subscribe({
      error: error => {
        expect(String(error)).toContain('401');
        setTimeout(() => {
          expect((window.fetch as jasmine.Spy).calls.count()).toBe(1);
          expect(authService.refreshToken).toHaveBeenCalledTimes(1);
          done();
        }, 20);
      }
    });
  });

  it('retries when the refresh endpoint is temporarily unavailable', done => {
    localStorageService.getAuthorizationToken.and.returnValues('expired-token', 'expired-token', 'fresh-token');
    localStorageService.getRefreshToken.and.returnValue('a-refresh-token');
    authService.refreshToken.and.returnValues(
      throwError(() => new HttpErrorResponse({ status: 502 })),
      of({ code: 0, msg: '', data: { token: 'fresh-token', refreshToken: 'next-refresh-token' } } as any)
    );
    respondPerOutcome([401, 401, ['event:ALERT_EVENT\ndata:{"id":8}\n\n']]);
    service.initialRetryDelayMillis = 0;

    const subscription = service.stream('/api/alert/sse/subscribe', 'ALERT_EVENT').subscribe({
      next: data => {
        expect(data).toBe('{"id":8}');
        expect(authService.refreshToken).toHaveBeenCalledTimes(2);
        expect((window.fetch as jasmine.Spy).calls.count()).toBe(3);
        subscription.unsubscribe();
        done();
      },
      error: error => done.fail(`temporary refresh failure ended the stream: ${error}`)
    });
  });

  it('allows another refresh after a non-401 reconnect response', done => {
    localStorageService.getAuthorizationToken.and.returnValues('expired-token', 'fresh-token', 'fresh-token', 'newer-token');
    localStorageService.getRefreshToken.and.returnValue('a-refresh-token');
    authService.refreshToken.and.returnValues(
      of({ code: 0, msg: '', data: { token: 'fresh-token' } } as any),
      of({ code: 0, msg: '', data: { token: 'newer-token' } } as any)
    );
    respondPerOutcome([401, 503, 401, ['event:ALERT_EVENT\ndata:{"id":10}\n\n']]);
    service.initialRetryDelayMillis = 0;

    const subscription = service.stream('/api/alert/sse/subscribe', 'ALERT_EVENT').subscribe({
      next: data => {
        expect(data).toBe('{"id":10}');
        expect(authService.refreshToken).toHaveBeenCalledTimes(2);
        expect((window.fetch as jasmine.Spy).calls.count()).toBe(4);
        subscription.unsubscribe();
        done();
      },
      error: error => done.fail(`a non-401 response prevented a later refresh: ${error}`)
    });
  });

  /**
   * A token that the server still refuses after a refresh is the end of the session: retrying
   * the refresh on every attempt would loop indefinitely.
   */
  it('refreshes only once for a credential that stays refused', done => {
    localStorageService.getAuthorizationToken.and.returnValue('expired-token');
    localStorageService.getRefreshToken.and.returnValue('a-refresh-token');
    authService.refreshToken.and.returnValue(of({ code: 0, msg: '', data: { token: 'fresh-token' } } as any));
    respondPerOutcome([401]);
    service.initialRetryDelayMillis = 0;

    service.stream('/api/alert/sse/subscribe', 'ALERT_EVENT').subscribe({
      error: () => {
        setTimeout(() => {
          expect(authService.refreshToken).toHaveBeenCalledTimes(1);
          expect((window.fetch as jasmine.Spy).calls.count()).toBe(2);
          done();
        }, 20);
      }
    });
  });
});
