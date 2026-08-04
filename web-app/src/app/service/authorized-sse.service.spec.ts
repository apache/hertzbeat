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

import { TestBed } from '@angular/core/testing';

import { AuthorizedSseService } from './authorized-sse.service';
import { LocalStorageService } from './local-storage.service';

describe('AuthorizedSseService', () => {
  let service: AuthorizedSseService;
  let localStorageService: jasmine.SpyObj<LocalStorageService>;

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

  beforeEach(() => {
    localStorageService = jasmine.createSpyObj('LocalStorageService', ['getAuthorizationToken']);
    TestBed.configureTestingModule({
      providers: [{ provide: LocalStorageService, useValue: localStorageService }]
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
    respondWith([], false, 403);
    service.initialRetryDelayMillis = 0;

    service.stream('/api/alert/sse/subscribe', 'ALERT_EVENT').subscribe({
      error: () => {
        setTimeout(() => {
          expect((window.fetch as jasmine.Spy).calls.count()).toBe(1);
          done();
        }, 20);
      }
    });
  });
});
