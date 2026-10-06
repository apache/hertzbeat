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
import { FormsModule } from '@angular/forms';
import { configureShallowTest } from '@testing';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';

import { Monitor } from '../../../pojo/Monitor';
import { MonitorListComponent } from './monitor-list.component';

describe('MonitorListComponent', () => {
  let component: MonitorListComponent;
  let fixture: ComponentFixture<MonitorListComponent>;

  beforeEach(async () => {
    await configureShallowTest(MonitorListComponent, [FormsModule, NzCheckboxModule]).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MonitorListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows current-page selection controls above and below the monitor list before any selection', () => {
    // Keep the list logically non-empty without rendering unrelated monitor-card dependencies in this shallow test.
    component.monitors = {
      length: 1,
      filter: () => [],
      [Symbol.iterator]: () => [][Symbol.iterator]()
    } as unknown as Monitor[];
    component.checkedMonitorIds.clear();

    fixture.detectChanges();

    const selectAllControls = fixture.nativeElement.querySelectorAll('.monitor-selection-actions label[nz-checkbox]');
    expect(selectAllControls.length).toBe(2);
    expect(fixture.nativeElement.querySelector('.monitor-selected-count')).toBeNull();
  });

  it('selects only available monitors on the current page and keeps selections from other pages', () => {
    const first = new Monitor();
    first.id = 1;
    const second = new Monitor();
    second.id = 2;
    const disappeared = new Monitor();
    disappeared.id = 3;
    disappeared._displayStatus = 'DISAPPEARED';
    component.monitors = [first, second, disappeared];
    component.checkedMonitorIds.add(99);

    component.onAllChecked(true);

    expect(component.checkedMonitorIds).toEqual(new Set([99, 1, 2]));
    expect(component.checkedAll).toBeTrue();

    component.onAllChecked(false);

    expect(component.checkedMonitorIds).toEqual(new Set([99]));
    expect(component.checkedAll).toBeFalse();
  });
});
