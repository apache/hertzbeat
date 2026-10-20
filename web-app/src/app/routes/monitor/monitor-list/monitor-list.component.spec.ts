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

import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SettingsService } from '@delon/theme';
import { configureShallowTest } from '@testing';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { throwError } from 'rxjs';

import { MonitorService } from '../../../service/monitor.service';
import { MonitorListComponent } from './monitor-list.component';

describe('MonitorListComponent', () => {
  let component: MonitorListComponent;
  let fixture: ComponentFixture<MonitorListComponent>;

  beforeEach(async () => {
    await configureShallowTest(MonitorListComponent).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MonitorListComponent);
    component = fixture.componentInstance;
    TestBed.inject(SettingsService).setUser({ name: 'test-user', role: '["user"]' });
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('only enables export for an exact admin role', () => {
    const settings = TestBed.inject(SettingsService);
    for (const role of ['["user"]', '["guest"]', '["administrator"]', 'admin', '{"admin":true}', '', undefined]) {
      settings.setUser({ name: 'test-user', role });
      expect(component.canExportMonitors).withContext(String(role)).toBeFalse();
    }
    for (const role of ['["admin"]', '["user","admin"]', ['admin']]) {
      settings.setUser({ name: 'test-user', role });
      expect(component.canExportMonitors).withContext(String(role)).toBeTrue();
    }
  });

  for (const role of ['user', 'guest']) {
    it(`does not open or execute either export for ${role}`, () => {
      TestBed.inject(SettingsService).setUser({ name: 'test-user', role: JSON.stringify([role]) });
      const service = TestBed.inject(MonitorService);
      const selected = spyOn(service, 'exportMonitors');
      const all = spyOn(service, 'exportAllMonitors');
      const notice = spyOn(TestBed.inject(NzNotificationService), 'error');
      component.checkedMonitorIds.add(1);
      component.onExportMonitors();
      component.onExportAllMonitors();
      component.exportMonitors('JSON');
      component.exportAllMonitors('EXCEL');
      expect(component.isSwitchExportTypeModalVisible).toBeFalse();
      expect(selected).not.toHaveBeenCalled();
      expect(all).not.toHaveBeenCalled();
      expect(notice).toHaveBeenCalledWith('monitor.export.admin-only', '');
    });
  }

  it('allows an admin to open the export dialog', () => {
    TestBed.inject(SettingsService).setUser({ name: 'admin', role: '["admin"]' });
    component.checkedMonitorIds.add(1);
    component.onExportMonitors();
    expect(component.isSwitchExportTypeModalVisible).toBeTrue();
    component.isSwitchExportTypeModalVisible = false;
    component.onExportAllMonitors();
    expect(component.isSwitchExportTypeModalVisible).toBeTrue();
  });

  for (const all of [false, true]) {
    it(`shows a clear permission error without downloading ${all ? 'all' : 'selected'} monitors`, () => {
      TestBed.inject(SettingsService).setUser({ name: 'admin', role: '["admin"]' });
      const service = TestBed.inject(MonitorService);
      const denied = throwError(() => new HttpErrorResponse({ status: 403, statusText: 'Forbidden' }));
      spyOn(service, all ? 'exportAllMonitors' : 'exportMonitors').and.returnValue(denied);
      const notice = spyOn(TestBed.inject(NzNotificationService), 'error');
      const download = spyOn(window.URL, 'createObjectURL');
      component.checkedMonitorIds.add(1);
      component.isSwitchExportTypeModalVisible = true;
      if (all) {
        component.exportAllMonitors('EXCEL');
      } else {
        component.exportMonitors('JSON');
      }
      expect(notice).toHaveBeenCalledWith('monitor.export.admin-only', '');
      expect(download).not.toHaveBeenCalled();
      expect(component.isSwitchExportTypeModalVisible).toBeFalse();
      expect(component.exportExcelButtonLoading).toBeFalse();
      expect(component.exportJsonButtonLoading).toBeFalse();
    });
  }
});
