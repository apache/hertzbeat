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
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { of } from 'rxjs';

import { MonitorService } from '../../../service/monitor.service';
import { MonitorDataTableComponent } from './monitor-data-table.component';

@Pipe({
  name: 'i18n',
  standalone: true
})
class MockI18nPipe implements PipeTransform {
  transform(value: string): string {
    return value;
  }
}

describe('MonitorDataChartComponent', () => {
  let component: MonitorDataTableComponent;
  let fixture: ComponentFixture<MonitorDataTableComponent>;
  const mockMonitorService = jasmine.createSpyObj<MonitorService>('MonitorService', ['getMonitorMetricsData']);
  const mockNotificationService = jasmine.createSpyObj<NzNotificationService>('NzNotificationService', ['warning']);
  const mockI18nService = jasmine.createSpyObj<I18NService>('I18NService', ['fanyi']);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MonitorDataTableComponent],
      imports: [MockI18nPipe],
      providers: [
        { provide: MonitorService, useValue: mockMonitorService },
        { provide: NzNotificationService, useValue: mockNotificationService },
        { provide: I18NService, useValue: mockI18nService },
        { provide: ALAIN_I18N_TOKEN, useValue: mockI18nService }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MonitorDataTableComponent);
    component = fixture.componentInstance;
    component.app = 'host';
    component.metrics = 'cpu';
    mockMonitorService.getMonitorMetricsData.and.returnValue(
      of({
        code: 0,
        data: {
          time: '2026-03-31 11:30:00',
          fields: [],
          valueRows: []
        }
      }) as any
    );
    mockI18nService.fanyi.and.callFake((key: string) =>
      key === 'monitor.app.host.metrics.cpu.metric.usage' ? 'CPU 使用率' : key
    );
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should translate metric labels and fall back to field names when keys are missing', () => {
    expect(component.translateMetricLabel('usage')).toBe('CPU 使用率');
    expect(component.translateMetricLabel('idle')).toBe('idle');
    expect(component.translateMetricTitle()).toBe('cpu');
  });

  it('should expose workbench summary items for realtime metric cards', () => {
    mockI18nService.fanyi.and.callFake((key: string) => {
      const translations: Record<string, string> = {
        'monitor.detail.table.summary.fields': '字段',
        'monitor.detail.table.summary.samples': '样本',
        'monitor.detail.table.summary.latest': '采集'
      };
      return translations[key] ?? key;
    });
    component.fields = [{ name: 'usage' }, { name: 'idle' }] as any[];
    component.valueRows = [{ values: [] }, { values: [] }, { values: [] }] as any[];
    component.time = new Date('2026-03-30T12:00:00Z');

    expect(component.workbenchSummaryItems).toEqual([
      { label: '字段', value: '2' },
      { label: '样本', value: '3' },
      { label: '采集', value: '20:00:00' }
    ]);
  });

  it('should expose metric snapshot items from the latest sample row', () => {
    mockI18nService.fanyi.and.callFake((key: string) => {
      const translations: Record<string, string> = {
        'monitor.app.host.metrics.cpu.metric.usage': '使用率',
        'monitor.app.host.metrics.cpu.metric.idle': '空闲',
        'monitor.app.host.metrics.cpu.metric.wait': '等待'
      };
      return translations[key] ?? key;
    });
    component.fields = [
      { name: 'usage', unit: '%' },
      { name: 'idle', unit: '%' },
      { name: 'wait', unit: 'ms' }
    ] as any[];
    component.valueRows = [
      { values: [{ origin: 10 }, { origin: 90 }, { origin: 1 }] },
      { values: [{ origin: 18 }, { origin: 82 }, { origin: 3 }] }
    ] as any[];

    expect(component.metricSnapshotItems).toEqual([
      { label: '使用率', value: '18 %' },
      { label: '空闲', value: '82 %' },
      { label: '等待', value: '3 ms' }
    ]);
  });

  it('should expose shared metric snapshot grid items for the latest sample row', () => {
    mockI18nService.fanyi.and.callFake((key: string) => {
      const translations: Record<string, string> = {
        'monitor.app.host.metrics.cpu.metric.usage': '使用率',
        'monitor.app.host.metrics.cpu.metric.idle': '空闲',
        'monitor.app.host.metrics.cpu.metric.wait': '等待'
      };
      return translations[key] ?? key;
    });
    component.fields = [
      { name: 'usage', unit: '%' },
      { name: 'idle', unit: '%' },
      { name: 'wait', unit: 'ms' }
    ] as any[];
    component.valueRows = [
      { values: [{ origin: 10 }, { origin: 90 }, { origin: 1 }] },
      { values: [{ origin: 18 }, { origin: 82 }, { origin: 3 }] }
    ] as any[];

    expect(component.metricSnapshotMetricItems).toEqual([
      jasmine.objectContaining({ label: '使用率', value: '18 %' }),
      jasmine.objectContaining({ label: '空闲', value: '82 %' }),
      jasmine.objectContaining({ label: '等待', value: '3 ms' })
    ]);
  });

  it('should render monitor overview with compact metadata instead of a nested summary strip', () => {
    component.monitor = {
      id: 1,
      name: 'website-example-com',
      instance: 'example.com:80',
      status: 1,
      intervals: 60,
      labels: {},
      annotations: {},
      description: 'example monitor',
      gmtCreate: '2026-03-30 22:46:51',
      gmtUpdate: '2026-03-30 22:57:34'
    } as any;
    component.monitorId = 1;
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.monitor-basic-meta')).not.toBeNull();
    expect(host.querySelector('.monitor-workbench-summary-strip')).toBeNull();
  });

  it('should render a flat workbench surface when card chrome is disabled', () => {
    component.card = false;
    component.monitor = {
      id: 1,
      name: 'website-example-com',
      instance: 'example.com:80',
      status: 1,
      intervals: 60,
      labels: {},
      annotations: {},
      gmtCreate: '2026-03-30 22:46:51',
      gmtUpdate: '2026-03-30 22:57:34'
    } as any;
    component.monitorId = 1;
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.monitor-workbench-surface--plain')).not.toBeNull();
    expect(host.querySelector('.ant-card')).toBeNull();
  });

  it('should expose shared workbench summary facts for the metric overview strip', () => {
    component.monitor = undefined as any;
    component.fields = [{ name: 'usage' }, { name: 'idle' }] as any[];
    component.valueRows = [{ values: [{ origin: 18 }, { origin: 82 }] }] as any[];
    component.time = '2026-04-04 00:05:00';

    expect(component.workbenchSummaryFactItems).toEqual([
      jasmine.objectContaining({ label: 'monitor.detail.table.summary.fields', value: '2', tone: 'accent' }),
      jasmine.objectContaining({ label: 'monitor.detail.table.summary.samples', value: '1', tone: 'default' }),
      jasmine.objectContaining({ label: 'monitor.detail.table.summary.latest', value: '00:05:00', tone: 'success' })
    ]);
  });
});
