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
  let http: HttpTestingController;

  beforeEach(() => {
    configureHttpServiceTest();
    service = TestBed.inject(MonitorService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should query metric history with monitor id', () => {
    service.getMonitorMetricHistoryData(599733946907392, 'hdp-hadoop2:10003', 'flink', 'taskmanager', 'value', '6h', false).subscribe();

    const request = http.expectOne(req => req.url === '/monitor/hdp-hadoop2:10003/metric/flink.taskmanager.value');
    expect(request.request.params.get('monitorId')).toBe('599733946907392');
    expect(request.request.params.get('history')).toBe('6h');
    expect(request.request.params.get('interval')).toBe('false');
    request.flush({ code: 0 });
  });
});
