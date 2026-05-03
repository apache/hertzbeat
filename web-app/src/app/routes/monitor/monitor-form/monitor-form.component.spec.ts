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
import { NO_ERRORS_SCHEMA, Pipe, PipeTransform } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { I18NService } from '@core';
import { ALAIN_I18N_TOKEN } from '@delon/theme';
import { NzNotificationService } from 'ng-zorro-antd/notification';

import { MonitorFormComponent } from './monitor-form.component';

@Pipe({ name: 'i18n', standalone: false })
class MockI18nPipe implements PipeTransform {
  transform(value: string): string {
    return value;
  }
}

describe('MonitorFormComponent', () => {
  let component: MonitorFormComponent;
  let fixture: ComponentFixture<MonitorFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormsModule],
      declarations: [MonitorFormComponent, MockI18nPipe],
      providers: [
        { provide: NzNotificationService, useValue: jasmine.createSpyObj('NzNotificationService', ['error', 'info']) },
        { provide: ALAIN_I18N_TOKEN, useValue: { fanyi: (key: string) => key } as I18NService }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MonitorFormComponent);
    component = fixture.componentInstance;
    component.monitor = { scheduleType: 'interval', scrape: 'static' } as any;
    component.loading = false;
    component.params = [];
    component.advancedParams = [];
    component.paramDefines = [];
    component.advancedParamDefines = [];
    component.sdParams = [];
    component.sdDefines = [];
    component.labelKeys = [];
    component.labelMap = {};
    component.labelIsCustom = true;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render form inside the workbench shell stage', () => {
    const host = fixture.nativeElement as HTMLElement;

    expect(host.querySelector('.monitor-form-shell')).not.toBeNull();
    expect(host.querySelector('.monitor-form-shell__header')).not.toBeNull();
    expect(host.querySelector('.monitor-form-shell__hero')).toBeNull();
    expect(host.querySelector('.monitor-form-shell__stage')).not.toBeNull();
    expect(host.querySelector('.monitor-form-shell__stage--plain')).not.toBeNull();
    expect(host.querySelector('.monitor-form-layout--wide')).not.toBeNull();
    expect(host.querySelector('.monitor-form-layout__body')).not.toBeNull();
  });

  it('should render a centered action shell for form buttons', () => {
    const host = fixture.nativeElement as HTMLElement;

    expect(host.querySelector('.monitor-form-layout__actions-shell')).not.toBeNull();
    expect(host.querySelector('.monitor-form-layout__actions-shell--control-zone')).not.toBeNull();
    expect(host.querySelector('.monitor-form-layout__actions-group')).not.toBeNull();
  });

  it('should render loading skeleton instead of an empty form when loading', () => {
    component.loading = true;
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.monitor-form-skeleton')).not.toBeNull();
    expect(host.querySelector('.monitor-form-shell__stage')).not.toBeNull();
  });

  it('should hide the inner hero when embedded in a page shell', () => {
    component.embedded = true;
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.monitor-form-shell--embedded')).not.toBeNull();
    expect(host.querySelector('.monitor-form-shell__header')).toBeNull();
  });

  it('should default interval schedule to 60 seconds when intervals is missing', () => {
    component.monitor = { scheduleType: 'interval', scrape: 'static', intervals: undefined } as any;

    component.ngOnChanges({
      monitor: {
        currentValue: component.monitor,
        previousValue: null,
        firstChange: true,
        isFirstChange: () => true
      }
    });

    expect(component.monitor.intervals).toBe(60);
  });
});
