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
import { I18nPipe } from '@delon/theme';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzResultModule } from 'ng-zorro-antd/result';

/**
 * Guidance rendered by the observability consoles when the current
 * storage backend cannot serve log/trace/metric queries.
 */
@Component({
  selector: 'app-signal-storage-guide',
  standalone: true,
  imports: [I18nPipe, NzButtonModule, NzResultModule],
  template: `
    <nz-result
      nzStatus="info"
      [nzTitle]="'observability.storage.unsupported.title' | i18n"
      [nzSubTitle]="'observability.storage.unsupported.description' | i18n"
    >
      <div nz-result-extra>
        <a nz-button nzType="primary" href="https://hertzbeat.apache.org/docs/start/greptime-init" target="_blank">
          {{ 'observability.storage.unsupported.link' | i18n }}
        </a>
      </div>
    </nz-result>
  `
})
export class SignalStorageGuideComponent {}
