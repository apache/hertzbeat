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

import { Component, EventEmitter, Input, Output } from '@angular/core';

import { MonitorRouteState } from '../monitor-route-state.type';

@Component({
  standalone: false,
  selector: 'app-monitor-route-state-panel',
  templateUrl: './monitor-route-state-panel.component.html',
  styleUrls: ['./monitor-route-state-panel.component.less']
})
export class MonitorRouteStatePanelComponent {
  @Input() state: MonitorRouteState = 'loading';
  @Input() title: string = '';
  @Input() description: string = '';
  @Input() showRetry: boolean = false;
  @Input() retryLabel: string = '';

  @Output() readonly retryRequested = new EventEmitter<void>();

  onRetry(): void {
    this.retryRequested.emit();
  }
}
