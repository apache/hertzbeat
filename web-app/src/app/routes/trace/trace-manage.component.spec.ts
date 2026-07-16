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

import { fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';

import { ObservabilityService, TraceListItem, TraceSpanNode } from '../../service/observability.service';
import { TraceManageComponent } from './trace-manage.component';

describe('TraceManageComponent', () => {
  function span(spanId: string, parentSpanId: string, status: string): TraceSpanNode {
    return {
      traceId: 'trace',
      spanId,
      parentSpanId,
      spanName: spanId,
      serviceName: 'service',
      status,
      spanKind: 'SPAN_KIND_INTERNAL',
      statusMessage: '',
      durationNanos: 1_000_000,
      startTime: 1,
      resourceAttributes: {},
      spanAttributes: {},
      spanEvents: []
    };
  }

  function summary(): TraceListItem {
    return {
      traceId: 'trace',
      rootSpanId: 'root',
      serviceName: 'service',
      serviceNamespace: '',
      rootSpanName: 'operation',
      durationNanos: 1_000_000,
      status: 'STATUS_CODE_OK',
      startTime: 1,
      errorSpanCount: 0,
      resourceAttributes: {}
    };
  }

  it('recognizes Greptime status codes and calculates hierarchy depth', () => {
    const component = new TraceManageComponent(
      jasmine.createSpyObj<ObservabilityService>('ObservabilityService', ['queryTraces', 'traceOverview', 'traceDetail']),
      { snapshot: { queryParamMap: convertToParamMap({}) } } as unknown as ActivatedRoute,
      jasmine.createSpyObj<Router>('Router', ['navigate'])
    );
    const root = span('root', '', 'STATUS_CODE_OK');
    const child = span('child', 'root', 'STATUS_CODE_ERROR');
    const leaf = span('leaf', 'child', 'STATUS_CODE_OK');
    component.selected = { summary: summary(), spans: [root, child, leaf] };

    expect(component.isErrorSpan(child)).toBeTrue();
    expect(component.spanStatus(child)).toBe('ERROR');
    expect(component.spanDepth(leaf)).toBe(2);
    expect(component.waterfallDurationMs()).toBe(1);
  });

  it('restores bounded duration and status filters and persists them after querying', fakeAsync(() => {
    const observability = jasmine.createSpyObj<ObservabilityService>('ObservabilityService', [
      'queryTraces',
      'traceOverview',
      'traceDetail'
    ]);
    observability.queryTraces.and.returnValue(
      of({ code: 0, data: { content: [], pageIndex: 0, pageSize: 20, totalElements: 0 }, msg: '' })
    );
    observability.traceOverview.and.returnValue(
      of({ code: 0, data: { totalCount: 0, errorCount: 0, errorRate: 0, averageDurationMillis: 0, p95DurationMillis: 0 }, msg: '' })
    );
    const route = {
      snapshot: {
        queryParamMap: convertToParamMap({
          start: 1_000,
          end: 2_000,
          environment: 'staging',
          errorOnly: 'true',
          minDurationMs: '1',
          maxDurationMs: '5000',
          refresh: '10'
        })
      }
    } as unknown as ActivatedRoute;
    const router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    const component = new TraceManageComponent(observability, route, router);

    component.ngOnInit();
    tick(250);

    expect(observability.queryTraces).toHaveBeenCalledWith(
      jasmine.objectContaining({ start: 1_000, end: 2_000, environment: 'staging' }),
      0,
      20,
      true,
      1,
      5_000
    );
    expect(router.navigate).toHaveBeenCalledWith(
      [],
      jasmine.objectContaining({
        queryParams: jasmine.objectContaining({ errorOnly: true, minDurationMs: 1, maxDurationMs: 5_000, refresh: 10 }),
        replaceUrl: true
      })
    );
    component.ngOnDestroy();
  }));
});
