import { ChangeDetectorRef, Component, Inject, OnInit } from '@angular/core';
import { I18NService } from '@core';
import { ALAIN_I18N_TOKEN } from '@delon/theme';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { finalize } from 'rxjs/operators';

import { NoticeSender } from '../../../../pojo/NoticeSender';
import { NoticeSenderService } from '../../../../service/notice-sender.service';

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
    private noticeSenderSvc: NoticeSenderService,
    @Inject(ALAIN_I18N_TOKEN) private i18nSvc: I18NService
  ) {}

  senders!: NoticeSender[];
  senderServerLoading: boolean = true;
  loading: boolean = false;
  isEmailServerModalVisible: boolean = false;
  emailSender = new NoticeSender();

  ngOnInit(): void {
    this.loadSenderServer();
  }

  loadSenderServer() {
    this.senderServerLoading = true;
    let senderInit$ = this.noticeSenderSvc.getSenders().subscribe(
      message => {
        this.senderServerLoading = false;
        if (message.code === 0) {
          this.senders = message.data;
          this.emailSender = this.senders.filter(s => s.type === 2)[0];
          console.log(this.emailSender.emailUsername);
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
      .newSender(this.emailSender)
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
            this.notifySvc.success(this.i18nSvc.fanyi('common.notify.new-success'), this.i18nSvc.fanyi('alert.notice.sender.next'), {
              nzDuration: 15000
            });
          } else {
            this.notifySvc.error(this.i18nSvc.fanyi('common.notify.new-fail'), message.msg);
          }
        },
        error => {
          this.isEmailServerModalVisible = false;
          this.notifySvc.error(this.i18nSvc.fanyi('common.notify.new-fail'), error.msg);
        }
      );
  }

  protected readonly Boolean = Boolean;
}
