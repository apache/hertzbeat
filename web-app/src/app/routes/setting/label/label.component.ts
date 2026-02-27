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

import { Label } from '../../../pojo/Label';
import { LabelService } from '../../../service/label.service';
import { formatLabelName, renderLabelColor } from '../../../shared/utils/common-util';

@Component({
  selector: 'app-setting-label',
  templateUrl: './label.component.html',
  styleUrls: ['./label.component.less']
})
export class SettingLabelComponent implements OnInit {
  @ViewChild('labelForm', { static: false }) labelForm: NgForm | undefined;

  constructor(
    private notifySvc: NzNotificationService,
    private modal: NzModalService,
    private labelService: LabelService,
    @Inject(ALAIN_I18N_TOKEN) private i18nSvc: I18NService
  ) {}

  total: number = 0;
  labels!: Label[];
  tableLoading: boolean = false;
  search: string | undefined;

  ngOnInit(): void {
    this.loadLabelTable();
  }

  sync() {
    this.loadLabelTable();
  }

  loadLabelTable() {
    this.tableLoading = true;
    let labelsInit$ = this.labelService.loadLabels(this.search, undefined, 0, 9999).subscribe(
      message => {
        this.tableLoading = false;
        if (message.code === 0) {
          let page = message.data;
          this.labels = page.content;
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

  onDeleteLabel(id: number) {
    let ids = new Set<number>();
    ids.add(id);
    this.modal.confirm({
      nzTitle: this.i18nSvc.fanyi('common.confirm.delete'),
      nzOkText: this.i18nSvc.fanyi('common.button.ok'),
      nzCancelText: this.i18nSvc.fanyi('common.button.cancel'),
      nzOkDanger: true,
      nzOkType: 'primary',
      nzClosable: false,
      nzOnOk: () => this.deleteLabels(ids)
    });
  }

  deleteLabels(ids: Set<number>) {
    this.tableLoading = true;
    const deleteLabels$ = this.labelService.deleteLabels(ids).subscribe(
      message => {
        deleteLabels$.unsubscribe();
        if (message.code === 0) {
          this.notifySvc.success(this.i18nSvc.fanyi('common.notify.delete-success'), '');
          this.loadLabelTable();
        } else {
          this.tableLoading = false;
          this.notifySvc.error(this.i18nSvc.fanyi('common.notify.delete-fail'), message.msg);
        }
      },
      error => {
        this.tableLoading = false;
        deleteLabels$.unsubscribe();
        this.notifySvc.error(this.i18nSvc.fanyi('common.notify.delete-fail'), error.msg);
      }
    );
  }

  // start model
  isManageModalVisible = false;
  isManageModalOkLoading = false;
  isManageModalAdd = true;
  label!: Label;
  onNewLabel() {
    this.label = new Label();
    this.isManageModalVisible = true;
    this.isManageModalAdd = true;
  }
  onEditLabel(labelValue: Label) {
    this.label = labelValue;
    this.isManageModalVisible = true;
    this.isManageModalAdd = false;
  }
  onManageModalCancel() {
    this.isManageModalVisible = false;
  }
  onManageModalOk() {
    if (this.labelForm?.invalid) {
      Object.values(this.labelForm.controls).forEach(control => {
        if (control.invalid) {
          control.markAsDirty();
          control.updateValueAndValidity({ onlySelf: true });
        }
      });
      return;
    }
    this.isManageModalOkLoading = true;
    this.label.name = this.label.name.trim();
    if (this.label.tagValue != undefined) {
      this.label.tagValue = this.label.tagValue.trim();
    }
    if (this.label.description != undefined) {
      this.label.description = this.label.description.trim();
    }
    if (this.isManageModalAdd) {
      const modalOk$ = this.labelService
        .newLabel(this.label)
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
              this.loadLabelTable();
            } else {
              this.notifySvc.error(this.i18nSvc.fanyi('common.notify.new-fail'), message.msg);
            }
          },
          error => {
            this.notifySvc.error(this.i18nSvc.fanyi('common.notify.new-fail'), error.msg);
          }
        );
    } else {
      const modalOk$ = this.labelService
        .editLabel(this.label)
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
              this.loadLabelTable();
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
  // end model

  protected readonly getLabelColor = renderLabelColor;

  protected readonly formatLabelName = formatLabelName;

  copyLabelValue(label: any) {
    const text = this.formatLabelName(label);
    navigator.clipboard
      .writeText(text)
      .then(() => {
        this.notifySvc.success(this.i18nSvc.fanyi('common.notify.copy-success'), '');
      })
      .catch(() => {
        this.notifySvc.error(this.i18nSvc.fanyi('common.notify.copy-fail'), '');
      });
  }
}
