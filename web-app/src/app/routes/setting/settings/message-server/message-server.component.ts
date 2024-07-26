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
    private noticeSenderSvc: GeneralConfigService,
    @Inject(ALAIN_I18N_TOKEN) private i18nSvc: I18NService
  ) {}

  @ViewChild('senderForm', { static: false }) senderForm: NgForm | undefined;
  senderServerLoading: boolean = true;
  loading: boolean = false;
  isEmailServerModalVisible: boolean = false;
  isSmsServerModalVisible: boolean = false;
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
    if (this.senderForm?.invalid) {
      Object.values(this.senderForm.controls).forEach(control => {
        if (control.invalid) {
          control.markAsDirty();
          control.updateValueAndValidity({ onlySelf: true });
        }
      });
      return;
    }
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

  onConfigSmsServer() {
    this.isSmsServerModalVisible = true;
  }

  onCancelSmsServer() {
    this.isSmsServerModalVisible = false;
  }

  onSaveSmsServer() {
    if (this.senderForm?.invalid) {
      Object.values(this.senderForm.controls).forEach(control => {
        if (control.invalid) {
          control.markAsDirty();
          control.updateValueAndValidity({ onlySelf: true });
        }
      });
      return;
    }
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
            this.isSmsServerModalVisible = false;
            this.notifySvc.success(this.i18nSvc.fanyi('common.notify.apply-success'), '');
          } else {
            this.notifySvc.error(this.i18nSvc.fanyi('common.notify.apply-fail'), message.msg);
          }
        },
        error => {
          this.isSmsServerModalVisible = false;
          this.notifySvc.error(this.i18nSvc.fanyi('common.notify.apply-fail'), error.msg);
        }
      );
  }
}
