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

import { DOCUMENT } from '@angular/common';
import { ChangeDetectorRef, Component, Inject, OnInit } from '@angular/core';
import { I18NService } from '@core';
import { ALAIN_I18N_TOKEN, SettingsService } from '@delon/theme';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { finalize } from 'rxjs/operators';

import { SystemConfig } from '../../../../pojo/SystemConfig';
import { GeneralConfigService } from '../../../../service/general-config.service';
import { ThemeService } from '../../../../service/theme.service';

@Component({
  selector: 'app-system-config',
  templateUrl: './system-config.component.html',
  styleUrls: ['./system-config.component.less']
})
export class SystemConfigComponent implements OnInit {
  constructor(
    private cdr: ChangeDetectorRef,
    private notifySvc: NzNotificationService,
    private configService: GeneralConfigService,
    private settings: SettingsService,
    private themeService: ThemeService,
    @Inject(DOCUMENT) private doc: any,
    @Inject(ALAIN_I18N_TOKEN) private i18nSvc: I18NService
  ) {}

  loading = true;
  config!: SystemConfig;

  ngOnInit(): void {
    this.loadSystemConfig();
  }

  loadSystemConfig() {
    this.loading = true;
    let configInit$ = this.configService.getGeneralConfig('system').subscribe(
      message => {
        if (message.code === 0) {
          if (message.data) {
            this.config = message.data;
            this.config.theme = this.themeService.getTheme() || 'default';
          } else {
            this.config = new SystemConfig();
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

  onSaveSystemConfig() {
    this.loading = true;
    const configOk$ = this.configService
      .saveGeneralConfig(this.config, 'system')
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
            let language = this.config.locale.replace('_', '-');
            this.i18nSvc.loadLangData(language).subscribe(res => {
              this.i18nSvc.use(language, res);
              this.settings.setLayout('lang', language);
              this.themeService.setTheme(this.config.theme);
              setTimeout(() => this.doc.location.reload());
            });
          } else {
            this.notifySvc.error(this.i18nSvc.fanyi('common.notify.apply-fail'), message.msg);
          }
        },
        error => {
          this.notifySvc.error(this.i18nSvc.fanyi('common.notify.apply-fail'), error.msg);
        }
      );
  }
}
