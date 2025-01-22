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
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { NzTableQueryParams } from 'ng-zorro-antd/table';
import { finalize } from 'rxjs/operators';

import { NoticeReceiver } from '../../../../pojo/NoticeReceiver';
import { NoticeReceiverService } from '../../../../service/notice-receiver.service';

@Component({
  selector: 'app-alert-notice-receiver',
  templateUrl: './alert-notice-receiver.component.html',
  styleUrl: './alert-notice-receiver.component.less'
})
export class AlertNoticeReceiverComponent implements OnInit {
  receivers!: NoticeReceiver[];
  receiverTableLoading: boolean = true;
  isManageReceiverModalVisible: boolean = false;
  isManageReceiverModalAdd: boolean = true;
  isManageReceiverModalOkLoading: boolean = false;
  isSendTestButtonLoading: boolean = false;
  receiver!: NoticeReceiver;
  name!: string;
  pageIndex: number = 1;
  pageSize: number = 8;
  total: number = 0;
  @ViewChild('receiverForm', { static: false }) receiverForm: NgForm | undefined;

  constructor(
    private notifySvc: NzNotificationService,
    private noticeReceiverSvc: NoticeReceiverService,
    private modal: NzModalService,
    @Inject(ALAIN_I18N_TOKEN) private i18nSvc: I18NService
  ) {}

  ngOnInit(): void {
    this.loadReceiversTable();
  }

  syncReceiver() {
    this.loadReceiversTable();
  }

  loadReceiversTable() {
    this.receiverTableLoading = true;
    let receiverInit$ = this.noticeReceiverSvc.getReceivers(this.name, this.pageIndex - 1, this.pageSize).subscribe(
      message => {
        this.receiverTableLoading = false;
        if (message.code === 0) {
          let page = message.data;
          this.receivers = page.content;
          this.total = page.totalElements;
          this.pageIndex = page.number + 1;
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

  onDeleteOneNoticeReceiver(receiveId: number) {
    this.modal.confirm({
      nzTitle: this.i18nSvc.fanyi('common.confirm.delete'),
      nzOkText: this.i18nSvc.fanyi('common.button.ok'),
      nzCancelText: this.i18nSvc.fanyi('common.button.cancel'),
      nzOkDanger: true,
      nzOkType: 'primary',
      nzClosable: false,
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
            this.updatePageIndex(1);
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

  updatePageIndex(delSize: number) {
    const lastPage = Math.max(1, Math.ceil((this.total - delSize) / this.pageSize));
    this.pageIndex = this.pageIndex > lastPage ? lastPage : this.pageIndex;
  }

  onSplitTokenStr(type: number) {
    let index = -1;
    switch (this.receiver?.type) {
      case 4:
        if (this.receiver?.wechatId) {
          index = this.receiver.wechatId.indexOf('key=');
          if (index > 0) {
            this.receiver.wechatId = this.receiver.wechatId.substring(index + 4);
          }
        }
        break;
      case 5:
        if (this.receiver?.accessToken) {
          index = this.receiver.accessToken.indexOf('access_token=');
          if (index > 0) {
            this.receiver.accessToken = this.receiver.accessToken.substring(index + 13);
          }
        }
        break;
      case 6:
        if (this.receiver?.accessToken) {
          index = this.receiver.accessToken.indexOf('hook');
          if (index > 0) {
            this.receiver.accessToken = this.receiver.accessToken.substring(index + 5);
          }
        }
        break;
    }
  }

  onNewNoticeReceiver() {
    this.receiver = new NoticeReceiver();
    this.isManageReceiverModalVisible = true;
    this.isManageReceiverModalAdd = true;
  }

  onEditOneNoticeReceiver(receiver: NoticeReceiver) {
    this.noticeReceiverSvc.getReceiver(receiver.id).subscribe(
      message => {
        if (message.code === 0) {
          this.receiver = message.data;
          this.isManageReceiverModalVisible = true;
          this.isManageReceiverModalAdd = false;
        } else {
          this.notifySvc.error(this.i18nSvc.fanyi('common.notify.edit-fail'), message.msg);
        }
      },
      error => {
        this.notifySvc.error(this.i18nSvc.fanyi('common.notify.edit-fail'), error.msg);
      }
    );
  }

  onSendAlertTestMsg() {
    this.isSendTestButtonLoading = true;
    const sendReq$ = this.noticeReceiverSvc
      .sendAlertMsgToReceiver(this.receiver)
      .pipe(
        finalize(() => {
          sendReq$.unsubscribe();
          this.isSendTestButtonLoading = false;
        })
      )
      .subscribe(
        message => {
          if (message.code === 0) {
            this.isSendTestButtonLoading = false;
            this.notifySvc.success(this.i18nSvc.fanyi('alert.notice.send-test.notify.success'), '');
          } else {
            this.notifySvc.error(this.i18nSvc.fanyi('alert.notice.send-test.notify.failed'), message.msg);
          }
        },
        error => {
          this.isSendTestButtonLoading = false;
          this.notifySvc.error(this.i18nSvc.fanyi('alert.notice.send-test.notify.failed'), error.msg);
        }
      );
  }

  onManageReceiverModalCancel() {
    this.isManageReceiverModalVisible = false;
  }

  onManageReceiverModalOk() {
    if (this.receiverForm?.invalid) {
      let isWaring = false;
      Object.values(this.receiverForm.controls).forEach(control => {
        if (control.invalid && !(Object.keys(control?.errors || {}).length === 0)) {
          isWaring = true;
          control.markAsDirty();
          control.updateValueAndValidity({ onlySelf: true });
        }
      });
      if (isWaring) {
        return;
      }
    }
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
              this.notifySvc.success(this.i18nSvc.fanyi('common.notify.new-success'), this.i18nSvc.fanyi('alert.notice.receiver.next'), {
                nzDuration: 15000
              });
              this.loadReceiversTable();
            } else {
              this.notifySvc.error(this.i18nSvc.fanyi('common.notify.new-fail'), message.msg);
            }
          },
          error => {
            this.isManageReceiverModalVisible = false;
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
              this.notifySvc.success(this.i18nSvc.fanyi('common.notify.edit-success'), this.i18nSvc.fanyi('alert.notice.receiver.next'), {
                nzDuration: 15000
              });
              this.loadReceiversTable();
            } else {
              this.notifySvc.error(this.i18nSvc.fanyi('common.notify.edit-fail'), message.msg);
            }
          },
          error => {
            this.isManageReceiverModalVisible = false;
            this.notifySvc.error(this.i18nSvc.fanyi('common.notify.edit-fail'), error.msg);
          }
        );
    }
  }

  onTablePageChange(params: NzTableQueryParams) {
    const { pageSize, pageIndex } = params;
    this.pageIndex = pageIndex;
    this.pageSize = pageSize;
    this.loadReceiversTable();
  }

  onSearch() {
    this.pageIndex = 1;
    this.loadReceiversTable();
  }
}
