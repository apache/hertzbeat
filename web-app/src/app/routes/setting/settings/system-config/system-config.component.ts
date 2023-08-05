import { ChangeDetectorRef, Component, Inject, OnInit } from '@angular/core';
import { I18NService } from '@core';
import { ALAIN_I18N_TOKEN } from '@delon/theme';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { finalize } from 'rxjs/operators';

import { EmailNoticeSender } from '../../../../pojo/EmailNoticeSender';
import { SystemConfig } from '../../../../pojo/SystemConfig';
import { GeneralConfigService } from '../../../../service/general-config.service';

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
    @Inject(ALAIN_I18N_TOKEN) private i18nSvc: I18NService
  ) {}

  loading = true;
  config!: SystemConfig | undefined;

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
