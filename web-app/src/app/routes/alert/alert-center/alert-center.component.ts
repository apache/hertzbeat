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

import { Component, Inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { I18NService } from '@core';
import { ALAIN_I18N_TOKEN } from '@delon/theme';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { Subscription } from 'rxjs';

import { AlertInhibit } from '../../../pojo/AlertInhibit';
import { AlertSilence } from '../../../pojo/AlertSilence';
import { EntityNoiseControlSummary } from '../../../pojo/EntityDetail';
import { GroupAlert } from '../../../pojo/GroupAlert';
import { AlertInhibitService } from '../../../service/alert-inhibit.service';
import { AlertService } from '../../../service/alert.service';
import { AlertSilenceService } from '../../../service/alert-silence.service';
import { EntityService } from '../../../service/entity.service';
import { PlatformFactsStripItem } from '../../../shared/components/platform-facts-strip/platform-facts-strip.component';

interface ExtendedGroupAlert extends GroupAlert {
  isNew?: boolean;
}

interface AlertResponseResult {
  action: 'resolve' | 'reopen' | 'acknowledge' | 'unacknowledge' | 'silence' | 'inhibit';
  count: number;
}

@Component({
  standalone: false,  selector: 'app-alert-center',
  templateUrl: './alert-center.component.html',
  styleUrl: './alert-center.component.less'
})
export class AlertCenterComponent implements OnInit, OnDestroy {
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private notifySvc: NzNotificationService,
    private modal: NzModalService,
    private alertSvc: AlertService,
    private alertInhibitSvc: AlertInhibitService,
    private alertSilenceSvc: AlertSilenceService,
    private entitySvc: EntityService,
    @Inject(ALAIN_I18N_TOKEN) private i18nSvc: I18NService
  ) {}

  @ViewChild('silenceForm', { static: false }) silenceForm?: NgForm;
  @ViewChild('inhibitForm', { static: false }) inhibitForm?: NgForm;
  pageIndex: number = 1;
  pageSize: number = 8;
  total: number = 0;
  groupAlerts: ExtendedGroupAlert[] = [];
  tableLoading: boolean = false;
  checkedAll: boolean = false;
  checkedAlertIds = new Set<number>();
  filterStatus?: string;
  filterContent: string | undefined;
  filterSeverity: string | undefined;
  readonly severityOptions: string[] = ['critical', 'error', 'warning', 'info', 'unknown'];
  entityIdContext?: string;
  entityNameContext?: string;
  returnTo?: string;
  returnLabel?: string;
  isSilenceModalVisible = false;
  isSilenceModalOkLoading = false;
  silence: AlertSilence = new AlertSilence();
  silenceDates!: Date[];
  silenceSelectionCount = 0;
  silencePrefillWarning?: string;
  silencePreviewLabels: Array<{ key: string; value: string }> = [];
  isInhibitModalVisible = false;
  isInhibitModalOkLoading = false;
  inhibit: AlertInhibit = new AlertInhibit();
  inhibitSelectionCount = 0;
  inhibitPrefillWarning?: string;
  inhibitSourcePreviewLabels: Array<{ key: string; value: string }> = [];
  inhibitTargetPreviewLabels: Array<{ key: string; value: string }> = [];
  dayCheckOptions = [
    { label: this.i18nSvc.fanyi('common.week.7'), value: 7, checked: true },
    { label: this.i18nSvc.fanyi('common.week.1'), value: 1, checked: true },
    { label: this.i18nSvc.fanyi('common.week.2'), value: 2, checked: true },
    { label: this.i18nSvc.fanyi('common.week.3'), value: 3, checked: true },
    { label: this.i18nSvc.fanyi('common.week.4'), value: 4, checked: true },
    { label: this.i18nSvc.fanyi('common.week.5'), value: 5, checked: true },
    { label: this.i18nSvc.fanyi('common.week.6'), value: 6, checked: true }
  ];
  private latestEntityResponseResult?: AlertResponseResult;
  private eventSource!: EventSource;
  private queryParamSub?: Subscription;
  readonly inhibitEqualLabelAllowList = ['alertname', 'instance', 'job', 'service', 'host', 'env'];
  entityNoiseControlSummary?: EntityNoiseControlSummary;

  ngOnInit(): void {
    this.queryParamSub = this.route.queryParams.subscribe(queryParams => {
      this.resetWorkbenchFilters();
      this.applyQueryFilters(queryParams);
      this.loadEntityNoiseControlSummary();
      this.pageIndex = 1;
      this.checkedAlertIds.clear();
      this.loadAlertsTable();
    });
    this.initSSESubscription();
  }

  ngOnDestroy(): void {
    this.queryParamSub?.unsubscribe();
    if (this.eventSource) {
      this.eventSource.close();
    }
  }

  // Initialize SSE subscription for real-time alerts
  private initSSESubscription(): void {
    this.eventSource = new EventSource('/api/alert/sse/subscribe');
    this.eventSource.addEventListener('ALERT_EVENT', (evt: MessageEvent) => {
      try {
        const newAlert: GroupAlert = JSON.parse(evt.data);
        this.updateAlertList(newAlert);
      } catch (error) {
        console.error('Error parsing SSE data:', error);
      }
    });

    // Handle SSE errors
    this.eventSource.onerror = error => {
      console.error('SSE connection error:', error);
      this.eventSource.close();
    };
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
      this.sortGroupAlertsForWorkbench();

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
      this.sortGroupAlertsForWorkbench();

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

    if (this.filterSeverity) {
      const severity = this.filterSeverity.toLowerCase();
      const hasMatchingSeverity = (alert.alerts || []).some(singleAlert => this.getAlertSeverity(singleAlert) === severity);
      if (!hasMatchingSeverity) {
        return false;
      }
    }

    return true;
  }

  loadAlertsTable() {
    this.tableLoading = true;
    let alertsInit$ = this.alertSvc
      .loadGroupAlerts(this.filterStatus, this.filterContent, this.filterSeverity, this.pageIndex - 1, this.pageSize)
      .subscribe(
      message => {
        if (message.code === 0) {
          let page = message.data;
          this.groupAlerts = page.content;
          this.groupAlerts.forEach(alert => {
            if (alert.alerts == undefined) {
              alert.alerts = [];
            }
          });
          this.sortGroupAlertsForWorkbench();
          this.checkedAll = false;
          this.checkedAlertIds.clear();
          this.pageIndex = page.number + 1;
          this.total = page.totalElements;
          if (this.hasEntityContext()) {
            this.loadEntityNoiseControlSummary();
          }
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

  acknowledgeOneAlert(alertId: number) {
    const alerts = new Set<number>();
    alerts.add(alertId);
    this.updateAlertsStatus(alerts, 'acknowledged');
  }

  unacknowledgeOneAlert(alertId: number) {
    const alerts = new Set<number>();
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
          this.rememberEntityResponseResult(this.mapAlertStatusAction(status), alertIds.size);
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

  onAllChecked(checked: boolean): void {
    if (checked) {
      this.groupAlerts.forEach(group => this.checkedAlertIds.add(group.id));
    } else {
      this.checkedAlertIds.clear();
    }
    this.checkedAll = checked;
  }

  onItemChecked(alertId: number, checked: boolean): void {
    if (checked) {
      this.checkedAlertIds.add(alertId);
    } else {
      this.checkedAlertIds.delete(alertId);
    }
    this.syncCheckedAll();
  }

  getSelectedAlertCount(): number {
    return this.checkedAlertIds.size;
  }

  getSelectedAlertStatusCount(status: string): number {
    return this.getSelectedAlertIdsByStatus(status).size;
  }

  resolveSelectedEntityAlerts(): void {
    const selectedIds = this.getSelectedAlertIdsByStatus('firing');
    if (selectedIds.size === 0) {
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
      nzOnOk: () => this.updateAlertsStatus(selectedIds, 'resolved')
    });
  }

  reopenSelectedEntityAlerts(): void {
    const selectedIds = this.getSelectedAlertIdsByStatus('resolved');
    if (selectedIds.size === 0) {
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
      nzOnOk: () => this.updateAlertsStatus(selectedIds, 'firing')
    });
  }

  acknowledgeSelectedEntityAlerts(): void {
    const selectedIds = this.getSelectedAlertIdsByStatus('firing');
    if (selectedIds.size === 0) {
      this.notifySvc.warning(this.i18nSvc.fanyi('alert.center.notify.no-mark'), '');
      return;
    }
    this.modal.confirm({
      nzTitle: this.i18nSvc.fanyi('entity.alert.workbench.confirm.acknowledge-selected'),
      nzOkText: this.i18nSvc.fanyi('common.button.ok'),
      nzCancelText: this.i18nSvc.fanyi('common.button.cancel'),
      nzOkType: 'primary',
      nzClosable: false,
      nzOnOk: () => this.updateAlertsStatus(selectedIds, 'acknowledged')
    });
  }

  unacknowledgeSelectedEntityAlerts(): void {
    const selectedIds = this.getSelectedAlertIdsByStatus('acknowledged');
    if (selectedIds.size === 0) {
      this.notifySvc.warning(this.i18nSvc.fanyi('alert.center.notify.no-mark'), '');
      return;
    }
    this.modal.confirm({
      nzTitle: this.i18nSvc.fanyi('entity.alert.workbench.confirm.unacknowledge-selected'),
      nzOkText: this.i18nSvc.fanyi('common.button.ok'),
      nzCancelText: this.i18nSvc.fanyi('common.button.cancel'),
      nzOkType: 'primary',
      nzClosable: false,
      nzOnOk: () => this.updateAlertsStatus(selectedIds, 'firing')
    });
  }

  openCreateSilenceForAlert(group: ExtendedGroupAlert): void {
    this.openCreateSilenceModal([group]);
  }

  openCreateSilenceForSelectedAlerts(): void {
    const selectedGroups = this.groupAlerts.filter(group => this.checkedAlertIds.has(group.id));
    if (selectedGroups.length === 0) {
      this.notifySvc.warning(this.i18nSvc.fanyi('common.notify.no-select-edit'), '');
      return;
    }
    this.openCreateSilenceModal(selectedGroups);
  }

  openCreateInhibitForAlert(group: ExtendedGroupAlert): void {
    this.openCreateInhibitModal([group]);
  }

  openCreateInhibitForSelectedAlerts(): void {
    const selectedGroups = this.groupAlerts.filter(group => this.checkedAlertIds.has(group.id));
    if (selectedGroups.length === 0) {
      this.notifySvc.warning(this.i18nSvc.fanyi('common.notify.no-select-edit'), '');
      return;
    }
    this.openCreateInhibitModal(selectedGroups);
  }

  onSilenceModalCancel(): void {
    this.isSilenceModalVisible = false;
  }

  onInhibitModalCancel(): void {
    this.isInhibitModalVisible = false;
  }

  onSilenceModalOk(): void {
    if (this.silenceForm?.invalid) {
      Object.values(this.silenceForm.controls).forEach(control => {
        if (control.invalid) {
          control.markAsDirty();
          control.updateValueAndValidity({ onlySelf: true });
        }
      });
      return;
    }
    if (!this.silence.matchAll && !this.hasSilenceLabels()) {
      this.notifySvc.warning(this.i18nSvc.fanyi('validation.required'), '');
      return;
    }
    if (this.silence.type === 0) {
      this.silence.periodStart = this.silenceDates[0];
      this.silence.periodEnd = this.silenceDates[1];
      this.silence.days = [];
    } else {
      this.silence.days = this.dayCheckOptions.filter(item => item.checked).map(item => item.value).concat();
    }
    this.isSilenceModalOkLoading = true;
    const silenceOk$ = this.alertSilenceSvc.newAlertSilence(this.silence).subscribe(
      message => {
        silenceOk$.unsubscribe();
        this.isSilenceModalOkLoading = false;
        if (message.code === 0) {
          this.isSilenceModalVisible = false;
          this.rememberEntityResponseResult('silence', this.silenceSelectionCount);
          this.notifySvc.success(this.i18nSvc.fanyi('common.notify.new-success'), '');
          this.checkedAlertIds.clear();
          this.checkedAll = false;
          this.loadAlertsTable();
        } else {
          this.notifySvc.error(this.i18nSvc.fanyi('common.notify.new-fail'), message.msg);
        }
      },
      error => {
        this.isSilenceModalOkLoading = false;
        silenceOk$.unsubscribe();
        this.notifySvc.error(this.i18nSvc.fanyi('common.notify.new-fail'), error?.msg || error?.message || '');
      }
    );
  }

  onInhibitModalOk(): void {
    if (this.inhibitForm?.invalid) {
      Object.values(this.inhibitForm.controls).forEach(control => {
        if (control.invalid) {
          control.markAsDirty();
          control.updateValueAndValidity({ onlySelf: true });
        }
      });
      return;
    }
    if (!this.hasInhibitLabels(this.inhibit.sourceLabels) || !this.hasInhibitLabels(this.inhibit.targetLabels) || !this.hasInhibitEqualLabels()) {
      this.notifySvc.warning(this.i18nSvc.fanyi('validation.required'), '');
      return;
    }
    this.isInhibitModalOkLoading = true;
    const inhibitOk$ = this.alertInhibitSvc.newAlertInhibit(this.inhibit).subscribe(
      message => {
        inhibitOk$.unsubscribe();
        this.isInhibitModalOkLoading = false;
        if (message.code === 0) {
          this.isInhibitModalVisible = false;
          this.rememberEntityResponseResult('inhibit', this.inhibitSelectionCount);
          this.notifySvc.success(this.i18nSvc.fanyi('common.notify.new-success'), '');
          this.checkedAlertIds.clear();
          this.checkedAll = false;
          this.loadAlertsTable();
        } else {
          this.notifySvc.error(this.i18nSvc.fanyi('common.notify.new-fail'), message.msg);
        }
      },
      error => {
        this.isInhibitModalOkLoading = false;
        inhibitOk$.unsubscribe();
        this.notifySvc.error(this.i18nSvc.fanyi('common.notify.new-fail'), error?.msg || error?.message || '');
      }
    );
  }

  private resetWorkbenchFilters(): void {
    this.filterStatus = undefined;
    this.filterContent = undefined;
    this.filterSeverity = undefined;
    this.entityIdContext = undefined;
    this.entityNameContext = undefined;
    this.returnTo = undefined;
    this.returnLabel = undefined;
    this.latestEntityResponseResult = undefined;
    this.entityNoiseControlSummary = undefined;
  }

  private applyQueryFilters(queryParams: Record<string, unknown>): void {
    const queryContent = this.readQueryParam(queryParams['content']) || this.readQueryParam(queryParams['search']);
    const queryStatus = this.readQueryParam(queryParams['status']);
    const querySeverity = this.readQueryParam(queryParams['severity']);
    this.entityIdContext = this.readQueryParam(queryParams['entityId']);
    this.entityNameContext = this.readQueryParam(queryParams['entityName']);
    this.returnTo = this.readQueryParam(queryParams['returnTo']);
    this.returnLabel = this.readQueryParam(queryParams['returnLabel']);
    if (queryContent != null) {
      this.filterContent = queryContent;
    }
    if (queryStatus === 'firing' || queryStatus === 'resolved' || queryStatus === 'acknowledged') {
      this.filterStatus = queryStatus;
    } else if (this.hasEntityContext()) {
      this.filterStatus = 'firing';
    }
    if (querySeverity != null) {
      this.filterSeverity = querySeverity;
    }
  }

  private readQueryParam(value: unknown): string | undefined {
    if (typeof value !== 'string') {
      return undefined;
    }
    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
  }

  getAlertSeverity(alert: { labels?: Record<string, string>; annotations?: Record<string, string> }): string | undefined {
    const severity = alert.labels?.['severity'] || alert.annotations?.['severity'];
    return severity == null ? undefined : severity.trim().toLowerCase();
  }

  hasActiveWorkbenchFilters(): boolean {
    return !!(this.filterContent || this.filterStatus || this.filterSeverity);
  }

  clearWorkbenchFilters(): void {
    this.filterContent = undefined;
    this.filterSeverity = undefined;
    this.filterStatus = this.hasEntityContext() ? 'firing' : undefined;
    this.pageIndex = 1;
    this.loadAlertsTable();
  }

  getAlertGroupCountByStatus(status: string): number {
    return this.groupAlerts.filter(group => group.status === status).length;
  }

  get alertConsoleFacts(): PlatformFactsStripItem[] {
    return [
      {
        label: this.i18nSvc.fanyi('alert.workbench.total'),
        value: String(this.total)
      },
      {
        label: this.i18nSvc.fanyi('alert.workbench.firing'),
        value: String(this.getAlertGroupCountByStatus('firing')),
        tone: 'critical'
      },
      {
        label: this.i18nSvc.fanyi('alert.workbench.acknowledged'),
        value: String(this.getAlertGroupCountByStatus('acknowledged')),
        tone: 'warning'
      },
      {
        label: this.i18nSvc.fanyi('alert.workbench.resolved'),
        value: String(this.getAlertGroupCountByStatus('resolved')),
        tone: 'success'
      }
    ];
  }

  getWorkbenchHeaderCopy(): string {
    if (this.hasEntityContext()) {
      return this.i18nSvc.fanyi('alert.workbench.copy.entity');
    }
    return this.i18nSvc.fanyi('alert.workbench.copy');
  }

  hasEntityContext(): boolean {
    return this.entityIdContext != null || this.entityNameContext != null || this.returnTo != null;
  }

  getEntityContextSummary(): string {
    const segments: string[] = [];
    if (this.filterStatus) {
      segments.push(`${this.i18nSvc.fanyi('entity.response.context.status')}: ${this.filterStatus}`);
    }
    if (this.filterSeverity) {
      segments.push(`${this.i18nSvc.fanyi('entity.response.context.severity')}: ${this.filterSeverity}`);
    }
    if (this.filterContent) {
      segments.push(`${this.i18nSvc.fanyi('entity.response.context.search')}: ${this.filterContent}`);
    }
    return segments.join(' · ');
  }

  hasNoiseControlVisibility(): boolean {
    return this.entityNoiseControlSummary != null
      && (
        this.entityNoiseControlSummary.activeSilenceCount > 0
        || this.entityNoiseControlSummary.matchingInhibitCount > 0
        || this.entityNoiseControlSummary.possibleAlertSuppression
      );
  }

  getNoiseControlSummaryTitle(): string {
    if (!this.hasNoiseControlVisibility()) {
      return '';
    }
    if ((this.entityNoiseControlSummary?.possibleAlertSuppression ?? false) && this.total === 0) {
      return this.i18nSvc.fanyi('entity.alert.workbench.noise-controls.title.suppressed');
    }
    return this.i18nSvc.fanyi('entity.alert.workbench.noise-controls.title.active');
  }

  getNoiseControlSummaryCopy(): string {
    if (!this.hasNoiseControlVisibility()) {
      return '';
    }
    const summary = this.entityNoiseControlSummary!;
    if (summary.possibleAlertSuppression && this.total === 0) {
      return this.i18nSvc.fanyi('entity.alert.workbench.noise-controls.copy.suppressed', {
        silenceCount: summary.activeSilenceCount,
        inhibitCount: summary.matchingInhibitCount
      });
    }
    return this.i18nSvc.fanyi('entity.alert.workbench.noise-controls.copy.active', {
      silenceCount: summary.activeSilenceCount,
      inhibitCount: summary.matchingInhibitCount
    });
  }

  getSilenceManagementActionLabel(): string {
    if ((this.entityNoiseControlSummary?.possibleAlertSuppression ?? false) && (this.entityNoiseControlSummary?.activeSilenceCount ?? 0) === 0) {
      return this.i18nSvc.fanyi('entity.detail.noise-controls.manage-silence-create');
    }
    return this.i18nSvc.fanyi('entity.detail.noise-controls.manage-silence');
  }

  getInhibitManagementActionLabel(): string {
    if ((this.entityNoiseControlSummary?.possibleAlertSuppression ?? false) && (this.entityNoiseControlSummary?.matchingInhibitCount ?? 0) === 0) {
      return this.i18nSvc.fanyi('entity.detail.noise-controls.manage-inhibit-create');
    }
    return this.i18nSvc.fanyi('entity.detail.noise-controls.manage-inhibit');
  }

  openSilenceManagement(): void {
    this.router.navigate(['/alert/silence'], { queryParams: this.buildNoiseControlManagementQueryParams('silence') });
  }

  openInhibitManagement(): void {
    this.router.navigate(['/alert/inhibit'], { queryParams: this.buildNoiseControlManagementQueryParams('inhibit') });
  }

  getEntityAlertSeverityEntries(): Array<{ severity: string; count: number }> {
    const distribution = new Map<string, number>();
    this.groupAlerts.forEach(group =>
      (group.alerts || []).forEach(alert => {
        const severity = this.getAlertSeverity(alert) || 'unknown';
        distribution.set(severity, (distribution.get(severity) || 0) + 1);
      })
    );
    return Array.from(distribution.entries())
      .map(([severity, count]) => ({ severity, count }))
      .sort((left, right) => this.severityPriority(right.severity) - this.severityPriority(left.severity));
  }

  getEntityLatestAlertChangeAt(): number | string | undefined {
    return this.groupAlerts
      .flatMap(group => [group.gmtUpdate, ...(group.alerts || []).map(alert => alert.activeAt || alert.endAt || alert.gmtCreate)])
      .filter(value => value != null)
      .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0];
  }

  getEntityAlertWorkbenchNarrative(): string {
    if (this.total === 0) {
      if (this.filterStatus !== 'resolved' && this.filterStatus !== 'acknowledged'
        && (this.entityNoiseControlSummary?.possibleAlertSuppression ?? false) && this.hasNoiseControlVisibility()) {
        return this.i18nSvc.fanyi('entity.alert.workbench.copy.empty.noise-controls');
      }
      if (this.filterStatus === 'acknowledged') {
        return this.i18nSvc.fanyi('entity.alert.workbench.copy.empty.acknowledged');
      }
      return this.i18nSvc.fanyi('entity.alert.workbench.copy.empty');
    }
    if (this.filterStatus === 'acknowledged') {
      return this.i18nSvc.fanyi('entity.alert.workbench.copy.acknowledged', {
        total: this.total
      });
    }
    if (this.hasNoiseControlVisibility()) {
      if ((this.entityNoiseControlSummary?.possibleAlertSuppression ?? false)) {
        return this.i18nSvc.fanyi('entity.alert.workbench.copy.priority.noise-controls', {
          total: this.total
        });
      }
      return this.i18nSvc.fanyi('entity.alert.workbench.copy.active.noise-controls', {
        total: this.total
      });
    }
    if (this.total === 1 && this.filterStatus !== 'resolved') {
      return this.i18nSvc.fanyi('entity.alert.workbench.copy.single');
    }
    const highestSeverity = this.getEntityAlertSeverityEntries()[0]?.severity;
    if (highestSeverity) {
      return this.i18nSvc.fanyi('entity.alert.workbench.copy.priority', {
        severity: highestSeverity.toUpperCase(),
        total: this.total
      });
    }
    return this.i18nSvc.fanyi('entity.alert.workbench.copy.default', { total: this.total });
  }

  getEntityAlertWorkbenchModeLabel(): string {
    if (this.filterStatus === 'acknowledged') {
      return this.i18nSvc.fanyi('entity.alert.workbench.mode.acknowledged');
    }
    if (this.filterStatus === 'resolved') {
      return this.i18nSvc.fanyi('entity.alert.workbench.mode.resolved');
    }
    return this.i18nSvc.fanyi('entity.alert.workbench.mode.firing');
  }

  getAlertGroupTriageReason(group: ExtendedGroupAlert): string {
    const severity = this.getGroupPrimarySeverity(group);
    if (group.status === 'acknowledged') {
      return this.i18nSvc.fanyi('entity.alert.workbench.reason.acknowledged');
    }
    if (group.status === 'resolved') {
      return this.i18nSvc.fanyi('entity.alert.workbench.reason.resolved');
    }
    if (this.total === 1) {
      return this.i18nSvc.fanyi('entity.alert.workbench.reason.single');
    }
    if (severity != null && this.severityPriority(severity) >= 4) {
      return this.i18nSvc.fanyi('entity.alert.workbench.reason.high-severity', {
        severity: severity.toUpperCase()
      });
    }
    if (this.groupLatestTimestamp(group) > 0) {
      return this.i18nSvc.fanyi('entity.alert.workbench.reason.recent-change');
    }
    return this.i18nSvc.fanyi('entity.alert.workbench.reason.default');
  }

  returnToEntity(): void {
    if (this.returnTo == null) {
      return;
    }
    this.router.navigateByUrl(this.buildEntityReturnUrl());
  }

  private syncCheckedAll(): void {
    this.checkedAll = this.groupAlerts.length > 0 && this.groupAlerts.every(group => this.checkedAlertIds.has(group.id));
  }

  private getSelectedAlertIdsByStatus(status: string): Set<number> {
    return new Set(
      this.groupAlerts
        .filter(group => group.status === status && this.checkedAlertIds.has(group.id))
        .map(group => group.id)
    );
  }

  private sortGroupAlertsForWorkbench(): void {
    if (!this.hasEntityContext()) {
      return;
    }
    this.groupAlerts = [...this.groupAlerts].sort((left, right) => {
      const severityGap = this.groupPrimarySeverityPriority(right) - this.groupPrimarySeverityPriority(left);
      if (severityGap !== 0) {
        return severityGap;
      }
      return this.groupLatestTimestamp(right) - this.groupLatestTimestamp(left);
    });
  }

  private groupPrimarySeverityPriority(group: ExtendedGroupAlert): number {
    return Math.max(...(group.alerts || []).map(alert => this.severityPriority(this.getAlertSeverity(alert))), 0);
  }

  private getGroupPrimarySeverity(group: ExtendedGroupAlert): string | undefined {
    return (group.alerts || [])
      .map(alert => this.getAlertSeverity(alert))
      .filter((severity): severity is string => severity != null)
      .sort((left, right) => this.severityPriority(right) - this.severityPriority(left))[0];
  }

  private groupLatestTimestamp(group: ExtendedGroupAlert): number {
    const timestamps = [group.gmtUpdate, ...(group.alerts || []).map(alert => alert.activeAt || alert.endAt || alert.gmtCreate)]
      .filter(value => value != null)
      .map(value => new Date(value).getTime());
    return timestamps.length > 0 ? Math.max(...timestamps) : 0;
  }

  private severityPriority(severity?: string): number {
    switch ((severity || '').toLowerCase()) {
      case 'critical':
      case 'fatal':
      case 'emergency':
      case 'severe':
        return 5;
      case 'error':
      case 'high':
        return 4;
      case 'warning':
      case 'warn':
      case 'medium':
        return 3;
      case 'info':
      case 'low':
        return 2;
      case 'debug':
      case 'trace':
        return 1;
      default:
        return 0;
    }
  }

  private rememberEntityResponseResult(action: AlertResponseResult['action'], count: number): void {
    if (!this.hasEntityContext() || count <= 0) {
      return;
    }
    this.latestEntityResponseResult = { action, count };
  }

  getAlertStatusColor(status?: string): string {
    switch ((status || '').toLowerCase()) {
      case 'firing':
        return 'error';
      case 'acknowledged':
        return 'warning';
      case 'resolved':
        return 'success';
      default:
        return 'default';
    }
  }

  getAlertStatusLabel(status?: string): string {
    const normalized = (status || '').toLowerCase();
    if (normalized === 'acknowledged') {
      return this.i18nSvc.fanyi('alert.status.acknowledged');
    }
    if (normalized === 'resolved') {
      return this.i18nSvc.fanyi('alert.status.resolved');
    }
    return this.i18nSvc.fanyi('alert.status.firing');
  }

  getAcknowledgeSelectedActionLabel(): string {
    return this.i18nSvc.fanyi('entity.alert.workbench.action.acknowledge-selected', {
      count: this.getSelectedAlertStatusCount('firing')
    });
  }

  getUnacknowledgeSelectedActionLabel(): string {
    return this.i18nSvc.fanyi('entity.alert.workbench.action.unacknowledge-selected', {
      count: this.getSelectedAlertStatusCount('acknowledged')
    });
  }

  private mapAlertStatusAction(status: string): AlertResponseResult['action'] {
    switch (status) {
      case 'resolved':
        return 'resolve';
      case 'acknowledged':
        return 'acknowledge';
      case 'firing':
      default:
        return this.filterStatus === 'acknowledged' ? 'unacknowledge' : 'reopen';
    }
  }

  private openCreateSilenceModal(groups: ExtendedGroupAlert[]): void {
    const labels = this.buildSharedSilenceLabels(groups);
    this.silence = new AlertSilence();
    this.silence.enable = true;
    this.silence.matchAll = false;
    this.silence.type = 0;
    this.silence.labels = labels;
    this.silenceSelectionCount = groups.length;
    this.silence.name = this.buildSilenceName();
    this.silencePreviewLabels = Object.entries(labels).map(([key, value]) => ({ key, value }));
    this.silencePrefillWarning =
      Object.keys(labels).length === 0
        ? this.i18nSvc.fanyi('entity.alert.workbench.silence.warning.empty-labels')
        : undefined;
    const now = new Date();
    const later = new Date(now.getTime());
    later.setHours(later.getHours() + 6);
    this.silenceDates = [now, later];
    this.dayCheckOptions.forEach(item => (item.checked = true));
    this.isSilenceModalVisible = true;
    this.isSilenceModalOkLoading = false;
  }

  private buildSharedSilenceLabels(groups: ExtendedGroupAlert[]): Record<string, string> {
    return this.buildSharedGroupLabels(groups);
  }

  private openCreateInhibitModal(groups: ExtendedGroupAlert[]): void {
    const labels = this.buildSharedGroupLabels(groups);
    this.inhibit = new AlertInhibit();
    this.inhibit.enable = true;
    this.inhibit.name = this.buildInhibitName();
    this.inhibit.sourceLabels = { ...labels };
    this.inhibit.targetLabels = this.buildInhibitTargetLabels(labels);
    this.inhibit.equalLabels = this.buildInhibitEqualLabels(labels);
    this.inhibitSelectionCount = groups.length;
    this.inhibitSourcePreviewLabels = this.mapLabelPreview(this.inhibit.sourceLabels);
    this.inhibitTargetPreviewLabels = this.mapLabelPreview(this.inhibit.targetLabels);
    this.inhibitPrefillWarning =
      Object.keys(labels).length === 0 || this.inhibit.equalLabels.length === 0
        ? this.i18nSvc.fanyi('entity.alert.workbench.inhibit.warning.empty-labels')
        : undefined;
    this.isInhibitModalVisible = true;
    this.isInhibitModalOkLoading = false;
  }

  private buildSharedGroupLabels(groups: ExtendedGroupAlert[]): Record<string, string> {
    if (groups.length === 0) {
      return {};
    }
    const initial = groups[0].groupLabels || {};
    return groups.slice(1).reduce<Record<string, string>>((intersection, group) => {
      const nextLabels = group.groupLabels || {};
      return Object.entries(intersection).reduce<Record<string, string>>((acc, [key, value]) => {
        if (nextLabels[key] === value) {
          acc[key] = value;
        }
        return acc;
      }, {});
    }, { ...initial });
  }

  private buildSilenceName(): string {
    const entityName = this.entityNameContext || this.returnLabel || this.entityIdContext || 'entity';
    return `${entityName} silence`;
  }

  private buildInhibitName(): string {
    const entityName = this.entityNameContext || this.returnLabel || this.entityIdContext || 'entity';
    return `${entityName} inhibit`;
  }

  private hasSilenceLabels(): boolean {
    return this.silence.labels != null && Object.keys(this.silence.labels).length > 0;
  }

  copyInhibitSourceToTarget(): void {
    this.inhibit.targetLabels = { ...(this.inhibit.sourceLabels || {}) };
    this.refreshInhibitPreviewState();
  }

  useInhibitTargetWithoutSeverity(): void {
    this.inhibit.targetLabels = this.buildInhibitTargetLabels(this.inhibit.sourceLabels || {});
    this.refreshInhibitPreviewState();
  }

  clearInhibitTarget(): void {
    this.inhibit.targetLabels = {};
    this.refreshInhibitPreviewState();
  }

  clearInhibitEqualLabels(): void {
    this.inhibit.equalLabels = [];
    this.refreshInhibitPreviewState();
  }

  onInhibitSourceLabelsChange(): void {
    this.refreshInhibitPreviewState();
  }

  onInhibitTargetLabelsChange(): void {
    this.refreshInhibitPreviewState();
  }

  onInhibitEqualLabelsChange(): void {
    this.refreshInhibitPreviewState();
  }

  private refreshInhibitPreviewState(): void {
    this.inhibitSourcePreviewLabels = this.mapLabelPreview(this.inhibit.sourceLabels);
    this.inhibitTargetPreviewLabels = this.mapLabelPreview(this.inhibit.targetLabels);
    this.inhibitPrefillWarning =
      !this.hasInhibitLabels(this.inhibit.sourceLabels) || !this.hasInhibitEqualLabels()
        ? this.i18nSvc.fanyi('entity.alert.workbench.inhibit.warning.empty-labels')
        : undefined;
  }

  private buildInhibitTargetLabels(labels: Record<string, string>): Record<string, string> {
    return Object.entries(labels).reduce<Record<string, string>>((acc, [key, value]) => {
      if (key !== 'severity') {
        acc[key] = value;
      }
      return acc;
    }, {});
  }

  private buildInhibitEqualLabels(labels: Record<string, string>): string[] {
    return Object.keys(labels).filter(key => this.inhibitEqualLabelAllowList.includes(key));
  }

  private hasInhibitLabels(labels?: Record<string, string>): boolean {
    return labels != null && Object.keys(labels).length > 0;
  }

  private hasInhibitEqualLabels(): boolean {
    return (this.inhibit.equalLabels || []).length > 0;
  }

  private mapLabelPreview(labels?: Record<string, string>): Array<{ key: string; value: string }> {
    return Object.entries(labels || {}).map(([key, value]) => ({ key, value }));
  }

  private loadEntityNoiseControlSummary(): void {
    const entityId = Number(this.entityIdContext);
    if (!this.hasEntityContext() || !Number.isFinite(entityId) || entityId <= 0) {
      this.entityNoiseControlSummary = undefined;
      return;
    }
    this.entitySvc.getEntityDetail(entityId).subscribe({
      next: message => {
        this.entityNoiseControlSummary = message.code === 0 ? message.data?.noiseControlSummary : undefined;
      },
      error: () => {
        this.entityNoiseControlSummary = undefined;
      }
    });
  }

  private buildNoiseControlManagementQueryParams(ruleType: 'silence' | 'inhibit'): Record<string, string> {
    const params: Record<string, string> = {};
    if (this.entityIdContext) {
      params.entityId = this.entityIdContext;
    }
    const entityName = this.entityNameContext || this.returnLabel;
    if (entityName) {
      params.entityName = entityName;
    }
    if (this.returnTo) {
      params.returnTo = this.returnTo;
    }
    if (this.returnLabel) {
      params.returnLabel = this.returnLabel;
    }
    params.matchMode = 'entity-noise-controls';
    params.matchingRuleType = ruleType;
    const matchingRules =
      ruleType === 'silence'
        ? this.entityNoiseControlSummary?.activeSilences || []
        : this.entityNoiseControlSummary?.matchingInhibits || [];
    const matchingRuleIds = matchingRules
      .map(rule => rule.id)
      .filter((id): id is number => typeof id === 'number' && Number.isFinite(id) && id > 0);
    if (matchingRuleIds.length > 0) {
      params.matchingRuleIds = matchingRuleIds.join(',');
    }
    return params;
  }

  private buildEntityReturnUrl(): string {
    if (this.returnTo == null) {
      return '';
    }
    if (this.latestEntityResponseResult == null) {
      return this.returnTo;
    }
    const [pathAndQuery, hashFragment] = this.returnTo.split('#', 2);
    const [path, currentQuery] = pathAndQuery.split('?', 2);
    const params = new URLSearchParams(currentQuery || '');
    params.set('responseResultKind', 'alerts');
    params.set('responseResultAction', this.latestEntityResponseResult.action);
    params.set('responseResultCount', `${this.latestEntityResponseResult.count}`);
    const queryString = params.toString();
    return `${path}${queryString !== '' ? `?${queryString}` : ''}${hashFragment ? `#${hashFragment}` : ''}`;
  }
}
