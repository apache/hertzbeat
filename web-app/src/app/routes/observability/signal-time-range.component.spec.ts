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

import { SignalTimeRangeComponent } from './signal-time-range.component';

describe('SignalTimeRangeComponent', () => {
  it('applies a relative preset without requiring manual dates', () => {
    const component = new SignalTimeRangeComponent();
    const ranges: Date[][] = [];
    component.valueChange.subscribe(value => ranges.push(value));

    component.selectPreset('15m');

    expect(ranges.length).toBe(1);
    expect(ranges[0][1].getTime() - ranges[0][0].getTime()).toBe(15 * 60_000);
  });

  it('emits automatic refresh at the configured interval', fakeAsync(() => {
    const component = new SignalTimeRangeComponent();
    let refreshes = 0;
    component.refresh.subscribe(() => refreshes++);

    component.setRefreshInterval(10);
    tick(10_000);
    component.ngOnDestroy();

    expect(refreshes).toBe(1);
  }));
});
