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

import { Component, Input } from '@angular/core';
import { ComponentFixture, fakeAsync, flush, TestBed, tick } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { configureShallowTest } from '@testing';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCollapseModule } from 'ng-zorro-antd/collapse';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTabsModule, NzTabSetComponent } from 'ng-zorro-antd/tabs';
import { Subject } from 'rxjs';

import { AppDefineService } from '../../../service/app-define.service';
import { MonitorService } from '../../../service/monitor.service';
import { SafePipe } from '../../SafePipe';
import { MonitorDetailComponent } from './monitor-detail.component';

@Component({ selector: 'app-monitor-data-chart', template: '<div class="chart-stub">{{ metrics }}/{{ metric }}</div>' })
class HistoryChartStubComponent {
  @Input() app = '';
  @Input() metrics = '';
  @Input() metric = '';
  @Input() unit?: string;
  @Input() monitorId?: number;
  @Input() instance?: string;
  @Input() monitorName?: string;
}

describe('Monitor history metric groups', () => {
  let fixture: ComponentFixture<MonitorDetailComponent>;
  let component: MonitorDetailComponent;
  let monitorSvc: jasmine.SpyObj<MonitorService>;
  let appDefineSvc: jasmine.SpyObj<AppDefineService>;
  let notifySvc: jasmine.SpyObj<NzNotificationService>;

  const group = (name: string, count: number, visible = true) => ({
    name,
    visible,
    fields: Array.from({ length: count }, (_, index) => ({ field: `value${index}`, type: 0, unit: '%' }))
  });

  function loadDefinitions(metrics = [group('cpu', 2), group('memory', 2)], refresh = false): void {
    const warehouse = new Subject<any>();
    const definitions = new Subject<any>();
    monitorSvc.getWarehouseStorageServerStatus.and.returnValue(warehouse.asObservable());
    appDefineSvc.getAppDefine.and.returnValue(definitions.asObservable());
    appDefineSvc.getAppDynamicDefine.and.returnValue(definitions.asObservable());
    if (refresh) {
      component.refreshMetrics();
    } else {
      component.loadMetricChart();
    }
    warehouse.next({ code: 0 });
    warehouse.complete();
    definitions.next({ code: 0, data: { metrics } });
    definitions.complete();
    fixture.detectChanges();
  }

  function showHistory(): void {
    const tabs = fixture.debugElement.query(By.directive(NzTabSetComponent)).componentInstance as NzTabSetComponent;
    tabs.nzSelectedIndex = 1;
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
  }

  function uiTest(test: () => void): () => void {
    return fakeAsync(() => {
      try {
        test();
      } finally {
        fixture.destroy();
        flush();
      }
    });
  }

  beforeEach(async () => {
    monitorSvc = jasmine.createSpyObj('MonitorService', ['getWarehouseStorageServerStatus']);
    appDefineSvc = jasmine.createSpyObj('AppDefineService', ['getAppDefine', 'getAppDynamicDefine']);
    notifySvc = jasmine.createSpyObj('NzNotificationService', ['warning']);
    await configureShallowTest(MonitorDetailComponent, [
      FormsModule,
      NzButtonModule,
      NzCollapseModule,
      NzDropDownModule,
      NzEmptyModule,
      NzSelectModule,
      NzSpinModule,
      NzTabsModule,
      SafePipe
    ])
      .configureTestingModule({
        declarations: [HistoryChartStubComponent],
        providers: [
          { provide: MonitorService, useValue: monitorSvc },
          { provide: AppDefineService, useValue: appDefineSvc },
          { provide: NzNotificationService, useValue: notifySvc }
        ]
      })
      .compileComponents();
    spyOn(MonitorDetailComponent.prototype, 'ngOnInit').and.stub();
    fixture = TestBed.createComponent(MonitorDetailComponent);
    component = fixture.componentInstance;
    component.app = 'linux';
    component.monitorId = 1;
    component.monitor.name = 'Local monitor';
    component.monitor.instance = 'localhost';
    spyOn<any>(component, 'setupChartIntersectionObserver').and.stub();
    fixture.detectChanges();
  });

  it(
    'should render metric-group panels and a group filter on the history tab',
    uiTest(() => {
      loadDefinitions();
      showHistory();
      expect(fixture.nativeElement.querySelectorAll('.history-chart-group').length).toBe(2);
      expect(fixture.nativeElement.querySelector('.history-group-filter')).not.toBeNull();
      expect(fixture.debugElement.queryAll(By.directive(HistoryChartStubComponent)).length).toBe(4);
    })
  );

  it(
    'should retain the six-chart lazy page and existing chart instances when loading more',
    uiTest(() => {
      loadDefinitions([group('cpu', 8), group('memory', 3)]);
      showHistory();
      expect(component.displayedChartMetrics.length).toBe(6);
      expect(component.hasMoreCharts).toBeTrue();
      const firstChart = fixture.debugElement.query(By.directive(HistoryChartStubComponent)).componentInstance;
      const firstDefinition = component.displayedChartMetrics[0];
      component['loadMoreCharts']();
      fixture.detectChanges();
      expect(component.displayedChartMetrics.length).toBe(11);
      expect(component.hasMoreCharts).toBeFalse();
      expect(component.displayedChartGroups.map(item => item.name)).toEqual(['cpu', 'memory']);
      expect(component.displayedChartMetrics[0]).toBe(firstDefinition);
      expect(fixture.debugElement.query(By.directive(HistoryChartStubComponent)).componentInstance).toBe(firstChart);
    })
  );

  it(
    'should filter whole groups without changing definitions or favorites',
    uiTest(() => {
      loadDefinitions([group('cpu', 8), group('memory', 3)]);
      const definitions = component.chartMetrics;
      const favorites = [{ metrics: 'cpu', metric: 'value0', unit: '%' }];
      component.favoriteMetricsSet.add('cpu');
      component.favoriteChartMetrics = favorites;
      component.displayedFavoriteChartMetrics = favorites;
      component.onChartGroupsChanged(['memory', 'unknown', 'memory']);
      showHistory();
      expect(component.selectedChartGroups).toEqual(['memory']);
      expect(component.displayedChartMetrics.length).toBe(3);
      expect(component.displayedChartMetrics.every(chart => chart.metrics === 'memory')).toBeTrue();
      expect(component.hasMoreCharts).toBeFalse();
      expect(component.chartMetrics).toBe(definitions);
      expect(component.favoriteChartMetrics).toBe(favorites);
      expect(component.displayedFavoriteChartMetrics).toBe(favorites);
      expect(component.favoriteMetricsSet.has('cpu')).toBeTrue();
      expect(fixture.nativeElement.querySelectorAll('.history-chart-group').length).toBe(1);
    })
  );

  it(
    'should show an empty state and stop paging when no groups are selected',
    uiTest(() => {
      loadDefinitions();
      component.onChartGroupsChanged([]);
      showHistory();
      expect(component.displayedChartMetrics).toEqual([]);
      expect(component.displayedChartGroups).toEqual([]);
      expect(component.hasMoreCharts).toBeFalse();
      component['loadMoreCharts']();
      expect(component.displayedChartMetrics).toEqual([]);
      expect(fixture.nativeElement.querySelector('.history-group-empty')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('#charts-load-sentinel')).toBeNull();
    })
  );

  it(
    'should collapse a whole group via its header and load the next group instead',
    uiTest(() => {
      loadDefinitions([group('cpu', 8), group('memory', 3)]);
      showHistory();
      fixture.nativeElement.querySelector('.history-chart-group .ant-collapse-header').click();
      fixture.detectChanges();
      tick(300);
      expect(component.collapsedChartGroups.has('cpu')).toBeTrue();
      expect(component.displayedChartMetrics.length).toBe(3);
      expect(component.displayedChartMetrics.every(chart => chart.metrics === 'memory')).toBeTrue();
      expect(component.hasMoreCharts).toBeFalse();
      expect(fixture.debugElement.queryAll(By.directive(HistoryChartStubComponent)).length).toBe(3);

      component.onChartGroupsChanged(['memory']);
      component.onChartGroupsChanged(['cpu', 'memory']);
      expect(component.collapsedChartGroups.has('cpu')).toBeTrue();
      expect(component.displayedChartGroups.map(item => item.name)).toEqual(['cpu', 'memory']);
    })
  );

  it(
    'should expand and collapse all selected groups from the toolbar without losing selection',
    uiTest(() => {
      loadDefinitions();
      showHistory();
      const buttons = fixture.nativeElement.querySelectorAll('.history-chart-controls button');
      buttons[1].click();
      fixture.detectChanges();
      tick(300);
      expect(component.selectedChartGroups).toEqual(['cpu', 'memory']);
      expect(component.collapsedChartGroups.size).toBe(2);
      expect(component.displayedChartMetrics).toEqual([]);
      expect(component.hasMoreCharts).toBeFalse();
      expect(fixture.nativeElement.querySelectorAll('.history-chart-group').length).toBe(2);
      expect(fixture.debugElement.queryAll(By.directive(HistoryChartStubComponent)).length).toBe(0);
      buttons[0].click();
      fixture.detectChanges();
      tick(300);
      expect(component.collapsedChartGroups.size).toBe(0);
      expect(fixture.debugElement.queryAll(By.directive(HistoryChartStubComponent)).length).toBe(4);
    })
  );

  it(
    'should preserve a custom filter and collapsed groups across refresh and new definitions',
    uiTest(() => {
      loadDefinitions();
      component.onChartGroupsChanged(['memory']);
      component.onChartGroupActiveChange('memory', false);
      loadDefinitions([group('cpu', 2), group('memory', 5), group('disk', 1)]);
      expect(component.chartMetricGroups.map(item => item.name)).toEqual(['cpu', 'memory', 'disk']);
      expect(component.selectedChartGroups).toEqual(['memory']);
      expect(component.collapsedChartGroups.has('memory')).toBeTrue();
      expect(component.displayedChartMetrics).toEqual([]);
      expect(component.displayedChartGroups.map(item => item.name)).toEqual(['memory']);
    })
  );

  it(
    'should include new groups when all were selected but preserve an explicitly empty selection',
    uiTest(() => {
      loadDefinitions();
      loadDefinitions([group('cpu', 2), group('memory', 2), group('disk', 1)]);
      expect(component.selectedChartGroups).toEqual(['cpu', 'memory', 'disk']);
      component.onChartGroupsChanged([]);
      loadDefinitions([group('cpu', 2), group('memory', 2), group('disk', 1), group('network', 1)]);
      expect(component.selectedChartGroups).toEqual([]);
      expect(component.displayedChartMetrics).toEqual([]);
    })
  );

  it(
    'should prune disappeared groups and reset view preferences for a different monitor',
    uiTest(() => {
      loadDefinitions();
      component.onChartGroupsChanged(['memory']);
      component.onChartGroupActiveChange('memory', false);
      loadDefinitions([group('cpu', 2)]);
      expect(component.selectedChartGroups).toEqual([]);
      expect(component.collapsedChartGroups.size).toBe(0);
      component.monitorId = 2;
      loadDefinitions([group('cpu', 2), group('disk', 3)]);
      expect(component.selectedChartGroups).toEqual(['cpu', 'disk']);
      expect(component.displayedChartMetrics.length).toBe(5);
    })
  );

  it(
    'should recreate chart instances on refresh so their data requests still run',
    uiTest(() => {
      loadDefinitions();
      showHistory();
      const firstChart = fixture.debugElement.query(By.directive(HistoryChartStubComponent)).componentInstance;
      const firstDefinition = component.displayedChartMetrics[0];
      loadDefinitions([group('cpu', 2), group('memory', 2)], true);
      tick();
      fixture.detectChanges();
      expect(component.displayedChartMetrics[0]).not.toBe(firstDefinition);
      expect(fixture.debugElement.query(By.directive(HistoryChartStubComponent)).componentInstance).not.toBe(firstChart);
    })
  );

  it(
    'should keep only visible numeric fields and support Prometheus dynamic definitions',
    uiTest(() => {
      component.app = 'prometheus';
      loadDefinitions([
        {
          ...group('cpu', 1),
          fields: [
            { field: 'model', type: 1, unit: '' },
            { field: 'usage', type: 0, unit: '%' }
          ]
        },
        group('hidden', 2, false)
      ]);
      expect(appDefineSvc.getAppDynamicDefine).toHaveBeenCalledWith(1);
      expect(appDefineSvc.getAppDefine).not.toHaveBeenCalled();
      expect(component.chartMetrics).toEqual([{ metrics: 'cpu', metric: 'usage', unit: '%' }]);
    })
  );

  it(
    'should keep the existing unavailable-history notification',
    uiTest(() => {
      const warehouse = new Subject<any>();
      monitorSvc.getWarehouseStorageServerStatus.and.returnValue(warehouse.asObservable());
      component.loadMetricChart();
      warehouse.next({ code: 1, msg: 'Storage unavailable' });
      expect(notifySvc.warning).toHaveBeenCalledWith('monitor.detail.time-series.unavailable', 'Storage unavailable');
      expect(component.isSpinning).toBeFalse();
      expect(appDefineSvc.getAppDefine).not.toHaveBeenCalled();
    })
  );

  it(
    'should not start stale observers after clearing the filter or destroying the view',
    uiTest(() => {
      loadDefinitions([group('cpu', 18)]);
      const createObserver = spyOn(window, 'IntersectionObserver').and.callThrough();
      (component['setupChartIntersectionObserver'] as jasmine.Spy).and.callThrough();
      component.onChartGroupsChanged(['cpu']);
      component.onChartGroupsChanged([]);
      tick(1000);
      expect(createObserver).not.toHaveBeenCalled();
      component.onChartGroupsChanged(['cpu']);
      fixture.destroy();
      tick(1000);
      expect(createObserver).not.toHaveBeenCalled();
    })
  );

  it(
    'should page from observer callbacks and ignore callbacks after switching tabs',
    uiTest(() => {
      loadDefinitions([group('cpu', 14)]);
      showHistory();
      let callback!: IntersectionObserverCallback;
      const observer = {
        observe: jasmine.createSpy('observe'),
        disconnect: jasmine.createSpy('disconnect'),
        unobserve: jasmine.createSpy('unobserve'),
        takeRecords: () => [],
        root: null,
        rootMargin: '',
        thresholds: [0]
      } as IntersectionObserver;
      spyOn(window, 'IntersectionObserver').and.callFake(function (cb) {
        callback = cb;
        return observer;
      });
      (component['setupChartIntersectionObserver'] as jasmine.Spy).and.callThrough();
      component.onChartGroupsChanged(['cpu']);
      tick();
      expect(observer.observe).toHaveBeenCalled();
      const entry = { isIntersecting: true } as IntersectionObserverEntry;
      callback([entry], observer);
      expect(component.displayedChartMetrics.length).toBe(12);
      component.whichTabIndex = 0;
      callback([entry], observer);
      expect(component.displayedChartMetrics.length).toBe(12);
      component.whichTabIndex = 1;
      callback([entry], observer);
      expect(component.displayedChartMetrics.length).toBe(14);
      expect(component.hasMoreCharts).toBeFalse();
    })
  );
});
