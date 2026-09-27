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
import { FormBuilder, FormControl, NgForm, Validators } from '@angular/forms';
import { configureShallowTest } from '@testing';
import { NEVER } from 'rxjs';

import { AlertDefineService } from '../../../service/alert-define.service';
import { AlertSettingComponent } from './alert-setting.component';

describe('AlertSettingComponent', () => {
  let component: AlertSettingComponent;
  let fixture: ComponentFixture<AlertSettingComponent>;

  beforeEach(async () => {
    await configureShallowTest(AlertSettingComponent).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AlertSettingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

describe('AlertSettingComponent visual rule validation', () => {
  let component: AlertSettingComponent;
  let alertDefineSvc: jasmine.SpyObj<AlertDefineService>;

  beforeEach(() => {
    alertDefineSvc = jasmine.createSpyObj<AlertDefineService>('AlertDefineService', ['newAlertDefine', 'editAlertDefine']);
    alertDefineSvc.newAlertDefine.and.returnValue(NEVER);
    alertDefineSvc.editAlertDefine.and.returnValue(NEVER);
    const i18n = jasmine.createSpyObj('I18NService', ['fanyi']);
    i18n.fanyi.and.callFake((key: string) => key);
    component = new AlertSettingComponent(
      jasmine.createSpyObj('NzModalService', ['create']),
      jasmine.createSpyObj('NzNotificationService', ['success', 'error']),
      jasmine.createSpyObj('AppDefineService', ['getAppHierarchy']),
      jasmine.createSpyObj('MonitorService', ['getMonitorsByApp']),
      alertDefineSvc,
      i18n,
      new FormBuilder(),
      jasmine.createSpyObj('NzMessageService', ['success'])
    );
    component.defineForm = new NgForm([], []);
    component.defineForm.form.addControl('name', new FormControl('test alert', Validators.required));
    component.cascadeValues = ['linux', 'cpu'];
  });

  for (const type of ['realtime_metric', 'realtime_log']) {
    for (const isAdd of [true, false]) {
      const action = isAdd ? 'create' : 'update';

      it(`should block ${action} of ${type} with no visual rules`, () => {
        component.define.type = type;
        component.isManageModalAdd = isAdd;
        component.cascadeValues = type === 'realtime_metric' ? ['linux', 'cpu'] : [];
        component.resetQbDataDefault();
        expect(component.defineForm.valid).toBeTrue();

        component.onManageModalOk();

        expect(alertDefineSvc.newAlertDefine).not.toHaveBeenCalled();
        expect(alertDefineSvc.editAlertDefine).not.toHaveBeenCalled();
        expect(component.isManageModalOkLoading).toBeFalse();
        expect(component.qbFormCtrl.dirty).toBeTrue();
        expect(component.qbFormCtrl.touched).toBeTrue();
        expect(component.qbFormCtrl.hasError('required')).toBeTrue();
      });

      it(`should block ${action} of ${type} with only empty nested groups`, () => {
        component.define.type = type;
        component.isManageModalAdd = isAdd;
        component.resetQbData({
          condition: 'and',
          rules: [{ condition: 'or', rules: [{ condition: 'and', rules: [] }] }]
        });

        component.onManageModalOk();

        expect(alertDefineSvc.newAlertDefine).not.toHaveBeenCalled();
        expect(alertDefineSvc.editAlertDefine).not.toHaveBeenCalled();
        expect(component.qbFormCtrl.hasError('required')).toBeTrue();
      });

      it(`should allow ${action} of ${type} with a nested visual condition`, () => {
        component.define.type = type;
        component.isManageModalAdd = isAdd;
        component.resetQbData({
          condition: 'and',
          rules: [{ condition: 'or', rules: [{ field: 'usage', operator: '>', value: 0 }] }]
        });

        component.onManageModalOk();

        const save = isAdd ? alertDefineSvc.newAlertDefine : alertDefineSvc.editAlertDefine;
        expect(save).toHaveBeenCalledOnceWith(component.define);
        expect(component.define.expr).toContain('usage > 0');
      });
    }
  }

  it('should allow an existence condition without a comparison value', () => {
    component.resetQbData({ condition: 'and', rules: [{ field: 'usage', operator: 'exists' }] });

    component.onManageModalOk();

    expect(alertDefineSvc.newAlertDefine).toHaveBeenCalledOnceWith(component.define);
    expect(component.define.expr).toContain('exists(usage)');
  });

  it('should still respect other query-builder validators', () => {
    component.resetQbData({ condition: 'and', rules: [{ field: 'usage', operator: '>', value: 90 }] });
    component.qbFormCtrl.addValidators(() => ({ invalidField: true }));

    component.onManageModalOk();

    expect(alertDefineSvc.newAlertDefine).not.toHaveBeenCalled();
  });

  for (const type of ['realtime_metric', 'realtime_log']) {
    it(`should allow switching from invalid visual rules to a valid ${type} expression`, () => {
      component.define.type = type;
      component.onManageModalOk();
      expect(alertDefineSvc.newAlertDefine).not.toHaveBeenCalled();
      component.isExpr = true;
      component.userExpr = 'usage > 90';
      if (type === 'realtime_log') {
        component.updateLogFinalExpr();
      } else {
        component.updateFinalExpr();
      }

      component.onManageModalOk();

      expect(alertDefineSvc.newAlertDefine).toHaveBeenCalledOnceWith(component.define);
      expect(component.defineForm.controls['ruleset']).toBeUndefined();
    });
  }

  it('should allow switching from invalid visual rules to availability', () => {
    component.onManageModalOk();
    expect(alertDefineSvc.newAlertDefine).not.toHaveBeenCalled();
    component.cascadeValues = ['linux', 'availability'];
    component.updateFinalExpr();

    component.onManageModalOk();

    expect(alertDefineSvc.newAlertDefine).toHaveBeenCalledOnceWith(component.define);
    expect(component.define.expr).toContain('equals(__available__,"down")');
  });

  for (const type of ['periodic_metric', 'periodic_log']) {
    it(`should not require visual rules for ${type}`, () => {
      component.define.type = type;
      component.define.expr = 'periodic query';

      component.onManageModalOk();

      expect(alertDefineSvc.newAlertDefine).toHaveBeenCalledOnceWith(component.define);
    });
  }

  it('should retain validation of other required form fields', () => {
    component.cascadeValues = ['linux', 'availability'];
    component.defineForm.controls['name'].setValue('');

    component.onManageModalOk();

    expect(alertDefineSvc.newAlertDefine).not.toHaveBeenCalled();
    expect(component.defineForm.controls['name'].dirty).toBeTrue();
  });
});
