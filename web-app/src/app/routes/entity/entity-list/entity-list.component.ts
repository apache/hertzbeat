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

import { formatDate } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { I18NService } from '@core';
import { ALAIN_I18N_TOKEN, SettingsService } from '@delon/theme';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { forkJoin, of, Subscription } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { Entity } from '../../../pojo/Entity';
import { EntityCatalogSuggestions } from '../../../pojo/EntityCatalogSuggestions';
import { EntityDiscoveryGovernanceActivity, EntityDiscoveryGovernancePreset } from '../../../pojo/EntityDiscoveryGovernance';
import { EntitySummary } from '../../../pojo/EntitySummary';
import { Message } from '../../../pojo/Message';
import { EntityService } from '../../../service/entity.service';
import { renderLabelColor } from '../../../shared/utils/common-util';
import { PlatformFactsStripItem } from '../../../shared/components/platform-facts-strip/platform-facts-strip.component';
import { PlatformRailNavGroup, PlatformRailNavItem } from '../../../shared/components/platform-rail-nav/platform-rail-nav.component';
import { DefinitionImportActivity, DefinitionImportActivityStatus } from '../entity-definition-activity.util';
import { getEntityRailDisplayLabel } from '../entity-rail-label.util';
import {
  buildGovernanceRegistryPolicyPresentation,
  buildGovernanceRecipePresentation,
  buildGovernanceRegistrySignalPresentation,
  GovernanceRecipePriority,
  GovernanceRegistrySignalPresentation,
  requiresGovernanceRegistryRemediation
} from '../entity-governance-recipe.util';
import { buildGovernancePresetQueryParams, readDiscoveryGovernancePresets, writeDiscoveryGovernancePresets } from '../entity-discovery-preset.util';

interface EntityCatalogGroup {
  label: string;
  value?: string;
  icon: string;
  section: 'software' | 'api';
}

interface CatalogLensOption {
  icon: string;
  value: 'ownership' | 'reliability' | 'performance' | 'security' | 'costs' | 'delivery';
}

interface CatalogGovernancePolicyCard {
  key: 'registry' | 'preset' | 'ownership' | 'catalog' | 'telemetry' | 'definition';
  title: string;
  summary: string;
  metric: string;
  actionLabel: string;
  action: 'preset' | 'discovery' | 'definition' | 'registry-refresh' | 'registry-sync' | 'registry-seed';
  preset?: EntityDiscoveryGovernancePreset;
}

interface CatalogGovernanceHookCard {
  key: 'registry' | 'preset' | 'ownership' | 'definition' | 'telemetry';
  title: string;
  metric: string;
  summary: string;
  priority: GovernanceRecipePriority;
  priorityLabel: string;
  nextStep: string;
  actionLabel: string;
  action: 'preset' | 'discovery' | 'definition' | 'registry-refresh' | 'registry-sync' | 'registry-seed';
  preset?: EntityDiscoveryGovernancePreset;
}

interface CatalogGovernanceSnapshotCard {
  key: 'discovery' | 'definition';
  title: string;
  status: 'success' | 'warning' | 'error' | 'info';
  summary: string;
  detail?: string;
  happenedAt?: string;
  actionLabel: string;
  action: 'discovery' | 'definition';
}

interface EntityRowViewModel {
  summary: EntitySummary;
  title: string;
  subtitle?: string;
  kicker: string;
  metadataSummary?: string;
  ownerDisplay: string;
  ownershipContextSummary?: string;
  readinessScore: number;
  readinessLabel: string;
  readinessSummary: string;
  nextActionTitle: string;
  nextActionSummary: string;
  nextActionLabel: string;
  nextActionType: string;
  lastEvidenceAtLabel: string;
  statusColor: string;
  statusIcon: string;
  statusLabel: string;
  statusNarrative: string;
  telemetryContextSummary?: string;
  activeAlertCount: number;
  monitorCount: number;
  identityCount: number;
}

interface CatalogActiveFilterChip {
  key: 'type' | 'status' | 'owner' | 'source' | 'search' | 'environment' | 'lifecycle' | 'tier' | 'system' | 'scope';
  label: string;
  value: string;
}

@Component({
  standalone: false,  selector: 'app-entity-list',
  templateUrl: './entity-list.component.html',
  styleUrls: ['./entity-list.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EntityListComponent implements OnInit, OnDestroy {
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private entitySvc: EntityService,
    private settings: SettingsService,
    private modal: NzModalService,
    private notifySvc: NzNotificationService,
    private cdr: ChangeDetectorRef,
    @Inject(ALAIN_I18N_TOKEN) private i18nSvc: I18NService
  ) {}

  readonly typeOptions: string[] = ['system', 'service', 'host', 'database', 'queue', 'middleware', 'device', 'api', 'endpoint', 'k8s_workload'];
  readonly statusOptions: string[] = ['critical', 'degraded', 'healthy', 'paused', 'unknown'];
  readonly sourceOptions: string[] = ['manual', 'otel_resource', 'derived', 'rule'];
  readonly lifecycleOptions: string[] = ['production', 'staging', 'development', 'experimental', 'deprecated'];
  readonly tierOptions: string[] = ['tier0', 'tier1', 'tier2', 'tier3'];
  readonly catalogGroups: EntityCatalogGroup[] = [
    { label: 'system', value: 'system', icon: 'apartment', section: 'software' },
    { label: 'service', value: 'service', icon: 'deployment-unit', section: 'software' },
    { label: 'host', value: 'host', icon: 'desktop', section: 'software' },
    { label: 'database', value: 'database', icon: 'database', section: 'software' },
    { label: 'queue', value: 'queue', icon: 'unordered-list', section: 'software' },
    { label: 'middleware', value: 'middleware', icon: 'cluster', section: 'software' },
    { label: 'device', value: 'device', icon: 'api', section: 'software' },
    { label: 'k8s_workload', value: 'k8s_workload', icon: 'appstore', section: 'software' },
    { label: 'api', value: 'api', icon: 'branches', section: 'api' },
    { label: 'endpoint', value: 'endpoint', icon: 'global', section: 'api' }
  ];
  readonly lensOptions: CatalogLensOption[] = [
    { value: 'ownership', icon: 'team' },
    { value: 'reliability', icon: 'heart' },
    { value: 'performance', icon: 'line-chart' },
    { value: 'security', icon: 'safety' },
    { value: 'costs', icon: 'wallet' },
    { value: 'delivery', icon: 'deployment-unit' }
  ];
  readonly softwareCatalogGroups = this.catalogGroups.filter(group => group.section === 'software');
  readonly apiCatalogGroups = this.catalogGroups.filter(group => group.section === 'api');

  moduleName = 'Entities';

  type: string | undefined;
  status: string | undefined;
  owner: string | undefined;
  source: string | undefined;
  search: string | undefined;
  lifecycle: string | undefined;
  tier: string | undefined;
  system: string | undefined;
  typeDraft: string | null = null;
  statusDraft: string | null = null;
  ownerDraft = '';
  sourceDraft: string | null = null;
  searchDraft = '';
  lifecycleDraft: string | null = null;
  tierDraft: string | null = null;
  systemDraft = '';
  activeLens: CatalogLensOption['value'] = 'ownership';
  showAdvancedFilters = false;
  scopeMode: 'all' | 'mine' = 'all';
  environment?: string;

  pageIndex = 1;
  pageSize = 12;
  total = 0;
  allEntities: EntitySummary[] = [];
  entities: EntitySummary[] = [];
  entityRows: EntityRowViewModel[] = [];
  tableLoading = true;
  initialLoadCompleted = false;
  catalogCountsLoading = true;
  teamCount = 0;
  catalogTotalCount = 0;
  catalogGroupCounts: Record<string, number> = {};
  catalogSuggestions = new EntityCatalogSuggestions();
  governancePresets: EntityDiscoveryGovernancePreset[] = [];
  governancePresetRegistrySource: 'shared' | 'local' | 'empty' = 'empty';
  governancePresetsMigrated = false;
  serverWorkspaceActivities: DefinitionImportActivity[] = [];
  serverDiscoveryActivities: EntityDiscoveryGovernanceActivity[] = [];
  private searchRequest?: Subscription;

  ngOnInit(): void {
    this.moduleName = this.translateOrFallback('menu.monitor.entities', 'Entities');
    this.syncFiltersFromQueryParams(this.route.snapshot.queryParamMap);
    this.loadDefinitionWorkspaceActivities();
    this.loadSharedDiscoveryActivities();
    this.loadGovernancePresets();
    this.loadCatalogSuggestions();
    this.loadCatalogRailCounts();
    this.loadEntities();
  }

  ngOnDestroy(): void {
    this.searchRequest?.unsubscribe();
  }

  getCatalogRailLabel(groupLabel: string): string {
    return this.getCatalogRailDisplayLabel(groupLabel);
  }

  getCatalogRailTooltip(groupLabel: string): string {
    return this.translateOrFallback('entity.type.' + groupLabel, this.humanize(groupLabel));
  }

  get catalogRailGroups(): PlatformRailNavGroup[] {
    return [
      {
        key: 'teams',
        title: this.translateOrFallback('entity.list.section.teams', '团队'),
        items: [
          {
            key: 'teams',
            label: this.translateOrFallback('entity.list.section.teams', '团队'),
            icon: 'team',
            count: this.catalogCountsLoading ? '—' : this.teamCount,
            static: true
          }
        ]
      },
      {
        key: 'software',
        title: this.translateOrFallback('entity.list.section.software', '软件'),
        items: [
          {
            key: '__all__',
            label: this.translateOrFallback('entity.list.components.all', '全部实体'),
            icon: 'appstore',
            count: this.catalogCountsLoading ? '—' : this.getCatalogGroupCount(),
            active: this.isCatalogGroupActive()
          },
          ...this.softwareCatalogGroups.map(group => ({
            key: group.value || group.label,
            label: this.getCatalogRailLabel(group.label),
            tooltip: this.getCatalogRailTooltip(group.label),
            icon: group.icon,
            count: this.catalogCountsLoading ? '—' : this.getCatalogGroupCount(group.value),
            active: this.isCatalogGroupActive(group.value)
          }))
        ]
      },
      {
        key: 'api',
        title: this.translateOrFallback('entity.list.section.api', 'API'),
        items: this.apiCatalogGroups.map(group => ({
          key: group.value || group.label,
          label: this.getCatalogRailLabel(group.label),
          tooltip: this.getCatalogRailTooltip(group.label),
          icon: group.icon,
          count: this.catalogCountsLoading ? '—' : this.getCatalogGroupCount(group.value),
          active: this.isCatalogGroupActive(group.value)
        }))
      }
    ];
  }

  get resultSummary(): string {
    if (this.tableLoading && !this.initialLoadCompleted) {
      return this.translateOrFallback('common.loading', '加载中');
    }
    const totalLabel = this.translateOrFallback('entity.list.result.total', '个实体');
    if (this.total <= 0) {
      return this.translateOrFallback('entity.empty.list', '暂无实体');
    }
    return `${this.total} ${totalLabel}`;
  }

  get currentPageRangeLabel(): string {
    if (this.total <= 0) {
      return '-';
    }
    const start = (this.pageIndex - 1) * this.pageSize + 1;
    const end = Math.min(this.pageIndex * this.pageSize, this.total);
    return `${start}-${end}`;
  }

  private getCatalogRailDisplayLabel(groupLabel: string): string {
    return getEntityRailDisplayLabel(groupLabel, this.getCatalogRailTooltip(groupLabel));
  }

  get resultRangeSummary(): string {
    if (this.total <= 0) {
      return this.translateOrFallback('entity.list.range.empty', '暂无结果');
    }
    return `${this.translateOrFallback('entity.list.range.showing', '显示')} ${this.currentPageRangeLabel} / ${this.total}`;
  }

  get catalogWorkbenchTitle(): string {
    return this.type == null
      ? this.translateOrFallback('entity.list.console.title', '查看并管理当前实体')
      : this.translateOrFallback('entity.list.console.title.type', `查看${this.selectedCatalogLabel}类型的实体`);
  }

  get catalogWorkbenchCopy(): string {
    return this.type == null
      ? this.translateOrFallback(
          'entity.list.console.copy',
          '先按类型、负责人和状态筛选对象，再进入实体详情、遥测发现或导入定义。'
        )
      : this.translateOrFallback(
          'entity.list.console.copy.type',
          `先查看${this.selectedCatalogLabel}类型的对象，再进入详情或补充相关信息。`
        );
  }

  get catalogCriticalCount(): number {
    return this.getCatalogStatusCount('critical');
  }

  get catalogDegradedCount(): number {
    return this.getCatalogStatusCount('degraded');
  }

  get catalogHealthyCount(): number {
    return this.getCatalogStatusCount('healthy');
  }

  get catalogAlertingCount(): number {
    return this.allEntities.filter(summary => (summary.activeAlertCount || 0) > 0).length;
  }

  get catalogRiskyCount(): number {
    return this.allEntities.filter(summary => ['critical', 'degraded'].includes(summary.status?.status || 'unknown')).length;
  }

  get catalogLogsCount(): number {
    return this.allEntities.filter(summary => this.hasLogEvidence(summary.entity)).length;
  }

  get catalogTraceCount(): number {
    return this.allEntities.filter(summary => this.hasTraceEvidence(summary.entity)).length;
  }

  get catalogConsoleFacts(): PlatformFactsStripItem[] {
    return [
      {
        label: this.translateOrFallback('entity.list.console.total', '对象总数'),
        value: String(this.total)
      },
      {
        label: this.translateOrFallback('entity.list.console.active-alerts', '活跃异常对象'),
        value: String(this.catalogAlertingCount),
        tone: 'critical'
      },
      {
        label: this.translateOrFallback('entity.list.console.risky', '高风险对象'),
        value: String(this.catalogRiskyCount),
        tone: 'warning'
      },
      {
        label: this.translateOrFallback('entity.list.console.logs', '有日志对象'),
        value: String(this.catalogLogsCount),
        tone: 'success'
      },
      {
        label: this.translateOrFallback('entity.list.console.traces', '有链路对象'),
        value: String(this.catalogTraceCount)
      }
    ];
  }

  get activeFilterChips(): CatalogActiveFilterChip[] {
    const chips: CatalogActiveFilterChip[] = [];
    if (this.search) {
      chips.push({
        key: 'search',
        label: this.translateOrFallback('entity.action.search', '搜索'),
        value: this.search
      });
    }
    if (this.environment) {
      chips.push({
        key: 'environment',
        label: this.translateOrFallback('entity.field.environment', '环境'),
        value: this.environment
      });
    }
    if (this.scopeMode === 'mine') {
      chips.push({
        key: 'scope',
        label: this.translateOrFallback('entity.list.context.scope', '范围'),
        value: this.translateOrFallback('entity.list.context.my', '我的实体')
      });
    }
    if (this.type) {
      chips.push({
        key: 'type',
        label: this.translateOrFallback('entity.field.kind', '类型'),
        value: this.translateOrFallback(`entity.type.${this.type}`, this.humanize(this.type))
      });
    }
    if (this.status) {
      chips.push({
        key: 'status',
        label: this.translateOrFallback('entity.field.status', '状态'),
        value: this.translateOrFallback(`entity.status.${this.status}`, this.humanize(this.status))
      });
    }
    if (this.source) {
      chips.push({
        key: 'source',
        label: this.translateOrFallback('entity.field.source', '来源'),
        value: this.translateOrFallback(`entity.source.${this.source}`, this.humanize(this.source))
      });
    }
    if (this.lifecycle) {
      chips.push({
        key: 'lifecycle',
        label: this.translateOrFallback('entity.field.lifecycle', '生命周期'),
        value: this.translateOrFallback(`entity.lifecycle.${this.lifecycle}`, this.humanize(this.lifecycle))
      });
    }
    if (this.tier) {
      chips.push({
        key: 'tier',
        label: this.translateOrFallback('entity.field.tier', '服务层级'),
        value: this.tier.toUpperCase()
      });
    }
    if (this.owner) {
      chips.push({
        key: 'owner',
        label: this.translateOrFallback('entity.field.owner', '负责人'),
        value: this.owner
      });
    }
    if (this.system) {
      chips.push({
        key: 'system',
        label: this.translateOrFallback('entity.field.system', '所属系统'),
        value: this.system
      });
    }
    return chips;
  }

  get selectedCatalogLabel(): string {
    return this.type
      ? this.translateOrFallback(`entity.type.${this.type}`, this.humanize(this.type))
      : this.translateOrFallback('entity.list.components.all', '全部实体');
  }

  get sharedGovernancePresets(): EntityDiscoveryGovernancePreset[] {
    const owner = this.getResolvedOwnerFilter();
    const system = this.trimText(this.system);
    const source = this.trimText(this.source);
    const environment = this.trimText(this.environment);
    const status = this.trimText(this.status);
    return [...this.governancePresets]
      .sort((left, right) => {
        const relevance =
          this.getGovernancePresetRelevance(right, owner, system, source, environment, status) -
          this.getGovernancePresetRelevance(left, owner, system, source, environment, status);
        if (relevance !== 0) {
          return relevance;
        }
        return this.compareStrings(right.updatedAt, left.updatedAt);
      })
      .slice(0, 4);
  }

  get preferredGovernancePreset(): EntityDiscoveryGovernancePreset | undefined {
    return this.sharedGovernancePresets.find(preset => this.isGovernancePresetActive(preset)) || this.sharedGovernancePresets[0];
  }

  get latestPresetWorkspaceActivity(): DefinitionImportActivity | undefined {
    return this.serverWorkspaceActivities.find(activity => this.isGovernancePresetWorkspaceActivity(activity));
  }

  get latestPresetWorkspacePreset(): EntityDiscoveryGovernancePreset | undefined {
    return this.resolveGovernancePresetForActivity(this.latestPresetWorkspaceActivity);
  }

  get latestSharedDiscoveryGovernanceHookActivity(): EntityDiscoveryGovernanceActivity | undefined {
    return this.serverDiscoveryActivities.find(activity => this.isGovernanceHookDiscoveryActivity(activity));
  }

  get latestSharedDefinitionGovernanceHookActivity(): DefinitionImportActivity | undefined {
    return this.serverWorkspaceActivities.find(activity => this.isGovernanceHookWorkspaceActivity(activity));
  }

  get catalogGovernanceSnapshots(): CatalogGovernanceSnapshotCard[] {
    const snapshots: CatalogGovernanceSnapshotCard[] = [];
    const discovery = this.latestSharedDiscoveryGovernanceHookActivity;
    if (discovery != null) {
      snapshots.push({
        key: 'discovery',
        title: this.translateOrFallback('entity.list.snapshot.discovery.title', '最近发现记录'),
        status: discovery.status,
        summary: discovery.summary,
        detail: this.trimText(discovery.detail),
        happenedAt: this.trimText(discovery.happenedAt == null ? undefined : String(discovery.happenedAt)),
        actionLabel: this.translateOrFallback('entity.list.snapshot.discovery.action', '查看发现记录'),
        action: 'discovery'
      });
    }
    const definition = this.latestSharedDefinitionGovernanceHookActivity;
    if (definition != null) {
      snapshots.push({
        key: 'definition',
        title: this.translateOrFallback('entity.list.snapshot.definition.title', '最近定义记录'),
        status: definition.status,
        summary: definition.summary,
        detail: this.trimText(definition.detail),
        happenedAt: this.trimText(definition.happenedAt),
        actionLabel: this.translateOrFallback('entity.list.snapshot.definition.action', '查看定义记录'),
        action: 'definition'
      });
    }
    return snapshots;
  }

  get preferredGovernancePresetConflictCount(): number {
    const preset = this.preferredGovernancePreset;
    if (preset == null) {
      return 0;
    }
    return this.allEntities.filter(summary => this.getGovernancePresetConflictFields(summary.entity, preset).length > 0).length;
  }

  get catalogGovernanceHookCards(): CatalogGovernanceHookCard[] {
    const registrySignal = this.getCatalogRegistrySignal();
    const registryCard: CatalogGovernanceHookCard = {
      key: 'registry',
      title: this.translateOrFallback('entity.governance.registry.signal.title', '共享预设状态'),
      metric: registrySignal.metric,
      summary: registrySignal.summary,
      priority: registrySignal.priority,
      priorityLabel: registrySignal.priorityLabel,
      nextStep: registrySignal.nextStep,
      actionLabel: this.getCatalogRegistryActionLabel(registrySignal),
      action: this.getCatalogRegistryAction(registrySignal)
    };
    const summaries = this.allEntities;
    const total = summaries.length;
    if (total === 0) {
      return [registryCard];
    }
    const preferredPreset = this.preferredGovernancePreset;
    const presetAlignedCount =
      preferredPreset == null ? 0 : summaries.filter(summary => this.getGovernancePresetConflictFields(summary.entity, preferredPreset).length === 0).length;
    const ownershipReadyCount = summaries.filter(
      summary => this.hasOwner(summary.entity) && this.hasRunbook(summary.entity) && this.trimText(summary.entity.system) != null
    ).length;
    const definitionReadyCount = summaries.filter(summary => summary.definitionManaged).length;
    const telemetryReadyCount = summaries.filter(summary => this.hasEvidence(summary)).length;
    const cards: Array<Omit<CatalogGovernanceHookCard, 'priority' | 'priorityLabel' | 'nextStep'>> = [
      {
        key: 'preset',
        title: this.translateOrFallback('entity.list.hooks.preset.title', '共享预设对齐'),
        metric: `${presetAlignedCount}/${total}`,
        summary:
          preferredPreset != null
            ? this.translateOrFallback(
                'entity.list.hooks.preset.copy',
                `${presetAlignedCount} 个实体已经与共享预设 ${preferredPreset.name} 对齐，后续可以直接复用这组默认值。`
              )
            : this.translateOrFallback('entity.list.hooks.preset.empty', '当前范围还没有共享预设，可先保存一组 owner/system/source 组合。'),
        actionLabel: this.translateOrFallback('entity.list.hooks.preset.action', '查看共享预设'),
        action: preferredPreset != null ? 'preset' : 'discovery',
        preset: preferredPreset
      },
      {
        key: 'ownership',
        title: this.translateOrFallback('entity.list.hooks.ownership.title', '归属基线'),
        metric: `${ownershipReadyCount}/${total}`,
        summary: this.translateOrFallback(
          'entity.list.hooks.ownership.copy',
          '负责人、系统和处置手册已经比较完整，后续筛选和处理都会更直接。'
        ),
        actionLabel: this.translateOrFallback('entity.list.hooks.ownership.action', '继续补齐归属'),
        action: 'discovery',
        preset: preferredPreset
      },
      {
        key: 'definition',
        title: this.translateOrFallback('entity.list.hooks.definition.title', '定义状态'),
        metric: `${definitionReadyCount}/${total}`,
        summary: this.translateOrFallback(
          'entity.list.hooks.definition.copy',
          '导入定义里的更新已经同步到共享目录，后续可以继续检查内容是否完整。'
        ),
        actionLabel: this.translateOrFallback('entity.list.hooks.definition.action', '查看导入定义'),
        action: 'definition',
        preset: preferredPreset
      },
      {
        key: 'telemetry',
        title: this.translateOrFallback('entity.list.hooks.telemetry.title', '证据收敛'),
        metric: `${telemetryReadyCount}/${total}`,
        summary: this.translateOrFallback(
          'entity.list.hooks.telemetry.copy',
          '监控、身份和告警入口已经可以一起作为当前实体的证据入口。'
        ),
        actionLabel: this.translateOrFallback('entity.list.hooks.telemetry.action', '查看遥测发现'),
        action: 'discovery',
        preset: preferredPreset
      }
    ];
    return [registryCard, ...cards.map(card => ({
      ...card,
      ...buildGovernanceRecipePresentation(
        card.key,
        (card.key === 'preset' && preferredPreset != null && presetAlignedCount === total)
          || (card.key === 'ownership' && ownershipReadyCount === total)
          || (card.key === 'definition' && definitionReadyCount === total)
          || (card.key === 'telemetry' && telemetryReadyCount === total),
        this.translateOrFallback.bind(this)
      )
    }))];
  }

  get catalogGovernancePolicyCards(): CatalogGovernancePolicyCard[] {
    const summaries = this.allEntities;
    if (summaries.length === 0) {
      return [];
    }
    const registrySignal = this.getCatalogRegistrySignal();
    const missingOwnerCount = summaries.filter(summary => !this.hasOwner(summary.entity)).length;
    const missingRunbookCount = summaries.filter(summary => !this.hasRunbook(summary.entity)).length;
    const missingCatalogCount = summaries.filter(summary => this.isCatalogMetadataIncomplete(summary.entity)).length;
    const missingEvidenceCount = summaries.filter(summary => !this.hasEvidence(summary)).length;
    const cards: CatalogGovernancePolicyCard[] = [];
    if (requiresGovernanceRegistryRemediation(registrySignal)) {
      const registryPolicy = buildGovernanceRegistryPolicyPresentation(registrySignal, this.translateOrFallback.bind(this));
      cards.push({
        key: 'registry',
        title: registryPolicy.title,
        summary: registryPolicy.summary,
        metric: registrySignal.metric,
        actionLabel: this.getCatalogRegistryActionLabel(registrySignal),
        action: this.getCatalogRegistryAction(registrySignal)
      });
    }
    const preferredPreset = this.preferredGovernancePreset;
    const presetConflictCount =
      preferredPreset == null ? 0 : summaries.filter(summary => this.getGovernancePresetConflictFields(summary.entity, preferredPreset).length > 0).length;

    if (preferredPreset != null && presetConflictCount > 0) {
      cards.push({
        key: 'preset',
        title: this.translateOrFallback('entity.list.policy.preset.title', '收紧共享预设偏差'),
        summary: this.translateOrFallback(
          'entity.list.policy.preset.copy',
          `${presetConflictCount} 个实体与共享预设 ${preferredPreset.name} 在负责人、系统、环境或来源上不一致，建议按预设继续治理。`
        ),
        metric: `${presetConflictCount}`,
        actionLabel: this.translateOrFallback('entity.list.policy.preset.action', '查看共享预设'),
        action: 'preset',
        preset: preferredPreset
      });
    }

    if (missingOwnerCount > 0 || missingRunbookCount > 0) {
      cards.push({
        key: 'ownership',
        title: this.translateOrFallback('entity.list.policy.ownership.title', '收紧归属基线'),
        summary: this.translateOrFallback(
          'entity.list.policy.ownership.copy',
          `${missingOwnerCount} 个实体缺负责人，${missingRunbookCount} 个实体缺处置手册，建议先补齐这些基础信息。`
        ),
        metric: `${missingOwnerCount}/${missingRunbookCount}`,
        actionLabel: this.translateOrFallback('entity.list.policy.ownership.action', '去遥测发现'),
        action: 'discovery'
      });
    }

    if (missingCatalogCount > 0) {
      cards.push({
        key: 'catalog',
        title: this.translateOrFallback('entity.list.policy.catalog.title', '补齐目录分层'),
        summary: this.translateOrFallback(
          'entity.list.policy.catalog.copy',
          `${missingCatalogCount} 个实体还缺系统、生命周期或层级，建议先套用治理预设，再回到定义或编辑页补齐。`
        ),
        metric: `${missingCatalogCount}`,
        actionLabel: this.translateOrFallback('entity.list.policy.catalog.action', '从定义继续'),
        action: 'definition'
      });
    }

    if (missingEvidenceCount > 0) {
      cards.push({
        key: 'telemetry',
        title: this.translateOrFallback('entity.list.policy.telemetry.title', '推进证据收敛'),
        summary: this.translateOrFallback(
          'entity.list.policy.telemetry.copy',
          `${missingEvidenceCount} 个实体还没有形成稳定证据入口，建议继续从遥测线索归并监控和身份。`
        ),
        metric: `${missingEvidenceCount}`,
        actionLabel: this.translateOrFallback('entity.list.policy.telemetry.action', '继续发现'),
        action: 'discovery'
      });
    }

    if (cards.length === 0) {
      cards.push({
        key: 'definition',
        title: this.translateOrFallback('entity.list.policy.definition.title', '审阅当前目录基线'),
        summary: this.translateOrFallback(
          'entity.list.policy.definition.copy',
          '当前切片的基础治理项已经比较完整，可以继续审阅模板、定义来源和目录配置块。'
        ),
        metric: this.translateOrFallback('entity.list.policy.definition.metric', '已稳定'),
        actionLabel: this.translateOrFallback('entity.list.policy.definition.action', '查看导入定义'),
        action: 'definition'
      });
    }

    return cards.slice(0, 3);
  }

  get currentUserName(): string | undefined {
    return this.trimText((this.settings.user as { name?: string } | undefined)?.name);
  }

  get showCatalogWelcomeState(): boolean {
    return !this.tableLoading && this.total === 0 && !this.hasNarrowingFilters();
  }

  get catalogWelcomeTitle(): string {
    if (this.type == null) {
      return this.translateOrFallback('entity.list.welcome.title', '还没有实体');
    }
    return this.translateOrFallback('entity.list.welcome.type-title', `当前还没有${this.selectedCatalogLabel}`);
  }

  get catalogWelcomeCopy(): string {
    if (this.type == null) {
      return this.translateOrFallback(
        'entity.list.welcome.copy',
        '先纳管关键对象，再逐步补齐负责人、处置入口和证据关联。'
      );
    }
    return this.translateOrFallback(
      'entity.list.welcome.type-copy',
      `先创建一个${this.selectedCatalogLabel}，再继续补齐负责人、证据和依赖关系。`
    );
  }

  get activeLensTitle(): string {
    switch (this.activeLens) {
      case 'performance':
        return this.translateOrFallback('entity.list.lens.performance.title', '查看实时性能上下文');
      case 'reliability':
        return this.translateOrFallback('entity.list.lens.reliability.title', '掌握可靠性和告警状态');
      case 'security':
        return this.translateOrFallback('entity.list.lens.security.title', '集中查看实体风险线索');
      case 'costs':
        return this.translateOrFallback('entity.list.lens.costs.title', '按实体理解资源和投入');
      case 'delivery':
        return this.translateOrFallback('entity.list.lens.delivery.title', '串起发布和交付上下文');
      default:
        return this.translateOrFallback('entity.list.lens.ownership.title', '集中管理实体归属信息');
    }
  }

  get activeLensBullets(): string[] {
    switch (this.activeLens) {
      case 'performance':
        return [
          this.translateOrFallback('entity.list.lens.performance.1', '对比核心指标、错误率和延迟变化。'),
          this.translateOrFallback('entity.list.lens.performance.2', '查看实体运行在哪些主机、工作负载或依赖上。'),
          this.translateOrFallback('entity.list.lens.performance.3', '把告警、日志和监控覆盖一起放到同一个实体上下文。')
        ];
      case 'reliability':
        return [
          this.translateOrFallback('entity.list.lens.reliability.1', '快速判断哪些实体处于异常、降级或未知状态。'),
          this.translateOrFallback('entity.list.lens.reliability.2', '把活跃告警和监控异常收敛到实体级视图。'),
          this.translateOrFallback('entity.list.lens.reliability.3', '让排障入口从告警列表切到实体详情。')
        ];
      case 'security':
        return [
          this.translateOrFallback('entity.list.lens.security.1', '按实体整理关键标签、边界和负责人。'),
          this.translateOrFallback('entity.list.lens.security.2', '给后续安全、合规和暴露面能力预留统一目录入口。'),
          this.translateOrFallback('entity.list.lens.security.3', '避免同一对象在监控、日志和目录里出现多份身份。')
        ];
      case 'costs':
        return [
          this.translateOrFallback('entity.list.lens.costs.1', '围绕服务、数据库和主机整理资源归属。'),
          this.translateOrFallback('entity.list.lens.costs.2', '为后续成本、容量和资源优化能力打底。'),
          this.translateOrFallback('entity.list.lens.costs.3', '让负责人能从实体视角看到投入和影响范围。')
        ];
      case 'delivery':
        return [
          this.translateOrFallback('entity.list.lens.delivery.1', '把实体和发布、部署、流水线逐步关联起来。'),
          this.translateOrFallback('entity.list.lens.delivery.2', '在实体上下文里补齐运行手册、关系和变更线索。'),
          this.translateOrFallback('entity.list.lens.delivery.3', '为后续 Incident、Deployment 和 SLO 能力预留挂点。')
        ];
      default:
        return [
          this.translateOrFallback('entity.list.lens.ownership.1', '识别谁负责这个服务、主机或数据库。'),
          this.translateOrFallback('entity.list.lens.ownership.2', '统一整理运行手册、关键标签和处置入口。'),
          this.translateOrFallback('entity.list.lens.ownership.3', '让告警、日志和监控都能回到同一个实体归属上。')
        ];
    }
  }

  get activeLensSummary(): string {
    switch (this.activeLens) {
      case 'performance':
        return this.translateOrFallback('entity.list.view.summary.performance', '按遥测和重要级别优先展示');
      case 'reliability':
        return this.translateOrFallback('entity.list.view.summary.reliability', '优先查看异常、降级和告警较多的实体');
      case 'security':
        return this.translateOrFallback('entity.list.view.summary.security', '优先查看归属不完整或风险更高的实体');
      case 'costs':
        return this.translateOrFallback('entity.list.view.summary.costs', '优先查看更重的资源类型和环境分布');
      case 'delivery':
        return this.translateOrFallback('entity.list.view.summary.delivery', '优先查看有处置手册和交付上下文的实体');
      default:
        return this.translateOrFallback('entity.list.view.summary.ownership', '优先查看缺少负责人或处置手册的实体');
    }
  }

  get activeLensIcon(): string {
    return this.lensOptions.find(item => item.value === this.activeLens)?.icon || 'team';
  }

  get environmentOptions(): string[] {
    return Array.from(
      new Set(
        [...this.catalogSuggestions.environments, ...this.allEntities.map(summary => this.trimText(summary.entity.environment))]
          .filter((value): value is string => value != null)
      )
    ).sort((left, right) => left.localeCompare(right));
  }

  getCatalogStatusCount(status: string): number {
    return this.allEntities.filter(summary => summary.status?.status === status).length;
  }

  loadEntities(): void {
    this.searchRequest?.unsubscribe();
    this.tableLoading = true;
    this.searchRequest = this.entitySvc
      .searchEntities(
        this.type,
        this.status,
        this.getResolvedOwnerFilter(),
        this.source,
        this.search,
        0,
        200,
        undefined,
        undefined,
        this.environment,
        this.lifecycle,
        this.tier,
        this.system
      )
      .subscribe({
        next: message => {
          this.tableLoading = false;
          this.initialLoadCompleted = true;
          if (message.code === 0) {
            const page = message.data;
            this.allEntities = page.content || [];
            this.applyEntityView();
          } else {
            this.notifySvc.warning(this.translateOrFallback('entity.list', 'Entities'), message.msg);
          }
          this.cdr.markForCheck();
        },
        error: error => {
          this.tableLoading = false;
          this.initialLoadCompleted = true;
          this.notifySvc.error(this.translateOrFallback('entity.list', 'Entities'), error?.msg || error?.message || 'Load failed');
          this.cdr.markForCheck();
        }
      });
  }

  onFilterChange(resetPage = true): void {
    if (resetPage) {
      this.pageIndex = 1;
    }
    this.syncUrlWithFilters();
    this.loadEntities();
  }

  onPageIndexChange(pageIndex: number): void {
    this.pageIndex = pageIndex;
    this.syncUrlWithFilters();
    this.applyEntityView();
  }

  onPageSizeChange(pageSize: number): void {
    this.pageSize = pageSize;
    this.pageIndex = 1;
    this.syncUrlWithFilters();
    this.applyEntityView();
  }

  createEntity(source: 'manual' | 'telemetry' | 'definition' = 'manual'): void {
    this.createEntityWithGovernancePreset(source, this.preferredGovernancePreset);
  }

  createEntityWithGovernancePreset(
    source: 'manual' | 'telemetry' | 'definition' = 'manual',
    preset?: EntityDiscoveryGovernancePreset
  ): void {
    const queryParams: Record<string, string | number> = {
      ...this.currentQueryParams,
      ...buildGovernancePresetQueryParams(preset)
    };
    if (this.type != null) {
      queryParams.type = this.type;
    }
    if (source === 'telemetry') {
      queryParams.entrySource = 'telemetry';
    }
    if (source === 'definition') {
      queryParams.entrySource = 'definition';
      queryParams.surface = 'yaml';
      queryParams.definitionFormat = 'yaml';
    }
    this.router.navigate(['/entities', 'new'], { queryParams });
  }

  openTelemetryDiscovery(): void {
    const query = this.trimText(this.searchDraft);
    const queryParams: Record<string, string | number> = {};
    if (query != null) {
      queryParams.query = query;
    }
    this.router.navigate(['/entities', 'discovery'], { queryParams });
  }

  applyGovernancePresetToCatalog(preset: EntityDiscoveryGovernancePreset): void {
    this.owner = this.trimText(preset.owner);
    this.ownerDraft = this.owner || '';
    this.system = this.trimText(preset.system);
    this.systemDraft = this.system || '';
    this.source = this.trimText(preset.source);
    this.sourceDraft = this.source || null;
    this.environment = this.trimText(preset.environment);
    this.status = this.trimText(preset.status);
    this.statusDraft = this.status || null;
    this.showAdvancedFilters = this.source != null || this.status != null || this.system != null || this.owner != null;
    this.pageIndex = 1;
    this.syncUrlWithFilters();
    this.loadEntities();
  }

  openGovernancePresetDiscovery(preset?: EntityDiscoveryGovernancePreset, remedy?: 'preset' | 'ownership' | 'definition' | 'telemetry'): void {
    const queryParams: Record<string, string | number> = preset != null ? buildGovernancePresetQueryParams(preset) : {};
    const query = this.trimText(this.searchDraft) || this.trimText(this.search);
    if (query != null) {
      queryParams.query = query;
    }
    if (preset != null) {
      if (this.trimText(preset.owner) != null) {
        queryParams.owner = preset.owner!.trim();
      }
      if (this.trimText(preset.system) != null) {
        queryParams.system = preset.system!.trim();
      }
      if (this.trimText(preset.source) != null) {
        queryParams.source = preset.source!.trim();
      }
      if (this.trimText(preset.environment) != null) {
        queryParams.environment = preset.environment!.trim();
      }
      if (this.trimText(preset.status) != null) {
        queryParams.status = preset.status!.trim();
      }
    } else {
      if (this.getResolvedOwnerFilter() != null) {
        queryParams.owner = this.getResolvedOwnerFilter()!;
      }
      if (this.system != null) {
        queryParams.system = this.system;
      }
      if (this.source != null) {
        queryParams.source = this.source;
      }
      if (this.environment != null) {
        queryParams.environment = this.environment;
      }
      if (this.status != null) {
        queryParams.status = this.status;
      }
    }
    if (remedy != null) {
      queryParams.remedy = remedy;
    }
    this.router.navigate(['/entities', 'discovery'], { queryParams });
  }

  runCatalogGovernancePolicy(card: CatalogGovernancePolicyCard): void {
    if (card.action === 'registry-refresh') {
      this.refreshGovernancePresetRegistry();
      return;
    }
    if (card.action === 'registry-sync') {
      this.syncGovernancePresetRegistry();
      return;
    }
    if (card.action === 'registry-seed') {
      this.openGovernancePresetDiscovery();
      return;
    }
    if (card.action === 'preset' && card.preset != null) {
      this.openGovernancePresetDiscovery(card.preset);
      return;
    }
    if (card.action === 'definition') {
      this.openDefinitionImport(this.preferredGovernancePreset);
      return;
    }
    this.openGovernancePresetDiscovery();
  }

  runCatalogGovernanceHook(card: CatalogGovernanceHookCard): void {
    if (card.action === 'registry-refresh') {
      this.refreshGovernancePresetRegistry();
      return;
    }
    if (card.action === 'registry-sync') {
      this.syncGovernancePresetRegistry();
      return;
    }
    if (card.action === 'registry-seed') {
      this.openGovernancePresetDiscovery();
      return;
    }
    if (card.action === 'preset' && card.preset != null) {
      this.openGovernancePresetDiscovery(card.preset);
      return;
    }
    if (card.action === 'definition') {
      this.openDefinitionImport(card.preset);
      return;
    }
    this.openGovernancePresetDiscovery(card.preset);
  }

  runCatalogGovernanceSnapshot(card: CatalogGovernanceSnapshotCard): void {
    if (card.action === 'definition') {
      this.openDefinitionImport(this.preferredGovernancePreset, 'ownership');
      return;
    }
    this.openGovernancePresetDiscovery(this.preferredGovernancePreset, 'ownership');
  }

  getCatalogGovernanceSnapshotMeta(card: CatalogGovernanceSnapshotCard): string | undefined {
    const sourceLabel =
      card.key === 'definition'
        ? this.translateOrFallback('entity.list.snapshot.definition.meta', '定义记录')
        : this.translateOrFallback('entity.list.snapshot.discovery.meta', '发现记录');
    const statusLabel = this.getCatalogGovernanceSnapshotStatusLabel(card.status);
    const segments = [sourceLabel, statusLabel, this.trimText(card.happenedAt)].filter((value): value is string => value != null);
    return segments.length > 0 ? segments.join(' · ') : undefined;
  }

  isGovernancePresetActive(preset: EntityDiscoveryGovernancePreset): boolean {
    return (
      this.trimText(preset.owner) === this.getResolvedOwnerFilter() &&
      this.trimText(preset.system) === this.trimText(this.system) &&
      this.trimText(preset.source) === this.trimText(this.source) &&
      this.trimText(preset.environment) === this.trimText(this.environment) &&
      this.trimText(preset.status) === this.trimText(this.status)
    );
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
      return [...filters, ...overrides].join(' · ') || this.translateOrFallback('entity.discovery.preset.summary.empty', '仅保存了当前入口');
  }

  getLatestPresetWorkspaceActivitySummary(activity: DefinitionImportActivity | undefined): string | undefined {
    if (activity == null) {
      return undefined;
    }
    const detail = this.trimText(activity.detail);
    if (detail != null) {
      return `${activity.summary} · ${detail}`;
    }
    return activity.summary;
  }

  getLatestPresetWorkspaceActivityMeta(activity: DefinitionImportActivity | undefined): string | undefined {
    if (activity == null) {
      return undefined;
    }
    const segments = [
      this.resolveGovernancePresetForActivity(activity)?.name,
      this.trimText(activity.entityName),
      this.trimText(activity.happenedAt)
    ].filter((value): value is string => value != null);
    return segments.length > 0 ? segments.join(' · ') : undefined;
  }

  continueLatestPresetWorkspaceActivity(): void {
    const activity = this.latestPresetWorkspaceActivity;
    if (activity == null) {
      this.openGovernancePresetDiscovery();
      return;
    }
    const preset = this.resolveGovernancePresetForActivity(activity);
    if (preset != null) {
      this.openGovernancePresetDiscovery(preset);
      return;
    }
    if (activity.entityId != null) {
      this.viewEntity(activity.entityId);
      return;
    }
    this.openGovernancePresetDiscovery();
  }

  viewLatestPresetWorkspaceEntity(): void {
    if (this.latestPresetWorkspaceActivity?.entityId != null) {
      this.viewEntity(this.latestPresetWorkspaceActivity.entityId);
      return;
    }
    this.continueLatestPresetWorkspaceActivity();
  }

  trackByGovernanceSnapshotCard(_index: number, item: CatalogGovernanceSnapshotCard): string {
    return `${item.key}:${item.happenedAt || item.summary}`;
  }

  openDefinitionImport(preset?: EntityDiscoveryGovernancePreset, remedy?: 'preset' | 'ownership' | 'definition' | 'telemetry'): void {
    this.router.navigate(['/entities', 'import'], {
      queryParams: {
        format: 'yaml',
        remedy: remedy || null,
        ...buildGovernancePresetQueryParams(preset)
      }
    });
  }

  clearFilters(): void {
    this.type = undefined;
    this.status = undefined;
    this.owner = undefined;
    this.source = undefined;
    this.search = undefined;
    this.environment = undefined;
    this.lifecycle = undefined;
    this.tier = undefined;
    this.system = undefined;
    this.scopeMode = 'all';
    this.typeDraft = null;
    this.statusDraft = null;
    this.ownerDraft = '';
    this.sourceDraft = null;
    this.searchDraft = '';
    this.lifecycleDraft = null;
    this.tierDraft = null;
    this.systemDraft = '';
    this.showAdvancedFilters = false;
    this.pageIndex = 1;
    this.syncUrlWithFilters();
    this.loadEntities();
  }

  applyCatalogFilters(): void {
    this.type = this.readDraftValue(this.typeDraft);
    this.status = this.readDraftValue(this.statusDraft);
    this.owner = this.trimText(this.ownerDraft);
    this.source = this.readDraftValue(this.sourceDraft);
    this.lifecycle = this.readDraftValue(this.lifecycleDraft);
    this.tier = this.readDraftValue(this.tierDraft);
    this.system = this.trimText(this.systemDraft);
    this.onFilterChange();
  }

  applySearchFilter(): void {
    this.search = this.trimText(this.searchDraft);
    this.onFilterChange();
  }

  clearSearchFilter(): void {
    this.searchDraft = '';
    if (this.search == null) {
      return;
    }
    this.search = undefined;
    this.onFilterChange();
  }

  clearOwnerFilter(): void {
    this.ownerDraft = '';
    if (this.owner == null) {
      return;
    }
    this.owner = undefined;
    this.onFilterChange();
  }

  clearSystemFilter(): void {
    this.systemDraft = '';
    if (this.system == null) {
      return;
    }
    this.system = undefined;
    this.onFilterChange();
  }

  clearActiveFilter(key: CatalogActiveFilterChip['key']): void {
    switch (key) {
      case 'search':
        this.clearSearchFilter();
        break;
      case 'environment':
        this.selectEnvironment(null);
        break;
      case 'scope':
        if (this.scopeMode === 'mine') {
          this.toggleMyScope();
        }
        break;
      case 'type':
        this.selectCatalogGroup(undefined);
        break;
      case 'status':
        this.onStatusDraftChange(null);
        break;
      case 'source':
        this.onSourceDraftChange(null);
        break;
      case 'lifecycle':
        this.onLifecycleDraftChange(null);
        break;
      case 'tier':
        this.onTierDraftChange(null);
        break;
      case 'owner':
        this.clearOwnerFilter();
        break;
      case 'system':
        this.clearSystemFilter();
        break;
      default:
        break;
    }
  }

  setActiveLens(lens: CatalogLensOption['value']): void {
    this.activeLens = lens;
    this.pageIndex = 1;
    this.applyEntityView();
  }

  onStatusDraftChange(status?: string | null): void {
    this.statusDraft = status || null;
  }

  onSourceDraftChange(source?: string | null): void {
    this.sourceDraft = source || null;
  }

  onLifecycleDraftChange(lifecycle?: string | null): void {
    this.lifecycleDraft = lifecycle || null;
  }

  onTierDraftChange(tier?: string | null): void {
    this.tierDraft = tier || null;
  }

  onOwnerDraftChange(owner?: string | null): void {
    this.ownerDraft = owner ?? '';
  }

  onSystemDraftChange(system?: string | null): void {
    this.systemDraft = system ?? '';
  }

  toggleAdvancedFilters(): void {
    this.showAdvancedFilters = !this.showAdvancedFilters;
  }

  toggleMyScope(): void {
    if (this.currentUserName == null) {
      return;
    }
    this.scopeMode = this.scopeMode === 'mine' ? 'all' : 'mine';
    this.pageIndex = 1;
    this.syncUrlWithFilters();
    this.loadEntities();
  }

  selectEnvironment(environment?: string | null): void {
    this.environment = this.trimText(environment || undefined);
    this.pageIndex = 1;
    this.syncUrlWithFilters();
    this.applyEntityView();
  }

  selectCatalogGroup(type?: string): void {
    if ((type || undefined) === this.type && !this.tableLoading) {
      return;
    }
    this.type = type;
    this.typeDraft = type || null;
    this.pageIndex = 1;
    this.syncUrlWithFilters();
    this.loadEntities();
  }

  isCatalogGroupActive(type?: string): boolean {
    return (type || undefined) === this.type;
  }

  getCatalogGroupCount(type?: string): number {
    if (!type) {
      return this.catalogTotalCount;
    }
    return this.catalogGroupCounts[type] || 0;
  }

  onCatalogRailItemSelected(item: PlatformRailNavItem): void {
    if (item.key === '__all__') {
      this.selectCatalogGroup(undefined);
      return;
    }
    this.selectCatalogGroup(item.key);
  }

  trackByCatalogActiveFilter(_index: number, chip: CatalogActiveFilterChip): string {
    return `${chip.key}:${chip.value}`;
  }

  viewEntity(entityId: number): void {
    this.router.navigate(['/entities', entityId], { queryParams: this.currentQueryParams });
  }

  openEntityLogs(summary: EntitySummary): void {
    this.router.navigate(['/log/manage'], {
      queryParams: this.buildEntityWorkbenchQueryParams(summary.entity, 'entity-catalog', this.translateOrFallback('menu.log.manage', '日志工作台'))
    });
  }

  openEntityTraces(summary: EntitySummary): void {
    this.router.navigate(['/trace/manage'], {
      queryParams: this.buildEntityWorkbenchQueryParams(summary.entity, 'entity-catalog', this.translateOrFallback('menu.trace.manage', '链路工作台'))
    });
  }

  openEntityMetrics(summary: EntitySummary): void {
    this.router.navigate(['/ingestion/otlp/metrics'], {
      queryParams: this.buildEntityWorkbenchQueryParams(summary.entity, 'entity-catalog', this.translateOrFallback('menu.ingestion.metrics', '指标工作台'))
    });
  }

  openEntityAlerts(summary: EntitySummary): void {
    this.router.navigate(['/entities', summary.entity.id], {
      queryParams: this.currentQueryParams,
      fragment: 'alerts'
    });
  }

  editEntity(entityId: number): void {
    this.router.navigate(['/entities', entityId, 'edit'], { queryParams: this.currentQueryParams });
  }

  openEntityPresetDrilldown(summary: EntitySummary): void {
    const presetActivity = this.getLatestPresetWorkspaceActivityForEntity(summary.entity.id);
    const preset = this.resolveGovernancePresetForActivity(presetActivity) || this.preferredGovernancePreset;
    if (preset == null) {
      this.editEntity(summary.entity.id);
      return;
    }
    const conflictFields = this.getGovernancePresetConflictFields(summary.entity, preset);
    if (conflictFields.length === 0) {
      this.openGovernancePresetDiscovery(preset);
      return;
    }
    this.router.navigate(['/entities', summary.entity.id, 'edit'], {
      queryParams: {
        ...this.currentQueryParams,
        ...buildGovernancePresetQueryParams(preset),
        focus: this.resolveGovernanceConflictFocus(conflictFields[0])
      }
    });
  }

  editEntityDefinition(entityId: number): void {
    this.router.navigate(['/entities', entityId, 'definition'], { queryParams: this.currentQueryParams });
  }

  runEntityLifecycleAction(summary: EntitySummary): void {
    const registrySignal = this.getCatalogRegistrySignal();
    const lifecycleAction = this.getLifecycleAction(summary, registrySignal);
    switch (lifecycleAction.key) {
      case 'registry-refresh':
        this.refreshGovernancePresetRegistry();
        return;
      case 'registry-sync':
        this.syncGovernancePresetRegistry();
        return;
      case 'registry-seed':
        this.openGovernancePresetDiscovery();
        return;
      default:
        break;
    }
    const presetActivity = this.getLatestPresetWorkspaceActivityForEntity(summary.entity.id);
    if (presetActivity != null) {
      this.openPresetGovernanceWorkflow(summary, presetActivity);
      return;
    }

    if (summary.definitionManaged) {
      this.editEntityDefinition(summary.entity.id);
      return;
    }

    if (summary.entity.source != null && summary.entity.source !== 'manual') {
      this.router.navigate(['/entities', 'discovery'], {
        queryParams: {
          ...this.currentQueryParams,
          query: this.getEntityLifecycleSearchToken(summary.entity),
          owner: this.trimText(summary.entity.owner),
          system: this.trimText(summary.entity.system),
          environment: this.trimText(summary.entity.environment),
          source: this.trimText(summary.entity.source)
        }
      });
      return;
    }

    this.editEntity(summary.entity.id);
  }

  runEntityNextAction(summary: EntitySummary): void {
    const nextAction = this.getRowNextAction(summary);
    switch (nextAction.actionType) {
      case 'review_alerts':
        this.router.navigate(['/entities', summary.entity.id], {
          queryParams: this.currentQueryParams,
          fragment: 'alerts'
        });
        return;
      case 'complete_owner':
      case 'complete_runbook':
        this.router.navigate(['/entities', summary.entity.id, 'edit'], {
          queryParams: {
            ...this.currentQueryParams,
            focus: 'ownership'
          }
        });
        return;
      case 'bind_monitor':
        this.router.navigate(['/entities', summary.entity.id, 'edit'], {
          queryParams: {
            ...this.currentQueryParams,
            focus: 'monitors'
          }
        });
        return;
      case 'review_relations':
        this.router.navigate(['/entities', summary.entity.id, 'edit'], {
          queryParams: {
            ...this.currentQueryParams,
            focus: 'relations'
          }
        });
        return;
      case 'open_discovery':
        this.router.navigate(['/entities', 'discovery'], {
          queryParams: {
            ...this.currentQueryParams,
            query: this.getEntityLifecycleSearchToken(summary.entity),
            owner: this.trimText(summary.entity.owner),
            system: this.trimText(summary.entity.system),
            environment: this.trimText(summary.entity.environment),
            source: this.trimText(summary.entity.source)
          }
        });
        return;
      case 'inspect_logs':
      default:
        this.viewEntity(summary.entity.id);
    }
  }

  deleteEntity(summary: EntitySummary): void {
    const entityTitle = this.getEntityTitle(summary.entity);
    this.modal.confirm({
      nzTitle: this.translateOrFallback('entity.delete.confirm', 'Delete this entity?'),
      nzContent: `${entityTitle} (#${summary.entity.id})`,
      nzOkText: this.translateOrFallback('common.button.ok', 'OK'),
      nzCancelText: this.translateOrFallback('common.button.cancel', 'Cancel'),
      nzOkDanger: true,
      nzOnOk: () => this.performDelete(summary.entity.id)
    });
  }

  getEntityTitle(entity?: Entity): string {
    if (entity == null) {
      return '-';
    }
    return entity.displayName || entity.name;
  }

  getEntitySubtitle(entity?: Entity): string | undefined {
    if (entity == null || !entity.displayName || entity.displayName === entity.name) {
      return undefined;
    }
    return entity.name;
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

  getOwnerDisplay(owner?: string): string {
    return owner || this.translateOrFallback('entity.owner.unassigned', 'Unassigned');
  }

  hasOwner(entity?: Entity): boolean {
    return this.trimText(entity?.owner) != null;
  }

  hasRunbook(entity?: Entity): boolean {
    return this.trimText(entity?.runbook) != null;
  }

  hasEvidence(summary: EntitySummary): boolean {
    return summary.monitorCount > 0 || summary.identityCount > 0 || summary.activeAlertCount > 0;
  }

  getCatalogCompleteness(summary: EntitySummary): number {
    const checks = [
      this.hasOwner(summary.entity),
      this.hasRunbook(summary.entity),
      this.hasEvidence(summary),
      summary.relationCount > 0 || this.trimText(summary.entity.description) != null
    ];
    const completed = checks.filter(Boolean).length;
    return Math.round((completed / checks.length) * 100);
  }

  getCatalogCompletenessColor(summary: EntitySummary): string {
    const completeness = this.getCatalogCompleteness(summary);
    if (completeness >= 100) {
      return '#389e0d';
    }
    if (completeness >= 50) {
      return '#1677ff';
    }
    return '#d48806';
  }

  getCatalogCompletenessLabel(summary: EntitySummary): string {
    const completeness = this.getCatalogCompleteness(summary);
    if (completeness >= 100) {
      return this.translateOrFallback('entity.catalog.ready', 'Ready');
    }
    if (completeness >= 50) {
      return this.translateOrFallback('entity.catalog.partial', 'In Progress');
    }
    return this.translateOrFallback('entity.catalog.draft', 'Needs Metadata');
  }

  getStatusNarrative(summary: EntitySummary): string {
    const normalizedReason = this.normalizeReason(summary.status?.reason);
    if (normalizedReason != null) {
      return normalizedReason;
    }
    if (summary.status?.monitorDownCount > 0) {
      return this.translateOrFallback('entity.list.narrative.monitor-down', `${summary.status.monitorDownCount} monitors are down`);
    }
    if (summary.activeAlertCount > 0) {
      return this.translateOrFallback('entity.list.narrative.active-alerts', `${summary.activeAlertCount} active alerts need attention`);
    }
    if (summary.monitorCount > 0) {
      return this.translateOrFallback('entity.list.narrative.evidence-ready', 'Evidence is already linked to this entity.');
    }
    return this.translateOrFallback('entity.list.narrative.metadata-first', 'Start by assigning owner, runbook, and telemetry identity.');
  }

  getLastEvidenceAtLabel(summary: EntitySummary): string {
    const timestamp = summary.lastEvidenceAt || summary.entity.gmtUpdate || summary.entity.gmtCreate;
    if (timestamp == null) {
      return '-';
    }
    return formatDate(timestamp, 'yyyy-MM-dd HH:mm', 'en-US');
  }

  getReadinessHeadline(summary: EntitySummary): string {
    if ((summary.opsSummary?.readinessScore || 0) >= 100) {
      return this.translateOrFallback('entity.detail.ops.ready', '当前已就绪');
    }
    return this.translateOrFallback('entity.detail.ops.pending', '待补齐');
  }

  getReadinessSummary(summary: EntitySummary): string {
    const missing: string[] = [];
    if (!summary.opsSummary?.ownerReady) {
      missing.push(this.translateOrFallback('entity.field.owner', '负责人'));
    }
    if (!summary.opsSummary?.runbookReady) {
      missing.push(this.translateOrFallback('entity.field.runbook', '处置手册'));
    }
    if (!summary.opsSummary?.telemetryReady) {
      missing.push(this.translateOrFallback('entity.guide.evidence', '证据'));
    }
    if (!summary.opsSummary?.relationReady) {
      missing.push(this.translateOrFallback('entity.section.relations', '关系'));
    }
    if (missing.length === 0) {
      return this.translateOrFallback('entity.list.readiness.ready', '负责人、处置手册、证据和关系都已经具备。');
    }
    return `${this.translateOrFallback('entity.list.readiness.pending', '当前还缺')}${missing.join('、')}`;
  }

  getRowNextAction(summary: EntitySummary): { actionType: string; title: string; summary: string; actionLabel: string } {
    const action = summary.nextAction;
    if (action != null) {
      return {
        actionType: action.actionType,
        title: action.title,
        summary: action.summary,
        actionLabel: action.actionLabel
      };
    }
    if (summary.activeAlertCount > 0) {
      return {
        actionType: 'review_alerts',
        title: this.translateOrFallback('entity.detail.next.alerts', '先处理当前告警'),
        summary: this.translateOrFallback('entity.list.next.alerts', `${summary.activeAlertCount} 条活跃告警需要先看。`),
        actionLabel: this.translateOrFallback('entity.detail.open-alerts', '进入告警中心')
      };
    }
    if (!summary.opsSummary?.ownerReady) {
      return {
        actionType: 'complete_owner',
        title: this.translateOrFallback('entity.detail.next.owner', '补负责人'),
        summary: this.translateOrFallback('entity.list.next.owner', '先补负责人，实体才能成为真正的排障入口。'),
        actionLabel: this.translateOrFallback('entity.detail.next.owner.action', '去补负责人')
      };
    }
    if (!summary.opsSummary?.runbookReady) {
      return {
        actionType: 'complete_runbook',
        title: this.translateOrFallback('entity.detail.next.runbook', '补处置手册'),
        summary: this.translateOrFallback('entity.list.next.runbook', '先挂上 runbook，告警后才能直接处理。'),
        actionLabel: this.translateOrFallback('entity.detail.next.runbook.action', '补处置手册')
      };
    }
    if (!summary.opsSummary?.telemetryReady) {
      return {
        actionType: 'bind_monitor',
        title: this.translateOrFallback('entity.detail.next.monitors', '补监控绑定'),
        summary: this.translateOrFallback('entity.list.next.monitor', '当前实体还没有形成稳定证据，先去接入监控或发现线索。'),
        actionLabel: this.translateOrFallback('entity.detail.next.monitors.action', '关联监控')
      };
    }
    if (!summary.opsSummary?.relationReady) {
      return {
        actionType: 'review_relations',
        title: this.translateOrFallback('entity.detail.next.relations', '补关键关系'),
        summary: this.translateOrFallback('entity.list.next.relations', '先补最关键的上下游，后续排障路径会更清楚。'),
        actionLabel: this.translateOrFallback('entity.detail.next.relations.action', '编辑关系')
      };
    }
    return {
      actionType: 'inspect_logs',
      title: this.translateOrFallback('entity.detail.next.review-definition', '继续排查当前实体'),
      summary: this.translateOrFallback('entity.list.next.logs', '证据已经具备，继续去日志或监控里深入排查。'),
      actionLabel: this.translateOrFallback('entity.section.logs', '查看日志')
    };
  }

  getRunbookLabel(entity?: Entity): string {
    return this.hasRunbook(entity)
      ? this.translateOrFallback('entity.list.runbook.ready', 'Runbook Ready')
      : this.translateOrFallback('entity.list.runbook.missing', 'Runbook Missing');
  }

  getEntityCardKicker(entity?: Entity): string {
    if (entity == null) {
      return '-';
    }
    const segments = [this.translateOrFallback(`entity.type.${entity.type}`, this.humanize(entity.type))];
    if (this.trimText(entity.namespace) != null) {
      segments.push(entity.namespace!);
    }
    if (this.trimText(entity.environment) != null) {
      segments.push(entity.environment!);
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

  getSourceLabel(entity?: Entity): string {
    return this.translateOrFallback(`entity.source.${entity?.source}`, this.humanize(entity?.source));
  }

  getUpdatedAtLabel(entity?: Entity): string {
    const updatedAt = entity?.gmtUpdate || entity?.gmtCreate;
    if (updatedAt == null) {
      return '-';
    }
    return formatDate(updatedAt, 'yyyy-MM-dd HH:mm', 'en-US');
  }

  labelEntries(labels?: Record<string, string>): Array<{ key: string; value: string }> {
    return Object.entries(labels || {})
      .slice(0, 4)
      .map(([key, value]) => ({ key, value }));
  }

  hasLabels(entity?: Entity): boolean {
    return this.labelEntries(entity?.labels).length > 0;
  }

  labelColor(key: string): string {
    return renderLabelColor(key);
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

  isHttpLink(value?: string): boolean {
    return /^(https?:)?\/\//.test(value || '');
  }

  trackByEntitySummary(_index: number, summary: EntitySummary): number {
    return summary.entity.id;
  }

  trackByEntityRow(_index: number, row: EntityRowViewModel): number {
    return row.summary.entity.id;
  }

  trackByCatalogGroup(_index: number, item: EntityCatalogGroup): string {
    return `${item.section}:${item.label}`;
  }

  trackByLensOption(_index: number, item: CatalogLensOption): string {
    return item.value;
  }

  trackByValue(_index: number, value: string): string {
    return value;
  }

  trackByGovernancePreset(_index: number, preset: EntityDiscoveryGovernancePreset): string {
    return preset.id || preset.name;
  }

  trackByGovernancePolicyCard(_index: number, card: CatalogGovernancePolicyCard): string {
    return card.key;
  }

  trackByGovernanceHookCard(_index: number, card: CatalogGovernanceHookCard): string {
    return card.key;
  }

  get currentQueryParams(): Record<string, string | number> {
    return Object.entries(this.buildQueryParams()).reduce((params, [key, value]) => {
      if (value != null) {
        params[key] = value;
      }
      return params;
    }, {} as Record<string, string | number>);
  }

  private buildQueryParams(): Record<string, string | number | null> {
    return {
      type: this.type || null,
      status: this.status || null,
      owner: this.owner || null,
      source: this.source || null,
      search: this.search || null,
      environment: this.environment || null,
      lifecycle: this.lifecycle || null,
      tier: this.tier || null,
      system: this.system || null,
      scope: this.scopeMode !== 'all' ? this.scopeMode : null,
      pageIndex: this.pageIndex > 1 ? this.pageIndex : null,
      pageSize: this.pageSize !== 12 ? this.pageSize : null
    };
  }

  private syncFiltersFromQueryParams(paramMap: ParamMap): void {
    this.type = this.readQueryValue(paramMap.get('type'));
    this.status = this.readQueryValue(paramMap.get('status'));
    this.owner = this.readQueryValue(paramMap.get('owner'));
    this.source = this.readQueryValue(paramMap.get('source'));
    this.search = this.readQueryValue(paramMap.get('search'));
    this.environment = this.readQueryValue(paramMap.get('environment'));
    this.lifecycle = this.readQueryValue(paramMap.get('lifecycle'));
    this.tier = this.readQueryValue(paramMap.get('tier'));
    this.system = this.readQueryValue(paramMap.get('system'));
    this.scopeMode = paramMap.get('scope') === 'mine' ? 'mine' : 'all';
    this.typeDraft = this.type || null;
    this.statusDraft = this.status || null;
    this.ownerDraft = this.owner || '';
    this.sourceDraft = this.source || null;
    this.searchDraft = this.search || '';
    this.lifecycleDraft = this.lifecycle || null;
    this.tierDraft = this.tier || null;
    this.systemDraft = this.system || '';
    this.showAdvancedFilters =
      this.status != null || this.owner != null || this.source != null || this.lifecycle != null || this.tier != null || this.system != null;
    this.pageIndex = Number(paramMap.get('pageIndex') || '1');
    this.pageSize = Number(paramMap.get('pageSize') || '12');
  }

  private syncUrlWithFilters(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: this.currentQueryParams,
      replaceUrl: true
    });
  }

  private performDelete(entityId: number): void {
    this.entitySvc.deleteEntity(entityId).subscribe({
      next: message => {
        if (message.code === 0) {
          this.notifySvc.success(this.translateOrFallback('entity.list', 'Entities'), message.msg);
          this.loadCatalogRailCounts();
          if (this.entities.length === 1 && this.pageIndex > 1) {
            this.pageIndex -= 1;
            this.syncUrlWithFilters();
            this.loadEntities();
          } else {
            this.loadEntities();
          }
          return;
        }
        this.notifySvc.warning(this.translateOrFallback('entity.list', 'Entities'), message.msg);
        this.cdr.markForCheck();
      },
      error: error => {
        this.notifySvc.error(this.translateOrFallback('entity.list', 'Entities'), error?.msg || error?.message || 'Delete failed');
        this.cdr.markForCheck();
      }
    });
  }

  private loadCatalogRailCounts(): void {
    this.catalogCountsLoading = true;
    this.entitySvc.searchEntities(undefined, undefined, undefined, undefined, undefined, 0, 200).subscribe({
      next: message => {
        this.catalogCountsLoading = false;
        if (message.code !== 0) {
          this.cdr.markForCheck();
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
      },
      error: () => {
        this.catalogCountsLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  private loadCatalogSuggestions(): void {
    this.entitySvc.getCatalogSuggestions().subscribe({
      next: message => {
        this.catalogSuggestions = message.code === 0
          ? Object.assign(new EntityCatalogSuggestions(), message.data)
          : new EntityCatalogSuggestions();
        this.cdr.markForCheck();
      },
      error: () => {
        this.catalogSuggestions = new EntityCatalogSuggestions();
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

  private applyEntityView(): void {
    let summaries = [...this.allEntities];

    if (this.environment != null) {
      summaries = summaries.filter(summary => this.trimText(summary.entity.environment) === this.environment);
    }

    summaries.sort((left, right) => this.compareSummariesByLens(left, right));

    this.total = summaries.length;
    const maxPage = Math.max(1, Math.ceil(Math.max(this.total, 1) / this.pageSize));
    if (this.pageIndex > maxPage) {
      this.pageIndex = maxPage;
    }
    const start = (this.pageIndex - 1) * this.pageSize;
    const pageSummaries = summaries.slice(start, start + this.pageSize);
    this.entities = pageSummaries;
    this.entityRows = pageSummaries.map(summary => this.toEntityRow(summary));
    this.cdr.markForCheck();
  }

  private toEntityRow(summary: EntitySummary): EntityRowViewModel {
    const entity = summary.entity;
    const nextAction = this.getRowNextAction(summary);
    const readinessScore = summary.opsSummary?.readinessScore ?? this.getCatalogCompleteness(summary);
    return {
      summary,
      title: this.getEntityTitle(entity),
      subtitle: this.getEntitySubtitle(entity),
      kicker: this.getEntityCardKicker(entity),
      metadataSummary: this.getMetadataSummary(entity),
      ownerDisplay: this.getOwnerDisplay(entity.owner),
      ownershipContextSummary: this.getOwnershipContextSummary(entity),
      readinessScore,
      readinessLabel: `${readinessScore}% · ${this.getReadinessHeadline(summary)}`,
      readinessSummary: this.getReadinessSummary(summary),
      nextActionTitle: nextAction.title,
      nextActionSummary: nextAction.summary,
      nextActionLabel: nextAction.actionLabel,
      nextActionType: nextAction.actionType,
      lastEvidenceAtLabel: this.getLastEvidenceAtLabel(summary),
      statusColor: this.getStatusColor(summary.status.status),
      statusIcon: this.getStatusIcon(summary.status.status),
      statusLabel: this.translateOrFallback(`entity.status.${summary.status.status}`, this.humanize(summary.status.status)),
      statusNarrative: this.getStatusNarrative(summary),
      telemetryContextSummary: this.getTelemetryContextSummary(entity),
      activeAlertCount: summary.activeAlertCount,
      monitorCount: summary.monitorCount,
      identityCount: summary.identityCount
    };
  }

  private readQueryValue(value: string | null): string | undefined {
    if (value == null || value.trim() === '') {
      return undefined;
    }
    return value;
  }

  private trimText(value?: string): string | undefined {
    if (value == null) {
      return undefined;
    }
    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
  }

  private readDraftValue(value?: string | null): string | undefined {
    return this.trimText(value || undefined);
  }

  private getResolvedOwnerFilter(): string | undefined {
    if (this.scopeMode === 'mine') {
      return this.currentUserName;
    }
    return this.owner;
  }

  private hasNarrowingFilters(): boolean {
    return (
      this.status != null ||
      this.owner != null ||
      this.source != null ||
      this.search != null ||
      this.environment != null ||
      this.lifecycle != null ||
      this.tier != null ||
      this.system != null ||
      this.scopeMode === 'mine'
    );
  }

  private isCatalogMetadataIncomplete(entity?: Entity): boolean {
    return this.trimText(entity?.system) == null || this.trimText(entity?.lifecycle) == null || this.trimText(entity?.tier) == null;
  }

  private getGovernancePresetRelevance(
    preset: EntityDiscoveryGovernancePreset,
    owner?: string,
    system?: string,
    source?: string,
    environment?: string,
    status?: string
  ): number {
    let score = 0;
    if (this.trimText(preset.owner) != null && this.trimText(preset.owner) === owner) {
      score += 4;
    }
    if (this.trimText(preset.system) != null && this.trimText(preset.system) === system) {
      score += 4;
    }
    if (this.trimText(preset.environment) != null && this.trimText(preset.environment) === environment) {
      score += 3;
    }
    if (this.trimText(preset.source) != null && this.trimText(preset.source) === source) {
      score += 2;
    }
    if (this.trimText(preset.status) != null && this.trimText(preset.status) === status) {
      score += 1;
    }
    return score;
  }

  private getMetadataSummary(entity?: Entity): string | undefined {
    if (entity == null) {
      return undefined;
    }
    const segments = [
      this.trimText(entity.system),
      this.trimText(entity.lifecycle)
        ? this.translateOrFallback(`entity.lifecycle.${entity.lifecycle}`, this.humanize(entity.lifecycle))
        : undefined,
      this.trimText(entity.tier) ? entity.tier!.toUpperCase() : undefined
    ].filter((value): value is string => value != null);
    return segments.length > 0 ? segments.join(' · ') : undefined;
  }

  private getCatalogStructureSummary(entity?: Entity): string | undefined {
    if (entity == null) {
      return undefined;
    }
    const segments: string[] = [];
    const componentOf = entity.componentOf?.filter(value => this.trimText(value) != null) ?? [];
    const components = entity.components?.filter(value => this.trimText(value) != null) ?? [];
    const implementedBy = entity.implementedBy?.filter(value => this.trimText(value) != null) ?? [];
    const languages = entity.languages?.filter(value => this.trimText(value) != null) ?? [];
    const inheritFrom = this.trimText(entity.inheritFrom);

    if (componentOf.length > 0) {
      segments.push(
        `${this.translateOrFallback('entity.list.row.structure.part-of', '归属')} ${componentOf[0]}${
          componentOf.length > 1 ? ` +${componentOf.length - 1}` : ''
        }`
      );
    }
    if (components.length > 0) {
      segments.push(`${components.length} ${this.translateOrFallback('entity.list.row.structure.components', '组件')}`);
    }
    if (implementedBy.length > 0) {
      segments.push(`${implementedBy.length} ${this.translateOrFallback('entity.list.row.structure.implemented-by', '实现方')}`);
    }
    if (languages.length > 0) {
      segments.push(`${this.translateOrFallback('entity.list.row.structure.language', '语言')} ${languages[0]}${languages.length > 1 ? ` +${languages.length - 1}` : ''}`);
    }
    if (inheritFrom != null) {
      segments.push(`${this.translateOrFallback('entity.list.row.structure.inherit-from', '继承')} ${inheritFrom}`);
    }
    return segments.length > 0 ? segments.join(' · ') : undefined;
  }

  private getOwnershipContextSummary(entity?: Entity): string | undefined {
    if (entity == null) {
      return undefined;
    }
    const segments: string[] = [];
    const additionalOwners = entity.additionalOwners?.filter(owner => this.trimText(owner?.name) != null) ?? [];
    const contacts = entity.contacts?.filter(contact => this.trimText(contact?.contact || contact?.value || contact?.name) != null) ?? [];
    const links = entity.links?.filter(link => this.trimText(link?.url || link?.name) != null) ?? [];

    if (additionalOwners.length > 0) {
      segments.push(`${additionalOwners.length} ${this.translateOrFallback('entity.list.row.owners.additional', '协同负责人')}`);
    }
    if (contacts.length > 0) {
      segments.push(`${contacts.length} ${this.translateOrFallback('entity.list.row.owners.contacts', '联系方式')}`);
    }
    if (links.length > 0) {
      segments.push(`${links.length} ${this.translateOrFallback('entity.list.row.owners.links', '目录链接')}`);
    }
    return segments.length > 0 ? segments.join(' · ') : undefined;
  }

  private getTelemetryContextSummary(entity?: Entity): string | undefined {
    if (entity?.hertzbeat == null) {
      return undefined;
    }
    const segments: string[] = [];
    const codeLocations = entity.hertzbeat.codeLocations?.filter(location => this.trimText(location?.repositoryURL) != null) ?? [];
    const events = entity.hertzbeat.events?.filter(item => this.trimText(item?.query || item?.name) != null) ?? [];
    const logs = entity.hertzbeat.logs?.filter(item => this.trimText(item?.query || item?.name) != null) ?? [];
    const performanceTags = entity.hertzbeat.performanceData?.tags?.filter(tag => this.trimText(tag) != null) ?? [];
    const fingerprints = entity.hertzbeat.pipelines?.fingerprints?.filter(item => this.trimText(item) != null) ?? [];

    if (codeLocations.length > 0) {
      segments.push(`${codeLocations.length} ${this.translateOrFallback('entity.list.row.telemetry.code-locations', '代码位置')}`);
    }
    if (events.length > 0) {
      segments.push(`${events.length} ${this.translateOrFallback('entity.list.row.telemetry.events', '事件查询')}`);
    }
    if (logs.length > 0) {
      segments.push(`${logs.length} ${this.translateOrFallback('entity.list.row.telemetry.logs', '日志查询')}`);
    }
    if (performanceTags.length > 0) {
      segments.push(`${performanceTags.length} ${this.translateOrFallback('entity.list.row.telemetry.performance-tags', '性能标签')}`);
    }
    if (fingerprints.length > 0) {
      segments.push(`${fingerprints.length} ${this.translateOrFallback('entity.list.row.telemetry.pipeline-fingerprints', 'Pipeline 指纹')}`);
    }
    return segments.length > 0 ? segments.join(' · ') : undefined;
  }

  private hasLogEvidence(entity?: Entity): boolean {
    return (entity?.hertzbeat?.logs?.filter(item => this.trimText(item?.query || item?.name) != null).length || 0) > 0;
  }

  private hasTraceEvidence(entity?: Entity): boolean {
    const performanceTags = entity?.hertzbeat?.performanceData?.tags?.filter(tag => this.trimText(tag) != null) ?? [];
    const pipelineFingerprints = entity?.hertzbeat?.pipelines?.fingerprints?.filter(item => this.trimText(item) != null) ?? [];
    const events = entity?.hertzbeat?.events?.filter(item => this.trimText(item?.query || item?.name) != null) ?? [];
    return performanceTags.length > 0 || pipelineFingerprints.length > 0 || events.length > 0;
  }

  private buildEntityWorkbenchQueryParams(entity: Entity, sourcePage: string, returnLabel: string): Record<string, string | number> {
    return Object.entries({
      entityId: entity.id,
      entityName: this.getEntityTitle(entity),
      serviceName: this.trimText(entity.name),
      serviceNamespace: this.trimText(entity.namespace),
      environment: this.trimText(entity.environment),
      returnTo: this.router.url,
      returnLabel,
      sourcePage
    }).reduce((params, [key, value]) => {
      if (value != null && `${value}`.trim() !== '') {
        params[key] = value;
      }
      return params;
    }, {} as Record<string, string | number>);
  }

  private getDefinitionContextSummary(entity?: Entity): string | undefined {
    if (entity == null) {
      return undefined;
    }
    const segments: string[] = [];
    const hasInterface = this.trimText(entity.apiInterface?.fileRef) != null || Object.keys(entity.apiInterface?.definition || {}).length > 0;
    const integrationCount = Object.keys(entity.integrations || {}).length;
    const extensionCount = Object.keys(entity.extensions || {}).length;

    if (hasInterface) {
      segments.push(this.translateOrFallback('entity.list.row.definition.interface', '接口定义'));
    }
    if (integrationCount > 0) {
      segments.push(`${integrationCount} ${this.translateOrFallback('entity.list.row.definition.integrations', 'Integrations')}`);
    }
    if (extensionCount > 0) {
      segments.push(`${extensionCount} ${this.translateOrFallback('entity.list.row.definition.extensions', 'Extensions')}`);
    }
    return segments.length > 0 ? segments.join(' · ') : undefined;
  }

  private getLifecycleContextSummary(summary: EntitySummary): string | undefined {
    const registrySignal = this.getCatalogRegistrySignal();
    const sharedGovernanceSummary = this.getSharedGovernanceStateSummary(
      this.getSharedGovernanceGapLabels(
        summary,
        this.resolveGovernancePresetForActivity(this.getLatestPresetWorkspaceActivityForEntity(summary.entity.id)) || this.preferredGovernancePreset,
        this.getGovernancePresetConflictFieldLabels(
          summary.entity,
          this.resolveGovernancePresetForActivity(this.getLatestPresetWorkspaceActivityForEntity(summary.entity.id)) || this.preferredGovernancePreset
        )
      ),
      registrySignal
    );
    const presetActivity = this.getLatestPresetWorkspaceActivityForEntity(summary.entity.id);
    if (presetActivity != null) {
      const baseSummary =
        this.getLatestPresetWorkspaceActivitySummary(presetActivity) ||
        this.translateOrFallback('entity.list.lifecycle.context.preset-applied', '最近已应用共享预设');
      const conflictLabels = this.getGovernancePresetConflictFieldLabels(
        summary.entity,
        this.resolveGovernancePresetForActivity(presetActivity) || this.preferredGovernancePreset
      );
      const mergedSummary =
        conflictLabels.length > 0 ? `${baseSummary} · ${this.translateOrFallback('entity.list.policy.preset.conflict', '待对齐')} ${conflictLabels.join('、')}` : baseSummary;
      const withRegistry = [mergedSummary, this.getGovernanceRegistrySummary(), sharedGovernanceSummary]
        .filter((value, index, all): value is string => value != null && all.indexOf(value) === index)
        .join(' · ');
      return withRegistry || mergedSummary;
    }

    const entity = summary.entity;
    if (summary.definitionManaged) {
      const activitySummary = this.translateDefinitionActivitySummary(summary.definitionActivitySummary);
      if (activitySummary != null) {
        return sharedGovernanceSummary != null && sharedGovernanceSummary !== activitySummary ? `${activitySummary} · ${sharedGovernanceSummary}` : activitySummary;
      }
      const baseSummary = this.translateOrFallback('entity.list.lifecycle.context.definition-managed', '最近通过导入定义更新');
      return sharedGovernanceSummary != null && sharedGovernanceSummary !== baseSummary ? `${baseSummary} · ${sharedGovernanceSummary}` : baseSummary;
    }

    if (entity.source != null && entity.source !== 'manual') {
      const baseSummary = this.translateOrFallback('entity.list.lifecycle.context.discovery-managed', '遥测发现里还有可继续处理的线索');
      return sharedGovernanceSummary != null && sharedGovernanceSummary !== baseSummary ? `${baseSummary} · ${sharedGovernanceSummary}` : baseSummary;
    }

    if (!this.hasOwner(entity) || !this.hasRunbook(entity) || this.trimText(entity.system) == null) {
      const baseSummary = this.translateOrFallback('entity.list.lifecycle.context.metadata-gap', '建议先补齐负责人、系统和处置手册');
      return sharedGovernanceSummary != null && sharedGovernanceSummary !== baseSummary ? `${baseSummary} · ${sharedGovernanceSummary}` : baseSummary;
    }

    const baseSummary = this.translateOrFallback('entity.list.lifecycle.context.manual-managed', '目录信息可直接在页面里维护');
    return sharedGovernanceSummary != null && sharedGovernanceSummary !== baseSummary ? `${baseSummary} · ${sharedGovernanceSummary}` : baseSummary;
  }

  private getSharedGovernanceGapLabels(
    summary: EntitySummary,
    preset: EntityDiscoveryGovernancePreset | undefined,
    presetConflictLabels: string[]
  ): string[] {
    if (this.catalogGovernanceSnapshots.length === 0) {
      return [];
    }
    const gaps = [...presetConflictLabels];
    if (!this.hasOwner(summary.entity)) {
      gaps.push(this.translateOrFallback('entity.field.owner', '负责人'));
    }
    if (!this.hasRunbook(summary.entity)) {
      gaps.push(this.translateOrFallback('entity.field.runbook', '处置手册'));
    }
    if (this.trimText(summary.entity.system) == null) {
      gaps.push(this.translateOrFallback('entity.field.system', '所属系统'));
    }
    if (this.trimText(summary.entity.lifecycle) == null) {
      gaps.push(this.translateOrFallback('entity.field.lifecycle', '生命周期'));
    }
    if (!summary.definitionManaged) {
      gaps.push(this.translateOrFallback('entity.list.hooks.definition.title', '定义状态'));
    }
    if (!this.hasEvidence(summary)) {
      gaps.push(this.translateOrFallback('entity.list.hooks.telemetry.title', '证据收敛'));
    }
    if (preset == null && this.preferredGovernancePreset != null) {
      gaps.push(this.translateOrFallback('entity.list.hooks.preset.title', '共享预设对齐'));
    }
    return [...new Set(gaps.filter(label => this.trimText(label) != null))];
  }

  private getSharedGovernanceStateLabel(gaps: string[], registrySignal: GovernanceRegistrySignalPresentation): string | undefined {
    switch (registrySignal.state) {
      case 'local-fallback':
        return this.translateOrFallback('entity.list.row.shared-governance.registry.local-fallback', '共享状态 · 仅本地可用');
      case 'shared-stale':
        return this.translateOrFallback('entity.list.row.shared-governance.registry.shared-stale', '共享状态 · 待刷新');
      case 'missing':
        return this.translateOrFallback('entity.list.row.shared-governance.registry.missing', '共享状态 · 待建立');
      case 'shared-fresh':
      default:
        if (this.catalogGovernanceSnapshots.length === 0) {
          return undefined;
        }
        return gaps.length === 0
          ? this.translateOrFallback('entity.list.row.shared-governance.ready', '共享状态 · 已对齐')
          : this.translateOrFallback('entity.list.row.shared-governance.pending', '共享状态 · 待处理');
    }
  }

  private getSharedGovernanceStateSummary(gaps: string[], registrySignal: GovernanceRegistrySignalPresentation): string | undefined {
    switch (registrySignal.state) {
      case 'local-fallback':
      case 'shared-stale':
      case 'missing':
        return registrySignal.summary;
      case 'shared-fresh':
      default:
        if (this.catalogGovernanceSnapshots.length === 0) {
          return undefined;
        }
        if (gaps.length === 0) {
          return this.translateOrFallback('entity.list.row.shared-governance.ready.copy', '当前实体已经与最近保存的共享记录一致。');
        }
        return `${this.translateOrFallback('entity.list.row.shared-governance.pending.copy', '当前实体还有信息需要处理')} ${gaps.slice(0, 4).join('、')}`;
    }
  }

  private getSharedGovernanceStateColor(gaps: string[], registrySignal: GovernanceRegistrySignalPresentation): 'green' | 'orange' {
    if (registrySignal.state !== 'shared-fresh') {
      return 'orange';
    }
    return gaps.length === 0 ? 'green' : 'orange';
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

  private getCatalogRegistrySignal(): GovernanceRegistrySignalPresentation {
    return buildGovernanceRegistrySignalPresentation(
      this.governancePresetRegistrySource,
      this.catalogGovernanceSnapshots[0]?.happenedAt,
      this.translateOrFallback.bind(this)
    );
  }

  private getCatalogRegistryAction(card: GovernanceRegistrySignalPresentation): CatalogGovernanceHookCard['action'] {
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

  private getCatalogRegistryActionLabel(card: GovernanceRegistrySignalPresentation): string {
    switch (card.state) {
      case 'local-fallback':
        return this.translateOrFallback('entity.governance.registry.sync', '保存为共享预设');
      case 'missing':
        return this.translateOrFallback('entity.governance.registry.seed', '先建立共享预设');
      case 'shared-fresh':
      case 'shared-stale':
      default:
        return this.translateOrFallback('entity.governance.registry.refresh', '刷新共享预设');
    }
  }

  get canSyncGovernancePresetRegistry(): boolean {
    return this.governancePresetRegistrySource === 'local' && readDiscoveryGovernancePresets(8).length > 0;
  }

  refreshGovernancePresetRegistry(): void {
    this.loadGovernancePresets();
    this.recordSharedDiscoveryRegistryActivity(
      this.translateOrFallback('entity.governance.registry.refresh.activity', '已刷新共享预设'),
      'info',
      this.getGovernanceRegistrySummary()
    );
    this.notifySvc.success(
      this.translateOrFallback('entity.list', 'Entities'),
      this.translateOrFallback('entity.governance.registry.refresh.success', '已刷新共享预设。')
    );
  }

  syncGovernancePresetRegistry(): void {
    const localPresets = readDiscoveryGovernancePresets(8);
    if (localPresets.length === 0) {
      this.notifySvc.warning(
        this.translateOrFallback('entity.list', 'Entities'),
        this.translateOrFallback('entity.governance.registry.sync.empty', '当前没有可同步的本地预设。')
      );
      return;
    }
    forkJoin(
      localPresets.map(preset => this.entitySvc.saveDiscoveryGovernancePreset(preset).pipe(catchError(() => of(undefined))))
    ).subscribe({
      next: results => {
        const syncedCount = results.filter(result => result?.code === 0).length;
        this.loadGovernancePresets();
        this.recordSharedDiscoveryRegistryActivity(
          syncedCount > 0
            ? this.translateOrFallback('entity.governance.registry.sync.activity', '已将本地预设保存为共享预设')
            : this.translateOrFallback('entity.governance.registry.sync.warning', '当前无法写入共享预设，暂时只保留本地预设。'),
          syncedCount > 0 ? 'success' : 'warning',
          this.joinRegistryActivityDetail(
            this.getGovernanceRegistrySummary(),
            syncedCount > 0 ? `${syncedCount} ${this.translateOrFallback('entity.discovery.preset.shared-title', '共享预设')}` : undefined
          )
        );
        if (syncedCount > 0) {
          this.notifySvc.success(
            this.translateOrFallback('entity.list', 'Entities'),
            this.translateOrFallback('entity.governance.registry.sync.success', '本地预设已保存为共享预设。')
          );
          return;
        }
        this.notifySvc.warning(
          this.translateOrFallback('entity.list', 'Entities'),
          this.translateOrFallback('entity.governance.registry.sync.warning', '当前无法写入共享预设，暂时只保留本地预设。')
        );
      },
      error: () => {
        this.notifySvc.warning(
          this.translateOrFallback('entity.list', 'Entities'),
          this.translateOrFallback('entity.governance.registry.sync.warning', '当前无法写入共享预设，暂时只保留本地预设。')
        );
      }
    });
  }

  private joinRegistryActivityDetail(...segments: Array<string | undefined>): string | undefined {
    const values = segments.filter((value): value is string => this.trimText(value) != null);
    const unique = values.filter((value, index, all) => all.indexOf(value) === index);
    return unique.length > 0 ? unique.join(' · ') : undefined;
  }

  private recordSharedDiscoveryRegistryActivity(
    summary: string,
    status: EntityDiscoveryGovernanceActivity['status'],
    detail?: string
  ): void {
    const activity: EntityDiscoveryGovernanceActivity = {
      id: `catalog-registry-${Date.now()}`,
      happenedAt: new Date().toISOString(),
      status,
      action: 'policy-hook',
      summary,
      detail,
      workspacePath: '/entities'
    };
    this.entitySvc.saveDiscoveryGovernanceActivity(activity).subscribe({
      next: message => {
        if (message.code === 0 && message.data != null) {
          this.serverDiscoveryActivities = [message.data, ...this.serverDiscoveryActivities.filter(item => item.id !== message.data!.id)].sort(
            (left, right) =>
              this.compareActivityTime(
                left.happenedAt == null ? undefined : String(left.happenedAt),
                right.happenedAt == null ? undefined : String(right.happenedAt)
              )
          );
          this.cdr.markForCheck();
        }
      }
    });
  }

  private getLifecycleAction(
    summary: EntitySummary,
    registrySignal: GovernanceRegistrySignalPresentation
  ): {
    key: 'registry-refresh' | 'registry-sync' | 'registry-seed' | 'preset' | 'definition' | 'discovery' | 'catalog' | 'edit';
    label: string;
  } {
    switch (registrySignal.state) {
      case 'local-fallback':
        return {
          key: 'registry-sync',
          label: this.translateOrFallback('entity.governance.registry.sync', '保存为共享预设')
        };
      case 'shared-stale':
        return {
          key: 'registry-refresh',
          label: this.translateOrFallback('entity.governance.registry.refresh', '刷新共享预设')
        };
      case 'missing':
        return {
          key: 'registry-seed',
          label: this.translateOrFallback('entity.governance.registry.seed', '先建立共享预设')
        };
      default:
        break;
    }
    if (this.getLatestPresetWorkspaceActivityForEntity(summary.entity.id) != null) {
      return {
        key: 'preset',
        label: this.translateOrFallback('entity.list.lifecycle.action.preset', '按预设继续')
      };
    }
    if (summary.definitionManaged) {
      return {
        key: 'definition',
        label: this.translateOrFallback('entity.list.lifecycle.action.definition', '编辑定义')
      };
    }
    if (summary.entity.source != null && summary.entity.source !== 'manual') {
      return {
        key: 'discovery',
        label: this.translateOrFallback('entity.list.lifecycle.action.discovery', '继续处理')
      };
    }
    if (!this.hasOwner(summary.entity) || !this.hasRunbook(summary.entity) || this.trimText(summary.entity.system) == null) {
      return {
        key: 'catalog',
        label: this.translateOrFallback('entity.list.lifecycle.action.catalog', '补齐目录')
      };
    }
    return {
      key: 'edit',
      label: this.translateOrFallback('entity.list.lifecycle.action.edit', '编辑实体')
    };
  }

  private getDefinitionLifecycleLabel(summary: EntitySummary): string {
    const segments: string[] = [];
    if (summary.definitionManaged) {
      segments.push(this.translateOrFallback('entity.list.definition.managed', '定义驱动'));
      const format = this.trimText(summary.definitionActivityFormat);
      if (format != null) {
        segments.push(format.toUpperCase());
      }
      const activitySummary = this.translateDefinitionActivitySummary(summary.definitionActivitySummary);
      if (activitySummary != null) {
        segments.push(activitySummary);
      }
      return segments.join(' · ');
    }
    segments.push(this.translateOrFallback('entity.list.definition.unmanaged', '页面维护'));
    segments.push('Schema');
    segments.push('Entity v1alpha1');
    return segments.join(' · ');
  }

  private translateDefinitionActivitySummary(summary?: string): string | undefined {
    const normalized = this.trimText(summary);
    if (normalized == null) {
      return undefined;
    }
    switch (normalized) {
      case 'Definition imported':
        return this.translateOrFallback('entity.definition.import.activity.single-success', '实体定义已导入');
      case 'Definition updated':
        return this.translateOrFallback('entity.definition.import.activity.update-success', '实体定义已更新');
      case 'Definition import failed':
        return this.translateOrFallback('entity.definition.import.activity.create-failed', '实体导入失败');
      case 'Definition update failed':
        return this.translateOrFallback('entity.definition.import.activity.update-failed', '实体定义保存失败');
      default:
        return normalized;
    }
  }

  private getEntityLifecycleSearchToken(entity?: Entity): string | undefined {
    if (entity == null) {
      return undefined;
    }
    return (
      this.trimText(entity.name) ||
      this.trimText(entity.displayName) ||
      this.trimText(entity.namespace) ||
      this.trimText(entity.owner) ||
      this.trimText(entity.system)
    );
  }

  private compareSummariesByLens(left: EntitySummary, right: EntitySummary): number {
    switch (this.activeLens) {
      case 'reliability':
        return (
          this.compareNumbers(this.statusPriority(right.status?.status), this.statusPriority(left.status?.status)) ||
          this.compareNumbers(right.activeAlertCount || 0, left.activeAlertCount || 0) ||
          this.compareNumbers(right.status?.monitorDownCount || 0, left.status?.monitorDownCount || 0) ||
          this.compareByTitle(left, right)
        );
      case 'performance':
        return (
          this.compareNumbers(Number(this.hasEvidence(right)), Number(this.hasEvidence(left))) ||
          this.compareNumbers(this.criticalityPriority(right.entity.criticality), this.criticalityPriority(left.entity.criticality)) ||
          this.compareStrings(right.entity.environment, left.entity.environment) ||
          this.compareByTitle(left, right)
        );
      case 'security':
        return (
          this.compareNumbers(this.criticalityPriority(right.entity.criticality), this.criticalityPriority(left.entity.criticality)) ||
          this.compareNumbers(Number(!this.hasOwner(right.entity)), Number(!this.hasOwner(left.entity))) ||
          this.compareNumbers(Number(!this.hasRunbook(right.entity)), Number(!this.hasRunbook(left.entity))) ||
          this.compareByTitle(left, right)
        );
      case 'costs':
        return (
          this.compareNumbers(this.costsTypePriority(right.entity.type), this.costsTypePriority(left.entity.type)) ||
          this.compareStrings(left.entity.environment, right.entity.environment) ||
          this.compareByTitle(left, right)
        );
      case 'delivery':
        return (
          this.compareNumbers(Number(this.hasRunbook(right.entity)), Number(this.hasRunbook(left.entity))) ||
          this.compareStrings(right.entity.owner, left.entity.owner) ||
          this.compareStrings(right.entity.gmtUpdate, left.entity.gmtUpdate) ||
          this.compareByTitle(left, right)
        );
      default:
        return (
          this.compareNumbers(Number(!this.hasOwner(right.entity)), Number(!this.hasOwner(left.entity))) ||
          this.compareNumbers(Number(!this.hasRunbook(right.entity)), Number(!this.hasRunbook(left.entity))) ||
          this.compareByTitle(left, right)
        );
    }
  }

  private compareByTitle(left: EntitySummary, right: EntitySummary): number {
    return this.getEntityTitle(left.entity).localeCompare(this.getEntityTitle(right.entity));
  }

  private compareNumbers(left: number, right: number): number {
    return left - right;
  }

  private compareStrings(left?: string | number, right?: string | number): number {
    return String(left || '').localeCompare(String(right || ''));
  }

  private statusPriority(status?: string): number {
    switch (status) {
      case 'critical':
        return 5;
      case 'degraded':
        return 4;
      case 'unknown':
        return 3;
      case 'paused':
        return 2;
      case 'healthy':
        return 1;
      default:
        return 0;
    }
  }

  private criticalityPriority(criticality?: string): number {
    switch (criticality) {
      case 'critical':
        return 4;
      case 'high':
        return 3;
      case 'medium':
        return 2;
      case 'low':
        return 1;
      default:
        return 0;
    }
  }

  private costsTypePriority(type?: string): number {
    switch (type) {
      case 'database':
        return 4;
      case 'queue':
        return 3;
      case 'host':
        return 2;
      case 'middleware':
        return 1;
      case 'service':
        return 1;
      default:
        return 0;
    }
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

  private loadDefinitionWorkspaceActivities(): void {
    this.entitySvc.getDefinitionWorkspaceActivities(24).subscribe({
      next: message => {
        if (message.code !== 0) {
          this.serverWorkspaceActivities = [];
          this.cdr.markForCheck();
          return;
        }
        this.serverWorkspaceActivities = [...(message.data || [])].sort((left, right) =>
          this.compareActivityTime(left.happenedAt, right.happenedAt)
        );
        this.cdr.markForCheck();
      },
      error: () => {
        this.serverWorkspaceActivities = [];
        this.cdr.markForCheck();
      }
    });
  }

  private loadSharedDiscoveryActivities(): void {
    this.entitySvc.getDiscoveryGovernanceActivities(24).subscribe({
      next: message => {
        if (message.code !== 0) {
          this.serverDiscoveryActivities = [];
          this.cdr.markForCheck();
          return;
        }
        this.serverDiscoveryActivities = [...(message.data || [])].sort((left, right) =>
          this.compareActivityTime(
            left.happenedAt == null ? undefined : String(left.happenedAt),
            right.happenedAt == null ? undefined : String(right.happenedAt)
          )
        );
        this.cdr.markForCheck();
      },
      error: () => {
        this.serverDiscoveryActivities = [];
        this.cdr.markForCheck();
      }
    });
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

  private isGovernanceHookDiscoveryActivity(activity: EntityDiscoveryGovernanceActivity | undefined): boolean {
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

  private getLatestPresetWorkspaceActivityForEntity(entityId?: number): DefinitionImportActivity | undefined {
    if (entityId == null) {
      return undefined;
    }
    return this.serverWorkspaceActivities.find(activity => this.isGovernancePresetWorkspaceActivity(activity) && activity.entityId === entityId);
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

  private getGovernancePresetConflictFieldLabels(entity: Entity | undefined, preset: EntityDiscoveryGovernancePreset | undefined): string[] {
    return this.getGovernancePresetConflictFields(entity, preset).map(field => this.getGovernanceFieldLabel(field));
  }

  private getGovernancePresetConflictFields(
    entity: Entity | undefined,
    preset: EntityDiscoveryGovernancePreset | undefined
  ): Array<'owner' | 'system' | 'environment' | 'source' | 'status'> {
    if (entity == null || preset == null) {
      return [];
    }
    const fields: Array<'owner' | 'system' | 'environment' | 'source' | 'status'> = [];
    const presetOwner = this.trimText(preset.bulkOwner || preset.owner);
    const presetSystem = this.trimText(preset.bulkSystem || preset.system);
    if (presetOwner != null && presetOwner !== this.trimText(entity.owner)) {
      fields.push('owner');
    }
    if (presetSystem != null && presetSystem !== this.trimText(entity.system)) {
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

  private resolveGovernanceConflictFocus(field: 'owner' | 'system' | 'environment' | 'source' | 'status'): 'basic' | 'ownership' {
    switch (field) {
      case 'owner':
      case 'system':
        return 'ownership';
      case 'environment':
      case 'source':
      case 'status':
      default:
        return 'basic';
    }
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

  private openPresetGovernanceWorkflow(summary: EntitySummary, activity: DefinitionImportActivity): void {
    const preset = this.resolveGovernancePresetForActivity(activity);
    if (preset != null) {
      this.router.navigate(['/entities', 'discovery'], {
        queryParams: {
          ...this.currentQueryParams,
          ...buildGovernancePresetQueryParams(preset),
          query: this.getEntityLifecycleSearchToken(summary.entity),
          owner: this.trimText(preset.owner) || this.trimText(summary.entity.owner),
          system: this.trimText(preset.system) || this.trimText(summary.entity.system),
          environment: this.trimText(preset.environment) || this.trimText(summary.entity.environment),
          source: this.trimText(preset.source) || this.trimText(summary.entity.source),
          status: this.trimText(preset.status)
        }
      });
      return;
    }
    if (activity.entityId != null) {
      this.editEntity(activity.entityId);
      return;
    }
    this.openGovernancePresetDiscovery();
  }

  private compareActivityTime(left?: string, right?: string): number {
    const leftValue = this.normalizeActivityTime(left);
    const rightValue = this.normalizeActivityTime(right);
    return rightValue - leftValue;
  }

  getCatalogGovernanceSnapshotStatusLabel(status: CatalogGovernanceSnapshotCard['status']): string {
    switch (status) {
      case 'success':
        return this.translateOrFallback('entity.list.snapshot.status.success', '已就绪');
      case 'warning':
        return this.translateOrFallback('entity.list.snapshot.status.warning', '待处理');
      case 'error':
        return this.translateOrFallback('entity.list.snapshot.status.error', '有阻塞');
      default:
        return this.translateOrFallback('entity.list.snapshot.status.info', '已记录');
    }
  }

  private normalizeActivityTime(value?: string): number {
    const normalized = this.trimText(value);
    if (normalized == null) {
      return 0;
    }
    const parsed = Date.parse(normalized.replace(' ', 'T'));
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  getImportActivityStatusLabel(status: DefinitionImportActivityStatus): string {
    switch (status) {
      case 'success':
        return this.translateOrFallback('entity.definition.import.activity.status.success', '成功');
      case 'warning':
        return this.translateOrFallback('entity.definition.import.activity.status.warning', '需关注');
      default:
        return this.translateOrFallback('entity.definition.import.activity.status.error', '失败');
    }
  }

  viewImportedEntity(entityId: number): void {
    this.router.navigate(['/entities', entityId], { queryParams: this.currentQueryParams });
  }
}
