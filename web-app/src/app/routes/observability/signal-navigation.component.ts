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
    <nav [attr.aria-label]="'observability.navigation.signals' | i18n">
      <a
        nz-button
        [nzType]="active === 'metrics' ? 'primary' : 'default'"
        routerLink="/metrics/manage"
        [queryParams]="context"
        [attr.aria-current]="active === 'metrics' ? 'page' : null"
        >{{ 'observability.metrics.title' | i18n }}</a
      >
      <a
        nz-button
        [nzType]="active === 'logs' ? 'primary' : 'default'"
        routerLink="/log/manage"
        [queryParams]="context"
        [attr.aria-current]="active === 'logs' ? 'page' : null"
        >{{ 'observability.logs.title' | i18n }}</a
      >
      <a
        nz-button
        [nzType]="active === 'traces' ? 'primary' : 'default'"
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
      }
      a + a {
        margin-left: -1px;
      }
    `
  ]
})
export class SignalNavigationComponent {
  @Input() active: SignalKind = 'metrics';
  @Input() context: SignalContext = {};
}
