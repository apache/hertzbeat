import { ChangeDetectorRef, Component, Inject, OnInit } from '@angular/core';
import { I18NService } from '@core';
import { ALAIN_I18N_TOKEN } from '@delon/theme';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzNotificationService } from 'ng-zorro-antd/notification';

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
  sender: NoticeSender = new NoticeSender();

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

  onSaveEmailServer() {}
  // onManageSenderModalOk() {
  //   this.isManageSenderModalOkLoading = true;
  //   if (this.isManageSenderModalAdd) {
  //     const modalOk$ = this.noticeSenderSvc
  //       .newSender(this.sender)
  //       .pipe(
  //         finalize(() => {
  //           modalOk$.unsubscribe();
  //           this.isManageSenderModalOkLoading = false;
  //         })
  //       )
  //       .subscribe(
  //         message => {
  //           if (message.code === 0) {
  //             this.isManageSenderModalVisible = false;
  //             this.notifySvc.success(this.i18nSvc.fanyi('common.notify.new-success'), this.i18nSvc.fanyi('alert.notice.sender.next'), {
  //               nzDuration: 15000
  //             });
  //             this.loadSendersTable();
  //           } else {
  //             this.notifySvc.error(this.i18nSvc.fanyi('common.notify.new-fail'), message.msg);
  //           }
  //         },
  //         error => {
  //           this.isManageSenderModalVisible = false;
  //           this.notifySvc.error(this.i18nSvc.fanyi('common.notify.new-fail'), error.msg);
  //         }
  //       );
  //   } else {
  //     const modalOk$ = this.noticeSenderSvc
  //       .editSender(this.sender)
  //       .pipe(
  //         finalize(() => {
  //           modalOk$.unsubscribe();
  //           this.isManageSenderModalOkLoading = false;
  //         })
  //       )
  //       .subscribe(
  //         message => {
  //           if (message.code === 0) {
  //             this.isManageSenderModalVisible = false;
  //             this.notifySvc.success(this.i18nSvc.fanyi('common.notify.edit-success'), this.i18nSvc.fanyi('alert.notice.sender.next'), {
  //               nzDuration: 15000
  //             });
  //             this.loadSendersTable();
  //           } else {
  //             this.notifySvc.error(this.i18nSvc.fanyi('common.notify.edit-fail'), message.msg);
  //           }
  //         },
  //         error => {
  //           this.isManageSenderModalVisible = false;
  //           this.notifySvc.error(this.i18nSvc.fanyi('common.notify.edit-fail'), error.msg);
  //         }
  //       );
  //   }
  // }
}
