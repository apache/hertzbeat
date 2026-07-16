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

import { ObservabilityService } from '../../service/observability.service';
import { MetricsManageComponent } from './metrics-manage.component';

describe('MetricsManageComponent', () => {
  it('loads inventory, queries the selected metric, and derives the sample summary', fakeAsync(() => {
    const observability = jasmine.createSpyObj<ObservabilityService>('ObservabilityService', ['metricInventory', 'queryMetrics']);
    observability.metricInventory.and.returnValue(of({ code: 0, data: { metricNames: ['http.requests'] }, msg: '' }));
    observability.queryMetrics.and.returnValue(
      of({
        code: 0,
        data: {
          query: 'http.requests',
          start: 1_000,
          end: 2_000,
          step: 15,
          series: [
            {
              labels: { service: 'checkout' },
              points: [
                { timestamp: 1_000, value: 4 },
                { timestamp: 2_000, value: 9 }
              ]
            }
          ]
        },
        msg: ''
      })
    );
    const route = {
      snapshot: { queryParamMap: convertToParamMap({ start: 1_000, end: 2_000, step: 15 }) }
    } as unknown as ActivatedRoute;
    const router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    const component = new MetricsManageComponent(observability, route, router);

    component.ngOnInit();
    tick(250);

    expect(observability.queryMetrics).toHaveBeenCalledWith(
      jasmine.objectContaining({ start: 1_000, end: 2_000 }),
      'http.requests',
      undefined,
      undefined,
      undefined,
      15
    );
    expect(component.summary).toEqual({ sampleCount: 2, minimum: 4, maximum: 9, latest: 9 });
    expect(component.rows.length).toBe(2);
    expect(router.navigate).toHaveBeenCalledWith([], jasmine.objectContaining({ replaceUrl: true }));
    component.ngOnDestroy();
  }));
});
