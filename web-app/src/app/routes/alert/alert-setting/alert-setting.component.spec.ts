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

import { FormBuilder } from '@angular/forms';
import { of } from 'rxjs';

import { AlertDefine } from '../../../pojo/AlertDefine';
import { AlertSettingComponent } from './alert-setting.component';

describe('AlertSettingComponent', () => {
  let component: AlertSettingComponent;
  let alertDefineSvc: jasmine.SpyObj<any>;

  function createComponent(): AlertSettingComponent {
    alertDefineSvc = jasmine.createSpyObj('AlertDefineService', [
      'getDatasourceStatus',
      'getAlertDefines',
      'getMonitorsDefinePreview'
    ]);
    alertDefineSvc.getDatasourceStatus.and.returnValue(
      of({ code: 0, data: { hasPromqlExecutor: true, hasSqlExecutor: true, traceLatencyPercentile: false } })
    );
    alertDefineSvc.getAlertDefines.and.returnValue(of({ code: 0, data: { content: [], number: 0, totalElements: 0 } }));
    alertDefineSvc.getMonitorsDefinePreview.and.returnValue(of({ code: 0, data: [] }));

    return new AlertSettingComponent(
      jasmine.createSpyObj('NzModalService', ['confirm']) as any,
      jasmine.createSpyObj('NzNotificationService', ['success', 'warning', 'error']) as any,
      jasmine.createSpyObj('AppDefineService', ['getAppHierarchy', 'getAppDefines']) as any,
      {} as any,
      alertDefineSvc as any,
      { fanyi: (key: string) => key, defaultLang: 'en-US' } as any,
      new FormBuilder(),
      jasmine.createSpyObj('NzMessageService', ['error']) as any
    );
  }

  beforeEach(() => {
    component = createComponent();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('maps periodic trace alerts to SQL over the Greptime RED rollup', () => {
    component.isPeriodicAlertEnabled = true;
    component.onSelectAlertType('periodic');

    component.dataType = 'trace';
    component.onDataTypeChange();

    expect(component.define.type).toBe('periodic_trace');
    expect(component.define.datasource).toBe('sql');
    expect(component.define.expr).toContain('FROM hertzbeat_apm_red_1m');
    expect(component.define.expr).toContain('__value__');
  });

  it('does not create a realtime trace alert type', () => {
    component.alertType = 'realtime';
    component.dataType = 'trace';

    component.onDataTypeChange();

    expect(component.dataType).toBe('metric');
    expect(component.define.type).toBe('realtime_metric');
  });

  it('uses native timestamp in the periodic log default SQL', () => {
    component.alertType = 'periodic';
    component.dataType = 'log';

    component.onDataTypeChange();

    expect(component.define.type).toBe('periodic_log');
    expect(component.define.expr).toContain('timestamp >= now()');
    expect(component.define.expr).not.toContain('time_unix_nano');
  });

  it('previews trace SQL using the periodic_trace type', () => {
    component.define = new AlertDefine();
    component.define.type = 'periodic_trace';
    component.define.datasource = 'sql';
    component.define.expr = 'SELECT service_name, 0.2 AS __value__ FROM hertzbeat_apm_red_1m';

    component.onPreviewLogExpr();

    expect(alertDefineSvc.getMonitorsDefinePreview).toHaveBeenCalledWith('sql', 'periodic_trace', component.define.expr);
  });

  it('only exposes latency p95 template when the backend capability is present', () => {
    expect(component.visibleTraceSqlTemplates.some(template => template.key === 'latency_p95')).toBeFalse();

    component.datasourceStatus.hasTraceLatencyPercentile = true;

    expect(component.visibleTraceSqlTemplates.some(template => template.key === 'latency_p95')).toBeTrue();
  });
});
