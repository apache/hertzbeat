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

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnDestroy, Optional } from '@angular/core';
import { saveAs } from 'file-saver';
import { NzMessageService } from 'ng-zorro-antd/message';

import { TemplateService } from '../../../service/template.service';

@Component({
  selector: 'market',
  templateUrl: './template-detail.component.html',
  styleUrls: ['./template-detail.component.less']
})
export class TemplateDetailComponent implements OnDestroy {
  constructor(private templateService: TemplateService, private msg: NzMessageService) {}

  page = 1;

  error = '';
  type = 0;
  loading = false;

  count = 0;
  interval$: any;

  ownerId: number = 1;
  templateId: number = 1;
  version: string = 'v1.0.0';

  downloadTemplateNow(): void {
    this.templateService.downloadTemplate(this.ownerId, this.templateId, this.version).subscribe(blob => {
      saveAs(blob, `${this.version}.yml`);
    });
  }

  ngOnDestroy(): void {
    if (this.interval$) {
      clearInterval(this.interval$);
    }
  }

  protected readonly window = window;
}
