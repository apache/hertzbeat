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
import { By } from '@angular/platform-browser';

import { MonitorRouteStatePanelComponent } from './monitor-route-state-panel.component';

describe('MonitorRouteStatePanelComponent', () => {
  let component: MonitorRouteStatePanelComponent;
  let fixture: ComponentFixture<MonitorRouteStatePanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MonitorRouteStatePanelComponent]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MonitorRouteStatePanelComponent);
    component = fixture.componentInstance;
  });

  it('should render loading copy with skeleton state', () => {
    component.state = 'loading';
    component.title = '正在加载监控详情';
    component.description = '请稍候，页面正在准备监控内容。';
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('正在加载监控详情');
    expect(host.textContent).toContain('请稍候，页面正在准备监控内容。');
    expect(host.querySelector('.monitor-route-state-panel--loading')).not.toBeNull();
    expect(host.querySelector('.monitor-route-state-panel__stage')).not.toBeNull();
  });

  it('should emit retry when retry action is clicked', () => {
    component.state = 'error';
    component.title = '加载失败';
    component.description = '当前无法加载监控内容。';
    component.showRetry = true;
    component.retryLabel = '重试';
    fixture.detectChanges();

    const retrySpy = jasmine.createSpy('retrySpy');
    component.retryRequested.subscribe(retrySpy);

    fixture.debugElement.query(By.css('button')).nativeElement.click();

    expect(retrySpy).toHaveBeenCalled();
  });
});
