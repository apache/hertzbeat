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

import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';

import { LogService } from './log.service';

describe('LogService', () => {
  it('uses the canonical observability log contract', () => {
    const http = jasmine.createSpyObj<HttpClient>('HttpClient', ['get', 'delete']);
    http.get.and.returnValue(of({ code: 0, data: {} }));
    http.delete.and.returnValue(of({ code: 0, data: '' }));
    const service = new LogService(http);

    service.list({}).subscribe();
    expect(http.get.calls.mostRecent().args[0]).toBe('/observability/logs');

    service.overviewStats({}).subscribe();
    expect(http.get.calls.mostRecent().args[0]).toBe('/observability/logs/overview');

    service.trendStats({}).subscribe();
    expect(http.get.calls.mostRecent().args[0]).toBe('/observability/logs/trend');

    service.batchDelete([1]).subscribe();
    expect(http.delete.calls.mostRecent().args[0]).toBe('/observability/logs');
  });
});
