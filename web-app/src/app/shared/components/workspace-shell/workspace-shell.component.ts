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

import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Inject, Input, Output } from '@angular/core';
import { I18NService } from '@core';
import { ALAIN_I18N_TOKEN } from '@delon/theme';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { PlatformCopyrightFooterComponent } from '../platform-copyright-footer/platform-copyright-footer.component';

export interface WorkspaceShellTab {
  key: string;
  label: string;
  active?: boolean;
  disabled?: boolean;
  badge?: string;
}

export interface WorkspaceShellAction {
  key: string;
  label: string;
  icon?: string;
  tone?: 'primary' | 'default' | 'danger' | 'link';
  disabled?: boolean;
}

@Component({
  selector: 'app-workspace-shell',
  standalone: true,
  imports: [CommonModule, NzButtonModule, PlatformCopyrightFooterComponent],
  templateUrl: './workspace-shell.component.html',
  styleUrl: './workspace-shell.component.less'
})
export class WorkspaceShellComponent {
  @Input() kicker?: string;
  @Input({ required: true }) title = '';
  @Input() subtitle?: string;
  @Input() tabs: WorkspaceShellTab[] = [];
  @Input() actions: WorkspaceShellAction[] = [];
  @Input() showRail = false;
  @Input() allowRailCollapse = false;
  @Input() railCollapsed = false;
  @Input() showFooter = true;

  @Output() readonly tabSelected = new EventEmitter<string>();
  @Output() readonly actionSelected = new EventEmitter<string>();
  @Output() readonly railCollapsedChange = new EventEmitter<boolean>();

  constructor(@Inject(ALAIN_I18N_TOKEN) private readonly i18nSvc: I18NService) {}

  get showExpandedRail(): boolean {
    return this.showRail && !this.railCollapsed;
  }

  getRailToggleLabel(): string {
    return this.i18nSvc.fanyi(this.railCollapsed ? 'workspace.rail.expand' : 'workspace.rail.collapse');
  }

  selectTab(tab: WorkspaceShellTab): void {
    if (!tab.disabled) {
      this.tabSelected.emit(tab.key);
    }
  }

  selectAction(action: WorkspaceShellAction): void {
    if (!action.disabled) {
      this.actionSelected.emit(action.key);
    }
  }

  toggleRail(): void {
    const nextValue = !this.railCollapsed;
    this.railCollapsed = nextValue;
    this.railCollapsedChange.emit(nextValue);
  }

  trackByKey(_index: number, item: { key: string }): string {
    return item.key;
  }
}
