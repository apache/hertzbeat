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

import { Alert } from '../../../pojo/Alert';
import { Tag } from '../../../pojo/Tag';
import { AlertService } from '../../../service/alert.service';

@Component({
  selector: 'app-alert-center',
  templateUrl: './alert-center.component.html',
  styles: []
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
  alerts!: Alert[];
  tableLoading: boolean = false;
  checkedAlertIds = new Set<number>();
  filterStatus: number = 9;
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
    let alertsInit$ = this.alertSvc
      .loadAlerts(this.filterStatus, this.filterPriority, this.filterContent, this.pageIndex - 1, this.pageSize)
      .subscribe(
        message => {
          this.tableLoading = false;
          this.checkedAll = false;
          this.checkedAlertIds.clear();
          if (message.code === 0) {
            let page = message.data;
            this.alerts = page.content;
            this.pageIndex = page.number + 1;
            this.total = page.totalElements;
            if (this.alerts) {
              this.alerts.forEach(item => {
                item.tmp = [];
                if (item.tags != undefined) {
                  Object.keys(item.tags).forEach(name => {
                    item.tmp.push({
                      name: name,
                      tagValue: item.tags[name]
                    });
                  });
                }
              });
            }
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

  renderAlertTarget(target: string): string {
    if (target == undefined || target === '') {
      return target;
    }
    const targets = target.split('.');
    if (targets.length === 3) {
      let app = this.i18nSvc.fanyi(`monitor.app.${targets[0]}`);
      let metrics = this.i18nSvc.fanyi(`monitor.app.${targets[0]}.metrics.${targets[1]}`);
      let metric = this.i18nSvc.fanyi(`monitor.app.${targets[0]}.metrics.${targets[1]}.metric.${targets[2]}`);
      let value = app == `monitor.app.${targets[0]}` ? targets[0] : app;
      value += ` / ${metrics == `monitor.app.${targets[0]}.metrics.${targets[1]}` ? targets[1] : metrics}`;
      value += ` / ${metric == `monitor.app.${targets[0]}.metrics.${targets[1]}.metric.${targets[2]}` ? targets[2] : metric}`;
      return value;
    }
    if (target === 'availability') {
      return this.i18nSvc.fanyi('monitor.availability');
    }
    if (target == 'collectorAvailability') {
      return this.i18nSvc.fanyi('monitor.collector.availability');
    }
    return target;
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

  onClearAllAlerts() {
    this.modal.confirm({
      nzTitle: this.i18nSvc.fanyi('alert.center.confirm.clear-all'),
      nzOkText: this.i18nSvc.fanyi('common.button.ok'),
      nzCancelText: this.i18nSvc.fanyi('common.button.cancel'),
      nzOkDanger: true,
      nzOkType: 'primary',
      nzClosable: false,
      nzOnOk: () => this.clearAllAlerts()
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
      nzOnOk: () => this.updateAlertsStatus(this.checkedAlertIds, 3)
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
      nzOnOk: () => this.updateAlertsStatus(this.checkedAlertIds, 0)
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
    this.updateAlertsStatus(alerts, 3);
  }

  onMarkUnReadOneAlert(alertId: number) {
    let alerts = new Set<number>();
    alerts.add(alertId);
    this.updateAlertsStatus(alerts, 0);
  }

  deleteAlerts(alertIds: Set<number>) {
    this.tableLoading = true;
    const deleteAlerts$ = this.alertSvc.deleteAlerts(alertIds).subscribe(
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

  clearAllAlerts() {
    this.tableLoading = true;
    const deleteAlerts$ = this.alertSvc.clearAlerts().subscribe(
      message => {
        deleteAlerts$.unsubscribe();
        if (message.code === 0) {
          this.notifySvc.success(this.i18nSvc.fanyi('common.notify.clear-success'), '');
          this.loadAlertsTable();
        } else {
          this.tableLoading = false;
          this.notifySvc.error(this.i18nSvc.fanyi('common.notify.clear-fail'), message.msg);
        }
      },
      error => {
        this.tableLoading = false;
        deleteAlerts$.unsubscribe();
        this.notifySvc.error(this.i18nSvc.fanyi('common.notify.clear-fail'), error.msg);
      }
    );
  }

  updateAlertsStatus(alertIds: Set<number>, status: number) {
    this.tableLoading = true;
    const markAlertsStatus$ = this.alertSvc.applyAlertsStatus(alertIds, status).subscribe(
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
      this.alerts.forEach(monitor => this.checkedAlertIds.add(monitor.id));
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
  onTablePageChange(params: NzTableQueryParams) {
    const { pageSize, pageIndex, sort, filter } = params;
    this.pageIndex = pageIndex;
    this.pageSize = pageSize;
    this.loadAlertsTable();
  }
  // end: List multiple choice paging

  sliceTagName(tag: Tag): string {
    if (tag.tagValue != undefined && tag.tagValue.trim() != '') {
      return `${tag.name}:${tag.tagValue}`;
    } else {
      return tag.name;
    }
  }
}
