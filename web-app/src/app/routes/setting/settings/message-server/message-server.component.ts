import { ChangeDetectorRef, Component, Inject, OnInit } from '@angular/core';
import { I18NService } from '@core';
import { ALAIN_I18N_TOKEN } from '@delon/theme';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import {NoticeSenderService} from "../../../../service/notice-sender.service";
import {NoticeSender} from "../../../../pojo/NoticeSender";

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

  onSaveEmailServer() {

  }
}
