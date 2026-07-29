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
});
