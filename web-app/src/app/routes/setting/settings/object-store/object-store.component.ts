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

import { Component, Inject, OnInit, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { I18NService } from '@core';
import { ALAIN_I18N_TOKEN } from '@delon/theme';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { finalize } from 'rxjs/operators';

import { ObjectStore, ObjectStoreType, ObsConfig } from '../../../../pojo/ObjectStore';
import { GeneralConfigService } from '../../../../service/general-config.service';

const key = 'oss';

@Component({
  selector: 'app-object-store',
  templateUrl: './object-store.component.html',
  styleUrls: ['./object-store.component.less']
})
export class ObjectStoreComponent implements OnInit {
  constructor(
    private configService: GeneralConfigService,
    private notifySvc: NzNotificationService,
    @Inject(ALAIN_I18N_TOKEN) private i18nSvc: I18NService
  ) {}

  loading = true;
  config!: ObjectStore<any>;
  @ViewChild('objectStoreForm', { static: false }) ruleForm: NgForm | undefined;

  ngOnInit(): void {
    this.loadObjectStore();
  }

  loadObjectStore() {
    this.loading = true;
    let configInit$ = this.configService.getGeneralConfig(key).subscribe(
      message => {
        if (message.code === 0) {
          if (message.data) {
            this.config = message.data;
          } else {
            this.config = new ObjectStore();
          }
        } else {
          console.warn(message.msg);
        }
        this.loading = false;
        configInit$.unsubscribe();
      },
      error => {
        console.error(error.msg);
        this.loading = false;
        configInit$.unsubscribe();
      }
    );
  }

  onSaveObjectStore() {
    if (this.ruleForm?.invalid) {
      Object.values(this.ruleForm.controls).forEach(control => {
        if (control.invalid) {
          control.markAsDirty();
          control.updateValueAndValidity({ onlySelf: true });
        }
      });
      return;
    }
    this.loading = true;
    const configOk$ = this.configService
      .saveGeneralConfig(this.config, key)
      .pipe(
        finalize(() => {
          configOk$.unsubscribe();
          this.loading = false;
        })
      )
      .subscribe(
        message => {
          if (message.code === 0) {
            this.notifySvc.success(this.i18nSvc.fanyi('common.notify.apply-success'), '');
          } else {
            this.notifySvc.error(this.i18nSvc.fanyi('common.notify.apply-fail'), message.msg);
          }
        },
        error => {
          this.notifySvc.error(this.i18nSvc.fanyi('common.notify.apply-fail'), error.msg);
        }
      );
  }

  onChange = () => {
    console.log(this.config);
    switch (this.config.type) {
      case ObjectStoreType.FILE:
        this.config.config = {};
        break;
      case ObjectStoreType.OBS:
        this.config.config = new ObsConfig();
        break;
    }
  };

  protected readonly ObjectStoreType = ObjectStoreType;
}
