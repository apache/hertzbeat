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

import { ActivatedRoute, Router } from '@angular/router';

import { LogService } from '../../../service/log.service';
import { MemoryStorageService } from '../../../service/memory-storage.service';
import { LogManageComponent } from './log-manage.component';

describe('LogManageComponent', () => {
  it('switches query and live modes on the canonical log route', () => {
    const logs = jasmine.createSpyObj<LogService>('LogService', ['list', 'overviewStats', 'trendStats']);
    const route = { snapshot: { queryParamMap: { get: () => null }, data: {} } } as unknown as ActivatedRoute;
    const router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    const component = new LogManageComponent(logs, route, router, new MemoryStorageService());
    component.timeRange = [new Date(1_000), new Date(2_000)];

    component.setMode('stream');

    expect(component.mode).toBe('stream');
    expect(router.navigate).toHaveBeenCalledWith(['/log/manage'], {
      queryParams: jasmine.objectContaining({ start: 1_000, end: 2_000, view: 'stream' })
    });
  });
});
