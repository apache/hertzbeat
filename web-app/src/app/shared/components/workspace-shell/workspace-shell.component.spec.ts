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

import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ALAIN_I18N_TOKEN } from '@delon/theme';

import { WorkspaceShellComponent } from './workspace-shell.component';

@Component({
  standalone: true,
  imports: [WorkspaceShellComponent],
  template: `
    <app-workspace-shell
      kicker="统一工作台"
      title="日志工作台"
      subtitle="共享 chrome 回归"
      [tabs]="tabs"
      [actions]="actions"
      [showRail]="true"
      [allowRailCollapse]="true"
      [(railCollapsed)]="railCollapsed"
      (tabSelected)="lastTab = $event"
      (actionSelected)="lastAction = $event"
    >
      <div workspaceMain>main</div>
      <div workspaceRail>rail</div>
      <div workspaceFooter>footer</div>
    </app-workspace-shell>
  `
})
class TestHostComponent {
  tabs = [
    { key: 'entity', label: '实体', active: false },
    { key: 'logs', label: '日志', active: true }
  ];
  actions = [{ key: 'refresh', label: '刷新', icon: 'sync', tone: 'default' as const }];
  railCollapsed = false;
  lastTab?: string;
  lastAction?: string;
}

@Component({
  standalone: true,
  imports: [WorkspaceShellComponent],
  template: `
    <app-workspace-shell title="默认工作台">
      <div workspaceMain>main</div>
    </app-workspace-shell>
  `
})
class DefaultFooterWorkspaceHostComponent {}

class MockI18nService {
  fanyi(key: string): string {
    const map: Record<string, string> = {
      'workspace.rail.expand': '打开辅助栏',
      'workspace.rail.collapse': '收起辅助栏'
    };
    return map[key] ?? key;
  }
}

describe('WorkspaceShellComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
      providers: [{ provide: ALAIN_I18N_TOKEN, useClass: MockI18nService }]
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should render title, tabs, actions, and both content slots', () => {
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector('.workspace-shell-title')?.textContent).toContain('日志工作台');
    expect(root.querySelectorAll('.workspace-shell-tab').length).toBe(2);
    expect(root.querySelector('.workspace-shell-tab.active')?.textContent).toContain('日志');
    expect(root.querySelector('.workspace-shell-action')?.textContent).toContain('刷新');
    expect(root.querySelector('.workspace-shell-main')?.textContent).toContain('main');
    expect(root.querySelector('.workspace-shell-rail')?.textContent).toContain('rail');
    expect(root.querySelector('.workspace-shell-footer')?.textContent).toContain('footer');
  });

  it('should emit tab, action, and rail collapse changes', () => {
    const root = fixture.nativeElement as HTMLElement;

    (root.querySelectorAll('.workspace-shell-tab')[0] as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(host.lastTab).toBe('entity');

    (root.querySelector('.workspace-shell-action') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(host.lastAction).toBe('refresh');

    (root.querySelector('.workspace-shell-rail-toggle') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(host.railCollapsed).toBeTrue();
  });

  it('should render the rail toggle label from i18n keys', () => {
    const root = fixture.nativeElement as HTMLElement;
    const toggle = root.querySelector('.workspace-shell-rail-toggle') as HTMLButtonElement;

    expect(toggle.textContent).toContain('收起辅助栏');

    toggle.click();
    fixture.detectChanges();

    expect(toggle.textContent).toContain('打开辅助栏');
  });

  it('should render the default platform footer when no workspace footer is projected', () => {
    const defaultFixture = TestBed.createComponent(DefaultFooterWorkspaceHostComponent);
    defaultFixture.detectChanges();

    const root = defaultFixture.nativeElement as HTMLElement;
    expect(root.querySelector('app-platform-copyright-footer')).not.toBeNull();
  });
});
