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

import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';

import { LogService } from '../service/log.service';
import { MemoryStorageService } from '../service/memory-storage.service';
import { ObservabilityService } from '../service/observability.service';
import { LogManageComponent } from './log/log-manage/log-manage.component';
import { routes } from './routes-routing.module';
import { TraceManageComponent } from './trace/trace-manage.component';

describe('Observability transition navigation', () => {
  it('exposes integration, metrics, logs, and traces while keeping the legacy log route', () => {
    const children = routes[0].children || [];
    expect(children.map(route => route.path)).toContain('observability/integration');
    expect(children.map(route => route.path)).toContain('metrics/manage');
    expect(children.map(route => route.path)).toContain('trace/manage');
    expect(children.map(route => route.path)).toContain('log');
  });

  it('keeps time and OTLP resource context when moving from a trace to logs and metrics', () => {
    const observability = jasmine.createSpyObj<ObservabilityService>('ObservabilityService', [
      'queryTraces',
      'traceOverview',
      'traceDetail'
    ]);
    const route = { snapshot: { queryParamMap: convertToParamMap({}) } } as unknown as ActivatedRoute;
    const router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    const component = new TraceManageComponent(observability, route, router, new MemoryStorageService());
    component.selected = {
      summary: {
        traceId: 'trace-1',
        rootSpanId: 'span-1',
        serviceName: 'checkout',
        serviceNamespace: 'payments',
        rootSpanName: 'POST /checkout',
        durationNanos: 2_000_000,
        status: 'OK',
        startTime: 10_000,
        errorSpanCount: 0,
        resourceAttributes: { 'deployment.environment.name': 'prod' }
      },
      spans: []
    };

    component.viewLogs();
    component.viewMetrics();

    expect(router.navigate.calls.argsFor(0)[0]).toEqual(['/log/manage']);
    expect(router.navigate.calls.argsFor(0)[1]?.queryParams?.['traceId']).toBe('trace-1');
    expect(router.navigate.calls.argsFor(1)[0]).toEqual(['/metrics/manage']);
    expect(router.navigate.calls.argsFor(1)[1]?.queryParams?.['operationName']).toBe('POST /checkout');
  });

  it('opens the matching trace from a log without an entity route', () => {
    const logs = jasmine.createSpyObj<LogService>('LogService', ['list', 'overviewStats', 'trendStats']);
    const route = { snapshot: { queryParamMap: convertToParamMap({}) } } as unknown as ActivatedRoute;
    const router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    const component = new LogManageComponent(logs, route, router, new MemoryStorageService());
    component.timeRange = [new Date(1_000), new Date(2_000)];

    component.openTrace({ traceId: 'trace-2', resource: { 'service.name': 'catalog' } });

    expect(router.navigate).toHaveBeenCalledWith(['/trace/manage'], {
      queryParams: jasmine.objectContaining({ traceId: 'trace-2', serviceName: 'catalog', start: 1_000, end: 2_000 })
    });
  });
});
