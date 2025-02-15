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

import { NoticeRule } from '../../../../pojo/NoticeRule';
import { NoticeTemplate } from '../../../../pojo/NoticeTemplate';
import { NoticeTemplateService } from '../../../../service/notice-template.service';

@Component({
  selector: 'app-alert-notice-template',
  templateUrl: './alert-notice-template.component.html',
  styleUrl: './alert-notice-template.component.less'
})
export class AlertNoticeTemplateComponent implements OnInit {
  templates: NoticeTemplate[] = [];
  templateTableLoading: boolean = true;
  isManageTemplateModalVisible: boolean = false;
  isManageTemplateModalAdd: boolean = true;
  isManageTemplateModalOkLoading: boolean = false;
  isShowTemplateModalVisible: boolean = false;
  template: NoticeTemplate = new NoticeTemplate();
  rule: NoticeRule = new NoticeRule();
  name!: string;
  pageIndex: number = 1;
  pageSize: number = 8;
  total: number = 0;
  preset: boolean = true;
  @ViewChild('templateForm', { static: false }) templateForm: NgForm | undefined;

  constructor(
    private notifySvc: NzNotificationService,
    private modal: NzModalService,
    private noticeTemplateSvc: NoticeTemplateService,
    @Inject(ALAIN_I18N_TOKEN) private i18nSvc: I18NService
  ) {}

  ngOnInit(): void {
    this.loadTemplatesTable();
  }

  syncTemplate() {
    this.loadTemplatesTable();
  }

  loadTemplatesTable() {
    this.templateTableLoading = true;
    let templatesInit$ = this.noticeTemplateSvc.getNoticeTemplates(this.name, this.preset, this.pageIndex - 1, this.pageSize).subscribe(
      message => {
        this.templateTableLoading = false;
        if (message.code === 0) {
          let page = message.data;
          this.templates = page.content;
          this.total = page.totalElements;
          this.pageIndex = page.number + 1;
        } else {
          console.warn(message.msg);
        }
        templatesInit$.unsubscribe();
      },
      error => {
        console.error(error.msg);
        this.templateTableLoading = false;
        templatesInit$.unsubscribe();
      }
    );
  }

  onDeleteOneNoticeTemplate(templateId: number) {
    this.modal.confirm({
      nzTitle: this.i18nSvc.fanyi('common.confirm.delete'),
      nzOkText: this.i18nSvc.fanyi('common.button.ok'),
      nzCancelText: this.i18nSvc.fanyi('common.button.cancel'),
      nzOkDanger: true,
      nzOkType: 'primary',
      nzClosable: false,
      nzOnOk: () => this.deleteOneNoticeTemplate(templateId)
    });
  }

  deleteOneNoticeTemplate(templateId: number) {
    const deleteTemplate$ = this.noticeTemplateSvc
      .deleteNoticeTemplate(templateId)
      .pipe(
        finalize(() => {
          deleteTemplate$.unsubscribe();
        })
      )
      .subscribe(
        message => {
          if (message.code === 0) {
            this.notifySvc.success(this.i18nSvc.fanyi('common.notify.delete-success'), '');
            this.updatePageIndex(1);
            this.loadTemplatesTable();
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

  onNewNoticeTemplate() {
    this.template = new NoticeTemplate();
    this.isManageTemplateModalVisible = true;
    this.isManageTemplateModalAdd = true;
  }

  onEditOneNoticeTemplate(template: NoticeTemplate) {
    this.noticeTemplateSvc.getNoticeTemplateById(template.id).subscribe(
      message => {
        if (message.code === 0) {
          this.template = message.data;
          this.isManageTemplateModalVisible = true;
          this.isManageTemplateModalAdd = false;
        } else {
          this.notifySvc.error(this.i18nSvc.fanyi('common.notify.edit-fail'), message.msg);
        }
      },
      error => {
        this.notifySvc.error(this.i18nSvc.fanyi('common.notify.edit-fail'), error.msg);
      }
    );
  }

  onShowOneNoticeTemplate(template: NoticeTemplate) {
    this.template = template;
    this.isShowTemplateModalVisible = true;
  }

  onManageTemplateModalCancel() {
    this.isManageTemplateModalVisible = false;
    this.isShowTemplateModalVisible = false;
  }

  onManageTemplateModalOk() {
    if (this.templateForm?.invalid) {
      Object.values(this.templateForm.controls).forEach(control => {
        if (control.invalid) {
          control.markAsDirty();
          control.updateValueAndValidity({ onlySelf: true });
        }
      });
      return;
    }
    this.isManageTemplateModalOkLoading = true;
    if (this.isManageTemplateModalAdd) {
      this.template.preset = false;
      const modalOk$ = this.noticeTemplateSvc
        .newNoticeTemplate(this.template)
        .pipe(
          finalize(() => {
            modalOk$.unsubscribe();
            this.isManageTemplateModalOkLoading = false;
          })
        )
        .subscribe(
          message => {
            if (message.code === 0) {
              this.isManageTemplateModalVisible = false;
              this.notifySvc.success(this.i18nSvc.fanyi('common.notify.new-success'), '');
              this.loadTemplatesTable();
            } else {
              this.notifySvc.error(this.i18nSvc.fanyi('common.notify.new-fail'), message.msg);
            }
          },
          error => {
            this.notifySvc.error(this.i18nSvc.fanyi('common.notify.new-fail'), error.msg);
          }
        );
    } else {
      const modalOk$ = this.noticeTemplateSvc
        .editNoticeTemplate(this.template)
        .pipe(
          finalize(() => {
            modalOk$.unsubscribe();
            this.isManageTemplateModalOkLoading = false;
          })
        )
        .subscribe(
          message => {
            if (message.code === 0) {
              this.isManageTemplateModalVisible = false;
              this.notifySvc.success(this.i18nSvc.fanyi('common.notify.edit-success'), '');
              this.loadTemplatesTable();
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
    this.loadTemplatesTable();
  }

  onPresetStatusChanged() {
    this.pageIndex = 1;
    this.loadTemplatesTable();
  }

  onSearch() {
    this.pageIndex = 1;
    this.loadTemplatesTable();
  }
}
