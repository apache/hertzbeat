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

import { Component, EventEmitter, Input, NO_ERRORS_SCHEMA, Output, Pipe, PipeTransform } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { I18NService } from '@core';
import { ALAIN_I18N_TOKEN, TitleService } from '@delon/theme';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { of, throwError } from 'rxjs';

import { AppDefineService } from '../../../service/app-define.service';
import { CollectorService } from '../../../service/collector.service';
import { LabelService } from '../../../service/label.service';
import { MonitorService } from '../../../service/monitor.service';
import { MonitorEditComponent } from './monitor-edit.component';

@Pipe({ name: 'i18n', standalone: false })
class MockI18nPipe implements PipeTransform {
  transform(value: string): string {
    return value;
  }
}

@Component({ standalone: false, selector: 'app-monitor-form', template: '' })
class MockMonitorFormComponent {
  @Input() loading: boolean | undefined;
  @Input() loadingTip: string | undefined;
  @Input() monitor: any;
  @Input() grafanaDashboard: any;
  @Input() hostName: string | undefined;
  @Input() params: any;
  @Input() paramDefines: any;
  @Input() advancedParams: any;
  @Input() advancedParamDefines: any;
  @Input() paramValueMap: any;
  @Input() collector: string | undefined;
  @Input() collectors: any;
  @Input() labelKeys: any;
  @Input() labelMap: any;
  @Input() labelIsCustom: any;
  @Input() sdParams: any;
  @Input() sdDefines: any;
  @Output() scrapeChange = new EventEmitter<string>();
  @Output() formCancel = new EventEmitter<void>();
  @Output() formSubmit = new EventEmitter<any>();
  @Output() formDetect = new EventEmitter<any>();
}

@Component({ standalone: false, selector: 'app-monitor-route-state-panel', template: '' })
class MockMonitorRouteStatePanelComponent {
  @Input() state: any;
  @Input() title = '';
  @Input() description = '';
  @Input() showRetry = false;
  @Input() retryLabel = '';
  @Output() retryRequested = new EventEmitter<void>();
}

describe('MonitorModifyComponent', () => {
  function createComponent(
    translations: Record<string, string> = {},
    monitorResponse: any = of({
      code: 0,
      data: {
        monitor: { id: 1, app: 'website', instance: 'example.com:80', name: 'demo-monitor', scrape: 'static' },
        params: [],
        collector: '',
        grafanaDashboard: {}
      }
    }),
    appParamsResponse: any = of({ code: 0, data: [] }),
    collectorsResponse: any = of({ code: 0, data: { content: [] } })
  ) {
    const i18n = jasmine.createSpyObj<I18NService>('I18NService', ['fanyi']);
    i18n.fanyi.and.callFake((key: string) => translations[key] ?? key);
    const appDefineSvc = jasmine.createSpyObj<AppDefineService>('AppDefineService', ['getAppParamsDefine']);
    appDefineSvc.getAppParamsDefine.and.returnValue(appParamsResponse);
    const collectorSvc = jasmine.createSpyObj<CollectorService>('CollectorService', ['getCollectors']);
    collectorSvc.getCollectors.and.returnValue(collectorsResponse);
    const monitorSvc = jasmine.createSpyObj<MonitorService>('MonitorService', ['getMonitor', 'editMonitor', 'detectMonitor']);
    monitorSvc.getMonitor.and.returnValue(monitorResponse);

    const labelSvc = jasmine.createSpyObj<LabelService>('LabelService', ['loadLabels']);
    labelSvc.loadLabels.and.returnValue(
      of({
        code: 0,
        msg: '',
        data: {
          content: [],
          totalPages: 1,
          totalElements: 0,
          size: 0,
          number: 0,
          numberOfElements: 0
        }
      })
    );

    return new MonitorEditComponent(
      appDefineSvc,
      monitorSvc,
      {
        paramMap: of({
          get: (name: string) => (name === 'monitorId' ? '1' : null)
        })
      } as unknown as ActivatedRoute,
      jasmine.createSpyObj<Router>('Router', ['navigateByUrl']),
      jasmine.createSpyObj<TitleService>('TitleService', ['setTitleByI18n']),
      jasmine.createSpyObj<NzNotificationService>('NzNotificationService', ['warning', 'error', 'success']),
      collectorSvc,
      labelSvc,
      i18n
    );
  }

  it('should create', () => {
    const component = createComponent();

    expect(component).toBeTruthy();
  });

  it('should switch route state to ready after monitor payload loads', () => {
    const component = createComponent();

    component.ngOnInit();

    expect(component.routeState).toBe('ready');
  });

  it('should initialize missing number params with null when no default value is provided', () => {
    const component = createComponent(
      {},
      of({
        code: 0,
        data: {
          monitor: { id: 1, app: 'website', instance: 'example.com:80', name: 'demo-monitor', scrape: 'static' },
          params: [],
          collector: '',
          grafanaDashboard: {}
        }
      }),
      of({
        code: 0,
        data: [
          {
            field: 'port',
            type: 'number',
            required: true,
            hide: false
          }
        ]
      })
    );

    component.ngOnInit();

    expect(component.params[0].paramValue).toBeNull();
  });

  it('should switch route state to error when monitor payload request fails', () => {
    const component = createComponent(
      {
        'monitor.route-state.error.title': '监控加载失败',
        'monitor.route-state.error.copy': '当前无法加载监控详情，请稍后重试。'
      },
      throwError(() => ({ msg: 'boom' }))
    );

    component.ngOnInit();

    expect(component.routeState).toBe('error');
    expect(component.routeStateTitle).toBe('监控加载失败');
  });

  it('should wrap the edit form in a monitor page shell when ready', async () => {
    const appDefineSvc = jasmine.createSpyObj<AppDefineService>('AppDefineService', ['getAppParamsDefine']);
    const collectorSvc = jasmine.createSpyObj<CollectorService>('CollectorService', ['getCollectors']);
    const monitorSvc = jasmine.createSpyObj<MonitorService>('MonitorService', ['getMonitor', 'editMonitor', 'detectMonitor']);
    const labelSvc = jasmine.createSpyObj<LabelService>('LabelService', ['loadLabels']);
    appDefineSvc.getAppParamsDefine.and.returnValue(of({ code: 0, msg: '', data: [] }));
    collectorSvc.getCollectors.and.returnValue(
      of({
        code: 0,
        msg: '',
        data: { content: [], totalPages: 1, totalElements: 0, size: 0, number: 0, numberOfElements: 0 }
      })
    );
    monitorSvc.getMonitor.and.returnValue(
      of({
        code: 0,
        msg: '',
        data: {
          monitor: { id: 1, app: 'website', instance: 'example.com:80', name: 'demo-monitor', scrape: 'static' },
          params: [],
          collector: '',
          grafanaDashboard: {}
        }
      })
    );
    labelSvc.loadLabels.and.returnValue(
      of({
        code: 0,
        msg: '',
        data: { content: [], totalPages: 1, totalElements: 0, size: 0, number: 0, numberOfElements: 0 }
      })
    );

    await TestBed.configureTestingModule({
      declarations: [MonitorEditComponent, MockI18nPipe, MockMonitorFormComponent, MockMonitorRouteStatePanelComponent],
      providers: [
        { provide: AppDefineService, useValue: appDefineSvc },
        { provide: MonitorService, useValue: monitorSvc },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of({
              get: (name: string) => (name === 'monitorId' ? '1' : null)
            })
          }
        },
        { provide: Router, useValue: jasmine.createSpyObj<Router>('Router', ['navigateByUrl']) },
        { provide: TitleService, useValue: jasmine.createSpyObj<TitleService>('TitleService', ['setTitleByI18n']) },
        { provide: NzNotificationService, useValue: jasmine.createSpyObj('NzNotificationService', ['warning', 'error', 'success']) },
        { provide: CollectorService, useValue: collectorSvc },
        { provide: LabelService, useValue: labelSvc },
        { provide: ALAIN_I18N_TOKEN, useValue: { fanyi: (key: string) => key } as I18NService }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    const fixture = TestBed.createComponent(MonitorEditComponent);
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('app-page-shell')).not.toBeNull();
    expect(host.querySelector('.monitor-page-shell__content')).not.toBeNull();
    expect(host.querySelector('.monitor-page-shell__content--form-stage')).not.toBeNull();
    expect(host.querySelector('.monitor-page-shell__content-inner')).not.toBeNull();
  });

  it('should make the edit shell itself own vertical scrolling', async () => {
    const appDefineSvc = jasmine.createSpyObj<AppDefineService>('AppDefineService', ['getAppParamsDefine']);
    const collectorSvc = jasmine.createSpyObj<CollectorService>('CollectorService', ['getCollectors']);
    const monitorSvc = jasmine.createSpyObj<MonitorService>('MonitorService', ['getMonitor', 'editMonitor', 'detectMonitor']);
    const labelSvc = jasmine.createSpyObj<LabelService>('LabelService', ['loadLabels']);
    appDefineSvc.getAppParamsDefine.and.returnValue(of({ code: 0, msg: '', data: [] }));
    collectorSvc.getCollectors.and.returnValue(
      of({
        code: 0,
        msg: '',
        data: { content: [], totalPages: 1, totalElements: 0, size: 0, number: 0, numberOfElements: 0 }
      })
    );
    monitorSvc.getMonitor.and.returnValue(
      of({
        code: 0,
        msg: '',
        data: {
          monitor: { id: 1, app: 'website', instance: 'example.com:80', name: 'demo-monitor', scrape: 'static' },
          params: [],
          collector: '',
          grafanaDashboard: {}
        }
      })
    );
    labelSvc.loadLabels.and.returnValue(
      of({
        code: 0,
        msg: '',
        data: { content: [], totalPages: 1, totalElements: 0, size: 0, number: 0, numberOfElements: 0 }
      })
    );

    await TestBed.configureTestingModule({
      declarations: [MonitorEditComponent, MockI18nPipe, MockMonitorFormComponent, MockMonitorRouteStatePanelComponent],
      providers: [
        { provide: AppDefineService, useValue: appDefineSvc },
        { provide: MonitorService, useValue: monitorSvc },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of({
              get: (name: string) => (name === 'monitorId' ? '1' : null)
            })
          }
        },
        { provide: Router, useValue: jasmine.createSpyObj<Router>('Router', ['navigateByUrl']) },
        { provide: TitleService, useValue: jasmine.createSpyObj<TitleService>('TitleService', ['setTitleByI18n']) },
        { provide: NzNotificationService, useValue: jasmine.createSpyObj('NzNotificationService', ['warning', 'error', 'success']) },
        { provide: CollectorService, useValue: collectorSvc },
        { provide: LabelService, useValue: labelSvc },
        { provide: ALAIN_I18N_TOKEN, useValue: { fanyi: (key: string) => key } as I18NService }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    const fixture = TestBed.createComponent(MonitorEditComponent);
    fixture.detectChanges();

    const shell = fixture.nativeElement.querySelector('.monitor-page-shell__content') as HTMLElement;
    const style = getComputedStyle(shell);
    expect(style.overflowY).toBe('auto');
    expect(style.touchAction).toBe('pan-y');
  });
});
