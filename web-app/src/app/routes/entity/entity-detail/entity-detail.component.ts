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

import { formatDate, Location } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { I18NService } from '@core';
import { ALAIN_I18N_TOKEN } from '@delon/theme';
import { EChartsOption, LineSeriesOption } from 'echarts';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { combineLatest, forkJoin, of, Subscription } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { OpsWorkspaceFacade } from '../../../core/ops-workspace/ops-workspace.facade';
import { Entity, EntityCatalogContact, EntityCatalogLink } from '../../../pojo/Entity';
import {
  CodeNavigationHint,
  EntityDefinitionActivity,
  EntityDetail,
  EntityDto,
  EntityLogQueryHint,
  MetricEvidence,
  MetricCorrelationHint,
  EntityNoiseControlRule,
  EntityNoiseControlSummary,
  EntityNextAction,
  EntityOpsSummary,
  EntityResponseHandoff,
  EntityTraceQueryHint,
  EntityTraceSummary,
  EntityTriageSummary
} from '../../../pojo/EntityDetail';
import { EntityDiscoveryGovernancePreset } from '../../../pojo/EntityDiscoveryGovernance';
import { EntityIdentity } from '../../../pojo/EntityIdentity';
import { EntityRelation } from '../../../pojo/EntityRelation';
import { EntityStatus } from '../../../pojo/EntityStatus';
import { Monitor } from '../../../pojo/Monitor';
import { SingleAlert } from '../../../pojo/SingleAlert';
import { AlertInhibit } from '../../../pojo/AlertInhibit';
import { AlertSilence } from '../../../pojo/AlertSilence';
import { AlertInhibitService } from '../../../service/alert-inhibit.service';
import { AlertService } from '../../../service/alert.service';
import { AlertSilenceService } from '../../../service/alert-silence.service';
import { EntityService } from '../../../service/entity.service';
import { MonitorService } from '../../../service/monitor.service';
import { ThemeService } from '../../../service/theme.service';
import {
  createObservabilityChartOption,
  getObservabilityThemeTokens,
  resolveObservabilityThemeMode
} from '../../../shared/observability/observability-theme';
import {
  WorkspaceGuidanceAction,
  WorkspaceGuidanceLink
} from '../../../shared/components/workspace-guidance-panel/workspace-guidance-panel.component';
import { WorkspaceShellTab } from '../../../shared/components/workspace-shell/workspace-shell.component';
import { PlatformDrawerFactItem } from '../../../shared/components/platform-drawer-facts/platform-drawer-facts.component';
import { PlatformFactsStripItem } from '../../../shared/components/platform-facts-strip/platform-facts-strip.component';
import { PlatformKeyValueGridItem } from '../../../shared/components/platform-key-value-grid/platform-key-value-grid.component';
import { PlatformSummaryMetricGridItem } from '../../../shared/components/platform-summary-metric-grid/platform-summary-metric-grid.component';
import { PlatformSupportActionItem } from '../../../shared/components/platform-support-action-bar/platform-support-action-bar.component';
import { renderLabelColor } from '../../../shared/utils/common-util';
import { buildCodeNavigationUrl } from '../../../shared/utils/code-navigation.util';
import { DefinitionImportActivity, readDefinitionImportActivities } from '../entity-definition-activity.util';
import {
  buildGovernanceRegistryPolicyPresentation,
  buildGovernanceRecipePresentation,
  buildGovernanceRegistrySignalPresentation,
  GovernanceRecipePriority,
  GovernanceRegistrySignalPresentation,
  requiresGovernanceRegistryRemediation
} from '../entity-governance-recipe.util';
import { renderDefinitionPreviewHtml } from '../entity-definition-preview.util';
import { DiscoveryGovernanceActivity, readDiscoveryGovernanceActivities } from '../entity-discovery-activity.util';
import {
  buildGovernancePresetQueryParams,
  isGovernancePresetQueryKey,
  readDiscoveryGovernancePresets,
  writeDiscoveryGovernancePresets
} from '../entity-discovery-preset.util';
import {
  buildEntityLogHandoffTokens,
  pickEntityLogPreferredSearchTerm,
  resolveEntityLogHandoffMode,
  summarizeEntityLogResourceFilters
} from '../entity-log-handoff.util';
import { ALERT_SEARCH_IDENTITY_KEYS, ALERT_SEARCH_LABEL_KEYS, LOG_SEARCH_IDENTITY_KEYS, TRACE_SEARCH_IDENTITY_KEYS } from '../entity-otel-identity.util';

interface EntityChecklistItem {
  title: string;
  description: string;
  done: boolean;
}

interface KeyValueEntry {
  key: string;
  value: string;
}

interface CatalogRailItem {
  value: string;
  icon: string;
}

interface DetailWorkspaceAction {
  key: string;
  title: string;
  description: string;
  actionLabel: string;
  icon: string;
  tone: 'primary' | 'default';
}

interface DetailGovernanceHistoryItem {
  id: string;
  kind: 'definition' | 'discovery' | 'catalog';
  status: 'success' | 'warning' | 'error' | 'info';
  summary: string;
  detail?: string;
  happenedAt: string;
  format?: DefinitionPreviewFormat;
  workspacePath?: string;
}

interface DetailLifecycleRecord {
  id: string;
  kind: 'source' | 'definition' | 'discovery' | 'preset' | 'shared';
  title: string;
  summary: string;
  detail?: string;
  happenedAt?: string;
  actionLabel?: string;
}

interface DetailResponseResultBanner {
  kind: 'alerts' | 'monitors' | 'relations';
  action: 'resolve' | 'reopen' | 'acknowledge' | 'unacknowledge' | 'pause' | 'resume' | 'silence' | 'inhibit' | 'update';
  count: number;
}

interface DetailAlertLabelPreviewItem {
  key: string;
  value: string;
}

interface DetailTraceResourceEntry {
  key: string;
  value: string;
}

interface DetailGovernancePolicyCard {
  key: 'registry' | 'preset' | 'catalog' | 'telemetry' | 'definition';
  title: string;
  summary: string;
  actionLabel: string;
  action: 'preset' | 'editor' | 'discovery' | 'definition' | 'registry-refresh' | 'registry-sync' | 'registry-seed';
  preset?: EntityDiscoveryGovernancePreset;
}

interface DetailGovernanceHookCard {
  key: 'registry' | 'preset' | 'ownership' | 'definition' | 'telemetry';
  title: string;
  metric: string;
  summary: string;
  priority: GovernanceRecipePriority;
  priorityLabel: string;
  nextStep: string;
  actionLabel: string;
  action: 'preset' | 'editor' | 'discovery' | 'definition' | 'registry-refresh' | 'registry-sync' | 'registry-seed';
  preset?: EntityDiscoveryGovernancePreset;
}

interface DetailSharedGovernanceSnapshotCard {
  key: 'discovery' | 'definition';
  title: string;
  status: 'success' | 'warning' | 'error' | 'info';
  summary: string;
  detail?: string;
  happenedAt?: string;
  actionLabel: string;
  action: 'discovery' | 'definition';
}

interface DetailRelatedSignalCard {
  key: 'logs' | 'traces' | 'metrics';
  title: string;
  summary: string;
  detail?: string;
  previewItems: Array<{ label: string; value: string }>;
  previewChartOption?: EChartsOption;
  count: number;
  actionLabel: string;
}

type DetailSummaryMetricKey = 'alerts' | 'monitors' | 'logs' | 'traces';

interface DetailFocusSummaryItem {
  label: string;
  value: string;
}

type DefinitionPreviewFormat = 'yaml' | 'json' | 'curl';

@Component({
  standalone: false,  selector: 'app-entity-detail',
  templateUrl: './entity-detail.component.html',
  styleUrls: ['./entity-detail.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EntityDetailComponent implements OnInit, OnDestroy {
  private readonly emptyOpsSummary = new EntityOpsSummary();
  private readonly alertsTabIndex = 1;
  private readonly monitorsTabIndex = 2;
  private readonly relationsTabIndex = 4;
  readonly inhibitEqualLabelAllowList = ['alertname', 'instance', 'job', 'service', 'host', 'env'];
  private routeStateSub?: Subscription;
  private responseResultDismissTimer?: ReturnType<typeof setTimeout>;

  @ViewChild('detailSilenceForm', { static: false }) detailSilenceForm?: NgForm;
  @ViewChild('detailInhibitForm', { static: false }) detailInhibitForm?: NgForm;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private entitySvc: EntityService,
    private alertSvc: AlertService,
    private alertSilenceSvc: AlertSilenceService,
    private alertInhibitSvc: AlertInhibitService,
    private monitorSvc: MonitorService,
    private modal: NzModalService,
    private notifySvc: NzNotificationService,
    private cdr: ChangeDetectorRef,
    @Inject(ALAIN_I18N_TOKEN) private i18nSvc: I18NService,
    private opsWorkspace: OpsWorkspaceFacade,
    private themeSvc?: ThemeService
  ) {}

  readonly helpLink = 'https://hertzbeat.apache.org/docs/help/guide';
  readonly catalogPrimaryTypes: CatalogRailItem[] = [
    { value: 'system', icon: 'apartment' },
    { value: 'service', icon: 'deployment-unit' },
    { value: 'host', icon: 'desktop' },
    { value: 'database', icon: 'database' },
    { value: 'queue', icon: 'unordered-list' },
    { value: 'middleware', icon: 'cluster' },
    { value: 'device', icon: 'api' },
    { value: 'k8s_workload', icon: 'appstore' }
  ];
  readonly catalogApiTypes: CatalogRailItem[] = [
    { value: 'api', icon: 'branches' },
    { value: 'endpoint', icon: 'global' }
  ];

  loading = true;
  entityId!: number;
  activeTabIndex = 0;
  definitionPreviewFormat: DefinitionPreviewFormat = 'yaml';
  definitionPreviewContent = '';
  definitionPreviewDrawerVisible = false;
  teamCount = 0;
  catalogTotalCount = 0;
  catalogGroupCounts: Record<string, number> = {};
  detail?: EntityDetail;
  listQueryParams: Record<string, string> = {};
  relationTargetMap: Record<number, Entity> = {};
  responseResultBanner?: DetailResponseResultBanner;
  triageSummary?: EntityTriageSummary;
  triageSummaryLoading = false;
  pagedAlerts: SingleAlert[] = [];
  pagedAlertTotal = 0;
  alertsLoaded = false;
  alertPageIndex = 1;
  alertPageSize = 10;
  alertSeverityFilter: string | null = null;
  alertStatusFilter: string = 'firing';
  workspaceRailCollapsed = false;
  detailAlertsCheckedAll = false;
  selectedDetailAlertIds = new Set<number>();
  isDetailSilenceModalVisible = false;
  isDetailSilenceModalOkLoading = false;
  detailSilence = new AlertSilence();
  detailSilenceDates!: Date[];
  detailSilenceSelectionCount = 0;
  detailSilencePrefillWarning?: string;
  detailSilencePreviewLabels: DetailAlertLabelPreviewItem[] = [];
  isDetailInhibitModalVisible = false;
  isDetailInhibitModalOkLoading = false;
  detailInhibit = new AlertInhibit();
  detailInhibitSelectionCount = 0;
  detailInhibitPrefillWarning?: string;
  detailInhibitSourcePreviewLabels: DetailAlertLabelPreviewItem[] = [];
  detailInhibitTargetPreviewLabels: DetailAlertLabelPreviewItem[] = [];
  detailSilenceDayCheckOptions = [
    { label: this.i18nSvc.fanyi('common.week.7'), value: 7, checked: true },
    { label: this.i18nSvc.fanyi('common.week.1'), value: 1, checked: true },
    { label: this.i18nSvc.fanyi('common.week.2'), value: 2, checked: true },
    { label: this.i18nSvc.fanyi('common.week.3'), value: 3, checked: true },
    { label: this.i18nSvc.fanyi('common.week.4'), value: 4, checked: true },
    { label: this.i18nSvc.fanyi('common.week.5'), value: 5, checked: true },
    { label: this.i18nSvc.fanyi('common.week.6'), value: 6, checked: true }
  ];
  pagedMonitors: Monitor[] = [];
  pagedMonitorTotal = 0;
  monitorsLoaded = false;
  monitorPageIndex = 1;
  monitorPageSize = 10;
  monitorStatusFilter: number | null = null;
  monitorAppFilter: string | null = null;
  monitorWorkbenchFallbackToAll = false;
  monitorWorkbenchAutoFallbackEligible = false;
  monitorWorkbenchDefaultContext = true;
  detailMonitorsCheckedAll = false;
  selectedDetailMonitorIds = new Set<number>();
  checklistItemsCache: EntityChecklistItem[] = [];
  serverGovernanceActivities: EntityDefinitionActivity[] = [];
  serverDiscoveryActivities: DiscoveryGovernanceActivity[] = [];
  serverWorkspaceActivities: DefinitionImportActivity[] = [];
  sharedDiscoveryActivities: DiscoveryGovernanceActivity[] = [];
  sharedWorkspaceActivities: DefinitionImportActivity[] = [];
  definitionImportActivities: DefinitionImportActivity[] = [];
  governancePresets: EntityDiscoveryGovernancePreset[] = [];
  governancePresetRegistrySource: 'shared' | 'local' | 'empty' = 'empty';
  governancePresetsMigrated = false;
  governanceHistoryItems: DetailGovernanceHistoryItem[] = [];
  labelEntryList: KeyValueEntry[] = [];
  tagList: string[] = [];
  primaryIdentityList: EntityIdentity[] = [];
  secondaryIdentityList: EntityIdentity[] = [];
  outboundRelationList: EntityRelation[] = [];
  inboundRelationList: EntityRelation[] = [];
  moduleName = '';
  helpMessageContent = '';

  ngOnInit(): void {
    this.moduleName = this.i18nSvc.fanyi('entity.detail');
    this.helpMessageContent = this.i18nSvc.fanyi('entity.detail.help');
    this.loadGovernancePresets();
    this.routeStateSub = combineLatest([this.route.paramMap, this.route.queryParamMap]).subscribe(([paramMap, queryParamMap]) => {
      const queryParams = queryParamMap.keys.reduce<Record<string, string>>((acc, key) => {
        const value = queryParamMap.get(key);
        if (value != null) {
          acc[key] = value;
        }
        return acc;
      }, {});
      this.listQueryParams = this.extractListQueryParams(queryParams);
      this.hydrateResponseResultBanner(queryParams);
      this.entityId = Number(paramMap.get('entityId'));
      this.syncWorkspaceContext(queryParams);
      this.loadEntityDetail();
    });
  }

  ngOnDestroy(): void {
    this.routeStateSub?.unsubscribe();
    if (this.responseResultDismissTimer) {
      clearTimeout(this.responseResultDismissTimer);
    }
  }

  loadEntityDetail(): void {
    this.loading = true;
    this.triageSummaryLoading = false;
    this.triageSummary = undefined;
    this.definitionPreviewContent = '';
    this.pagedAlerts = [];
    this.pagedAlertTotal = 0;
    this.alertsLoaded = false;
    this.alertPageIndex = 1;
    this.alertPageSize = 10;
    this.alertSeverityFilter = null;
    this.alertStatusFilter = 'firing';
    this.selectedDetailAlertIds.clear();
    this.detailAlertsCheckedAll = false;
    this.pagedMonitors = [];
    this.pagedMonitorTotal = 0;
    this.monitorsLoaded = false;
    this.monitorPageIndex = 1;
    this.monitorPageSize = 10;
    this.monitorStatusFilter = null;
    this.monitorAppFilter = null;
    this.monitorWorkbenchFallbackToAll = false;
    this.monitorWorkbenchAutoFallbackEligible = true;
    this.monitorWorkbenchDefaultContext = true;
    this.detailMonitorsCheckedAll = false;
    this.selectedDetailMonitorIds.clear();
    this.serverWorkspaceActivities = [];
    this.sharedWorkspaceActivities = [];
    this.sharedDiscoveryActivities = [];
    this.entitySvc.getEntityDetail(this.entityId).subscribe({
      next: message => {
        this.loading = false;
        if (message.code === 0) {
          this.detail = message.data;
          this.syncWorkspaceSelection();
          this.syncDerivedState();
          this.monitorStatusFilter = this.getDefaultMonitorWorkbenchStatusFilter();
          this.syncDefinitionImportActivities();
          this.loadEvidenceWorkspacePages();
          this.loadDefinitionWorkspaceActivities();
          this.loadSharedDiscoveryActivities();
          this.resolveRelationTargets();
          this.loadDefinitionPreview();
        } else {
          this.notifySvc.warning(this.i18nSvc.fanyi('entity.detail'), this.resolveEntityDetailMessage(message.msg));
        }
        this.cdr.markForCheck();
      },
      error: error => {
        this.loading = false;
        this.notifySvc.error(
          this.i18nSvc.fanyi('entity.detail'),
          this.resolveEntityDetailMessage(error?.msg || error?.message, 'entity.detail.load.failed')
        );
        this.cdr.markForCheck();
      }
    });
  }

  get entity(): Entity | undefined {
    return this.detail?.entity?.entity;
  }

  get entityDto(): EntityDto | undefined {
    return this.detail?.entity;
  }

  get status(): EntityStatus | undefined {
    return this.detail?.status;
  }

  get activeAlerts(): SingleAlert[] {
    if (this.alertsLoaded) {
      return this.pagedAlerts;
    }
    return this.detail?.activeAlerts || [];
  }

  get boundMonitors(): Monitor[] {
    if (this.monitorsLoaded) {
      return this.pagedMonitors;
    }
    return this.detail?.boundMonitors || [];
  }

  get identities(): EntityIdentity[] {
    return this.detail?.entity?.identities || [];
  }

  get relations(): EntityRelation[] {
    return this.detail?.entity?.relations || [];
  }

  get entityLinks(): EntityCatalogLink[] {
    return this.entity?.links || [];
  }

  get entityContacts(): EntityCatalogContact[] {
    return this.entity?.contacts || [];
  }

  get implementedByList(): string[] {
    return this.entity?.implementedBy || [];
  }

  get apiInterfaceFileRef(): string | undefined {
    const value = this.entity?.apiInterface?.fileRef;
    return this.trimText(value);
  }

  get hasInlineApiInterfaceDefinition(): boolean {
    const definition = this.entity?.apiInterface?.definition;
    return definition != null && Object.keys(definition).length > 0;
  }

  get additionalOwnerNames(): string[] {
    return (this.entity?.additionalOwners || [])
      .map(owner => this.trimText(owner?.name))
      .filter((owner): owner is string => owner != null);
  }

  get componentList(): string[] {
    return this.entity?.components || [];
  }

  get componentOfList(): string[] {
    return this.entity?.componentOf || [];
  }

  get languageList(): string[] {
    return this.entity?.languages || [];
  }

  get logQueryHints(): EntityLogQueryHint[] {
    return this.detail?.logQueryHints || [];
  }

  get evidenceSummary() {
    return this.detail?.evidenceSummary;
  }

  get alertSummary() {
    return this.detail?.alertSummary;
  }

  get monitorSummary() {
    return this.detail?.monitorSummary;
  }

  get logSummary() {
    return this.detail?.logSummary;
  }

  get traceSummary(): EntityTraceSummary | undefined {
    return this.detail?.traceSummary;
  }

  get metricEvidence(): MetricEvidence[] {
    return this.detail?.metricEvidence || [];
  }

  get traceQueryHints(): EntityTraceQueryHint[] {
    return this.detail?.traceQueryHints || [];
  }

  get opsSummary(): EntityOpsSummary {
    return this.detail?.opsSummary || this.emptyOpsSummary;
  }

  get observabilityContextItems(): KeyValueEntry[] {
    const entityName =
      this.trimText(this.entity?.displayName) || this.trimText(this.entity?.name) || (this.entityId != null ? `#${this.entityId}` : undefined);
    const metricsParams = this.getMetricsConsoleQueryParams();
    const logParams = this.getLogManageQueryParams();
    const traceParams = this.getTraceCenterQueryParams();
    const serviceName = this.pickFirstText(metricsParams?.['serviceName'], traceParams?.['serviceName'], logParams?.['serviceName']);
    const serviceNamespace = this.pickFirstText(
      metricsParams?.['serviceNamespace'],
      traceParams?.['serviceNamespace'],
      logParams?.['serviceNamespace']
    );
    const environment = this.pickFirstText(
      metricsParams?.['environment'],
      traceParams?.['environment'],
      logParams?.['environment'],
      this.trimText(this.entity?.environment)
    );
    const items: KeyValueEntry[] = [];
    if (entityName != null) {
      items.push({
        key: this.translateOrFallback('entity.detail.investigation.context.object', '调查对象'),
        value: entityName
      });
    }
    if (serviceName != null && serviceName !== entityName) {
      items.push({
        key: this.translateOrFallback('entity.detail.investigation.context.service', '服务'),
        value: serviceName
      });
    }
    if (serviceNamespace != null) {
      items.push({
        key: this.translateOrFallback('entity.detail.investigation.context.namespace', '命名空间'),
        value: serviceNamespace
      });
    }
    if (environment != null) {
      items.push({
        key: this.translateOrFallback('entity.detail.investigation.context.environment', '环境'),
        value: environment
      });
    }
    return items;
  }

  get observabilityContextCopy(): string {
    const hasServiceContext = this.observabilityContextItems.some(item =>
      item.key === this.translateOrFallback('entity.detail.investigation.context.service', '服务')
    );
    if (hasServiceContext) {
      return this.translateOrFallback(
        'entity.detail.investigation.copy.service',
        '当前证据区会围绕实体和 OTel 服务上下文组织，继续查看指标、日志和链路时会沿用这组调查对象。'
      );
    }
    return this.translateOrFallback(
      'entity.detail.investigation.copy.entity',
      '当前证据区先围绕实体对象组织，可继续从监控、日志和链路补齐调查上下文。'
    );
  }

  get statusPageSummary() {
    return this.detail?.statusPageSummary;
  }

  get recentAlertList(): SingleAlert[] {
    if (this.alertsLoaded) {
      return this.pagedAlerts;
    }
    if (this.alertSummary?.recentAlerts?.length) {
      return this.alertSummary.recentAlerts;
    }
    return this.activeAlerts.slice(0, 5);
  }

  get alertWorkbenchList(): SingleAlert[] {
    return this.recentAlertList;
  }

  get alertWorkbenchTotal(): number {
    if (this.alertsLoaded) {
      return this.pagedAlertTotal;
    }
    return this.activeAlertCount;
  }

  get alertWorkbenchLatestChangeAt(): number | string | undefined {
    const sourceAlerts = this.alertWorkbenchList;
    if (sourceAlerts.length > 0) {
      return [...sourceAlerts]
        .map(alert => alert.activeAt || alert.endAt || alert.gmtUpdate || alert.gmtCreate)
        .filter(value => value != null)
        .sort((left, right) => new Date(right as string | number).getTime() - new Date(left as string | number).getTime())[0];
    }
    return this.alertSummary?.latestStatusChangeAt ?? undefined;
  }

  get alertSeverityEntries(): Array<{ severity: string; count: number }> {
    const distribution = this.alertSummary?.severityDistribution || {};
    const preferredOrder = ['critical', 'error', 'warning', 'info', 'unknown'];
    return Object.entries(distribution)
      .map(([severity, count]) => ({ severity, count }))
      .sort((left, right) => {
        const leftIndex = preferredOrder.indexOf(left.severity);
        const rightIndex = preferredOrder.indexOf(right.severity);
        return (leftIndex === -1 ? preferredOrder.length : leftIndex) - (rightIndex === -1 ? preferredOrder.length : rightIndex);
      });
  }

  get alertWorkbenchSeverityEntries(): Array<{ severity: string; count: number }> {
    if (this.alertsLoaded) {
      const distribution = new Map<string, number>();
      this.alertWorkbenchList.forEach(alert => {
        const severity = this.getAlertSeverity(alert) || 'unknown';
        distribution.set(severity, (distribution.get(severity) || 0) + 1);
      });
      const preferredOrder = ['critical', 'error', 'warning', 'info', 'unknown'];
      return Array.from(distribution.entries())
        .map(([severity, count]) => ({ severity, count }))
        .sort((left, right) => {
          const leftIndex = preferredOrder.indexOf(left.severity);
          const rightIndex = preferredOrder.indexOf(right.severity);
          return (leftIndex === -1 ? preferredOrder.length : leftIndex) - (rightIndex === -1 ? preferredOrder.length : rightIndex);
        });
    }
    return this.alertSeverityEntries;
  }

  get alertSeverityOptions(): string[] {
    const options = new Set(this.alertWorkbenchSeverityEntries.map(item => item.severity));
    if (this.alertSeverityFilter != null) {
      options.add(this.alertSeverityFilter);
    }
    return Array.from(options);
  }

  get abnormalMonitors(): Monitor[] {
    if (this.monitorsLoaded) {
      return this.pagedMonitors.filter(monitor => monitor.status === 2).slice(0, 5);
    }
    if (this.monitorSummary?.abnormalMonitors?.length) {
      return this.monitorSummary.abnormalMonitors;
    }
    return this.boundMonitors.filter(monitor => monitor.status === 2).slice(0, 5);
  }

  get monitorWorkbenchList(): Monitor[] {
    if (this.monitorsLoaded) {
      return this.pagedMonitors;
    }
    if (this.monitorSummary?.abnormalMonitors?.length) {
      return this.monitorSummary.abnormalMonitors;
    }
    return this.boundMonitors;
  }

  get monitorAppOptions(): string[] {
    const fromSummary = Object.keys(this.monitorSummary?.appDistribution || {});
    const fromMonitors = (this.detail?.boundMonitors || [])
      .map(monitor => this.trimText(monitor.app))
      .filter((app): app is string => app != null);
    return Array.from(new Set([...fromSummary, ...fromMonitors])).sort((left, right) => left.localeCompare(right));
  }

  get activeAlertCount(): number {
    return this.evidenceSummary?.activeAlertCount ?? this.activeAlerts.length;
  }

  get downMonitorCount(): number {
    return this.evidenceSummary?.downMonitorCount ?? 0;
  }

  get healthyMonitorCount(): number {
    return this.evidenceSummary?.healthyMonitorCount ?? 0;
  }

  get identityCount(): number {
    return this.evidenceSummary?.identityCount ?? this.identities.length;
  }

  get logHintCount(): number {
    return this.evidenceSummary?.logHintCount ?? this.logSummary?.hintCount ?? this.logQueryHints.length;
  }

  get monitorCount(): number {
    return this.monitorSummary?.totalBoundMonitors ?? this.boundMonitors.length;
  }

  get lastEvidenceAtLabel(): string {
    const timestamp = this.evidenceSummary?.lastEvidenceAt || this.status?.evaluatedAt;
    return this.formatActivityTime(timestamp);
  }

  get preferredLogEntryLabel(): string {
    return this.logSummary?.preferredQueryTitle || this.logQueryHints[0]?.title || '-';
  }

  get recentTraceCount(): number {
    return this.traceSummary?.recentTraceCount ?? 0;
  }

  get recentErrorTraceCount(): number {
    return this.traceSummary?.recentErrorTraceCount ?? 0;
  }

  get hasTraceEvidence(): boolean {
    return this.traceSummary != null || this.traceQueryHints.length > 0;
  }

  get traceEvidenceTitle(): string {
    if ((this.traceSummary?.recentTraceCount || 0) > 0) {
      return this.translateOrFallback('entity.detail.trace.title.active', '最近已经观测到 Trace 信号');
    }
    return this.translateOrFallback('entity.detail.trace.title.empty', '当前还没有稳定的 Trace 证据');
  }

  get traceEvidenceNarrative(): string {
    if ((this.traceSummary?.recentTraceCount || 0) <= 0) {
      return this.translateOrFallback(
        'entity.detail.trace.copy.empty',
        '当前实体还没有稳定的 Trace 证据，可以先从日志或遥测身份补齐链路。'
      );
    }
    if ((this.traceSummary?.recentErrorTraceCount || 0) > 0) {
      return this.translateOrFallback(
        'entity.detail.trace.copy.error',
        '最近已经出现错误 Trace，建议先查看链路里的异常 span 和关联日志。'
      );
    }
    return this.translateOrFallback(
      'entity.detail.trace.copy.active',
      '最近已经观察到活跃 Trace，可以直接查看 span 层级和关键属性。'
    );
  }

  get traceObservedAtLabel(): string {
    return this.formatActivityTime(this.traceSummary?.latestObservedAt ?? undefined);
  }

  get preferredLogRouteLabel(): string {
    if (this.preferredLogResourceFilterSummary != null) {
      return this.translateOrFallback('entity.detail.logs.preferred.resource', '优先按 OTel 资源过滤继续查看日志。');
    }
    if (this.preferredLogFallbackSearchTerm != null) {
      return this.translateOrFallback('entity.detail.logs.preferred.search', '优先按推荐搜索入口继续查看日志。');
    }
    return this.translateOrFallback('entity.detail.logs.preferred.default', '当前使用实体默认日志入口。');
  }

  get metricEvidenceCount(): number {
    return this.detail?.unifiedEvidenceSummary?.metricEvidenceCount ?? this.metricEvidence.length;
  }

  get metricEvidenceNarrative(): string {
    if (this.metricEvidenceCount <= 0) {
      return this.translateOrFallback(
        'entity.detail.metrics.copy.empty',
        '当前还没有稳定的指标证据，可先从监控结果或 OTLP 接入补齐指标上下文。'
      );
    }
    return this.translateOrFallback(
      'entity.detail.metrics.copy.active',
      '当前对象已经具备指标上下文，可直接在指标工作台里继续看趋势、聚合和时间范围。'
    );
  }

  get metricEvidenceSnippet(): string | undefined {
    const firstMetric = this.metricEvidence[0];
    if (firstMetric == null) {
      return undefined;
    }
    return this.pickFirstText(this.trimText(firstMetric.displayName), this.trimText(firstMetric.metricName));
  }

  get relatedSignalCards(): DetailRelatedSignalCard[] {
    const firstMetric = this.metricEvidence[0];
    return [
      {
        key: 'logs',
        title: this.translateOrFallback('entity.detail.related-signals.logs.title', '相关日志'),
        summary: this.logEvidenceNarrative,
        detail: this.pickFirstText(this.preferredLogEntryLabel, this.preferredLogRouteLabel),
        previewItems: [
          {
            label: this.translateOrFallback('entity.detail.related-signals.preview.query', '查询'),
            value: this.preferredLogEntryLabel || '-'
          },
          {
            label: this.translateOrFallback('entity.detail.related-signals.preview.hints', '线索数'),
            value: String(this.logHintCount)
          },
          {
            label: this.translateOrFallback('entity.detail.related-signals.preview.source', '来源'),
            value: 'OTel/OTLP'
          }
        ],
        previewChartOption: this.buildRelatedSignalPreviewChart('logs', this.logHintCount, this.logHintCount + 1),
        count: this.logHintCount,
        actionLabel: this.translateOrFallback('entity.detail.related-signals.open', '在工作台中打开')
      },
      {
        key: 'traces',
        title: this.translateOrFallback('entity.detail.related-signals.traces.title', '相关链路'),
        summary: this.traceEvidenceNarrative,
        detail:
          this.recentErrorTraceCount > 0
            ? this.translateWithParamsOrFallback(
                'entity.detail.related-signals.traces.detail.error',
                { count: this.recentErrorTraceCount },
                `最近 ${this.recentErrorTraceCount} 条错误链路值得优先查看。`
              )
            : this.traceObservedAtLabel,
        previewItems: [
          {
            label: this.translateOrFallback('entity.detail.related-signals.preview.trace-count', '链路数'),
            value: String(this.recentTraceCount)
          },
          {
            label: this.translateOrFallback('entity.detail.related-signals.preview.error-traces', '错误链路'),
            value: String(this.recentErrorTraceCount)
          }
        ],
        previewChartOption: this.buildRelatedSignalPreviewChart('traces', this.recentTraceCount, this.recentErrorTraceCount),
        count: this.recentTraceCount,
        actionLabel: this.translateOrFallback('entity.detail.related-signals.open', '在工作台中打开')
      },
      {
        key: 'metrics',
        title: this.translateOrFallback('entity.detail.related-signals.metrics.title', '相关指标'),
        summary: this.metricEvidenceNarrative,
        detail: this.metricEvidenceSnippet,
        previewItems: [
          {
            label: this.translateOrFallback('entity.detail.related-signals.preview.metric', '指标'),
            value: this.metricEvidenceSnippet || '-'
          },
          {
            label: this.translateOrFallback('entity.detail.related-signals.preview.source', '来源'),
            value: this.normalizeMetricSourceLabel(firstMetric?.source)
          },
          {
            label: this.translateOrFallback('entity.detail.related-signals.preview.value', '当前值'),
            value: this.formatMetricPreviewValue(firstMetric)
          }
        ],
        previewChartOption: this.buildRelatedSignalPreviewChart(
          'metrics',
          this.coerceMetricPreviewValue(firstMetric),
          this.metricEvidenceCount
        ),
        count: this.metricEvidenceCount,
        actionLabel: this.translateOrFallback('entity.detail.related-signals.open', '在工作台中打开')
      }
    ];
  }

  private buildRelatedSignalPreviewChart(key: DetailRelatedSignalCard['key'], primaryValue: number, secondaryValue: number): EChartsOption {
    const mode = resolveObservabilityThemeMode(this.themeSvc?.getTheme?.());
    const themeTokens = getObservabilityThemeTokens(mode);
    const color =
      key === 'logs'
        ? themeTokens.semantic.warning
        : key === 'metrics'
          ? themeTokens.semantic.success
          : themeTokens.semantic.primary;
    const now = Date.now();
    const samples = this.buildSignalTrendSamples(primaryValue, secondaryValue);
    const seriesNameMap: Record<DetailRelatedSignalCard['key'], string> = {
      logs: this.translateOrFallback('entity.detail.related-signals.logs.title', '相关日志'),
      traces: this.translateOrFallback('entity.detail.related-signals.traces.title', '相关链路'),
      metrics: this.translateOrFallback('entity.detail.related-signals.metrics.title', '相关指标')
    };
    const series: LineSeriesOption[] = [
      {
        type: 'line',
        name: seriesNameMap[key],
        color,
        data: samples.map((value, index) => [now - (samples.length - index - 1) * 5 * 60 * 1000, value])
      }
    ];
    return createObservabilityChartOption(mode, 'entity-evidence-mini-trend', {
      kind: 'timeseries',
      series
    });
  }

  private buildSignalTrendSamples(primaryValue: number, secondaryValue: number): number[] {
    const safePrimary = Number.isFinite(primaryValue) ? Math.max(primaryValue, 0) : 0;
    const safeSecondary = Number.isFinite(secondaryValue) ? Math.max(secondaryValue, 0) : 0;
    const baseline = Math.max(0, safePrimary - Math.max(1, Math.round(safePrimary * 0.18)));
    const midpoint = Math.max(baseline, safeSecondary || safePrimary);
    const latest = Math.max(midpoint, safePrimary);
    return [baseline, midpoint, latest];
  }

  private normalizeMetricSourceLabel(source?: 'monitor' | 'otlp'): string {
    if (source === 'monitor') {
      return 'Monitor';
    }
    if (source === 'otlp') {
      return 'OTLP';
    }
    return '-';
  }

  private formatMetricPreviewValue(metric?: MetricEvidence): string {
    if (metric?.value == null) {
      return '-';
    }
    return String(metric.value);
  }

  private coerceMetricPreviewValue(metric?: MetricEvidence): number {
    if (metric?.value == null) {
      return 0;
    }
    const numericValue = Number(metric.value);
    return Number.isFinite(numericValue) ? numericValue : 0;
  }

  get summaryMetricItems(): PlatformSummaryMetricGridItem[] {
    const actionLabel = this.translateOrFallback('entity.detail.related-signals.open', '打开');
    return [
      {
        label: this.translateOrFallback('entity.section.alerts', '告警'),
        value: String(this.activeAlertCount),
        actionLabel,
        actionKey: 'alerts'
      },
      {
        label: this.translateOrFallback('entity.detail.stat.monitor-down', '异常监控'),
        value: String(this.downMonitorCount),
        tone: 'warning',
        actionLabel,
        actionKey: 'monitors'
      },
      {
        label: this.translateOrFallback('entity.section.logs', '日志'),
        value: String(this.logHintCount),
        actionLabel,
        actionKey: 'logs'
      },
      {
        label: this.translateOrFallback('entity.section.traces', '链路'),
        value: String(this.recentTraceCount),
        actionLabel,
        actionKey: 'traces'
      }
    ];
  }

  get preferredLogResourceFilterSummary(): string | undefined {
    return summarizeEntityLogResourceFilters(this.logSummary?.preferredResourceFilters);
  }

  get preferredLogFallbackSearchTerm(): string | undefined {
    return pickEntityLogPreferredSearchTerm(this.logSummary?.preferredSearchTerms, this.logSummary?.fallbackSearchTerm);
  }

  get logHandoffNarrative(): string {
    switch (resolveEntityLogHandoffMode(this.getResponseHandoff('logs'))) {
      case 'trace':
        return this.translateOrFallback(
          'entity.log.workbench.copy.trace',
          '当前查询来自实体 handoff 的 Trace/Span 线索，适合先沿调用链继续排查。'
        );
      case 'severity':
        return this.translateOrFallback(
          'entity.log.workbench.copy.severity',
          '当前查询优先保留了严重级别上下文，适合先看最值得处理的日志信号。'
        );
      case 'search':
        return this.translateOrFallback(
          'entity.log.workbench.copy.search',
          '当前查询直接来自实体推荐搜索入口，适合先验证资源过滤或 fallback 搜索是否足够定位问题。'
        );
      default:
        return this.translateOrFallback(
          'entity.log.workbench.copy.default',
          '当前页面已处于实体日志上下文，可以直接按推荐入口继续排查。'
        );
    }
  }

  get logTriageReason(): string {
    if (this.logHintCount === 0) {
      return this.translateOrFallback('entity.detail.logs.reason.empty', '当前还没有日志线索，建议先补齐证据入口。');
    }
    if (this.shouldUseSuppressionFirstNarrative) {
      return this.translateOrFallback(
        'entity.detail.logs.reason.suppressed',
        '日志入口已经准备好，但当前更值得先确认 noise controls 是否解释了告警可见性，再决定是否切到日志。'
      );
    }
    if (this.primaryTriageFocusKind === 'logs') {
      return this.translateOrFallback(
        'entity.detail.logs.reason.primary',
        '当前没有更强的告警或异常监控，日志是最值得先继续的线索。'
      );
    }
    return this.translateOrFallback(
      'entity.detail.logs.reason.support',
      '当前日志更适合作为补充线索，可顺着推荐入口继续核对资源过滤或 fallback 搜索。'
    );
  }

  get alertEvidenceNarrative(): string {
    if (this.activeAlertCount > 0) {
      const highestSeverity = this.alertSeverityEntries[0]?.severity;
      if (this.hasNoiseControlSummary) {
        if (highestSeverity != null) {
          return this.translateOrFallback(
            'entity.detail.evidence.alerts.priority.noise-controls',
            `当前已有活跃告警，其中最高优先级为 ${highestSeverity.toUpperCase()}；同时 noise controls 也在影响整体可见性，建议先一起确认哪些信号被保留、哪些被主动降噪。`
          );
        }
        return this.translateOrFallback(
          'entity.detail.evidence.alerts.default.noise-controls',
          '当前已有活跃告警，同时 noise controls 也在影响整体可见性，建议先确认哪些信号仍然可见、哪些被主动降噪。'
        );
      }
      if (highestSeverity != null) {
        return this.translateOrFallback(
          'entity.detail.evidence.alerts.priority',
          `当前已有活跃告警，先确认 ${highestSeverity.toUpperCase()} 级别信号和最近状态变化。`
        );
      }
      return this.translateOrFallback('entity.detail.evidence.alerts.default', '当前已有活跃告警，先确认影响面和最近状态变化。');
    }
    if (this.shouldUseSuppressionFirstNarrative) {
      return this.translateOrFallback(
        'entity.detail.evidence.alerts.empty.suppressed',
        '当前没有更强的可见活跃告警，但已命中 noise controls，建议先确认是否因为 silence / inhibit 导致告警变少或为空。'
      );
    }
    return this.translateOrFallback('entity.detail.evidence.alerts.empty', '当前没有活跃告警，可以优先转去看异常监控或日志线索。');
  }

  get alertEvidencePriorityLabel(): string {
    if (this.activeAlertCount > 0) {
      return this.translateOrFallback('entity.detail.evidence.priority.alerts', '当前优先看告警');
    }
    if (this.shouldUseSuppressionFirstNarrative) {
      return this.translateOrFallback('entity.detail.evidence.priority.alerts.suppressed', '先确认降噪规则');
    }
    return this.translateOrFallback('entity.detail.evidence.priority.alerts.empty', '暂无告警压力');
  }

  get alertWorkbenchNarrative(): string {
    if (this.alertWorkbenchTotal === 0) {
      if (this.alertStatusFilter !== 'resolved' && this.alertStatusFilter !== 'acknowledged' && this.hasPossibleAlertSuppression) {
        return this.translateOrFallback(
          'entity.detail.alerts.empty.suppressed',
          '当前没有可见活跃告警，但该实体已命中 noise controls，建议先确认 silence / inhibit 是否解释了当前告警视图。'
        );
      }
      if (this.alertStatusFilter === 'acknowledged') {
        return this.translateOrFallback('entity.detail.alerts.empty.acknowledged', '当前没有已确认告警。');
      }
      return this.alertStatusFilter === 'resolved'
        ? this.translateOrFallback('entity.detail.alerts.empty.resolved', '当前没有已恢复告警。')
        : this.translateOrFallback('entity.empty.alerts', '当前没有活跃告警。');
    }
    if (this.alertStatusFilter === 'acknowledged') {
      return this.translateOrFallback(
        'entity.detail.alerts.acknowledged.copy',
        '当前正在回看已确认告警，优先确认这些信号是否仍需进一步恢复、静默或转去监控和日志继续排查。'
      );
    }
    if (this.alertStatusFilter === 'resolved') {
      return this.translateOrFallback(
        'entity.detail.alerts.resolved.copy',
        '当前正在回看已恢复告警，优先确认最近恢复时间和严重级别分布。'
      );
    }
    return this.alertEvidenceNarrative;
  }

  get alertWorkbenchTitleLabel(): string {
    if (this.alertStatusFilter === 'acknowledged') {
      return this.translateOrFallback('entity.detail.alerts.label.acknowledged', '已确认告警');
    }
    return this.alertStatusFilter === 'resolved'
      ? this.translateOrFallback('entity.detail.alerts.label.resolved', '已恢复告警')
      : this.translateOrFallback('entity.section.alerts', '活跃告警');
  }

  get alertWorkbenchEmptyStateLabel(): string {
    if (this.alertStatusFilter === 'acknowledged') {
      return this.translateOrFallback('entity.detail.alerts.empty.acknowledged', '当前没有已确认告警。');
    }
    return this.alertStatusFilter === 'resolved'
      ? this.translateOrFallback('entity.detail.alerts.empty.resolved', '当前没有已恢复告警。')
      : this.translateOrFallback('entity.empty.alerts', '当前没有活跃告警。');
  }

  get alertWorkbenchFilterSummary(): string[] {
    const summary = [
      this.alertStatusFilter === 'acknowledged'
        ? this.translateOrFallback('entity.detail.alerts.filter.summary.acknowledged', '当前回看已确认告警')
        : this.alertStatusFilter === 'resolved'
          ? this.translateOrFallback('entity.detail.alerts.filter.summary.resolved', '当前回看已恢复告警')
          : this.translateOrFallback('entity.detail.alerts.filter.summary.firing', '当前只看活跃告警'),
      this.alertSeverityFilter != null
        ? this.translateWithParamsOrFallback(
            'entity.detail.alerts.filter.summary.severity',
            { severity: this.getAlertSeverityLabel(this.alertSeverityFilter) },
            `严重级别：${this.getAlertSeverityLabel(this.alertSeverityFilter)}`
          )
        : undefined
    ].filter((value): value is string => value != null);
    return summary;
  }

  get hasAlertWorkbenchActiveFilters(): boolean {
    return this.alertStatusFilter !== 'firing' || this.alertSeverityFilter != null;
  }

  get selectedDetailAlertCount(): number {
    return this.selectedDetailAlertIds.size;
  }

  get hasSelectedDetailAlerts(): boolean {
    return this.selectedDetailAlertCount > 0;
  }

  get selectedDetailResolvableCount(): number {
    return this.getSelectedDetailAlertStatusCount('firing');
  }

  get selectedDetailAcknowledgeableCount(): number {
    return this.getSelectedDetailAlertStatusCount('firing');
  }

  get selectedDetailUnacknowledgeableCount(): number {
    return this.getSelectedDetailAlertStatusCount('acknowledged');
  }

  get selectedDetailReopenableCount(): number {
    return this.getSelectedDetailAlertStatusCount('resolved');
  }

  get detailAlertBatchSelectionLabel(): string {
    return this.translateWithParamsOrFallback(
      'entity.workbench.batch.selected',
      { count: this.selectedDetailAlertCount },
      `已选择 ${this.selectedDetailAlertCount} 条告警`
    );
  }

  get detailAlertAcknowledgeSelectedLabel(): string {
    return this.translateWithParamsOrFallback(
      'entity.alert.workbench.action.acknowledge-selected',
      { count: this.selectedDetailAcknowledgeableCount },
      `确认 ${this.selectedDetailAcknowledgeableCount} 条告警`
    );
  }

  get detailAlertUnacknowledgeSelectedLabel(): string {
    return this.translateWithParamsOrFallback(
      'entity.alert.workbench.action.unacknowledge-selected',
      { count: this.selectedDetailUnacknowledgeableCount },
      `取消确认 ${this.selectedDetailUnacknowledgeableCount} 条告警`
    );
  }

  get detailAlertResolveSelectedLabel(): string {
    return this.translateWithParamsOrFallback(
      'entity.alert.workbench.action.resolve-selected',
      { count: this.selectedDetailResolvableCount },
      `恢复 ${this.selectedDetailResolvableCount} 条告警`
    );
  }

  get detailAlertReopenSelectedLabel(): string {
    return this.translateWithParamsOrFallback(
      'entity.alert.workbench.action.reopen-selected',
      { count: this.selectedDetailReopenableCount },
      `重开 ${this.selectedDetailReopenableCount} 条告警`
    );
  }

  get detailAlertSilenceSelectedLabel(): string {
    return this.translateWithParamsOrFallback(
      'entity.alert.workbench.action.silence-selected',
      { count: this.selectedDetailAlertCount },
      `为 ${this.selectedDetailAlertCount} 条告警创建静默`
    );
  }

  get detailAlertInhibitSelectedLabel(): string {
    return this.translateWithParamsOrFallback(
      'entity.alert.workbench.action.inhibit-selected',
      { count: this.selectedDetailAlertCount },
      `为 ${this.selectedDetailAlertCount} 条告警创建抑制`
    );
  }

  get monitorEvidenceNarrative(): string {
    if (this.shouldUseSuppressionFirstNarrative) {
      return this.translateOrFallback(
        'entity.detail.evidence.monitors.suppressed',
        '当前仍有异常监控可看，但在转去监控前，建议先确认 noise controls 是否已经解释了告警可见性。'
      );
    }
    if (this.downMonitorCount > 0) {
      return this.translateOrFallback(
        'entity.detail.evidence.monitors.down',
        `当前有 ${this.downMonitorCount} 个异常监控，建议先确认它们是否直接解释了实体状态。`
      );
    }
    if (this.monitorCount > 0) {
      return this.translateOrFallback(
        'entity.detail.evidence.monitors.healthy',
        '当前没有异常监控，页面会回落到全部已绑定监控，方便继续核对覆盖面。'
      );
    }
    return this.translateOrFallback('entity.detail.evidence.monitors.empty', '当前还没有绑定监控，可能需要回到遥测发现或编辑页补证据。');
  }

  get monitorEvidencePriorityLabel(): string {
    if (this.shouldUseSuppressionFirstNarrative) {
      return this.translateOrFallback('entity.detail.evidence.priority.monitors.suppressed', '先确认告警为何被降噪');
    }
    if (this.downMonitorCount > 0) {
      return this.translateOrFallback('entity.detail.evidence.priority.monitors', '当前优先看异常监控');
    }
    if (this.monitorCount > 0) {
      return this.translateOrFallback('entity.detail.evidence.priority.monitors.coverage', '继续核对监控覆盖');
    }
    return this.translateOrFallback('entity.detail.evidence.priority.monitors.empty', '先补监控证据');
  }

  get monitorWorkbenchNarrative(): string {
    if (this.monitorCount === 0) {
      return this.translateOrFallback('entity.empty.monitors', '当前没有关联监控。');
    }
    if (this.monitorWorkbenchFallbackToAll) {
      return this.translateOrFallback(
        'entity.detail.monitors.workbench.fallback',
        '当前没有异常监控，页面已自动回落到全部已绑定监控，方便继续核对覆盖面。'
      );
    }
    if ((this.monitorStatusFilter ?? 2) === 2) {
      return this.translateOrFallback(
        'entity.detail.monitors.workbench.down',
        '当前默认优先展示异常监控，帮助你先确认是否已有直接解释实体状态的证据。'
      );
    }
    return this.monitorEvidenceNarrative;
  }

  get monitorWorkbenchFilterSummary(): string[] {
    const summary = [
      this.monitorWorkbenchFallbackToAll
        ? this.translateOrFallback('entity.detail.monitors.filter.summary.fallback', '已回落到全量视图')
        : this.translateOrFallback('entity.detail.monitors.filter.summary.auto', '当前按异常优先查看'),
      this.monitorStatusFilter != null
        ? this.translateWithParamsOrFallback(
            'entity.detail.monitors.filter.summary.status',
            { status: this.monitorStatusLabel(this.monitorStatusFilter) },
            `监控状态：${this.monitorStatusLabel(this.monitorStatusFilter)}`
          )
        : undefined,
      this.monitorAppFilter != null
        ? this.translateWithParamsOrFallback(
            'entity.detail.monitors.filter.summary.app',
            { app: this.monitorAppFilter },
            `监控类型：${this.monitorAppFilter}`
          )
        : undefined
    ].filter((value): value is string => value != null);
    return summary;
  }

  get hasMonitorWorkbenchActiveFilters(): boolean {
    return this.monitorAppFilter != null || !this.monitorWorkbenchDefaultContext;
  }

  get hasSelectedDetailMonitors(): boolean {
    return this.selectedDetailMonitorIds.size > 0;
  }

  get selectedDetailPausableMonitorCount(): number {
    return this.getSelectedDetailMonitorIdsByPredicate(monitor => monitor.status !== 0).size;
  }

  get selectedDetailResumableMonitorCount(): number {
    return this.getSelectedDetailMonitorIdsByPredicate(monitor => monitor.status === 0).size;
  }

  get detailMonitorBatchSelectionLabel(): string {
    return this.translateWithParamsOrFallback(
      'entity.workbench.batch.selected',
      { count: this.selectedDetailMonitorIds.size },
      `已选择 ${this.selectedDetailMonitorIds.size} 项`
    );
  }

  get detailMonitorPauseSelectedLabel(): string {
    return this.translateWithParamsOrFallback(
      'entity.monitor.workbench.action.pause-selected',
      { count: this.selectedDetailPausableMonitorCount },
      `暂停监控 ${this.selectedDetailPausableMonitorCount}`
    );
  }

  get detailMonitorResumeSelectedLabel(): string {
    return this.translateWithParamsOrFallback(
      'entity.monitor.workbench.action.resume-selected',
      { count: this.selectedDetailResumableMonitorCount },
      `恢复监控 ${this.selectedDetailResumableMonitorCount}`
    );
  }

  get logEvidenceNarrative(): string {
    if (this.shouldUseSuppressionFirstNarrative && this.logHintCount > 0) {
      return this.translateOrFallback(
        'entity.detail.evidence.logs.suppressed',
        '日志入口已经准备好，但在切到日志前，建议先确认 noise controls 是否解释了当前告警可见性。'
      );
    }
    if (this.logHintCount > 0) {
      return this.translateOrFallback(
        'entity.detail.evidence.logs.available',
        '日志入口已经准备好，可以直接顺着当前实体 handoff 深入查看资源过滤或 fallback 搜索。'
      );
    }
    return this.translateOrFallback('entity.detail.evidence.logs.empty', '当前还没有日志线索，建议先看监控或去遥测发现补齐证据。');
  }

  get logEvidencePriorityLabel(): string {
    if (this.shouldUseSuppressionFirstNarrative) {
      return this.translateOrFallback('entity.detail.evidence.priority.logs.suppressed', '先确认降噪后的告警视图');
    }
    if (this.logHintCount > 0 && this.activeAlertCount === 0 && this.downMonitorCount === 0) {
      return this.translateOrFallback('entity.detail.evidence.priority.logs', '当前优先看日志');
    }
    if (this.logHintCount > 0) {
      return this.translateOrFallback('entity.detail.evidence.priority.logs.support', '日志作为补充线索');
    }
    return this.translateOrFallback('entity.detail.evidence.priority.logs.empty', '暂无日志线索');
  }

  get primaryTriageFocusLabel(): string {
    if (this.detail?.triageRecommendation?.headline) {
      return this.detail.triageRecommendation.headline;
    }
    switch (this.primaryTriageFocusKind) {
      case 'alerts':
        return this.shouldUseSuppressionFirstNarrative
          ? this.translateOrFallback('entity.detail.triage.focus.alerts.suppressed', '先确认降噪规则')
          : this.translateOrFallback('entity.detail.triage.focus.alerts', '先看活跃告警');
      case 'metrics':
        return this.translateOrFallback('entity.detail.triage.focus.metrics', '先看 OTLP 指标');
      case 'monitors':
        return this.translateOrFallback('entity.detail.triage.focus.monitors', '先看异常监控');
      case 'traces':
        return this.translateOrFallback('entity.detail.triage.focus.traces', '先看链路线索');
      case 'logs':
        return this.translateOrFallback('entity.detail.triage.focus.logs', '先看日志线索');
      default:
        return this.translateOrFallback('entity.detail.triage.focus.discovery', '先补证据入口');
    }
  }

  get primaryTriageFocusNarrative(): string {
    if (this.detail?.triageRecommendation?.summary) {
      return this.detail.triageRecommendation.summary;
    }
    switch (this.primaryTriageFocusKind) {
      case 'alerts':
        if (this.shouldUseSuppressionFirstNarrative) {
          return this.translateOrFallback(
            'entity.detail.triage.focus.alerts.copy.suppressed',
            '当前可见活跃告警很弱或为空，但已命中 silence / inhibit。先到告警中心确认这些 noise controls 是否解释了当前视图，再决定是否切到监控或日志。'
          );
        }
        if (this.hasNoiseControlSummary) {
          return this.translateOrFallback(
            'entity.detail.triage.focus.alerts.copy.with-noise-controls',
            '当前仍有可见活跃告警，但 noise controls 也在影响整体可见性，建议先在告警中心一起确认保留信号和被主动降噪的信号。'
          );
        }
        return this.translateOrFallback(
          'entity.detail.triage.focus.alerts.copy',
          '当前已经有活跃告警，先确认严重级别和最近变化，通常最容易直接解释实体状态。'
        );
      case 'metrics':
        return this.translateOrFallback(
          'entity.detail.triage.focus.metrics.copy',
          '当前推荐重点已经偏向 OTLP 指标上下文，适合先确认服务指标趋势，再决定是否切到日志工作台或链路工作台。'
        );
      case 'monitors':
        return this.translateOrFallback(
          'entity.detail.triage.focus.monitors.copy',
          '当前没有更强的告警信号，但已有异常监控，适合先确认它们是否直接解释了实体状态。'
        );
      case 'traces':
        return this.translateOrFallback(
          'entity.detail.triage.focus.traces.copy',
          '当前链路侧已经出现更直接的异常或活跃调用，适合先沿着调用链确认错误位置和受影响路径。'
        );
      case 'logs':
        return this.translateOrFallback(
          'entity.detail.triage.focus.logs.copy',
          '当前主要线索来自日志入口，可以顺着 handoff 直接查看资源过滤或 fallback 搜索。'
        );
      default:
        return this.translateOrFallback(
          'entity.detail.triage.focus.discovery.copy',
          '当前证据仍然较弱，建议先去遥测发现或编辑页补齐监控、日志或身份标识。'
        );
    }
  }

  get primaryTriageFocusActionLabel(): string {
    if (this.detail?.triageRecommendation?.actionLabel) {
      return this.detail.triageRecommendation.actionLabel;
    }
    switch (this.primaryTriageFocusKind) {
      case 'alerts':
        return this.shouldUseSuppressionFirstNarrative
          ? this.translateOrFallback('entity.detail.triage.focus.alerts.action.suppressed', '确认告警与降噪规则')
          : this.translateOrFallback('entity.detail.triage.focus.alerts.action', '查看告警');
      case 'metrics':
        return this.translateOrFallback('entity.detail.triage.focus.metrics.action', '打开指标工作台');
      case 'monitors':
        return this.translateOrFallback('entity.detail.triage.focus.monitors.action', '查看监控');
      case 'traces':
        return this.translateOrFallback('entity.detail.triage.focus.traces.action', '查看链路');
      case 'logs':
        return this.translateOrFallback('entity.detail.triage.focus.logs.action', '进入日志入口');
      default:
        return this.translateOrFallback('entity.detail.triage.focus.discovery.action', '去遥测发现');
    }
  }

  get primaryTriageFocusReasonLabel(): string {
    switch (this.primaryTriageFocusKind) {
      case 'alerts':
        if (this.shouldUseSuppressionFirstNarrative) {
          return this.translateOrFallback('entity.detail.triage.focus.alerts.reason.suppressed', '先看是否被静默或抑制');
        }
        return this.alertEvidencePriorityLabel;
      case 'metrics':
        return this.translateOrFallback('entity.detail.triage.focus.metrics.reason', '指标证据优先');
      case 'monitors':
        return this.monitorEvidencePriorityLabel;
      case 'traces':
        return this.translateOrFallback('entity.detail.triage.focus.traces.reason', '链路证据优先');
      case 'logs':
        return this.logEvidencePriorityLabel;
      default:
        return this.translateOrFallback('entity.detail.triage.focus.discovery.reason', '当前先补证据');
    }
  }

  get hasPrimaryTriageCodeNavigation(): boolean {
    switch (this.primaryTriageFocusKind) {
      case 'monitors':
        return this.getCodeNavigationUrlForHandoff('monitors') != null;
      case 'traces':
        return this.getCodeNavigationUrlForHandoff('traces') != null;
      case 'logs':
        return this.getCodeNavigationUrlForHandoff('logs') != null;
      default:
        return false;
    }
  }

  private get primaryTriageFocusKind(): 'alerts' | 'metrics' | 'monitors' | 'logs' | 'traces' | 'discovery' {
    switch (this.detail?.triageRecommendation?.recommendedFocus) {
      case 'metrics':
        return 'metrics';
      case 'traces':
        return 'traces';
      case 'logs':
        return 'logs';
      case 'evidence':
        return 'discovery';
      default:
        break;
    }
    if (this.activeAlertCount > 0) {
      return 'alerts';
    }
    if (this.shouldUseSuppressionFirstNarrative) {
      return 'alerts';
    }
    if (this.downMonitorCount > 0) {
      return 'monitors';
    }
    if (this.logHintCount > 0) {
      return 'logs';
    }
    return 'discovery';
  }

  get logHandoffOriginLabel(): string {
    switch (resolveEntityLogHandoffMode(this.getResponseHandoff('logs'))) {
      case 'trace':
        return this.translateOrFallback('entity.log.workbench.origin.trace', '当前入口来自 Trace / Span 线索');
      case 'severity':
        return this.translateOrFallback('entity.log.workbench.origin.severity', '当前入口保留了严重级别上下文');
      case 'search':
        return this.translateOrFallback('entity.log.workbench.origin.search', '当前入口来自实体推荐搜索');
      default:
        return this.translateOrFallback('entity.log.workbench.origin.default', '当前入口使用实体默认日志入口');
    }
  }

  getAlertTriageReason(alert: SingleAlert): string {
    const severity = this.getAlertSeverity(alert);
    if (alert.status === 'firing' && this.activeAlertCount === 1) {
      return this.translateOrFallback(
        'entity.detail.alerts.reason.unique',
        '当前只剩这一条活跃告警，建议先确认它是否已经直接解释了实体状态。'
      );
    }
    if (alert.status === 'firing' && severity != null && ['critical', 'fatal', 'emergency', 'severe', 'error'].includes(severity)) {
      return this.translateOrFallback(
        'entity.detail.alerts.reason.high',
        `当前告警属于 ${severity.toUpperCase()} 优先级，建议先确认影响范围和恢复路径。`
      );
    }
    if (alert.status === 'firing') {
      return this.translateOrFallback('entity.detail.alerts.reason.firing', '当前告警仍在活跃，适合先确认是否已经直接解释实体状态。');
    }
    if (alert.status === 'acknowledged') {
      return this.translateOrFallback(
        'entity.detail.alerts.reason.acknowledged',
        '当前告警已确认但尚未恢复，适合继续跟进处置进展，或确认是否还需要静默、抑制或恢复。'
      );
    }
    return this.translateOrFallback('entity.detail.alerts.reason.resolved', '当前告警已恢复，适合用来回看最近变化和恢复路径。');
  }

  getMonitorTriageReason(monitor: Monitor): string {
    if (monitor.status === 2) {
      return this.translateOrFallback('entity.detail.monitors.reason.down', '当前监控处于异常状态，优先确认它是否直接解释实体状态。');
    }
    if (this.monitorWorkbenchFallbackToAll) {
      return this.translateOrFallback('entity.detail.monitors.reason.fallback', '当前没有异常监控，这条结果来自已绑定监控回落列表。');
    }
    if (monitor.status === 0) {
      return this.translateOrFallback('entity.detail.monitors.reason.paused', '当前监控处于暂停状态，适合确认是否应恢复。');
    }
      return this.translateOrFallback('entity.detail.monitors.reason.healthy', '当前监控正常，可用于继续核对覆盖面和最近状态。');
  }

  get logHandoffTokens(): string[] {
    return buildEntityLogHandoffTokens(this.getResponseHandoff('logs'), {
      searchLabel: this.translateOrFallback('entity.response.context.search', '搜索'),
      severityLabel: this.translateOrFallback('entity.response.context.severity', '严重级别')
    });
  }

  get workspaceReadinessLabel(): string {
    return `${this.opsSummary.readinessScore || 0}% · ${this.getOpsReadinessSummary()}`;
  }

  get topRecommendedActions(): DetailWorkspaceAction[] {
    return this.recommendedActions.slice(0, 3);
  }

  get primaryFocusSummaryItems(): DetailFocusSummaryItem[] {
    return [
      {
        label: this.translateOrFallback('entity.detail.workspace.summary', '当前状态'),
        value: this.getStatusNarrative()
      },
      {
        label: this.translateOrFallback('entity.detail.evidence-updated', '证据更新时间'),
        value: this.lastEvidenceAtLabel
      },
      {
        label: this.translateOrFallback('entity.detail.workspace.readiness', '进展'),
        value: this.workspaceReadinessLabel
      }
    ];
  }

  get focusSupportActions(): DetailWorkspaceAction[] {
    return this.topRecommendedActions.slice(1, 3);
  }

  get focusSupportMetrics(): DetailFocusSummaryItem[] {
    return [
      {
        label: this.translateOrFallback('entity.detail.focus.metrics.catalog', '目录状态'),
        value: this.getCatalogCompletenessLabel()
      },
      {
        label: this.translateOrFallback('entity.detail.focus.metrics.done', '已完成'),
        value: `${this.getChecklistDoneCount()}/${this.checklistItemsCache.length || this.checklistItems.length}`
      },
      {
        label: this.translateOrFallback('entity.detail.focus.metrics.pending', '待补齐'),
        value: String(this.getChecklistPendingCount())
      }
    ];
  }

  get workspaceGuidanceHeadline(): string {
    return (
      this.topRecommendedActions[0]?.title
      || this.translateOrFallback('entity.detail.guidance.headline.default', '下一步：先补齐这个实体最关键的信息')
    );
  }

  get workspaceGuidanceDescription(): string {
    return (
      this.topRecommendedActions[0]?.description
      || this.translateOrFallback(
        'entity.detail.guidance.description.default',
        '当前实体已经汇总了状态、证据和上下文，建议先完成最靠前的一项，再继续查看日志、监控或链路。'
      )
    );
  }

  get workspaceGuidancePrimaryAction(): WorkspaceGuidanceAction | undefined {
    const action = this.topRecommendedActions[0];
    if (action == null) {
      return undefined;
    }
    return {
      key: action.key,
      label: action.actionLabel,
      tone: action.tone
    };
  }

  get workspaceGuidanceSecondaryAction(): WorkspaceGuidanceAction | undefined {
    const action = this.topRecommendedActions[1];
    if (action == null) {
      return undefined;
    }
    return {
      key: action.key,
      label: action.actionLabel,
      tone: action.tone
    };
  }

  get workspaceGuidanceActionItems(): PlatformSupportActionItem[] {
    return [this.workspaceGuidancePrimaryAction, this.workspaceGuidanceSecondaryAction]
      .filter((item): item is WorkspaceGuidanceAction => item != null)
      .map(item => ({
        key: item.key,
        label: item.label,
        disabled: item.disabled,
        tone: item.tone
      }));
  }

  get workspaceGuidanceFacts(): PlatformFactsStripItem[] {
    return [
      {
        label: this.translateOrFallback('entity.detail.workspace.summary', '当前状态'),
        value: this.getStatusNarrative(),
        tone: 'warning'
      },
      {
        label: this.translateOrFallback('entity.detail.evidence-updated', '证据更新时间'),
        value: this.lastEvidenceAtLabel
      },
      {
        label: this.translateOrFallback('entity.detail.workspace.readiness', '状态完整度'),
        value: this.workspaceReadinessLabel,
        tone: 'accent'
      }
    ];
  }

  get workspaceGuidanceNextLinks(): WorkspaceGuidanceLink[] {
    const usedKeys = new Set(this.topRecommendedActions.slice(0, 2).map(action => action.key));
    const links: WorkspaceGuidanceLink[] = this.recommendedActions
      .filter(action => !usedKeys.has(action.key))
      .slice(0, 3)
      .map(action => ({
        key: action.key,
        label: action.actionLabel,
        description: action.description
      }));
    if (links.length >= 3) {
      return links;
    }
    const existingKeys = new Set(links.map(item => item.key));
    const fallbacks: WorkspaceGuidanceLink[] = [
      {
        key: 'definition-preview',
        label: this.translateOrFallback('entity.detail.definition.open-short', '查看定义'),
        description: this.translateOrFallback(
          'entity.detail.guidance.next.definition',
          '先查看当前定义预览，再决定是否继续编辑定义或返回遥测发现。'
        )
      },
      {
        key: 'logs',
        label: this.translateOrFallback('log.manage.title', '日志'),
        description: this.translateOrFallback(
          'entity.detail.guidance.next.logs',
          '查看与当前实体相关的日志入口和检索上下文。'
        )
      },
      {
        key: 'traces',
        label: this.translateOrFallback('trace.center.detail.title', '链路'),
        description: this.translateOrFallback(
          'entity.detail.guidance.next.traces',
          '查看当前实体的跨度和上下游调用路径。'
        )
      }
    ];
    fallbacks.forEach(link => {
      if (!existingKeys.has(link.key) && links.length < 3) {
        links.push(link);
      }
    });
    return links;
  }

  get responseReadinessItems(): PlatformKeyValueGridItem[] {
    return [
      {
        label: this.i18nSvc.fanyi('entity.field.owner'),
        value: this.getOwnerReadinessLabel()
      },
      {
        label: this.i18nSvc.fanyi('entity.field.runbook'),
        value: this.getRunbookReadinessLabel()
      },
      {
        label: this.i18nSvc.fanyi('entity.field.system'),
        value: this.entity?.system || '-'
      },
      {
        label: this.i18nSvc.fanyi('entity.detail.status-page'),
        value: this.getStatusPageReadinessLabel()
      }
    ];
  }

  get hasResponseResultBanner(): boolean {
    return this.responseResultBanner != null;
  }

  get hasTriageSummary(): boolean {
    return this.triageSummary != null;
  }

  get triageSummaryModeLabel(): string {
    if (this.triageSummary?.mode === 'ai') {
      return this.translateOrFallback('entity.detail.triage-summary.mode.ai', 'AI 总结');
    }
    return this.translateOrFallback('entity.detail.triage-summary.mode.rule', '规则总结');
  }

  get displayedTriageSummaryHeadline(): string {
    if (this.triageSummary?.mode === 'ai') {
      return this.triageSummary.headline;
    }
    return this.getTriageSummaryFocusLabel(this.getTriageSummaryFocusKind());
  }

  get displayedTriageSummaryCopy(): string {
    if (this.triageSummary?.mode === 'ai') {
      return this.triageSummary.summary;
    }
    switch (this.getTriageSummaryFocusKind()) {
      case 'alerts':
        return this.alertEvidenceNarrative;
      case 'monitors':
        return this.monitorEvidenceNarrative;
      case 'logs':
        return this.logEvidenceNarrative;
      default:
        return this.primaryTriageFocusNarrative;
    }
  }

  get displayedTriageSummaryWhyNow(): string {
    if (this.triageSummary?.mode === 'ai') {
      return this.triageSummary.whyNow;
    }
    switch (this.getTriageSummaryFocusKind()) {
      case 'alerts': {
        if (this.shouldUseSuppressionFirstNarrative) {
          return this.translateOrFallback(
            'entity.detail.triage-summary.rule.why.alerts.suppressed',
            '当前可见活跃告警很弱或为空，但 noise controls 已经命中当前实体，所以第一步应先确认 silence / inhibit 是否解释了当前告警视图。'
          );
        }
        const highestSeverity = this.alertSeverityEntries[0]?.severity;
        if (this.activeAlertCount === 1) {
          const copy = this.translateOrFallback(
            'entity.detail.triage-summary.rule.why.alerts.unique',
            '当前只剩一条活跃告警，它最有可能直接解释当前实体状态。'
          );
          return this.appendNoiseControlNarrative(copy);
        }
        if (this.activeAlertCount > 0 && highestSeverity != null) {
          const copy = this.translateWithParamsOrFallback(
            'entity.detail.triage-summary.rule.why.alerts.priority',
            { severity: highestSeverity.toUpperCase() },
            `当前活跃告警里最高优先级为 ${highestSeverity.toUpperCase()}，而且它们仍然处于最强异常信号位。`
          );
          return this.appendNoiseControlNarrative(copy);
        }
        return this.appendNoiseControlNarrative(this.translateOrFallback(
          'entity.detail.triage-summary.rule.why.alerts.default',
          '当前实体最强的异常信号仍然来自活跃告警，先确认它们最容易解释现状。'
        ));
      }
      case 'monitors':
        return this.translateWithParamsOrFallback(
          'entity.detail.triage-summary.rule.why.monitors',
          { count: this.downMonitorCount },
          `当前没有更强的活跃告警，但还有 ${this.downMonitorCount} 个异常监控，监控证据最值得先确认。`
        );
      case 'logs':
        return this.translateOrFallback(
          'entity.detail.triage-summary.rule.why.logs',
          '当前没有更强的告警或异常监控，日志 handoff 已经是最可直接继续的线索。'
        );
      default:
        return this.translateOrFallback(
          'entity.detail.triage-summary.rule.why.discovery',
          '当前还缺少足够证据，先补监控、身份或日志入口，后面的 triage 才会更直接。'
        );
    }
  }

  get triageSummaryFocusLabel(): string {
    return this.getTriageSummaryFocusLabel(this.getTriageSummaryFocusKind());
  }

  get triageSummaryRefreshLabel(): string {
    if (this.hasTriageSummary) {
      return this.translateOrFallback('entity.detail.triage-summary.refresh', '刷新总结');
    }
    return this.translateOrFallback('entity.detail.triage-summary.generate', '生成总结');
  }

  get triageSummaryFallbackHint(): string | undefined {
    if (this.triageSummary?.mode !== 'rule') {
      return undefined;
    }
    return this.translateOrFallback(
      'entity.detail.triage-summary.fallback-hint',
      '当前展示的是规则总结；配置 AI provider 后可获得更自然的解释。'
    );
  }

  private getTriageSummaryFocusKind(): 'alerts' | 'monitors' | 'logs' | 'discovery' {
    switch (this.triageSummary?.recommendedFocus) {
      case 'alerts':
        return 'alerts';
      case 'monitors':
        return 'monitors';
      case 'logs':
        return 'logs';
      default:
        return 'discovery';
    }
  }

  private getTriageSummaryFocusLabel(focus: 'alerts' | 'monitors' | 'logs' | 'discovery'): string {
    switch (focus) {
      case 'alerts':
        return this.shouldUseSuppressionFirstNarrative
          ? this.translateOrFallback('entity.detail.triage.focus.alerts.suppressed', '先确认降噪规则')
          : this.translateOrFallback('entity.detail.triage.focus.alerts', '先看活跃告警');
      case 'monitors':
        return this.translateOrFallback('entity.detail.triage.focus.monitors', '先看异常监控');
      case 'logs':
        return this.translateOrFallback('entity.detail.triage.focus.logs', '先看日志线索');
      default:
        return this.translateOrFallback('entity.detail.triage.focus.discovery', '先补证据入口');
    }
  }

  get responseResultBannerTitle(): string {
    if (this.responseResultBanner == null) {
      return '';
    }
    const { kind, action, count } = this.responseResultBanner;
    switch (`${kind}:${action}`) {
      case 'alerts:resolve':
        return this.translateWithParamsOrFallback('entity.detail.response-result.alerts.resolve', { count }, `已恢复 ${count} 条告警`);
      case 'alerts:reopen':
        return this.translateWithParamsOrFallback('entity.detail.response-result.alerts.reopen', { count }, `已重开 ${count} 条告警`);
      case 'alerts:acknowledge':
        return this.translateWithParamsOrFallback('entity.detail.response-result.alerts.acknowledge', { count }, `已确认 ${count} 条告警`);
      case 'alerts:unacknowledge':
        return this.translateWithParamsOrFallback(
          'entity.detail.response-result.alerts.unacknowledge',
          { count },
          `已取消确认 ${count} 条告警`
        );
      case 'alerts:silence':
        return this.translateWithParamsOrFallback(
          'entity.detail.response-result.alerts.silence',
          { count },
          `已为 ${count} 条告警创建静默策略`
        );
      case 'alerts:inhibit':
        return this.translateWithParamsOrFallback(
          'entity.detail.response-result.alerts.inhibit',
          { count },
          `已为 ${count} 条告警创建抑制规则`
        );
      case 'monitors:pause':
        return this.translateWithParamsOrFallback('entity.detail.response-result.monitors.pause', { count }, `已暂停 ${count} 个监控`);
      case 'monitors:resume':
        return this.translateWithParamsOrFallback('entity.detail.response-result.monitors.resume', { count }, `已恢复 ${count} 个监控`);
      case 'relations:update':
        return this.translateWithParamsOrFallback(
          'entity.detail.response-result.relations.update',
          { count },
          `已更新 ${count} 条关系`
        );
      default:
        return this.translateOrFallback('entity.detail.response-result.default', '已完成响应动作');
    }
  }

  get responseResultBannerCopy(): string {
    if (this.responseResultBanner == null) {
      return '';
    }
    if (this.responseResultBanner.kind === 'alerts') {
      if (this.responseResultBanner.action === 'acknowledge') {
        if (this.activeAlertCount > 0) {
          return this.translateWithParamsOrFallback(
            'entity.detail.response-result.alerts.copy.acknowledge.remaining',
            { count: this.activeAlertCount },
            `告警已确认，当前仍有 ${this.activeAlertCount} 条活跃告警，建议继续检查是否还需要恢复、静默或转去监控。`
          );
        }
        return this.translateOrFallback(
          'entity.detail.response-result.alerts.copy.acknowledge.done',
          '告警已确认，当前可以继续看异常监控、日志线索或归属与处置。'
        );
      }
      if (this.responseResultBanner.action === 'unacknowledge') {
        return this.translateOrFallback(
          'entity.detail.response-result.alerts.copy.unacknowledge',
          '已取消确认告警，建议重新回到告警中心确认严重级别、最新变化和后续处置。'
        );
      }
      if (this.responseResultBanner.action === 'silence') {
        if (this.activeAlertCount > 0) {
          return this.translateWithParamsOrFallback(
            'entity.detail.response-result.alerts.copy.silence.remaining',
            { count: this.activeAlertCount },
            `静默策略已经创建，当前仍有 ${this.activeAlertCount} 条活跃告警，建议继续确认是否还需要恢复或转去看异常监控。`
          );
        }
        if (this.downMonitorCount > 0) {
          return this.translateWithParamsOrFallback(
            'entity.detail.response-result.alerts.copy.silence.monitors',
            { count: this.downMonitorCount },
            `静默策略已经创建，当前活跃告警已缓解，但还有 ${this.downMonitorCount} 个异常监控，建议继续核对监控证据。`
          );
        }
        return this.translateOrFallback(
          'entity.detail.response-result.alerts.copy.silence.done',
          '静默策略已经创建，当前可以继续看日志线索、关系或归属与处置。'
        );
      }
      if (this.responseResultBanner.action === 'inhibit') {
        if (this.activeAlertCount > 0) {
          return this.translateWithParamsOrFallback(
            'entity.detail.response-result.alerts.copy.inhibit.remaining',
            { count: this.activeAlertCount },
            `抑制规则已经创建，当前仍有 ${this.activeAlertCount} 条活跃告警，建议继续确认是否还有需要恢复的告警或转去看异常监控。`
          );
        }
        if (this.downMonitorCount > 0) {
          return this.translateWithParamsOrFallback(
            'entity.detail.response-result.alerts.copy.inhibit.monitors',
            { count: this.downMonitorCount },
            `抑制规则已经创建，当前活跃告警已缓解，但还有 ${this.downMonitorCount} 个异常监控，建议继续核对监控证据。`
          );
        }
        return this.translateOrFallback(
          'entity.detail.response-result.alerts.copy.inhibit.done',
          '抑制规则已经创建，当前可以继续看日志线索、关系或归属与处置。'
        );
      }
      if (this.activeAlertCount > 0) {
        return this.translateWithParamsOrFallback(
          'entity.detail.response-result.alerts.copy.remaining',
          { count: this.activeAlertCount },
          `当前仍有 ${this.activeAlertCount} 条活跃告警，建议继续检查告警中心或切到异常监控。`
        );
      }
      if (this.downMonitorCount > 0) {
        return this.translateWithParamsOrFallback(
          'entity.detail.response-result.alerts.copy.monitors',
          { count: this.downMonitorCount },
          `活跃告警已经缓解，当前还有 ${this.downMonitorCount} 个异常监控，建议继续核对监控证据。`
        );
      }
      return this.translateOrFallback(
        'entity.detail.response-result.alerts.copy.done',
        '当前首要告警已经收敛，可以继续看监控、日志或归属与处置。'
      );
    }
    if (this.responseResultBanner.kind === 'relations') {
      return this.translateWithParamsOrFallback(
        'entity.detail.response-result.relations.copy.done',
        { count: this.responseResultBanner.count },
        '关系上下文已经更新，继续确认关键上下游是否都已覆盖，再回到日志、告警或归属信息。'
      );
    }
    if (this.downMonitorCount > 0) {
      return this.translateWithParamsOrFallback(
        'entity.detail.response-result.monitors.copy.remaining',
        { count: this.downMonitorCount },
        `当前仍有 ${this.downMonitorCount} 个异常监控，建议继续确认是否还有直接解释实体状态的监控证据。`
      );
    }
    if (this.activeAlertCount > 0) {
      return this.translateOrFallback(
        'entity.detail.response-result.monitors.copy.alerts',
        `异常监控已经收敛，当前更值得回到活跃告警，继续确认最近变化。`
      );
    }
    return this.translateOrFallback(
      'entity.detail.response-result.monitors.copy.done',
      '当前异常监控已经收敛，可以继续看日志线索、关系或归属与处置。'
    );
  }

  get responseResultBannerActionLabel(): string {
    const nextAction = this.topRecommendedActions[0];
    return nextAction?.title || this.translateOrFallback('entity.detail.response-result.action.default', '继续下一步');
  }

  get noiseControlSummary(): EntityNoiseControlSummary | undefined {
    return this.detail?.noiseControlSummary;
  }

  get hasPossibleAlertSuppression(): boolean {
    return this.noiseControlSummary?.possibleAlertSuppression ?? false;
  }

  get shouldUseSuppressionFirstNarrative(): boolean {
    return this.activeAlertCount === 0 && this.hasPossibleAlertSuppression;
  }

  get hasNoiseControlSummary(): boolean {
    const summary = this.noiseControlSummary;
    return summary != null && (summary.activeSilenceCount > 0 || summary.matchingInhibitCount > 0 || summary.possibleAlertSuppression);
  }

  get activeSilenceRules(): EntityNoiseControlRule[] {
    return this.noiseControlSummary?.activeSilences || [];
  }

  get matchingInhibitRules(): EntityNoiseControlRule[] {
    return this.noiseControlSummary?.matchingInhibits || [];
  }

  private appendNoiseControlNarrative(copy: string): string {
    if (!this.hasNoiseControlSummary || this.shouldUseSuppressionFirstNarrative) {
      return copy;
    }
    return `${copy} ${this.translateOrFallback(
      'entity.detail.noise-controls.guidance.inline',
      '同时，noise controls 也在影响整体可见性，需要一起确认哪些信号被主动降噪。'
    )}`;
  }

  get noiseControlSummaryTitle(): string {
    const summary = this.noiseControlSummary;
    if (summary == null) {
      return '';
    }
    if (summary.possibleAlertSuppression) {
      return this.translateOrFallback(
        'entity.detail.noise-controls.title.suppressed',
        '当前实体可能正被降噪规则影响'
      );
    }
    return this.translateOrFallback(
      'entity.detail.noise-controls.title.active',
      '当前实体已匹配降噪规则'
    );
  }

  get noiseControlSummaryCopy(): string {
    const summary = this.noiseControlSummary;
    if (summary == null) {
      return '';
    }
    if (summary.possibleAlertSuppression) {
      return this.translateWithParamsOrFallback(
        'entity.detail.noise-controls.copy.suppressed',
        {
          silenceCount: summary.activeSilenceCount,
          inhibitCount: summary.matchingInhibitCount
        },
        `当前没有更强的活跃告警信号，但已有 ${summary.activeSilenceCount} 条静默规则和 ${summary.matchingInhibitCount} 条抑制规则匹配到当前实体，先确认是否因此影响了告警可见性。`
      );
    }
    return this.translateWithParamsOrFallback(
      'entity.detail.noise-controls.copy.active',
      {
        silenceCount: summary.activeSilenceCount,
        inhibitCount: summary.matchingInhibitCount
      },
      `当前实体已匹配 ${summary.activeSilenceCount} 条静默规则和 ${summary.matchingInhibitCount} 条抑制规则，排障时需要一起判断哪些告警正在被主动降噪。`
    );
  }

  get noiseControlGuidanceCopy(): string {
    if (this.activeAlertCount > 0) {
      return this.translateOrFallback(
        'entity.detail.noise-controls.guidance.with-alerts',
        '当前仍有可见告警，先结合这些规则确认哪些信号被保留、哪些被主动收敛。'
      );
    }
    return this.translateOrFallback(
      'entity.detail.noise-controls.guidance.without-alerts',
      '当前告警偏少或为空时，先确认这些降噪规则是否解释了当前视图，再决定是否切到监控或日志。'
    );
  }

  get silenceManagementActionLabel(): string {
    if (this.hasPossibleAlertSuppression && this.activeSilenceRules.length === 0) {
      return this.translateOrFallback(
        'entity.detail.noise-controls.manage-silence-create',
        '查看或新建静默规则'
      );
    }
    return this.translateOrFallback(
      'entity.detail.noise-controls.manage-silence',
      '查看静默规则'
    );
  }

  get inhibitManagementActionLabel(): string {
    if (this.hasPossibleAlertSuppression && this.matchingInhibitRules.length === 0) {
      return this.translateOrFallback(
        'entity.detail.noise-controls.manage-inhibit-create',
        '查看或新建抑制规则'
      );
    }
    return this.translateOrFallback(
      'entity.detail.noise-controls.manage-inhibit',
      '查看抑制规则'
    );
  }

  getNoiseControlRuleLabel(rule: EntityNoiseControlRule): string {
    if (rule.global) {
      return this.translateOrFallback('entity.detail.noise-controls.rule.global', '全局静默');
    }
    const labelCount = rule.matchedLabels?.length || 0;
    if (labelCount <= 0) {
      return this.translateOrFallback('entity.detail.noise-controls.rule.default', '按共享标签命中');
    }
    return this.translateWithParamsOrFallback(
      'entity.detail.noise-controls.rule.labels',
      { count: labelCount },
      `命中 ${labelCount} 个共享标签`
    );
  }

  openSilenceManagement(): void {
    this.router.navigate(['/alert/silence'], {
      queryParams: this.buildNoiseControlManagementQueryParams('silence')
    });
  }

  openInhibitManagement(): void {
    this.router.navigate(['/alert/inhibit'], {
      queryParams: this.buildNoiseControlManagementQueryParams('inhibit')
    });
  }

  shouldShowWorkspaceActionCopy(item: DetailWorkspaceAction): boolean {
    const title = this.trimText(item.title);
    const copy = this.trimText(item.actionLabel);
    return title != null && copy != null && title !== copy;
  }

  get codeLocations(): Array<{ repositoryURL?: string; paths?: string[] }> {
    return this.entity?.hertzbeat?.codeLocations || [];
  }

  get hertzbeatEventQueries(): Array<{ name?: string; query?: string }> {
    return this.entity?.hertzbeat?.events || [];
  }

  get hertzbeatLogQueries(): Array<{ name?: string; query?: string }> {
    return this.entity?.hertzbeat?.logs || [];
  }

  get performanceTags(): string[] {
    return this.entity?.hertzbeat?.performanceData?.tags || [];
  }

  get pipelineFingerprints(): string[] {
    return this.entity?.hertzbeat?.pipelines?.fingerprints || [];
  }

  get hasHertzBeatCatalogContext(): boolean {
    return (
      this.codeLocations.length > 0 ||
      this.hertzbeatEventQueries.length > 0 ||
      this.hertzbeatLogQueries.length > 0 ||
      this.performanceTags.length > 0 ||
      this.pipelineFingerprints.length > 0
    );
  }

  get hasCatalogStructureContext(): boolean {
    return (
      this.componentOfList.length > 0 ||
      this.componentList.length > 0 ||
      this.implementedByList.length > 0 ||
      this.languageList.length > 0 ||
      this.trimText(this.entity?.inheritFrom) != null
    );
  }

  get hasApiContractContext(): boolean {
    return this.entity?.type === 'api' && (this.implementedByList.length > 0 || this.apiInterfaceFileRef != null || this.hasInlineApiInterfaceDefinition);
  }

  get hasConfigExtensionContext(): boolean {
    return this.hasNonEmptyRecord(this.entity?.integrations) || this.hasNonEmptyRecord(this.entity?.extensions);
  }

  get hasDefinitionImportActivities(): boolean {
    return this.definitionImportActivities.length > 0;
  }

  get hasGovernanceHistory(): boolean {
    return this.governanceHistoryItems.length > 0;
  }

  get sharedGovernancePresets(): EntityDiscoveryGovernancePreset[] {
    return [...this.governancePresets]
      .sort((left, right) => {
        const relevance = this.getGovernancePresetMatchScore(right) - this.getGovernancePresetMatchScore(left);
        if (relevance !== 0) {
          return relevance;
        }
        return this.compareGovernanceTimestamp(right.updatedAt, left.updatedAt);
      })
      .slice(0, 3);
  }

  get matchingGovernancePresets(): EntityDiscoveryGovernancePreset[] {
    return this.sharedGovernancePresets.filter(preset => this.getGovernancePresetMatchScore(preset) > 0);
  }

  get preferredGovernancePreset(): EntityDiscoveryGovernancePreset | undefined {
    return this.matchingGovernancePresets[0] || this.sharedGovernancePresets[0];
  }

  get preferredGovernancePresetConflictFields(): Array<'owner' | 'system' | 'environment' | 'source' | 'status'> {
    return this.getGovernancePresetConflictFields(this.preferredGovernancePreset);
  }

  get preferredGovernancePresetConflictFieldLabels(): string[] {
    return this.preferredGovernancePresetConflictFields.map(field => this.getGovernanceFieldLabel(field));
  }

  get detailGovernanceHookCards(): DetailGovernanceHookCard[] {
    const bestPreset = this.preferredGovernancePreset;
    const presetAligned = bestPreset != null && this.preferredGovernancePresetConflictFieldLabels.length === 0;
    const ownershipReady = this.hasOwner() && this.hasRunbook() && this.trimText(this.entity?.system) != null;
    const definitionReady = (this.detail?.definitionActivities?.length || 0) > 0 || this.hasDefinitionImportActivities;
    const telemetryReady = this.hasEvidence();
    const registrySignal = this.getDetailRegistrySignal();
    const cards: Array<Omit<DetailGovernanceHookCard, 'priority' | 'priorityLabel' | 'nextStep'>> = [
      {
        key: 'registry',
        title: this.translateOrFallback('entity.governance.registry.signal.title', '共享预设状态'),
        metric: registrySignal.metric,
        summary: registrySignal.summary,
        actionLabel: this.getDetailRegistryActionLabel(registrySignal),
        action: this.getDetailRegistryAction(registrySignal)
      },
      {
        key: 'preset',
        title: this.translateOrFallback('entity.detail.hooks.preset.title', '共享预设对齐'),
        metric: presetAligned ? this.translateOrFallback('entity.detail.hooks.ready', '已就绪') : this.translateOrFallback('entity.detail.hooks.pending', '待补齐'),
        summary:
          bestPreset != null
            ? presetAligned
              ? this.translateOrFallback(
                  'entity.detail.hooks.preset.ready',
                  `当前实体已经能直接沿用共享预设 ${bestPreset.name}，后续可以继续复用这组默认值。`
                )
              : this.translateOrFallback(
                  'entity.detail.hooks.preset.pending',
                  `当前实体和共享预设 ${bestPreset.name} 还有差异，建议先检查相关字段。`
                )
            : this.translateOrFallback('entity.detail.hooks.preset.empty', '当前实体还没有匹配的共享预设，建议先保存一组可复用的默认值。'),
        actionLabel: this.translateOrFallback('entity.detail.hooks.preset.action', '查看共享预设'),
        action: bestPreset != null ? 'preset' : 'discovery',
        preset: bestPreset
      },
      {
        key: 'ownership',
        title: this.translateOrFallback('entity.detail.hooks.ownership.title', '归属基线'),
        metric: ownershipReady ? this.translateOrFallback('entity.detail.hooks.ready', '已就绪') : this.translateOrFallback('entity.detail.hooks.pending', '待补齐'),
        summary: this.translateOrFallback(
          'entity.detail.hooks.ownership.copy',
          '负责人、系统和处置手册已经比较完整，后续查看和处理都会更直接。'
        ),
        actionLabel: this.translateOrFallback('entity.detail.hooks.ownership.action', '补齐归属字段'),
        action: 'editor',
        preset: bestPreset
      },
      {
        key: 'definition',
        title: this.translateOrFallback('entity.detail.hooks.definition.title', '定义状态'),
        metric: definitionReady ? this.translateOrFallback('entity.detail.hooks.ready', '已就绪') : this.translateOrFallback('entity.detail.hooks.pending', '待补齐'),
        summary: this.translateOrFallback(
          'entity.detail.hooks.definition.copy',
          '定义和最近更新已经同步到目录中，可以继续检查内容和生命周期信息。'
        ),
        actionLabel: this.translateOrFallback('entity.detail.hooks.definition.action', '查看导入定义'),
        action: 'definition',
        preset: bestPreset
      },
      {
        key: 'telemetry',
        title: this.translateOrFallback('entity.detail.hooks.telemetry.title', '证据收敛'),
        metric: telemetryReady ? this.translateOrFallback('entity.detail.hooks.ready', '已就绪') : this.translateOrFallback('entity.detail.hooks.pending', '待补齐'),
        summary: this.translateOrFallback(
          'entity.detail.hooks.telemetry.copy',
          '监控、身份、告警和日志入口已经可以一起作为当前实体的证据入口。'
        ),
        actionLabel: this.translateOrFallback('entity.detail.hooks.telemetry.action', '补充证据'),
        action: 'discovery',
        preset: bestPreset
      }
    ];
    return cards.map(card =>
      card.key === 'registry'
        ? {
            ...card,
            priority: registrySignal.priority,
            priorityLabel: registrySignal.priorityLabel,
            nextStep: registrySignal.nextStep
          }
        : {
            ...card,
            ...buildGovernanceRecipePresentation(
              card.key,
              (card.key === 'preset' && presetAligned)
                || (card.key === 'ownership' && ownershipReady)
                || (card.key === 'definition' && definitionReady)
                || (card.key === 'telemetry' && telemetryReady),
              this.translateOrFallback.bind(this)
            )
          }
    );
  }

  get detailGovernancePolicyCards(): DetailGovernancePolicyCard[] {
    const cards: DetailGovernancePolicyCard[] = [];
    const registrySignal = this.getDetailRegistrySignal();
    if (requiresGovernanceRegistryRemediation(registrySignal)) {
      const registryPolicy = buildGovernanceRegistryPolicyPresentation(registrySignal, this.translateOrFallback.bind(this));
      cards.push({
        key: 'registry',
        title: registryPolicy.title,
        summary: registryPolicy.summary,
        actionLabel: this.getDetailRegistryActionLabel(registrySignal),
        action: this.getDetailRegistryAction(registrySignal)
      });
    }
    const bestPreset = this.preferredGovernancePreset;
    const presetConflictLabels = this.preferredGovernancePresetConflictFieldLabels;
    if (bestPreset != null && presetConflictLabels.length > 0) {
      cards.push({
        key: 'preset',
        title: this.translateOrFallback('entity.detail.policy.preset.conflict.title', '先检查共享预设差异'),
        summary: this.translateOrFallback(
          'entity.detail.policy.preset.conflict.copy',
          `当前实体与共享预设 ${bestPreset.name} 在 ${presetConflictLabels.join('、')} 上还有差异，建议先检查相关字段。`
        ),
        actionLabel: this.translateOrFallback('entity.detail.policy.preset.action', '查看共享预设'),
        action: 'preset',
        preset: bestPreset
      });
    } else if (bestPreset != null && this.getGovernancePresetMatchScore(bestPreset) > 0) {
      cards.push({
        key: 'preset',
        title: this.translateOrFallback('entity.detail.policy.preset.title', '沿用共享预设'),
        summary: this.translateOrFallback(
          'entity.detail.policy.preset.copy',
          `当前实体与预设 ${bestPreset.name} 已经有较多重合信息，继续沿用这组 owner/system/source 会更稳。`
        ),
        actionLabel: this.translateOrFallback('entity.detail.policy.preset.action', '查看共享预设'),
        action: 'preset',
        preset: bestPreset
      });
    } else {
      cards.push({
        key: 'preset',
        title: this.translateOrFallback('entity.detail.policy.seed.title', '保存共享预设'),
        summary: this.translateOrFallback(
          'entity.detail.policy.seed.copy',
          '当前实体还没有明显匹配的共享预设，建议去遥测发现把这组 owner/system/source 保存下来。'
        ),
        actionLabel: this.translateOrFallback('entity.detail.policy.seed.action', '去遥测发现'),
        action: 'discovery'
      });
    }

    if (!this.hasOwner() || !this.hasRunbook() || this.missingCatalogMetadataFields.length > 0) {
      cards.push({
        key: 'catalog',
        title: this.translateOrFallback('entity.detail.policy.catalog.title', '补齐目录信息'),
        summary: this.translateOrFallback(
          'entity.detail.policy.catalog.copy',
          `当前还缺 ${[!this.hasOwner() ? this.translateOrFallback('entity.field.owner', '负责人') : undefined, !this.hasRunbook() ? this.translateOrFallback('entity.field.runbook', '处置手册') : undefined, ...this.missingCatalogMetadataFields]
            .filter((value): value is string => value != null)
            .join('、')}，建议先收紧目录字段。`
        ),
        actionLabel: this.translateOrFallback('entity.detail.policy.catalog.action', '编辑目录字段'),
        action: 'editor'
      });
    }

    if (!this.hasEvidence()) {
      cards.push({
        key: 'telemetry',
        title: this.translateOrFallback('entity.detail.policy.telemetry.title', '收敛遥测证据'),
        summary: this.translateOrFallback(
          'entity.detail.policy.telemetry.copy',
          '当前实体还没有形成稳定的监控、身份或日志入口，建议按当前上下文继续在遥测发现里补充线索。'
        ),
        actionLabel: this.translateOrFallback('entity.detail.policy.telemetry.action', '去遥测发现'),
        action: 'discovery'
      });
    } else if (this.entity?.type === 'api' && !this.hasApiContractContext) {
      cards.push({
        key: 'definition',
        title: this.translateOrFallback('entity.detail.policy.definition.title', '补齐接口定义'),
        summary: this.translateOrFallback(
          'entity.detail.policy.definition.copy',
          'API 实体已经有目录上下文，但还缺实现关系或接口定义，建议直接回到导入定义补齐。'
        ),
        actionLabel: this.translateOrFallback('entity.definition.edit', '编辑定义'),
        action: 'definition'
      });
    }

    return cards.slice(0, 3);
  }

  get lifecycleRecords(): DetailLifecycleRecord[] {
    const records: DetailLifecycleRecord[] = [];
    const entity = this.entity;
    const latestCatalogHistory = this.latestCatalogGovernanceHistoryItem;
    const registrySignal = this.getDetailRegistrySignal();
    if (entity != null) {
      const sourceParts = [
        entity.owner || undefined,
        this.trimText(entity.system),
        this.trimText(entity.environment),
        this.trimText(entity.lifecycle),
        registrySignal.metric
      ].filter((value): value is string => this.trimText(value) != null);
      records.push({
        id: latestCatalogHistory?.id || 'source',
        kind: 'source',
        title:
          latestCatalogHistory != null
            ? this.translateOrFallback('entity.detail.lifecycle.catalog', '目录治理')
            : this.translateOrFallback('entity.detail.lifecycle.source', '来源更新'),
        summary:
          latestCatalogHistory?.summary ||
          this.translateOrFallback('entity.detail.lifecycle.source.summary', `当前实体来源为 ${this.getSourceLabel()}。`),
        detail: latestCatalogHistory?.detail || (sourceParts.length > 0 ? sourceParts.join(' · ') : undefined),
        happenedAt: latestCatalogHistory?.happenedAt || this.formatActivityTime(entity.gmtUpdate || entity.gmtCreate),
        actionLabel:
          latestCatalogHistory != null
            ? this.getGovernanceHistoryActionLabel(latestCatalogHistory)
            : entity.source === 'manual'
              ? this.translateOrFallback('common.edit', '编辑')
              : this.translateOrFallback('entity.detail.next.discovery.action', '去遥测发现')
      });
    }

    const latestPresetActivity = this.latestPresetWorkspaceActivity;
    if (latestPresetActivity != null) {
      const presetName = this.trimText(this.latestPresetWorkspacePreset?.name);
      const presetConflictNote =
        this.latestPresetWorkspacePreset != null && this.getGovernancePresetConflictFieldLabelsForPreset(this.latestPresetWorkspacePreset).length > 0
          ? `${this.translateOrFallback('entity.detail.policy.preset.conflict.note', '待对齐')} ${this.getGovernancePresetConflictFieldLabelsForPreset(this.latestPresetWorkspacePreset).join('、')}`
          : undefined;
      const detailSegments = [presetName, this.trimText(latestPresetActivity.detail)].filter(
        (value): value is string => this.trimText(value) != null
      );
      if (presetName != null && this.trimText(latestPresetActivity.detail)?.includes(presetName)) {
        detailSegments.shift();
      }
      const registrySummary = this.getGovernanceRegistrySummary();
      if (registrySummary != null) {
        detailSegments.push(registrySummary);
      }
      if (presetConflictNote != null) {
        detailSegments.push(presetConflictNote);
      }
      records.push({
        id: `preset:${latestPresetActivity.id}`,
        kind: 'preset',
        title: this.translateOrFallback('entity.detail.lifecycle.preset', '共享预设'),
        summary:
          this.trimText(latestPresetActivity.summary)
          || this.translateOrFallback('entity.definition.workspace.activity.preset-applied', '已应用共享预设'),
        detail: detailSegments.length > 0 ? detailSegments.join(' · ') : undefined,
        happenedAt: this.trimText(latestPresetActivity.happenedAt),
        actionLabel: this.translateOrFallback('entity.detail.lifecycle.preset.action', '按预设继续治理')
      });
    }

    const latestDefinitionActivity = this.definitionImportActivities[0];
    if (latestDefinitionActivity != null) {
      records.push({
        id: `definition:${latestDefinitionActivity.id}`,
        kind: 'definition',
        title: this.translateOrFallback('entity.detail.lifecycle.definition', '定义更新'),
        summary: latestDefinitionActivity.summary,
        detail: this.trimText(latestDefinitionActivity.detail),
        happenedAt: latestDefinitionActivity.happenedAt,
        actionLabel: this.translateOrFallback('entity.definition.edit', '编辑定义')
      });
    }

    const latestSharedSnapshot = this.latestSharedGovernanceSnapshot;
    if (
      latestSharedSnapshot != null
      && !records.some(record => record.summary === latestSharedSnapshot.summary && record.happenedAt === latestSharedSnapshot.happenedAt)
    ) {
      const sharedMeta = this.getSharedGovernanceSnapshotMeta(latestSharedSnapshot);
      records.push({
        id: `shared:${latestSharedSnapshot.key}:${latestSharedSnapshot.happenedAt || latestSharedSnapshot.summary}`,
        kind: 'shared',
        title: this.translateOrFallback('entity.detail.lifecycle.shared', '共享目录状态'),
        summary: latestSharedSnapshot.summary,
        detail: this.joinLifecycleDetail(sharedMeta, registrySignal.metric, this.getGovernanceRegistrySummary(), this.trimText(latestSharedSnapshot.detail)),
        happenedAt: latestSharedSnapshot.happenedAt,
        actionLabel: latestSharedSnapshot.actionLabel
      });
    }

    const latestDiscoveryHistory = this.latestDiscoveryGovernanceHistoryItem;
    if (latestDiscoveryHistory != null) {
      records.push({
        id: latestDiscoveryHistory.id,
        kind: 'discovery',
        title: this.translateOrFallback('entity.detail.lifecycle.discovery', '归并治理'),
        summary: latestDiscoveryHistory.summary,
        detail: this.trimText(latestDiscoveryHistory.detail),
        happenedAt: latestDiscoveryHistory.happenedAt,
        actionLabel: this.getGovernanceHistoryActionLabel(latestDiscoveryHistory)
      });
    }
    return records.filter(record => this.trimText(record.happenedAt) != null || this.trimText(record.summary) != null);
  }

  get latestDiscoveryGovernanceActivity(): DiscoveryGovernanceActivity | undefined {
    const entityName = this.trimText(this.entity?.name);
    if (this.serverDiscoveryActivities.length > 0) {
      return this.serverDiscoveryActivities[0];
    }
    return readDiscoveryGovernanceActivities(24)
      .filter(activity => this.matchesDiscoveryGovernanceActivity(activity, entityName))
      .sort((left, right) => this.compareGovernanceTimestamp(left.happenedAt, right.happenedAt))[0];
  }

  get latestGovernanceHistoryItem(): DetailGovernanceHistoryItem | undefined {
    return this.governanceHistoryItems[0];
  }

  get latestDiscoveryGovernanceHistoryItem(): DetailGovernanceHistoryItem | undefined {
    return this.governanceHistoryItems.find(item => item.kind === 'discovery');
  }

  get latestCatalogGovernanceHistoryItem(): DetailGovernanceHistoryItem | undefined {
    return this.governanceHistoryItems.find(item => item.kind === 'catalog');
  }

  get latestPresetWorkspaceActivity(): DefinitionImportActivity | undefined {
    return this.serverWorkspaceActivities.find(activity => this.isGovernancePresetWorkspaceActivity(activity));
  }

  get latestPresetWorkspacePreset(): EntityDiscoveryGovernancePreset | undefined {
    return this.resolveGovernancePresetForActivity(this.latestPresetWorkspaceActivity);
  }

  get latestSharedDiscoveryGovernanceHookActivity(): DiscoveryGovernanceActivity | undefined {
    return this.sharedDiscoveryActivities.find(activity => this.isGovernanceHookDiscoveryActivity(activity));
  }

  get latestSharedDefinitionGovernanceHookActivity(): DefinitionImportActivity | undefined {
    return this.sharedWorkspaceActivities.find(activity => this.isGovernanceHookWorkspaceActivity(activity));
  }

  get latestSharedGovernanceSnapshot(): DetailSharedGovernanceSnapshotCard | undefined {
    return this.sharedGovernanceSnapshots[0];
  }

  get sharedGovernanceSnapshots(): DetailSharedGovernanceSnapshotCard[] {
    const snapshots: DetailSharedGovernanceSnapshotCard[] = [];
    const discovery = this.latestSharedDiscoveryGovernanceHookActivity;
    if (discovery != null) {
      snapshots.push({
        key: 'discovery',
        title: this.translateOrFallback('entity.detail.snapshot.discovery.title', '最近发现记录'),
        status: discovery.status,
        summary: discovery.summary,
        detail: this.trimText(discovery.detail),
        happenedAt: this.normalizeGovernanceTimestamp(discovery.happenedAt),
        actionLabel: this.translateOrFallback('entity.detail.snapshot.discovery.action', '查看发现记录'),
        action: 'discovery'
      });
    }
    const definition = this.latestSharedDefinitionGovernanceHookActivity;
    if (definition != null) {
      snapshots.push({
        key: 'definition',
        title: this.translateOrFallback('entity.detail.snapshot.definition.title', '最近定义记录'),
        status: definition.status,
        summary: definition.summary,
        detail: this.trimText(definition.detail),
        happenedAt: this.normalizeGovernanceTimestamp(definition.happenedAt),
        actionLabel: this.translateOrFallback('entity.detail.snapshot.definition.action', '查看定义记录'),
        action: 'definition'
      });
    }
    return snapshots.sort((left, right) => this.compareGovernanceTimestamp(left.happenedAt, right.happenedAt));
  }

  getGovernanceRegistrySummary(): string | undefined {
    if (this.governancePresetRegistrySource === 'empty') {
      return undefined;
    }
    return `${this.translateOrFallback('entity.governance.registry.label', '当前来源')}：${this.translateOrFallback(
      'entity.governance.registry.' + this.governancePresetRegistrySource,
      this.governancePresetRegistrySource
    )}`;
  }

  get canSyncGovernancePresetRegistry(): boolean {
    return this.governancePresetRegistrySource === 'local' && readDiscoveryGovernancePresets(8).length > 0;
  }

  refreshGovernancePresetRegistry(): void {
    this.loadGovernancePresets();
    this.recordDetailRegistryActivity(
      this.translateOrFallback('entity.governance.registry.refresh.activity', '已刷新共享预设'),
      'info',
      this.getGovernanceRegistrySummary()
    );
    this.notifySvc.success(
      this.translateOrFallback('entity.detail', 'Entity Detail'),
      this.translateOrFallback('entity.governance.registry.refresh.success', '已刷新共享预设。')
    );
  }

  syncGovernancePresetRegistry(): void {
    const localPresets = readDiscoveryGovernancePresets(8);
    if (localPresets.length === 0) {
      this.notifySvc.warning(
        this.translateOrFallback('entity.detail', 'Entity Detail'),
        this.translateOrFallback('entity.governance.registry.sync.empty', '当前没有可保存的本地预设。')
      );
      return;
    }
    forkJoin(
      localPresets.map(preset => this.entitySvc.saveDiscoveryGovernancePreset(preset).pipe(catchError(() => of(undefined))))
    ).subscribe({
      next: results => {
        const syncedCount = results.filter(result => result?.code === 0).length;
        this.loadGovernancePresets();
        this.recordDetailRegistryActivity(
          syncedCount > 0
            ? this.translateOrFallback('entity.governance.registry.sync.activity', '已将本地预设保存为共享预设')
            : this.translateOrFallback('entity.governance.registry.sync.warning', '当前无法写入共享预设，暂时只保留本地预设。'),
          syncedCount > 0 ? 'success' : 'warning',
          this.joinLifecycleDetail(
            this.getGovernanceRegistrySummary(),
            syncedCount > 0 ? `${syncedCount} ${this.translateOrFallback('entity.discovery.preset.shared-title', '共享预设')}` : undefined
          )
        );
        if (syncedCount > 0) {
          this.notifySvc.success(
            this.translateOrFallback('entity.detail', 'Entity Detail'),
            this.translateOrFallback('entity.governance.registry.sync.success', '本地预设已保存为共享预设。')
          );
          return;
        }
        this.notifySvc.warning(
          this.translateOrFallback('entity.detail', 'Entity Detail'),
          this.translateOrFallback('entity.governance.registry.sync.warning', '当前无法写入共享预设，暂时只保留本地预设。')
        );
      },
      error: () => {
        this.notifySvc.warning(
          this.translateOrFallback('entity.detail', 'Entity Detail'),
          this.translateOrFallback('entity.governance.registry.sync.warning', '当前无法写入共享预设，暂时只保留本地预设。')
        );
      }
    });
  }

  private joinLifecycleDetail(...segments: Array<string | undefined>): string | undefined {
    const values = segments.filter((value): value is string => this.trimText(value) != null);
    const unique = values.filter((value, index, all) => all.indexOf(value) === index);
    return unique.length > 0 ? unique.join(' · ') : undefined;
  }

  private recordDetailRegistryActivity(
    summary: string,
    status: DiscoveryGovernanceActivity['status'],
    detail?: string
  ): void {
    const entityName = this.trimText(this.entity?.name);
    const activity: DiscoveryGovernanceActivity = {
      id: `detail-registry-${this.entityId || 'entity'}-${Date.now()}`,
      happenedAt: new Date().toISOString(),
      status,
      action: 'policy-hook',
      summary,
      detail,
      entityRefs: this.entityId == null ? [] : [{ entityId: this.entityId, entityName }],
      workspacePath: this.router.url
    };
    this.entitySvc.saveDiscoveryGovernanceActivity(activity).subscribe({
      next: message => {
        if (message.code === 0 && message.data != null && this.matchesDiscoveryGovernanceActivity(message.data, entityName)) {
          this.serverDiscoveryActivities = [message.data, ...this.serverDiscoveryActivities.filter(item => item.id !== message.data!.id)].sort(
            (left, right) => this.compareGovernanceTimestamp(left.happenedAt, right.happenedAt)
          );
          this.syncGovernanceHistory();
          this.cdr.markForCheck();
        }
      }
    });
  }

  get integrationsPreview(): string {
    return this.toStructuredPreview(this.entity?.integrations);
  }

  get extensionsPreview(): string {
    return this.toStructuredPreview(this.entity?.extensions);
  }

  get apiInterfaceDefinitionPreview(): string {
    return this.toStructuredPreview(this.entity?.apiInterface?.definition);
  }

  get catalogCompleteness(): number {
    const checks = [
      this.hasOwner(),
      this.hasRunbook(),
      this.hasEvidence(),
      this.relations.length > 0 ||
        this.trimText(this.entity?.description) != null ||
        this.entityLinks.length > 0 ||
        this.trimText(this.entity?.system) != null ||
        this.trimText(this.entity?.tier) != null ||
        this.trimText(this.entity?.lifecycle) != null
    ];
    const completed = checks.filter(Boolean).length;
    return Math.round((completed / checks.length) * 100);
  }

  get outboundRelations(): EntityRelation[] {
    return this.relations.filter(relation => relation.sourceEntityId === this.entityId);
  }

  get inboundRelations(): EntityRelation[] {
    return this.relations.filter(relation => relation.sourceEntityId !== this.entityId);
  }

  get outboundDependsOnRelations(): EntityRelation[] {
    return this.outboundRelations.filter(relation => relation.relationType === 'depends_on');
  }

  get inboundDependsOnRelations(): EntityRelation[] {
    return this.inboundRelations.filter(relation => relation.relationType === 'depends_on');
  }

  get outboundRelationTypeSummary(): string | undefined {
    return this.getRelationTypeSummary(this.outboundRelations);
  }

  get inboundRelationTypeSummary(): string | undefined {
    return this.getRelationTypeSummary(this.inboundRelations);
  }

  get outboundRelationSourceSummary(): string | undefined {
    return this.getRelationSourceSummary(this.outboundRelations);
  }

  get inboundRelationSourceSummary(): string | undefined {
    return this.getRelationSourceSummary(this.inboundRelations);
  }

  get outboundRelationStatusSummary(): string | undefined {
    return this.getRelationStatusSummary(this.outboundRelations);
  }

  get inboundRelationStatusSummary(): string | undefined {
    return this.getRelationStatusSummary(this.inboundRelations);
  }

  get checklistItems(): EntityChecklistItem[] {
    return [
      {
        title: this.translateOrFallback('entity.checklist.owner', 'Ownership'),
        description: this.translateOrFallback('entity.checklist.owner.desc', 'Assign a team or person who is responsible for this entity.'),
        done: this.hasOwner()
      },
      {
        title: this.translateOrFallback('entity.checklist.runbook', 'Runbook'),
        description: this.translateOrFallback(
          'entity.checklist.runbook.desc',
          'Attach a response guide so incidents can be handed off quickly.'
        ),
        done: this.hasRunbook()
      },
      {
        title: this.translateOrFallback('entity.checklist.evidence', 'Evidence'),
        description: this.translateOrFallback(
          'entity.checklist.evidence.desc',
          'Bind monitors or identities so telemetry can converge on this entity.'
        ),
        done: this.hasEvidence()
      },
      {
        title: this.translateOrFallback('entity.checklist.dependencies', 'Dependencies'),
        description: this.translateOrFallback(
          'entity.checklist.dependencies.desc',
          'Capture the most important upstream and downstream relations.'
        ),
        done: this.relations.length > 0
      }
    ];
  }

  get missingCatalogMetadataFields(): string[] {
    const fields: string[] = [];
    if (this.trimText(this.entity?.system) == null) {
      fields.push(this.translateOrFallback('entity.field.system', '所属系统'));
    }
    if (this.trimText(this.entity?.lifecycle) == null) {
      fields.push(this.translateOrFallback('entity.field.lifecycle', '生命周期'));
    }
    if (this.trimText(this.entity?.tier) == null) {
      fields.push(this.translateOrFallback('entity.field.tier', '服务层级'));
    }
    return fields;
  }

  get recommendedActions(): DetailWorkspaceAction[] {
    const serverActions = (this.detail?.nextActions || [])
      .map(action => this.mapServerNextAction(action))
      .filter((action): action is DetailWorkspaceAction => action != null);
    if (serverActions.length > 0) {
      return serverActions;
    }
    return this.getLegacyRecommendedActions();
  }

  private getLegacyRecommendedActions(): DetailWorkspaceAction[] {
    const actions: DetailWorkspaceAction[] = [];
    const registrySignal = this.getDetailRegistrySignal();
    if (requiresGovernanceRegistryRemediation(registrySignal)) {
      const registryPolicy = buildGovernanceRegistryPolicyPresentation(registrySignal, this.translateOrFallback.bind(this));
      actions.push({
        key: this.getDetailRegistryAction(registrySignal),
        title: registryPolicy.title,
        description: registryPolicy.summary,
        actionLabel: this.getDetailRegistryActionLabel(registrySignal),
        icon: 'cloud-sync',
        tone: 'primary'
      });
    }
    if (this.activeAlerts.length > 0) {
      actions.push({
        key: 'alerts',
        title: this.translateOrFallback('entity.detail.next.alerts', '先处理当前告警'),
        description: this.translateOrFallback(
          'entity.detail.next.alerts.copy',
          `${this.activeAlerts.length} 条活跃告警已经挂到这个实体上，先确认影响面和当前状态。`
        ),
        actionLabel: this.translateOrFallback('entity.detail.open-alerts', '进入告警中心'),
        icon: 'bell',
        tone: 'primary'
      });
    }
    if (!this.hasOwner()) {
      actions.push({
        key: 'owner',
        title: this.translateOrFallback('entity.detail.next.owner', '补负责人'),
        description: this.translateOrFallback(
          'entity.detail.next.owner.copy',
          '没有负责人时，实体很难成为真正的排障入口。先补团队或联系人。'
        ),
        actionLabel: this.translateOrFallback('entity.detail.next.owner.action', '去补负责人'),
        icon: 'user',
        tone: 'primary'
      });
    }
    if (this.missingCatalogMetadataFields.length > 0) {
      actions.push({
        key: 'catalog-metadata',
        title: this.translateOrFallback('entity.detail.next.catalog', '补目录分层'),
        description: `${this.translateOrFallback('entity.detail.next.catalog.copy', '当前还缺少')}${this.missingCatalogMetadataFields.join('、')}。`,
        actionLabel: this.translateOrFallback('entity.detail.next.catalog.action', '补齐目录字段'),
        icon: 'cluster',
        tone: 'default'
      });
    }
    if (!this.hasRunbook()) {
      actions.push({
        key: 'runbook',
        title: this.translateOrFallback('entity.detail.next.runbook', '补处置手册'),
        description: this.translateOrFallback(
          'entity.detail.next.runbook.copy',
          '故障处理还没有标准入口，先把 runbook 或值守链接挂进目录。'
        ),
        actionLabel: this.translateOrFallback('entity.detail.next.runbook.action', '补处置手册'),
        icon: 'book',
        tone: 'default'
      });
    }
    if (!this.hasEvidence()) {
      actions.push({
        key: 'discovery',
        title: this.translateOrFallback('entity.detail.next.discovery', '接入遥测证据'),
        description: this.translateOrFallback(
          'entity.detail.next.discovery.copy',
          '当前还没有监控、身份或日志线索，先从遥测发现补充证据。'
        ),
        actionLabel: this.translateOrFallback('entity.detail.next.discovery.action', '去遥测发现'),
        icon: 'radar-chart',
        tone: 'primary'
      });
    } else if (this.boundMonitors.length === 0) {
      actions.push({
        key: 'monitors',
        title: this.translateOrFallback('entity.detail.next.monitors', '补监控绑定'),
        description: this.translateOrFallback(
          'entity.detail.next.monitors.copy',
          '已经识别到实体上下文，但还没把监控任务正式绑定到目录。'
        ),
        actionLabel: this.translateOrFallback('entity.detail.next.monitors.action', '关联监控'),
        icon: 'deployment-unit',
        tone: 'default'
      });
    }
    if (this.relations.length === 0) {
      actions.push({
        key: 'relations',
        title: this.translateOrFallback('entity.detail.next.relations', '补关键依赖'),
        description: this.translateOrFallback(
          'entity.detail.next.relations.copy',
          '先把最关键的上下游补齐，后续告警、影响面和排障路径才会更清楚。'
        ),
        actionLabel: this.translateOrFallback('entity.detail.next.relations.action', '编辑关系'),
        icon: 'branches',
        tone: 'default'
      });
    }
    if (this.entity?.type === 'api' && !this.hasApiContractContext) {
      actions.push({
        key: 'definition',
        title: this.translateOrFallback('entity.detail.next.definition', '补接口定义'),
        description: this.translateOrFallback(
          'entity.detail.next.definition.copy',
          '当前 API 目录还没有实现关系或接口定义，建议直接回到导入定义补齐。'
        ),
        actionLabel: this.translateOrFallback('entity.definition.edit', '编辑定义'),
        icon: 'file-text',
        tone: 'default'
      });
    }
    if (actions.length === 0) {
      actions.push(
        {
          key: 'definition',
          title: this.translateOrFallback('entity.detail.next.review-definition', '审阅实体定义'),
          description: this.translateOrFallback(
            'entity.detail.next.review-definition.copy',
            '目录信息已经比较完整，可以继续校验定义、模板来源和配置块。'
          ),
          actionLabel: this.translateOrFallback('entity.definition.edit', '编辑定义'),
          icon: 'file-search',
          tone: 'default'
        },
        {
          key: 'discovery',
          title: this.translateOrFallback('entity.detail.next.discovery-keep', '继续治理遥测线索'),
          description: this.translateOrFallback(
            'entity.detail.next.discovery-keep.copy',
            '去遥测发现确认还有没有新的监控或 OTel 资源应该归并到这个实体。'
          ),
          actionLabel: this.translateOrFallback('entity.detail.next.discovery.action', '去遥测发现'),
          icon: 'radar-chart',
          tone: 'default'
        }
      );
    }
    return actions.slice(0, 5);
  }

  private mapServerNextAction(action: EntityNextAction): DetailWorkspaceAction | undefined {
    const actionKey = this.trimText(action?.actionType);
    if (actionKey == null) {
      return undefined;
    }
    switch (actionKey) {
      case 'review_alerts':
        return {
          key: 'alerts',
          title: action.title,
          description: action.summary,
          actionLabel: action.actionLabel,
          icon: 'bell',
          tone: 'primary'
        };
      case 'bind_monitor':
        return {
          key: 'monitors',
          title: action.title,
          description: action.summary,
          actionLabel: action.actionLabel,
          icon: 'deployment-unit',
          tone: 'primary'
        };
      case 'complete_owner':
        return {
          key: 'owner',
          title: action.title,
          description: action.summary,
          actionLabel: action.actionLabel,
          icon: 'user',
          tone: 'primary'
        };
      case 'complete_runbook':
        return {
          key: 'runbook',
          title: action.title,
          description: action.summary,
          actionLabel: action.actionLabel,
          icon: 'book',
          tone: 'default'
        };
      case 'open_discovery':
        return {
          key: 'discovery',
          title: action.title,
          description: action.summary,
          actionLabel: action.actionLabel,
          icon: 'radar-chart',
          tone: 'primary'
        };
      case 'inspect_logs':
        return {
          key: 'logs',
          title: action.title,
          description: action.summary,
          actionLabel: action.actionLabel,
          icon: 'file-search',
          tone: 'default'
        };
      case 'review_relations':
        return {
          key: 'relations',
          title: action.title,
          description: action.summary,
          actionLabel: action.actionLabel,
          icon: 'branches',
          tone: 'default'
        };
      default:
        return undefined;
    }
  }

  get definitionPreviewObject(): Record<string, unknown> {
    const metadata: Record<string, unknown> = {
      name: this.entity?.name || 'entity'
    };
    const spec: Record<string, unknown> = {
      source: this.entity?.source || 'manual'
    };

    if (this.trimText(this.entity?.namespace) != null) {
      metadata.namespace = this.entity?.namespace;
    }
    if (this.trimText(this.entity?.owner) != null) {
      metadata.owner = this.entity?.owner;
    }
    if ((this.entity?.additionalOwners || []).length > 0) {
      metadata.additionalOwners = (this.entity?.additionalOwners || []).map(owner => ({
        name: owner.name,
        type: owner.type
      }));
    }
    if (this.trimText(this.entity?.inheritFrom) != null) {
      metadata.inheritFrom = this.entity?.inheritFrom;
    }
    if (this.trimText(this.entity?.displayName) != null) {
      metadata.displayName = this.entity?.displayName;
    }
    if (this.trimText(this.entity?.description) != null) {
      metadata.description = this.entity?.description;
    }
    if (this.labelEntryList.length > 0) {
      const labels = this.labelEntryList.reduce<Record<string, string>>((result, item) => {
        result[item.key] = item.value;
        return result;
      }, {});
      metadata.labels = labels;
    }
    const tags = this.buildMetadataTags();
    if (tags.length > 0) {
      metadata.tags = tags;
    }
    if (this.entityLinks.length > 0) {
      metadata.links = this.entityLinks.map(link => ({
        name: link.name,
        type: link.type,
        provider: link.provider,
        url: link.url
      }));
    }
    if (this.entityContacts.length > 0) {
      metadata.contacts = this.entityContacts.map(contact => ({
        name: contact.name,
        type: contact.type,
        contact: contact.contact || contact.value,
        value: contact.value || contact.contact
      }));
    }
    if (this.trimText(this.entity?.environment) != null) {
      spec.environment = this.entity?.environment;
    }
    if (this.trimText(this.entity?.subtype) != null) {
      spec.type = this.entity?.subtype;
    }
    if (this.trimText(this.entity?.owner) != null) {
      spec.ownedBy = this.entity?.owner;
    }
    if (this.trimText(this.entity?.criticality) != null) {
      spec.criticality = this.entity?.criticality;
    }
    if (this.trimText(this.entity?.runbook) != null) {
      spec.runbook = this.entity?.runbook;
    }
    if (this.trimText(this.entity?.lifecycle) != null) {
      spec.lifecycle = this.entity?.lifecycle;
    }
    if (this.trimText(this.entity?.tier) != null) {
      spec.tier = this.entity?.tier;
    }
    if (this.trimText(this.entity?.system) != null) {
      spec.partOf = this.entity?.system;
    }
    if ((this.entity?.componentOf || []).length > 0) {
      spec.componentOf = this.entity?.componentOf;
    }
    if (this.componentList.length > 0) {
      spec.components = this.componentList;
    }
    if (this.implementedByList.length > 0) {
      spec.implementedBy = this.implementedByList;
    }
    if (this.entity?.apiInterface != null && (this.apiInterfaceFileRef != null || this.hasInlineApiInterfaceDefinition)) {
      spec.interface = {
        fileRef: this.apiInterfaceFileRef,
        definition: this.entity.apiInterface.definition
      };
    }
    if ((this.entity?.languages || []).length > 0) {
      spec.languages = this.entity?.languages;
    }
    if (this.identities.length > 0) {
      spec.telemetry = {
        identities: this.identities.map(identity => ({
          key: identity.identityKey,
          value: identity.identityValue,
          primary: identity.primaryIdentity,
          type: identity.identityType,
          priority: identity.priority
        }))
      };
    }
    if (this.boundMonitors.length > 0) {
      const telemetry = (spec.telemetry || {}) as Record<string, unknown>;
      telemetry.monitors = this.boundMonitors.map(monitor => ({
        monitorId: monitor.id,
        bindType: 'manual',
        bindSource: 'manual',
        status: this.monitorStatusLabel(monitor.status)
      }));
      spec.telemetry = telemetry;
    }
    if (this.relations.length > 0) {
      spec.dependsOn = this.relations
        .filter(relation => relation.sourceEntityId === this.entityId)
        .map(relation => this.getRelationReference(relation))
        .filter((value): value is string => value != null);
      spec.relations = this.relations
        .filter(relation => relation.sourceEntityId === this.entityId)
        .map(relation => ({
          relationType: relation.relationType,
          targetEntityId: relation.targetEntityId,
          targetRef: this.trimText(relation.targetRef),
          relationSource: relation.relationSource,
          status: relation.status,
          score: relation.score,
          description: relation.description,
          attributes: relation.attributes
        }));
    }
    const definition: Record<string, unknown> = {
      apiVersion: 'hertzbeat/v1',
      kind: this.toDefinitionKind(this.entity?.type) || 'service',
      metadata,
      spec
    };
    if (this.entity?.integrations != null && Object.keys(this.entity.integrations).length > 0) {
      definition.integrations = this.entity.integrations;
    }
    if (this.entity?.extensions != null && Object.keys(this.entity.extensions).length > 0) {
      definition.extensions = this.entity.extensions;
    }
    if (this.entity?.hertzbeat != null && Object.keys(this.entity.hertzbeat).length > 0) {
      definition.hertzbeat = this.entity.hertzbeat;
    }
    return definition;
  }

  get definitionPreview(): string {
    if (this.definitionPreviewFormat === 'curl') {
      return this.definitionCurlPreview;
    }
    if (this.definitionPreviewContent.trim() !== '') {
      return this.definitionPreviewContent;
    }
    if (this.definitionPreviewFormat === 'json') {
      return JSON.stringify(this.definitionPreviewObject, null, 2);
    }
    return this.toYaml(this.definitionPreviewObject);
  }

  get definitionPreviewHtml(): string {
    return renderDefinitionPreviewHtml(this.definitionPreview, this.definitionPreviewFormat);
  }

  get definitionPreviewFacts(): PlatformDrawerFactItem[] {
    return [
      {
        label: this.i18nSvc.fanyi('entity.definition.preview-format'),
        value: this.definitionPreviewFormat.toUpperCase()
      },
      {
        label: this.i18nSvc.fanyi('entity.section.identities'),
        value: String(this.identities.length)
      },
      {
        label: this.i18nSvc.fanyi('entity.section.monitors'),
        value: String(this.monitorCount)
      },
      {
        label: this.i18nSvc.fanyi('entity.section.relations'),
        value: String(this.outboundRelationList.length + this.inboundRelationList.length + this.entityLinks.length + this.entityContacts.length)
      }
    ];
  }

  get definitionPreviewToolbarBadges(): string[] {
    return [this.definitionPreviewFormat.toUpperCase()];
  }

  get definitionPreviewSectionTitle(): string {
    return this.i18nSvc.fanyi('entity.definition.title');
  }

  get definitionCurlPreview(): string {
    const content = this.definitionPreviewContent.trim() !== '' ? this.definitionPreviewContent : this.toYaml(this.definitionPreviewObject);
    const payload = JSON.stringify(
      {
        format: 'yaml',
        content
      },
      null,
      2
    )
      .replace(/'/g, "'\\''");
    return [
      `curl -X PUT 'http://127.0.0.1:1157/api/entities/${this.entityId}/definition'`,
      "  -H 'Content-Type: application/json'",
      "  -H 'Authorization: <token>'",
      `  -d '${payload}'`
    ].join(' \\\n');
  }

  getStatusColor(status?: string): string {
    switch (status) {
      case 'healthy':
        return '#389e0d';
      case 'degraded':
        return '#d48806';
      case 'critical':
        return '#cf1322';
      case 'paused':
        return '#8c8c8c';
      default:
        return '#595959';
    }
  }

  getCriticalityColor(criticality?: string): string {
    switch (criticality) {
      case 'critical':
        return '#cf1322';
      case 'high':
        return '#fa541c';
      case 'medium':
        return '#d48806';
      case 'low':
        return '#1677ff';
      default:
        return '#8c8c8c';
    }
  }

  getMonitorStatusColor(status?: number): string {
    switch (status) {
      case 1:
        return '#389e0d';
      case 2:
        return '#cf1322';
      case 0:
        return '#8c8c8c';
      default:
        return '#595959';
    }
  }

  monitorStatusLabel(status?: number): string {
    switch (status) {
      case 1:
        return this.translateOrFallback('monitor.status.up', 'Up');
      case 2:
        return this.translateOrFallback('monitor.status.down', 'Down');
      case 0:
        return this.translateOrFallback('monitor.status.paused', 'Paused');
      default:
        return '-';
    }
  }

  isHttpLink(value?: string): boolean {
    return /^(https?:)?\/\//.test(value || '');
  }

  getContactDisplayValue(contact: EntityCatalogContact): string {
    return this.trimText(contact.contact) || this.trimText(contact.value) || '-';
  }

  getContactHref(contact: EntityCatalogContact): string | undefined {
    const value = this.getContactDisplayValue(contact);
    if (value === '-') {
      return undefined;
    }
    if (/^(https?:)?\/\//.test(value) || /^(mailto|tel):/i.test(value)) {
      return value;
    }
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return `mailto:${value}`;
    }
    return undefined;
  }

  getLinkDisplayName(link: EntityCatalogLink): string {
    return this.trimText(link.name) || this.trimText(link.type) || this.translateOrFallback('entity.field.links', '链接');
  }

  getLinkMeta(link: EntityCatalogLink): string {
    return [this.trimText(link.type), this.trimText(link.provider)].filter((value): value is string => value != null).join(' · ') || '-';
  }

  hasOwner(): boolean {
    return this.trimText(this.entity?.owner) != null || this.entityContacts.length > 0;
  }

  hasRunbook(): boolean {
    return this.trimText(this.entity?.runbook) != null;
  }

  hasEvidence(): boolean {
    return this.boundMonitors.length > 0 || this.identities.length > 0 || this.activeAlerts.length > 0 || this.logQueryHints.length > 0;
  }

  getCatalogCompletenessColor(): string {
    if (this.catalogCompleteness >= 100) {
      return '#389e0d';
    }
    if (this.catalogCompleteness >= 50) {
      return '#1677ff';
    }
    return '#d48806';
  }

  getCatalogCompletenessLabel(): string {
    if (this.catalogCompleteness >= 100) {
      return this.translateOrFallback('entity.catalog.ready', 'Ready');
    }
    if (this.catalogCompleteness >= 50) {
      return this.translateOrFallback('entity.catalog.partial', 'In Progress');
    }
    return this.translateOrFallback('entity.catalog.draft', 'Needs Metadata');
  }

  getStatusNarrative(): string {
    const normalizedReason = this.normalizeReason(this.status?.reason);
    if (normalizedReason != null) {
      return normalizedReason;
    }
    if ((this.status?.monitorDownCount || 0) > 0) {
      return this.translateOrFallback('entity.detail.narrative.monitor-down', `${this.status?.monitorDownCount} bound monitors are down.`);
    }
    if (this.activeAlerts.length > 0) {
      return this.translateOrFallback(
        'entity.detail.narrative.active-alerts',
        `${this.activeAlerts.length} active alerts are associated with this entity.`
      );
    }
    if (this.hasEvidence()) {
      return this.translateOrFallback(
        'entity.detail.narrative.evidence-ready',
        'Evidence is already linked and ready for troubleshooting.'
      );
    }
    return this.translateOrFallback(
      'entity.detail.narrative.metadata-first',
      'Start by linking telemetry, ownership, and response guidance for this entity.'
    );
  }

  getStatusReasonLabel(): string {
    return this.normalizeReason(this.status?.reason) || '-';
  }

  getStatusIcon(status?: string): string {
    switch (status) {
      case 'healthy':
        return 'check-circle';
      case 'degraded':
        return 'warning';
      case 'critical':
        return 'close-circle';
      case 'paused':
        return 'pause-circle';
      default:
        return 'question-circle';
    }
  }

  getEntityKicker(): string {
    if (this.entity == null) {
      return '-';
    }
    const segments = [this.translateOrFallback(`entity.type.${this.entity.type}`, this.humanize(this.entity.type))];
    if (this.trimText(this.entity.subtype) != null) {
      segments.push(this.entity.subtype!);
    }
    if (this.trimText(this.entity.namespace) != null) {
      segments.push(this.entity.namespace!);
    }
    if (this.trimText(this.entity.environment) != null) {
      segments.push(this.entity.environment!);
    }
    return segments.join(' · ');
  }

  getEntityTypeIcon(type?: string): string {
    switch (type) {
      case 'system':
        return 'apartment';
      case 'host':
        return 'desktop';
      case 'database':
        return 'database';
      case 'queue':
        return 'unordered-list';
      case 'middleware':
        return 'cluster';
      case 'device':
        return 'api';
      case 'api':
        return 'branches';
      case 'endpoint':
        return 'global';
      case 'k8s_workload':
        return 'appstore';
      default:
        return 'deployment-unit';
    }
  }

  getSourceLabel(): string {
    return this.translateOrFallback(`entity.source.${this.entity?.source}`, this.humanize(this.entity?.source));
  }

  getOwnerReadinessLabel(): string {
    if (!this.hasOwner()) {
      return this.i18nSvc.fanyi('entity.detail.quick.owner.missing');
    }
    return this.entity?.owner || this.entityContacts[0]?.value || this.i18nSvc.fanyi('entity.owner.unassigned');
  }

  getAdditionalOwnerSummary(): string {
    return this.additionalOwnerNames.length > 0 ? this.additionalOwnerNames.join(', ') : '-';
  }

  getRunbookReadinessLabel(): string {
    return this.hasRunbook()
      ? this.i18nSvc.fanyi('entity.detail.quick.runbook.ready')
      : this.i18nSvc.fanyi('entity.detail.quick.runbook.missing');
  }

  getStatusPageReadinessLabel(): string {
    if (this.statusPageSummary?.linked) {
      return this.i18nSvc.fanyi('entity.detail.status-page.linked');
    }
    if (this.statusPageSummary?.suggestExpose) {
      return this.i18nSvc.fanyi('entity.detail.status-page.suggest');
    }
    return this.i18nSvc.fanyi('entity.detail.status-page.none');
  }

  getStatusPageReadinessCopy(): string {
    if (this.statusPageSummary?.linked) {
      return this.i18nSvc.fanyi('entity.detail.status-page.linked.copy', {
        count: this.statusPageSummary.componentCount || 1
      });
    }
    if (this.statusPageSummary?.suggestExpose) {
      return this.i18nSvc.fanyi('entity.detail.status-page.suggest.copy');
    }
    return this.i18nSvc.fanyi('entity.detail.status-page.none.copy');
  }

  getEvidenceReadinessLabel(): string {
    return this.hasEvidence()
      ? this.i18nSvc.fanyi('entity.detail.quick.evidence.ready')
      : this.i18nSvc.fanyi('entity.detail.quick.evidence.missing');
  }

  getDefinitionReadinessLabel(): string {
    return this.catalogCompleteness >= 100
      ? this.i18nSvc.fanyi('entity.detail.quick.definition.ready')
      : this.i18nSvc.fanyi('entity.detail.quick.definition.draft');
  }

  getChecklistDoneCount(): number {
    return this.checklistItemsCache.filter(item => item.done).length;
  }

  getChecklistPendingCount(): number {
    return this.checklistItemsCache.filter(item => !item.done).length;
  }

  getAlertSeverity(alert: SingleAlert): string | undefined {
    return this.trimText(alert.labels?.severity || alert.annotations?.severity);
  }

  getAlertSeverityColor(severity?: string): string {
    switch (severity) {
      case 'critical':
      case 'error':
        return '#cf1322';
      case 'warning':
        return '#d48806';
      case 'info':
        return '#1677ff';
      default:
        return '#8c8c8c';
    }
  }

  getAlertSeverityLabel(severity?: string | null): string {
    if (severity == null || severity.trim() === '') {
      return this.translateOrFallback('common.all', '全部');
    }
    return this.humanize(severity);
  }

  getAlertSeverityMetricLabel(entry: { severity: string; count: number }): string {
    return `${this.getAlertSeverityLabel(entry.severity)} ${entry.count}`;
  }

  humanize(value?: string): string {
    if (value == null || value.trim() === '') {
      return '-';
    }
    return value
      .split(/[_\-.]/g)
      .filter(Boolean)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  translateOrFallback(token: string, fallback: string): string {
    const value = this.i18nSvc.fanyi(token);
    return value === token ? fallback : value;
  }

  private resolveEntityDetailMessage(message?: string, fallbackToken = 'entity.detail.load.failed'): string {
    if (!message) {
      return this.i18nSvc.fanyi(fallbackToken);
    }
    if (message === 'Entity not exist.') {
      return this.i18nSvc.fanyi('entity.detail.not-found');
    }
    return message;
  }

  labelEntries(labels?: Record<string, string>): Array<{ key: string; value: string }> {
    return Object.entries(labels || {}).map(([key, value]) => ({ key, value }));
  }

  resourceFilterEntries(resourceFilters?: Record<string, string>): Array<{ key: string; value: string }> {
    return Object.entries(resourceFilters || {}).map(([key, value]) => ({ key, value }));
  }

  primaryIdentities(): EntityIdentity[] {
    return this.identities.filter(identity => identity.primaryIdentity);
  }

  secondaryIdentities(): EntityIdentity[] {
    return this.identities.filter(identity => !identity.primaryIdentity);
  }

  labelColor(key: string): string {
    return renderLabelColor(key);
  }

  getRelationDirection(relation: EntityRelation): string {
    if (relation.sourceEntityId === this.entityId) {
      return this.translateOrFallback('entity.relation.outbound', 'Outbound');
    }
    return this.translateOrFallback('entity.relation.inbound', 'Inbound');
  }

  getRelationCounterpartId(relation: EntityRelation): number | undefined {
    if (relation.sourceEntityId === this.entityId) {
      return relation.targetEntityId;
    }
    return relation.sourceEntityId;
  }

  hasRelationCounterpartLink(relation: EntityRelation): boolean {
    return this.getRelationCounterpartId(relation) != null;
  }

  getRelationCounterpartName(relation: EntityRelation): string {
    const targetRef = this.trimText(relation.targetRef);
    const counterpartId = this.getRelationCounterpartId(relation);
    if (counterpartId == null) {
      return targetRef || '-';
    }
    const counterpart = this.relationTargetMap[counterpartId];
    if (counterpart == null) {
      return targetRef || `#${counterpartId}`;
    }
    return counterpart.displayName || counterpart.name || `#${counterpartId}`;
  }

  getRelationTypeLabel(relationType?: string): string {
    return this.translateOrFallback(`entity.relation-type.${relationType || ''}`, this.humanize(relationType || 'unknown'));
  }

  getRelationSourceLabel(relationSource?: string): string {
    return this.translateOrFallback(`entity.relation-source.${relationSource || ''}`, this.humanize(relationSource || 'manual'));
  }

  getRelationStatusLabel(status?: string): string {
    return this.translateOrFallback(`entity.relation-status.${status || ''}`, this.humanize(status || 'confirmed'));
  }

  getRelationScoreLabel(relation: EntityRelation): string | undefined {
    if (relation.score == null) {
      return undefined;
    }
    return `${relation.score}`;
  }

  getAlertCenterQueryParams(): Record<string, string> | undefined {
    const handoff = this.getResponseHandoff('alerts');
    return this.buildHandoffQueryParams(handoff, {
      search: this.trimText(handoff.search) || this.getAlertSearchToken(),
      status: this.alertStatusFilter || this.trimText(handoff.status),
      severity: this.alertSeverityFilter || this.trimText(handoff.severity)
    });
  }

  getLogManageQueryParams(): Record<string, string> | undefined {
    const handoff = this.getResponseHandoff('logs');
    const metricHandoff = this.getResponseHandoff('monitors');
    return this.buildHandoffQueryParams(handoff, {
      search:
        this.pickFirstText(
          this.trimText(handoff.search),
          this.trimText(handoff.traceId),
          this.trimText(metricHandoff.search),
          this.trimText(metricHandoff.serviceName),
          this.getLogSearchToken()
        ) || this.getLogSearchToken(),
      traceId: this.pickFirstText(this.trimText(handoff.traceId), this.trimText(metricHandoff.traceId)),
      spanId: this.pickFirstText(this.trimText(handoff.spanId), this.trimText(metricHandoff.spanId)),
      severityText: this.trimText(handoff.severityText),
      serviceName: this.pickFirstText(this.trimText(handoff.serviceName), this.trimText(metricHandoff.serviceName)),
      serviceNamespace: this.pickFirstText(this.trimText(handoff.serviceNamespace), this.trimText(metricHandoff.serviceNamespace)),
      environment: this.pickFirstText(this.trimText(handoff.environment), this.trimText(metricHandoff.environment)),
      start: this.pickFirstNumber(this.toMillis(handoff.start), this.toMillis(metricHandoff.start)),
      end: this.pickFirstNumber(this.toMillis(handoff.end), this.toMillis(metricHandoff.end))
    });
  }

  getTraceCenterQueryParams(): Record<string, string> | undefined {
    const handoff = this.getResponseHandoff('traces');
    const metricHandoff = this.getResponseHandoff('monitors');
    const logHandoff = this.getResponseHandoff('logs');
    const hint = this.traceQueryHints[0];
    return this.buildHandoffQueryParams(handoff, {
      traceId: this.pickFirstText(
        this.trimText(handoff.traceId),
        this.trimText(logHandoff.traceId),
        this.trimText(metricHandoff.traceId),
        this.trimText(this.traceSummary?.latestTraceId)
      ),
      spanId: this.pickFirstText(this.trimText(handoff.spanId), this.trimText(logHandoff.spanId), this.trimText(metricHandoff.spanId)),
      serviceName:
        this.pickFirstText(
          this.trimText(handoff.serviceName),
          this.trimText(hint?.serviceName),
          this.trimText(logHandoff.serviceName),
          this.trimText(metricHandoff.serviceName),
          this.trimText(hint?.resourceFilters?.['service.name'])
        ) || this.getTraceSearchToken(),
      serviceNamespace: this.pickFirstText(
        this.trimText(handoff.serviceNamespace),
        this.trimText(hint?.serviceNamespace),
        this.trimText(logHandoff.serviceNamespace),
        this.trimText(metricHandoff.serviceNamespace),
        this.trimText(hint?.resourceFilters?.['service.namespace'])
      ),
      environment: this.pickFirstText(
        this.trimText(handoff.environment),
        this.trimText(hint?.environment),
        this.trimText(logHandoff.environment),
        this.trimText(metricHandoff.environment),
        this.trimText(hint?.resourceFilters?.['deployment.environment.name'])
      ),
      start: this.pickFirstNumber(this.toMillis(handoff.start), this.toMillis(hint?.start), this.toMillis(logHandoff.start), this.toMillis(metricHandoff.start)),
      end: this.pickFirstNumber(this.toMillis(handoff.end), this.toMillis(hint?.end), this.toMillis(logHandoff.end), this.toMillis(metricHandoff.end))
    });
  }

  getMetricsConsoleQueryParams(): Record<string, string> | undefined {
    const handoff = this.getResponseHandoff('monitors');
    const traceHandoff = this.getResponseHandoff('traces');
    const [hint] = this.traceQueryHints;
    return this.buildHandoffQueryParams(handoff, {
      serviceName:
        this.pickFirstText(
          this.trimText(handoff.serviceName),
          this.trimText(traceHandoff.serviceName),
          this.trimText(hint?.serviceName),
          this.trimText(hint?.resourceFilters?.['service.name'])
        ) || this.getTraceSearchToken(),
      serviceNamespace: this.pickFirstText(
        this.trimText(handoff.serviceNamespace),
        this.trimText(traceHandoff.serviceNamespace),
        this.trimText(hint?.serviceNamespace),
        this.trimText(hint?.resourceFilters?.['service.namespace'])
      ),
      environment: this.pickFirstText(
        this.trimText(handoff.environment),
        this.trimText(traceHandoff.environment),
        this.trimText(hint?.environment),
        this.trimText(hint?.resourceFilters?.['deployment.environment.name'])
      ),
      start: this.pickFirstNumber(this.toMillis(handoff.start), this.toMillis(traceHandoff.start), this.toMillis(hint?.start)),
      end: this.pickFirstNumber(this.toMillis(handoff.end), this.toMillis(traceHandoff.end), this.toMillis(hint?.end))
    });
  }

  getMonitorCenterQueryParams(): Record<string, string> | undefined {
    const handoff = this.getResponseHandoff('monitors');
    return this.buildHandoffQueryParams(handoff, {
      app: this.monitorAppFilter || this.trimText(handoff.app),
      status: this.monitorStatusFilter != null ? `${this.monitorStatusFilter}` : this.trimText(handoff.status),
      content: this.trimText(handoff.content)
    });
  }

  getEntityTitle(): string {
    if (this.entity == null) {
      return '-';
    }
    return this.entity.displayName || this.entity.name;
  }

  editEntity(preset?: EntityDiscoveryGovernancePreset): void {
    if (this.entityId == null) {
      return;
    }
    const handoff = this.getResponseHandoff('editor');
    this.router.navigate(['/entities', this.entityId, 'edit'], {
      queryParams: {
        ...this.listQueryParams,
        ...this.buildReturnQueryParams(handoff),
        ...buildGovernancePresetQueryParams(preset)
      }
    });
  }

  openEditorSection(
    section: 'basic' | 'ownership' | 'identities' | 'monitors' | 'relations' | 'hertzbeat',
    preset?: EntityDiscoveryGovernancePreset
  ): void {
    if (this.entityId == null) {
      return;
    }
    const handoff = this.getResponseHandoff('editor');
    this.router.navigate(['/entities', this.entityId, 'edit'], {
      queryParams: this.mergeListQueryParams({
        focus: section,
        ...this.buildReturnQueryParams(handoff),
        ...buildGovernancePresetQueryParams(preset)
      })
    });
  }

  editDefinition(preset?: EntityDiscoveryGovernancePreset, remedy?: 'preset' | 'ownership' | 'definition' | 'telemetry'): void {
    if (this.entityId == null) {
      return;
    }
    const handoff = this.getResponseHandoff('editor');
    const definitionFormat = this.definitionPreviewFormat === 'curl' ? 'yaml' : this.definitionPreviewFormat;
    this.router.navigate(['/entities', this.entityId, 'definition'], {
      queryParams: {
        ...this.listQueryParams,
        format: definitionFormat,
        remedy: remedy || null,
        ...this.buildReturnQueryParams(handoff),
        ...buildGovernancePresetQueryParams(preset)
      }
    });
  }

  openDiscoveryWorkspace(remedy?: 'preset' | 'ownership' | 'definition' | 'telemetry'): void {
    const handoff = this.getResponseHandoff('discovery');
    this.router.navigate(['/entities', 'discovery'], {
      queryParams: this.mergeListQueryParams({
        query: this.trimText(handoff.query) || this.getAlertSearchToken() || this.getLogSearchToken() || this.getFallbackEntitySearchToken(),
        owner: this.trimText(handoff.owner) || this.trimText(this.entity?.owner),
        system: this.trimText(handoff.system) || this.trimText(this.entity?.system),
        environment: this.trimText(handoff.environment) || this.trimText(this.entity?.environment),
        source: this.trimText(handoff.source) || this.trimText(this.entity?.source),
        ...this.buildReturnQueryParams(handoff),
        remedy: remedy || undefined
      })
    });
  }

  openGovernancePresetWorkspace(preset: EntityDiscoveryGovernancePreset): void {
    const handoff = this.getResponseHandoff('discovery');
    this.router.navigate(['/entities', 'discovery'], {
      queryParams: this.mergeListQueryParams({
        ...buildGovernancePresetQueryParams(preset),
        query: this.trimText(handoff.query) || this.getAlertSearchToken() || this.getLogSearchToken() || this.getFallbackEntitySearchToken(),
        owner: this.trimText(preset.owner) || this.trimText(this.entity?.owner),
        system: this.trimText(preset.system) || this.trimText(this.entity?.system),
        environment: this.trimText(preset.environment) || this.trimText(this.entity?.environment),
        source: this.trimText(preset.source) || this.trimText(this.entity?.source),
        status: this.trimText(preset.status),
        ...this.buildReturnQueryParams(handoff)
      })
    });
  }

  runGovernancePolicyAction(card: DetailGovernancePolicyCard): void {
    switch (card.action) {
      case 'registry-refresh':
        this.refreshGovernancePresetRegistry();
        return;
      case 'registry-sync':
        this.syncGovernancePresetRegistry();
        return;
      case 'registry-seed':
        this.openDiscoveryWorkspace();
        return;
      case 'preset':
        if (card.preset != null) {
          this.openGovernancePresetWorkspace(card.preset);
          return;
        }
        this.openDiscoveryWorkspace();
        return;
      case 'editor':
        this.openEditorSection('ownership', this.preferredGovernancePreset);
        return;
      case 'definition':
        this.editDefinition(this.preferredGovernancePreset);
        return;
      case 'discovery':
      default:
        this.openDiscoveryWorkspace();
    }
  }

  runGovernanceHookAction(card: DetailGovernanceHookCard): void {
    switch (card.action) {
      case 'registry-refresh':
        this.refreshGovernancePresetRegistry();
        return;
      case 'registry-sync':
        this.syncGovernancePresetRegistry();
        return;
      case 'registry-seed':
        this.openDiscoveryWorkspace();
        return;
      case 'preset':
        if (card.preset != null) {
          this.openGovernancePresetWorkspace(card.preset);
          return;
        }
        this.openDiscoveryWorkspace();
        return;
      case 'editor':
        this.openEditorSection('ownership', card.preset || this.preferredGovernancePreset);
        return;
      case 'definition':
        this.editDefinition(card.preset || this.preferredGovernancePreset);
        return;
      case 'discovery':
      default:
        this.openDiscoveryWorkspace();
    }
  }

  runSharedGovernanceSnapshotAction(card: DetailSharedGovernanceSnapshotCard): void {
    if (card.action === 'definition') {
      this.editDefinition(this.preferredGovernancePreset, 'ownership');
      return;
    }
    this.openDiscoveryWorkspace('ownership');
  }

  getSharedGovernanceSnapshotMeta(card: DetailSharedGovernanceSnapshotCard): string | undefined {
    const sourceLabel =
      card.key === 'definition'
        ? this.translateOrFallback('entity.detail.snapshot.definition.meta', '定义记录')
        : this.translateOrFallback('entity.detail.snapshot.discovery.meta', '发现记录');
    const statusLabel = this.getGovernanceHistoryStatusLabel(card.status);
    const segments = [sourceLabel, statusLabel, this.trimText(card.happenedAt)].filter((value): value is string => value != null);
    return segments.length > 0 ? segments.join(' · ') : undefined;
  }

  trackBySharedGovernanceSnapshot(_index: number, item: DetailSharedGovernanceSnapshotCard): string {
    return `${item.key}:${item.happenedAt || item.summary}`;
  }

  private getDetailRegistrySignal(): GovernanceRegistrySignalPresentation {
    return buildGovernanceRegistrySignalPresentation(
      this.governancePresetRegistrySource,
      this.latestSharedGovernanceSnapshot?.happenedAt,
      this.translateOrFallback.bind(this)
    );
  }

  private getDetailRegistryAction(card: GovernanceRegistrySignalPresentation): DetailGovernanceHookCard['action'] {
    switch (card.state) {
      case 'local-fallback':
        return 'registry-sync';
      case 'missing':
        return 'registry-seed';
      case 'shared-fresh':
      case 'shared-stale':
      default:
        return 'registry-refresh';
    }
  }

  private getDetailRegistryActionLabel(card: GovernanceRegistrySignalPresentation): string {
    switch (card.state) {
      case 'local-fallback':
        return this.translateOrFallback('entity.governance.registry.sync', '同步到共享目录');
      case 'missing':
        return this.translateOrFallback('entity.governance.registry.seed', '先建立共享预设');
      case 'shared-fresh':
      case 'shared-stale':
      default:
        return this.translateOrFallback('entity.governance.registry.refresh', '刷新共享目录');
    }
  }

  getGovernancePresetSummary(preset: EntityDiscoveryGovernancePreset): string {
    const filters = [
      this.trimText(preset.owner),
      this.trimText(preset.system),
      this.trimText(preset.environment),
      this.trimText(preset.source) != null
        ? this.translateOrFallback(`entity.source.${preset.source}`, this.humanize(preset.source))
        : undefined,
      this.trimText(preset.status) != null
        ? this.translateOrFallback(`entity.status.${preset.status}`, this.humanize(preset.status))
        : undefined
    ].filter((value): value is string => value != null);
    const overrides = [
      this.trimText(preset.bulkOwner) != null
        ? `${this.translateOrFallback('entity.field.owner', '负责人')}→${preset.bulkOwner}`
        : undefined,
      this.trimText(preset.bulkSystem) != null
        ? `${this.translateOrFallback('entity.field.system', '所属系统')}→${preset.bulkSystem}`
        : undefined
    ].filter((value): value is string => value != null);
    return [...filters, ...overrides].join(' · ') || this.translateOrFallback('entity.discovery.preset.summary.empty', '仅保存了当前治理入口');
  }

  getGovernancePresetConflictFieldLabelsForPreset(preset: EntityDiscoveryGovernancePreset): string[] {
    return this.getGovernancePresetConflictFields(preset).map(field => this.getGovernanceFieldLabel(field));
  }

  hasGovernancePresetConflict(preset: EntityDiscoveryGovernancePreset): boolean {
    return this.getGovernancePresetConflictFieldLabelsForPreset(preset).length > 0;
  }

  openAlertCenter(): void {
    this.router.navigate(['/alert/center'], { queryParams: this.getAlertCenterQueryParams() });
  }

  openMonitorCenter(): void {
    this.router.navigate(['/monitors'], { queryParams: this.getMonitorCenterQueryParams() });
  }

  openMetricsConsole(): void {
    this.router.navigate(['/ingestion/otlp/metrics'], { queryParams: this.getMetricsConsoleQueryParams() });
  }

  openLogManage(): void {
    this.router.navigate(['/log/manage'], { queryParams: this.getLogManageQueryParams() });
  }

  openTraceCenter(): void {
    this.router.navigate(['/trace/manage'], { queryParams: this.getTraceCenterQueryParams() });
  }

  openRelatedSignalCard(key: DetailRelatedSignalCard['key']): void {
    switch (key) {
      case 'logs':
        this.openLogManage();
        return;
      case 'traces':
        this.openTraceCenter();
        return;
      case 'metrics':
        this.openMetricsWorkbench();
        return;
      default:
        return;
    }
  }

  openSummaryStripItem(key: string): void {
    switch (key) {
      case 'alerts':
        this.openAlertsWorkbench();
        return;
      case 'monitors':
        this.openMonitorsWorkbench();
        return;
      case 'logs':
        this.openLogManage();
        return;
      case 'traces':
        this.openTraceCenter();
        return;
      default:
        return;
    }
  }

  openPrimaryTriageCode(): void {
    switch (this.primaryTriageFocusKind) {
      case 'metrics':
        return;
      case 'monitors':
        this.openCodeForHandoff('monitors');
        return;
      case 'traces':
        this.openCodeForHandoff('traces');
        return;
      case 'logs':
        this.openCodeForHandoff('logs');
        return;
      default:
        return;
    }
  }

  openAlertsWorkbench(): void {
    this.openAlertCenter();
  }

  openMonitorsWorkbench(): void {
    this.openMonitorCenter();
  }

  openMetricsWorkbench(): void {
    this.openMetricsConsole();
  }

  openPrimaryTriageFocus(): void {
    switch (this.primaryTriageFocusKind) {
      case 'alerts':
        this.openAlertsWorkbench();
        return;
      case 'metrics':
        this.openMetricsWorkbench();
        return;
      case 'monitors':
        this.openMonitorsWorkbench();
        return;
      case 'traces':
        this.openTraceCenter();
        return;
      case 'logs':
        this.openLogManage();
        return;
      default:
        this.openDiscoveryWorkspace();
    }
  }

  generateTriageSummary(): void {
    if (this.entityId == null || this.triageSummaryLoading) {
      return;
    }
    this.triageSummaryLoading = true;
    this.entitySvc.generateEntityTriageSummary(this.entityId).subscribe({
      next: message => {
        this.triageSummaryLoading = false;
        if (message.code === 0) {
          this.triageSummary = message.data;
        } else {
          this.notifySvc.warning(
            this.translateOrFallback('entity.detail.triage-summary.title', '轻量总结'),
            message.msg || this.translateOrFallback('entity.detail.triage-summary.load.failed', '生成总结失败')
          );
        }
        this.cdr.markForCheck();
      },
      error: error => {
        this.triageSummaryLoading = false;
        this.notifySvc.error(
          this.translateOrFallback('entity.detail.triage-summary.title', '轻量总结'),
          error?.msg || error?.message || this.translateOrFallback('entity.detail.triage-summary.load.failed', '生成总结失败')
        );
        this.cdr.markForCheck();
      }
    });
  }

  openTriageSummaryRecommendation(): void {
    switch (this.triageSummary?.recommendedFocus) {
      case 'alerts':
        this.openAlertsWorkbench();
        return;
      case 'monitors':
        this.openMonitorsWorkbench();
        return;
      case 'logs':
        this.openLogManage();
        return;
      case 'evidence':
      default:
        this.openEvidenceRecommendation();
    }
  }

  openRelationsWorkbench(): void {
    this.activeTabIndex = this.relationsTabIndex;
    this.cdr.markForCheck();
  }

  dismissResponseResultBanner(): void {
    this.responseResultBanner = undefined;
    if (this.responseResultDismissTimer) {
      clearTimeout(this.responseResultDismissTimer);
      this.responseResultDismissTimer = undefined;
    }
    const tree = this.router.parseUrl(this.router.url);
    delete tree.queryParams['responseResultKind'];
    delete tree.queryParams['responseResultAction'];
    delete tree.queryParams['responseResultCount'];
    this.location.replaceState(this.router.serializeUrl(tree));
    this.cdr.markForCheck();
  }

  runResponseResultNextStep(): void {
    const nextAction = this.topRecommendedActions[0];
    if (nextAction != null) {
      this.runRecommendedAction(nextAction);
      return;
    }
    this.openPrimaryTriageFocus();
  }

  runRecommendedAction(action: DetailWorkspaceAction): void {
    switch (action.key) {
      case 'registry-refresh':
        this.refreshGovernancePresetRegistry();
        return;
      case 'registry-sync':
        this.syncGovernancePresetRegistry();
        return;
      case 'registry-seed':
        this.openDiscoveryWorkspace();
        return;
      case 'alerts':
        this.openAlertCenter();
        return;
      case 'logs':
        this.openLogManage();
        return;
      case 'owner':
      case 'catalog-metadata':
      case 'runbook':
        this.openEditorSection('ownership', this.preferredGovernancePreset);
        return;
      case 'monitors':
        this.openMonitorCenter();
        return;
      case 'relations':
        this.openEditorSection('relations', this.preferredGovernancePreset);
        return;
      case 'definition':
        this.editDefinition(this.preferredGovernancePreset);
        return;
      case 'discovery':
      default:
        this.openDiscoveryWorkspace();
    }
  }

  onWorkspaceGuidanceAction(actionKey: string): void {
    const action = this.recommendedActions.find(item => item.key === actionKey);
    if (action != null) {
      this.runRecommendedAction(action);
      return;
    }
    if (actionKey === 'definition-preview') {
      this.openDefinitionPreviewDrawer();
    }
  }

  onWorkspaceGuidanceNext(actionKey: string): void {
    const action = this.recommendedActions.find(item => item.key === actionKey);
    if (action != null) {
      this.runRecommendedAction(action);
      return;
    }
    switch (actionKey) {
      case 'definition-preview':
        this.openDefinitionPreviewDrawer();
        return;
      case 'logs':
        this.openLogManage();
        return;
      case 'traces':
        this.openTraceCenter();
        return;
      default:
        return;
    }
  }

  private openEvidenceRecommendation(): void {
    const nextAction = this.topRecommendedActions.find(item => !['alerts', 'monitors', 'logs'].includes(item.key));
    if (nextAction != null) {
      this.runRecommendedAction(nextAction);
      return;
    }
    this.openDiscoveryWorkspace();
  }

  setDefinitionPreviewFormat(format: DefinitionPreviewFormat): void {
    this.definitionPreviewFormat = format;
    if (format === 'curl') {
      this.definitionPreviewContent = '';
      this.cdr.markForCheck();
      return;
    }
    this.loadDefinitionPreview();
  }

  openDefinitionPreviewDrawer(): void {
    this.definitionPreviewDrawerVisible = true;
  }

  closeDefinitionPreviewDrawer(): void {
    this.definitionPreviewDrawerVisible = false;
  }

  getCatalogQueryParams(type?: string): Record<string, string | null> {
    return {
      ...this.listQueryParams,
      type: type || null
    };
  }

  get workspaceTabs(): WorkspaceShellTab[] {
    return [
      { key: 'entity', label: this.translateOrFallback('entity.detail', '实体详情'), active: true },
      { key: 'metrics', label: this.translateOrFallback('ingestion.otlp.metrics.title', '指标工作台'), active: false },
      { key: 'monitors', label: this.translateOrFallback('menu.monitor.center', '监控'), active: false },
      { key: 'logs', label: this.translateOrFallback('log.manage.console.title', '日志工作台'), active: false },
      { key: 'traces', label: this.translateOrFallback('trace.center.console.title', '链路工作台'), active: false }
    ];
  }

  get showWorkspaceRail(): boolean {
    return false;
  }

  onWorkspaceTabSelect(key: string): void {
    switch (key) {
      case 'metrics':
        this.openMetricsConsole();
        return;
      case 'monitors':
        this.openMonitorCenter();
        return;
      case 'logs':
        this.openLogManage();
        return;
      case 'traces':
        this.openTraceCenter();
        return;
      default:
        return;
    }
  }

  getCatalogGroupCount(type?: string): number {
    if (type == null) {
      return this.catalogTotalCount;
    }
    return this.catalogGroupCounts[type] || 0;
  }

  copyDefinitionPreview(): void {
    if (typeof navigator === 'undefined' || navigator.clipboard == null) {
      this.notifySvc.warning(
        this.translateOrFallback('entity.detail', 'Entity Detail'),
        this.translateOrFallback('entity.definition.copy.unsupported', 'Clipboard copy is not available in the current browser.')
      );
      return;
    }
    navigator.clipboard
      .writeText(this.definitionPreview)
      .then(() => {
        this.notifySvc.success(
          this.translateOrFallback('entity.detail', 'Entity Detail'),
          this.translateOrFallback('entity.definition.copy.success', 'Definition content copied.')
        );
      })
      .catch(() => {
        this.notifySvc.error(
          this.translateOrFallback('entity.detail', 'Entity Detail'),
          this.translateOrFallback('entity.definition.copy.fail', 'Copy failed.')
        );
      });
  }

  downloadDefinitionPreview(): void {
    if (typeof document === 'undefined') {
      return;
    }
    const format = this.definitionPreviewFormat;
    const blob = new Blob([this.definitionPreview], {
      type: format === 'json' ? 'application/json' : format === 'curl' ? 'text/plain' : 'application/yaml'
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${this.entity?.name || 'entity-definition'}.${format === 'curl' ? 'sh' : format}`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  getDefinitionImportActivityStatusLabel(status: DefinitionImportActivity['status']): string {
    switch (status) {
      case 'success':
        return this.translateOrFallback('entity.definition.import.activity.status.success', '成功');
      case 'warning':
        return this.translateOrFallback('entity.definition.import.activity.status.warning', '需关注');
      default:
        return this.translateOrFallback('entity.definition.import.activity.status.error', '失败');
    }
  }

  getDefinitionImportActivityFormatLabel(format: DefinitionImportActivity['format']): string {
    return format.toUpperCase();
  }

  getDefinitionGovernanceActionLabel(): string | undefined {
    return this.latestGovernanceHistoryItem != null ? this.getGovernanceHistoryActionLabel(this.latestGovernanceHistoryItem) : undefined;
  }

  openDefinitionGovernanceAction(): void {
    if (this.latestGovernanceHistoryItem == null) {
      this.editDefinition();
      return;
    }
    this.openGovernanceHistoryItem(this.latestGovernanceHistoryItem);
  }

  runLifecycleRecordAction(record: DetailLifecycleRecord): void {
    switch (record.kind) {
      case 'shared':
        if (this.latestSharedGovernanceSnapshot != null) {
          this.runSharedGovernanceSnapshotAction(this.latestSharedGovernanceSnapshot);
          return;
        }
        this.openDiscoveryWorkspace();
        return;
      case 'preset':
        if (this.latestPresetWorkspacePreset != null) {
          this.openGovernancePresetWorkspace(this.latestPresetWorkspacePreset);
          return;
        }
        this.openDiscoveryWorkspace();
        return;
      case 'definition':
        this.editDefinition();
        return;
      case 'discovery':
        if (this.latestDiscoveryGovernanceHistoryItem != null) {
          this.openGovernanceHistoryItem(this.latestDiscoveryGovernanceHistoryItem);
          return;
        }
        this.openDiscoveryWorkspace();
        return;
      case 'source':
      default:
        if (this.latestCatalogGovernanceHistoryItem != null) {
          this.openGovernanceHistoryItem(this.latestCatalogGovernanceHistoryItem);
          return;
        }
        if (this.entity?.source === 'manual') {
          this.editEntity();
          return;
        }
        this.openDiscoveryWorkspace();
    }
  }

  getGovernanceHistoryKindLabel(kind: DetailGovernanceHistoryItem['kind']): string {
    if (kind === 'definition') {
      return this.translateOrFallback('entity.definition.import.activity.entity-title', '定义活动');
    }
    if (kind === 'catalog') {
      return this.translateOrFallback('entity.detail.lifecycle.catalog', '目录治理');
    }
    return this.translateOrFallback('entity.discovery.activity.title', '发现治理');
  }

  getGovernanceHistoryStatusColor(status: DetailGovernanceHistoryItem['status']): string {
    switch (status) {
      case 'success':
        return 'success';
      case 'warning':
        return 'warning';
      case 'error':
        return 'error';
      default:
        return 'processing';
    }
  }

  getGovernanceHistoryStatusLabel(status: DetailGovernanceHistoryItem['status']): string {
    if (status === 'info') {
      return this.translateOrFallback('entity.discovery.activity.info', '已记录');
    }
    return this.getDefinitionImportActivityStatusLabel(status);
  }

  getGovernanceHistoryActionLabel(item: DetailGovernanceHistoryItem): string | undefined {
    if (item.kind === 'discovery' && this.trimText(item.workspacePath) != null) {
      return this.translateOrFallback('entity.discovery.activity.resume', '继续处理');
    }
    if (item.kind === 'discovery') {
      return this.translateOrFallback('entity.detail.next.discovery.action', '去遥测发现');
    }
    if (item.kind === 'catalog') {
      return this.translateOrFallback('entity.catalog.edit', '编辑目录');
    }
    if (item.kind === 'definition') {
      return this.translateOrFallback('entity.definition.edit', '编辑定义');
    }
    return undefined;
  }

  openGovernanceHistoryItem(item: DetailGovernanceHistoryItem): void {
    if (item.kind === 'discovery' && this.trimText(item.workspacePath) != null) {
      this.router.navigateByUrl(item.workspacePath!);
      return;
    }
    if (item.kind === 'discovery') {
      this.openDiscoveryWorkspace();
      return;
    }
    if (item.kind === 'catalog') {
      this.editEntity();
      return;
    }
    this.editDefinition();
  }

  private loadDefinitionPreview(): void {
    const format = this.definitionPreviewFormat;
    if (!this.entityId || this.loading || format === 'curl') {
      return;
    }
    this.entitySvc.getEntityDefinition(this.entityId, format).subscribe({
      next: message => {
        const definitionContent = typeof message.data === 'string' ? message.data : message.msg;
        if (message.code === 0 && definitionContent != null) {
          this.definitionPreviewContent = definitionContent;
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.definitionPreviewContent = '';
        this.cdr.markForCheck();
      }
    });
  }

  private syncDefinitionImportActivities(): void {
    this.serverGovernanceActivities = this.sortEntityActivitiesByTime(this.detail?.definitionActivities || []);
    const serverDefinitionActivities = this.serverGovernanceActivities
      .filter(activity => this.isDefinitionActivityType(activity.activityType))
      .map(activity => this.toDefinitionImportActivity(activity));
    if (serverDefinitionActivities.length > 0) {
      this.definitionImportActivities = this.sortActivitiesByTime(serverDefinitionActivities);
      this.syncGovernanceHistory();
      return;
    }
    const entityName = this.trimText(this.entity?.name);
    this.definitionImportActivities = this.sortActivitiesByTime(
      readDefinitionImportActivities(24).filter(activity => {
        if (activity.entityId === this.entityId) {
          return true;
        }
        return entityName != null && activity.entityName === entityName;
      })
    );
    this.syncGovernanceHistory();
  }

  private toDefinitionImportActivity(activity: EntityDefinitionActivity): DefinitionImportActivity {
    const format = activity.format === 'json' || activity.format === 'curl' ? activity.format : 'yaml';
    const status: DefinitionImportActivity['status'] =
      activity.status === 'warning' || activity.status === 'error' ? activity.status : 'success';
    return {
      id: `${activity.id}`,
      happenedAt: this.formatActivityTime(activity.gmtCreate),
      status,
      format,
      summary: activity.summary,
      detail: this.trimText(activity.detail)
    };
  }

  private syncGovernanceHistory(): void {
    const entityName = this.trimText(this.entity?.name);
    const serverHistory = this.serverGovernanceActivities
      .map(activity => this.toGovernanceHistoryItem(activity))
      .filter((activity): activity is DetailGovernanceHistoryItem => activity != null);
    const shouldUseSharedDiscoveryFallback = !serverHistory.some(item => item.kind === 'discovery') && this.serverDiscoveryActivities.length > 0;
    const shouldUseLocalDiscoveryFallback = !serverHistory.some(item => item.kind === 'discovery') && this.serverDiscoveryActivities.length === 0;
    const discoveryHistory = shouldUseSharedDiscoveryFallback
      ? this.serverDiscoveryActivities.map(activity => ({
          id: `discovery:${activity.id}`,
          kind: 'discovery' as const,
          status: this.normalizeGovernanceActivityStatus(activity.status),
          summary: activity.summary,
          detail: this.trimText(activity.detail),
          happenedAt: this.normalizeGovernanceTimestamp(activity.happenedAt),
          workspacePath: this.trimText(activity.workspacePath)
        }))
      : shouldUseLocalDiscoveryFallback
      ? readDiscoveryGovernanceActivities(24)
          .filter(activity => this.matchesDiscoveryGovernanceActivity(activity, entityName))
          .map(activity => ({
            id: `discovery:${activity.id}`,
            kind: 'discovery' as const,
            status: activity.status,
            summary: activity.summary,
            detail: this.trimText(activity.detail),
            happenedAt: this.normalizeGovernanceTimestamp(activity.happenedAt),
            workspacePath: this.trimText(activity.workspacePath)
          }))
      : [];
    this.governanceHistoryItems = [...serverHistory, ...discoveryHistory].sort((left, right) => {
      return this.compareGovernanceTimestamp(left.happenedAt, right.happenedAt);
    });
  }

  private loadSharedDiscoveryActivities(): void {
    this.entitySvc.getDiscoveryGovernanceActivities(24).subscribe({
      next: message => {
        if (message.code !== 0) {
          this.sharedDiscoveryActivities = [];
          this.serverDiscoveryActivities = [];
          this.syncGovernanceHistory();
          this.cdr.markForCheck();
          return;
        }
        const entityName = this.trimText(this.entity?.name);
        const activities = [...(message.data || [])].sort((left, right) => this.compareGovernanceTimestamp(left.happenedAt, right.happenedAt));
        this.sharedDiscoveryActivities = activities;
        this.serverDiscoveryActivities = activities.filter(activity => this.matchesDiscoveryGovernanceActivity(activity, entityName));
        this.syncGovernanceHistory();
        this.cdr.markForCheck();
      },
      error: () => {
        this.sharedDiscoveryActivities = [];
        this.serverDiscoveryActivities = [];
        this.syncGovernanceHistory();
        this.cdr.markForCheck();
      }
    });
  }

  private loadDefinitionWorkspaceActivities(): void {
    this.entitySvc.getDefinitionWorkspaceActivities(24).subscribe({
      next: message => {
        if (message.code !== 0) {
          this.sharedWorkspaceActivities = [];
          this.serverWorkspaceActivities = [];
          this.cdr.markForCheck();
          return;
        }
        const activities = [...(message.data || [])].sort((left, right) => this.compareGovernanceTimestamp(left.happenedAt, right.happenedAt));
        this.sharedWorkspaceActivities = activities;
        this.serverWorkspaceActivities = activities.filter(activity => this.isGovernancePresetWorkspaceActivity(activity) && activity.entityId === this.entityId);
        this.cdr.markForCheck();
      },
      error: () => {
        this.sharedWorkspaceActivities = [];
        this.serverWorkspaceActivities = [];
        this.cdr.markForCheck();
      }
    });
  }

  private loadGovernancePresets(): void {
    this.entitySvc.getDiscoveryGovernancePresets(8).subscribe({
      next: message => {
        if (message.code === 0) {
          const serverPresets = (message.data || []).slice(0, 8);
          this.governancePresets = serverPresets.length > 0 ? serverPresets : readDiscoveryGovernancePresets(8);
          this.governancePresetRegistrySource = serverPresets.length > 0 ? 'shared' : this.governancePresets.length > 0 ? 'local' : 'empty';
          if (this.governancePresets.length > 0) {
            writeDiscoveryGovernancePresets(this.governancePresets, 8);
          }
          if (!this.governancePresetsMigrated) {
            this.governancePresetsMigrated = true;
            this.syncLocalGovernancePresets(serverPresets);
          }
        } else {
          this.governancePresets = readDiscoveryGovernancePresets(8);
          this.governancePresetRegistrySource = this.governancePresets.length > 0 ? 'local' : 'empty';
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.governancePresets = readDiscoveryGovernancePresets(8);
        this.governancePresetRegistrySource = this.governancePresets.length > 0 ? 'local' : 'empty';
        this.cdr.markForCheck();
      }
    });
  }

  private syncLocalGovernancePresets(serverPresets: EntityDiscoveryGovernancePreset[]): void {
    const localPresets = readDiscoveryGovernancePresets(8);
    const missing = localPresets.filter(
      localPreset => !serverPresets.some(serverPreset => serverPreset.id === localPreset.id || serverPreset.name === localPreset.name)
    );
    if (missing.length === 0) {
      return;
    }
    forkJoin(missing.map(preset => this.entitySvc.saveDiscoveryGovernancePreset(preset).pipe(catchError(() => of(undefined))))).subscribe(() => {
      this.loadGovernancePresets();
    });
  }

  private toGovernanceHistoryItem(activity: EntityDefinitionActivity): DetailGovernanceHistoryItem | undefined {
    const kind = this.toGovernanceHistoryKind(activity.activityType);
    if (kind == null) {
      return undefined;
    }
    return {
      id: `${kind}:${activity.id}`,
      kind,
      status: this.normalizeGovernanceActivityStatus(activity.status),
      summary: activity.summary,
      detail: this.trimText(activity.detail),
      happenedAt: this.formatActivityTime(activity.gmtCreate),
      format: kind === 'definition' ? (activity.format === 'curl' ? 'yaml' : (activity.format as DefinitionPreviewFormat | undefined)) : undefined
    };
  }

  private isGovernancePresetWorkspaceActivity(activity: DefinitionImportActivity | undefined): boolean {
    if (activity == null) {
      return false;
    }
    const activityId = this.trimText(activity.id);
    if (activityId != null && activityId.startsWith('governance-preset-')) {
      return true;
    }
    const summary = this.trimText(activity.summary);
    return (
      summary === this.translateOrFallback('entity.definition.workspace.activity.preset-applied', 'Shared governance preset applied')
      || summary === '已应用共享预设'
      || summary === 'Shared governance preset applied'
    );
  }

  private isGovernanceHookWorkspaceActivity(activity: DefinitionImportActivity | undefined): boolean {
    if (activity == null) {
      return false;
    }
    const activityId = this.trimText(activity.id);
    if (activityId != null && activityId.startsWith('definition-governance-hook-')) {
      return true;
    }
    const summary = this.trimText(activity.summary);
    return summary === this.translateOrFallback('entity.definition.workspace.hooks.activity.summary', '处理建议已更新')
      || summary === '处理建议已更新';
  }

  private isGovernanceHookDiscoveryActivity(activity: DiscoveryGovernanceActivity | undefined): boolean {
    if (activity == null) {
      return false;
    }
    if (activity.action === 'policy-hook') {
      return true;
    }
    const summary = this.trimText(activity.summary);
    return summary === this.translateOrFallback('entity.discovery.hooks.activity.summary', '处理建议已更新')
      || summary === '处理建议已更新';
  }

  private extractGovernancePresetIdFromActivity(activity: DefinitionImportActivity | undefined): string | undefined {
    const activityId = this.trimText(activity?.id);
    if (activityId == null) {
      return undefined;
    }
    const segments = activityId.split(':').map(segment => segment.trim()).filter(segment => segment !== '');
    return segments.length > 0 ? segments[segments.length - 1] : undefined;
  }

  private resolveGovernancePresetForActivity(activity: DefinitionImportActivity | undefined): EntityDiscoveryGovernancePreset | undefined {
    const presetId = this.extractGovernancePresetIdFromActivity(activity);
    if (presetId == null) {
      return undefined;
    }
    return this.governancePresets.find(preset => preset.id === presetId);
  }

  private getGovernancePresetConflictFields(
    preset: EntityDiscoveryGovernancePreset | undefined
  ): Array<'owner' | 'system' | 'environment' | 'source' | 'status'> {
    const entity = this.entity;
    if (entity == null || preset == null) {
      return [];
    }
    const fields: Array<'owner' | 'system' | 'environment' | 'source' | 'status'> = [];
    if (this.trimText(preset.owner) != null && this.trimText(preset.owner) !== this.trimText(entity.owner)) {
      fields.push('owner');
    }
    if (this.trimText(preset.system) != null && this.trimText(preset.system) !== this.trimText(entity.system)) {
      fields.push('system');
    }
    if (this.trimText(preset.environment) != null && this.trimText(preset.environment) !== this.trimText(entity.environment)) {
      fields.push('environment');
    }
    if (this.trimText(preset.source) != null && this.trimText(preset.source) !== this.trimText(entity.source)) {
      fields.push('source');
    }
    if (this.trimText(preset.status) != null && this.trimText(preset.status) !== this.trimText(entity.status)) {
      fields.push('status');
    }
    return fields;
  }

  private getGovernanceFieldLabel(field: 'owner' | 'system' | 'environment' | 'source' | 'status'): string {
    switch (field) {
      case 'owner':
        return this.translateOrFallback('entity.field.owner', '负责人');
      case 'system':
        return this.translateOrFallback('entity.field.system', '所属系统');
      case 'environment':
        return this.translateOrFallback('entity.field.environment', '环境');
      case 'source':
        return this.translateOrFallback('entity.field.source', '来源');
      case 'status':
      default:
        return this.translateOrFallback('entity.field.status', '状态');
    }
  }

  private normalizeGovernanceTimestamp(value?: string | number | null): string {
    if (value == null || value === '') {
      return '';
    }
    return String(value);
  }

  private compareGovernanceTimestamp(left?: string | number | null, right?: string | number | null): number {
    const leftValue = left == null ? 0 : new Date(left).getTime();
    const rightValue = right == null ? 0 : new Date(right).getTime();
    return rightValue - leftValue;
  }

  getGovernancePresetMatchScore(preset: EntityDiscoveryGovernancePreset): number {
    const entity = this.entity;
    if (entity == null) {
      return 0;
    }
    let score = 0;
    if (this.trimText(preset.owner) != null && this.trimText(preset.owner) === this.trimText(entity.owner)) {
      score += 4;
    }
    if (this.trimText(preset.system) != null && this.trimText(preset.system) === this.trimText(entity.system)) {
      score += 4;
    }
    if (this.trimText(preset.environment) != null && this.trimText(preset.environment) === this.trimText(entity.environment)) {
      score += 3;
    }
    if (this.trimText(preset.source) != null && this.trimText(preset.source) === this.trimText(entity.source)) {
      score += 2;
    }
    if (this.trimText(preset.status) != null && this.trimText(preset.status) === this.trimText(entity.status)) {
      score += 1;
    }
    return score;
  }

  private toGovernanceHistoryKind(activityType?: string | null): DetailGovernanceHistoryItem['kind'] | undefined {
    switch (this.trimText(activityType ?? undefined) || '') {
      case 'definition_import':
      case 'definition_update':
        return 'definition';
      case 'discovery_governance':
        return 'discovery';
      case 'catalog_create':
      case 'catalog_update':
      case 'source_update':
        return 'catalog';
      default:
        return undefined;
    }
  }

  private normalizeGovernanceActivityStatus(status?: string | null): DetailGovernanceHistoryItem['status'] {
    switch (this.trimText(status ?? undefined) || '') {
      case 'success':
      case 'warning':
      case 'error':
        return this.trimText(status ?? undefined) as DetailGovernanceHistoryItem['status'];
      default:
        return 'info';
    }
  }

  private isDefinitionActivityType(activityType?: string | null): boolean {
    return activityType === 'definition_import' || activityType === 'definition_update';
  }

  private sortEntityActivitiesByTime(activities: EntityDefinitionActivity[]): EntityDefinitionActivity[] {
    return [...activities].sort((left, right) =>
      this.formatActivityTime(right.gmtCreate).localeCompare(this.formatActivityTime(left.gmtCreate))
    );
  }

  private matchesDiscoveryGovernanceActivity(activity: DiscoveryGovernanceActivity, entityName?: string): boolean {
    return (activity.entityRefs || []).some(ref => {
      if (ref.entityId === this.entityId) {
        return true;
      }
      return entityName != null && ref.entityName === entityName;
    });
  }

  private formatActivityTime(value?: number | string): string {
    if (value == null || value === '') {
      return '';
    }
    try {
      return formatDate(value, 'yyyy-MM-dd HH:mm:ss', 'en-US');
    } catch {
      return String(value);
    }
  }

  onAlertStatusFilterChange(status?: string | null): void {
    const normalized = this.trimText(status ?? undefined);
    this.alertStatusFilter = normalized === 'resolved' || normalized === 'acknowledged' ? normalized : 'firing';
    this.alertPageIndex = 1;
    this.loadAlertsPage();
  }

  onAlertSeverityFilterChange(severity?: string | null): void {
    this.alertSeverityFilter = this.trimText(severity ?? undefined) || null;
    this.alertPageIndex = 1;
    this.loadAlertsPage();
  }

  onAlertPageIndexChange(pageIndex: number): void {
    this.alertPageIndex = pageIndex;
    this.loadAlertsPage();
  }

  onAlertPageSizeChange(pageSize: number): void {
    this.alertPageSize = pageSize;
    this.alertPageIndex = 1;
    this.loadAlertsPage();
  }

  resetAlertWorkbenchFilters(): void {
    this.alertStatusFilter = 'firing';
    this.alertSeverityFilter = null;
    this.alertPageIndex = 1;
    this.loadAlertsPage();
  }

  onAllDetailAlertsChecked(checked: boolean): void {
    if (checked) {
      this.alertWorkbenchList.forEach(alert => this.selectedDetailAlertIds.add(alert.id));
    } else {
      this.selectedDetailAlertIds.clear();
    }
    this.detailAlertsCheckedAll = checked;
    this.cdr.markForCheck();
  }

  onDetailAlertChecked(alertId: number, checked: boolean): void {
    if (checked) {
      this.selectedDetailAlertIds.add(alertId);
    } else {
      this.selectedDetailAlertIds.delete(alertId);
    }
    this.syncDetailAlertsCheckedAll();
    this.cdr.markForCheck();
  }

  acknowledgeDetailAlert(alertId: number): void {
    this.applyDetailAlertsStatus(new Set([alertId]), 'acknowledged', 'acknowledge');
  }

  unacknowledgeDetailAlert(alertId: number): void {
    this.applyDetailAlertsStatus(new Set([alertId]), 'firing', 'unacknowledge');
  }

  resolveDetailAlert(alertId: number): void {
    this.applyDetailAlertsStatus(new Set([alertId]), 'resolved', 'resolve');
  }

  reopenDetailAlert(alertId: number): void {
    this.applyDetailAlertsStatus(new Set([alertId]), 'firing', 'reopen');
  }

  acknowledgeSelectedDetailAlerts(): void {
    const selectedIds = this.getSelectedDetailAlertIdsByStatus('firing');
    if (selectedIds.size === 0) {
      this.notifySvc.warning(this.translateOrFallback('alert.center.notify.no-mark', '当前没有可确认的告警。'), '');
      return;
    }
    this.modal.confirm({
      nzTitle: this.translateOrFallback('entity.alert.workbench.confirm.acknowledge-selected', '确认当前选中的活跃告警？'),
      nzOkText: this.translateOrFallback('common.button.ok', '确定'),
      nzCancelText: this.translateOrFallback('common.button.cancel', '取消'),
      nzOkType: 'primary',
      nzClosable: false,
      nzOnOk: () => this.applyDetailAlertsStatus(selectedIds, 'acknowledged', 'acknowledge')
    });
  }

  unacknowledgeSelectedDetailAlerts(): void {
    const selectedIds = this.getSelectedDetailAlertIdsByStatus('acknowledged');
    if (selectedIds.size === 0) {
      this.notifySvc.warning(this.translateOrFallback('alert.center.notify.no-mark', '当前没有可取消确认的告警。'), '');
      return;
    }
    this.modal.confirm({
      nzTitle: this.translateOrFallback('entity.alert.workbench.confirm.unacknowledge-selected', '取消确认当前选中的告警？'),
      nzOkText: this.translateOrFallback('common.button.ok', '确定'),
      nzCancelText: this.translateOrFallback('common.button.cancel', '取消'),
      nzOkType: 'primary',
      nzClosable: false,
      nzOnOk: () => this.applyDetailAlertsStatus(selectedIds, 'firing', 'unacknowledge')
    });
  }

  resolveSelectedDetailAlerts(): void {
    const selectedIds = this.getSelectedDetailAlertIdsByStatus('firing');
    if (selectedIds.size === 0) {
      this.notifySvc.warning(this.translateOrFallback('alert.center.notify.no-mark', '当前没有可恢复的告警。'), '');
      return;
    }
    this.modal.confirm({
      nzTitle: this.translateOrFallback('alert.center.confirm.mark-done-batch', '确认恢复当前选中的告警？'),
      nzOkText: this.translateOrFallback('common.button.ok', '确定'),
      nzCancelText: this.translateOrFallback('common.button.cancel', '取消'),
      nzOkDanger: true,
      nzOkType: 'primary',
      nzClosable: false,
      nzOnOk: () => this.applyDetailAlertsStatus(selectedIds, 'resolved', 'resolve')
    });
  }

  reopenSelectedDetailAlerts(): void {
    const selectedIds = this.getSelectedDetailAlertIdsByStatus('resolved');
    if (selectedIds.size === 0) {
      this.notifySvc.warning(this.translateOrFallback('alert.center.notify.no-mark', '当前没有可重开的告警。'), '');
      return;
    }
    this.modal.confirm({
      nzTitle: this.translateOrFallback('alert.center.confirm.mark-no-batch', '确认重开当前选中的告警？'),
      nzOkText: this.translateOrFallback('common.button.ok', '确定'),
      nzCancelText: this.translateOrFallback('common.button.cancel', '取消'),
      nzOkDanger: true,
      nzOkType: 'primary',
      nzClosable: false,
      nzOnOk: () => this.applyDetailAlertsStatus(selectedIds, 'firing', 'reopen')
    });
  }

  openCreateSilenceForDetailAlert(alert: SingleAlert): void {
    this.openDetailSilenceModal([alert]);
  }

  openCreateSilenceForSelectedDetailAlerts(): void {
    const selectedAlerts = this.alertWorkbenchList.filter(alert => this.selectedDetailAlertIds.has(alert.id));
    if (selectedAlerts.length === 0) {
      this.notifySvc.warning(this.translateOrFallback('common.notify.no-select-edit', '请先选择需要编辑的数据。'), '');
      return;
    }
    this.openDetailSilenceModal(selectedAlerts);
  }

  openCreateInhibitForDetailAlert(alert: SingleAlert): void {
    this.openDetailInhibitModal([alert]);
  }

  openCreateInhibitForSelectedDetailAlerts(): void {
    const selectedAlerts = this.alertWorkbenchList.filter(alert => this.selectedDetailAlertIds.has(alert.id));
    if (selectedAlerts.length === 0) {
      this.notifySvc.warning(this.translateOrFallback('common.notify.no-select-edit', '请先选择需要编辑的数据。'), '');
      return;
    }
    this.openDetailInhibitModal(selectedAlerts);
  }

  onDetailSilenceModalCancel(): void {
    this.isDetailSilenceModalVisible = false;
  }

  onDetailInhibitModalCancel(): void {
    this.isDetailInhibitModalVisible = false;
  }

  onDetailSilenceModalOk(): void {
    if (this.detailSilenceForm?.invalid) {
      Object.values(this.detailSilenceForm.controls).forEach(control => {
        if (control.invalid) {
          control.markAsDirty();
          control.updateValueAndValidity({ onlySelf: true });
        }
      });
      return;
    }
    if (!this.detailSilence.matchAll && !this.hasDetailSilenceLabels()) {
      this.notifySvc.warning(this.translateOrFallback('validation.required', '必填项不能为空'), '');
      return;
    }
    if (this.detailSilence.type === 0) {
      this.detailSilence.periodStart = this.detailSilenceDates[0];
      this.detailSilence.periodEnd = this.detailSilenceDates[1];
      this.detailSilence.days = [];
    } else {
      this.detailSilence.days = this.detailSilenceDayCheckOptions.filter(item => item.checked).map(item => item.value).concat();
    }
    this.isDetailSilenceModalOkLoading = true;
    this.alertSilenceSvc.newAlertSilence(this.detailSilence).subscribe({
      next: message => {
        this.isDetailSilenceModalOkLoading = false;
        if (message.code === 0) {
          this.isDetailSilenceModalVisible = false;
          this.notifySvc.success(this.translateOrFallback('common.notify.new-success', '创建成功'), '');
          this.afterDetailAlertResponse('silence', this.detailSilenceSelectionCount);
        } else {
          this.notifySvc.error(this.translateOrFallback('common.notify.new-fail', '创建失败'), message.msg);
        }
        this.cdr.markForCheck();
      },
      error: error => {
        this.isDetailSilenceModalOkLoading = false;
        this.notifySvc.error(
          this.translateOrFallback('common.notify.new-fail', '创建失败'),
          error?.msg || error?.message || ''
        );
        this.cdr.markForCheck();
      }
    });
  }

  onDetailInhibitModalOk(): void {
    if (this.detailInhibitForm?.invalid) {
      Object.values(this.detailInhibitForm.controls).forEach(control => {
        if (control.invalid) {
          control.markAsDirty();
          control.updateValueAndValidity({ onlySelf: true });
        }
      });
      return;
    }
    if (!this.hasDetailInhibitLabels(this.detailInhibit.sourceLabels)
      || !this.hasDetailInhibitLabels(this.detailInhibit.targetLabels)
      || !this.hasDetailInhibitEqualLabels()) {
      this.notifySvc.warning(this.translateOrFallback('validation.required', '必填项不能为空'), '');
      return;
    }
    this.isDetailInhibitModalOkLoading = true;
    this.alertInhibitSvc.newAlertInhibit(this.detailInhibit).subscribe({
      next: message => {
        this.isDetailInhibitModalOkLoading = false;
        if (message.code === 0) {
          this.isDetailInhibitModalVisible = false;
          this.notifySvc.success(this.translateOrFallback('common.notify.new-success', '创建成功'), '');
          this.afterDetailAlertResponse('inhibit', this.detailInhibitSelectionCount);
        } else {
          this.notifySvc.error(this.translateOrFallback('common.notify.new-fail', '创建失败'), message.msg);
        }
        this.cdr.markForCheck();
      },
      error: error => {
        this.isDetailInhibitModalOkLoading = false;
        this.notifySvc.error(
          this.translateOrFallback('common.notify.new-fail', '创建失败'),
          error?.msg || error?.message || ''
        );
        this.cdr.markForCheck();
      }
    });
  }

  copyDetailInhibitSourceToTarget(): void {
    this.detailInhibit.targetLabels = { ...(this.detailInhibit.sourceLabels || {}) };
    this.refreshDetailInhibitPreviewState();
  }

  useDetailInhibitTargetWithoutSeverity(): void {
    this.detailInhibit.targetLabels = this.buildDetailInhibitTargetLabels(this.detailInhibit.sourceLabels || {});
    this.refreshDetailInhibitPreviewState();
  }

  clearDetailInhibitTarget(): void {
    this.detailInhibit.targetLabels = {};
    this.refreshDetailInhibitPreviewState();
  }

  clearDetailInhibitEqualLabels(): void {
    this.detailInhibit.equalLabels = [];
    this.refreshDetailInhibitPreviewState();
  }

  onDetailInhibitSourceLabelsChange(): void {
    this.refreshDetailInhibitPreviewState();
  }

  onDetailInhibitTargetLabelsChange(): void {
    this.refreshDetailInhibitPreviewState();
  }

  onDetailInhibitEqualLabelsChange(): void {
    this.refreshDetailInhibitPreviewState();
  }

  onMonitorStatusFilterChange(status?: number | null): void {
    this.monitorStatusFilter = status ?? null;
    this.monitorPageIndex = 1;
    this.monitorWorkbenchFallbackToAll = false;
    this.monitorWorkbenchAutoFallbackEligible = false;
    this.monitorWorkbenchDefaultContext = false;
    this.loadMonitorsPage();
  }

  onMonitorAppFilterChange(app?: string | null): void {
    this.monitorAppFilter = this.trimText(app ?? undefined) || null;
    this.monitorPageIndex = 1;
    this.monitorWorkbenchFallbackToAll = false;
    this.monitorWorkbenchAutoFallbackEligible = false;
    this.monitorWorkbenchDefaultContext = false;
    this.loadMonitorsPage();
  }

  onMonitorPageIndexChange(pageIndex: number): void {
    this.monitorPageIndex = pageIndex;
    this.monitorWorkbenchAutoFallbackEligible = false;
    this.monitorWorkbenchDefaultContext = false;
    this.loadMonitorsPage();
  }

  onMonitorPageSizeChange(pageSize: number): void {
    this.monitorPageSize = pageSize;
    this.monitorPageIndex = 1;
    this.monitorWorkbenchFallbackToAll = false;
    this.monitorWorkbenchAutoFallbackEligible = false;
    this.monitorWorkbenchDefaultContext = false;
    this.loadMonitorsPage();
  }

  resetMonitorWorkbenchFilters(): void {
    this.monitorPageIndex = 1;
    this.monitorAppFilter = null;
    this.monitorWorkbenchFallbackToAll = false;
    this.monitorWorkbenchAutoFallbackEligible = true;
    this.monitorWorkbenchDefaultContext = true;
    this.monitorStatusFilter = this.getDefaultMonitorWorkbenchStatusFilter();
    this.loadMonitorsPage();
  }

  onAllDetailMonitorsChecked(checked: boolean): void {
    if (checked) {
      this.monitorWorkbenchList.forEach(monitor => this.selectedDetailMonitorIds.add(monitor.id));
    } else {
      this.selectedDetailMonitorIds.clear();
    }
    this.detailMonitorsCheckedAll = checked;
    this.cdr.markForCheck();
  }

  onDetailMonitorChecked(monitorId: number, checked: boolean): void {
    if (checked) {
      this.selectedDetailMonitorIds.add(monitorId);
    } else {
      this.selectedDetailMonitorIds.delete(monitorId);
    }
    this.syncDetailMonitorsCheckedAll();
    this.cdr.markForCheck();
  }

  pauseDetailMonitor(monitorId: number): void {
    this.modal.confirm({
      nzTitle: this.translateOrFallback('common.confirm.cancel', '确认暂停？'),
      nzOkText: this.translateOrFallback('common.button.ok', '确定'),
      nzCancelText: this.translateOrFallback('common.button.cancel', '取消'),
      nzOkDanger: true,
      nzOkType: 'primary',
      nzClosable: false,
      nzOnOk: () => this.applyDetailMonitorsStatus(new Set([monitorId]), 'pause')
    });
  }

  resumeDetailMonitor(monitorId: number): void {
    this.modal.confirm({
      nzTitle: this.translateOrFallback('common.confirm.enable', '确认恢复？'),
      nzOkText: this.translateOrFallback('common.button.ok', '确定'),
      nzCancelText: this.translateOrFallback('common.button.cancel', '取消'),
      nzOkType: 'primary',
      nzClosable: false,
      nzOnOk: () => this.applyDetailMonitorsStatus(new Set([monitorId]), 'resume')
    });
  }

  pauseSelectedDetailMonitors(): void {
    const selectedIds = this.getSelectedDetailMonitorIdsByPredicate(monitor => monitor.status !== 0);
    if (selectedIds.size === 0) {
      this.notifySvc.warning(this.translateOrFallback('common.notify.no-select-cancel', '当前没有可暂停的监控。'), '');
      return;
    }
    this.modal.confirm({
      nzTitle: this.translateOrFallback('common.confirm.cancel-batch', '确认批量暂停？'),
      nzOkText: this.translateOrFallback('common.button.ok', '确定'),
      nzCancelText: this.translateOrFallback('common.button.cancel', '取消'),
      nzOkDanger: true,
      nzOkType: 'primary',
      nzClosable: false,
      nzOnOk: () => this.applyDetailMonitorsStatus(selectedIds, 'pause')
    });
  }

  resumeSelectedDetailMonitors(): void {
    const selectedIds = this.getSelectedDetailMonitorIdsByPredicate(monitor => monitor.status === 0);
    if (selectedIds.size === 0) {
      this.notifySvc.warning(this.translateOrFallback('common.notify.no-select-enable', '当前没有可恢复的监控。'), '');
      return;
    }
    this.modal.confirm({
      nzTitle: this.translateOrFallback('common.confirm.enable-batch', '确认批量恢复？'),
      nzOkText: this.translateOrFallback('common.button.ok', '确定'),
      nzCancelText: this.translateOrFallback('common.button.cancel', '取消'),
      nzOkType: 'primary',
      nzClosable: false,
      nzOnOk: () => this.applyDetailMonitorsStatus(selectedIds, 'resume')
    });
  }

  private loadEvidenceWorkspacePages(): void {
    this.loadAlertsPage();
    this.loadMonitorsPage();
  }

  private loadAlertsPage(): void {
    if (this.entityId == null) {
      return;
    }
    this.entitySvc
      .getEntityAlerts(this.entityId, this.alertPageIndex - 1, this.alertPageSize, this.alertSeverityFilter, this.alertStatusFilter)
      .subscribe({
        next: message => {
          if (message.code === 0 && message.data != null) {
            this.pagedAlerts = message.data.content || [];
            this.pagedAlertTotal = message.data.totalElements || this.pagedAlerts.length;
            this.alertsLoaded = true;
            this.selectedDetailAlertIds.clear();
            this.detailAlertsCheckedAll = false;
            this.cdr.markForCheck();
          }
        }
      });
  }

  private loadMonitorsPage(): void {
    if (this.entityId == null) {
      return;
    }
    const shouldUseAnomalyFirst = this.monitorWorkbenchDefaultContext && this.monitorAppFilter == null && !this.monitorWorkbenchFallbackToAll;
    const requestedStatus = shouldUseAnomalyFirst ? (this.monitorStatusFilter ?? 2) : this.monitorStatusFilter;
    this.entitySvc
      .getEntityMonitors(
        this.entityId,
        requestedStatus,
        this.monitorAppFilter,
        this.monitorPageIndex - 1,
        this.monitorPageSize
      )
      .subscribe({
        next: message => {
          if (message.code === 0 && message.data != null) {
            if (
              shouldUseAnomalyFirst &&
              requestedStatus === 2 &&
              (message.data.totalElements || 0) === 0 &&
              !this.monitorWorkbenchFallbackToAll
            ) {
              this.monitorWorkbenchFallbackToAll = true;
              this.monitorWorkbenchAutoFallbackEligible = false;
              this.entitySvc
                .getEntityMonitors(this.entityId, null, this.monitorAppFilter, this.monitorPageIndex - 1, this.monitorPageSize)
                .subscribe({
                  next: fallbackMessage => {
                    if (fallbackMessage.code === 0 && fallbackMessage.data != null) {
                      this.pagedMonitors = fallbackMessage.data.content || [];
                      this.pagedMonitorTotal = fallbackMessage.data.totalElements || this.pagedMonitors.length;
                      this.monitorsLoaded = true;
                      this.monitorStatusFilter = null;
                      this.selectedDetailMonitorIds.clear();
                      this.detailMonitorsCheckedAll = false;
                      this.cdr.markForCheck();
                    }
                  }
                });
              return;
            }
            this.monitorWorkbenchFallbackToAll = false;
            this.monitorWorkbenchAutoFallbackEligible = false;
            this.pagedMonitors = message.data.content || [];
            this.pagedMonitorTotal = message.data.totalElements || this.pagedMonitors.length;
            this.monitorsLoaded = true;
            this.selectedDetailMonitorIds.clear();
            this.detailMonitorsCheckedAll = false;
            this.cdr.markForCheck();
          }
        }
      });
  }

  private getDefaultMonitorWorkbenchStatusFilter(): number | null {
    return this.downMonitorCount > 0 ? 2 : null;
  }

  private syncDetailMonitorsCheckedAll(): void {
    this.detailMonitorsCheckedAll =
      this.monitorWorkbenchList.length > 0 && this.monitorWorkbenchList.every(monitor => this.selectedDetailMonitorIds.has(monitor.id));
  }

  private getSelectedDetailMonitorIdsByPredicate(predicate: (monitor: Monitor) => boolean): Set<number> {
    return new Set(
      this.monitorWorkbenchList.filter(monitor => this.selectedDetailMonitorIds.has(monitor.id) && predicate(monitor)).map(monitor => monitor.id)
    );
  }

  private getOpsReadinessSummary(): string {
    const missing: string[] = [];
    if (!this.opsSummary.ownerReady) {
      missing.push(this.translateOrFallback('entity.field.owner', '负责人'));
    }
    if (!this.opsSummary.runbookReady) {
      missing.push(this.translateOrFallback('entity.field.runbook', '处置手册'));
    }
    if (!this.opsSummary.telemetryReady) {
      missing.push(this.translateOrFallback('entity.guide.evidence', '证据'));
    }
    if (!this.opsSummary.relationReady) {
      missing.push(this.translateOrFallback('entity.section.relations', '关系'));
    }
    if (missing.length === 0) {
      return this.i18nSvc.fanyi('entity.detail.ops.ready');
    }
    return `${this.i18nSvc.fanyi('entity.detail.ops.pending')} ${missing.join('、')}`;
  }

  private sortActivitiesByTime<T extends { happenedAt?: string }>(activities: T[]): T[] {
    return [...activities].sort((left, right) => (right.happenedAt || '').localeCompare(left.happenedAt || ''));
  }

  deleteEntity(): void {
    if (this.entity == null) {
      return;
    }
    this.modal.confirm({
      nzTitle: this.i18nSvc.fanyi('entity.delete.confirm'),
      nzContent: `${this.getEntityTitle()} (#${this.entity.id})`,
      nzOkText: this.i18nSvc.fanyi('common.button.ok'),
      nzCancelText: this.i18nSvc.fanyi('common.button.cancel'),
      nzOkDanger: true,
      nzOnOk: () => this.performDelete()
    });
  }

  private performDelete(): void {
    if (this.entityId == null) {
      return;
    }
    this.entitySvc.deleteEntity(this.entityId).subscribe({
      next: message => {
        if (message.code === 0) {
          this.notifySvc.success(this.i18nSvc.fanyi('entity.detail'), message.msg);
          this.router.navigate(['/entities'], { queryParams: this.listQueryParams });
          return;
        }
        this.notifySvc.warning(this.i18nSvc.fanyi('entity.detail'), this.resolveEntityDetailMessage(message.msg));
      },
      error: error => {
        this.notifySvc.error(
          this.i18nSvc.fanyi('entity.detail'),
          this.resolveEntityDetailMessage(error?.msg || error?.message, 'entity.detail.delete.failed')
        );
      }
    });
  }

  private resolveRelationTargets(): void {
    const relationTargetIds = Array.from(
      new Set(this.relations.map(relation => this.getRelationCounterpartId(relation)).filter((value): value is number => value != null))
    );
    if (relationTargetIds.length === 0) {
      this.relationTargetMap = {};
      this.cdr.markForCheck();
      return;
    }
    this.entitySvc.searchEntitiesByIds(relationTargetIds).subscribe({
      next: message => {
        if (message.code !== 0) {
          return;
        }
        const nextMap = { ...this.relationTargetMap };
        (message.data?.content || []).forEach(summary => {
          nextMap[summary.entity.id] = summary.entity;
        });
        this.relationTargetMap = nextMap;
        this.cdr.markForCheck();
      }
    });
  }

  private loadCatalogRailCounts(): void {
    this.entitySvc.searchEntities(undefined, undefined, undefined, undefined, undefined, 0, 200).subscribe({
      next: message => {
        if (message.code !== 0) {
          return;
        }
        const summaries = message.data?.content || [];
        const nextCounts: Record<string, number> = {};
        const owners = new Set<string>();
        summaries.forEach(summary => {
          const type = summary.entity?.type;
          if (type != null && type !== '') {
            nextCounts[type] = (nextCounts[type] || 0) + 1;
          }
          const owner = this.trimText(summary.entity?.owner);
          if (owner != null) {
            owners.add(owner);
          }
        });
        this.catalogGroupCounts = nextCounts;
        this.catalogTotalCount = message.data?.totalElements || summaries.length;
        this.teamCount = owners.size;
        this.cdr.markForCheck();
      }
    });
  }

  trackByAlert(_index: number, alert: SingleAlert): string {
    return `${alert.id || ''}-${alert.gmtCreate || alert.activeAt || alert.startAt || ''}-${alert.content || ''}`;
  }

  trackByDefinitionImportActivity(_index: number, activity: DefinitionImportActivity): string {
    return activity.id;
  }

  trackByGovernanceHistory(_index: number, item: DetailGovernanceHistoryItem): string {
    return item.id;
  }

  trackByLifecycleRecord(_index: number, item: DetailLifecycleRecord): string {
    return item.id;
  }

  trackByCatalogRailItem(_index: number, item: CatalogRailItem): string {
    return item.value;
  }

  trackByChecklistItem(_index: number, item: EntityChecklistItem): string {
    return item.title;
  }

  trackByWorkspaceAction(_index: number, item: DetailWorkspaceAction): string {
    return item.key;
  }

  trackByGovernancePreset(_index: number, preset: EntityDiscoveryGovernancePreset): string {
    return preset.id || preset.name;
  }

  trackByGovernancePolicyCard(_index: number, card: DetailGovernancePolicyCard): string {
    return card.key;
  }

  trackByGovernanceHookCard(_index: number, card: DetailGovernanceHookCard): string {
    return card.key;
  }

  trackByIdentity(_index: number, identity: EntityIdentity): string {
    return `${identity.id || ''}-${identity.identityType}-${identity.identityKey}-${identity.identityValue}`;
  }

  trackByKeyValueEntry(_index: number, item: KeyValueEntry): string {
    return `${item.key}:${item.value}`;
  }

  trackByLogHint(_index: number, hint: EntityLogQueryHint): string {
    return hint.title;
  }

  trackByTraceHint(_index: number, hint: EntityTraceQueryHint): string {
    return `${hint.title}-${hint.traceId || ''}`;
  }

  trackByMonitor(_index: number, monitor: Monitor): number {
    return monitor.id;
  }

  trackByNoiseControlRule(_index: number, rule: EntityNoiseControlRule): string {
    return `${rule.type}:${rule.id || rule.name}`;
  }

  trackByRelation(_index: number, relation: EntityRelation): string {
    return `${relation.id || ''}-${relation.sourceEntityId}-${relation.targetEntityId ?? 'ref'}-${relation.targetRef ?? ''}-${relation.relationType}`;
  }

  trackByString(_index: number, value: string): string {
    return value;
  }

  trackByIndex(index: number): number {
    return index;
  }

  trackByQuery(_index: number, item: { name?: string; query?: string }): string {
    return `${item.name || '-'}:${item.query || '-'}`;
  }

  trackByValue(_index: number, value: string): string {
    return value;
  }

  hasNonEmptyRecord(value?: Record<string, unknown>): boolean {
    return value != null && Object.keys(value).length > 0;
  }

  private syncDerivedState(): void {
    this.labelEntryList = this.labelEntries(this.entity?.labels);
    this.tagList = [...(this.entity?.tags || [])];
    this.primaryIdentityList = this.identities.filter(identity => identity.primaryIdentity);
    this.secondaryIdentityList = this.identities.filter(identity => !identity.primaryIdentity);
    this.outboundRelationList = this.relations.filter(relation => relation.sourceEntityId === this.entityId);
    this.inboundRelationList = this.relations.filter(relation => relation.sourceEntityId !== this.entityId);
    this.checklistItemsCache = this.checklistItems;
  }

  private buildMetadataTags(): string[] {
    if (this.tagList.length > 0) {
      return this.tagList;
    }
    return this.labelEntryList.map(item => `${item.key}:${item.value}`);
  }

  private toDefinitionKind(type?: string): string | undefined {
    const normalized = this.trimText(type);
    switch (normalized) {
      case 'database':
        return 'datastore';
      case 'api':
        return 'api';
      default:
        return normalized;
    }
  }

  private trimText(value?: string | null): string | undefined {
    if (value == null) {
      return undefined;
    }
    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
  }

  private syncWorkspaceContext(queryParams: Record<string, string>): void {
    this.opsWorkspace.setQueryContext({
      route: this.currentRoutePath(),
      params: queryParams
    });
  }

  private syncWorkspaceSelection(): void {
    if (this.entityId == null || this.entity == null) {
      return;
    }
    this.opsWorkspace.setSelectedEntity({
      id: `${this.entityId}`,
      name: this.entity.displayName || this.entity.name,
      type: this.entity.type || 'entity'
    });
  }

  private currentRoutePath(): string {
    return this.router.url.split('?')[0] || `/entities/${this.entityId}`;
  }

  private translateWithParamsOrFallback(key: string, params: Record<string, unknown>, fallback: string): string {
    const translated = this.i18nSvc.fanyi(key, params);
    return translated === key ? fallback : translated;
  }

  private toStructuredPreview(value?: Record<string, unknown>): string {
    if (!this.hasNonEmptyRecord(value)) {
      return '';
    }
    return JSON.stringify(value, null, 2);
  }

  formatInlineList(values?: string[]): string {
    return (values || []).filter(value => this.trimText(value) != null).join(', ');
  }

  private extractListQueryParams(queryParams: Record<string, unknown>): Record<string, string> {
    const nextParams: Record<string, string> = {};
    Object.entries(queryParams || {}).forEach(([key, value]) => {
      if (
        key === 'surface' ||
        key === 'definitionFormat' ||
        key === 'focus' ||
        key === 'responseResultKind' ||
        key === 'responseResultAction' ||
        key === 'responseResultCount' ||
        isGovernancePresetQueryKey(key)
      ) {
        return;
      }
      if (typeof value === 'string') {
        nextParams[key] = value;
      }
    });
    return nextParams;
  }

  private mergeListQueryParams(extra: Record<string, string | undefined>): Record<string, string> {
    const nextParams: Record<string, string> = { ...this.listQueryParams };
    Object.entries(extra).forEach(([key, value]) => {
      const normalized = this.trimText(value);
      if (normalized != null) {
        nextParams[key] = normalized;
      }
    });
    return nextParams;
  }

  private normalizeReason(reason?: string): string | undefined {
    const value = this.trimText(reason);
    if (value == null) {
      return undefined;
    }
    if (value === 'no live evidence bound yet') {
      return this.translateOrFallback('entity.reason.no-evidence', '尚未接入实时证据');
    }
    return value;
  }

  private getRelationReference(relation: EntityRelation): string | undefined {
    const targetRef = this.trimText(relation.targetRef);
    if (targetRef != null) {
      return targetRef;
    }
    if (relation.targetEntityId != null && relation.targetEntityId > 0) {
      return `${relation.targetEntityId}`;
    }
    return undefined;
  }

  private getRelationTypeSummary(relations: EntityRelation[]): string | undefined {
    const counts = new Map<string, number>();
    relations.forEach(relation => {
      counts.set(relation.relationType, (counts.get(relation.relationType) || 0) + 1);
    });
    const segments = Array.from(counts.entries())
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .slice(0, 3)
      .map(([relationType, count]) => `${count} ${this.getRelationTypeLabel(relationType)}`);
    return segments.length > 0 ? segments.join(' · ') : undefined;
  }

  private getRelationSourceSummary(relations: EntityRelation[]): string | undefined {
    const counts = new Map<string, number>();
    relations.forEach(relation => {
      counts.set(relation.relationSource, (counts.get(relation.relationSource) || 0) + 1);
    });
    const segments = Array.from(counts.entries())
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .slice(0, 3)
      .map(([relationSource, count]) => `${count} ${this.getRelationSourceLabel(relationSource)}`);
    return segments.length > 0 ? segments.join(' · ') : undefined;
  }

  private getRelationStatusSummary(relations: EntityRelation[]): string | undefined {
    const counts = new Map<string, number>();
    relations.forEach(relation => {
      counts.set(relation.status, (counts.get(relation.status) || 0) + 1);
    });
    const segments = Array.from(counts.entries())
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .slice(0, 2)
      .map(([status, count]) => `${count} ${this.getRelationStatusLabel(status)}`);
    return segments.length > 0 ? segments.join(' · ') : undefined;
  }

  private getAlertSearchToken(): string | undefined {
    for (const key of ALERT_SEARCH_IDENTITY_KEYS) {
      const value = this.getIdentityValue(key);
      if (value != null) {
        return value;
      }
    }
    for (const alert of this.activeAlerts) {
      for (const key of ALERT_SEARCH_LABEL_KEYS) {
        const value = this.trimText(alert.labels?.[key] || alert.annotations?.[key]);
        if (value != null) {
          return value;
        }
      }
    }
    return this.getFallbackEntitySearchToken();
  }

  private getLogSearchToken(): string | undefined {
    for (const hint of this.logQueryHints) {
      const searchTerm = (hint.searchTerms || []).map(term => this.trimText(term)).find((value): value is string => value != null);
      if (searchTerm != null) {
        return searchTerm;
      }
      const resourceValue = Object.values(hint.resourceFilters || {})
        .map(value => this.trimText(value))
        .find((value): value is string => value != null);
      if (resourceValue != null) {
        return resourceValue;
      }
    }
    for (const key of LOG_SEARCH_IDENTITY_KEYS) {
      const value = this.getIdentityValue(key);
      if (value != null) {
        return value;
      }
    }
    return this.getFallbackEntitySearchToken();
  }

  private getTraceSearchToken(): string | undefined {
    for (const hint of this.traceQueryHints) {
      if (this.trimText(hint.traceId) != null) {
        return this.trimText(hint.traceId);
      }
      const searchTerm = (hint.searchTerms || []).map(term => this.trimText(term)).find((value): value is string => value != null);
      if (searchTerm != null) {
        return searchTerm;
      }
      const resourceValue = Object.values(hint.resourceFilters || {})
        .map(value => this.trimText(value))
        .find((value): value is string => value != null);
      if (resourceValue != null) {
        return resourceValue;
      }
    }
    for (const key of TRACE_SEARCH_IDENTITY_KEYS) {
      const value = this.getIdentityValue(key);
      if (value != null) {
        return value;
      }
    }
    return this.getFallbackEntitySearchToken();
  }

  private getIdentityValue(identityKey: string): string | undefined {
    const identity = this.identities.find(item => item.identityKey === identityKey);
    return this.trimText(identity?.identityValue);
  }

  private getFallbackEntitySearchToken(): string | undefined {
    return this.trimText(this.entity?.name) || this.trimText(this.entity?.displayName);
  }

  private getResponseHandoff(kind: 'alerts' | 'monitors' | 'logs' | 'traces' | 'discovery' | 'editor'): EntityResponseHandoff {
    return this.detail?.responseHandoffs?.[kind] || new EntityResponseHandoff();
  }

  private hydrateResponseResultBanner(queryParams: Record<string, string>): void {
    const kind = this.normalizeResponseResultKind(this.trimText(queryParams['responseResultKind']));
    const action = this.normalizeResponseResultAction(this.trimText(queryParams['responseResultAction']));
    const count = Number(this.trimText(queryParams['responseResultCount']) || '0');
    if (kind == null || action == null || Number.isNaN(count) || count <= 0) {
      this.responseResultBanner = undefined;
      if (this.responseResultDismissTimer) {
        clearTimeout(this.responseResultDismissTimer);
        this.responseResultDismissTimer = undefined;
      }
      return;
    }
    this.responseResultBanner = { kind, action, count };
    if (kind === 'relations') {
      this.activeTabIndex = this.relationsTabIndex;
    }
    if (this.responseResultDismissTimer) {
      clearTimeout(this.responseResultDismissTimer);
    }
    this.responseResultDismissTimer = setTimeout(() => this.dismissResponseResultBanner(), 12000);
  }

  private normalizeResponseResultKind(value?: string): 'alerts' | 'monitors' | 'relations' | undefined {
    switch (value) {
      case 'alerts':
      case 'monitors':
      case 'relations':
        return value;
      default:
        return undefined;
    }
  }

  private normalizeResponseResultAction(
    value?: string
  ): 'resolve' | 'reopen' | 'acknowledge' | 'unacknowledge' | 'pause' | 'resume' | 'silence' | 'inhibit' | 'update' | undefined {
    switch (value) {
      case 'resolve':
      case 'reopen':
      case 'acknowledge':
      case 'unacknowledge':
      case 'pause':
      case 'resume':
      case 'silence':
      case 'inhibit':
      case 'update':
        return value;
      default:
        return undefined;
    }
  }

  private applyDetailAlertsStatus(
    alertIds: Set<number>,
    status: string,
    action: DetailResponseResultBanner['action']
  ): void {
    if (alertIds.size === 0) {
      return;
    }
    this.alertSvc.applyAlertsStatus(alertIds, status).subscribe({
      next: message => {
        if (message.code === 0) {
          this.notifySvc.success(this.translateOrFallback('common.notify.mark-success', '操作成功'), '');
          this.afterDetailAlertResponse(action, alertIds.size);
        } else {
          this.notifySvc.error(this.translateOrFallback('common.notify.mark-fail', '操作失败'), message.msg);
        }
        this.cdr.markForCheck();
      },
      error: error => {
        this.notifySvc.error(
          this.translateOrFallback('common.notify.mark-fail', '操作失败'),
          error?.msg || error?.message || ''
        );
        this.cdr.markForCheck();
      }
    });
  }

  private afterDetailAlertResponse(action: DetailResponseResultBanner['action'], count: number): void {
    if (count <= 0) {
      return;
    }
    this.selectedDetailAlertIds.clear();
    this.detailAlertsCheckedAll = false;
    this.showResponseResultBanner('alerts', action, count);
    this.triageSummary = undefined;
    this.reloadDetailWorkspaceAfterAlertAction();
  }

  private applyDetailMonitorsStatus(monitorIds: Set<number>, action: 'pause' | 'resume'): void {
    if (monitorIds.size === 0) {
      return;
    }
    const request$ =
      action === 'pause' ? this.monitorSvc.cancelManageMonitors(monitorIds) : this.monitorSvc.enableManageMonitors(monitorIds);
    request$.subscribe({
      next: message => {
        if (message.code === 0) {
          this.notifySvc.success(this.translateOrFallback('common.notify.mark-success', '操作成功'), '');
          this.afterDetailMonitorResponse(action, monitorIds.size);
        } else if (message.code === 3) {
          this.notifySvc.warning(this.translateOrFallback('monitor.item.unavailable.refresh', '监控列表已更新，请刷新后重试。'), '');
          this.afterDetailMonitorResponse(action, monitorIds.size);
        } else {
          this.notifySvc.error(this.translateOrFallback('common.notify.mark-fail', '操作失败'), message.msg);
        }
        this.cdr.markForCheck();
      },
      error: error => {
        if (error?.status === 404) {
          this.notifySvc.warning(this.translateOrFallback('monitor.item.unavailable.refresh', '监控列表已更新，请刷新后重试。'), '');
          this.afterDetailMonitorResponse(action, monitorIds.size);
        } else {
          this.notifySvc.error(
            this.translateOrFallback('common.notify.mark-fail', '操作失败'),
            error?.msg || error?.message || ''
          );
        }
        this.cdr.markForCheck();
      }
    });
  }

  private afterDetailMonitorResponse(action: 'pause' | 'resume', count: number): void {
    if (count <= 0) {
      return;
    }
    const shouldPreserveDefaultContext = this.monitorWorkbenchDefaultContext && this.monitorAppFilter == null;
    this.selectedDetailMonitorIds.clear();
    this.detailMonitorsCheckedAll = false;
    this.showResponseResultBanner('monitors', action, count);
    this.triageSummary = undefined;
    this.reloadDetailWorkspaceAfterMonitorAction(shouldPreserveDefaultContext);
  }

  private reloadDetailWorkspaceAfterAlertAction(): void {
    if (this.entityId == null) {
      return;
    }
    this.entitySvc.getEntityDetail(this.entityId).subscribe({
      next: message => {
        if (message.code === 0 && message.data != null) {
          this.detail = message.data;
          this.syncDerivedState();
          this.loadAlertsPage();
          this.loadMonitorsPage();
        } else if (message.msg) {
          this.notifySvc.warning(this.i18nSvc.fanyi('entity.detail'), this.resolveEntityDetailMessage(message.msg));
        }
        this.cdr.markForCheck();
      },
      error: error => {
        this.notifySvc.error(
          this.i18nSvc.fanyi('entity.detail'),
          this.resolveEntityDetailMessage(error?.msg || error?.message, 'entity.detail.load.failed')
        );
        this.cdr.markForCheck();
      }
    });
  }

  private reloadDetailWorkspaceAfterMonitorAction(shouldPreserveDefaultContext: boolean): void {
    if (this.entityId == null) {
      return;
    }
    this.entitySvc.getEntityDetail(this.entityId).subscribe({
      next: message => {
        if (message.code === 0 && message.data != null) {
          this.detail = message.data;
          this.syncDerivedState();
          if (shouldPreserveDefaultContext) {
            this.monitorWorkbenchDefaultContext = true;
            this.monitorWorkbenchFallbackToAll = false;
            this.monitorWorkbenchAutoFallbackEligible = true;
            this.monitorStatusFilter = this.getDefaultMonitorWorkbenchStatusFilter();
          }
          this.loadAlertsPage();
          this.loadMonitorsPage();
        } else if (message.msg) {
          this.notifySvc.warning(this.i18nSvc.fanyi('entity.detail'), this.resolveEntityDetailMessage(message.msg));
        }
        this.cdr.markForCheck();
      },
      error: error => {
        this.notifySvc.error(
          this.i18nSvc.fanyi('entity.detail'),
          this.resolveEntityDetailMessage(error?.msg || error?.message, 'entity.detail.load.failed')
        );
        this.cdr.markForCheck();
      }
    });
  }

  private showResponseResultBanner(
    kind: DetailResponseResultBanner['kind'],
    action: DetailResponseResultBanner['action'],
    count: number
  ): void {
    this.responseResultBanner = { kind, action, count };
    if (this.responseResultDismissTimer) {
      clearTimeout(this.responseResultDismissTimer);
    }
    this.responseResultDismissTimer = setTimeout(() => this.dismissResponseResultBanner(), 12000);
  }

  private syncDetailAlertsCheckedAll(): void {
    this.detailAlertsCheckedAll =
      this.alertWorkbenchList.length > 0 && this.alertWorkbenchList.every(alert => this.selectedDetailAlertIds.has(alert.id));
  }

  private getSelectedDetailAlertStatusCount(status: string): number {
    return this.getSelectedDetailAlertIdsByStatus(status).size;
  }

  private getSelectedDetailAlertIdsByStatus(status: string): Set<number> {
    return new Set(
      this.alertWorkbenchList.filter(alert => alert.status === status && this.selectedDetailAlertIds.has(alert.id)).map(alert => alert.id)
    );
  }

  private openDetailSilenceModal(alerts: SingleAlert[]): void {
    const labels = this.buildSharedAlertLabels(alerts);
    this.detailSilence = new AlertSilence();
    this.detailSilence.enable = true;
    this.detailSilence.matchAll = false;
    this.detailSilence.type = 0;
    this.detailSilence.labels = labels;
    this.detailSilenceSelectionCount = alerts.length;
    this.detailSilence.name = this.buildDetailSilenceName();
    this.detailSilencePreviewLabels = this.mapDetailLabelPreview(labels);
    this.detailSilencePrefillWarning =
      Object.keys(labels).length === 0
        ? this.translateOrFallback(
            'entity.alert.workbench.silence.warning.empty-labels',
            '当前选中的告警没有稳定共用标签，需要手动补充静默条件。'
          )
        : undefined;
    const now = new Date();
    const later = new Date(now.getTime());
    later.setHours(later.getHours() + 6);
    this.detailSilenceDates = [now, later];
    this.detailSilenceDayCheckOptions.forEach(item => (item.checked = true));
    this.isDetailSilenceModalVisible = true;
    this.isDetailSilenceModalOkLoading = false;
  }

  private openDetailInhibitModal(alerts: SingleAlert[]): void {
    const labels = this.buildSharedAlertLabels(alerts);
    this.detailInhibit = new AlertInhibit();
    this.detailInhibit.enable = true;
    this.detailInhibit.name = this.buildDetailInhibitName();
    this.detailInhibit.sourceLabels = { ...labels };
    this.detailInhibit.targetLabels = this.buildDetailInhibitTargetLabels(labels);
    this.detailInhibit.equalLabels = this.buildDetailInhibitEqualLabels(labels);
    this.detailInhibitSelectionCount = alerts.length;
    this.detailInhibitSourcePreviewLabels = this.mapDetailLabelPreview(this.detailInhibit.sourceLabels);
    this.detailInhibitTargetPreviewLabels = this.mapDetailLabelPreview(this.detailInhibit.targetLabels);
    this.detailInhibitPrefillWarning =
      Object.keys(labels).length === 0 || this.detailInhibit.equalLabels.length === 0
        ? this.translateOrFallback(
            'entity.alert.workbench.inhibit.warning.empty-labels',
            '当前选中的告警没有稳定共用标签，需要手动补充抑制条件。'
          )
        : undefined;
    this.isDetailInhibitModalVisible = true;
    this.isDetailInhibitModalOkLoading = false;
  }

  private buildSharedAlertLabels(alerts: SingleAlert[]): Record<string, string> {
    if (alerts.length === 0) {
      return {};
    }
    const initial = alerts[0].labels || {};
    return alerts.slice(1).reduce<Record<string, string>>((intersection, alert) => {
      const nextLabels = alert.labels || {};
      return Object.entries(intersection).reduce<Record<string, string>>((acc, [key, value]) => {
        if (nextLabels[key] === value) {
          acc[key] = value;
        }
        return acc;
      }, {});
    }, { ...initial });
  }

  private buildDetailSilenceName(): string {
    const entityTitle = this.trimText(this.getEntityTitle()) || `entity-${this.entityId}`;
    return `${entityTitle} silence`;
  }

  private buildDetailInhibitName(): string {
    const entityTitle = this.trimText(this.getEntityTitle()) || `entity-${this.entityId}`;
    return `${entityTitle} inhibit`;
  }

  private hasDetailSilenceLabels(): boolean {
    return this.detailSilence.labels != null && Object.keys(this.detailSilence.labels).length > 0;
  }

  private refreshDetailInhibitPreviewState(): void {
    this.detailInhibitSourcePreviewLabels = this.mapDetailLabelPreview(this.detailInhibit.sourceLabels);
    this.detailInhibitTargetPreviewLabels = this.mapDetailLabelPreview(this.detailInhibit.targetLabels);
    this.detailInhibitPrefillWarning =
      !this.hasDetailInhibitLabels(this.detailInhibit.sourceLabels) || !this.hasDetailInhibitEqualLabels()
        ? this.translateOrFallback(
            'entity.alert.workbench.inhibit.warning.empty-labels',
            '当前选中的告警没有稳定共用标签，需要手动补充抑制条件。'
          )
        : undefined;
  }

  private buildDetailInhibitTargetLabels(labels: Record<string, string>): Record<string, string> {
    return Object.entries(labels).reduce<Record<string, string>>((acc, [key, value]) => {
      if (key !== 'severity') {
        acc[key] = value;
      }
      return acc;
    }, {});
  }

  private buildDetailInhibitEqualLabels(labels: Record<string, string>): string[] {
    return Object.keys(labels).filter(key => this.inhibitEqualLabelAllowList.includes(key));
  }

  private hasDetailInhibitLabels(labels?: Record<string, string>): boolean {
    return labels != null && Object.keys(labels).length > 0;
  }

  private hasDetailInhibitEqualLabels(): boolean {
    return (this.detailInhibit.equalLabels || []).length > 0;
  }

  private mapDetailLabelPreview(labels?: Record<string, string>): DetailAlertLabelPreviewItem[] {
    return Object.entries(labels || {}).map(([key, value]) => ({ key, value }));
  }

  getAlertStatusColor(status?: string): string {
    switch ((status || '').toLowerCase()) {
      case 'firing':
        return '#cf1322';
      case 'acknowledged':
        return '#d48806';
      case 'resolved':
        return '#389e0d';
      default:
        return '#8c8c8c';
    }
  }

  getAlertStatusLabel(status?: string): string {
    const normalized = (status || '').toLowerCase();
    if (normalized === 'acknowledged') {
      return this.translateOrFallback('alert.status.acknowledged', '已确认');
    }
    if (normalized === 'resolved') {
      return this.translateOrFallback('alert.status.resolved', '已恢复');
    }
    return this.translateOrFallback('alert.status.firing', '告警中');
  }

  private buildHandoffQueryParams(
    handoff: EntityResponseHandoff,
    extra: Record<string, string | number | undefined | null>
  ): Record<string, string> | undefined {
    const params: Record<string, string> = {};
    if (this.entityId != null) {
      params.entityId = `${this.entityId}`;
    }
    const entityTitle = this.trimText(this.getEntityTitle());
    if (entityTitle != null && entityTitle !== '-') {
      params.entityName = entityTitle;
    }
    Object.assign(params, this.buildReturnQueryParams(handoff));
    Object.assign(params, this.buildCorrelationQueryParams(handoff));
    Object.assign(params, this.buildCodeNavigationQueryParams(handoff.codeNavigationHint));
    Object.entries(extra).forEach(([key, value]) => {
      const normalized = this.normalizeQueryParamValue(value);
      if (normalized != null) {
        params[key] = normalized;
      }
    });
    return Object.keys(params).length > 0 ? params : undefined;
  }

  private buildReturnQueryParams(handoff: EntityResponseHandoff): Record<string, string> {
    const params: Record<string, string> = {};
    const returnTo = this.sanitizeRoutePath(handoff.returnTo) || (this.entityId != null ? `/entities/${this.entityId}` : undefined);
    const returnLabel = this.trimText(handoff.returnLabel) || this.trimText(this.getEntityTitle());
    if (returnTo != null) {
      params.returnTo = returnTo;
    }
    if (returnLabel != null && returnLabel !== '-') {
      params.returnLabel = returnLabel;
    }
    return params;
  }

  private buildCorrelationQueryParams(handoff: EntityResponseHandoff): Record<string, string> {
    return this.compactQueryParams({
      traceId: this.trimText(handoff.traceId),
      spanId: this.trimText(handoff.spanId),
      serviceName: this.trimText(handoff.serviceName),
      serviceNamespace: this.trimText(handoff.serviceNamespace),
      environment: this.trimText(handoff.environment),
      start: this.toMillis(handoff.start),
      end: this.toMillis(handoff.end)
    });
  }

  private buildCodeNavigationQueryParams(hint?: CodeNavigationHint | null): Record<string, string> {
    return this.compactQueryParams({
      codeRepo: this.trimText(hint?.repositoryUrl),
      codeProvider: this.trimText(hint?.provider),
      codePath: this.trimText(hint?.defaultPath),
      codeSearch: this.trimText(hint?.searchQuery),
      codeLabel: this.trimText(hint?.label)
    });
  }

  private compactQueryParams(values: Record<string, string | number | undefined | null>): Record<string, string> {
    return Object.entries(values).reduce<Record<string, string>>((acc, [key, value]) => {
      const normalized = this.normalizeQueryParamValue(value);
      if (normalized != null) {
        acc[key] = normalized;
      }
      return acc;
    }, {});
  }

  private sanitizeRoutePath(value?: string | null): string | undefined {
    const normalized = this.trimText(value);
    if (normalized == null) {
      return undefined;
    }
    const [path] = normalized.split('?');
    const trimmed = path?.trim();
    return trimmed ? trimmed : undefined;
  }

  private normalizeQueryParamValue(value?: string | number | null): string | undefined {
    if (typeof value === 'number') {
      return Number.isFinite(value) && value > 0 ? `${value}` : undefined;
    }
    return this.trimText(value ?? undefined);
  }

  private toMillis(value?: number | string | null): number | undefined {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : undefined;
  }

  private pickFirstText(...values: Array<string | undefined>): string | undefined {
    return values.find(value => value != null);
  }

  private pickFirstNumber(...values: Array<number | undefined>): number | undefined {
    return values.find(value => value != null);
  }

  private openCodeForHandoff(kind: 'monitors' | 'logs' | 'traces'): void {
    const url = this.getCodeNavigationUrlForHandoff(kind);
    if (url == null) {
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  private getCodeNavigationUrlForHandoff(kind: 'monitors' | 'logs' | 'traces'): string | undefined {
    return buildCodeNavigationUrl(this.getPreferredCodeNavigationHint(kind));
  }

  private getPreferredCodeNavigationHint(kind: 'monitors' | 'logs' | 'traces'): CodeNavigationHint | undefined {
    const primary = this.getResponseHandoff(kind).codeNavigationHint || undefined;
    if (primary != null) {
      return primary;
    }
    if (kind === 'logs' || kind === 'traces') {
      const metricsHint = this.getResponseHandoff('monitors').codeNavigationHint || undefined;
      if (metricsHint != null) {
        return metricsHint;
      }
    }
    return undefined;
  }

  private buildNoiseControlManagementQueryParams(ruleType: 'silence' | 'inhibit'): Record<string, string> | undefined {
    const handoff = this.getResponseHandoff('alerts');
    const params = this.buildHandoffQueryParams(handoff, {});
    if (params == null) {
      return undefined;
    }
    params.matchMode = 'entity-noise-controls';
    params.matchingRuleType = ruleType;
    const matchingRuleIds = (ruleType === 'silence' ? this.activeSilenceRules : this.matchingInhibitRules)
      .map(rule => rule.id)
      .filter((id): id is number => typeof id === 'number' && Number.isFinite(id) && id > 0);
    if (matchingRuleIds.length > 0) {
      params.matchingRuleIds = matchingRuleIds.join(',');
    }
    return params;
  }

  private toYaml(value: unknown, indent = 0): string {
    const prefix = '  '.repeat(indent);
    if (Array.isArray(value)) {
      return value
        .map(item => {
          if (item == null || typeof item !== 'object') {
            return `${prefix}- ${this.formatYamlValue(item)}`;
          }
          return `${prefix}-\n${this.toYaml(item, indent + 1)}`;
        })
        .join('\n');
    }
    if (value != null && typeof value === 'object') {
      return Object.entries(value as Record<string, unknown>)
        .map(([key, current]) => {
          if (current == null) {
            return `${prefix}${key}: null`;
          }
          if (typeof current !== 'object') {
            return `${prefix}${key}: ${this.formatYamlValue(current)}`;
          }
          return `${prefix}${key}:\n${this.toYaml(current, indent + 1)}`;
        })
        .join('\n');
    }
    return `${prefix}${this.formatYamlValue(value)}`;
  }

  private formatYamlValue(value: unknown): string {
    if (typeof value === 'string') {
      if (value === '' || /[:#[\]{},"'\n]/.test(value)) {
        return JSON.stringify(value);
      }
      return value;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    if (value == null) {
      return 'null';
    }
    return JSON.stringify(value);
  }
}
