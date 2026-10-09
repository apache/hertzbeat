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

import { ClipboardModule } from '@angular/cdk/clipboard';
import { Component, Pipe, PipeTransform } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { configureShallowTest } from '@testing';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTagModule } from 'ng-zorro-antd/tag';

import { Monitor } from '../../../pojo/Monitor';
import { ToolbarComponent } from '../../../shared/components/toolbar/toolbar.component';
import { MonitorListComponent } from './monitor-list.component';

@Pipe({ name: 'elapsedTime' })
class ElapsedTimeStubPipe implements PipeTransform {
  transform(): string {
    return '';
  }
}

@Component({
  template: `
    <div class="alain-default">
      <header class="alain-default__header">Header</header>
      <aside class="alain-default__aside">Navigation</aside>
      <main class="alain-default__content"><app-monitor-list *ngIf="showMonitorList" /></main>
    </div>
  `,
  // Use the real layout styles: its overflow container otherwise prevents viewport sticking.
  styleUrls: ['../../../layout/basic/basic.component.less']
})
class ScrollingMonitorListHostComponent {
  showMonitorList = true;
}

describe('MonitorList sticky toolbar', () => {
  let component: MonitorListComponent;
  let fixture: ComponentFixture<MonitorListComponent>;

  beforeEach(async () => {
    await configureShallowTest(MonitorListComponent, [
      ClipboardModule,
      FormsModule,
      NzButtonModule,
      NzCheckboxModule,
      NzDropDownModule,
      NzPaginationModule,
      NzSelectModule,
      NzSpinModule,
      NzTagModule
    ])
      .configureTestingModule({ declarations: [ToolbarComponent, ElapsedTimeStubPipe, ScrollingMonitorListHostComponent] })
      .compileComponents();
    spyOn(MonitorListComponent.prototype, 'ngOnInit').and.stub();
    spyOn(MonitorListComponent.prototype, 'getAppIconName').and.returnValue('laptop');
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MonitorListComponent);
    component = fixture.componentInstance;
    component.monitors = [];
    component.tableLoading = false;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should opt only the monitor toolbar into sticky positioning', () => {
    const toolbar: HTMLElement = fixture.nativeElement.querySelector('app-toolbar');
    expect(toolbar.classList.contains('monitor-toolbar')).toBeTrue();
    expect(getComputedStyle(toolbar).position).toBe('sticky');
    expect(getComputedStyle(toolbar).top).toBe('0px');
    const otherToolbar = TestBed.createComponent(ToolbarComponent);
    otherToolbar.detectChanges();
    expect(getComputedStyle(otherToolbar.nativeElement).position).not.toBe('sticky');
    otherToolbar.destroy();
  });

  it('should keep actions visible when the real page layout scrolls', async () => {
    fixture.destroy();
    const page = TestBed.createComponent(ScrollingMonitorListHostComponent);
    page.detectChanges();
    const monitorList = page.debugElement.query(By.directive(MonitorListComponent)).componentInstance as MonitorListComponent;
    monitorList.tableLoading = false;
    monitorList.monitors = Array.from(
      { length: 30 },
      (_, index) =>
        ({
          id: index + 1,
          name: `Monitor ${index + 1}`,
          app: 'website',
          instance: 'localhost',
          status: 1,
          labels: {},
          gmtCreate: 1
        } as Monitor)
    );
    page.detectChanges();
    const toolbar: HTMLElement = page.nativeElement.querySelector('app-toolbar');
    const content: HTMLElement = page.nativeElement.querySelector('.alain-default__content');
    const list: HTMLElement = page.nativeElement.querySelector('.monitor-card-list');
    const originalScroll = window.scrollY;
    const afterLayout = () => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    try {
      window.scrollTo(0, 0);
      await afterLayout();
      const initialTop = toolbar.getBoundingClientRect().top;
      const initialListTop = list.getBoundingClientRect().top;
      expect(initialTop).toBeGreaterThan(0);
      window.scrollTo(0, initialTop + 400);
      await afterLayout();
      expect(window.scrollY).toBeGreaterThan(initialTop);
      expect(Math.abs(toolbar.getBoundingClientRect().top)).toBeLessThan(2);
      expect(list.getBoundingClientRect().top).toBeCloseTo(initialListTop - window.scrollY, 0);

      const refresh = spyOn(monitorList, 'sync');
      toolbar.querySelector<HTMLButtonElement>('button')!.click();
      expect(refresh).toHaveBeenCalled();

      monitorList.onItemChecked(1, true);
      page.detectChanges();
      const enable = spyOn(monitorList, 'onEnableManageMonitors');
      toolbar.querySelector<HTMLButtonElement>('[nz-dropdown]')!.dispatchEvent(new MouseEvent('mouseenter'));
      await new Promise<void>(resolve => setTimeout(resolve, 200));
      page.detectChanges();
      await afterLayout();
      const dropdown = document.querySelector<HTMLElement>('.ant-dropdown');
      expect(dropdown).not.toBeNull();
      const enableButton = Array.from(dropdown!.querySelectorAll<HTMLButtonElement>('button')).find(button =>
        button.textContent?.includes('monitor.enable')
      );
      expect(enableButton).toBeDefined();
      enableButton!.click();
      expect(enable).toHaveBeenCalled();

      content.style.width = '320px';
      content.style.boxSizing = 'border-box';
      page.detectChanges();
      await afterLayout();
      expect(toolbar.scrollWidth).toBeLessThanOrEqual(toolbar.clientWidth + 1);
      expect(Math.abs(toolbar.getBoundingClientRect().top)).toBeLessThan(2);

      content.style.setProperty('--content-background', '#1f1f1f');
      expect(getComputedStyle(toolbar).backgroundColor).toBe('rgb(31, 31, 31)');

      page.componentInstance.showMonitorList = false;
      page.detectChanges();
      expect(getComputedStyle(content).overflow).toBe('auto');
    } finally {
      page.destroy();
      window.scrollTo(0, originalScroll);
    }
  });
});
