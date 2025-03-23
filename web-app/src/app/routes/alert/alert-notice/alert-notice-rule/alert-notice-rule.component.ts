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
import { NoticeRule } from '../../../../pojo/NoticeRule';
import { NoticeReceiverService } from '../../../../service/notice-receiver.service';
import { NoticeRuleService } from '../../../../service/notice-rule.service';
import { NoticeTemplateService } from '../../../../service/notice-template.service';

@Component({
  selector: 'app-alert-notice-rule',
  templateUrl: './alert-notice-rule.component.html',
  styleUrl: './alert-notice-rule.component.less'
})
export class AlertNoticeRuleComponent implements OnInit {
  rules!: NoticeRule[];
  ruleTableLoading: boolean = true;
  templatesOption: any[] = [];
  isManageRuleModalVisible = false;
  isManageRuleModalAdd: boolean = true;
  isManageRuleModalOkLoading: boolean = false;
  rule: NoticeRule = new NoticeRule();
  switchReceiver!: NoticeReceiver;
  receiversOption: any[] = [];
  isLimit: boolean = false;
  name!: string;
  pageIndex: number = 1;
  pageSize: number = 8;
  total: number = 0;
  @ViewChild('ruleForm', { static: false }) ruleForm: NgForm | undefined;

  dayCheckOptions = [
    { label: this.i18nSvc.fanyi('common.week.7'), value: 7, checked: true },
    { label: this.i18nSvc.fanyi('common.week.1'), value: 1, checked: true },
    { label: this.i18nSvc.fanyi('common.week.2'), value: 2, checked: true },
    { label: this.i18nSvc.fanyi('common.week.3'), value: 3, checked: true },
    { label: this.i18nSvc.fanyi('common.week.4'), value: 4, checked: true },
    { label: this.i18nSvc.fanyi('common.week.5'), value: 5, checked: true },
    { label: this.i18nSvc.fanyi('common.week.6'), value: 6, checked: true }
  ];

  constructor(
    private notifySvc: NzNotificationService,
    private noticeReceiverSvc: NoticeReceiverService,
    private modal: NzModalService,
    private noticeTemplateSvc: NoticeTemplateService,
    private noticeRuleSvc: NoticeRuleService,
    @Inject(ALAIN_I18N_TOKEN) private i18nSvc: I18NService
  ) {}

  ngOnInit(): void {
    this.loadRulesTable();
  }

  syncRule() {
    this.loadRulesTable();
  }

  loadRulesTable() {
    this.ruleTableLoading = true;
    let rulesInit$ = this.noticeRuleSvc.getNoticeRules(this.name, this.pageIndex - 1, this.pageSize).subscribe(
      message => {
        this.ruleTableLoading = false;
        if (message.code === 0) {
          let page = message.data;
          this.rules = page.content;
          this.total = page.totalElements;
          this.pageIndex = page.number + 1;
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

  onDeleteOneNoticeRule(ruleId: number) {
    this.modal.confirm({
      nzTitle: this.i18nSvc.fanyi('common.confirm.delete'),
      nzOkText: this.i18nSvc.fanyi('common.button.ok'),
      nzCancelText: this.i18nSvc.fanyi('common.button.cancel'),
      nzOkDanger: true,
      nzOkType: 'primary',
      nzClosable: false,
      nzOnOk: () => this.deleteOneNoticeRule(ruleId)
    });
  }

  // start -- new or update notice strategy pop-up box

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
            this.updatePageIndex(1);
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

  updatePageIndex(delSize: number) {
    const lastPage = Math.max(1, Math.ceil((this.total - delSize) / this.pageSize));
    this.pageIndex = this.pageIndex > lastPage ? lastPage : this.pageIndex;
  }

  onNewNoticeRule() {
    this.rule = new NoticeRule();
    this.rule.templateId = -1;
    this.templatesOption.push({
      value: -1,
      label: this.i18nSvc.fanyi('alert.notice.template.preset.true')
    });
    this.isLimit = false;
    this.isManageRuleModalVisible = true;
    this.isManageRuleModalAdd = true;
  }

  onEditOneNoticeRule(rule: NoticeRule) {
    this.noticeRuleSvc.getNoticeRuleById(rule.id).subscribe(
      message => {
        if (message.code === 0) {
          this.rule = message.data;
          this.isLimit = !(this.rule.days == null || this.rule.days.length == 7);
          this.isManageRuleModalVisible = true;
          this.isManageRuleModalAdd = false;
          this.receiversOption = [];
          this.rule.receiverId.forEach(id => {
            this.receiversOption.push({
              value: id,
              label: this.rule.receiverName[this.rule.receiverId.indexOf(id)]
            });
          });
          this.templatesOption = [];
          if (this.rule.templateId && this.rule.templateName) {
            this.templatesOption.push({
              value: rule.templateId,
              label: rule.templateName
            });
          } else {
            this.rule.templateId = -1;
            this.templatesOption.push({
              value: -1,
              label: this.i18nSvc.fanyi('alert.notice.template.preset.true')
            });
          }
        } else {
          this.notifySvc.error(this.i18nSvc.fanyi('common.notify.edit-fail'), message.msg);
        }
      },
      error => {
        this.notifySvc.error(this.i18nSvc.fanyi('common.notify.edit-fail'), error.msg);
      }
    );
  }

  onNoticeRuleDaysChange(value: any[]) {
    this.rule.days = value
      .filter(item => item.checked == true)
      .map(item => item.value)
      .concat();
  }

  onNoticeRuleLimitChange(limit: boolean) {
    if (!limit) {
      this.rule.days = this.dayCheckOptions.map(item => item.value).concat();
    } else {
      this.rule.days = this.dayCheckOptions
        .filter(item => item.checked)
        .map(item => item.value)
        .concat();
    }
  }

  onSwitchReceiver() {
    this.receiversOption.forEach(option => {
      this.rule.receiverId.forEach(id => {
        if (option.value == id) {
          this.switchReceiver = option.receiver;
        }
      });
    });
    this.rule.templateId = -1;
  }

  loadReceiversOption() {
    let receiverOption$ = this.noticeReceiverSvc.getAllReceivers().subscribe(
      message => {
        if (message.code === 0) {
          let data = message.data;
          this.receiversOption = [];
          if (data != undefined) {
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
                case 7:
                  label = `${label}TelegramBot`;
                  break;
                case 8:
                  label = `${label}SlackWebHook`;
                  break;
                case 9:
                  label = `${label}Discord Bot`;
                  break;
                case 10:
                  label = `${label}WeChatApp`;
                  break;
                case 11:
                  label = `${label}SMN`;
                  break;
                case 12:
                  label = `${label}ServerChan`;
                  break;
              }
              this.receiversOption.push({
                value: item.id,
                label: label,
                receiver: item
              });
            });
          }
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

  loadTemplatesOption() {
    let templateOption$ = this.noticeTemplateSvc.getAllNoticeTemplates().subscribe(
      message => {
        if (message.code === 0) {
          let data = message.data;
          this.templatesOption = [];
          if (data != undefined) {
            let index = -1;
            data.forEach(item => {
              if (this.switchReceiver) {
                if (this.switchReceiver.type == item.type) {
                  this.templatesOption.push({
                    value: item.id == null ? -1 : item.id,
                    label: item.id == null ? this.i18nSvc.fanyi('alert.notice.template.preset.true') : item.name
                  });
                }
              } else {
                this.templatesOption.push({
                  value: item.id == null ? index-- : item.id,
                  label: item.name
                });
              }
            });
          }
        } else {
          console.warn(message.msg);
        }
        templateOption$.unsubscribe();
      },
      error => {
        console.error(error.msg);
        templateOption$.unsubscribe();
      }
    );
  }

  onManageRuleModalCancel() {
    this.isManageRuleModalVisible = false;
  }

  updateNoticeRule(noticeRule: NoticeRule) {
    this.ruleTableLoading = true;
    const updateNoticeRule$ = this.noticeRuleSvc
      .editNoticeRule(noticeRule)
      .pipe(
        finalize(() => {
          updateNoticeRule$.unsubscribe();
          this.ruleTableLoading = false;
        })
      )
      .subscribe(
        message => {
          if (message.code === 0) {
            this.notifySvc.success(this.i18nSvc.fanyi('common.notify.edit-success'), '');
          } else {
            this.notifySvc.error(this.i18nSvc.fanyi('common.notify.edit-fail'), message.msg);
          }
          this.loadRulesTable();
          this.ruleTableLoading = false;
        },
        error => {
          this.ruleTableLoading = false;
          this.notifySvc.error(this.i18nSvc.fanyi('common.notify.edit-fail'), error.msg);
        }
      );
  }

  onManageRuleModalOk() {
    if (this.ruleForm?.invalid) {
      Object.values(this.ruleForm.controls).forEach(control => {
        if (control.invalid) {
          control.markAsDirty();
          control.updateValueAndValidity({ onlySelf: true });
        }
      });
      return;
    }
    this.rule.receiverName = [];
    this.receiversOption.forEach(option => {
      this.rule.receiverId.forEach(id => {
        if (option.value == id) {
          this.rule.receiverName.push(option.label);
        }
      });
    });
    // template model
    if (this.rule.templateId != null && this.rule.templateId >= 0) {
      this.templatesOption.forEach(option => {
        if (option.value == this.rule.templateId) {
          this.rule.templateName = option.label;
        }
      });
    } else {
      this.rule.templateId = null;
      this.rule.templateName = null;
    }
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

  onTablePageChange(params: NzTableQueryParams) {
    const { pageSize, pageIndex } = params;
    this.pageIndex = pageIndex;
    this.pageSize = pageSize;
    this.loadRulesTable();
  }

  onSearch() {
    this.pageIndex = 1;
    this.loadRulesTable();
  }
}
