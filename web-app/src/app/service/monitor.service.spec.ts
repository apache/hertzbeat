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

import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { configureHttpServiceTest } from '@testing';

import { SILENT_HTTP_ERROR } from '../core/interceptor/http-context';
import { MonitorService } from './monitor.service';

describe('MonitorService', () => {
  let service: MonitorService;
  let http: HttpTestingController;

  beforeEach(() => {
    configureHttpServiceTest();
    service = TestBed.inject(MonitorService);
    http = TestBed.inject(HttpTestingController);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  afterEach(() => http.verify());

  for (const all of [false, true]) {
    it(`preserves HTTP permission errors for ${all ? 'all' : 'selected'} exports`, () => {
      const request = all ? service.exportAllMonitors('JSON') : service.exportMonitors(new Set([1]), 'JSON');
      let status = 0;
      request.subscribe({ next: () => fail('a denied export must not yield a file'), error: error => (status = error.status) });
      const pending = http.expectOne(req => req.url === (all ? '/monitors/export/all' : '/monitors/export'));
      expect(pending.request.method).toBe('GET');
      expect(pending.request.context.get(SILENT_HTTP_ERROR)).toBeTrue();
      expect(pending.request.responseType).toBe('blob');
      expect(pending.request.params.get('type')).toBe('JSON');
      if (!all) {
        expect(pending.request.params.get('ids')).toBe('1');
      }
      pending.flush(new Blob(), { status: 403, statusText: 'Forbidden' });
      expect(status).toBe(403);
    });
  }
});
