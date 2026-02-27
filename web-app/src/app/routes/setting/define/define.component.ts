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

import { Component, Inject, OnInit } from '@angular/core';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { I18NService, StartupService } from '@core';
import { ALAIN_I18N_TOKEN } from '@delon/theme';
import { NzConfigService } from 'ng-zorro-antd/core/config';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { finalize } from 'rxjs/operators';

import { AppDefineService } from '../../../service/app-define.service';
import { GeneralConfigService } from '../../../service/general-config.service';
import { ThemeService } from '../../../service/theme.service';

@Component({
  selector: 'app-define',
  templateUrl: './define.component.html',
  styleUrls: ['./define.component.less']
})
export class DefineComponent implements OnInit {
  constructor(
    private appDefineSvc: AppDefineService,
    private nzConfigService: NzConfigService,
    private notifySvc: NzNotificationService,
    private configService: GeneralConfigService,
    private modal: NzModalService,
    private startUpSvc: StartupService,
    private route: ActivatedRoute,
    private router: Router,
    private themeSvc: ThemeService,
    @Inject(ALAIN_I18N_TOKEN) private i18nSvc: I18NService
  ) {}

  menuLoading: boolean = false;
  appMenusArr: any[][] = [];
  appMenusArrByFilter: any[][] = [];
  appLabel: Record<string, string> = {};
  loading = false;
  code: string = '';
  originalCode: string = '';
  dark: boolean = false;
  theme: string = 'default';
  currentApp: any = null;
  saveLoading = false;
  deleteLoading = false;

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((paramMap: ParamMap) => {
      this.currentApp = paramMap.get('app') || undefined;
      if (this.currentApp != undefined) {
        this.loadAppDefineContent(this.currentApp);
      }
    });
    this.theme = this.themeSvc.getTheme() || 'default';
    this.loadMenus();
    this.code = `${this.i18nSvc.fanyi('define.new.code')}\n\n\n\n\n`;
    this.originalCode = this.i18nSvc.fanyi('define.new.code');
  }

  loadMenus() {
    this.menuLoading = true;
    this.appMenusArrByFilter = [];
    const getHierarchy$ = this.appDefineSvc
      .getAppHierarchy(this.i18nSvc.defaultLang)
      .pipe(
        finalize(() => {
          getHierarchy$.unsubscribe();
          this.menuLoading = false;
        })
      )
      .subscribe(
        message => {
          if (message.code === 0) {
            let appMenus: Record<string, any> = {};
            message.data.forEach((app: any) => {
              if (app.value == 'prometheus') {
                return;
              }
              if (app.category == '__system__') {
                return;
              }
              this.appLabel[app.value] = app.label;
              let menus = appMenus[app.category];
              if (menus == undefined) {
                menus = { label: this.renderCategoryName(app.category), child: [app] };
              } else {
                menus.child.push(app);
              }
              appMenus[app.category] = menus;
            });
            this.appMenusArr = Object.entries(appMenus);
            this.appMenusArr.sort((a, b) => {
              return b[1].length - a[1].length;
            });
          } else {
            console.warn(message.msg);
          }
        },
        error => {
          console.warn(error.msg);
        }
      );
  }

  onMenuSelectedChanged(selected: string) {
    this.router.navigateByUrl(`/setting/define?app=${selected}`);
  }

  loadAppDefineContent(app: any) {
    this.loading = true;
    this.currentApp = app;
    const getAppYml$ = this.appDefineSvc
      .getAppDefineYmlContent(app)
      .pipe(
        finalize(() => {
          getAppYml$.unsubscribe();
          this.loading = false;
        })
      )
      .subscribe(
        message => {
          if (message.code === 0) {
            this.originalCode = message.data;
            this.code = message.data;
          } else {
            console.warn(message.msg);
          }
        },
        error => {
          console.warn(error.msg);
        }
      );
  }

  onDarkModeChange(dark: boolean): void {
    this.dark = dark;
    const defaultEditorOption = this.nzConfigService.getConfigForComponent('codeEditor')?.defaultEditorOption || {};
    this.nzConfigService.set('codeEditor', {
      defaultEditorOption: {
        ...defaultEditorOption,
        theme: dark ? 'vs-dark' : 'vs'
      }
    });
  }

  onSaveAndApply() {
    if (this.code == undefined || this.code === '' || this.code == null) {
      this.notifySvc.warning(this.i18nSvc.fanyi('define.save-apply.no-code'), '');
      return;
    }
    this.modal.confirm({
      nzTitle: this.i18nSvc.fanyi('define.save-apply.confirm'),
      nzOkText: this.i18nSvc.fanyi('common.button.ok'),
      nzCancelText: this.i18nSvc.fanyi('common.button.cancel'),
      nzOkDanger: true,
      nzOkType: 'primary',
      nzClosable: false,
      nzOnOk: () => this.saveAndApply()
    });
  }

  onDeleteDefineYml() {
    if (this.currentApp == null) {
      return;
    }
    this.modal.confirm({
      nzTitle: this.i18nSvc.fanyi('define.delete.confirm', { app: this.appLabel[this.currentApp] }),
      nzOkText: this.i18nSvc.fanyi('common.button.ok'),
      nzCancelText: this.i18nSvc.fanyi('common.button.cancel'),
      nzOkDanger: true,
      nzOkType: 'primary',
      nzClosable: false,
      nzOnOk: () => this.deleteYml()
    });
  }

  onNewMonitorDefine() {
    this.currentApp = null;
    this.code = `${this.i18nSvc.fanyi('define.new.code')}\n\n\n\n\n`;
    this.originalCode = this.i18nSvc.fanyi('define.new.code');
  }

  saveAndApply() {
    this.saveLoading = true;
    const saveDefine$ = this.appDefineSvc
      .newAppDefineYmlContent(this.code, this.currentApp == null)
      .pipe(
        finalize(() => {
          saveDefine$.unsubscribe();
          this.saveLoading = false;
        })
      )
      .subscribe(
        message => {
          if (message.code === 0) {
            this.loadMenus();
            if (this.currentApp != null) {
              this.loadAppDefineContent(this.currentApp);
            }
            this.startUpSvc.loadConfigResourceViaHttp().subscribe(() => {});
            this.notifySvc.success(this.i18nSvc.fanyi('common.notify.apply-success'), '');
          } else {
            this.notifySvc.error(this.i18nSvc.fanyi('common.notify.apply-fail'), message.msg);
          }
        },
        error => {
          console.warn(error.msg);
        }
      );
  }

  deleteYml() {
    this.deleteLoading = true;
    const saveDefine$ = this.appDefineSvc
      .deleteAppDefine(this.currentApp)
      .pipe(
        finalize(() => {
          saveDefine$.unsubscribe();
          this.deleteLoading = false;
        })
      )
      .subscribe(
        message => {
          if (message.code === 0) {
            this.currentApp = null;
            this.code = `${this.i18nSvc.fanyi('define.new.code')}\n\n\n\n\n`;
            this.originalCode = this.i18nSvc.fanyi('define.new.code');
            this.loadMenus();
            this.startUpSvc.loadConfigResourceViaHttp().subscribe(() => {});
            this.notifySvc.success(this.i18nSvc.fanyi('common.notify.delete-success'), '');
          } else {
            this.notifySvc.error(this.i18nSvc.fanyi('common.notify.delete-fail'), message.msg);
          }
        },
        error => {
          console.warn(error.msg);
        }
      );
  }

  updateAppTemplateConfig(app: string, hide: boolean) {
    this.saveLoading = true;
    const updateAppTemplateConfig$ = this.configService
      .updateAppTemplateConfig({ hide: hide }, app)
      .pipe(
        finalize(() => {
          updateAppTemplateConfig$.unsubscribe();
          this.saveLoading = false;
        })
      )
      .subscribe(
        message => {
          if (message.code === 0) {
            this.loadMenus();
            this.startUpSvc.loadConfigResourceViaHttp().subscribe(() => {});
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

  renderCategoryName(category: string): string {
    let label = this.i18nSvc.fanyi(`menu.monitor.${category}`);
    if (label == `menu.monitor.${category}`) {
      return category.toUpperCase();
    } else {
      return label;
    }
  }
}
