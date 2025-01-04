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

import { AlertGroupConverge } from '../../../pojo/AlertGroupConverge';
import { AlertGroupService } from '../../../service/alert-group.service';

@Component({
  selector: 'app-alert-converge',
  templateUrl: './alert-group-converge.component.html',
  styleUrls: ['./alert-group-converge.component.less']
})
export class AlertGroupConvergeComponent implements OnInit {
  constructor(
    private modal: NzModalService,
    private notifySvc: NzNotificationService,
    private alertConvergeService: AlertGroupService,
    @Inject(ALAIN_I18N_TOKEN) private i18nSvc: I18NService
  ) {}

  @ViewChild('ruleForm', { static: false }) ruleForm: NgForm | undefined;
  pageIndex: number = 1;
  pageSize: number = 8;
  total: number = 0;
  search!: string;
  groupConverges!: AlertGroupConverge[];
  tableLoading: boolean = true;
  checkedConvergeIds = new Set<number>();

  commonLabels: string[] = ['alertname', 'instance', 'job', 'severity', 'service', 'host', 'env'];

  ngOnInit(): void {
    this.loadGroupConvergeTable();
  }

  sync() {
    this.loadGroupConvergeTable();
  }

  loadGroupConvergeTable() {
    this.tableLoading = true;
    let alertDefineInit$ = this.alertConvergeService.getAlertGroupConverges(this.search, this.pageIndex - 1, this.pageSize).subscribe(
      message => {
        this.tableLoading = false;
        this.checkedAll = false;
        this.checkedConvergeIds.clear();
        if (message.code === 0) {
          let page = message.data;
          this.groupConverges = page.content;
          this.pageIndex = page.number + 1;
          this.total = page.totalElements;
        } else {
          console.warn(message.msg);
        }
        alertDefineInit$.unsubscribe();
      },
      error => {
        this.tableLoading = false;
        alertDefineInit$.unsubscribe();
      }
    );
  }

  updateGroupConverge(alertConverge: AlertGroupConverge) {
    this.tableLoading = true;
    const updateDefine$ = this.alertConvergeService
      .editAlertGroupConverge(alertConverge)
      .pipe(
        finalize(() => {
          updateDefine$.unsubscribe();
          this.tableLoading = false;
        })
      )
      .subscribe(
        message => {
          if (message.code === 0) {
            this.notifySvc.success(this.i18nSvc.fanyi('common.notify.edit-success'), '');
          } else {
            this.notifySvc.error(this.i18nSvc.fanyi('common.notify.edit-fail'), message.msg);
          }
          this.loadGroupConvergeTable();
          this.tableLoading = false;
        },
        error => {
          this.tableLoading = false;
          this.notifySvc.error(this.i18nSvc.fanyi('common.notify.edit-fail'), error.msg);
        }
      );
  }

  onDeleteGroupConverges() {
    if (this.checkedConvergeIds == null || this.checkedConvergeIds.size === 0) {
      this.notifySvc.warning(this.i18nSvc.fanyi('common.notify.no-select-delete'), '');
      return;
    }
    this.modal.confirm({
      nzTitle: this.i18nSvc.fanyi('common.confirm.delete-batch'),
      nzOkText: this.i18nSvc.fanyi('common.button.ok'),
      nzCancelText: this.i18nSvc.fanyi('common.button.cancel'),
      nzOkDanger: true,
      nzOkType: 'primary',
      nzClosable: false,
      nzOnOk: () => this.deleteGroupConverges(this.checkedConvergeIds)
    });
  }

  onDeleteOneGroupConverge(id: number) {
    let ids = new Set<number>();
    ids.add(id);
    this.modal.confirm({
      nzTitle: this.i18nSvc.fanyi('common.confirm.delete'),
      nzOkText: this.i18nSvc.fanyi('common.button.ok'),
      nzCancelText: this.i18nSvc.fanyi('common.button.cancel'),
      nzOkDanger: true,
      nzOkType: 'primary',
      nzClosable: false,
      nzOnOk: () => this.deleteGroupConverges(ids)
    });
  }

  deleteGroupConverges(convergeIds: Set<number>) {
    if (convergeIds == null || convergeIds.size == 0) {
      this.notifySvc.warning(this.i18nSvc.fanyi('common.notify.no-select-delete'), '');
      return;
    }
    this.tableLoading = true;
    const deleteDefines$ = this.alertConvergeService.deleteAlertGroupConverges(convergeIds).subscribe(
      message => {
        deleteDefines$.unsubscribe();
        if (message.code === 0) {
          this.notifySvc.success(this.i18nSvc.fanyi('common.notify.delete-success'), '');
          this.updatePageIndex(convergeIds.size);
          this.loadGroupConvergeTable();
        } else {
          this.tableLoading = false;
          this.notifySvc.error(this.i18nSvc.fanyi('common.notify.delete-fail'), message.msg);
        }
      },
      error => {
        this.tableLoading = false;
        deleteDefines$.unsubscribe();
        this.notifySvc.error(this.i18nSvc.fanyi('common.notify.delete-fail'), error.msg);
      }
    );
  }

  updatePageIndex(delSize: number) {
    const lastPage = Math.max(1, Math.ceil((this.total - delSize) / this.pageSize));
    this.pageIndex = this.pageIndex > lastPage ? lastPage : this.pageIndex;
  }

  // begin: List multiple choice paging
  checkedAll: boolean = false;
  onAllChecked(checked: boolean) {
    if (checked) {
      this.groupConverges.forEach(item => this.checkedConvergeIds.add(item.id));
    } else {
      this.checkedConvergeIds.clear();
    }
  }
  onItemChecked(id: number, checked: boolean) {
    if (checked) {
      this.checkedConvergeIds.add(id);
    } else {
      this.checkedConvergeIds.delete(id);
    }
  }
  /**
   * Paging callback
   *
   * @param params page info
   */
  onTablePageChange(params: NzTableQueryParams) {
    const { pageSize, pageIndex, sort, filter } = params;
    this.pageIndex = pageIndex;
    this.pageSize = pageSize;
    this.loadGroupConvergeTable();
  }
  // end: List multiple choice paging

  // start -- new or update alert-converge model
  isManageModalVisible = false;
  isManageModalOkLoading = false;
  isManageModalAdd = true;
  groupConverge: AlertGroupConverge = new AlertGroupConverge();

  onNewGroupConverge() {
    this.groupConverge = new AlertGroupConverge();
    this.groupConverge.groupLabels = [''];
    this.isManageModalAdd = true;
    this.isManageModalVisible = true;
    this.isManageModalOkLoading = false;
  }
  onManageModalCancel() {
    this.isManageModalVisible = false;
  }

  editGroupConverge(convergeId: number) {
    this.isManageModalAdd = false;
    this.isManageModalOkLoading = false;
    const getConverge$ = this.alertConvergeService
      .getAlertGroupConverge(convergeId)
      .pipe(
        finalize(() => {
          getConverge$.unsubscribe();
        })
      )
      .subscribe(
        message => {
          if (message.code === 0) {
            this.groupConverge = message.data;
            if (!Array.isArray(this.groupConverge.groupLabels) || this.groupConverge.groupLabels.length === 0) {
              this.groupConverge.groupLabels = [''];
            }
            this.isManageModalVisible = true;
          } else {
            this.notifySvc.error(this.i18nSvc.fanyi('common.notify.edit-fail'), message.msg);
          }
        },
        error => {
          this.notifySvc.error(this.i18nSvc.fanyi('common.notify.edit-fail'), error.msg);
        }
      );
  }
  onManageModalOk() {
    // Validate required form fields
    if (this.ruleForm?.invalid) {
      Object.values(this.ruleForm.controls).forEach(control => {
        if (control.invalid) {
          control.markAsDirty();
          control.updateValueAndValidity({ onlySelf: true });
        }
      });
      return;
    }

    this.isManageModalOkLoading = true;
    if (this.isManageModalAdd) {
      const modalOk$ = this.alertConvergeService
        .newAlertGroupConverge(this.groupConverge)
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
              this.loadGroupConvergeTable();
            } else {
              this.notifySvc.error(this.i18nSvc.fanyi('common.notify.new-fail'), message.msg);
            }
          },
          error => {
            this.notifySvc.error(this.i18nSvc.fanyi('common.notify.new-fail'), error.msg);
          }
        );
    } else {
      const modalOk$ = this.alertConvergeService
        .editAlertGroupConverge(this.groupConverge)
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
              this.loadGroupConvergeTable();
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
