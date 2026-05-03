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
import { ActivatedRoute, Router } from '@angular/router';
import { I18NService } from '@core';
import { ALAIN_I18N_TOKEN } from '@delon/theme';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { NzTableQueryParams } from 'ng-zorro-antd/table';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';

import { AlertSilence } from '../../../pojo/AlertSilence';
import { SingleAlert } from '../../../pojo/SingleAlert';
import { AlertSilenceService } from '../../../service/alert-silence.service';
import { EntityService } from '../../../service/entity.service';

@Component({
  standalone: false,  selector: 'app-alert-silence',
  templateUrl: './alert-silence.component.html',
  styleUrls: ['./alert-silence.component.less']
})
export class AlertSilenceComponent implements OnInit {
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private modal: NzModalService,
    private notifySvc: NzNotificationService,
    private alertSilenceService: AlertSilenceService,
    private entitySvc: EntityService,
    @Inject(ALAIN_I18N_TOKEN) private i18nSvc: I18NService
  ) {}

  @ViewChild('ruleForm', { static: false }) ruleForm: NgForm | undefined;
  pageIndex: number = 1;
  pageSize: number = 8;
  total: number = 0;
  search!: string;
  silences!: AlertSilence[];
  tableLoading: boolean = true;
  checkedSilenceIds = new Set<number>();
  entityIdContext?: string;
  entityNameContext?: string;
  returnTo?: string;
  returnLabel?: string;
  matchMode?: string;
  matchingRuleType?: 'silence' | 'inhibit';
  matchingRuleIds: number[] = [];
  matchedViewEnabled = false;
  missingMatchedRuleCount = 0;
  authoringMode: 'entity-context' | 'global' = 'global';
  prefillWarning?: string;
  prefillSource: 'alerts-common-labels' | 'none' = 'none';
  createdOutsideMatchedViewNotice = false;
  authoringLoading = false;

  ngOnInit(): void {
    this.applyEntityContext(this.route.snapshot.queryParams);
    this.loadAlertSilenceTable();
  }

  sync() {
    this.loadAlertSilenceTable();
  }

  loadAlertSilenceTable() {
    if (this.shouldUseMatchedView()) {
      this.loadMatchedSilenceTable();
      return;
    }
    this.tableLoading = true;
    let alertDefineInit$ = this.alertSilenceService.getAlertSilences(this.search, this.pageIndex - 1, this.pageSize).subscribe(
      message => {
        this.tableLoading = false;
        this.checkedAll = false;
        this.checkedSilenceIds.clear();
        if (message.code === 0) {
          let page = message.data;
          this.silences = page.content;
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

  private loadMatchedSilenceTable(): void {
    this.tableLoading = true;
    this.checkedAll = false;
    this.checkedSilenceIds.clear();
    if (this.matchingRuleIds.length === 0) {
      this.silences = [];
      this.total = 0;
      this.pageIndex = 1;
      this.missingMatchedRuleCount = 0;
      this.tableLoading = false;
      return;
    }
    const loadMatched$ = forkJoin(this.matchingRuleIds.map(id => this.alertSilenceService.getAlertSilence(id))).subscribe({
      next: messages => {
        const matched = messages
          .filter(message => message.code === 0 && message.data != null)
          .map(message => message.data as AlertSilence);
        this.missingMatchedRuleCount = Math.max(0, this.matchingRuleIds.length - matched.length);
        const filtered = this.filterMatchedSilencesBySearch(matched).sort((left, right) => (right.id || 0) - (left.id || 0));
        this.total = filtered.length;
        const lastPage = Math.max(1, Math.ceil(filtered.length / this.pageSize));
        this.pageIndex = Math.min(this.pageIndex, lastPage);
        const start = (this.pageIndex - 1) * this.pageSize;
        this.silences = filtered.slice(start, start + this.pageSize);
        this.tableLoading = false;
        loadMatched$.unsubscribe();
      },
      error: () => {
        this.silences = [];
        this.total = 0;
        this.pageIndex = 1;
        this.missingMatchedRuleCount = this.matchingRuleIds.length;
        this.tableLoading = false;
        loadMatched$.unsubscribe();
      }
    });
  }

  updateAlertSilence(alertSilence: AlertSilence) {
    this.tableLoading = true;
    const updateDefine$ = this.alertSilenceService
      .editAlertSilence(alertSilence)
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
          this.loadAlertSilenceTable();
          this.tableLoading = false;
        },
        error => {
          this.tableLoading = false;
          this.notifySvc.error(this.i18nSvc.fanyi('common.notify.edit-fail'), error.msg);
        }
      );
  }

  onDeleteAlertSilences() {
    if (this.checkedSilenceIds == null || this.checkedSilenceIds.size === 0) {
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
      nzOnOk: () => this.deleteAlertSilences(this.checkedSilenceIds)
    });
  }

  onDeleteOneAlertSilence(id: number) {
    let ids = new Set<number>();
    ids.add(id);
    this.modal.confirm({
      nzTitle: this.i18nSvc.fanyi('common.confirm.delete'),
      nzOkText: this.i18nSvc.fanyi('common.button.ok'),
      nzCancelText: this.i18nSvc.fanyi('common.button.cancel'),
      nzOkDanger: true,
      nzOkType: 'primary',
      nzClosable: false,
      nzOnOk: () => this.deleteAlertSilences(ids)
    });
  }

  deleteAlertSilences(silenceIds: Set<number>) {
    if (silenceIds == null || silenceIds.size == 0) {
      this.notifySvc.warning(this.i18nSvc.fanyi('common.notify.no-select-delete'), '');
      return;
    }
    this.tableLoading = true;
    const deleteDefines$ = this.alertSilenceService.deleteAlertSilences(silenceIds).subscribe(
      message => {
        deleteDefines$.unsubscribe();
        if (message.code === 0) {
          this.notifySvc.success(this.i18nSvc.fanyi('common.notify.delete-success'), '');
          this.updatePageIndex(silenceIds.size);
          this.loadAlertSilenceTable();
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
      this.silences.forEach(item => this.checkedSilenceIds.add(item.id));
    } else {
      this.checkedSilenceIds.clear();
    }
  }
  onItemChecked(id: number, checked: boolean) {
    if (checked) {
      this.checkedSilenceIds.add(id);
    } else {
      this.checkedSilenceIds.delete(id);
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
    this.loadAlertSilenceTable();
  }
  // end: List multiple choice paging

  // start -- new or update alert silence model
  isManageModalVisible = false;
  isManageModalOkLoading = false;
  isManageModalAdd = true;
  silence: AlertSilence = new AlertSilence();
  matchTags: string[] = [];
  silenceDates!: Date[];
  dayCheckOptions = [
    { label: this.i18nSvc.fanyi('common.week.7'), value: 7, checked: true },
    { label: this.i18nSvc.fanyi('common.week.1'), value: 1, checked: true },
    { label: this.i18nSvc.fanyi('common.week.2'), value: 2, checked: true },
    { label: this.i18nSvc.fanyi('common.week.3'), value: 3, checked: true },
    { label: this.i18nSvc.fanyi('common.week.4'), value: 4, checked: true },
    { label: this.i18nSvc.fanyi('common.week.5'), value: 5, checked: true },
    { label: this.i18nSvc.fanyi('common.week.6'), value: 6, checked: true }
  ];

  onNewAlertSilence() {
    this.prefillWarning = undefined;
    this.prefillSource = 'none';
    this.authoringMode = this.hasEntityContext() ? 'entity-context' : 'global';
    this.createdOutsideMatchedViewNotice = false;
    this.openNewSilenceModalWithDefaults();
    if (this.hasEntityContext()) {
      this.prefillSilenceFromEntityAlerts();
      return;
    }
    this.isManageModalVisible = true;
  }
  onManageModalCancel() {
    this.isManageModalVisible = false;
    this.authoringLoading = false;
  }

  onEditAlertSilence(silenceId: number) {
    if (silenceId == null) {
      this.notifySvc.warning(this.i18nSvc.fanyi('common.notify.no-select-edit'), '');
      return;
    }
    this.editAlertSilence(silenceId);
  }

  editAlertSilence(silenceId: number) {
    this.isManageModalAdd = false;
    this.isManageModalVisible = true;
    this.isManageModalOkLoading = false;
    const getSilence$ = this.alertSilenceService
      .getAlertSilence(silenceId)
      .pipe(
        finalize(() => {
          getSilence$.unsubscribe();
        })
      )
      .subscribe(
        message => {
          if (message.code === 0) {
            this.silence = message.data;
            if (this.silence.type === 0) {
              this.silenceDates = [this.silence.periodStart, this.silence.periodEnd];
            } else {
              this.dayCheckOptions.forEach(item => {
                item.checked = this.silence.days != undefined && this.silence.days.indexOf(item.value) >= 0;
              });
            }
            this.isManageModalVisible = true;
            this.isManageModalAdd = false;
            this.matchTags = [];
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
    if (this.ruleForm?.invalid) {
      Object.values(this.ruleForm.controls).forEach(control => {
        if (control.invalid) {
          control.markAsDirty();
          control.updateValueAndValidity({ onlySelf: true });
        }
      });
      return;
    }
    if (this.silence.type === 0) {
      this.silence.periodStart = this.silenceDates[0];
      this.silence.periodEnd = this.silenceDates[1];
    } else {
      this.silence.days = this.dayCheckOptions
        .filter(item => item.checked)
        .map(item => item.value)
        .concat();
    }
    this.isManageModalOkLoading = true;
    if (this.isManageModalAdd) {
      const modalOk$ = this.alertSilenceService
        .newAlertSilence(this.silence)
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
              this.maybeMarkCreatedOutsideMatchedView();
              this.loadAlertSilenceTable();
            } else {
              this.notifySvc.error(this.i18nSvc.fanyi('common.notify.new-fail'), message.msg);
            }
          },
          error => {
            this.notifySvc.error(this.i18nSvc.fanyi('common.notify.new-fail'), error.msg);
          }
        );
    } else {
      const modalOk$ = this.alertSilenceService
        .editAlertSilence(this.silence)
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
              this.loadAlertSilenceTable();
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
  onFilterChange(): void {
    this.pageIndex = 1;
    this.loadAlertSilenceTable();
  }

  hasEntityAuthoringMode(): boolean {
    return this.authoringMode === 'entity-context' && this.hasEntityContext();
  }

  hasPrefillWarning(): boolean {
    return this.prefillWarning != null && this.prefillWarning.trim() !== '';
  }

  hasCreatedOutsideMatchedViewNotice(): boolean {
    return this.createdOutsideMatchedViewNotice;
  }

  hasEntityContext(): boolean {
    return this.entityIdContext != null || this.entityNameContext != null || this.returnTo != null;
  }

  getEntityContextSummary(): string {
    const segments: string[] = [];
    if (this.matchedViewEnabled) {
      segments.push(this.i18nSvc.fanyi('entity.noise-controls.management.mode.matched'));
    } else if (this.hasMatchingRuleContext()) {
      segments.push(this.i18nSvc.fanyi('entity.noise-controls.management.mode.global'));
    }
    if (this.search) {
      segments.push(`${this.i18nSvc.fanyi('entity.response.context.search')}: ${this.search}`);
    }
    return segments.join(' · ');
  }

  returnToEntity(): void {
    if (!this.returnTo) {
      return;
    }
    this.router.navigateByUrl(this.returnTo);
  }

  private applyEntityContext(queryParams: Record<string, unknown>): void {
    this.entityIdContext = this.readQueryParam(queryParams['entityId']);
    this.entityNameContext = this.readQueryParam(queryParams['entityName']);
    this.returnTo = this.readQueryParam(queryParams['returnTo']);
    this.returnLabel = this.readQueryParam(queryParams['returnLabel']);
    this.matchMode = this.readQueryParam(queryParams['matchMode']);
    const matchingType = this.readQueryParam(queryParams['matchingRuleType']);
    this.matchingRuleType = matchingType === 'silence' || matchingType === 'inhibit' ? matchingType : undefined;
    this.matchingRuleIds = this.parseMatchingRuleIds(queryParams['matchingRuleIds']);
    this.matchedViewEnabled = this.matchMode === 'entity-noise-controls';
    this.missingMatchedRuleCount = 0;
    this.authoringMode = this.hasEntityContext() ? 'entity-context' : 'global';
    const search = this.readQueryParam(queryParams['search']);
    if (search != null) {
      this.search = search;
    }
  }

  hasMatchingRuleContext(): boolean {
    return this.matchMode === 'entity-noise-controls';
  }

  shouldUseMatchedView(): boolean {
    return this.matchedViewEnabled && this.hasMatchingRuleContext();
  }

  canViewAllRules(): boolean {
    return this.hasMatchingRuleContext() && this.matchedViewEnabled;
  }

  canRestoreMatchedRules(): boolean {
    return this.hasMatchingRuleContext() && !this.matchedViewEnabled;
  }

  showEmptyMatchedRuleHint(): boolean {
    return this.shouldUseMatchedView() && this.matchingRuleIds.length === 0;
  }

  showMissingMatchedRuleHint(): boolean {
    return this.shouldUseMatchedView() && this.missingMatchedRuleCount > 0;
  }

  viewAllRules(): void {
    this.matchedViewEnabled = false;
    this.createdOutsideMatchedViewNotice = false;
    this.pageIndex = 1;
    this.loadAlertSilenceTable();
    this.syncManagementQueryParams(false);
  }

  viewMatchedRules(): void {
    if (!this.hasMatchingRuleContext()) {
      return;
    }
    this.matchedViewEnabled = true;
    this.pageIndex = 1;
    this.loadAlertSilenceTable();
    this.syncManagementQueryParams(true);
  }

  private readQueryParam(value: unknown): string | undefined {
    if (typeof value !== 'string') {
      return undefined;
    }
    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
  }

  private parseMatchingRuleIds(value: unknown): number[] {
    if (typeof value !== 'string') {
      return [];
    }
    return value
      .split(',')
      .map(item => Number(item.trim()))
      .filter(id => Number.isFinite(id) && id > 0);
  }

  private filterMatchedSilencesBySearch(silences: AlertSilence[]): AlertSilence[] {
    const keyword = this.search?.trim().toLowerCase();
    if (!keyword) {
      return silences;
    }
    return silences.filter(silence => {
      if (silence.name?.toLowerCase().includes(keyword)) {
        return true;
      }
      return Object.entries(silence.labels || {}).some(([key, value]) => `${key}:${value}`.toLowerCase().includes(keyword));
    });
  }

  private openNewSilenceModalWithDefaults(): void {
    this.silence = new AlertSilence();
    const displayName = this.entityNameContext || this.returnLabel || this.entityIdContext || 'entity';
    this.silence.name = `${displayName} silence`;
    this.silence.enable = true;
    this.silence.matchAll = false;
    this.silence.type = 0;
    this.silence.labels = {};
    const now = new Date();
    const periodEnd = new Date();
    periodEnd.setHours(periodEnd.getHours() + 6);
    this.silenceDates = [now, periodEnd];
    this.dayCheckOptions.forEach(item => (item.checked = true));
    this.isManageModalAdd = true;
    this.isManageModalOkLoading = false;
  }

  private prefillSilenceFromEntityAlerts(): void {
    const entityId = Number(this.entityIdContext);
    if (!Number.isFinite(entityId) || entityId <= 0) {
      this.prefillWarning = this.i18nSvc.fanyi('entity.noise-controls.authoring.prefill-warning.no-entity-id');
      this.isManageModalVisible = true;
      return;
    }
    this.authoringLoading = true;
    const prefill$ = this.entitySvc.getEntityAlerts(entityId, 0, 20, null, 'firing').subscribe({
      next: message => {
        if (message.code === 0) {
          const alerts = message.data?.content || [];
          const commonLabels = this.extractExactCommonLabels(alerts);
          if (alerts.length > 0 && Object.keys(commonLabels).length > 0) {
            this.silence.labels = commonLabels;
            this.prefillSource = 'alerts-common-labels';
          } else {
            this.silence.labels = {};
            this.prefillWarning = this.i18nSvc.fanyi('entity.noise-controls.authoring.silence.prefill-warning');
            this.prefillSource = 'none';
          }
        } else {
          this.silence.labels = {};
          this.prefillWarning = this.i18nSvc.fanyi('entity.noise-controls.authoring.silence.prefill-warning');
          this.prefillSource = 'none';
        }
        this.isManageModalVisible = true;
        this.authoringLoading = false;
        prefill$.unsubscribe();
      },
      error: () => {
        this.silence.labels = {};
        this.prefillWarning = this.i18nSvc.fanyi('entity.noise-controls.authoring.silence.prefill-warning');
        this.prefillSource = 'none';
        this.isManageModalVisible = true;
        this.authoringLoading = false;
        prefill$.unsubscribe();
      }
    });
  }

  private extractExactCommonLabels(alerts: SingleAlert[]): Record<string, string> {
    if (alerts.length === 0) {
      return {};
    }
    const firstLabels = alerts[0]?.labels || {};
    const commonEntries = Object.entries(firstLabels).filter(([key, value]) =>
      alerts.every(alert => alert.labels != null && alert.labels[key] === value)
    );
    return commonEntries.reduce<Record<string, string>>((acc, [key, value]) => {
      acc[key] = value;
      return acc;
    }, {});
  }

  private maybeMarkCreatedOutsideMatchedView(): void {
    this.createdOutsideMatchedViewNotice = this.isManageModalAdd && this.shouldUseMatchedView();
  }

  private syncManagementQueryParams(useMatchedView: boolean): void {
    if (!this.hasEntityContext()) {
      return;
    }
    const queryParams: Record<string, string | null> = {
      entityId: this.entityIdContext || null,
      entityName: this.entityNameContext || null,
      returnTo: this.returnTo || null,
      returnLabel: this.returnLabel || null,
      search: this.search?.trim() ? this.search.trim() : null,
      matchMode: useMatchedView ? this.matchMode || 'entity-noise-controls' : null,
      matchingRuleType: useMatchedView ? this.matchingRuleType || 'silence' : null,
      matchingRuleIds: useMatchedView && this.matchingRuleIds.length > 0 ? this.matchingRuleIds.join(',') : null
    };
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      replaceUrl: true
    });
  }
}
