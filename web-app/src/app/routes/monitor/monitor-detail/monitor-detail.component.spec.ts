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

import { ChangeDetectorRef, NO_ERRORS_SCHEMA, Pipe, PipeTransform } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { I18NService } from '@core';
import { ALAIN_I18N_TOKEN } from '@delon/theme';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { of, throwError } from 'rxjs';

import { AppDefineService } from '../../../service/app-define.service';
import { MonitorService } from '../../../service/monitor.service';
import { MonitorDataTableComponent } from '../monitor-data-table/monitor-data-table.component';
import { MonitorDetailComponent } from './monitor-detail.component';

@Pipe({ name: 'i18n', standalone: false })
class MockI18nPipe implements PipeTransform {
  transform(value: string): string {
    return value;
  }
}

@Pipe({ name: '_date', standalone: false })
class MockDatePipe implements PipeTransform {
  transform(value: string): string {
    return value;
  }
}

describe('MonitorDetailComponent', () => {
  function createComponent(
    translations: Record<string, string> = {},
    monitorResponse: any = of({
      code: 0,
      data: {
        monitor: { id: 1, app: 'website', instance: 'example.com:80', name: 'demo-monitor' },
        params: [],
        metrics: []
      }
    })
  ) {
    const i18n = jasmine.createSpyObj<I18NService>('I18NService', ['fanyi']);
    i18n.fanyi.and.callFake((key: string) => translations[key] ?? key);
    const monitorSvc = jasmine.createSpyObj<MonitorService>('MonitorService', ['getWarehouseStorageServerStatus', 'getMonitor']);
    monitorSvc.getMonitor.and.returnValue(monitorResponse);
    const component = new MonitorDetailComponent(
      monitorSvc,
      {
        paramMap: of({
          get: (name: string) => (name === 'monitorId' ? '1' : null)
        })
      } as unknown as ActivatedRoute,
      jasmine.createSpyObj<NzNotificationService>('NzNotificationService', ['warning']),
      jasmine.createSpyObj<AppDefineService>('AppDefineService', ['getPushDefine', 'getAppDynamicDefine', 'getAppDefine']),
      jasmine.createSpyObj<ChangeDetectorRef>('ChangeDetectorRef', ['detectChanges']),
      i18n
    );
    return { component };
  }

  it('should create', () => {
    const { component } = createComponent();
    expect(component).toBeTruthy();
  });

  it('should expose workbench summary items for realtime, history, and favorites', () => {
    const { component } = createComponent({
      'monitor.detail.workbench.summary.realtime': '实时指标',
      'monitor.detail.workbench.summary.history': '历史图表',
      'monitor.detail.workbench.summary.favorite': '收藏视图'
    });
    component.metrics = ['cpu', 'memory', 'load'];
    component.chartMetrics = [{}, {}] as any[];
    component.favoriteMetricsSet = new Set(['cpu', 'memory']);

    expect(component.workbenchSummaryItems).toEqual([
      { label: '实时指标', value: '3' },
      { label: '历史图表', value: '2' },
      { label: '收藏视图', value: '2' }
    ]);
  });

  it('should render shared facts strips for the workbench summary and active panel summary', async () => {
    const monitorSvc = jasmine.createSpyObj<MonitorService>('MonitorService', [
      'getWarehouseStorageServerStatus',
      'getMonitor',
      'getGrafanaDashboard',
      'getUserFavoritedMetrics',
      'addMetricsFavorite',
      'removeMetricsFavorite'
    ]);
    monitorSvc.getMonitor.and.returnValue(
      of({
        code: 0,
        msg: '',
        data: {
          monitor: { id: 1, app: 'website', instance: 'example.com:80', name: 'demo-monitor' },
          params: [],
          metrics: []
        }
      })
    );
    monitorSvc.getGrafanaDashboard.and.returnValue(of({ code: 0, msg: '', data: null }));
    monitorSvc.getUserFavoritedMetrics.and.returnValue(of({ code: 0, msg: '', data: new Set<string>() }));

    await TestBed.configureTestingModule({
      declarations: [MonitorDetailComponent, MonitorDataTableComponent, MockI18nPipe, MockDatePipe],
      providers: [
        { provide: MonitorService, useValue: monitorSvc },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of({
              get: (name: string) => (name === 'monitorId' ? '1' : null)
            })
          }
        },
        { provide: NzNotificationService, useValue: jasmine.createSpyObj('NzNotificationService', ['warning']) },
        {
          provide: AppDefineService,
          useValue: jasmine.createSpyObj<AppDefineService>('AppDefineService', ['getPushDefine', 'getAppDynamicDefine', 'getAppDefine'])
        },
        { provide: ChangeDetectorRef, useValue: jasmine.createSpyObj<ChangeDetectorRef>('ChangeDetectorRef', ['detectChanges']) },
        { provide: ALAIN_I18N_TOKEN, useValue: { fanyi: (key: string) => key } as I18NService }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    const fixture = TestBed.createComponent(MonitorDetailComponent);
    const component = fixture.componentInstance;
    component.routeState = 'ready';
    component.monitorId = 1;
    component.app = 'website';
    component.monitor = { id: 1, app: 'website', instance: 'example.com:80', name: 'demo-monitor' } as any;
    component.metrics = ['cpu', 'memory'];
    component.displayedMetrics = ['cpu', 'memory'];
    component.chartMetrics = [{}, {}] as any[];
    component.displayedChartMetrics = [{}] as any[];
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelectorAll('app-platform-facts-strip').length).toBeGreaterThanOrEqual(2);
  });

  it('should expose active panel summary items for the history tab', () => {
    const { component } = createComponent({
      'monitor.detail.panel.summary.total': '总量',
      'monitor.detail.panel.summary.visible': '展示中',
      'monitor.detail.panel.summary.source': '来源',
      'monitor.detail.chart.source.badge': 'HertzBeat 采集'
    });
    component.whichTabIndex = 1;
    component.chartMetrics = [{}, {}, {}] as any[];
    component.displayedChartMetrics = [{}, {}] as any[];

    expect(component.activePanelSummaryItems).toEqual([
      { label: '总量', value: '3' },
      { label: '展示中', value: '2' },
      { label: '来源', value: 'HertzBeat 采集' }
    ]);
  });

  it('should switch route state to ready after monitor detail loads', () => {
    const { component } = createComponent();

    component.loadRealTimeMetric();

    expect(component.routeState).toBe('ready');
  });

  it('should switch route state to error when monitor detail request fails', () => {
    const { component } = createComponent(
      {
        'monitor.route-state.error.title': '监控加载失败',
        'monitor.route-state.error.copy': '当前无法加载监控详情，请稍后重试。'
      },
      throwError(() => ({ msg: 'boom' }))
    );

    component.loadRealTimeMetric();

    expect(component.routeState).toBe('error');
    expect(component.routeStateTitle).toBe('监控加载失败');
    expect(component.routeStateDescription).toBe('当前无法加载监控详情，请稍后重试。');
  });

  it('should render a dedicated realtime grid with a wide overview card', async () => {
    const monitorSvc = jasmine.createSpyObj<MonitorService>('MonitorService', [
      'getWarehouseStorageServerStatus',
      'getMonitor',
      'getGrafanaDashboard',
      'getUserFavoritedMetrics',
      'addMetricsFavorite',
      'removeMetricsFavorite'
    ]);
    monitorSvc.getMonitor.and.returnValue(
      of({
        code: 0,
        msg: '',
        data: {
          monitor: { id: 1, app: 'website', instance: 'example.com:80', name: 'demo-monitor' },
          params: [],
          metrics: []
        }
      })
    );
    monitorSvc.getGrafanaDashboard.and.returnValue(of({ code: 0, msg: '', data: null }));
    monitorSvc.getUserFavoritedMetrics.and.returnValue(of({ code: 0, msg: '', data: new Set<string>() }));

    await TestBed.configureTestingModule({
      declarations: [MonitorDetailComponent, MonitorDataTableComponent, MockI18nPipe, MockDatePipe],
      providers: [
        { provide: MonitorService, useValue: monitorSvc },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of({
              get: (name: string) => (name === 'monitorId' ? '1' : null)
            })
          }
        },
        { provide: NzNotificationService, useValue: jasmine.createSpyObj('NzNotificationService', ['warning']) },
        {
          provide: AppDefineService,
          useValue: jasmine.createSpyObj<AppDefineService>('AppDefineService', ['getPushDefine', 'getAppDynamicDefine', 'getAppDefine'])
        },
        { provide: ChangeDetectorRef, useValue: jasmine.createSpyObj<ChangeDetectorRef>('ChangeDetectorRef', ['detectChanges']) },
        { provide: ALAIN_I18N_TOKEN, useValue: { fanyi: (key: string) => key } as I18NService }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    const fixture = TestBed.createComponent(MonitorDetailComponent);
    const component = fixture.componentInstance;
    component.routeState = 'ready';
    component.monitorId = 1;
    component.app = 'website';
    component.monitor = { id: 1, app: 'website', instance: 'example.com:80', name: 'demo-monitor' } as any;
    component.displayedMetrics = ['cpu', 'memory'];
    component.metrics = ['cpu', 'memory'];
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('app-page-shell')).not.toBeNull();
    expect(host.querySelector('.monitor-detail-card-grid--realtime')).not.toBeNull();
    expect(host.querySelector('.monitor-detail-card--overview')).not.toBeNull();
  });

  it('should separate the realtime overview stage from the signal cards stage', async () => {
    const monitorSvc = jasmine.createSpyObj<MonitorService>('MonitorService', [
      'getWarehouseStorageServerStatus',
      'getMonitor',
      'getGrafanaDashboard',
      'getUserFavoritedMetrics',
      'addMetricsFavorite',
      'removeMetricsFavorite'
    ]);
    monitorSvc.getMonitor.and.returnValue(
      of({
        code: 0,
        msg: '',
        data: {
          monitor: { id: 1, app: 'website', instance: 'example.com:80', name: 'demo-monitor' },
          params: [],
          metrics: []
        }
      })
    );
    monitorSvc.getGrafanaDashboard.and.returnValue(of({ code: 0, msg: '', data: null }));
    monitorSvc.getUserFavoritedMetrics.and.returnValue(of({ code: 0, msg: '', data: new Set<string>() }));

    await TestBed.configureTestingModule({
      declarations: [MonitorDetailComponent, MockI18nPipe, MockDatePipe],
      providers: [
        { provide: MonitorService, useValue: monitorSvc },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of({
              get: (name: string) => (name === 'monitorId' ? '1' : null)
            })
          }
        },
        { provide: NzNotificationService, useValue: jasmine.createSpyObj('NzNotificationService', ['warning']) },
        {
          provide: AppDefineService,
          useValue: jasmine.createSpyObj<AppDefineService>('AppDefineService', ['getPushDefine', 'getAppDynamicDefine', 'getAppDefine'])
        },
        { provide: ChangeDetectorRef, useValue: jasmine.createSpyObj<ChangeDetectorRef>('ChangeDetectorRef', ['detectChanges']) },
        { provide: ALAIN_I18N_TOKEN, useValue: { fanyi: (key: string) => key } as I18NService }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    const fixture = TestBed.createComponent(MonitorDetailComponent);
    const component = fixture.componentInstance;
    component.routeState = 'ready';
    component.monitorId = 1;
    component.app = 'website';
    component.monitor = { id: 1, app: 'website', instance: 'example.com:80', name: 'demo-monitor' } as any;
    component.displayedMetrics = ['cpu', 'memory'];
    component.metrics = ['cpu', 'memory'];
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.monitor-detail-stage--overview')).not.toBeNull();
    expect(host.querySelector('.monitor-detail-stage--signals')).not.toBeNull();
  });

  it('should render a shared context chip bar inside the monitor detail header', async () => {
    const monitorSvc = jasmine.createSpyObj<MonitorService>('MonitorService', [
      'getWarehouseStorageServerStatus',
      'getMonitor',
      'getGrafanaDashboard',
      'getUserFavoritedMetrics',
      'addMetricsFavorite',
      'removeMetricsFavorite'
    ]);
    monitorSvc.getMonitor.and.returnValue(
      of({
        code: 0,
        msg: '',
        data: {
          monitor: { id: 1, app: 'website', instance: 'example.com:80', name: 'demo-monitor' },
          params: [],
          metrics: []
        }
      })
    );
    monitorSvc.getGrafanaDashboard.and.returnValue(of({ code: 0, msg: '', data: null }));
    monitorSvc.getUserFavoritedMetrics.and.returnValue(of({ code: 0, msg: '', data: new Set<string>() }));

    await TestBed.configureTestingModule({
      declarations: [MonitorDetailComponent, MockI18nPipe, MockDatePipe],
      providers: [
        { provide: MonitorService, useValue: monitorSvc },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of({
              get: (name: string) => (name === 'monitorId' ? '1' : null)
            })
          }
        },
        { provide: NzNotificationService, useValue: jasmine.createSpyObj('NzNotificationService', ['warning']) },
        {
          provide: AppDefineService,
          useValue: jasmine.createSpyObj<AppDefineService>('AppDefineService', ['getPushDefine', 'getAppDynamicDefine', 'getAppDefine'])
        },
        { provide: ChangeDetectorRef, useValue: jasmine.createSpyObj<ChangeDetectorRef>('ChangeDetectorRef', ['detectChanges']) },
        { provide: ALAIN_I18N_TOKEN, useValue: { fanyi: (key: string) => key } as I18NService }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    const fixture = TestBed.createComponent(MonitorDetailComponent);
    const component = fixture.componentInstance;
    component.routeState = 'ready';
    component.monitorId = 1;
    component.app = 'website';
    component.monitor = { id: 1, app: 'website', instance: 'example.com:80', name: 'demo-monitor' } as any;
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('app-platform-context-chip-bar')).not.toBeNull();
  });

  it('should render the overview stage as a flat surface instead of another nested card', async () => {
    const monitorSvc = jasmine.createSpyObj<MonitorService>('MonitorService', [
      'getWarehouseStorageServerStatus',
      'getMonitor',
      'getGrafanaDashboard',
      'getUserFavoritedMetrics',
      'addMetricsFavorite',
      'removeMetricsFavorite'
    ]);
    monitorSvc.getMonitor.and.returnValue(
      of({
        code: 0,
        msg: '',
        data: {
          monitor: { id: 1, app: 'website', instance: 'example.com:80', name: 'demo-monitor' },
          params: [],
          metrics: []
        }
      })
    );
    monitorSvc.getGrafanaDashboard.and.returnValue(of({ code: 0, msg: '', data: null }));
    monitorSvc.getUserFavoritedMetrics.and.returnValue(of({ code: 0, msg: '', data: new Set<string>() }));

    await TestBed.configureTestingModule({
      declarations: [MonitorDetailComponent, MockI18nPipe, MockDatePipe],
      providers: [
        { provide: MonitorService, useValue: monitorSvc },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of({
              get: (name: string) => (name === 'monitorId' ? '1' : null)
            })
          }
        },
        { provide: NzNotificationService, useValue: jasmine.createSpyObj('NzNotificationService', ['warning']) },
        {
          provide: AppDefineService,
          useValue: jasmine.createSpyObj<AppDefineService>('AppDefineService', ['getPushDefine', 'getAppDynamicDefine', 'getAppDefine'])
        },
        { provide: ChangeDetectorRef, useValue: jasmine.createSpyObj<ChangeDetectorRef>('ChangeDetectorRef', ['detectChanges']) },
        { provide: ALAIN_I18N_TOKEN, useValue: { fanyi: (key: string) => key } as I18NService }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    const fixture = TestBed.createComponent(MonitorDetailComponent);
    const component = fixture.componentInstance;
    component.routeState = 'ready';
    component.monitorId = 1;
    component.app = 'website';
    component.monitor = { id: 1, app: 'website', instance: 'example.com:80', name: 'demo-monitor' } as any;
    component.displayedMetrics = ['cpu', 'memory'];
    component.metrics = ['cpu', 'memory'];
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.monitor-detail-stage--overview app-monitor-data-table.monitor-detail-card--overview-flat')).not.toBeNull();
  });

  it('should render the realtime stage with a dedicated signal grid container', async () => {
    const monitorSvc = jasmine.createSpyObj<MonitorService>('MonitorService', [
      'getWarehouseStorageServerStatus',
      'getMonitor',
      'getGrafanaDashboard',
      'getUserFavoritedMetrics',
      'addMetricsFavorite',
      'removeMetricsFavorite'
    ]);
    monitorSvc.getMonitor.and.returnValue(
      of({
        code: 0,
        msg: '',
        data: {
          monitor: { id: 1, app: 'website', instance: 'example.com:80', name: 'demo-monitor' },
          params: [],
          metrics: []
        }
      })
    );
    monitorSvc.getGrafanaDashboard.and.returnValue(of({ code: 0, msg: '', data: null }));
    monitorSvc.getUserFavoritedMetrics.and.returnValue(of({ code: 0, msg: '', data: new Set<string>() }));

    await TestBed.configureTestingModule({
      declarations: [MonitorDetailComponent, MockI18nPipe, MockDatePipe],
      providers: [
        { provide: MonitorService, useValue: monitorSvc },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of({
              get: (name: string) => (name === 'monitorId' ? '1' : null)
            })
          }
        },
        { provide: NzNotificationService, useValue: jasmine.createSpyObj('NzNotificationService', ['warning']) },
        {
          provide: AppDefineService,
          useValue: jasmine.createSpyObj<AppDefineService>('AppDefineService', ['getPushDefine', 'getAppDynamicDefine', 'getAppDefine'])
        },
        { provide: ChangeDetectorRef, useValue: jasmine.createSpyObj<ChangeDetectorRef>('ChangeDetectorRef', ['detectChanges']) },
        { provide: ALAIN_I18N_TOKEN, useValue: { fanyi: (key: string) => key } as I18NService }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    const fixture = TestBed.createComponent(MonitorDetailComponent);
    const component = fixture.componentInstance;
    component.routeState = 'ready';
    component.monitorId = 1;
    component.app = 'website';
    component.monitor = { id: 1, app: 'website', instance: 'example.com:80', name: 'demo-monitor' } as any;
    component.displayedMetrics = ['cpu', 'memory'];
    component.metrics = ['cpu', 'memory'];
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.monitor-detail-stage--signals')).not.toBeNull();
    expect(host.querySelector('.monitor-detail-card-grid--realtime')).not.toBeNull();
  });

  it('should render the history stage with a dedicated chart grid container', async () => {
    const monitorSvc = jasmine.createSpyObj<MonitorService>('MonitorService', [
      'getWarehouseStorageServerStatus',
      'getMonitor',
      'getGrafanaDashboard',
      'getUserFavoritedMetrics',
      'addMetricsFavorite',
      'removeMetricsFavorite'
    ]);
    monitorSvc.getMonitor.and.returnValue(
      of({
        code: 0,
        msg: '',
        data: {
          monitor: { id: 1, app: 'website', instance: 'example.com:80', name: 'demo-monitor' },
          params: [],
          metrics: []
        }
      })
    );
    monitorSvc.getGrafanaDashboard.and.returnValue(of({ code: 0, msg: '', data: null }));
    monitorSvc.getUserFavoritedMetrics.and.returnValue(of({ code: 0, msg: '', data: new Set<string>() }));

    await TestBed.configureTestingModule({
      declarations: [MonitorDetailComponent, MockI18nPipe, MockDatePipe],
      providers: [
        { provide: MonitorService, useValue: monitorSvc },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of({
              get: (name: string) => (name === 'monitorId' ? '1' : null)
            })
          }
        },
        { provide: NzNotificationService, useValue: jasmine.createSpyObj('NzNotificationService', ['warning']) },
        {
          provide: AppDefineService,
          useValue: jasmine.createSpyObj<AppDefineService>('AppDefineService', ['getPushDefine', 'getAppDynamicDefine', 'getAppDefine'])
        },
        { provide: ChangeDetectorRef, useValue: jasmine.createSpyObj<ChangeDetectorRef>('ChangeDetectorRef', ['detectChanges']) },
        { provide: ALAIN_I18N_TOKEN, useValue: { fanyi: (key: string) => key } as I18NService }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    const fixture = TestBed.createComponent(MonitorDetailComponent);
    const component = fixture.componentInstance;
    component.routeState = 'ready';
    component.monitorId = 1;
    component.app = 'website';
    component.monitor = { id: 1, app: 'website', instance: 'example.com:80', name: 'demo-monitor' } as any;
    component.whichTabIndex = 1;
    component.displayedChartMetrics = [
      { metrics: 'website.summary', metric: 'responseTime', unit: 'ms' },
      { metrics: 'website.summary', metric: 'status', unit: 'count' }
    ] as any[];
    component.chartMetrics = component.displayedChartMetrics as any[];
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.monitor-detail-stage--signals')).not.toBeNull();
    expect(host.querySelector('.monitor-detail-card-grid--history')).not.toBeNull();
  });

  it('should make the detail frame itself own vertical scrolling', async () => {
    const monitorSvc = jasmine.createSpyObj<MonitorService>('MonitorService', [
      'getWarehouseStorageServerStatus',
      'getMonitor',
      'getGrafanaDashboard',
      'getUserFavoritedMetrics',
      'addMetricsFavorite',
      'removeMetricsFavorite'
    ]);
    monitorSvc.getMonitor.and.returnValue(
      of({
        code: 0,
        msg: '',
        data: {
          monitor: { id: 1, app: 'website', instance: 'example.com:80', name: 'demo-monitor' },
          params: [],
          metrics: []
        }
      })
    );
    monitorSvc.getGrafanaDashboard.and.returnValue(of({ code: 0, msg: '', data: null }));
    monitorSvc.getUserFavoritedMetrics.and.returnValue(of({ code: 0, msg: '', data: new Set<string>() }));

    await TestBed.configureTestingModule({
      declarations: [MonitorDetailComponent, MockI18nPipe, MockDatePipe],
      providers: [
        { provide: MonitorService, useValue: monitorSvc },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of({
              get: (name: string) => (name === 'monitorId' ? '1' : null)
            })
          }
        },
        { provide: NzNotificationService, useValue: jasmine.createSpyObj('NzNotificationService', ['warning']) },
        {
          provide: AppDefineService,
          useValue: jasmine.createSpyObj<AppDefineService>('AppDefineService', ['getPushDefine', 'getAppDynamicDefine', 'getAppDefine'])
        },
        { provide: ChangeDetectorRef, useValue: jasmine.createSpyObj<ChangeDetectorRef>('ChangeDetectorRef', ['detectChanges']) },
        { provide: ALAIN_I18N_TOKEN, useValue: { fanyi: (key: string) => key } as I18NService }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    const fixture = TestBed.createComponent(MonitorDetailComponent);
    fixture.detectChanges();

    const frame = fixture.nativeElement.querySelector('.monitor-detail-page-frame') as HTMLElement;
    const style = getComputedStyle(frame);
    expect(style.overflowY).toBe('auto');
    expect(style.touchAction).toBe('pan-y');
  });
});
