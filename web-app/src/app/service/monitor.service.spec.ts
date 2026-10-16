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

import { MonitorService } from './monitor.service';

describe('MonitorService', () => {
  let service: MonitorService;

  beforeEach(() => {
    configureHttpServiceTest();
    service = TestBed.inject(MonitorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('sends the monitor ids to pause in the request body instead of the url', () => {
    const http = TestBed.inject(HttpTestingController);
    const monitorIds = new Set(Array.from({ length: 1000 }, (_, i) => 486837261783808 + i));

    service.cancelManageMonitors(monitorIds).subscribe();

    const request = http.expectOne({ method: 'DELETE', url: '/monitors/manage' });
    expect(request.request.body).toEqual(Array.from(monitorIds));
    request.flush({ code: 0, msg: '', data: null });
    http.verify();
  });
});
