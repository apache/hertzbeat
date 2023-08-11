import { Component, Inject, OnInit } from '@angular/core';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { I18NService, StartupService } from '@core';
import { ALAIN_I18N_TOKEN } from '@delon/theme';
import { NzConfigService } from 'ng-zorro-antd/core/config';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { finalize } from 'rxjs/operators';

import { AppDefineService } from '../../../service/app-define.service';

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
    private modal: NzModalService,
    private startUpSvc: StartupService,
    private route: ActivatedRoute,
    private router: Router,
    @Inject(ALAIN_I18N_TOKEN) private i18nSvc: I18NService
  ) {}

  appMenus: Record<string, any[]> = {};
  appLabel: Record<string, string> = {};
  loading = false;
  code: string = '';
  originalCode: string = '';
  dark: boolean = true;
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
    this.loadMenus();
    this.code = `${this.i18nSvc.fanyi('define.new.code')}\n\n\n\n\n`;
    this.originalCode = this.i18nSvc.fanyi('define.new.code');
  }

  loadMenus() {
    const getHierarchy$ = this.appDefineSvc
      .getAppHierarchy(this.i18nSvc.defaultLang)
      .pipe(
        finalize(() => {
          getHierarchy$.unsubscribe();
        })
      )
      .subscribe(
        message => {
          if (message.code === 0) {
            this.appMenus = {};
            message.data.forEach((app: any) => {
              if (this.currentApp != null && this.currentApp === app.value) {
                app.selected = true;
              } else {
                app.selected = false;
              }
              this.appLabel[app.value] = app.label;
              let menus = this.appMenus[app.category];
              if (menus == undefined) {
                menus = [app];
              } else {
                menus.push(app);
              }
              this.appMenus[app.category] = menus;
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
}
