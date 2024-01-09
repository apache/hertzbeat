import { ChangeDetectorRef, Component, Inject, OnInit } from '@angular/core';
import { I18NService } from '@core';
import { ALAIN_I18N_TOKEN } from '@delon/theme';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { finalize } from 'rxjs/operators';

import { EmailNoticeSender } from '../../../../pojo/EmailNoticeSender';
import { GeneralConfigService } from '../../../../service/general-config.service';

@Component({
  selector: 'app-message-server',
  templateUrl: './message-server.component.html',
  styleUrls: ['./message-server.component.less']
})
export class MessageServerComponent implements OnInit {
  constructor(
    public msg: NzMessageService,
    private notifySvc: NzNotificationService,
    private cdr: ChangeDetectorRef,
    private noticeSenderSvc: GeneralConfigService,
    @Inject(ALAIN_I18N_TOKEN) private i18nSvc: I18NService
  ) {}

  senders!: EmailNoticeSender[];
  senderServerLoading: boolean = true;
  loading: boolean = false;
  isEmailServerModalVisible: boolean = false;
  emailSender = new EmailNoticeSender();

  ngOnInit(): void {
    this.loadSenderServer();
  }

  loadSenderServer() {
    this.senderServerLoading = true;
    let senderInit$ = this.noticeSenderSvc.getGeneralConfig('email').subscribe(
      message => {
        this.senderServerLoading = false;
        if (message.code === 0) {
          if (message.data) {
            this.emailSender = message.data;
          } else {
            this.emailSender = new EmailNoticeSender();
          }
        } else {
          console.warn(message.msg);
        }
        senderInit$.unsubscribe();
      },
      error => {
        console.error(error.msg);
        this.senderServerLoading = false;
        senderInit$.unsubscribe();
      }
    );
  }

  onConfigEmailServer() {
    this.isEmailServerModalVisible = true;
  }

  onCancelEmailServer() {
    this.isEmailServerModalVisible = false;
  }

  onSaveEmailServer() {
    const modalOk$ = this.noticeSenderSvc
      .saveGeneralConfig(this.emailSender, 'email')
      .pipe(
        finalize(() => {
          modalOk$.unsubscribe();
          this.senderServerLoading = false;
        })
      )
      .subscribe(
        message => {
          if (message.code === 0) {
            this.isEmailServerModalVisible = false;
            this.notifySvc.success(this.i18nSvc.fanyi('common.notify.apply-success'), '');
          } else {
            this.notifySvc.error(this.i18nSvc.fanyi('common.notify.apply-fail'), message.msg);
          }
        },
        error => {
          this.isEmailServerModalVisible = false;
          this.notifySvc.error(this.i18nSvc.fanyi('common.notify.apply-fail'), error.msg);
        }
      );
  }
}
