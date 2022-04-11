import { Component, Inject, OnInit } from '@angular/core';
import { I18NService } from '@core';
import { ALAIN_I18N_TOKEN } from '@delon/theme';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { finalize } from 'rxjs/operators';

import { NoticeReceiver } from '../../../pojo/NoticeReceiver';
import { NoticeRule } from '../../../pojo/NoticeRule';
import { NoticeReceiverService } from '../../../service/notice-receiver.service';
import { NoticeRuleService } from '../../../service/notice-rule.service';

@Component({
  selector: 'app-alert-notice',
  templateUrl: './alert-notice.component.html',
  styles: []
})
export class AlertNoticeComponent implements OnInit {
  constructor(
    private notifySvc: NzNotificationService,
    private noticeReceiverSvc: NoticeReceiverService,
    private modal: NzModalService,
    private noticeRuleSvc: NoticeRuleService,
    @Inject(ALAIN_I18N_TOKEN) private i18nSvc: I18NService
  ) {}

  receivers!: NoticeReceiver[];
  receiverTableLoading: boolean = true;
  rules!: NoticeRule[];
  ruleTableLoading: boolean = true;

  ngOnInit(): void {
    this.loadReceiversTable();
    this.loadRulesTable();
  }
  syncReceiver() {
    this.loadReceiversTable();
  }
  syncRule() {
    this.loadRulesTable();
  }

  loadReceiversTable() {
    this.receiverTableLoading = true;
    let receiverInit$ = this.noticeReceiverSvc.getReceivers().subscribe(
      message => {
        this.receiverTableLoading = false;
        if (message.code === 0) {
          this.receivers = message.data;
        } else {
          console.warn(message.msg);
        }
        receiverInit$.unsubscribe();
      },
      error => {
        console.error(error.msg);
        this.receiverTableLoading = false;
        receiverInit$.unsubscribe();
      }
    );
  }
  loadRulesTable() {
    this.ruleTableLoading = true;
    let rulesInit$ = this.noticeRuleSvc.getNoticeRules().subscribe(
      message => {
        this.ruleTableLoading = false;
        if (message.code === 0) {
          this.rules = message.data;
        } else {
          console.warn(message.msg);
        }
        rulesInit$.unsubscribe();
      },
      error => {
        console.error(error.msg);
        this.ruleTableLoading = false;
        rulesInit$.unsubscribe();
      }
    );
  }

  onDeleteOneNoticeReceiver(receiveId: number) {
    this.modal.confirm({
      nzTitle: this.i18nSvc.fanyi('common.confirm.delete'),
      nzOkText: this.i18nSvc.fanyi('common.button.ok'),
      nzCancelText: this.i18nSvc.fanyi('common.button.cancel'),
      nzOkDanger: true,
      nzOkType: 'primary',
      nzOnOk: () => this.deleteOneNoticeReceiver(receiveId)
    });
  }

  deleteOneNoticeReceiver(receiveId: number) {
    const deleteReceiver$ = this.noticeReceiverSvc
      .deleteReceiver(receiveId)
      .pipe(
        finalize(() => {
          deleteReceiver$.unsubscribe();
        })
      )
      .subscribe(
        message => {
          if (message.code === 0) {
            this.notifySvc.success(this.i18nSvc.fanyi('common.notify.delete-success'), '');
            this.loadReceiversTable();
          } else {
            this.notifySvc.error(this.i18nSvc.fanyi('common.notify.delete-fail'), message.msg);
          }
        },
        error => {
          this.notifySvc.error(this.i18nSvc.fanyi('common.notify.delete-fail'), error.msg);
        }
      );
  }

  onDeleteOneNoticeRule(ruleId: number) {
    this.modal.confirm({
      nzTitle: this.i18nSvc.fanyi('common.confirm.delete'),
      nzOkText: this.i18nSvc.fanyi('common.button.ok'),
      nzCancelText: this.i18nSvc.fanyi('common.button.cancel'),
      nzOkDanger: true,
      nzOkType: 'primary',
      nzOnOk: () => this.deleteOneNoticeRule(ruleId)
    });
  }

  deleteOneNoticeRule(ruleId: number) {
    const deleteRule$ = this.noticeRuleSvc
      .deleteNoticeRule(ruleId)
      .pipe(
        finalize(() => {
          deleteRule$.unsubscribe();
        })
      )
      .subscribe(
        message => {
          if (message.code === 0) {
            this.notifySvc.success(this.i18nSvc.fanyi('common.notify.delete-success'), '');
            this.loadRulesTable();
          } else {
            this.notifySvc.error(this.i18nSvc.fanyi('common.notify.delete-fail'), message.msg);
          }
        },
        error => {
          this.notifySvc.error(this.i18nSvc.fanyi('common.notify.delete-fail'), error.msg);
        }
      );
  }

  // start 新增或修改通知接收人弹出框
  isManageReceiverModalVisible: boolean = false;
  isManageReceiverModalAdd: boolean = true;
  isManageReceiverModalOkLoading: boolean = false;
  receiver!: NoticeReceiver;

  onNewNoticeReceiver() {
    this.receiver = new NoticeReceiver();
    this.isManageReceiverModalVisible = true;
    this.isManageReceiverModalAdd = true;
  }
  onEditOneNoticeReceiver(receiver: NoticeReceiver) {
    this.receiver = receiver;
    this.isManageReceiverModalVisible = true;
    this.isManageReceiverModalAdd = false;
  }

  onManageReceiverModalCancel() {
    this.isManageReceiverModalVisible = false;
  }
  onManageReceiverModalOk() {
    this.isManageReceiverModalOkLoading = true;
    if (this.isManageReceiverModalAdd) {
      const modalOk$ = this.noticeReceiverSvc
        .newReceiver(this.receiver)
        .pipe(
          finalize(() => {
            modalOk$.unsubscribe();
            this.isManageReceiverModalOkLoading = false;
          })
        )
        .subscribe(
          message => {
            if (message.code === 0) {
              this.isManageReceiverModalVisible = false;
              this.notifySvc.success(this.i18nSvc.fanyi('common.notify.new-success'), '');
              this.loadReceiversTable();
            } else {
              this.notifySvc.error(this.i18nSvc.fanyi('common.notify.new-fail'), message.msg);
            }
          },
          error => {
            this.notifySvc.error(this.i18nSvc.fanyi('common.notify.new-fail'), error.msg);
          }
        );
    } else {
      const modalOk$ = this.noticeReceiverSvc
        .editReceiver(this.receiver)
        .pipe(
          finalize(() => {
            modalOk$.unsubscribe();
            this.isManageReceiverModalOkLoading = false;
          })
        )
        .subscribe(
          message => {
            if (message.code === 0) {
              this.isManageReceiverModalVisible = false;
              this.notifySvc.success(this.i18nSvc.fanyi('common.notify.edit-success'), '');
              this.loadReceiversTable();
            } else {
              this.notifySvc.error(this.i18nSvc.fanyi('common.notify.edit-fail'), message.msg);
            }
          },
          error => {
            this.notifySvc.error(this.i18nSvc.fanyi('common.notify.edit-fail'), error.msg);
          }
        );
    }
  }

  // start 新增或修改通知策略弹出框
  isManageRuleModalVisible: boolean = false;
  isManageRuleModalAdd: boolean = true;
  isManageRuleModalOkLoading: boolean = false;
  rule!: NoticeRule;
  receiversOption: any[] = [];

  onNewNoticeRule() {
    this.rule = new NoticeRule();
    this.isManageRuleModalVisible = true;
    this.isManageRuleModalAdd = true;
  }

  onEditOneNoticeRule(rule: NoticeRule) {
    this.rule = rule;
    this.isManageRuleModalVisible = true;
    this.isManageRuleModalAdd = false;
    this.receiversOption.push({
      value: rule.receiverId,
      label: rule.receiverName
    });
  }

  loadReceiversOption() {
    let receiverOption$ = this.noticeReceiverSvc.getReceivers().subscribe(
      message => {
        if (message.code === 0) {
          let data = message.data;
          this.receiversOption = [];
          data.forEach(item => {
            let label = `${item.name}-`;
            switch (item.type) {
              case 0:
                label = `${label}Phone`;
                break;
              case 1:
                label = `${label}Email`;
                break;
              case 2:
                label = `${label}WebHook`;
                break;
              case 3:
                label = `${label}WeChat`;
                break;
              case 4:
                label = `${label}WeWork`;
                break;
              case 5:
                label = `${label}DingDing`;
                break;
              case 6:
                label = `${label}FeiShu`;
                break;
            }
            this.receiversOption.push({
              value: item.id,
              label: label
            });
          });
        } else {
          console.warn(message.msg);
        }
        receiverOption$.unsubscribe();
      },
      error => {
        console.error(error.msg);
        receiverOption$.unsubscribe();
      }
    );
  }

  onManageRuleModalCancel() {
    this.isManageRuleModalVisible = false;
  }

  onManageRuleModalOk() {
    this.receiversOption.forEach(option => {
      if (option.value == this.rule.receiverId) {
        this.rule.receiverName = option.label;
      }
    });
    this.isManageRuleModalOkLoading = true;
    if (this.isManageRuleModalAdd) {
      const modalOk$ = this.noticeRuleSvc
        .newNoticeRule(this.rule)
        .pipe(
          finalize(() => {
            modalOk$.unsubscribe();
            this.isManageRuleModalOkLoading = false;
          })
        )
        .subscribe(
          message => {
            if (message.code === 0) {
              this.isManageRuleModalVisible = false;
              this.notifySvc.success(this.i18nSvc.fanyi('common.notify.new-success'), '');
              this.loadRulesTable();
            } else {
              this.notifySvc.error(this.i18nSvc.fanyi('common.notify.new-fail'), message.msg);
            }
          },
          error => {
            this.notifySvc.error(this.i18nSvc.fanyi('common.notify.new-fail'), error.msg);
          }
        );
    } else {
      const modalOk$ = this.noticeRuleSvc
        .editNoticeRule(this.rule)
        .pipe(
          finalize(() => {
            modalOk$.unsubscribe();
            this.isManageRuleModalOkLoading = false;
          })
        )
        .subscribe(
          message => {
            if (message.code === 0) {
              this.isManageRuleModalVisible = false;
              this.notifySvc.success(this.i18nSvc.fanyi('common.notify.edit-success'), '');
              this.loadRulesTable();
            } else {
              this.notifySvc.error(this.i18nSvc.fanyi('common.notify.edit-fail'), message.msg);
            }
          },
          error => {
            this.notifySvc.error(this.i18nSvc.fanyi('common.notify.edit-fail'), error.msg);
          }
        );
    }
  }
}
