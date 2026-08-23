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

import { Component, Inject, NgZone, OnDestroy, OnInit } from '@angular/core';
import { I18NService } from '@core';
import { ALAIN_I18N_TOKEN } from '@delon/theme';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { finalize, Subscription } from 'rxjs';

import { GroupAlert } from '../../../pojo/GroupAlert';
import { AlertService } from '../../../service/alert.service';
import { AuthorizedSseService } from '../../../service/authorized-sse.service';

interface ExtendedGroupAlert extends GroupAlert {
  isNew?: boolean;
}
@Component({
  selector: 'app-alert-center',
  templateUrl: './alert-center.component.html',
  styleUrl: './alert-center.component.less'
})
export class AlertCenterComponent implements OnInit, OnDestroy {
  constructor(
    private notifySvc: NzNotificationService,
    private modal: NzModalService,
    private alertSvc: AlertService,
    private authorizedSseSvc: AuthorizedSseService,
    private ngZone: NgZone,
    @Inject(ALAIN_I18N_TOKEN) private i18nSvc: I18NService
  ) {}

  pageIndex: number = 1;
  pageSize: number = 8;
  total: number = 0;
  groupAlerts: ExtendedGroupAlert[] = [];
  tableLoading: boolean = false;
  checkedAlertIds = new Set<number>();
  filterStatus!: string;
  filterContent: string | undefined;
  exportButtonLoading: boolean = false;
  private alertStream$!: Subscription;

  ngOnInit(): void {
    this.loadAlertsTable();
    this.initSSESubscription();
  }

  ngOnDestroy(): void {
    this.alertStream$?.unsubscribe();
  }

  // Initialize SSE subscription for real-time alerts
  private initSSESubscription(): void {
    // read through AuthorizedSseService rather than EventSource: the stream now requires a
    // credential, and EventSource cannot carry an Authorization header
    this.alertStream$ = this.authorizedSseSvc.stream('/api/alert/sse/subscribe', 'ALERT_EVENT').subscribe({
      next: data => {
        try {
          const newAlert: GroupAlert = JSON.parse(data);
          this.ngZone.run(() => this.updateAlertList(newAlert));
        } catch (error) {
          console.error('Error parsing SSE data:', error);
        }
      },
      error: error => console.error('SSE connection error:', error)
    });
  }

  private updateAlertList(newAlert: GroupAlert): void {
    const extendedAlert: ExtendedGroupAlert = {
      ...newAlert,
      isNew: true
    };

    if (!extendedAlert.alerts) {
      extendedAlert.alerts = [];
    }

    const matchesFilter = this.checkAlertMatchesFilter(extendedAlert);
    if (!matchesFilter) {
      return;
    }

    const existingIndex = this.groupAlerts.findIndex(a => a.id === extendedAlert.id);

    if (existingIndex === -1) {
      this.groupAlerts = [extendedAlert, ...this.groupAlerts];
      this.total += 1;

      setTimeout(() => {
        const index = this.groupAlerts.findIndex(a => a.id === extendedAlert.id);
        if (index !== -1) {
          this.groupAlerts[index].isNew = false;
          // 触发变更检测
          this.groupAlerts = [...this.groupAlerts];
        }
      }, 1000);
    } else {
      this.groupAlerts[existingIndex] = {
        ...extendedAlert,
        isNew: true
      };

      setTimeout(() => {
        if (this.groupAlerts[existingIndex]) {
          this.groupAlerts[existingIndex].isNew = false;
          this.groupAlerts = [...this.groupAlerts];
        }
      }, 1000);

      this.groupAlerts = [...this.groupAlerts];
    }
  }

  private checkAlertMatchesFilter(alert: ExtendedGroupAlert): boolean {
    if (this.filterStatus && alert.status !== this.filterStatus) {
      return false;
    }

    if (this.filterContent) {
      const searchContent = this.filterContent.toLowerCase();

      const hasMatchingContent = alert.alerts?.some(singleAlert => singleAlert.content?.toLowerCase().includes(searchContent));

      const hasMatchingLabels = Object.entries(alert.groupLabels || {}).some(
        ([key, value]) => key.toLowerCase().includes(searchContent) || value.toLowerCase().includes(searchContent)
      );

      if (!hasMatchingContent && !hasMatchingLabels) {
        return false;
      }
    }

    return true;
  }

  loadAlertsTable() {
    this.tableLoading = true;
    let alertsInit$ = this.alertSvc.loadGroupAlerts(this.filterStatus, this.filterContent, this.pageIndex - 1, this.pageSize).subscribe(
      message => {
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
        this.tableLoading = false;
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

  exportAlerts() {
    this.exportButtonLoading = true;
    const exportAlerts$ = this.alertSvc
      .exportAlerts(this.filterStatus, this.filterContent)
      .pipe(
        finalize(() => {
          this.exportButtonLoading = false;
          exportAlerts$.unsubscribe();
        })
      )
      .subscribe(
        response => {
          const body = response.body!;
          if (body.type == 'application/json') {
            this.notifySvc.error(this.i18nSvc.fanyi('common.notify.export-fail'), '');
          } else {
            const blob = new Blob([body], { type: response.headers.get('Content-Type')! });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.download = response.headers.get('Content-Disposition')!.split(';')[1].split('filename=')[1];
            a.href = url;
            a.click();
            window.URL.revokeObjectURL(url);
          }
        },
        error => {
          this.notifySvc.error(this.i18nSvc.fanyi('common.notify.export-fail'), error.msg);
        }
      );
  }
}
