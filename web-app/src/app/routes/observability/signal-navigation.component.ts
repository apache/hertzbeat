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
import { RouterModule } from '@angular/router';
import { I18nPipe } from '@delon/theme';
import { SharedModule } from '@shared';

import { SignalContext } from '../../service/observability.service';

type SignalKind = 'metrics' | 'logs' | 'traces';

@Component({
  selector: 'app-signal-navigation',
  standalone: true,
  imports: [I18nPipe, RouterModule, SharedModule],
  template: `
    <nav class="signal-switch" [attr.aria-label]="'observability.navigation.signals' | i18n">
      <a
        nz-button
        nzType="text"
        class="signal-switch__item"
        [class.signal-switch__item--active]="active === 'metrics'"
        routerLink="/metrics/manage"
        [queryParams]="context"
        [attr.aria-current]="active === 'metrics' ? 'page' : null"
        >{{ 'observability.metrics.title' | i18n }}</a
      >
      <a
        nz-button
        nzType="text"
        class="signal-switch__item"
        [class.signal-switch__item--active]="active === 'logs'"
        routerLink="/log/manage"
        [queryParams]="context"
        [attr.aria-current]="active === 'logs' ? 'page' : null"
        >{{ 'observability.logs.title' | i18n }}</a
      >
      <a
        nz-button
        nzType="text"
        class="signal-switch__item"
        [class.signal-switch__item--active]="active === 'traces'"
        routerLink="/trace/manage"
        [queryParams]="context"
        [attr.aria-current]="active === 'traces' ? 'page' : null"
        >{{ 'observability.traces.title' | i18n }}</a
      >
    </nav>
  `,
  styles: [
    `
      nav {
        display: flex;
        gap: 2px;
        padding: 3px;
        background: rgba(63, 81, 181, 0.06);
        border: 1px solid rgba(63, 81, 181, 0.12);
        border-radius: 6px;
      }
      .signal-switch__item {
        min-width: 64px;
        border: 0;
        box-shadow: none;
      }
      .signal-switch__item--active {
        color: #fff;
        background: #3f51b5;
      }
      .signal-switch__item--active:hover,
      .signal-switch__item--active:focus {
        color: #fff;
        background: #34449c;
      }
    `
  ]
})
export class SignalNavigationComponent {
  @Input() active: SignalKind = 'metrics';
  @Input() context: SignalContext = {};
}
