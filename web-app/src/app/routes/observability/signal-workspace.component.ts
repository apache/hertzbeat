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
import { Component, Input, ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'app-signal-workspace',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './signal-workspace.component.html',
  styleUrl: './signal-workspace.component.less',
  encapsulation: ViewEncapsulation.None
})
export class SignalWorkspaceComponent {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() queryLabel = '';
  @Input() showQueryPanel = true;
}
