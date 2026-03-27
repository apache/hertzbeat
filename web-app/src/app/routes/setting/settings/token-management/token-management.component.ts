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

import { Component, Inject, OnInit } from '@angular/core';
import { I18NService } from '@core';
import { ALAIN_I18N_TOKEN } from '@delon/theme';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzNotificationService } from 'ng-zorro-antd/notification';

import { AuthService } from '../../../../service/auth.service';

interface AuthToken {
  id: number;
  name: string;
  tokenMask: string;
  creator: string;
  gmtCreate: string;
  expireTime: string;
  lastUsedTime: string;
}

interface ExpireOption {
  label: string;
  seconds: number;
}

@Component({
  selector: 'app-token-management',
  templateUrl: './token-management.component.html',
  styleUrls: ['./token-management.component.less']
})
export class TokenManagementComponent implements OnInit {
  tokens: AuthToken[] = [];
  loading = false;
  generateLoading = false;
  isGenerateModalVisible = false;
  isTokenModalVisible = false;
  newTokenName = '';
  selectedExpire: number = -1;
  generatedToken = '';

  expireOptions: ExpireOption[] = [];

  constructor(
    private authSvc: AuthService,
    private notifySvc: NzNotificationService,
    private modalSvc: NzModalService,
    @Inject(ALAIN_I18N_TOKEN) private i18nSvc: I18NService
  ) {}

  ngOnInit(): void {
    this.expireOptions = [
      { label: this.i18nSvc.fanyi('settings.token.expire.never'), seconds: -1 },
      { label: this.i18nSvc.fanyi('settings.token.expire.7d'), seconds: 7 * 24 * 3600 },
      { label: this.i18nSvc.fanyi('settings.token.expire.30d'), seconds: 30 * 24 * 3600 },
      { label: this.i18nSvc.fanyi('settings.token.expire.90d'), seconds: 90 * 24 * 3600 },
      { label: this.i18nSvc.fanyi('settings.token.expire.180d'), seconds: 180 * 24 * 3600 },
      { label: this.i18nSvc.fanyi('settings.token.expire.365d'), seconds: 365 * 24 * 3600 }
    ];
    this.loadTokens();
  }

  loadTokens(): void {
    this.loading = true;
    this.authSvc.listTokens().subscribe(
      message => {
        if (message.code === 0) {
          this.tokens = message.data || [];
        } else {
          this.notifySvc.error(this.i18nSvc.fanyi('common.notify.query-fail'), message.msg);
        }
        this.loading = false;
      },
      error => {
        this.loading = false;
      }
    );
  }

  showGenerateModal(): void {
    this.newTokenName = '';
    this.selectedExpire = -1;
    this.isGenerateModalVisible = true;
  }

  handleGenerateCancel(): void {
    this.isGenerateModalVisible = false;
  }

  doGenerateToken(): void {
    if (!this.newTokenName || !this.newTokenName.trim()) {
      return;
    }
    this.generateLoading = true;
    this.isGenerateModalVisible = false;
    this.authSvc.generateToken(this.newTokenName.trim(), this.selectedExpire).subscribe(
      message => {
        if (message.code === 0) {
          this.generatedToken = message.data?.token || '';
          this.isTokenModalVisible = true;
          this.loadTokens();
        } else {
          this.notifySvc.warning(this.i18nSvc.fanyi('settings.token.generate-fail'), message.msg);
        }
        this.generateLoading = false;
      },
      () => {
        this.generateLoading = false;
      }
    );
  }

  handleTokenModalClose(): void {
    this.isTokenModalVisible = false;
    this.generatedToken = '';
  }

  confirmDelete(token: AuthToken): void {
    this.modalSvc.confirm({
      nzTitle: this.i18nSvc.fanyi('settings.token.delete-confirm'),
      nzContent: this.i18nSvc.fanyi('settings.token.delete-confirm-content', { name: token.name || token.tokenMask }),
      nzOkDanger: true,
      nzOkText: this.i18nSvc.fanyi('common.button.delete'),
      nzOnOk: () => {
        this.authSvc.deleteToken(token.id).subscribe(
          message => {
            if (message.code === 0) {
              this.notifySvc.success(this.i18nSvc.fanyi('common.notify.delete-success'), '');
              this.loadTokens();
            } else {
              this.notifySvc.error(this.i18nSvc.fanyi('common.notify.delete-fail'), message.msg);
            }
          },
          () => {
            this.notifySvc.error(this.i18nSvc.fanyi('common.notify.delete-fail'), '');
          }
        );
      }
    });
  }

  isExpired(token: AuthToken): boolean {
    if (!token.expireTime) {
      return false;
    }
    return new Date(token.expireTime).getTime() < Date.now();
  }

  copyToken(): void {
    navigator.clipboard
      .writeText(this.generatedToken)
      .then(() => {
        this.notifySvc.success(this.i18nSvc.fanyi('common.notify.copy-success'), '');
      })
      .catch(() => {
        const el = document.createElement('textarea');
        el.value = this.generatedToken;
        document.body.appendChild(el);
        el.select();
        const success = document.execCommand('copy');
        document.body.removeChild(el);
        if (success) {
          this.notifySvc.success(this.i18nSvc.fanyi('common.notify.copy-success'), '');
        } else {
          this.notifySvc.warning(this.i18nSvc.fanyi('common.notify.copy-fail'), '');
        }
      });
  }
}
