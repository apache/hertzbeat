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
import { finalize } from 'rxjs/operators';

import { Tag } from '../../../pojo/Tag';
import { TagService } from '../../../service/tag.service';
import { formatTagName } from '../../../shared/utils/common-util';

@Component({
  selector: 'app-setting-tags',
  templateUrl: './tags.component.html',
  styleUrls: ['./tags.component.less']
})
export class SettingTagsComponent implements OnInit {
  @ViewChild('tagForm', { static: false }) tagForm: NgForm | undefined;

  constructor(
    private notifySvc: NzNotificationService,
    private modal: NzModalService,
    private tagService: TagService,
    @Inject(ALAIN_I18N_TOKEN) private i18nSvc: I18NService
  ) {}

  total: number = 0;
  tags!: Tag[];
  tableLoading: boolean = false;
  // used for filtering tag name or tag value
  search: string | undefined;

  ngOnInit(): void {
    this.loadTagsTable();
  }

  sync() {
    this.loadTagsTable();
  }

  loadTagsTable() {
    this.tableLoading = true;
    let labelsInit$ = this.tagService.loadTags(this.search, 1, 0, 9999).subscribe(
      message => {
        this.tableLoading = false;
        if (message.code === 0) {
          let page = message.data;
          this.tags = page.content;
          this.total = page.totalElements;
        } else {
          console.warn(message.msg);
        }
        labelsInit$.unsubscribe();
      },
      error => {
        this.tableLoading = false;
        labelsInit$.unsubscribe();
        console.error(error.msg);
      }
    );
  }

  onDeleteOneTag(tagId: number) {
    let alerts = new Set<number>();
    alerts.add(tagId);
    this.modal.confirm({
      nzTitle: this.i18nSvc.fanyi('common.confirm.delete'),
      nzOkText: this.i18nSvc.fanyi('common.button.ok'),
      nzCancelText: this.i18nSvc.fanyi('common.button.cancel'),
      nzOkDanger: true,
      nzOkType: 'primary',
      nzClosable: false,
      nzOnOk: () => this.deleteTags(alerts)
    });
  }

  deleteTags(tagIds: Set<number>) {
    this.tableLoading = true;
    const deleteTags$ = this.tagService.deleteTags(tagIds).subscribe(
      message => {
        deleteTags$.unsubscribe();
        if (message.code === 0) {
          this.notifySvc.success(this.i18nSvc.fanyi('common.notify.delete-success'), '');
          this.loadTagsTable();
        } else {
          this.tableLoading = false;
          this.notifySvc.error(this.i18nSvc.fanyi('common.notify.delete-fail'), message.msg);
        }
      },
      error => {
        this.tableLoading = false;
        deleteTags$.unsubscribe();
        this.notifySvc.error(this.i18nSvc.fanyi('common.notify.delete-fail'), error.msg);
      }
    );
  }

  // start 新增修改Tag model
  isManageModalVisible = false;
  isManageModalOkLoading = false;
  isManageModalAdd = true;
  tag!: Tag;
  onNewTag() {
    this.tag = new Tag();
    this.isManageModalVisible = true;
    this.isManageModalAdd = true;
  }
  onEditOneTag(tagValue: Tag) {
    this.tag = tagValue;
    this.isManageModalVisible = true;
    this.isManageModalAdd = false;
  }
  onManageModalCancel() {
    this.isManageModalVisible = false;
  }
  onManageModalOk() {
    if (this.tagForm?.invalid) {
      Object.values(this.tagForm.controls).forEach(control => {
        if (control.invalid) {
          control.markAsDirty();
          control.updateValueAndValidity({ onlySelf: true });
        }
      });
      return;
    }
    this.isManageModalOkLoading = true;
    this.tag.name = this.tag.name.trim();
    if (this.tag.tagValue != undefined) {
      this.tag.tagValue = this.tag.tagValue.trim();
    }
    if (this.tag.description != undefined) {
      this.tag.description = this.tag.description.trim();
    }
    if (this.isManageModalAdd) {
      const modalOk$ = this.tagService
        .newTag(this.tag)
        .pipe(
          finalize(() => {
            modalOk$.unsubscribe();
            this.isManageModalOkLoading = false;
          })
        )
        .subscribe(
          message => {
            if (message.code === 0) {
              this.isManageModalVisible = false;
              this.notifySvc.success(this.i18nSvc.fanyi('common.notify.new-success'), '');
              this.loadTagsTable();
            } else {
              this.notifySvc.error(this.i18nSvc.fanyi('common.notify.new-fail'), message.msg);
            }
          },
          error => {
            this.notifySvc.error(this.i18nSvc.fanyi('common.notify.new-fail'), error.msg);
          }
        );
    } else {
      const modalOk$ = this.tagService
        .editTag(this.tag)
        .pipe(
          finalize(() => {
            modalOk$.unsubscribe();
            this.isManageModalOkLoading = false;
          })
        )
        .subscribe(
          message => {
            if (message.code === 0) {
              this.isManageModalVisible = false;
              this.notifySvc.success(this.i18nSvc.fanyi('common.notify.edit-success'), '');
              this.loadTagsTable();
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
  // end 新增修改告警定义model
  protected readonly formatTagName = formatTagName;

  copyTagValue(tag: any) {
    const tagText = this.formatTagName(tag);
    navigator.clipboard
      .writeText(tagText)
      .then(() => {
        this.notifySvc.success(this.i18nSvc.fanyi('common.notify.copy-success'), '');
      })
      .catch(() => {
        this.notifySvc.error(this.i18nSvc.fanyi('common.notify.copy-fail'), '');
      });
  }
}
