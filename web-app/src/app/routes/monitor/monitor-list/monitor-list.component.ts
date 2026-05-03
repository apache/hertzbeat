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

import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { I18NService } from '@core';
import { ALAIN_I18N_TOKEN, MenuService } from '@delon/theme';
import { NzModalService } from 'ng-zorro-antd/modal';
import { ModalButtonOptions } from 'ng-zorro-antd/modal/modal-types';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { NzUploadChangeParam } from 'ng-zorro-antd/upload';
import { finalize } from 'rxjs/operators';

import { OpsWorkspaceFacade } from '../../../core/ops-workspace/ops-workspace.facade';
import { CodeNavigationHint, EntityDetail, MetricCorrelationHint } from '../../../pojo/EntityDetail';
import { Monitor } from '../../../pojo/Monitor';
import { EntityService } from '../../../service/entity.service';
import { MemoryStorageService } from '../../../service/memory-storage.service';
import { MonitorService } from '../../../service/monitor.service';
import { WorkspaceShellTab } from '../../../shared/components/workspace-shell/workspace-shell.component';
import {
  WorkspaceGuidanceAction,
  WorkspaceGuidanceLink,
  WorkspaceGuidanceReason
} from '../../../shared/components/workspace-guidance-panel/workspace-guidance-panel.component';
import { PlatformFactsStripItem } from '../../../shared/components/platform-facts-strip/platform-facts-strip.component';
import { PlatformStageMetaChipItem } from '../../../shared/components/platform-stage-meta-header/platform-stage-meta-header.component';
import { PlatformSupportActionItem } from '../../../shared/components/platform-support-action-bar/platform-support-action-bar.component';
import { buildCodeNavigationUrl } from '../../../shared/utils/code-navigation.util';
import { findDeepestSelected, renderLabelColor } from '../../../shared/utils/common-util';

interface MonitorResponseResult {
  action: 'pause' | 'resume';
  count: number;
}

@Component({
  standalone: false,  selector: 'app-monitor-list',
  templateUrl: './monitor-list.component.html',
  styleUrls: ['./monitor-list.component.less']
})
export class MonitorListComponent implements OnInit, OnDestroy {
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private modal: NzModalService,
    private notifySvc: NzNotificationService,
    private monitorSvc: MonitorService,
    private entitySvc: EntityService,
    private storageSvc: MemoryStorageService,
    private menuService: MenuService,
    @Inject(ALAIN_I18N_TOKEN) private i18nSvc: I18NService,
    private opsWorkspace: OpsWorkspaceFacade
  ) {}

  isDefaultListMenu!: boolean;
  app!: string | undefined;
  labels!: string | undefined;
  pageIndex: number = 1;
  pageSize: number = 8;
  total: number = 0;
  monitors!: Monitor[];
  tableLoading: boolean = true;
  checkedMonitorIds = new Set<number>();
  isSwitchExportTypeModalVisible = false;
  exportJsonButtonLoading = false;
  exportExcelButtonLoading = false;
  filterContent!: string;
  filterStatus: number = 9;
  entityIdContext?: string;
  entityNameContext?: string;
  returnTo?: string;
  returnLabel?: string;
  entityDetailContext?: EntityDetail;
  entityWorkbenchFellBackToAll = false;
  workspaceRailCollapsed = false;
  private entityWorkbenchAutoFallbackEligible = false;
  // app type search filter
  appSwitchModalVisible = false;
  appSwitchModalVisibleType = 0;
  appSearchOrigin: any[] = [];
  appSearchLoading = false;
  intervalId: any;
  // save the current sorting status
  currentSortField: string | null = null;
  currentSortOrder: string | null = null;

  private previousMonitors: Monitor[] = [];
  private readonly GRACE_PERIOD_MS = 5000;
  private latestEntityResponseResult?: MonitorResponseResult;

  switchExportTypeModalFooter: ModalButtonOptions[] = [
    { label: this.i18nSvc.fanyi('common.button.cancel'), type: 'default', onClick: () => (this.isSwitchExportTypeModalVisible = false) }
  ];

  ngOnInit(): void {
    this.menuService.change.subscribe(menus => {
      this.isDefaultListMenu = findDeepestSelected(menus).link === '/monitors';
    });
    this.route.queryParamMap.subscribe(paramMap => {
      const appStr = this.readQueryParam(paramMap.get('app'));
      const labelsStr = this.readQueryParam(paramMap.get('labels'));
      const searchContent = this.readQueryParam(paramMap.get('content')) || this.readQueryParam(paramMap.get('search'));
      const statusStr = this.readQueryParam(paramMap.get('status'));
      this.labels = labelsStr;
      this.app = appStr;
      this.filterContent = searchContent || '';
      this.filterStatus = this.parseStatusFilter(statusStr);
      this.entityIdContext = this.readQueryParam(paramMap.get('entityId'));
      this.entityNameContext = this.readQueryParam(paramMap.get('entityName'));
      this.returnTo = this.readQueryParam(paramMap.get('returnTo'));
      this.returnLabel = this.readQueryParam(paramMap.get('returnLabel'));
      this.syncWorkspaceContext({
        entityId: this.entityIdContext,
        entityName: this.entityNameContext,
        content: this.filterContent,
        status: statusStr || undefined,
        returnLabel: this.returnLabel
      });
      this.latestEntityResponseResult = undefined;
      this.loadEntityDetailContext();
      if (statusStr == null && this.hasEntityContext()) {
        this.filterStatus = 2;
      }
      this.entityWorkbenchAutoFallbackEligible = statusStr == null && this.hasEntityContext();
      this.entityWorkbenchFellBackToAll = false;
      this.pageIndex = 1;
      this.pageSize = 8;
      this.checkedMonitorIds = new Set<number>();
      this.tableLoading = true;
      this.loadMonitorTable();
    });
    // Set up an interval to refresh the table every 2 minutes
    this.intervalId = setInterval(() => {
      this.sync();
    }, 120000); // 120000 ms = 2 minutes
  }

  ngOnDestroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    if (this.previousMonitors) {
      this.previousMonitors.forEach(monitor => {
        if (monitor._graceTimer) {
          clearTimeout(monitor._graceTimer);
        }
      });
    }
  }

  onAppChanged(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { ...this.route.snapshot.queryParams, app: this.app },
      queryParamsHandling: 'merge'
    });
  }

  onFilterSearchMonitors() {
    this.tableLoading = true;
    this.entityWorkbenchAutoFallbackEligible = false;
    this.pageIndex = 1;
    this.monitorSvc.searchMonitors(this.app, this.labels, this.filterContent, this.filterStatus, this.pageIndex - 1, this.pageSize).subscribe(
      message => {
        this.tableLoading = false;
        this.checkedAll = false;
        this.checkedMonitorIds.clear();
        if (message.code === 0) {
          let page = message.data;
          this.monitors = page.content;
          this.pageIndex = page.number + 1;
          this.total = page.totalElements;
        } else {
          console.warn(message.msg);
        }
      },
      error => {
        this.tableLoading = false;
        console.error(error.msg);
      }
    );
  }

  sync() {
    this.loadMonitorTable(this.currentSortField, this.currentSortOrder);
  }

  getAppIconName(app: string | undefined): string {
    let hierarchy: any[] = this.storageSvc.getData('hierarchy');
    let find = hierarchy.find((item: { category: string; value: string }) => {
      return item.value == app;
    });
    if (find == undefined) {
      return this.i18nSvc.fanyi('monitor.icon.center');
    }
    let icon = this.i18nSvc.fanyi(`monitor.icon.${find.category}`);
    if (icon == `monitor.icon.${find.category}`) {
      return this.i18nSvc.fanyi('monitor.icon.center');
    }
    return icon;
  }

  loadMonitorTable(sortField?: string | null, sortOrder?: string | null) {
    this.tableLoading = true;
    this.monitorSvc
      .searchMonitors(this.app, this.labels, this.filterContent, this.filterStatus, this.pageIndex - 1, this.pageSize, sortField, sortOrder)
      .subscribe(
        message => {
          if (message.code === 0) {
            let page = message.data;
            if (this.shouldFallbackEntityWorkbench(page.totalElements)) {
              this.entityWorkbenchFellBackToAll = true;
              this.entityWorkbenchAutoFallbackEligible = false;
              this.filterStatus = 9;
              this.loadMonitorTable(sortField, sortOrder);
              return;
            }
            this.monitors = this.reconcileMonitorStates(page.content);
            this.pageIndex = page.number + 1;
            this.total = page.totalElements;
            this.entityWorkbenchAutoFallbackEligible = false;
          } else {
            console.warn(message.msg);
          }
          this.tableLoading = false;
          this.checkedAll = false;
          this.checkedMonitorIds.clear();
        },
        () => {
          this.tableLoading = false;
        }
      );
  }

  hasEntityContext(): boolean {
    return this.entityIdContext != null || this.entityNameContext != null || this.returnTo != null;
  }

  get showWorkspaceRail(): boolean {
    return false;
  }

  get monitorWorkbenchTitle(): string {
    return this.i18nSvc.fanyi('menu.monitor.center');
  }

  get monitorWorkbenchCopy(): string {
    return this.i18nSvc.fanyi(this.hasEntityContext() ? 'monitor.center.console.copy.entity' : 'monitor.center.console.copy');
  }

  get monitorWorkbenchFacts(): PlatformFactsStripItem[] {
    return [
      {
        label: this.i18nSvc.fanyi('monitor.center.console.result.total'),
        value: `${this.total}`
      },
      {
        label: this.i18nSvc.fanyi('monitor.center.console.result.down'),
        value: `${this.getEntityDownMonitorCount()}`,
        tone: this.getEntityDownMonitorCount() > 0 ? 'critical' : 'default'
      },
      {
        label: this.i18nSvc.fanyi('monitor.center.console.result.apps'),
        value: `${this.getMonitorAppTypeCount()}`
      },
      {
        label: this.i18nSvc.fanyi('monitor.center.console.result.filters'),
        value: `${this.activeFilterCount}`,
        tone: this.activeFilterCount > 0 ? 'accent' : 'default'
      }
    ];
  }

  get activeFilterCount(): number {
    let count = 0;
    if (this.hasEntityContext()) {
      count += 1;
    }
    if (this.app) {
      count += 1;
    }
    if (this.labels) {
      count += 1;
    }
    if (this.filterContent) {
      count += 1;
    }
    if (this.filterStatus !== 9) {
      count += 1;
    }
    return count;
  }

  get workspaceGuidanceHeadline(): string {
    if (this.total === 0) {
      return this.t('monitor.center.guidance.headline.empty', '下一步：先确认这个实体是否已经绑定监控');
    }
    if (this.getEntityDownMonitorCount() > 0) {
      return this.t('monitor.center.guidance.headline.down', '下一步：先从异常监控继续定位问题');
    }
    return this.t('monitor.center.guidance.headline.default', '下一步：先核对当前实体的监控覆盖和状态');
  }

  get workspaceGuidanceDescription(): string {
    return this.getEntityMonitorWorkbenchNarrative();
  }

  get workspaceGuidancePrimaryAction(): WorkspaceGuidanceAction {
    return {
      key: 'related-logs',
      label: this.i18nSvc.fanyi('entity.response.open-related-logs'),
      tone: 'primary'
    };
  }

  get workspaceGuidanceSecondaryAction(): WorkspaceGuidanceAction {
    return {
      key: 'related-traces',
      label: this.i18nSvc.fanyi('entity.response.open-related-traces'),
      tone: 'default'
    };
  }

  get workspaceGuidanceReasons(): WorkspaceGuidanceReason[] {
    return [
      {
        label: this.i18nSvc.fanyi('entity.response.context.title'),
        value: this.entityNameContext || this.returnLabel || this.entityIdContext || '-'
      },
      {
        label: this.t('monitor.center.guidance.reason.mode', '当前模式'),
        value: this.getEntityMonitorWorkbenchModeLabel()
      },
      {
        label: this.t('monitor.center.guidance.reason.status', '监控状态'),
        value: `${this.getEntityDownMonitorCount()} / ${this.total}`
      }
    ];
  }

  get workspaceGuidanceNextLinks(): WorkspaceGuidanceLink[] {
    return [
      {
        key: 'return-entity',
        label: this.i18nSvc.fanyi('entity.response.context.return'),
        description: this.t('monitor.center.guidance.next.entity', '回到实体详情，继续在统一上下文里查看治理与证据。'),
        disabled: this.returnTo == null
      },
      {
        key: 'code',
        label: this.i18nSvc.fanyi('entity.response.open-code'),
        description: this.t('monitor.center.guidance.next.code', '如果当前实体上下文已经带出代码位置，可继续打开实现定位。'),
        disabled: !this.getMonitorCodeNavigationUrl()
      }
    ];
  }

  get monitorResultsEmptyTitle(): string {
    return this.t('monitor.center.empty.title', '当前范围内没有监控结果');
  }

  get monitorResultsEmptyCopy(): string {
    if (this.activeFilterCount > 0) {
      return this.t('monitor.center.empty.copy.filtered', '当前筛选条件下没有匹配的监控，可以调整筛选条件后重新查看。');
    }
    return this.t('monitor.center.empty.copy', '当前还没有可展示的监控结果，可以刷新视图或新建监控后再回来查看。');
  }

  get monitorResultsEmptyActionItems(): PlatformSupportActionItem[] {
    const items: PlatformSupportActionItem[] = [
      {
        key: 'refresh',
        label: this.i18nSvc.fanyi('monitor.center.console.action.refresh'),
        tone: 'primary'
      }
    ];
    if (!this.hasEntityContext()) {
      items.push({
        key: 'new',
        label: this.i18nSvc.fanyi('monitor.center.console.action.new'),
        tone: 'default'
      });
    }
    return items;
  }

  onMonitorResultsEmptyAction(actionKey: string): void {
    if (actionKey === 'refresh') {
      this.sync();
      return;
    }
    if (actionKey === 'new') {
      this.onAppSwitchModalOpen();
    }
  }

  get workspaceTabs(): WorkspaceShellTab[] {
    return [];
  }

  onWorkspaceTabSelect(key: string): void {
    switch (key) {
      case 'entity':
        if (this.returnTo) {
          this.router.navigateByUrl(this.buildEntityReturnUrl());
          return;
        }
        if (this.entityIdContext) {
          this.router.navigate(['/entities', this.entityIdContext]);
          return;
        }
        this.router.navigate(['/entities']);
        return;
      case 'logs':
        this.router.navigate(['/log/manage'], { queryParams: this.getLogManageQueryParams() });
        return;
      case 'traces':
        this.router.navigate(['/trace/manage'], { queryParams: this.getTraceCenterQueryParams() });
        return;
      default:
        return;
    }
  }

  viewRelatedLogs(monitor?: Monitor): void {
    const correlation = this.resolveMetricCorrelationHint(monitor);
    const [start, end] = this.resolveMetricTimeWindow(correlation);
    const codeHint = this.buildMonitorCodeNavigationHint(monitor);
    this.router.navigate(['/log/manage'], {
      queryParams: {
        entityId: this.entityIdContext || null,
        entityName: this.entityNameContext || null,
        serviceName: this.pickFirstText(correlation?.serviceName),
        serviceNamespace: this.pickFirstText(correlation?.serviceNamespace),
        environment: this.pickFirstText(correlation?.environment),
        traceId: this.pickFirstText(correlation?.traceId),
        spanId: this.pickFirstText(correlation?.spanId),
        start,
        end,
        search: this.pickFirstText(correlation?.logQuery, correlation?.searchQuery, monitor?.name, monitor?.instance, this.filterContent),
        codeRepo: this.pickFirstText(codeHint?.repositoryUrl),
        codeProvider: this.pickFirstText(codeHint?.provider),
        codePath: this.pickFirstText(codeHint?.defaultPath),
        codeSearch: this.pickFirstText(codeHint?.searchQuery),
        codeLabel: this.pickFirstText(codeHint?.label),
        returnTo: this.router.url,
        returnLabel: this.entityNameContext || this.returnLabel || this.i18nSvc.fanyi('menu.monitor.center')
      }
    });
  }

  viewRelatedTraces(monitor?: Monitor): void {
    const correlation = this.resolveMetricCorrelationHint(monitor);
    const [start, end] = this.resolveMetricTimeWindow(correlation);
    const codeHint = this.buildMonitorCodeNavigationHint(monitor);
    this.router.navigate(['/trace/manage'], {
      queryParams: {
        entityId: this.entityIdContext || null,
        entityName: this.entityNameContext || null,
        traceId: this.pickFirstText(correlation?.traceId),
        spanId: this.pickFirstText(correlation?.spanId),
        serviceName: this.pickFirstText(correlation?.serviceName),
        serviceNamespace: this.pickFirstText(correlation?.serviceNamespace),
        environment: this.pickFirstText(correlation?.environment),
        start,
        end,
        codeRepo: this.pickFirstText(codeHint?.repositoryUrl),
        codeProvider: this.pickFirstText(codeHint?.provider),
        codePath: this.pickFirstText(codeHint?.defaultPath),
        codeSearch: this.pickFirstText(codeHint?.searchQuery),
        codeLabel: this.pickFirstText(codeHint?.label),
        returnTo: this.router.url,
        returnLabel: this.entityNameContext || this.returnLabel || this.i18nSvc.fanyi('menu.monitor.center')
      }
    });
  }

  viewCode(monitor?: Monitor): void {
    const url = this.getMonitorCodeNavigationUrl(monitor);
    if (url == null) {
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  getMonitorCodeNavigationUrl(monitor?: Monitor): string | undefined {
    return buildCodeNavigationUrl(this.buildMonitorCodeNavigationHint(monitor));
  }

  getMonitorCardActionItems(monitor: Monitor): PlatformSupportActionItem[] {
    return [
      {
        key: 'related-logs',
        label: this.i18nSvc.fanyi('entity.response.open-related-logs')
      },
      {
        key: 'related-traces',
        label: this.i18nSvc.fanyi('entity.response.open-related-traces')
      },
      {
        key: 'code',
        label: this.i18nSvc.fanyi('entity.response.open-code'),
        disabled: !this.getMonitorCodeNavigationUrl(monitor)
      }
    ];
  }

  onMonitorCardAction(monitor: Monitor, actionKey: string): void {
    switch (actionKey) {
      case 'related-logs':
        this.viewRelatedLogs(monitor);
        return;
      case 'related-traces':
        this.viewRelatedTraces(monitor);
        return;
      case 'code':
        this.viewCode(monitor);
        return;
      default:
        return;
    }
  }

  getEntityContextSummary(): string {
    const segments: string[] = [];
    if (this.app) {
      segments.push(`${this.i18nSvc.fanyi('entity.response.context.app')}: ${this.app}`);
    }
    if (this.filterStatus !== 9) {
      segments.push(`${this.i18nSvc.fanyi('entity.response.context.status')}: ${this.monitorStatusLabel(this.filterStatus)}`);
    }
    if (this.filterContent) {
      segments.push(`${this.i18nSvc.fanyi('entity.response.context.search')}: ${this.filterContent}`);
    }
    return segments.join(' · ');
  }

  getEntityDownMonitorCount(): number {
    return (this.monitors || []).filter(monitor => !this.isMonitorDisabled(monitor) && monitor.status === 2).length;
  }

  getEntityHealthyMonitorCount(): number {
    return (this.monitors || []).filter(monitor => !this.isMonitorDisabled(monitor) && monitor.status === 1).length;
  }

  getMonitorAppTypeCount(): number {
    const appTypes = new Set<string>();
    (this.monitors || []).forEach(monitor => {
      const app = (monitor.app || '').trim();
      if (app !== '') {
        appTypes.add(app);
      }
    });
    return appTypes.size;
  }

  private loadEntityDetailContext(): void {
    const entityId = this.readEntityIdContext();
    if (entityId == null) {
      this.entityDetailContext = undefined;
      return;
    }
    this.entitySvc.getEntityDetail(entityId).subscribe({
      next: message => {
        this.entityDetailContext = message.code === 0 ? message.data : undefined;
        if (this.entityDetailContext?.entity?.entity != null) {
          const currentEntity = this.entityDetailContext.entity.entity;
          this.opsWorkspace.setSelectedEntity({
            id: `${currentEntity.id}`,
            name: currentEntity.displayName || currentEntity.name,
            type: currentEntity.type || 'entity'
          });
        }
      },
      error: () => {
        this.entityDetailContext = undefined;
      }
    });
  }

  private readEntityIdContext(): number | undefined {
    const entityId = Number(this.entityIdContext || '');
    return Number.isFinite(entityId) && entityId > 0 ? entityId : undefined;
  }

  private resolveMetricCorrelationHint(monitor?: Monitor): MetricCorrelationHint | undefined {
    const preferredEvidence = this.findPreferredMetricEvidence(monitor);
    if (preferredEvidence?.correlationHint) {
      return preferredEvidence.correlationHint;
    }
    const end = Date.now();
    const start = Math.max(0, end - 15 * 60 * 1000);
    const representative = this.findPreferredMetricEvidence();
    const serviceName = this.pickFirstText(
      representative?.correlationHint?.serviceName,
      representative?.identitySnapshot?.serviceName,
      this.entityNameContext
    );
    const serviceNamespace = this.pickFirstText(
      representative?.correlationHint?.serviceNamespace,
      representative?.identitySnapshot?.serviceNamespace
    );
    const environment = this.pickFirstText(
      representative?.correlationHint?.environment,
      representative?.identitySnapshot?.environmentName
    );
    const search = this.pickFirstText(monitor?.name, monitor?.instance, this.filterContent, this.entityNameContext);
    return {
      entityId: this.readEntityIdContext(),
      traceId: undefined,
      spanId: undefined,
      serviceName,
      serviceNamespace,
      environment,
      start,
      end,
      searchQuery: search,
      logQuery: this.pickFirstText(serviceName, search),
      traceQuery: this.pickFirstText(serviceName, search)
    };
  }

  private resolveMetricTimeWindow(correlation?: MetricCorrelationHint): [number, number] {
    const end = Number(correlation?.end);
    const start = Number(correlation?.start);
    if (Number.isFinite(start) && Number.isFinite(end) && start > 0 && end > 0) {
      return [start, end];
    }
    const fallbackEnd = Date.now();
    return [Math.max(0, fallbackEnd - 15 * 60 * 1000), fallbackEnd];
  }

  private findPreferredMetricEvidence(monitor?: Monitor): any | undefined {
    const evidenceList = this.entityDetailContext?.metricEvidence || [];
    return (
      evidenceList.find((evidence: any) => this.metricEvidenceMatchesMonitor(evidence, monitor)) ||
      evidenceList.find((evidence: any) => evidence?.correlationHint || evidence?.codeNavigationHint)
    );
  }

  private metricEvidenceMatchesMonitor(evidence: any, monitor?: Monitor): boolean {
    if (monitor == null || evidence == null) {
      return false;
    }
    const monitorContext = evidence.monitorContext || {};
    const monitorId = Number(monitorContext.monitorId ?? monitorContext.id ?? Number.NaN);
    if (Number.isFinite(monitorId) && monitorId === monitor.id) {
      return true;
    }
    return [evidence.displayName, evidence.metricName, monitorContext.name, monitorContext.instance].some(
      value => this.sameText(value, monitor.name) || this.sameText(value, monitor.instance)
    );
  }

  private buildMonitorCodeNavigationHint(monitor?: Monitor): CodeNavigationHint | undefined {
    const preferredEvidence = this.findPreferredMetricEvidence(monitor);
    const hint = preferredEvidence?.codeNavigationHint;
    const repositoryUrl = this.pickFirstText(hint?.repositoryUrl);
    if (repositoryUrl == null) {
      return undefined;
    }
    return {
      repositoryUrl,
      provider: this.pickFirstText(hint?.provider),
      defaultPath: this.pickFirstText(hint?.defaultPath),
      searchQuery: this.pickFirstText(hint?.searchQuery, monitor?.name, monitor?.instance),
      label: this.pickFirstText(hint?.label, monitor?.name, monitor?.instance)
    };
  }

  private pickFirstText(...values: Array<string | undefined | null>): string | undefined {
    for (const value of values) {
      if (value == null) {
        continue;
      }
      const trimmed = value.trim();
      if (trimmed !== '') {
        return trimmed;
      }
    }
    return undefined;
  }

  private sameText(left?: string | null, right?: string | null): boolean {
    const normalizedLeft = this.pickFirstText(left)?.toLowerCase();
    const normalizedRight = this.pickFirstText(right)?.toLowerCase();
    return normalizedLeft != null && normalizedLeft === normalizedRight;
  }

  getEntityMonitorAppEntries(): Array<{ app: string; count: number }> {
    const distribution = new Map<string, number>();
    (this.monitors || []).forEach(monitor => {
      if (this.isMonitorDisabled(monitor)) {
        return;
      }
      const app = (monitor.app || '').trim();
      if (app === '') {
        return;
      }
      distribution.set(app, (distribution.get(app) || 0) + 1);
    });
    return Array.from(distribution.entries())
      .map(([app, count]) => ({ app, count }))
      .sort((left, right) => right.count - left.count || left.app.localeCompare(right.app))
      .slice(0, 3);
  }

  getEntityMonitorWorkbenchNarrative(): string {
    if (this.total === 0) {
      return this.i18nSvc.fanyi('entity.monitor.workbench.copy.empty');
    }
    if (this.entityWorkbenchFellBackToAll) {
      return this.i18nSvc.fanyi('entity.monitor.workbench.copy.healthy', { total: this.total });
    }
    if (this.filterStatus === 2) {
      return this.i18nSvc.fanyi('entity.monitor.workbench.copy.down', { total: this.total });
    }
    if (this.getEntityDownMonitorCount() > 0) {
      return this.i18nSvc.fanyi('entity.monitor.workbench.copy.mixed', {
        down: this.getEntityDownMonitorCount(),
        total: this.total
      });
    }
    return this.i18nSvc.fanyi('entity.monitor.workbench.copy.healthy', { total: this.total });
  }

  getEntityMonitorWorkbenchModeLabel(): string {
    if (this.entityWorkbenchFellBackToAll) {
      return this.i18nSvc.fanyi('entity.monitor.workbench.mode.fallback');
    }
    if (this.filterStatus === 2) {
      return this.i18nSvc.fanyi('entity.monitor.workbench.mode.down');
    }
    if (this.filterStatus === 0) {
      return this.i18nSvc.fanyi('entity.monitor.workbench.mode.paused');
    }
    if (this.filterStatus === 1) {
      return this.i18nSvc.fanyi('entity.monitor.workbench.mode.healthy');
    }
    return this.i18nSvc.fanyi('entity.monitor.workbench.mode.all');
  }

  getMonitorTriageReason(monitor: Monitor): string {
    if (monitor.status === 2) {
      return this.i18nSvc.fanyi('entity.monitor.workbench.reason.down');
    }
    if (this.entityWorkbenchFellBackToAll) {
      return this.i18nSvc.fanyi('entity.monitor.workbench.reason.fallback');
    }
    if (monitor.status === 0) {
      return this.i18nSvc.fanyi('entity.monitor.workbench.reason.paused');
    }
    return this.i18nSvc.fanyi('entity.monitor.workbench.reason.default');
  }

  getSelectedMonitorCount(): number {
    return this.checkedMonitorIds.size;
  }

  get monitorResultsMetaChips(): PlatformStageMetaChipItem[] {
    return [
      {
        text: `${this.i18nSvc.fanyi('monitor.center.console.result.selected')} ${this.getSelectedMonitorCount()}`,
        tone: 'accent'
      }
    ];
  }

  getSelectedPausedMonitorCount(): number {
    return this.getSelectedMonitorIdsByPredicate(monitor => monitor.status === 0).size;
  }

  getSelectedActiveMonitorCount(): number {
    return this.getSelectedMonitorIdsByPredicate(monitor => monitor.status !== 0).size;
  }

  pauseSelectedEntityMonitors(): void {
    const selectedIds = this.getSelectedMonitorIdsByPredicate(monitor => monitor.status !== 0);
    if (selectedIds.size === 0) {
      this.notifySvc.warning(this.i18nSvc.fanyi('common.notify.no-select-cancel'), '');
      return;
    }
    this.modal.confirm({
      nzTitle: this.i18nSvc.fanyi('common.confirm.cancel-batch'),
      nzOkText: this.i18nSvc.fanyi('common.button.ok'),
      nzCancelText: this.i18nSvc.fanyi('common.button.cancel'),
      nzOkDanger: true,
      nzOkType: 'primary',
      nzClosable: false,
      nzOnOk: () => this.cancelManageMonitors(selectedIds)
    });
  }

  resumeSelectedEntityMonitors(): void {
    const selectedIds = this.getSelectedMonitorIdsByPredicate(monitor => monitor.status === 0);
    if (selectedIds.size === 0) {
      this.notifySvc.warning(this.i18nSvc.fanyi('common.notify.no-select-enable'), '');
      return;
    }
    this.modal.confirm({
      nzTitle: this.i18nSvc.fanyi('common.confirm.enable-batch'),
      nzOkText: this.i18nSvc.fanyi('common.button.ok'),
      nzCancelText: this.i18nSvc.fanyi('common.button.cancel'),
      nzOkDanger: true,
      nzOkType: 'primary',
      nzClosable: false,
      nzOnOk: () => this.enableManageMonitors(selectedIds)
    });
  }

  returnToEntity(): void {
    if (this.returnTo == null) {
      return;
    }
    this.router.navigateByUrl(this.buildEntityReturnUrl());
  }

  onWorkspaceGuidanceAction(actionKey: string): void {
    switch (actionKey) {
      case 'related-logs':
        this.viewRelatedLogs();
        return;
      case 'related-traces':
        this.viewRelatedTraces();
        return;
      default:
        break;
    }
  }

  onWorkspaceGuidanceNext(actionKey: string): void {
    switch (actionKey) {
      case 'return-entity':
        this.returnToEntity();
        return;
      case 'code':
        this.viewCode();
        return;
      default:
        break;
    }
  }

  private getLogManageQueryParams(): Record<string, string | number | null | undefined> {
    const correlation = this.resolveMetricCorrelationHint();
    const [start, end] = this.resolveMetricTimeWindow(correlation);
    return {
      entityId: this.entityIdContext || null,
      entityName: this.entityNameContext || null,
      serviceName: this.pickFirstText(correlation?.serviceName),
      serviceNamespace: this.pickFirstText(correlation?.serviceNamespace),
      environment: this.pickFirstText(correlation?.environment),
      traceId: this.pickFirstText(correlation?.traceId),
      spanId: this.pickFirstText(correlation?.spanId),
      start,
      end,
      search: this.pickFirstText(this.filterContent, correlation?.logQuery, correlation?.searchQuery),
      returnTo: this.router.url,
      returnLabel: this.entityNameContext || this.returnLabel || this.i18nSvc.fanyi('menu.monitor.center')
    };
  }

  private getTraceCenterQueryParams(): Record<string, string | number | null | undefined> {
    const correlation = this.resolveMetricCorrelationHint();
    const [start, end] = this.resolveMetricTimeWindow(correlation);
    return {
      entityId: this.entityIdContext || null,
      entityName: this.entityNameContext || null,
      serviceName: this.pickFirstText(correlation?.serviceName),
      serviceNamespace: this.pickFirstText(correlation?.serviceNamespace),
      environment: this.pickFirstText(correlation?.environment),
      traceId: this.pickFirstText(correlation?.traceId),
      spanId: this.pickFirstText(correlation?.spanId),
      start,
      end,
      returnTo: this.router.url,
      returnLabel: this.entityNameContext || this.returnLabel || this.i18nSvc.fanyi('menu.monitor.center')
    };
  }

  private syncWorkspaceContext(params: Record<string, string | undefined>): void {
    const normalized = Object.entries(params).reduce<Record<string, string>>((acc, [key, value]) => {
      const nextValue = this.pickFirstText(value);
      if (nextValue != null) {
        acc[key] = nextValue;
      }
      return acc;
    }, {});
    this.opsWorkspace.setQueryContext({
      route: this.currentRoutePath(),
      params: normalized
    });
    if (this.entityIdContext != null || this.entityNameContext != null) {
      this.opsWorkspace.setSelectedEntity({
        id: this.entityIdContext || this.entityNameContext || 'entity',
        name: this.entityNameContext || this.entityIdContext || 'Entity',
        type: 'entity'
      });
    }
  }

  private currentRoutePath(): string {
    return this.router.url.split('?')[0] || '/monitors';
  }

  private monitorStatusLabel(status: number): string {
    switch (status) {
      case 0:
        return this.i18nSvc.fanyi('monitor.status.paused');
      case 1:
        return this.i18nSvc.fanyi('monitor.status.up');
      case 2:
        return this.i18nSvc.fanyi('monitor.status.down');
      default:
        return this.i18nSvc.fanyi('monitor.status.all');
    }
  }

  changeMonitorTable(sortField?: string | null, sortOrder?: string | null) {
    this.tableLoading = true;
    this.monitorSvc
      .searchMonitors(this.app, this.labels, this.filterContent, this.filterStatus, this.pageIndex - 1, this.pageSize, sortField, sortOrder)
      .subscribe(
        message => {
          if (message.code === 0) {
            let page = message.data;
            if (this.shouldFallbackEntityWorkbench(page.totalElements)) {
              this.entityWorkbenchFellBackToAll = true;
              this.entityWorkbenchAutoFallbackEligible = false;
              this.filterStatus = 9;
              this.changeMonitorTable(sortField, sortOrder);
              return;
            }
            this.monitors = this.reconcileMonitorStates(page.content);
            this.pageIndex = page.number + 1;
            this.total = page.totalElements;
            this.entityWorkbenchAutoFallbackEligible = false;
          } else {
            console.warn(message.msg);
          }
          this.tableLoading = false;
          this.checkedAll = false;
          this.checkedMonitorIds.clear();
        },
        () => {
          this.tableLoading = false;
        }
      );
  }

  private shouldFallbackEntityWorkbench(totalElements: number): boolean {
    return this.hasEntityContext() && this.entityWorkbenchAutoFallbackEligible && this.filterStatus === 2 && totalElements === 0
      && !this.entityWorkbenchFellBackToAll;
  }

  private rememberEntityResponseResult(action: 'pause' | 'resume', count: number): void {
    if (!this.hasEntityContext() || count <= 0) {
      return;
    }
    this.latestEntityResponseResult = { action, count };
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
    params.set('responseResultKind', 'monitors');
    params.set('responseResultAction', this.latestEntityResponseResult.action);
    params.set('responseResultCount', `${this.latestEntityResponseResult.count}`);
    const queryString = params.toString();
    return `${path}${queryString !== '' ? `?${queryString}` : ''}${hashFragment ? `#${hashFragment}` : ''}`;
  }

  onEditOneMonitor(monitorId: number) {
    if (monitorId == null) {
      this.notifySvc.warning(this.i18nSvc.fanyi('common.notify.no-select-edit'), '');
      return;
    }
    this.router.navigateByUrl(`/monitors/${monitorId}/edit`);
  }

  private parseStatusFilter(value?: string | null): number {
    if (value == null) {
      return 9;
    }
    const normalized = value.trim().toLowerCase();
    switch (normalized) {
      case '':
      case 'all':
      case '全部':
        return 9;
      case '0':
      case 'paused':
      case 'pause':
      case '暂停':
        return 0;
      case '1':
      case 'up':
      case 'healthy':
      case 'normal':
      case '正常':
      case '健康':
        return 1;
      case '2':
      case 'down':
      case 'unhealthy':
      case 'critical':
      case '宕机':
      case '异常':
        return 2;
      default:
        break;
    }
    const parsed = Number(normalized);
    return Number.isNaN(parsed) ? 9 : parsed;
  }

  private readQueryParam(value: string | null): string | undefined {
    if (value == null) {
      return undefined;
    }
    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
  }

  onDeleteOneMonitor(monitorId: number) {
    let monitors = new Set<number>();
    monitors.add(monitorId);
    this.modal.confirm({
      nzTitle: this.i18nSvc.fanyi('common.confirm.delete'),
      nzOkText: this.i18nSvc.fanyi('common.button.ok'),
      nzCancelText: this.i18nSvc.fanyi('common.button.cancel'),
      nzOkDanger: true,
      nzOkType: 'primary',
      nzClosable: false,
      nzOnOk: () => this.deleteMonitors(monitors)
    });
  }

  onDeleteMonitors() {
    if (this.checkedMonitorIds == null || this.checkedMonitorIds.size === 0) {
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
      nzOnOk: () => this.deleteMonitors(this.checkedMonitorIds)
    });
  }

  onExportMonitors() {
    if (this.checkedMonitorIds == null || this.checkedMonitorIds.size == 0) {
      this.notifySvc.warning(this.i18nSvc.fanyi('common.notify.no-select-export'), '');
      return;
    }
    this.isSwitchExportTypeModalVisible = true;
  }

  onExportAllMonitors() {
    this.isSwitchExportTypeModalVisible = true;
  }

  onImportMonitors(info: NzUploadChangeParam): void {
    console.log(info.type);
    if (info.type === 'start') {
      this.notifySvc.info(
        this.i18nSvc.fanyi('common.notice'),
        this.i18nSvc.fanyi('common.notify.import-submitted', { taskName: info.file.name })
      );
    }
    if (info.type === 'success' && info.file.response) {
      this.tableLoading = true;
      const message = info.file.response;
      if (message.code === 0) {
        this.loadMonitorTable();
      } else {
        this.tableLoading = false;
      }
    }
  }

  deleteMonitors(monitors: Set<number>) {
    if (monitors == null || monitors.size == 0) {
      this.notifySvc.warning(this.i18nSvc.fanyi('common.notify.no-select-delete'), '');
      return;
    }
    this.tableLoading = true;
    const deleteMonitors$ = this.monitorSvc.deleteMonitors(monitors).subscribe(
      message => {
        deleteMonitors$.unsubscribe();
        if (message.code === 0) {
          this.notifySvc.success(this.i18nSvc.fanyi('common.notify.delete-success'), '');
          this.updatePageIndex(monitors.size);
          this.loadMonitorTable();
        } else {
          this.tableLoading = false;
          this.notifySvc.error(this.i18nSvc.fanyi('common.notify.delete-fail'), message.msg);
        }
      },
      error => {
        this.tableLoading = false;
        deleteMonitors$.unsubscribe();
        this.notifySvc.error(this.i18nSvc.fanyi('common.notify.delete-fail'), error.msg);
      }
    );
    // delete grafana dashboard
    for (let monitorId of monitors) {
      this.deleteGrafanaDashboard(monitorId);
    }
  }

  updatePageIndex(delSize: number) {
    const lastPage = Math.max(1, Math.ceil((this.total - delSize) / this.pageSize));
    this.pageIndex = this.pageIndex > lastPage ? lastPage : this.pageIndex;
  }

  exportMonitors(type: string) {
    if (this.checkedMonitorIds == null || this.checkedMonitorIds.size == 0) {
      this.notifySvc.warning(this.i18nSvc.fanyi('common.notify.no-select-export'), '');
      return;
    }
    switch (type) {
      case 'JSON':
        this.exportJsonButtonLoading = true;
        break;
      case 'EXCEL':
        this.exportExcelButtonLoading = true;
        break;
    }
    const exportMonitors$ = this.monitorSvc
      .exportMonitors(this.checkedMonitorIds, type)
      .pipe(
        finalize(() => {
          this.exportExcelButtonLoading = false;
          this.exportJsonButtonLoading = false;
          exportMonitors$.unsubscribe();
        })
      )
      .subscribe(
        response => {
          const message = response.body!;
          if (message.type == 'application/json') {
            this.notifySvc.error(this.i18nSvc.fanyi('common.notify.export-fail'), '');
          } else {
            const blob = new Blob([message], { type: response.headers.get('Content-Type')! });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.download = response.headers.get('Content-Disposition')!.split(';')[1].split('filename=')[1];
            a.href = url;
            a.click();
            window.URL.revokeObjectURL(url);
            this.isSwitchExportTypeModalVisible = false;
          }
        },
        error => {
          this.notifySvc.error(this.i18nSvc.fanyi('common.notify.export-fail'), error.msg);
        }
      );
  }

  exportAllMonitors(type: string) {
    switch (type) {
      case 'JSON':
        this.exportJsonButtonLoading = true;
        break;
      case 'EXCEL':
        this.exportExcelButtonLoading = true;
        break;
    }
    const exportAllMonitors$ = this.monitorSvc
      .exportAllMonitors(type)
      .pipe(
        finalize(() => {
          this.exportExcelButtonLoading = false;
          this.exportJsonButtonLoading = false;
          exportAllMonitors$.unsubscribe();
        })
      )
      .subscribe(
        response => {
          const message = response.body!;
          if (message.type == 'application/json') {
            this.notifySvc.error(this.i18nSvc.fanyi('common.notify.export-fail'), '');
          } else {
            const blob = new Blob([message], { type: response.headers.get('Content-Type')! });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.download = response.headers.get('Content-Disposition')!.split(';')[1].split('filename=')[1];
            a.href = url;
            a.click();
            window.URL.revokeObjectURL(url);
            this.isSwitchExportTypeModalVisible = false;
          }
        },
        error => {
          this.notifySvc.error(this.i18nSvc.fanyi('common.notify.export-fail'), error.msg);
        }
      );
  }

  onCancelManageMonitors() {
    if (this.checkedMonitorIds == null || this.checkedMonitorIds.size === 0) {
      this.notifySvc.warning(this.i18nSvc.fanyi('common.notify.no-select-cancel'), '');
      return;
    }
    this.modal.confirm({
      nzTitle: this.i18nSvc.fanyi('common.confirm.cancel-batch'),
      nzOkText: this.i18nSvc.fanyi('common.button.ok'),
      nzCancelText: this.i18nSvc.fanyi('common.button.cancel'),
      nzOkDanger: true,
      nzOkType: 'primary',
      nzClosable: false,
      nzOnOk: () => this.cancelManageMonitors(this.checkedMonitorIds)
    });
  }

  onCancelManageOneMonitor(monitorId: number) {
    let monitors = new Set<number>();
    monitors.add(monitorId);
    this.modal.confirm({
      nzTitle: this.i18nSvc.fanyi('common.confirm.cancel'),
      nzOkText: this.i18nSvc.fanyi('common.button.ok'),
      nzCancelText: this.i18nSvc.fanyi('common.button.cancel'),
      nzOkDanger: true,
      nzOkType: 'primary',
      nzClosable: false,
      nzOnOk: () => this.cancelManageMonitors(monitors)
    });
  }

  cancelManageMonitors(monitors: Set<number>) {
    this.tableLoading = true;
    const cancelManage$ = this.monitorSvc.cancelManageMonitors(monitors).subscribe(
      message => {
        cancelManage$.unsubscribe();
        if (message.code === 0) {
          this.rememberEntityResponseResult('pause', monitors.size);
          this.notifySvc.success(this.i18nSvc.fanyi('common.notify.cancel-success'), '');
          this.loadMonitorTable();
        } else {
          this.tableLoading = false;
          if (message.code === 3) {
            this.notifySvc.warning(this.i18nSvc.fanyi('monitor.item.unavailable.refresh'), '');
            this.loadMonitorTable();
          } else {
            this.notifySvc.error(this.i18nSvc.fanyi('common.notify.cancel-fail'), message.msg);
          }
        }
      },
      error => {
        this.tableLoading = false;
        cancelManage$.unsubscribe();
        if (error.status === 404) {
          this.notifySvc.warning(this.i18nSvc.fanyi('monitor.item.unavailable.refresh'), '');
          this.loadMonitorTable();
        } else {
          this.notifySvc.error(this.i18nSvc.fanyi('common.notify.cancel-fail'), error.msg);
        }
      }
    );
  }

  onEnableManageMonitors() {
    if (this.checkedMonitorIds == null || this.checkedMonitorIds.size === 0) {
      this.notifySvc.warning(this.i18nSvc.fanyi('common.notify.no-select-enable'), '');
      return;
    }
    this.modal.confirm({
      nzTitle: this.i18nSvc.fanyi('common.confirm.enable-batch'),
      nzOkText: this.i18nSvc.fanyi('common.button.ok'),
      nzCancelText: this.i18nSvc.fanyi('common.button.cancel'),
      nzOkDanger: true,
      nzOkType: 'primary',
      nzClosable: false,
      nzOnOk: () => this.enableManageMonitors(this.checkedMonitorIds)
    });
  }

  onEnableManageOneMonitor(monitorId: number) {
    let monitors = new Set<number>();
    monitors.add(monitorId);
    this.modal.confirm({
      nzTitle: this.i18nSvc.fanyi('common.confirm.enable'),
      nzOkText: this.i18nSvc.fanyi('common.button.ok'),
      nzCancelText: this.i18nSvc.fanyi('common.button.cancel'),
      nzOkDanger: true,
      nzOkType: 'primary',
      nzClosable: false,
      nzOnOk: () => this.enableManageMonitors(monitors)
    });
  }

  enableManageMonitors(monitors: Set<number>) {
    this.tableLoading = true;
    const enableManage$ = this.monitorSvc.enableManageMonitors(monitors).subscribe(
      message => {
        enableManage$.unsubscribe();
        if (message.code === 0) {
          this.rememberEntityResponseResult('resume', monitors.size);
          this.notifySvc.success(this.i18nSvc.fanyi('common.notify.enable-success'), '');
          this.loadMonitorTable();
        } else {
          this.tableLoading = false;
          if (message.code === 3) {
            this.notifySvc.warning(this.i18nSvc.fanyi('monitor.item.unavailable.refresh'), '');
            this.loadMonitorTable();
          } else {
            this.notifySvc.error(this.i18nSvc.fanyi('common.notify.enable-fail'), message.msg);
          }
        }
      },
      error => {
        this.tableLoading = false;
        enableManage$.unsubscribe();
        // 检查是否是404错误
        if (error.status === 404) {
          this.notifySvc.warning(this.i18nSvc.fanyi('monitor.item.unavailable.refresh'), '');
          this.loadMonitorTable();
        } else {
          this.notifySvc.error(this.i18nSvc.fanyi('common.notify.enable-fail'), error.msg);
        }
      }
    );
  }

  // begin: List multiple choice paging
  checkedAll: boolean = false;

  onAllChecked(checked: boolean) {
    const currentMonitors = this.monitors || [];
    if (checked) {
      currentMonitors.filter(monitor => !this.isMonitorDisabled(monitor)).forEach(monitor => this.checkedMonitorIds.add(monitor.id));
    } else {
      this.checkedMonitorIds.clear();
    }
    this.checkedAll =
      checked && currentMonitors.filter(monitor => !this.isMonitorDisabled(monitor)).every(monitor => this.checkedMonitorIds.has(monitor.id));
  }

  onItemChecked(monitorId: number, checked: boolean) {
    if (checked) {
      this.checkedMonitorIds.add(monitorId);
    } else {
      this.checkedMonitorIds.delete(monitorId);
    }
    const selectableMonitors = (this.monitors || []).filter(monitor => !this.isMonitorDisabled(monitor));
    this.checkedAll = selectableMonitors.length > 0 && selectableMonitors.every(monitor => this.checkedMonitorIds.has(monitor.id));
  }

  // end: List multiple choice paging

  notifyCopySuccess() {
    this.notifySvc.success(this.i18nSvc.fanyi('common.notify.copy-success'), '');
  }

  onPageIndexChange(pageIndex: number) {
    this.pageIndex = pageIndex;
    this.changeMonitorTable(this.currentSortField, this.currentSortOrder);
  }

  // begin: app type search filter

  onSearchAppClicked() {
    this.appSwitchModalVisibleType = 1;
    this.onAppSwitchModalOpen();
  }

  onAppSwitchModalOpen() {
    this.appSwitchModalVisible = true;
    this.appSearchLoading = true;
    let appMenus: Record<string, any> = {};
    let hierarchy: any[] = this.storageSvc.getData('hierarchy');
    hierarchy.forEach((app: any) => {
      if (app.category == '__system__') {
        return;
      }
      let menus = appMenus[app.category];
      app.categoryLabel = this.i18nSvc.fanyi(`menu.monitor.${app.category}`);
      if (app.categoryLabel == `menu.monitor.${app.category}`) {
        app.categoryLabel = app.category.toUpperCase();
      }
      if (menus == undefined) {
        menus = { label: app.categoryLabel, child: [app] };
      } else {
        menus.child.push(app);
      }
      appMenus[app.category] = menus;
    });
    this.appSearchOrigin = Object.entries(appMenus);
    this.appSearchOrigin.sort((a, b) => {
      return b[1].length - a[1].length;
    });
    this.appSearchLoading = false;
  }

  onAppSwitchModalCancel() {
    this.appSwitchModalVisible = false;
    this.appSwitchModalVisibleType = 0;
  }

  gotoMonitorAddDetail(app: string) {
    if (this.appSwitchModalVisibleType === 1) {
      this.app = app;
      this.onAppChanged();
      this.onAppSwitchModalCancel();
    } else {
      this.router.navigateByUrl(`/monitors/new?app=${app}`);
    }
  }

  // end: app type search filter

  deleteGrafanaDashboard(monitorId: number) {
    this.monitorSvc.deleteGrafanaDashboard(monitorId).subscribe(
      message => {
        if (message.code === 0) {
          console.log('delete grafana dashboard success');
        } else {
          console.warn(message.msg);
        }
      },
      error => {
        console.error(error.msg);
      }
    );
  }

  protected readonly getLabelColor = renderLabelColor;

  copyMonitor(monitorId: number) {
    this.monitorSvc.copyMonitor(monitorId).subscribe(
      message => {
        if (message.code === 0) {
          this.notifySvc.success(this.i18nSvc.fanyi('monitor.copy.success'), '');
          this.loadMonitorTable();
        } else {
          if (message.code === 3) {
            this.notifySvc.warning(this.i18nSvc.fanyi('monitor.item.unavailable.refresh'), '');
            this.loadMonitorTable();
          } else {
            this.notifySvc.error(this.i18nSvc.fanyi('monitor.copy.failed'), message.msg);
          }
        }
      },
      error => {
        if (error.status === 404) {
          this.notifySvc.warning(this.i18nSvc.fanyi('monitor.item.unavailable.refresh'), '');
          this.loadMonitorTable();
        } else {
          this.notifySvc.error(this.i18nSvc.fanyi('monitor.copy.failed'), error.msg);
        }
      }
    );
  }

  private reconcileMonitorStates(newMonitors: Monitor[]): Monitor[] {
    if (!this.previousMonitors || this.previousMonitors.length === 0) {
      const processedMonitors = newMonitors.map(monitor => ({
        ...monitor,
        _displayStatus: 'ACTIVE' as const
      }));
      this.previousMonitors = [...processedMonitors];
      return processedMonitors;
    }
    const newMonitorMap = new Map(newMonitors.map(m => [m.id, m]));
    const previousMonitorMap = new Map(this.previousMonitors.map(m => [m.id, m]));
    const reconciledMonitors: Monitor[] = [];

    newMonitors.forEach(newMonitor => {
      const previousMonitor = previousMonitorMap.get(newMonitor.id);
      if (previousMonitor) {
        if (previousMonitor._graceTimer) {
          clearTimeout(previousMonitor._graceTimer);
        }
        reconciledMonitors.push({
          ...newMonitor,
          _displayStatus: 'ACTIVE' as const
        });
      } else {
        reconciledMonitors.push({
          ...newMonitor,
          _displayStatus: 'ACTIVE' as const
        });
      }
    });

    this.previousMonitors.forEach(previousMonitor => {
      if (!newMonitorMap.has(previousMonitor.id)) {
        if (previousMonitor._displayStatus === 'DISAPPEARED') {
          reconciledMonitors.push(previousMonitor);
        } else {
          const disappearedMonitor = {
            ...previousMonitor,
            _displayStatus: 'DISAPPEARED' as const,
            _disappearTime: Date.now()
          };

          disappearedMonitor._graceTimer = setTimeout(() => {
            this.monitors = (this.monitors || []).filter(m => m.id !== disappearedMonitor.id);
          }, this.GRACE_PERIOD_MS);

          reconciledMonitors.push(disappearedMonitor);
        }
      }
    });

    this.previousMonitors = [...reconciledMonitors];
    return reconciledMonitors;
  }

  isMonitorDisabled(monitor: Monitor): boolean {
    return monitor._displayStatus === 'DISAPPEARED';
  }

  private getSelectedMonitorIdsByPredicate(predicate: (monitor: Monitor) => boolean): Set<number> {
    return new Set(
      (this.monitors || [])
        .filter(monitor => !this.isMonitorDisabled(monitor) && this.checkedMonitorIds.has(monitor.id) && predicate(monitor))
        .map(monitor => monitor.id)
    );
  }

  private t(key: string, fallback: string): string {
    const translated = this.i18nSvc.fanyi(key);
    return translated && translated !== key ? translated : fallback;
  }

  getMonitorDisplayClass(monitor: Monitor): string {
    if (monitor._displayStatus === 'DISAPPEARED') {
      return 'monitor-disappeared';
    }
    return '';
  }
}
