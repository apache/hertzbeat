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
import { NzTableQueryParams } from 'ng-zorro-antd/table';

import { GroupAlert } from '../../../pojo/GroupAlert';
import { AlertService } from '../../../service/alert.service';

@Component({
  selector: 'app-alert-center',
  templateUrl: './alert-center.component.html',
  styleUrl: './alert-center.component.less'
})
export class AlertCenterComponent implements OnInit {
  constructor(
    private notifySvc: NzNotificationService,
    private modal: NzModalService,
    private alertSvc: AlertService,
    @Inject(ALAIN_I18N_TOKEN) private i18nSvc: I18NService
  ) {}

  pageIndex: number = 1;
  pageSize: number = 8;
  total: number = 0;
  groupAlerts!: GroupAlert[];
  tableLoading: boolean = false;
  checkedAlertIds = new Set<number>();
  filterStatus: string = 'firing';
  filterPriority: number = 9;
  filterContent: string | undefined;

  ngOnInit(): void {
    this.loadAlertsTable();
  }

  sync() {
    this.loadAlertsTable();
  }

  loadAlertsTable() {
    this.tableLoading = true;
    let alertsInit$ = this.alertSvc.loadGroupAlerts(this.filterStatus, this.filterContent, this.pageIndex - 1, this.pageSize).subscribe(
      message => {
        this.tableLoading = false;
        if (message.code === 0) {
          let page = message.data;
          this.groupAlerts = page.content;
          this.groupAlerts.forEach(alert => {
            if (alert.alerts == undefined) {
              alert.alerts = [];
            }
          });
          this.pageIndex = page.number + 1;
          this.total = page.totalElements;
        } else {
          console.warn(message.msg);
        }
        alertsInit$.unsubscribe();
      },
      error => {
        this.tableLoading = false;
        alertsInit$.unsubscribe();
        console.error(error.msg);
      }
    );
  }

  onDeleteAlerts() {
    if (this.checkedAlertIds == null || this.checkedAlertIds.size === 0) {
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
      nzOnOk: () => this.deleteAlerts(this.checkedAlertIds)
    });
  }

  onMarkReadAlerts() {
    if (this.checkedAlertIds == null || this.checkedAlertIds.size === 0) {
      this.notifySvc.warning(this.i18nSvc.fanyi('alert.center.notify.no-mark'), '');
      return;
    }
    this.modal.confirm({
      nzTitle: this.i18nSvc.fanyi('alert.center.confirm.mark-done-batch'),
      nzOkText: this.i18nSvc.fanyi('common.button.ok'),
      nzCancelText: this.i18nSvc.fanyi('common.button.cancel'),
      nzOkDanger: true,
      nzOkType: 'primary',
      nzClosable: false,
      nzOnOk: () => this.updateAlertsStatus(this.checkedAlertIds, 'resolved')
    });
  }
  onMarkUnReadAlerts() {
    if (this.checkedAlertIds == null || this.checkedAlertIds.size === 0) {
      this.notifySvc.warning(this.i18nSvc.fanyi('alert.center.notify.no-mark'), '');
      return;
    }
    this.modal.confirm({
      nzTitle: this.i18nSvc.fanyi('alert.center.confirm.mark-no-batch'),
      nzOkText: this.i18nSvc.fanyi('common.button.ok'),
      nzCancelText: this.i18nSvc.fanyi('common.button.cancel'),
      nzOkDanger: true,
      nzOkType: 'primary',
      nzClosable: false,
      nzOnOk: () => this.updateAlertsStatus(this.checkedAlertIds, 'firing')
    });
  }

  onDeleteOneAlert(alertId: number) {
    let alerts = new Set<number>();
    alerts.add(alertId);
    this.modal.confirm({
      nzTitle: this.i18nSvc.fanyi('common.confirm.delete'),
      nzOkText: this.i18nSvc.fanyi('common.button.ok'),
      nzCancelText: this.i18nSvc.fanyi('common.button.cancel'),
      nzOkDanger: true,
      nzOkType: 'primary',
      nzClosable: false,
      nzOnOk: () => this.deleteAlerts(alerts)
    });
  }

  onMarkReadOneAlert(alertId: number) {
    let alerts = new Set<number>();
    alerts.add(alertId);
    this.updateAlertsStatus(alerts, 'resolved');
  }

  onMarkUnReadOneAlert(alertId: number) {
    let alerts = new Set<number>();
    alerts.add(alertId);
    this.updateAlertsStatus(alerts, 'firing');
  }

  deleteAlerts(alertIds: Set<number>) {
    this.tableLoading = true;
    const deleteAlerts$ = this.alertSvc.deleteGroupAlerts(alertIds).subscribe(
      message => {
        deleteAlerts$.unsubscribe();
        if (message.code === 0) {
          this.notifySvc.success(this.i18nSvc.fanyi('common.notify.delete-success'), '');
          this.updatePageIndex(alertIds.size);
          this.loadAlertsTable();
        } else {
          this.tableLoading = false;
          this.notifySvc.error(this.i18nSvc.fanyi('common.notify.delete-fail'), message.msg);
        }
      },
      error => {
        this.tableLoading = false;
        deleteAlerts$.unsubscribe();
        this.notifySvc.error(this.i18nSvc.fanyi('common.notify.delete-fail'), error.msg);
      }
    );
  }

  updatePageIndex(delSize: number) {
    const lastPage = Math.max(1, Math.ceil((this.total - delSize) / this.pageSize));
    this.pageIndex = this.pageIndex > lastPage ? lastPage : this.pageIndex;
  }

  updateAlertsStatus(alertIds: Set<number>, status: string) {
    this.tableLoading = true;
    const markAlertsStatus$ = this.alertSvc.applyGroupAlertsStatus(alertIds, status).subscribe(
      message => {
        markAlertsStatus$.unsubscribe();
        if (message.code === 0) {
          this.notifySvc.success(this.i18nSvc.fanyi('common.notify.mark-success'), '');
          this.loadAlertsTable();
        } else {
          this.tableLoading = false;
          this.notifySvc.error(this.i18nSvc.fanyi('common.notify.mark-fail'), message.msg);
        }
      },
      error => {
        this.tableLoading = false;
        markAlertsStatus$.unsubscribe();
        this.notifySvc.error(this.i18nSvc.fanyi('common.notify.mark-fail'), error.msg);
      }
    );
  }

  // begin: List multiple choice paging
  checkedAll: boolean = false;
  onAllChecked(checked: boolean) {
    if (checked) {
      this.groupAlerts.forEach(monitor => this.checkedAlertIds.add(monitor.id));
    } else {
      this.checkedAlertIds.clear();
    }
  }
  onItemChecked(monitorId: number, checked: boolean) {
    if (checked) {
      this.checkedAlertIds.add(monitorId);
    } else {
      this.checkedAlertIds.delete(monitorId);
    }
  }
  // end: List multiple choice paging

  recordEntries(record: Record<any, any>) {
    return Object.entries(record);
  }
}
