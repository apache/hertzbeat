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
import { AlibabaSmsConfig } from 'src/app/pojo/AlibabaSmsConfig';
import { SmsNoticeSender } from 'src/app/pojo/SmsNoticeSender';
import { TencentSmsConfig } from 'src/app/pojo/TencentSmsConfig';
import { UniSmsConfig } from 'src/app/pojo/UniSmsConfig';
import { SmsType, UniSmsAuthMode } from 'src/app/pojo/enums/sms-type.enum';

import { AwsSmsConfig } from '../../../../pojo/AwsSmsConfig';
import { EmailNoticeSender } from '../../../../pojo/EmailNoticeSender';
import { SmslocalSmsConfig } from '../../../../pojo/SmslocalSmsConfig';
import { TwilioSmsConfig } from '../../../../pojo/TwilioSmsConfig';
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
  smsType: SmsType = SmsType.TENCENT;
  emailSender = new EmailNoticeSender();
  smsNoticeSender = new SmsNoticeSender();
  uniSmsAuthModes = UniSmsAuthMode;
  SmsType = SmsType;
  private tempSmsType: SmsType = SmsType.TENCENT;
  private tempSmsNoticeSender = new SmsNoticeSender();

  ngOnInit(): void {
    this.loadEmailSenderServer();
    this.loadSmsSenderServer();
  }

  loadEmailSenderServer() {
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

  loadSmsSenderServer() {
    this.senderServerLoading = true;
    let senderInit$ = this.noticeSenderSvc.getGeneralConfig('sms').subscribe(
      message => {
        this.senderServerLoading = false;
        if (message.code === 0) {
          if (message.data) {
            const newSender = new SmsNoticeSender();
            this.smsNoticeSender = { ...newSender, ...message.data };
            this.smsNoticeSender.tencent = { ...new TencentSmsConfig(), ...message.data.tencent };
            this.smsNoticeSender.alibaba = { ...new AlibabaSmsConfig(), ...message.data.alibaba };
            this.smsNoticeSender.unisms = { ...new UniSmsConfig(), ...message.data.unisms };
            this.smsNoticeSender.smslocal = { ...new SmslocalSmsConfig(), ...message.data.smslocal };
            this.smsNoticeSender.aws = { ...new AwsSmsConfig(), ...message.data.aws };
            this.smsNoticeSender.twilio = { ...new TwilioSmsConfig(), ...message.data.twilio };
            this.smsType = message.data.type || 'tencent';
          } else {
            this.smsNoticeSender = new SmsNoticeSender();
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

  onConfigSmsServer() {
    this.tempSmsType = this.smsType;
    this.tempSmsNoticeSender = {
      ...this.smsNoticeSender,
      tencent: { ...this.smsNoticeSender.tencent },
      alibaba: { ...this.smsNoticeSender.alibaba },
      unisms: { ...this.smsNoticeSender.unisms },
      smslocal: { ...this.smsNoticeSender.smslocal },
      aws: { ...this.smsNoticeSender.aws },
      twilio: { ...this.smsNoticeSender.twilio }
    };
    this.isSmsServerModalVisible = true;
  }

  onCancelSmsServer() {
    this.smsType = this.tempSmsType;
    this.smsNoticeSender = {
      ...this.tempSmsNoticeSender,
      tencent: { ...this.tempSmsNoticeSender.tencent },
      alibaba: { ...this.tempSmsNoticeSender.alibaba },
      unisms: { ...this.tempSmsNoticeSender.unisms },
      smslocal: { ...this.tempSmsNoticeSender.smslocal },
      aws: { ...this.tempSmsNoticeSender.aws },
      twilio: { ...this.tempSmsNoticeSender.twilio }
    };
    this.isSmsServerModalVisible = false;
  }

  onSmsTypeChange(value: SmsType) {
    this.smsType = value;
    this.smsNoticeSender.type = value;
  }

  isAccessKeySecretRequired(): boolean {
    return this.smsNoticeSender.unisms.authMode === UniSmsAuthMode.HMAC;
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
      .saveGeneralConfig(this.smsNoticeSender, 'sms')
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
