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

import { AlertInhibit } from '../../../pojo/AlertInhibit';
import { SingleAlert } from '../../../pojo/SingleAlert';
import { AlertInhibitService } from '../../../service/alert-inhibit.service';
import { EntityService } from '../../../service/entity.service';

@Component({
  standalone: false,  selector: 'app-alert-inhibit',
  templateUrl: './alert-inhibit.component.html',
  styleUrl: './alert-inhibit.component.less'
})
export class AlertInhibitComponent implements OnInit {
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private modal: NzModalService,
    private notifySvc: NzNotificationService,
    private alertInhibitService: AlertInhibitService,
    private entitySvc: EntityService,
    @Inject(ALAIN_I18N_TOKEN) private i18nSvc: I18NService
  ) {}

  @ViewChild('ruleForm', { static: false }) ruleForm: NgForm | undefined;
  pageIndex: number = 1;
  pageSize: number = 8;
  total: number = 0;
  search!: string;
  inhibits!: AlertInhibit[];
  tableLoading: boolean = true;
  checkedConvergeIds = new Set<number>();
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

  commonLabels: string[] = ['alertname', 'instance', 'job', 'service', 'host', 'env'];

  ngOnInit(): void {
    this.applyEntityContext(this.route.snapshot.queryParams);
    this.loadInhibitTable();
  }

  sync() {
    this.loadInhibitTable();
  }

  loadInhibitTable() {
    if (this.shouldUseMatchedView()) {
      this.loadMatchedInhibitTable();
      return;
    }
    this.tableLoading = true;
    let alertDefineInit$ = this.alertInhibitService.getAlertInhibits(this.search, this.pageIndex - 1, this.pageSize).subscribe(
      message => {
        this.tableLoading = false;
        this.checkedAll = false;
        this.checkedConvergeIds.clear();
        if (message.code === 0) {
          let page = message.data;
          this.inhibits = page.content;
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

  private loadMatchedInhibitTable(): void {
    this.tableLoading = true;
    this.checkedAll = false;
    this.checkedConvergeIds.clear();
    if (this.matchingRuleIds.length === 0) {
      this.inhibits = [];
      this.total = 0;
      this.pageIndex = 1;
      this.missingMatchedRuleCount = 0;
      this.tableLoading = false;
      return;
    }
    const loadMatched$ = forkJoin(this.matchingRuleIds.map(id => this.alertInhibitService.getAlertInhibit(id))).subscribe({
      next: messages => {
        const matched = messages
          .filter(message => message.code === 0 && message.data != null)
          .map(message => message.data as AlertInhibit);
        this.missingMatchedRuleCount = Math.max(0, this.matchingRuleIds.length - matched.length);
        const filtered = this.filterMatchedInhibitsBySearch(matched).sort((left, right) => (right.id || 0) - (left.id || 0));
        this.total = filtered.length;
        const lastPage = Math.max(1, Math.ceil(filtered.length / this.pageSize));
        this.pageIndex = Math.min(this.pageIndex, lastPage);
        const start = (this.pageIndex - 1) * this.pageSize;
        this.inhibits = filtered.slice(start, start + this.pageSize);
        this.tableLoading = false;
        loadMatched$.unsubscribe();
      },
      error: () => {
        this.inhibits = [];
        this.total = 0;
        this.pageIndex = 1;
        this.missingMatchedRuleCount = this.matchingRuleIds.length;
        this.tableLoading = false;
        loadMatched$.unsubscribe();
      }
    });
  }

  updateInhibit(alertConverge: AlertInhibit) {
    this.tableLoading = true;
    const updateDefine$ = this.alertInhibitService
      .editAlertInhibit(alertConverge)
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
          this.loadInhibitTable();
          this.tableLoading = false;
        },
        error => {
          this.tableLoading = false;
          this.notifySvc.error(this.i18nSvc.fanyi('common.notify.edit-fail'), error.msg);
        }
      );
  }

  onDeleteInhibits() {
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
      nzOnOk: () => this.deleteInhibits(this.checkedConvergeIds)
    });
  }

  onDeleteOneInhibit(id: number) {
    let ids = new Set<number>();
    ids.add(id);
    this.modal.confirm({
      nzTitle: this.i18nSvc.fanyi('common.confirm.delete'),
      nzOkText: this.i18nSvc.fanyi('common.button.ok'),
      nzCancelText: this.i18nSvc.fanyi('common.button.cancel'),
      nzOkDanger: true,
      nzOkType: 'primary',
      nzClosable: false,
      nzOnOk: () => this.deleteInhibits(ids)
    });
  }

  deleteInhibits(convergeIds: Set<number>) {
    if (convergeIds == null || convergeIds.size == 0) {
      this.notifySvc.warning(this.i18nSvc.fanyi('common.notify.no-select-delete'), '');
      return;
    }
    this.tableLoading = true;
    const deleteDefines$ = this.alertInhibitService.deleteAlertInhibits(convergeIds).subscribe(
      message => {
        deleteDefines$.unsubscribe();
        if (message.code === 0) {
          this.notifySvc.success(this.i18nSvc.fanyi('common.notify.delete-success'), '');
          this.updatePageIndex(convergeIds.size);
          this.loadInhibitTable();
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
      this.inhibits.forEach(item => this.checkedConvergeIds.add(item.id));
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
    this.loadInhibitTable();
  }
  // end: List multiple choice paging

  // start -- new or update alert-converge model
  isManageModalVisible = false;
  isManageModalOkLoading = false;
  isManageModalAdd = true;
  alertInhibit: AlertInhibit = new AlertInhibit();

  onNewInhibit() {
    this.prefillWarning = undefined;
    this.prefillSource = 'none';
    this.authoringMode = this.hasEntityContext() ? 'entity-context' : 'global';
    this.createdOutsideMatchedViewNotice = false;
    this.openNewInhibitModalWithDefaults();
    if (this.hasEntityContext()) {
      this.prefillInhibitFromEntityAlerts();
      return;
    }
    this.isManageModalVisible = true;
  }
  onManageModalCancel() {
    this.isManageModalVisible = false;
    this.authoringLoading = false;
  }

  editInhibit(convergeId: number) {
    this.isManageModalAdd = false;
    this.isManageModalOkLoading = false;
    const getConverge$ = this.alertInhibitService
      .getAlertInhibit(convergeId)
      .pipe(
        finalize(() => {
          getConverge$.unsubscribe();
        })
      )
      .subscribe(
        message => {
          if (message.code === 0) {
            this.alertInhibit = message.data;
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
      const modalOk$ = this.alertInhibitService
        .newAlertInhibit(this.alertInhibit)
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
              this.loadInhibitTable();
            } else {
              this.notifySvc.error(this.i18nSvc.fanyi('common.notify.new-fail'), message.msg);
            }
          },
          error => {
            this.notifySvc.error(this.i18nSvc.fanyi('common.notify.new-fail'), error.msg);
          }
        );
    } else {
      const modalOk$ = this.alertInhibitService
        .editAlertInhibit(this.alertInhibit)
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
              this.loadInhibitTable();
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
    this.loadInhibitTable();
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
    this.loadInhibitTable();
    this.syncManagementQueryParams(false);
  }

  viewMatchedRules(): void {
    if (!this.hasMatchingRuleContext()) {
      return;
    }
    this.matchedViewEnabled = true;
    this.pageIndex = 1;
    this.loadInhibitTable();
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

  private filterMatchedInhibitsBySearch(inhibits: AlertInhibit[]): AlertInhibit[] {
    const keyword = this.search?.trim().toLowerCase();
    if (!keyword) {
      return inhibits;
    }
    return inhibits.filter(inhibit => {
      if (inhibit.name?.toLowerCase().includes(keyword)) {
        return true;
      }
      const sourceHit = Object.entries(inhibit.sourceLabels || {}).some(([key, value]) => `${key}:${value}`.toLowerCase().includes(keyword));
      const targetHit = Object.entries(inhibit.targetLabels || {}).some(([key, value]) => `${key}:${value}`.toLowerCase().includes(keyword));
      const equalHit = (inhibit.equalLabels || []).some(label => label.toLowerCase().includes(keyword));
      return sourceHit || targetHit || equalHit;
    });
  }

  copySourceLabelsToTarget(): void {
    this.alertInhibit.targetLabels = { ...(this.alertInhibit.sourceLabels || {}) };
  }

  removeSeverityFromTarget(): void {
    const nextTarget = { ...(this.alertInhibit.targetLabels || {}) };
    delete nextTarget.severity;
    this.alertInhibit.targetLabels = nextTarget;
  }

  clearTargetLabels(): void {
    this.alertInhibit.targetLabels = {};
  }

  clearEqualLabels(): void {
    this.alertInhibit.equalLabels = [];
  }

  private openNewInhibitModalWithDefaults(): void {
    this.alertInhibit = new AlertInhibit();
    const displayName = this.entityNameContext || this.returnLabel || this.entityIdContext || 'entity';
    this.alertInhibit.name = `${displayName} inhibit`;
    this.alertInhibit.enable = true;
    this.alertInhibit.sourceLabels = {};
    this.alertInhibit.targetLabels = {};
    this.alertInhibit.equalLabels = [];
    this.isManageModalAdd = true;
    this.isManageModalOkLoading = false;
  }

  private prefillInhibitFromEntityAlerts(): void {
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
            this.alertInhibit.sourceLabels = commonLabels;
            this.alertInhibit.targetLabels = this.removeSeverityFromLabelMap(commonLabels);
            this.alertInhibit.equalLabels = Object.keys(commonLabels).filter(label => this.commonLabels.includes(label));
            this.prefillSource = 'alerts-common-labels';
          } else {
            this.alertInhibit.sourceLabels = {};
            this.alertInhibit.targetLabels = {};
            this.alertInhibit.equalLabels = [];
            this.prefillWarning = this.i18nSvc.fanyi('entity.noise-controls.authoring.inhibit.prefill-warning');
            this.prefillSource = 'none';
          }
        } else {
          this.alertInhibit.sourceLabels = {};
          this.alertInhibit.targetLabels = {};
          this.alertInhibit.equalLabels = [];
          this.prefillWarning = this.i18nSvc.fanyi('entity.noise-controls.authoring.inhibit.prefill-warning');
          this.prefillSource = 'none';
        }
        this.isManageModalVisible = true;
        this.authoringLoading = false;
        prefill$.unsubscribe();
      },
      error: () => {
        this.alertInhibit.sourceLabels = {};
        this.alertInhibit.targetLabels = {};
        this.alertInhibit.equalLabels = [];
        this.prefillWarning = this.i18nSvc.fanyi('entity.noise-controls.authoring.inhibit.prefill-warning');
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

  private removeSeverityFromLabelMap(labels: Record<string, string>): Record<string, string> {
    const nextLabels = { ...labels };
    delete nextLabels.severity;
    return nextLabels;
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
      matchingRuleType: useMatchedView ? this.matchingRuleType || 'inhibit' : null,
      matchingRuleIds: useMatchedView && this.matchingRuleIds.length > 0 ? this.matchingRuleIds.join(',') : null
    };
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      replaceUrl: true
    });
  }
}
