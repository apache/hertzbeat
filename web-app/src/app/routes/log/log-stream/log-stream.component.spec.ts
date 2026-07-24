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

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LogStreamComponent } from './log-stream.component';

describe('LogStreamComponent', () => {
  let component: LogStreamComponent;
  let fixture: ComponentFixture<LogStreamComponent>;
  let fetchSpy: jasmine.Spy<typeof window.fetch>;

  beforeEach(async () => {
    localStorage.setItem('Authorization', 'test-token');
    fetchSpy = spyOn(window, 'fetch').and.returnValue(new Promise<Response>(() => {}));

    await TestBed.configureTestingModule({
      imports: [LogStreamComponent]
    })
      .overrideComponent(LogStreamComponent, {
        set: { template: '' }
      })
      .compileComponents();

    fixture = TestBed.createComponent(LogStreamComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    localStorage.removeItem('Authorization');
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should authenticate the log stream request', () => {
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/logs/sse/subscribe',
      jasmine.objectContaining({
        method: 'GET',
        headers: jasmine.objectContaining({
          Accept: 'text/event-stream',
          Authorization: 'Bearer test-token'
        }),
        signal: jasmine.any(AbortSignal)
      })
    );
  });
});
