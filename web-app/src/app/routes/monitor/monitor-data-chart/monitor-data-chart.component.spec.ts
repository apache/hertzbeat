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

import { NO_ERRORS_SCHEMA, Pipe, PipeTransform } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { I18NService } from '@core';
import { ALAIN_I18N_TOKEN } from '@delon/theme';

import { MonitorService } from '../../../service/monitor.service';
import { ThemeService } from '../../../service/theme.service';
import { getObservabilityThemeTokens } from '../../../shared/observability/observability-theme';
import { MonitorDataChartComponent } from './monitor-data-chart.component';

@Pipe({ name: 'i18n', standalone: false })
class MockI18nPipe implements PipeTransform {
  transform(value: string): string {
    return value;
  }
}

describe('MonitorDataChartComponent', () => {
  function createComponent(theme: string = 'dark-ops'): MonitorDataChartComponent {
    const monitorSvc = jasmine.createSpyObj('MonitorService', ['getMonitorMetricHistoryData']);
    const i18nSvc = {
      fanyi: (key: string) => key
    };
    const themeSvc = {
      getTheme: () => theme
    } as ThemeService;
    const component = new MonitorDataChartComponent(monitorSvc, themeSvc, i18nSvc as any);
    component.app = 'linux';
    component.metrics = 'cpu';
    component.metric = 'usage';
    component.unit = '%';
    return component;
  }

  it('should avoid duplicating the metric title inside the chart canvas', () => {
    const component = createComponent('dark-ops');

    component.ngOnInit();

    expect(component.lineHistoryTheme).toBeTruthy();
    expect(component.lineHistoryTheme.backgroundColor).toBe('transparent');
    expect((component.lineHistoryTheme.title as { text?: string }).text).toBeUndefined();
    expect((component.lineHistoryTheme.title as { subtext?: string }).subtext).toBeUndefined();
    expect((component.lineHistoryTheme.dataZoom as unknown[]).length).toBe(1);
    expect((component.lineHistoryTheme.legend as { bottom?: number }).bottom).toBe(0);
  });

  it('should create a workbench-aligned base chart option for light theme', () => {
    const component = createComponent('light-ops');
    const lightTheme = getObservabilityThemeTokens('light-ops');

    component.ngOnInit();

    expect((component.lineHistoryTheme.xAxis as { axisLabel?: { color?: string } }).axisLabel?.color).toBe(lightTheme.chart.axisLabel);
    expect((component.lineHistoryTheme.yAxis as { axisLabel?: { color?: string } }).axisLabel?.color).toBe(lightTheme.chart.axisLabel);
  });

  it('should keep the history header visually terse', async () => {
    const monitorSvc = jasmine.createSpyObj<MonitorService>('MonitorService', ['getMonitorMetricHistoryData']);
    await TestBed.configureTestingModule({
      declarations: [MonitorDataChartComponent, MockI18nPipe],
      providers: [
        { provide: MonitorService, useValue: monitorSvc },
        { provide: ThemeService, useValue: { getTheme: () => 'dark-ops' } as ThemeService },
        {
          provide: ALAIN_I18N_TOKEN,
          useValue: { fanyi: (key: string) => key } as I18NService
        }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    const fixture = TestBed.createComponent(MonitorDataChartComponent);
    const component = fixture.componentInstance;
    component.app = 'website';
    component.metrics = 'summary';
    component.metric = 'responseTime';
    component.unit = 'ms';
    component.monitorName = 'website-example-com';
    component.ngOnInit();
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.monitor-history-workbench__title')).not.toBeNull();
    expect(host.querySelector('.monitor-history-workbench__badge')).not.toBeNull();
    expect(host.querySelector('.monitor-history-workbench__unit')).not.toBeNull();
    expect(host.querySelector('.monitor-history-workbench__kicker')).toBeNull();
    expect(host.querySelector('.monitor-history-workbench__summary')).toBeNull();
  });
});
