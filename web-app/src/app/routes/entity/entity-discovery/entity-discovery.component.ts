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
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { formatDate } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { I18NService } from '@core';
import { ALAIN_I18N_TOKEN } from '@delon/theme';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { forkJoin, of, Subscription } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

import { EntityCatalogSuggestions } from '../../../pojo/EntityCatalogSuggestions';
import { Entity } from '../../../pojo/Entity';
import { EntityDefinitionActivity } from '../../../pojo/EntityDetail';
import { EntityDto } from '../../../pojo/EntityDetail';
import { EntityIdentity } from '../../../pojo/EntityIdentity';
import { EntityMonitorBind } from '../../../pojo/EntityMonitorBind';
import { EntityMonitorBindingCandidate } from '../../../pojo/EntityMonitorBindingCandidate';
import { Message } from '../../../pojo/Message';
import { Monitor } from '../../../pojo/Monitor';
import { EntitySummary } from '../../../pojo/EntitySummary';
import { DefinitionImportActivity } from '../../../pojo/EntityDefinitionWorkspaceActivity';
import { EntityService } from '../../../service/entity.service';
import { PlatformRailNavGroup, PlatformRailNavItem } from '../../../shared/components/platform-rail-nav/platform-rail-nav.component';
import { readDefinitionWorkspaceResumeState } from '../entity-definition-resume.util';
import { MonitorService } from '../../../service/monitor.service';
import {
  WorkspaceGuidanceAction,
  WorkspaceGuidanceLink,
  WorkspaceGuidanceReason
} from '../../../shared/components/workspace-guidance-panel/workspace-guidance-panel.component';
import {
  ENTITY_IDENTITY_PRESET_KEYS,
  extractTelemetryIdentityMatchesForMonitor,
  findTelemetryIdentityValue,
  getEntityIdentityPriority,
  getPrimaryIdentityKeyForEntityType,
  inferTelemetryEntityNameForMonitor,
  inferTelemetryEntityTypeForMonitor
} from '../entity-otel-identity.util';
import {
  DiscoveryGovernanceActivity,
  DiscoveryGovernanceActivityEntityRef,
  DiscoveryGovernanceActivityStatus,
  readDiscoveryGovernanceActivities,
  writeDiscoveryGovernanceActivities
} from '../entity-discovery-activity.util';
import {
  DiscoveryGovernancePreset,
  buildGovernancePresetQueryParams,
  readDiscoveryGovernancePresets,
  writeDiscoveryGovernancePresets
} from '../entity-discovery-preset.util';
import {
  buildGovernanceRegistryPolicyPresentation,
  buildGovernanceRecipePresentation,
  buildGovernanceRegistrySignalPresentation,
  GovernanceRecipePriority,
  GovernanceRegistrySignalPresentation,
  requiresGovernanceRegistryRemediation
} from '../entity-governance-recipe.util';

interface TelemetryDiscoveryRow {
  monitor: Monitor;
  topCandidate?: EntityMonitorBindingCandidate;
  candidates: EntityMonitorBindingCandidate[];
  identityMatches: Array<{ key: string; value: string }>;
  draftDto: EntityDto;
  selectedCandidateId?: number;
  candidateSummaryMap?: Record<number, EntitySummary>;
}

type TelemetryDiscoveryScope = 'all' | 'matched' | 'new' | 'resolved';
type TelemetryGovernanceRiskLevel = 'low' | 'medium' | 'high';
type TelemetryGovernanceAction = 'open' | 'review' | 'merge' | 'enrich' | 'create';
type DiscoveryWorkspaceRemedy = 'preset' | 'ownership' | 'definition' | 'telemetry';

interface DiscoveryLifecycleRecord {
  id: string;
  title: string;
  summary: string;
  detail?: string;
  happenedAt?: string;
  actionLabel?: string;
  action?: 'workspace' | 'entity' | 'snapshot-discovery' | 'snapshot-definition';
  entityId?: number;
}

interface DiscoverySharedGovernanceSnapshotCard {
  key: 'discovery' | 'definition';
  title: string;
  status: DefinitionImportActivity['status'] | DiscoveryGovernanceActivityStatus;
  summary: string;
  detail?: string;
  happenedAt?: string;
  actionLabel: string;
  action: 'discovery' | 'definition';
}

type GovernanceConflictField = 'owner' | 'system' | 'environment' | 'source' | 'status';

interface DiscoveryGovernanceHookCard {
  key: 'registry' | 'preset' | 'ownership' | 'definition' | 'telemetry';
  title: string;
  metric: string;
  summary: string;
  priority: GovernanceRecipePriority;
  priorityLabel: string;
  nextStep: string;
  actionLabel: string;
  action: 'preset' | 'ownership' | 'definition' | 'telemetry' | 'registry-refresh' | 'registry-sync' | 'registry-seed';
  preset?: DiscoveryGovernancePreset;
}

interface DiscoveryGovernancePolicyCard {
  key: 'registry' | 'preset' | 'ownership' | 'definition' | 'telemetry';
  title: string;
  summary: string;
  actionLabel: string;
  action: DiscoveryGovernanceHookCard['action'];
  preset?: DiscoveryGovernancePreset;
}

type DiscoveryIntakeQueueAction = 'review' | 'select-merge' | 'select-create' | 'resolved';

interface DiscoveryIntakeQueueGroup {
  key: 'review' | 'merge' | 'create' | 'resolved';
  title: string;
  summary: string;
  actionLabel: string;
  action: DiscoveryIntakeQueueAction;
  rows: TelemetryDiscoveryRow[];
}

@Component({
  standalone: false,  selector: 'app-entity-discovery',
  templateUrl: './entity-discovery.component.html',
  styleUrls: ['./entity-discovery.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EntityDiscoveryComponent implements OnInit, OnDestroy {
  private readonly hostLikeApps = new Set([
    'linux',
    'windows',
    'macos',
    'darwin',
    'centos',
    'debian',
    'ubuntu',
    'almalinux',
    'redhat',
    'rockylinux',
    'opensuse',
    'euleros',
    'coreos',
    'freebsd'
  ]);
  private readonly serviceLikeApps = new Set([
    'springboot2',
    'springboot3',
    'jvm',
    'jetty',
    'tomcat',
    'nginx',
    'hertzbeat',
    'fullsite',
    'website',
    'prometheus',
    'registry'
  ]);
  private readonly apiLikeApps = new Set(['api', 'api_code']);
  private readonly queueLikeApps = new Set(['kafka', 'rabbitmq', 'rocketmq', 'emq', 'activemq']);
  private readonly endpointLikeApps = new Set([
    'dns',
    'website',
    'fullsite',
    'port',
    'udp_port',
    'ping',
    'ssl_cert',
    'websocket'
  ]);
  private readonly databaseLikeApps = new Set([
    'mysql',
    'postgresql',
    'postgres',
    'oracle',
    'sqlserver',
    'mongodb',
    'opengauss',
    'tidb',
    'db2',
    'dm',
    'clickhouse',
    'elasticsearch'
  ]);
  private readonly middlewareLikeApps = new Set([
    'redis',
    'kafka',
    'rabbitmq',
    'rocketmq',
    'zookeeper',
    'consul',
    'nacos',
    'etcd',
    'memcached',
    'emq',
    'activemq'
  ]);
  private readonly deviceLikeApps = new Set(['snmp', 'modbus']);
  private readonly identityPresetKeys: string[] = ENTITY_IDENTITY_PRESET_KEYS;
  private readonly catalogLabelPresets: string[] = ['team', 'system', 'tier', 'lifecycle', 'region', 'cluster'];
  readonly statusOptions: string[] = ['critical', 'degraded', 'healthy', 'paused', 'unknown'];
  readonly sourceOptions: string[] = ['manual', 'otel_resource', 'derived', 'rule'];
  private routeSub?: Subscription;

  catalogSuggestions = new EntityCatalogSuggestions();
  telemetryDiscoverySearch = '';
  telemetryDiscoveryRows: TelemetryDiscoveryRow[] = [];
  telemetryDiscoveryScope: TelemetryDiscoveryScope = 'all';
  telemetryDiscoveryLoading = false;
  telemetryDiscoverySubmitting = false;
  selectedTelemetryMonitorIds = new Set<number>();
  currentQueryParams: Record<string, string | number> = {};
  owner?: string;
  system?: string;
  source?: string;
  sourceContext?: string;
  environment?: string;
  ownerContext?: string;
  systemContext?: string;
  environmentContext?: string;
  status?: string;
  ownerDraft = '';
  systemDraft?: string | null = null;
  sourceDraft?: string | null = null;
  environmentDraft?: string | null = null;
  statusDraft?: string | null = null;
  bulkOwnerDraft = '';
  bulkSystemDraft?: string | null = null;
  serverDiscoveryActivities: DiscoveryGovernanceActivity[] = [];
  localDiscoveryActivities: DiscoveryGovernanceActivity[] = readDiscoveryGovernanceActivities(8);
  serverGovernanceActivities: EntityDefinitionActivity[] = [];
  serverWorkspaceActivities: DefinitionImportActivity[] = [];
  governancePresets: DiscoveryGovernancePreset[] = readDiscoveryGovernancePresets(8);

  get discoveryWorkbenchTitle(): string {
    return this.translateOrFallback('entity.entry-source.telemetry', '遥测发现');
  }

  get discoveryWorkbenchCopy(): string {
    return this.translateOrFallback(
      'entity.discovery.workspace.copy',
      '先搜索一组需要治理的监控线索，再决定归并、补齐归属，还是送入定义工作台继续收口。'
    );
  }

  get discoveryRailGroups(): PlatformRailNavGroup[] {
    return [
      {
        key: 'telemetry',
        title: this.translateOrFallback('entity.entry-source.telemetry', '遥测发现'),
        items: [
          {
            key: 'all',
            label: this.translateOrFallback('entity.telemetry.discovery.scope.all', '全部'),
            icon: 'appstore',
            count: this.telemetryDiscoveryRows.length,
            active: this.telemetryDiscoveryScope === 'all'
          },
          {
            key: 'matched',
            label: this.translateOrFallback('entity.telemetry.discovery.scope.matched', '已匹配'),
            icon: 'link',
            count: this.telemetryDiscoveryMatchedCount,
            active: this.telemetryDiscoveryScope === 'matched'
          },
          {
            key: 'resolved',
            label: this.translateOrFallback('entity.telemetry.discovery.scope.resolved', '已归并'),
            icon: 'check-circle',
            count: this.telemetryDiscoveryResolvedCount,
            active: this.telemetryDiscoveryScope === 'resolved'
          },
          {
            key: 'new',
            label: this.translateOrFallback('entity.telemetry.discovery.scope.new', '建议新建'),
            icon: 'plus-circle',
            count: this.telemetryDiscoveryNewCount,
            active: this.telemetryDiscoveryScope === 'new'
          }
        ]
      }
    ];
  }
  governancePresetRegistrySource: 'shared' | 'local' | 'empty' = 'empty';
  presetNameDraft = '';
  definitionResumeToken?: string;
  definitionResumeHandledRowKey?: string;
  private lastLoadedQuery?: string;
  private governancePresetsMigrated = false;
  private discoveryActivitiesMigrated = false;
  private discoveryGovernanceHookSyncTimer?: ReturnType<typeof setTimeout>;
  private lastGovernanceHookActivitySignature?: string;
  private pendingWorkspaceRemedy?: DiscoveryWorkspaceRemedy;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private entitySvc: EntityService,
    private monitorSvc: MonitorService,
    private notifySvc: NzNotificationService,
    private cdr: ChangeDetectorRef,
    @Inject(ALAIN_I18N_TOKEN) private i18nSvc: I18NService
  ) {}

  ngOnInit(): void {
    this.loadCatalogSuggestions();
    this.loadGovernancePresets();
    this.loadDiscoveryGovernanceActivities();
    this.loadDefinitionWorkspaceActivities();
    this.loadServerGovernanceActivities();
    this.routeSub = this.route.queryParamMap.subscribe(params => {
      this.currentQueryParams = this.toCurrentQueryParams(params);
      const nextSearch = this.trimText(params.get('query') || undefined) || '';
      const nextScope = this.normalizeScope(params.get('scope'));
      this.owner = this.readQueryValue(params.get('owner'));
      this.system = this.readQueryValue(params.get('system'));
      this.source = this.readQueryValue(params.get('source'));
      this.ownerContext = this.readQueryValue(params.get('ownerContext'));
      this.systemContext = this.readQueryValue(params.get('systemContext'));
      this.sourceContext = this.readQueryValue(params.get('sourceContext'));
      this.environment = this.readQueryValue(params.get('environment'));
      this.environmentContext = this.readQueryValue(params.get('environmentContext'));
      this.status = this.readQueryValue(params.get('status'));
      this.definitionResumeToken = this.readQueryValue(params.get('resumeDefinitionToken'));
      this.definitionResumeHandledRowKey = this.readQueryValue(params.get('resumeHandledRowKey'));
      this.pendingWorkspaceRemedy = this.normalizeWorkspaceRemedy(params.get('remedy'));
      this.ownerDraft = this.owner || this.ownerContext || '';
      this.systemDraft = this.system || this.systemContext || null;
      this.sourceDraft = this.source || this.sourceContext || null;
      this.environmentDraft = this.environment || this.environmentContext || null;
      this.statusDraft = this.status || null;
      this.loadServerGovernanceActivities();
      const inputChanged = nextSearch !== this.telemetryDiscoverySearch;
      const searchChanged = nextSearch !== (this.lastLoadedQuery || '');
      const scopeChanged = nextScope !== this.telemetryDiscoveryScope;
      this.telemetryDiscoverySearch = nextSearch;
      this.telemetryDiscoveryScope = nextScope;
      if (nextSearch === '') {
        this.lastLoadedQuery = undefined;
        this.lastGovernanceHookActivitySignature = undefined;
        if (inputChanged || this.telemetryDiscoveryRows.length > 0) {
          this.telemetryDiscoveryRows = [];
          this.selectedTelemetryMonitorIds = new Set<number>();
        }
        this.runPendingWorkspaceRemedy();
        this.cdr.markForCheck();
        return;
      }
      if (searchChanged || this.telemetryDiscoveryRows.length === 0) {
        this.loadTelemetryDiscovery(nextSearch);
        return;
      }
      if (scopeChanged || this.hasGovernanceFilters) {
        this.scheduleDiscoveryGovernanceHookSync();
      }
      this.runPendingWorkspaceRemedy();
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
    if (this.discoveryGovernanceHookSyncTimer != null) {
      clearTimeout(this.discoveryGovernanceHookSyncTimer);
      this.discoveryGovernanceHookSyncTimer = undefined;
    }
  }

  get telemetryDiscoveryMatchedCount(): number {
    return this.telemetryDiscoveryRows.filter(row => row.candidates.length > 0).length;
  }

  get telemetryDiscoveryReviewCount(): number {
    return this.telemetryDiscoveryRows.filter(row => this.isTelemetryDiscoveryPendingReview(row)).length;
  }

  get telemetryDiscoveryNewCount(): number {
    return this.telemetryDiscoveryRows.filter(row => row.candidates.length === 0).length;
  }

  get telemetryDiscoveryResolvedCount(): number {
    return this.telemetryDiscoveryRows.filter(row => this.isTelemetryDiscoveryResolved(row)).length;
  }

  get telemetryDiscoveryIdentityReadyCount(): number {
    return this.telemetryDiscoveryRows.filter(row => row.identityMatches.length > 0).length;
  }

  get visibleTelemetryDiscoveryRows(): TelemetryDiscoveryRow[] {
    let rows = this.telemetryDiscoveryRows;
    switch (this.telemetryDiscoveryScope) {
      case 'resolved':
        rows = rows.filter(row => this.isTelemetryDiscoveryResolved(row));
        break;
      case 'matched':
        rows = rows.filter(row => row.candidates.length > 0);
        break;
      case 'new':
        rows = rows.filter(row => row.candidates.length === 0);
        break;
      default:
        break;
    }
    return rows.filter(row => this.matchesGovernanceFilters(row));
  }

  get selectedTelemetryDiscoveryCount(): number {
    return this.selectedTelemetryMonitorIds.size;
  }

  get selectedTelemetryDiscoveryNewCount(): number {
    return this.telemetryDiscoveryRows.filter(row => this.selectedTelemetryMonitorIds.has(row.monitor.id) && row.candidates.length === 0).length;
  }

  get selectedTelemetryDiscoveryMatchedCount(): number {
    return this.telemetryDiscoveryRows.filter(row => this.selectedTelemetryMonitorIds.has(row.monitor.id) && this.isTelemetryDiscoveryBindable(row)).length;
  }

  get discoveryIntakeQueueGroups(): DiscoveryIntakeQueueGroup[] {
    const rows = this.visibleTelemetryDiscoveryRows;
    if (rows.length === 0) {
      return [];
    }
    const groups: DiscoveryIntakeQueueGroup[] = [];
    const reviewRows = rows.filter(row => this.isTelemetryDiscoveryPendingReview(row));
    const mergeRows = rows.filter(row => this.isTelemetryDiscoveryBindable(row));
    const createRows = rows.filter(row => row.candidates.length === 0);
    const resolvedRows = rows.filter(row => this.isTelemetryDiscoveryResolved(row));
    if (reviewRows.length > 0) {
      groups.push({
        key: 'review',
        title: this.translateOrFallback('entity.telemetry.discovery.intake.review.title', '待确认目标实体'),
        summary: this.translateOrFallback(
          'entity.telemetry.discovery.intake.review.copy',
          `${reviewRows.length} 条线索命中了多个目录候选，先逐条确认目标实体，再执行归并。`
        ),
        actionLabel: this.translateOrFallback('entity.telemetry.discovery.intake.review.action', '逐条确认候选'),
        action: 'review',
        rows: reviewRows
      });
    }
    if (mergeRows.length > 0) {
      groups.push({
        key: 'merge',
        title: this.translateOrFallback('entity.telemetry.discovery.intake.merge.title', '待归并到现有实体'),
        summary: this.translateOrFallback(
          'entity.telemetry.discovery.intake.merge.copy',
          `${mergeRows.length} 条线索已经确认了目录候选，可以直接批量归并。`
        ),
        actionLabel: this.translateOrFallback('entity.telemetry.discovery.intake.merge.action', '全选可归并'),
        action: 'select-merge',
        rows: mergeRows
      });
    }
    if (createRows.length > 0) {
      groups.push({
        key: 'create',
        title: this.translateOrFallback('entity.telemetry.discovery.intake.create.title', '待新建目录实体'),
        summary: this.translateOrFallback(
          'entity.telemetry.discovery.intake.create.copy',
          `${createRows.length} 条线索还没有目录候选，适合送去定义工作台或直接批量创建。`
        ),
        actionLabel: this.translateOrFallback('entity.telemetry.discovery.intake.create.action', '全选建议新建'),
        action: 'select-create',
        rows: createRows
      });
    }
    if (resolvedRows.length > 0) {
      groups.push({
        key: 'resolved',
        title: this.translateOrFallback('entity.telemetry.discovery.intake.resolved.title', '已归并到目录'),
        summary: this.translateOrFallback(
          'entity.telemetry.discovery.intake.resolved.copy',
          `${resolvedRows.length} 条线索已经归并完成，后续可以直接打开发现到的实体继续补目录信息。`
        ),
        actionLabel: this.translateOrFallback('entity.telemetry.discovery.intake.resolved.action', '查看已处理线索'),
        action: 'resolved',
        rows: resolvedRows
      });
    }
    return groups;
  }

  get ownerSuggestions(): string[] {
    return this.catalogSuggestions.owners.slice(0, 8);
  }

  get systemSuggestions(): string[] {
    return this.catalogSuggestions.systems.slice(0, 8);
  }

  get environmentSuggestions(): string[] {
    return this.catalogSuggestions.environments.slice(0, 8);
  }

  get hasGovernanceFilters(): boolean {
    return this.owner != null || this.system != null || this.source != null || this.environment != null || this.status != null;
  }

  get hasGovernanceDraftValues(): boolean {
    return (
      this.trimText(this.ownerDraft) != null ||
      this.trimText(this.systemDraft || undefined) != null ||
      this.trimText(this.sourceDraft || undefined) != null ||
      this.trimText(this.environmentDraft || undefined) != null ||
      this.trimText(this.statusDraft || undefined) != null
    );
  }

  get hasBulkGovernanceOverrides(): boolean {
    return this.trimText(this.bulkOwnerDraft) != null || this.trimText(this.bulkSystemDraft || undefined) != null;
  }

  get bulkGovernanceOverrideSummary(): Array<{ label: string; value: string }> {
    const entries: Array<{ label: string; value: string }> = [];
    const owner = this.trimText(this.bulkOwnerDraft);
    const system = this.trimText(this.bulkSystemDraft || undefined);
    if (owner != null) {
      entries.push({
        label: this.translateOrFallback('entity.field.owner', '负责人'),
        value: owner
      });
    }
    if (system != null) {
      entries.push({
        label: this.translateOrFallback('entity.field.system', '系统'),
        value: system
      });
    }
    return entries;
  }

  get preferredGovernancePreset(): DiscoveryGovernancePreset | undefined {
    return this.governancePresets.find(preset => this.isGovernancePresetActive(preset)) || this.governancePresets[0];
  }

  get preferredGovernancePresetConflictCount(): number {
    const preset = this.preferredGovernancePreset;
    if (preset == null) {
      return 0;
    }
    return this.visibleTelemetryDiscoveryRows.filter(row => this.getGovernancePresetConflictFieldsForRow(row, preset).length > 0).length;
  }

  get governancePresetConflictRollups(): Array<{ field: GovernanceConflictField; label: string; count: number }> {
    const preset = this.preferredGovernancePreset;
    if (preset == null) {
      return [];
    }
    const counters = new Map<GovernanceConflictField, number>();
    this.visibleTelemetryDiscoveryRows.forEach(row => {
      this.getGovernancePresetConflictFieldsForRow(row, preset).forEach(field => {
        counters.set(field, (counters.get(field) || 0) + 1);
      });
    });
    return (['owner', 'system', 'environment', 'source', 'status'] as GovernanceConflictField[])
      .map(field => ({ field, label: this.getGovernanceFieldLabel(field), count: counters.get(field) || 0 }))
      .filter(item => item.count > 0);
  }

  get hasGovernancePresetConflictSummary(): boolean {
    return this.preferredGovernancePreset != null && this.visibleTelemetryDiscoveryRows.length > 0;
  }

  get discoveryGovernancePolicyCards(): DiscoveryGovernancePolicyCard[] {
    const cards: DiscoveryGovernancePolicyCard[] = [];
    const registrySignal = this.getDiscoveryRegistrySignal();
    if (requiresGovernanceRegistryRemediation(registrySignal)) {
      const registryPolicy = buildGovernanceRegistryPolicyPresentation(registrySignal, this.translateOrFallback.bind(this));
      cards.push({
        key: 'registry',
        title: registryPolicy.title,
        summary: registryPolicy.summary,
        actionLabel: this.getDiscoveryRegistryActionLabel(registrySignal),
        action: this.getDiscoveryRegistryAction(registrySignal)
      });
    }
    const rows = this.visibleTelemetryDiscoveryRows;
    const total = rows.length;
    if (total === 0) {
      return cards;
    }
    const preferredPreset = this.preferredGovernancePreset;
    const presetConflictCount =
      preferredPreset == null ? 0 : rows.filter(row => this.getGovernancePresetConflictFieldsForRow(row, preferredPreset).length > 0).length;
    const ownershipReadyCount = rows.filter(
      row => this.trimText(this.getRowOwner(row)) != null && this.trimText(this.getRowSystem(row)) != null
    ).length;
    const definitionReadyCount = rows.filter(row => this.isTelemetryDraftDefinitionReady(row)).length;
    const telemetryReadyCount = rows.filter(row => row.identityMatches.length > 0).length;

    if (preferredPreset != null && presetConflictCount > 0) {
      cards.push({
        key: 'preset',
        title: this.translateOrFallback('entity.discovery.policy.preset.title', '收紧共享预设偏差'),
        summary: this.translateOrFallback(
          'entity.discovery.policy.preset.copy',
          `${presetConflictCount} 条线索和共享治理预设 ${preferredPreset.name} 还未对齐，建议先沿预设收口 owner、system、environment 和 source。`
        ),
        actionLabel: this.translateOrFallback('entity.detail.policy.preset.action', '按预设继续治理'),
        action: 'preset',
        preset: preferredPreset
      });
    }

    if (ownershipReadyCount < total) {
      cards.push({
        key: 'ownership',
        title: this.translateOrFallback('entity.discovery.policy.ownership.title', '先补齐归属基线'),
        summary: this.translateOrFallback(
          'entity.discovery.policy.ownership.copy',
          `${total - ownershipReadyCount} 条线索还缺负责人或所属系统，建议先在 discovery 阶段批量补齐，再继续归并。`
        ),
        actionLabel: this.translateOrFallback('entity.discovery.hooks.ownership.action', '补齐归属字段'),
        action: 'ownership',
        preset: preferredPreset
      });
    }

    if (definitionReadyCount < total) {
      cards.push({
        key: 'definition',
        title: this.translateOrFallback('entity.discovery.policy.definition.title', '把成熟线索推到定义工作台'),
        summary: this.translateOrFallback(
          'entity.discovery.policy.definition.copy',
          `${total - definitionReadyCount} 条线索还不能直接变成 bundle 级定义，建议先补齐目录字段，再进入定义工作台。`
        ),
        actionLabel: this.translateOrFallback('entity.discovery.hooks.definition.action', '进入定义工作台'),
        action: 'definition',
        preset: preferredPreset
      });
    }

    if (telemetryReadyCount < total) {
      cards.push({
        key: 'telemetry',
        title: this.translateOrFallback('entity.discovery.policy.telemetry.title', '继续收紧遥测识别'),
        summary: this.translateOrFallback(
          'entity.discovery.policy.telemetry.copy',
          `${total - telemetryReadyCount} 条线索还缺稳定身份标识，建议先补齐遥测识别，再决定归并还是新建。`
        ),
        actionLabel: this.translateOrFallback('entity.discovery.hooks.telemetry.action', '继续发现治理'),
        action: 'telemetry',
        preset: preferredPreset
      });
    }

    return cards.slice(0, 3);
  }

  get discoveryGovernanceHookCards(): DiscoveryGovernanceHookCard[] {
    const rows = this.visibleTelemetryDiscoveryRows;
    const total = rows.length;
    const registrySignal = this.getDiscoveryRegistrySignal();
    const registryCard: DiscoveryGovernanceHookCard = {
      key: 'registry',
      title: this.translateOrFallback('entity.governance.registry.signal.title', '共享目录状态'),
      metric: registrySignal.metric,
      summary: registrySignal.summary,
      priority: registrySignal.priority,
      priorityLabel: registrySignal.priorityLabel,
      nextStep: registrySignal.nextStep,
      actionLabel: this.getDiscoveryRegistryActionLabel(registrySignal),
      action: this.getDiscoveryRegistryAction(registrySignal)
    };
    if (total === 0) {
      return [registryCard];
    }
    const preferredPreset = this.preferredGovernancePreset;
    const presetAlignedCount =
      preferredPreset == null ? 0 : rows.filter(row => this.getGovernancePresetConflictFieldsForRow(row, preferredPreset).length === 0).length;
    const ownershipReadyCount = rows.filter(
      row => this.trimText(this.getRowOwner(row)) != null && this.trimText(this.getRowSystem(row)) != null
    ).length;
    const definitionReadyCount = rows.filter(row => this.isTelemetryDraftDefinitionReady(row)).length;
    const telemetryReadyCount = rows.filter(row => row.identityMatches.length > 0).length;
    const cards: Array<Omit<DiscoveryGovernanceHookCard, 'priority' | 'priorityLabel' | 'nextStep'>> = [
      {
        key: 'preset',
        title: this.translateOrFallback('entity.list.hooks.preset.title', '共享预设对齐'),
        metric: `${presetAlignedCount}/${total}`,
        summary:
          preferredPreset != null
            ? this.translateOrFallback(
                'entity.discovery.hooks.preset.copy',
                `${presetAlignedCount} 条线索已经与共享预设 ${preferredPreset.name} 对齐，后续可直接沿用这组治理口径继续归并。`
              )
            : this.translateOrFallback('entity.discovery.hooks.preset.empty', '当前工作台还没有共享治理预设，建议先沉淀 owner/system/source 组合。'),
        actionLabel: this.translateOrFallback('entity.discovery.hooks.preset.action', '按预设继续治理'),
        action: preferredPreset != null ? 'preset' : 'telemetry',
        preset: preferredPreset
      },
      {
        key: 'ownership',
        title: this.translateOrFallback('entity.list.hooks.ownership.title', '归属基线'),
        metric: `${ownershipReadyCount}/${total}`,
        summary: this.translateOrFallback(
          'entity.discovery.hooks.ownership.copy',
          '负责人和所属系统已经能在 discovery 阶段提前收敛，后续进入目录时就不需要再逐条补齐。'
        ),
        actionLabel: this.translateOrFallback('entity.discovery.hooks.ownership.action', '补齐归属字段'),
        action: 'ownership',
        preset: preferredPreset
      },
      {
        key: 'definition',
        title: this.translateOrFallback('entity.list.hooks.definition.title', '定义治理'),
        metric: `${definitionReadyCount}/${total}`,
        summary: this.translateOrFallback(
          'entity.discovery.hooks.definition.copy',
          '已经具备基础目录字段和遥测身份的线索，可以直接推到定义工作台做 bundle 级治理。'
        ),
        actionLabel: this.translateOrFallback('entity.discovery.hooks.definition.action', '进入定义工作台'),
        action: 'definition',
        preset: preferredPreset
      },
      {
        key: 'telemetry',
        title: this.translateOrFallback('entity.list.hooks.telemetry.title', '证据收敛'),
        metric: `${telemetryReadyCount}/${total}`,
        summary: this.translateOrFallback(
          'entity.discovery.hooks.telemetry.copy',
          '身份标识已经能作为统一证据入口，后续归并、采纳和来源治理都会围绕同一批遥测线索展开。'
        ),
        actionLabel: this.translateOrFallback('entity.discovery.hooks.telemetry.action', '回到线索视图'),
        action: 'telemetry',
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

  get workspaceGuidanceHeadline(): string {
    switch (this.workspaceGuidanceScenario) {
      case 'ownership':
        return this.translateOrFallback('entity.discovery.guidance.headline.ownership', '下一步：先补充负责人和系统归属');
      case 'review':
        return this.translateOrFallback('entity.discovery.guidance.headline.review', '下一步：先确认归并目标');
      case 'merge':
        return this.translateOrFallback('entity.discovery.guidance.headline.merge', '下一步：先归并已命中的目录线索');
      case 'create':
        return this.translateOrFallback('entity.discovery.guidance.headline.create', '下一步：先把建议新建的线索送入定义工作台');
      case 'definition-resume':
        return this.translateOrFallback('entity.discovery.guidance.headline.definition', '下一步：返回定义工作台继续收口');
      case 'resolved':
        return this.translateOrFallback('entity.discovery.guidance.headline.resolved', '下一步：查看已归并线索并回到目录收口');
      case 'search':
      default:
        return this.translateOrFallback('entity.discovery.guidance.headline.search', '下一步：先搜索一组需要治理的监控线索');
    }
  }

  get workspaceGuidanceDescription(): string {
    switch (this.workspaceGuidanceScenario) {
      case 'ownership':
        return this.translateOrFallback(
          'entity.discovery.guidance.description.ownership',
          `${this.workspaceGuidanceOwnershipGapCount} 条线索还缺少负责人或系统归属。先补齐基础归属，再决定归并还是进入定义工作台。`
        );
      case 'review':
        return this.translateOrFallback(
          'entity.discovery.guidance.description.review',
          `${this.workspaceGuidancePendingReviewCount} 条线索命中了多个目录候选。先确认目标实体，再继续批量处理。`
        );
      case 'merge':
        return this.translateOrFallback(
          'entity.discovery.guidance.description.merge',
          `${this.workspaceGuidanceBindableCount} 条线索已经命中目录候选。先完成归并，再回到目录补齐定义信息。`
        );
      case 'create':
        return this.translateOrFallback(
          'entity.discovery.guidance.description.create',
          `${this.workspaceGuidanceCreatableCount} 条线索还没有目录候选。建议先送入定义工作台统一整理，再决定是否批量创建。`
        );
      case 'definition-resume':
        return this.translateOrFallback(
          'entity.discovery.guidance.description.definition',
          '当前 discovery 没有更靠前的阻塞项，可以带着这批上下文回到定义工作台继续收口。'
        );
      case 'resolved':
        return this.translateOrFallback(
          'entity.discovery.guidance.description.resolved',
          '当前可见线索已经归并完成，可以返回实体目录检查结果，或继续处理下一批遥测线索。'
        );
      case 'search':
      default:
        return this.translateOrFallback(
          'entity.discovery.guidance.description.search',
          '先搜索一组监控或资源标识，系统会把线索分成待确认、待归并、建议新建和已归并四类，方便你从最关键的一步开始。'
        );
    }
  }

  get workspaceGuidancePrimaryAction(): WorkspaceGuidanceAction | undefined {
    switch (this.workspaceGuidanceScenario) {
      case 'ownership':
        return {
          key: 'focus-ownership',
          label: this.translateOrFallback('entity.discovery.guidance.action.ownership', '补充负责人和系统归属'),
          tone: 'primary'
        };
      case 'review':
        return {
          key: 'review',
          label: this.translateOrFallback('entity.discovery.guidance.action.review', '确认目标实体'),
          tone: 'primary'
        };
      case 'merge':
        return {
          key: 'select-merge',
          label: this.translateOrFallback('entity.discovery.guidance.action.merge', '查看待归并线索'),
          tone: 'primary'
        };
      case 'create':
        return {
          key: 'open-definition',
          label: this.translateOrFallback('entity.discovery.guidance.action.definition', '进入定义工作台'),
          tone: 'primary'
        };
      case 'definition-resume':
        return {
          key: 'definition-resume',
          label: this.translateOrFallback('entity.definition.workspace.resume', '返回定义工作台'),
          tone: 'primary'
        };
      case 'resolved':
        return {
          key: 'resolved',
          label: this.translateOrFallback('entity.discovery.guidance.action.resolved', '查看已处理线索'),
          tone: 'primary'
        };
      case 'search':
      default:
        return {
          key: 'create-definition',
          label: this.translateOrFallback('entity.action.create-definition', '从定义创建'),
          tone: 'primary'
        };
    }
  }

  get workspaceGuidanceSecondaryAction(): WorkspaceGuidanceAction | undefined {
    const primaryKey = this.workspaceGuidancePrimaryAction?.key;
    const secondary = this.buildWorkspaceGuidanceActionCandidates().find(action => action.key !== primaryKey);
    if (secondary == null) {
      return undefined;
    }
    return {
      key: secondary.key,
      label: secondary.label,
      tone: 'default'
    };
  }

  get workspaceGuidanceReasons(): WorkspaceGuidanceReason[] {
    const reasons: WorkspaceGuidanceReason[] = [
      {
        label: this.translateOrFallback('entity.discovery.guidance.reason.scope', '当前范围'),
        value: this.translateOrFallback(`entity.telemetry.discovery.scope.${this.telemetryDiscoveryScope}`, this.telemetryDiscoveryScope)
      },
      {
        label: this.translateOrFallback('entity.discovery.guidance.reason.visible', '待处理线索'),
        value: String(this.visibleTelemetryDiscoveryRows.length)
      }
    ];

    if (this.workspaceGuidanceOwnershipGapCount > 0) {
      reasons.push({
        label: this.translateOrFallback('entity.discovery.guidance.reason.ownership', '待补归属'),
        value: String(this.workspaceGuidanceOwnershipGapCount)
      });
      return reasons;
    }
    if (this.workspaceGuidancePendingReviewCount > 0) {
      reasons.push({
        label: this.translateOrFallback('entity.discovery.guidance.reason.review', '待确认候选'),
        value: String(this.workspaceGuidancePendingReviewCount)
      });
      return reasons;
    }
    if (this.preferredGovernancePreset != null) {
      reasons.push({
        label: this.translateOrFallback('entity.discovery.guidance.reason.preset', '预设偏差'),
        value: String(this.preferredGovernancePresetConflictCount)
      });
      return reasons;
    }

    reasons.push({
      label: this.translateOrFallback('entity.discovery.guidance.reason.definition', '可进入定义'),
      value: String(this.workspaceGuidanceCreatableCount)
    });
    return reasons;
  }

  get workspaceGuidanceNextLinks(): WorkspaceGuidanceLink[] {
    const primaryKey = this.workspaceGuidancePrimaryAction?.key;
    return this.buildWorkspaceGuidanceActionCandidates()
      .filter(action => action.key !== primaryKey)
      .slice(0, 3)
      .map(action => ({
        key: action.key,
        label: action.label,
        description: action.description
      }));
  }

  get showDiscoveryActivityPanel(): boolean {
    return this.serverGovernanceActivities.length > 0 || this.serverDiscoveryActivities.length > 0 || this.unsharedLocalDiscoveryActivities.length > 0;
  }

  get latestSharedDiscoveryGovernanceHookActivity(): DiscoveryGovernanceActivity | undefined {
    return this.serverDiscoveryActivities.find(activity => this.isGovernanceHookDiscoveryActivity(activity));
  }

  get latestSharedDefinitionGovernanceHookActivity(): DefinitionImportActivity | undefined {
    return this.serverWorkspaceActivities.find(activity => this.isGovernanceHookWorkspaceActivity(activity));
  }

  get discoverySharedGovernanceSnapshots(): DiscoverySharedGovernanceSnapshotCard[] {
    const snapshots: DiscoverySharedGovernanceSnapshotCard[] = [];
    const discovery = this.latestSharedDiscoveryGovernanceHookActivity;
    if (discovery != null) {
      snapshots.push({
        key: 'discovery',
        title: this.translateOrFallback('entity.list.snapshot.discovery.title', '发现工作台共享快照'),
        status: discovery.status,
        summary: discovery.summary,
        detail: this.trimText(discovery.detail),
        happenedAt: this.normalizeLifecycleTimestamp(discovery.happenedAt),
        actionLabel: this.translateOrFallback('entity.discovery.hooks.ownership.action', '补齐归属字段'),
        action: 'discovery'
      });
    }
    const definition = this.latestSharedDefinitionGovernanceHookActivity;
    if (definition != null) {
      snapshots.push({
        key: 'definition',
        title: this.translateOrFallback('entity.list.snapshot.definition.title', '定义工作台共享快照'),
        status: definition.status,
        summary: definition.summary,
        detail: this.trimText(definition.detail),
        happenedAt: this.normalizeLifecycleTimestamp(definition.happenedAt),
        actionLabel: this.translateOrFallback('entity.definition.workspace.hooks.ownership.action', '补齐治理字段'),
        action: 'definition'
      });
    }
    return snapshots.sort((left, right) => this.compareDiscoveryTimestamps(left.happenedAt, right.happenedAt));
  }

  get unsharedLocalDiscoveryActivities(): DiscoveryGovernanceActivity[] {
    return this.localDiscoveryActivities.filter(
      activity => !this.serverDiscoveryActivities.some(serverActivity => serverActivity.id === activity.id)
    );
  }

  get discoveryLifecycleRecords(): DiscoveryLifecycleRecord[] {
    const records: DiscoveryLifecycleRecord[] = [];
    const registrySignal = this.getDiscoveryRegistrySignal();
    const scopeParts = [
      this.trimText(this.telemetryDiscoverySearch),
      this.owner,
      this.system,
      this.environment,
      this.source ? this.translateOrFallback(`entity.source.${this.source}`, this.humanize(this.source)) : undefined,
      this.status ? this.translateOrFallback(`entity.status.${this.status}`, this.humanize(this.status)) : undefined,
      registrySignal.metric,
      this.getGovernanceRegistrySummary()
    ].filter((value): value is string => this.trimText(value) != null);
    records.push({
      id: 'scope',
      title: this.translateOrFallback('entity.telemetry.discovery.scope', '当前治理范围'),
      summary:
        this.trimText(this.telemetryDiscoverySearch) != null
          ? this.translateOrFallback('entity.telemetry.discovery.scope.summary', '当前工作台围绕这组遥测线索持续治理。')
          : this.translateOrFallback('entity.telemetry.discovery.scope.empty', '当前工作台正在等待新的监控线索。'),
      detail: scopeParts.length > 0 ? scopeParts.join(' · ') : undefined
    });

    const latestSharedSnapshot = this.discoverySharedGovernanceSnapshots[0];
    if (latestSharedSnapshot != null) {
      records.push({
        id: `snapshot:${latestSharedSnapshot.key}`,
        title: this.translateOrFallback('entity.detail.snapshot.title', '共享目录状态'),
        summary: latestSharedSnapshot.summary,
        detail: this.joinDiscoveryDetail(
          this.getDiscoverySharedGovernanceSnapshotMeta(latestSharedSnapshot),
          registrySignal.metric,
          this.getGovernanceRegistrySummary(),
          latestSharedSnapshot.detail
        ),
        happenedAt: latestSharedSnapshot.happenedAt,
        actionLabel: latestSharedSnapshot.actionLabel,
        action: latestSharedSnapshot.key === 'definition' ? 'snapshot-definition' : 'snapshot-discovery'
      });
    }

    const latestServerActivity = this.serverGovernanceActivities[0];
    if (latestServerActivity != null) {
      records.push({
        id: `server:${latestServerActivity.id}`,
        title: this.getServerGovernanceActivityTitle(latestServerActivity),
        summary: latestServerActivity.summary,
        detail: this.trimText(latestServerActivity.detail),
        happenedAt: latestServerActivity.gmtCreate == null ? undefined : String(latestServerActivity.gmtCreate),
        actionLabel: latestServerActivity.entityId
          ? this.translateOrFallback('entity.telemetry.discovery.activity.view-entity', '查看实体')
          : undefined,
        action: latestServerActivity.entityId ? 'entity' : undefined,
        entityId: latestServerActivity.entityId
      });
    }

    const latestActivity = this.serverDiscoveryActivities[0] || this.unsharedLocalDiscoveryActivities[0];
    if (latestActivity != null) {
      records.push({
        id: `activity:${latestActivity.id}`,
        title: this.translateOrFallback('entity.detail.lifecycle.discovery', '归并治理'),
        summary: latestActivity.summary,
        detail: this.trimText(latestActivity.detail),
        happenedAt: this.normalizeLifecycleTimestamp(latestActivity.happenedAt),
        actionLabel:
          latestActivity.workspacePath != null
            ? this.translateOrFallback('entity.discovery.activity.resume', '继续处理')
            : latestActivity.entityRefs?.length
              ? this.translateOrFallback('entity.telemetry.discovery.activity.view-entity', '查看实体')
              : undefined,
        action: latestActivity.workspacePath != null ? 'workspace' : latestActivity.entityRefs?.length ? 'entity' : undefined,
        entityId: latestActivity.entityRefs?.[0]?.entityId
      });
    }
    return records;
  }

  get canSaveGovernancePreset(): boolean {
    return this.trimText(this.presetNameDraft) != null && (this.hasGovernanceDraftValues || this.hasBulkGovernanceOverrides);
  }

  private joinDiscoveryDetail(...segments: Array<string | undefined>): string | undefined {
    const values = segments.filter((value): value is string => this.trimText(value) != null);
    const unique = values.filter((value, index, all) => all.indexOf(value) === index);
    return unique.length > 0 ? unique.join(' · ') : undefined;
  }

  private get workspaceGuidanceScenario(): 'search' | 'ownership' | 'review' | 'merge' | 'create' | 'definition-resume' | 'resolved' {
    if (this.visibleTelemetryDiscoveryRows.length === 0) {
      return this.definitionResumeToken ? 'definition-resume' : 'search';
    }
    if (this.workspaceGuidanceOwnershipGapCount > 0) {
      return 'ownership';
    }
    if (this.workspaceGuidancePendingReviewCount > 0) {
      return 'review';
    }
    if (this.workspaceGuidanceBindableCount > 0) {
      return 'merge';
    }
    if (this.workspaceGuidanceCreatableCount > 0) {
      return 'create';
    }
    if (this.definitionResumeToken) {
      return 'definition-resume';
    }
    return 'resolved';
  }

  private get workspaceGuidanceOwnershipGapCount(): number {
    return this.visibleTelemetryDiscoveryRows.filter(row => this.hasTelemetryDraftOwnershipGap(row)).length;
  }

  private get workspaceGuidancePendingReviewCount(): number {
    return this.visibleTelemetryDiscoveryRows.filter(row => this.isTelemetryDiscoveryPendingReview(row)).length;
  }

  private get workspaceGuidanceBindableCount(): number {
    return this.visibleTelemetryDiscoveryRows.filter(row => this.isTelemetryDiscoveryBindable(row)).length;
  }

  private get workspaceGuidanceCreatableCount(): number {
    return this.visibleTelemetryDiscoveryRows.filter(row => row.candidates.length === 0).length;
  }

  private buildWorkspaceGuidanceActionCandidates(): Array<WorkspaceGuidanceLink & { key: string }> {
    const primaryKey = this.workspaceGuidancePrimaryAction?.key;
    const actions: Array<WorkspaceGuidanceLink & { key: string }> = [];
    const addAction = (key: string, label: string, description: string): void => {
      if (key === primaryKey || actions.some(action => action.key === key)) {
        return;
      }
      actions.push({ key, label, description });
    };

    if (this.definitionResumeToken) {
      addAction(
        'definition-resume',
        this.translateOrFallback('entity.definition.workspace.resume', '返回定义工作台'),
        this.translateOrFallback(
          'entity.discovery.guidance.next.definition',
          '保留当前 discovery 上下文，回到定义工作台继续处理 bundle 导入和目录收口。'
        )
      );
    }
    if (this.workspaceGuidancePendingReviewCount > 0) {
      addAction(
        'review',
        this.translateOrFallback('entity.discovery.guidance.action.review', '确认目标实体'),
        this.translateOrFallback(
          'entity.discovery.guidance.next.review',
          '优先处理命中多个候选的线索，避免后续批量归并时选错目标实体。'
        )
      );
    }
    if (this.workspaceGuidanceBindableCount > 0) {
      addAction(
        'select-merge',
        this.translateOrFallback('entity.discovery.guidance.action.merge', '查看待归并线索'),
        this.translateOrFallback(
          'entity.discovery.guidance.next.merge',
          '聚焦已经命中目录候选的线索，先完成归并，再继续补齐定义信息。'
        )
      );
    }
    if (this.workspaceGuidanceCreatableCount > 0) {
      addAction(
        'open-definition',
        this.translateOrFallback('entity.discovery.guidance.action.definition', '进入定义工作台'),
        this.translateOrFallback(
          'entity.discovery.guidance.next.create',
          '把建议新建的线索送到定义工作台统一整理，再决定是否批量创建实体。'
        )
      );
    }
    if (this.preferredGovernancePreset != null && this.preferredGovernancePresetConflictCount > 0) {
      addAction(
        'continue-preferred',
        this.translateOrFallback('entity.detail.policy.preset.action', '按预设继续治理'),
        this.translateOrFallback(
          'entity.discovery.guidance.next.preset',
          '继续沿当前共享预设收口 owner、system、environment 和 source 的统一口径。'
        )
      );
    }
    if (this.visibleTelemetryDiscoveryRows.length > 0) {
      addAction(
        'focus-results',
        this.translateOrFallback('entity.discovery.guidance.action.results', '查看当前线索'),
        this.translateOrFallback(
          'entity.discovery.guidance.next.results',
          '回到线索列表查看已匹配、建议新建和已归并的当前分布。'
        )
      );
    }
    addAction(
      'open-catalog',
      this.translateOrFallback('entity.list.kicker', '实体目录'),
      this.translateOrFallback(
        'entity.discovery.guidance.next.catalog',
        '返回实体目录，查看已经收口完成的实体结果和统一目录状态。'
      )
    );
    return actions;
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

  private getDiscoveryRegistrySignal(): GovernanceRegistrySignalPresentation {
    return buildGovernanceRegistrySignalPresentation(
      this.governancePresetRegistrySource,
      this.discoverySharedGovernanceSnapshots[0]?.happenedAt,
      this.translateOrFallback.bind(this)
    );
  }

  private getDiscoveryRegistryAction(card: GovernanceRegistrySignalPresentation): DiscoveryGovernanceHookCard['action'] {
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

  private getDiscoveryRegistryActionLabel(card: GovernanceRegistrySignalPresentation): string {
    switch (card.state) {
      case 'local-fallback':
        return this.translateOrFallback('entity.governance.registry.sync', '同步到共享目录');
      case 'missing':
        return this.translateOrFallback('entity.governance.registry.seed', '先建立共享基线');
      case 'shared-fresh':
      case 'shared-stale':
      default:
        return this.translateOrFallback('entity.governance.registry.refresh', '刷新共享目录');
    }
  }

  get canSyncGovernancePresetRegistry(): boolean {
    return this.governancePresetRegistrySource === 'local' && readDiscoveryGovernancePresets(8).length > 0;
  }

  refreshGovernancePresetRegistry(): void {
    this.loadGovernancePresets();
    this.recordDiscoveryActivity({
      id: `discovery-registry-refresh-${Date.now()}`,
      happenedAt: new Date().toISOString(),
      status: 'info',
      action: 'policy-hook',
      summary: this.translateOrFallback('entity.governance.registry.refresh.activity', '已刷新共享治理目录'),
      detail: this.getGovernanceRegistrySummary(),
      workspacePath: this.router.createUrlTree(['/entities', 'discovery'], { queryParams: { ...this.currentQueryParams } }).toString()
    });
    this.notifySvc.success(
      this.translateOrFallback('entity.entry-source.telemetry', 'Telemetry Discovery'),
      this.translateOrFallback('entity.governance.registry.refresh.success', '已尝试从共享目录刷新治理预设。')
    );
  }

  syncGovernancePresetRegistry(): void {
    const localPresets = readDiscoveryGovernancePresets(8);
    if (localPresets.length === 0) {
      this.notifySvc.warning(
        this.translateOrFallback('entity.entry-source.telemetry', 'Telemetry Discovery'),
        this.translateOrFallback('entity.governance.registry.sync.empty', '当前没有可同步的本地治理预设。')
      );
      return;
    }
    forkJoin(
      localPresets.map(preset => this.entitySvc.saveDiscoveryGovernancePreset(preset).pipe(catchError(() => of(undefined))))
    ).subscribe({
      next: results => {
        const syncedCount = results.filter(result => result?.code === 0).length;
        this.loadGovernancePresets();
        this.recordDiscoveryActivity({
          id: `discovery-registry-sync-${Date.now()}`,
          happenedAt: new Date().toISOString(),
          status: syncedCount > 0 ? 'success' : 'warning',
          action: 'policy-hook',
          summary:
            syncedCount > 0
              ? this.translateOrFallback('entity.governance.registry.sync.activity', '已将本地治理预设同步到共享目录')
              : this.translateOrFallback('entity.governance.registry.sync.warning', '共享目录当前不可写，仍保留本地回退。'),
          detail: [
            this.getGovernanceRegistrySummary(),
            syncedCount > 0 ? `${syncedCount} ${this.translateOrFallback('entity.discovery.preset.shared-title', '共享治理预设')}` : undefined
          ]
            .filter((value): value is string => this.trimText(value) != null)
            .join(' · '),
          workspacePath: this.router.createUrlTree(['/entities', 'discovery'], { queryParams: { ...this.currentQueryParams } }).toString()
        });
        if (syncedCount > 0) {
          this.notifySvc.success(
            this.translateOrFallback('entity.entry-source.telemetry', 'Telemetry Discovery'),
            this.translateOrFallback('entity.governance.registry.sync.success', '本地治理预设已同步到共享目录。')
          );
          return;
        }
        this.notifySvc.warning(
          this.translateOrFallback('entity.entry-source.telemetry', 'Telemetry Discovery'),
          this.translateOrFallback('entity.governance.registry.sync.warning', '共享目录当前不可写，仍保留本地回退。')
        );
      },
      error: () => {
        this.notifySvc.warning(
          this.translateOrFallback('entity.entry-source.telemetry', 'Telemetry Discovery'),
          this.translateOrFallback('entity.governance.registry.sync.warning', '共享目录当前不可写，仍保留本地回退。')
        );
      }
    });
  }

  runTelemetryDiscovery(): void {
    const query = this.trimText(this.telemetryDiscoverySearch) || null;
    const scope = this.telemetryDiscoveryScope === 'all' ? null : this.telemetryDiscoveryScope;
    const owner = this.trimText(this.ownerDraft) || null;
    const system = this.trimText(this.systemDraft || undefined) || null;
    const source = this.trimText(this.sourceDraft || undefined) || null;
    const environment = this.trimText(this.environmentDraft || undefined) || null;
    const status = this.trimText(this.statusDraft || undefined) || null;
    if (
      (this.currentQueryParams.query || null) === query &&
      (this.currentQueryParams.scope || null) === scope &&
      (this.currentQueryParams.owner || null) === owner &&
      (this.currentQueryParams.system || null) === system &&
      (this.currentQueryParams.source || null) === source &&
      (this.currentQueryParams.environment || null) === environment &&
      (this.currentQueryParams.status || null) === status
    ) {
      if (query == null) {
        this.telemetryDiscoveryRows = [];
        this.selectedTelemetryMonitorIds = new Set<number>();
        this.cdr.markForCheck();
        return;
      }
      this.loadTelemetryDiscovery(query);
      return;
    }
    this.syncRoute({ query, scope, owner, system, source, environment, status });
  }

  clearTelemetryDiscovery(): void {
    this.telemetryDiscoverySearch = '';
    this.syncRoute({
      query: null,
      scope: null
    });
  }

  applyGovernanceFilters(): void {
    this.syncRoute({
      owner: this.trimText(this.ownerDraft) || null,
      system: this.trimText(this.systemDraft || undefined) || null,
      source: this.trimText(this.sourceDraft || undefined) || null,
      environment: this.trimText(this.environmentDraft || undefined) || null,
      status: this.trimText(this.statusDraft || undefined) || null
    });
  }

  clearGovernanceFilters(): void {
    this.ownerDraft = '';
    this.systemDraft = null;
    this.sourceDraft = null;
    this.environmentDraft = null;
    this.statusDraft = null;
    this.syncRoute({
      owner: null,
      system: null,
      source: null,
      environment: null,
      status: null
    });
  }

  saveGovernancePreset(): void {
    const name = this.trimText(this.presetNameDraft);
    if (name == null) {
      return;
    }
    const preset: DiscoveryGovernancePreset = {
      id: this.governancePresets.find(item => item.name === name)?.id || `preset-${Date.now()}`,
      name,
      owner: this.trimText(this.ownerDraft),
      system: this.trimText(this.systemDraft || undefined),
      source: this.trimText(this.sourceDraft || undefined),
      environment: this.trimText(this.environmentDraft || undefined),
      status: this.trimText(this.statusDraft || undefined),
      bulkOwner: this.trimText(this.bulkOwnerDraft),
      bulkSystem: this.trimText(this.bulkSystemDraft || undefined),
      updatedAt: new Date().toISOString()
    };
    this.entitySvc.saveDiscoveryGovernancePreset(preset).subscribe({
      next: message => {
        if (message.code !== 0 || message.data == null) {
          this.persistLocalGovernancePreset(preset);
          return;
        }
        this.persistLocalGovernancePreset(message.data);
      },
      error: () => {
        this.persistLocalGovernancePreset(preset);
      }
    });
  }

  applyGovernancePreset(preset: DiscoveryGovernancePreset): void {
    this.ownerDraft = preset.owner || '';
    this.systemDraft = preset.system || null;
    this.sourceDraft = preset.source || null;
    this.environmentDraft = preset.environment || null;
    this.statusDraft = preset.status || null;
    this.bulkOwnerDraft = preset.bulkOwner || '';
    this.bulkSystemDraft = preset.bulkSystem || null;
    this.applyGovernanceFilters();
  }

  removeGovernancePreset(presetId: string): void {
    this.entitySvc.deleteDiscoveryGovernancePreset(presetId).subscribe({
      next: () => {
        this.applyGovernancePresetDelete(presetId);
      },
      error: () => {
        this.applyGovernancePresetDelete(presetId);
      }
    });
  }

  removeGovernancePresetFromEvent(event: Event, presetId: string): void {
    event.stopPropagation();
    this.removeGovernancePreset(presetId);
  }

  isGovernancePresetActive(preset: DiscoveryGovernancePreset): boolean {
    return (
      (preset.owner || '') === (this.trimText(this.ownerDraft) || '') &&
      (preset.system || '') === (this.trimText(this.systemDraft || undefined) || '') &&
      (preset.source || '') === (this.trimText(this.sourceDraft || undefined) || '') &&
      (preset.environment || '') === (this.trimText(this.environmentDraft || undefined) || '') &&
      (preset.status || '') === (this.trimText(this.statusDraft || undefined) || '') &&
      (preset.bulkOwner || '') === (this.trimText(this.bulkOwnerDraft) || '') &&
      (preset.bulkSystem || '') === (this.trimText(this.bulkSystemDraft || undefined) || '')
    );
  }

  getGovernancePresetSummary(preset: DiscoveryGovernancePreset): string {
    return [preset.owner, preset.system, preset.environment, preset.status].filter(item => item != null && item !== '').slice(0, 3).join(' · ');
  }

  continuePreferredGovernancePreset(): void {
    if (this.preferredGovernancePreset == null) {
      return;
    }
    this.applyGovernancePreset(this.preferredGovernancePreset);
  }

  setTelemetryDiscoveryScope(scope: TelemetryDiscoveryScope): void {
    if (scope === this.telemetryDiscoveryScope) {
      return;
    }
    this.syncRoute({
      scope: scope === 'all' ? null : scope
    });
  }

  onDiscoveryRailItemSelected(item: PlatformRailNavItem): void {
    this.setTelemetryDiscoveryScope(item.key as TelemetryDiscoveryScope);
  }

  isTelemetryDiscoverySelected(monitorId: number): boolean {
    return this.selectedTelemetryMonitorIds.has(monitorId);
  }

  isTelemetryDiscoveryBindable(row: TelemetryDiscoveryRow): boolean {
    if (this.isTelemetryDiscoveryResolved(row)) {
      return false;
    }
    const candidate = this.getActiveTelemetryCandidate(row);
    return candidate != null && !candidate.alreadyBound;
  }

  isTelemetryDiscoverySelectable(row: TelemetryDiscoveryRow): boolean {
    return row.candidates.length === 0 || this.isTelemetryDiscoveryBindable(row);
  }

  toggleTelemetryDiscoverySelection(monitorId: number, checked: boolean): void {
    const next = new Set(this.selectedTelemetryMonitorIds);
    if (checked) {
      next.add(monitorId);
    } else {
      next.delete(monitorId);
    }
    this.selectedTelemetryMonitorIds = next;
    this.cdr.markForCheck();
  }

  selectAllTelemetryDiscoveryNew(): void {
    this.selectedTelemetryMonitorIds = new Set(this.telemetryDiscoveryRows.filter(row => row.candidates.length === 0).map(row => row.monitor.id));
    this.cdr.markForCheck();
  }

  selectAllTelemetryDiscoveryMatched(): void {
    this.selectedTelemetryMonitorIds = new Set(
      this.telemetryDiscoveryRows.filter(row => this.isTelemetryDiscoveryBindable(row)).map(row => row.monitor.id)
    );
    this.cdr.markForCheck();
  }

  clearTelemetryDiscoverySelection(): void {
    this.selectedTelemetryMonitorIds = new Set<number>();
    this.cdr.markForCheck();
  }

  runDiscoveryIntakeQueueAction(group: DiscoveryIntakeQueueGroup): void {
    switch (group.action) {
      case 'select-merge':
      case 'select-create':
        this.selectedTelemetryMonitorIds = new Set(group.rows.map(row => row.monitor.id));
        this.scrollToWorkspaceSection('discovery-bulk-governance');
        this.cdr.markForCheck();
        return;
      case 'resolved':
        this.setTelemetryDiscoveryScope('resolved');
        this.scrollToWorkspaceSection('discovery-results-card');
        return;
      case 'review':
      default:
        this.setTelemetryDiscoveryScope('matched');
        this.scrollToWorkspaceSection('discovery-results-card');
    }
  }

  adoptTelemetryMonitor(monitorId: number): void {
    const row = this.telemetryDiscoveryRows.find(item => item.monitor.id === monitorId);
    const workspacePath = this.router.createUrlTree(['/entities', 'new'], {
      queryParams: {
        ...this.currentQueryParams,
        entrySource: 'telemetry',
        monitorId,
        resumeDefinitionToken: this.definitionResumeToken || null,
        resumeHandledRowKey: this.definitionResumeHandledRowKey || null
      }
    }).toString();
    this.recordDiscoveryActivity({
      id: `telemetry-adopt-${monitorId}-${Date.now()}`,
      happenedAt: new Date().toISOString(),
      status: 'info',
      action: 'adopt',
      summary: this.translateOrFallback('entity.telemetry.discovery.activity.summary.adopt', '线索已采纳到实体编辑器。'),
      detail: row
        ? `${row.monitor.name || '#' + row.monitor.id} · ${this.getTelemetryDraftKindLabel(row)} · ${this.getTelemetryDraftTitle(row)}`
        : undefined,
      workspacePath
    });
    this.router.navigate(['/entities', 'new'], {
      queryParams: {
        ...this.currentQueryParams,
        entrySource: 'telemetry',
        monitorId,
        resumeDefinitionToken: this.definitionResumeToken || null,
        resumeHandledRowKey: this.definitionResumeHandledRowKey || null
      }
    });
  }

  openTelemetryCandidateEntity(entityId: number): void {
    this.router.navigate(['/entities', entityId], { queryParams: this.currentQueryParams });
  }

  openTelemetryCandidateDefinition(entityId: number): void {
    this.router.navigate(['/entities', entityId, 'definition'], {
      queryParams: {
        format: 'yaml',
        remedy: 'definition',
        returnDiscoveryPath: this.router.url,
        ...buildGovernancePresetQueryParams(this.preferredGovernancePreset)
      }
    });
  }

  selectTelemetryCandidate(row: TelemetryDiscoveryRow, entityId: number): void {
    if ((this.getActiveTelemetryCandidate(row)?.entityId || 0) === entityId) {
      return;
    }
    row.selectedCandidateId = entityId;
    const selectedRow = this.selectedTelemetryMonitorIds.has(row.monitor.id);
    if (selectedRow && !this.isTelemetryDiscoverySelectable(row)) {
      const next = new Set(this.selectedTelemetryMonitorIds);
      next.delete(row.monitor.id);
      this.selectedTelemetryMonitorIds = next;
    }
    this.cdr.markForCheck();
  }

  getActiveTelemetryCandidate(row: TelemetryDiscoveryRow): EntityMonitorBindingCandidate | undefined {
    if (this.isTelemetryDiscoveryResolved(row)) {
      return this.getResolvedTelemetryCandidate(row);
    }
    if (row.selectedCandidateId == undefined) {
      return row.candidates.length === 1 ? row.topCandidate : undefined;
    }
    return row.candidates.find(candidate => candidate.entityId === row.selectedCandidateId) || row.topCandidate;
  }

  getSuggestedTelemetryCandidate(row: TelemetryDiscoveryRow): EntityMonitorBindingCandidate | undefined {
    return row.topCandidate;
  }

  getResolvedTelemetryCandidate(row: TelemetryDiscoveryRow): EntityMonitorBindingCandidate | undefined {
    return row.candidates.find(candidate => candidate.alreadyBound);
  }

  isTelemetryDiscoveryResolved(row: TelemetryDiscoveryRow): boolean {
    return this.getResolvedTelemetryCandidate(row) != undefined;
  }

  isTelemetryDiscoveryPendingReview(row: TelemetryDiscoveryRow): boolean {
    return !this.isTelemetryDiscoveryResolved(row) && row.candidates.length > 1 && row.selectedCandidateId == undefined;
  }

  mergeTelemetryCandidate(row: TelemetryDiscoveryRow): void {
    if (this.getActiveTelemetryCandidate(row) == null || this.telemetryDiscoverySubmitting) {
      return;
    }
    this.telemetryDiscoverySubmitting = true;
    this.bindTelemetryMonitorToCandidate(row).subscribe({
      next: message => {
        this.telemetryDiscoverySubmitting = false;
        if (message.code === 0) {
          const candidate = this.getActiveTelemetryCandidate(row);
          this.notifySvc.success(
            this.translateOrFallback('entity.entry-source.telemetry', 'Telemetry Discovery'),
            this.translateOrFallback('entity.telemetry.discovery.bind.success', '已归并到候选实体。')
          );
          if (candidate != null) {
            this.recordDiscoveryActivity({
              id: `telemetry-merge-${row.monitor.id}-${Date.now()}`,
              happenedAt: new Date().toISOString(),
              status: 'success',
              action: 'merge',
              summary: this.translateOrFallback('entity.telemetry.discovery.bind.success', '已归并到候选实体。'),
              detail: `${row.monitor.name || '#' + row.monitor.id} -> ${candidate.entityName}`,
              entityRefs: [
                {
                  entityId: candidate.entityId,
                  entityName: candidate.entityName
                }
              ]
            });
          }
          if (candidate != null && this.definitionResumeToken && this.definitionResumeHandledRowKey) {
            this.openDefinitionWorkspaceResume(candidate.entityId);
            return;
          }
          this.refreshTelemetryDiscoveryState();
          return;
        }
        this.notifySvc.warning(
          this.translateOrFallback('entity.entry-source.telemetry', 'Telemetry Discovery'),
          message.msg || this.translateOrFallback('entity.telemetry.discovery.bind.failed', '归并失败，请稍后再试。')
        );
        this.cdr.markForCheck();
      },
      error: error => {
        this.telemetryDiscoverySubmitting = false;
        this.notifySvc.error(
          this.translateOrFallback('entity.entry-source.telemetry', 'Telemetry Discovery'),
          error?.msg || error?.message || this.translateOrFallback('entity.telemetry.discovery.bind.failed', '归并失败，请稍后再试。')
        );
        this.cdr.markForCheck();
      }
    });
  }

  createTelemetryEntity(row: TelemetryDiscoveryRow): void {
    if (this.telemetryDiscoverySubmitting || row.candidates.length > 0) {
      return;
    }
    this.telemetryDiscoverySubmitting = true;
    this.entitySvc.newEntity(this.applyBulkGovernanceOverrides(this.cloneEntityDto(row.draftDto))).subscribe({
      next: message => {
        this.telemetryDiscoverySubmitting = false;
        if (message.code === 0 && typeof message.data === 'number' && message.data > 0) {
          const entityId = message.data;
          const entityName = row.draftDto.entity.displayName || row.draftDto.entity.name;
          this.notifySvc.success(
            this.translateOrFallback('entity.entry-source.telemetry', 'Telemetry Discovery'),
            this.translateOrFallback('entity.telemetry.discovery.create-now.success', '已创建建议实体。')
          );
          this.recordDiscoveryActivity({
            id: `telemetry-create-${row.monitor.id}-${Date.now()}`,
            happenedAt: new Date().toISOString(),
            status: 'success',
            action: 'create',
            summary: this.translateOrFallback('entity.telemetry.discovery.create-now.success', '已创建建议实体。'),
            detail: `${row.monitor.name || '#' + row.monitor.id} -> ${entityName}`,
            entityRefs: [
              {
                entityId,
                entityName
              }
            ]
          });
          if (this.definitionResumeToken && this.definitionResumeHandledRowKey) {
            this.openDefinitionWorkspaceResume(entityId);
            return;
          }
          const next = new Set(this.selectedTelemetryMonitorIds);
          next.delete(row.monitor.id);
          this.selectedTelemetryMonitorIds = next;
          this.refreshTelemetryDiscoveryState();
          return;
        }
        this.notifySvc.warning(
          this.translateOrFallback('entity.entry-source.telemetry', 'Telemetry Discovery'),
          message.msg || this.translateOrFallback('entity.telemetry.discovery.create-now.failed', '创建建议实体失败，请稍后再试。')
        );
        this.cdr.markForCheck();
      },
      error: error => {
        this.telemetryDiscoverySubmitting = false;
        this.notifySvc.error(
          this.translateOrFallback('entity.entry-source.telemetry', 'Telemetry Discovery'),
          error?.msg || error?.message || this.translateOrFallback('entity.telemetry.discovery.create-now.failed', '创建建议实体失败，请稍后再试。')
        );
        this.cdr.markForCheck();
      }
    });
  }

  bulkMergeTelemetryCandidates(): void {
    const targetRows = this.telemetryDiscoveryRows.filter(row => this.selectedTelemetryMonitorIds.has(row.monitor.id) && this.isTelemetryDiscoveryBindable(row));
    if (targetRows.length === 0) {
      return;
    }
    this.telemetryDiscoverySubmitting = true;
    const requests = targetRows.map(row =>
      this.bindTelemetryMonitorToCandidate(row).pipe(
        catchError(error =>
          of({
            code: 1,
            msg: error?.msg || error?.message || 'Bind failed',
            data: undefined
          } as Message<void>)
        )
      )
    );
    forkJoin(requests).subscribe({
      next: responses => {
        this.telemetryDiscoverySubmitting = false;
        const successCount = responses.filter(message => message.code === 0).length;
        const failedCount = responses.length - successCount;
        const entityRefs = this.buildMergedEntityRefs(targetRows, responses);
        if (successCount > 0) {
          this.notifySvc.success(
            this.translateOrFallback('entity.entry-source.telemetry', 'Telemetry Discovery'),
            `${this.translateOrFallback('entity.telemetry.discovery.bulk-bind.success.prefix', '已批量归并')} ${successCount} ${this.translateOrFallback('entity.telemetry.discovery.bulk-bind.success.suffix', '条线索。')}`
          );
          this.recordDiscoveryActivity({
            id: `telemetry-bulk-merge-${Date.now()}`,
            happenedAt: new Date().toISOString(),
            status: failedCount > 0 ? 'warning' : 'success',
            action: 'bulk-merge',
            summary:
              failedCount > 0
                ? `${this.translateOrFallback('entity.telemetry.discovery.bulk-bind.success.prefix', '已批量归并')} ${successCount} ${this.translateOrFallback('entity.telemetry.discovery.bulk-bind.success.suffix', '条线索。')}`
                : this.translateOrFallback('entity.telemetry.discovery.activity.summary.bulk-merge', `已批量归并 ${successCount} 条线索。`),
            detail:
              failedCount > 0
                ? `${this.translateOrFallback('entity.telemetry.discovery.bulk-bind.partial.prefix', '还有')} ${failedCount} ${this.translateOrFallback('entity.telemetry.discovery.bulk-bind.partial.suffix', '条线索未能归并，可继续逐条处理。')}`
                : `${this.translateOrFallback('entity.telemetry.discovery.activity.count', '影响线索')} ${successCount}`,
            entityRefs
          });
          if (successCount === 1 && failedCount === 0 && this.definitionResumeToken && this.definitionResumeHandledRowKey) {
            const resolvedEntityId = entityRefs[0]?.entityId;
            if (resolvedEntityId != null) {
              this.openDefinitionWorkspaceResume(resolvedEntityId);
              return;
            }
          }
          this.refreshTelemetryDiscoveryState();
        }
        if (failedCount > 0) {
          this.notifySvc.warning(
            this.translateOrFallback('entity.entry-source.telemetry', 'Telemetry Discovery'),
            `${this.translateOrFallback('entity.telemetry.discovery.bulk-bind.partial.prefix', '还有')} ${failedCount} ${this.translateOrFallback('entity.telemetry.discovery.bulk-bind.partial.suffix', '条线索未能归并，可继续逐条处理。')}`
          );
        }
        this.cdr.markForCheck();
      },
      error: error => {
        this.telemetryDiscoverySubmitting = false;
        this.notifySvc.error(
          this.translateOrFallback('entity.entry-source.telemetry', 'Telemetry Discovery'),
          error?.msg || error?.message || this.translateOrFallback('entity.telemetry.discovery.bind.failed', '归并失败，请稍后再试。')
        );
        this.cdr.markForCheck();
      }
    });
  }

  bulkCreateTelemetryEntities(): void {
    const targetRows = this.telemetryDiscoveryRows.filter(row => this.selectedTelemetryMonitorIds.has(row.monitor.id) && row.candidates.length === 0);
    if (targetRows.length === 0) {
      return;
    }
    this.telemetryDiscoverySubmitting = true;
    const requests = targetRows.map(row =>
      this.entitySvc.newEntity(this.applyBulkGovernanceOverrides(this.cloneEntityDto(row.draftDto))).pipe(
        catchError(error =>
          of({
            code: 1,
            msg: error?.msg || error?.message || 'Create failed',
            data: 0
          } as Message<number>)
        )
      )
    );
    forkJoin(requests).subscribe({
      next: responses => {
        this.telemetryDiscoverySubmitting = false;
        const createdIds: number[] = [];
        const createdEntityRefs: DiscoveryGovernanceActivityEntityRef[] = [];
        const failedRows: TelemetryDiscoveryRow[] = [];
        responses.forEach((message, index) => {
          if (message.code === 0 && typeof message.data === 'number' && message.data > 0) {
            createdIds.push(message.data);
            createdEntityRefs.push({
              entityId: message.data,
              entityName: targetRows[index].draftDto.entity.displayName || targetRows[index].draftDto.entity.name
            });
          } else {
            failedRows.push(targetRows[index]);
          }
        });
        if (createdIds.length > 0) {
          this.notifySvc.success(
            this.translateOrFallback('entity.entry-source.telemetry', 'Telemetry Discovery'),
            this.translateOrFallback('entity.telemetry.discovery.bulk-create.success', `已批量创建 ${createdIds.length} 个实体。`)
          );
          this.recordDiscoveryActivity({
            id: `telemetry-bulk-create-${Date.now()}`,
            happenedAt: new Date().toISOString(),
            status: failedRows.length > 0 ? 'warning' : 'success',
            action: 'bulk-create',
            summary: this.translateOrFallback('entity.telemetry.discovery.bulk-create.success', `已批量创建 ${createdIds.length} 个实体。`),
            detail:
              failedRows.length > 0
                ? this.translateOrFallback('entity.telemetry.discovery.bulk-create.partial', `还有 ${failedRows.length} 条线索未能创建，可继续逐条处理。`)
                : `${this.translateOrFallback('entity.telemetry.discovery.activity.count', '影响线索')} ${createdIds.length}`,
            entityRefs: createdEntityRefs
          });
          if (createdIds.length === 1 && failedRows.length === 0 && this.definitionResumeToken && this.definitionResumeHandledRowKey) {
            this.openDefinitionWorkspaceResume(createdIds[0]);
            return;
          }
          this.selectedTelemetryMonitorIds = new Set<number>();
          this.refreshTelemetryDiscoveryState();
        }
        if (failedRows.length > 0) {
          this.notifySvc.warning(
            this.translateOrFallback('entity.entry-source.telemetry', 'Telemetry Discovery'),
            this.translateOrFallback('entity.telemetry.discovery.bulk-create.partial', `还有 ${failedRows.length} 条线索未能创建，可继续逐条处理。`)
          );
        }
        this.cdr.markForCheck();
      },
      error: error => {
        this.telemetryDiscoverySubmitting = false;
        this.notifySvc.error(
          this.translateOrFallback('entity.entry-source.telemetry', 'Telemetry Discovery'),
          error?.msg || error?.message || 'Bulk create failed'
        );
        this.cdr.markForCheck();
      }
    });
  }

  bulkAdoptTelemetryDefinitions(): void {
    const targetRows = this.telemetryDiscoveryRows.filter(row => this.selectedTelemetryMonitorIds.has(row.monitor.id) && row.candidates.length === 0);
    if (targetRows.length === 0) {
      return;
    }
    const draftDtos = targetRows.map(row => this.applyBulkGovernanceOverrides(this.cloneEntityDto(row.draftDto)));
    const definitionDraft = JSON.stringify(draftDtos.map(dto => this.buildDefinitionSeedRecord(dto)), null, 2);
    const activityId = `telemetry-bulk-adopt-${Date.now()}`;
    const workspacePath = this.router.createUrlTree(['/entities', 'import'], {
      queryParams: {
        format: 'json',
        seedSource: 'telemetry',
        seedActivity: activityId
      }
    }).toString();
    this.recordDiscoveryActivity({
      id: activityId,
      happenedAt: new Date().toISOString(),
      status: 'info',
      action: 'bulk-adopt-definition',
      summary: this.translateOrFallback(
        'entity.telemetry.discovery.activity.summary.bulk-adopt-definition',
        `已将 ${draftDtos.length} 条线索送入定义工作台。`
      ),
      detail: `${this.translateOrFallback('entity.telemetry.discovery.activity.count', '影响线索')} ${draftDtos.length}`,
      workspacePath,
      seedDefinitionDraft: definitionDraft,
      seedDefinitionFormat: 'json',
      seedDefinitionSource: 'telemetry',
      seedDefinitionCount: draftDtos.length
    });
    this.router.navigate(['/entities', 'import'], {
      queryParams: {
        format: 'json',
        seedSource: 'telemetry',
        seedActivity: activityId
      },
      state: {
        seedDefinitionDraft: definitionDraft,
        seedDefinitionFormat: 'json',
        seedDefinitionSource: 'telemetry',
        seedDefinitionCount: draftDtos.length,
        seedDefinitionAutoPreview: true
      }
    });
  }

  adoptTelemetryDefinitionRow(row: TelemetryDiscoveryRow): void {
    if (row.candidates.length > 0) {
      return;
    }
    const draftDto = this.applyBulkGovernanceOverrides(this.cloneEntityDto(row.draftDto));
    const definitionDraft = JSON.stringify([this.buildDefinitionSeedRecord(draftDto)], null, 2);
    const activityId = `telemetry-adopt-definition-${row.monitor.id}-${Date.now()}`;
    const workspacePath = this.router.createUrlTree(['/entities', 'import'], {
      queryParams: {
        format: 'json',
        seedSource: 'telemetry',
        seedActivity: activityId
      }
    }).toString();
    this.recordDiscoveryActivity({
      id: activityId,
      happenedAt: new Date().toISOString(),
      status: 'info',
      action: 'bulk-adopt-definition',
      summary: this.translateOrFallback('entity.telemetry.discovery.row-definition.success', '已将这条线索送入定义工作台。'),
      detail: `${row.monitor.name || '#' + row.monitor.id} · ${this.getTelemetryDraftKindLabel(row)} · ${this.getTelemetryDraftTitle(row)}`,
      workspacePath,
      seedDefinitionDraft: definitionDraft,
      seedDefinitionFormat: 'json',
      seedDefinitionSource: 'telemetry',
      seedDefinitionCount: 1
    });
    this.router.navigate(['/entities', 'import'], {
      queryParams: {
        format: 'json',
        seedSource: 'telemetry',
        seedActivity: activityId
      },
      state: {
        seedDefinitionDraft: definitionDraft,
        seedDefinitionFormat: 'json',
        seedDefinitionSource: 'telemetry',
        seedDefinitionCount: 1,
        seedDefinitionAutoPreview: true
      }
    });
  }

  openCatalog(): void {
    this.router.navigate(['/entities']);
  }

  openDefinitionWorkspaceResume(entityId?: number): void {
    const token = this.definitionResumeToken;
    if (!token) {
      return;
    }
    const navigateToWorkspace = (resumeState?: { queryParams?: Record<string, string>; format?: string }) => {
      this.router.navigate(['/entities', 'import'], {
        queryParams: {
          ...(resumeState?.queryParams || {}),
          format: resumeState?.format || 'yaml',
          resumeDefinitionToken: token,
          resumeHandledRowKey: entityId != null ? this.definitionResumeHandledRowKey || null : this.definitionResumeHandledRowKey || null,
          resumeHandledEntityId: entityId != null ? entityId : null
        }
      });
    };
    const resumeState = readDefinitionWorkspaceResumeState(token);
    if (resumeState != null) {
      navigateToWorkspace(resumeState);
      return;
    }
    this.entitySvc
      .getDefinitionWorkspaceResume(token)
      .pipe(catchError(() => of(undefined)))
      .subscribe(message => navigateToWorkspace(message?.data));
  }

  runDiscoveryGovernanceHook(card: DiscoveryGovernanceHookCard): void {
    switch (card.action) {
      case 'registry-refresh':
        this.refreshGovernancePresetRegistry();
        return;
      case 'registry-sync':
        this.syncGovernancePresetRegistry();
        return;
      case 'registry-seed':
        this.scrollToWorkspaceSection('discovery-governance-filters');
        return;
      case 'preset':
        if (card.preset != null) {
          this.applyGovernancePreset(card.preset);
        }
        this.scrollToWorkspaceSection('discovery-governance-filters');
        return;
      case 'ownership':
        this.scrollToWorkspaceSection('discovery-bulk-governance');
        return;
      case 'definition':
        this.openDefinitionWorkspace(card.preset, 'ownership');
        return;
      case 'telemetry':
      default:
        this.scrollToWorkspaceSection('discovery-results-card');
    }
  }

  runDiscoveryGovernancePolicy(card: DiscoveryGovernancePolicyCard): void {
    switch (card.action) {
      case 'registry-refresh':
        this.refreshGovernancePresetRegistry();
        return;
      case 'registry-sync':
        this.syncGovernancePresetRegistry();
        return;
      case 'registry-seed':
        this.scrollToWorkspaceSection('discovery-governance-filters');
        return;
      case 'preset':
        if (card.preset != null) {
          this.applyGovernancePreset(card.preset);
        }
        this.scrollToWorkspaceSection('discovery-governance-filters');
        return;
      case 'ownership':
        this.scrollToWorkspaceSection('discovery-bulk-governance');
        return;
      case 'definition':
        this.openDefinitionWorkspace(card.preset, 'ownership');
        return;
      case 'telemetry':
      default:
        this.scrollToWorkspaceSection('discovery-results-card');
    }
  }

  onWorkspaceGuidanceAction(actionKey: string): void {
    const queueGroup = this.discoveryIntakeQueueGroups.find(group => group.action === actionKey);
    if (queueGroup != null) {
      this.runDiscoveryIntakeQueueAction(queueGroup);
      return;
    }
    if (actionKey === 'definition-resume') {
      this.openDefinitionWorkspaceResume();
      return;
    }
    if (actionKey === 'open-definition') {
      this.openDefinitionWorkspace(this.preferredGovernancePreset, 'ownership');
      return;
    }
    if (actionKey === 'create-definition') {
      this.createDefinitionEntity();
      return;
    }
    if (actionKey === 'continue-preferred') {
      this.continuePreferredGovernancePreset();
      return;
    }
    if (actionKey === 'focus-ownership') {
      this.scrollToWorkspaceSection(this.visibleTelemetryDiscoveryRows.length > 0 ? 'discovery-bulk-governance' : 'discovery-governance-filters');
      return;
    }
    if (actionKey === 'focus-results') {
      this.scrollToWorkspaceSection('discovery-results-card');
      return;
    }
    if (actionKey === 'open-catalog') {
      this.openCatalog();
      return;
    }
    if (actionKey.startsWith('policy-')) {
      const index = Number(actionKey.replace('policy-', ''));
      const card = this.discoveryGovernancePolicyCards[index];
      if (card != null) {
        this.runDiscoveryGovernancePolicy(card);
      }
      return;
    }
    if (actionKey.startsWith('hook-')) {
      const index = Number(actionKey.replace('hook-', ''));
      const card = this.discoveryGovernanceHookCards[index];
      if (card != null) {
        this.runDiscoveryGovernanceHook(card);
      }
    }
  }

  onWorkspaceGuidanceNext(actionKey: string): void {
    this.onWorkspaceGuidanceAction(actionKey);
  }

  createManualEntity(): void {
    this.router.navigate(['/entities', 'new']);
  }

  runDiscoverySharedGovernanceSnapshot(card: DiscoverySharedGovernanceSnapshotCard): void {
    if (card.action === 'definition') {
      this.openDefinitionWorkspace(this.preferredGovernancePreset, 'ownership');
      return;
    }
    this.pendingWorkspaceRemedy = 'ownership';
    this.runPendingWorkspaceRemedy();
  }

  createDefinitionEntity(): void {
    this.router.navigate(['/entities', 'new'], {
      queryParams: {
        entrySource: 'definition',
        surface: 'yaml',
        definitionFormat: 'yaml'
      }
    });
  }

  trackByTelemetryDiscoveryRow(_index: number, item: TelemetryDiscoveryRow): number {
    return item.monitor.id;
  }

  trackByTelemetryCandidate(_index: number, item: EntityMonitorBindingCandidate): number {
    return item.entityId;
  }

  trackByDiscoveryActivity(_index: number, item: DiscoveryGovernanceActivity): string {
    return item.id;
  }

  trackByServerGovernanceActivity(_index: number, item: EntityDefinitionActivity): number {
    return item.id;
  }

  trackByDiscoveryEntityRef(_index: number, item: DiscoveryGovernanceActivityEntityRef): string {
    return `${item.entityId}:${item.entityName || ''}`;
  }

  trackByDiscoveryPreset(_index: number, item: DiscoveryGovernancePreset): string {
    return item.id;
  }

  trackByDiscoveryLifecycleRecord(_index: number, item: DiscoveryLifecycleRecord): string {
    return item.id;
  }

  trackByDiscoverySharedGovernanceSnapshot(_index: number, item: DiscoverySharedGovernanceSnapshotCard): string {
    return item.key;
  }

  trackByGovernanceConflictRollup(_index: number, item: { field: GovernanceConflictField }): string {
    return item.field;
  }

  trackByDiscoveryGovernanceHookCard(_index: number, item: DiscoveryGovernanceHookCard): string {
    return item.key;
  }

  trackByIndex(index: number): number {
    return index;
  }

  trackByDiscoveryGovernancePolicyCard(_index: number, item: DiscoveryGovernancePolicyCard): string {
    return item.key;
  }

  trackByDiscoveryIntakeQueueGroup(_index: number, item: DiscoveryIntakeQueueGroup): string {
    return item.key;
  }

  trackByValue(_index: number, value: string): string {
    return value;
  }

  trackByIdentityMatch(_index: number, item: { key: string; value: string }): string {
    return `${item.key}:${item.value}`;
  }

  applyOwnerSuggestion(value: string): void {
    this.ownerDraft = value;
  }

  applySystemSuggestion(value: string): void {
    this.systemDraft = value;
  }

  applyEnvironmentSuggestion(value: string): void {
    this.environmentDraft = value;
  }

  applyBulkOwnerSuggestion(value: string): void {
    this.bulkOwnerDraft = value;
  }

  applyBulkSystemSuggestion(value: string): void {
    this.bulkSystemDraft = value;
  }

  isBulkOwnerSuggestionActive(value: string): boolean {
    return (this.trimText(this.bulkOwnerDraft) || '') === (this.trimText(value) || '');
  }

  isBulkSystemSuggestionActive(value: string): boolean {
    return (this.trimText(this.bulkSystemDraft || undefined) || '') === (this.trimText(value) || '');
  }

  humanize(value?: string): string {
    if (value == null || value.trim() === '') {
      return '-';
    }
    return value
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, letter => letter.toUpperCase());
  }

  translateOrFallback(token: string, fallback: string): string {
    const value = this.i18nSvc.fanyi(token);
    return value === token ? fallback : value;
  }

  formatDiscoveryActivityTime(value?: string | number | null): string {
    return value == null ? '-' : formatDate(value, 'yyyy-MM-dd HH:mm:ss', 'en-US');
  }

  getDiscoveryActivityStatusColor(status: DiscoveryGovernanceActivityStatus): string {
    switch (status) {
      case 'success':
        return 'success';
      case 'warning':
        return 'warning';
      default:
        return 'processing';
    }
  }

  getDiscoveryActivityStatusLabel(status: DiscoveryGovernanceActivityStatus): string {
    return this.translateOrFallback(`entity.telemetry.discovery.activity.status.${status}`, this.humanize(status));
  }

  getDiscoveryActivityActionLabel(action: DiscoveryGovernanceActivity['action']): string {
    if (action === 'policy-hook') {
      return this.translateOrFallback('entity.list.portal.scorecards', '治理评分');
    }
    return this.translateOrFallback(`entity.telemetry.discovery.activity.action.${action}`, this.humanize(action));
  }

  getServerGovernanceActivityTitle(activity: EntityDefinitionActivity): string {
    switch (activity.activityType) {
      case 'discovery_governance':
        return this.translateOrFallback('entity.detail.lifecycle.discovery', '归并治理');
      case 'source_update':
      case 'catalog_create':
      default:
        return this.translateOrFallback('entity.detail.lifecycle.catalog', '目录治理');
    }
  }

  getServerGovernanceActivityActionLabel(activity: EntityDefinitionActivity): string {
    if (activity.entityId != null) {
      return this.translateOrFallback('entity.telemetry.discovery.activity.view-entity', '查看实体');
    }
    return this.translateOrFallback('entity.list.kicker', '实体目录');
  }

  openServerGovernanceActivity(activity: EntityDefinitionActivity): void {
    if (activity.entityId != null) {
      this.openDiscoveryActivityEntity(activity.entityId);
      return;
    }
    this.openCatalog();
  }

  openDiscoveryActivityWorkspace(activity: DiscoveryGovernanceActivity): void {
    if (activity.workspacePath == null) {
      return;
    }
    this.router.navigateByUrl(activity.workspacePath);
  }

  openDiscoveryActivityEntity(entityId: number): void {
    this.router.navigate(['/entities', entityId]);
  }

  openDiscoveryLifecycleRecord(record: DiscoveryLifecycleRecord): void {
    if (record.action === 'snapshot-discovery') {
      this.pendingWorkspaceRemedy = 'ownership';
      this.runPendingWorkspaceRemedy();
      return;
    }
    if (record.action === 'snapshot-definition') {
      this.openDefinitionWorkspace(this.preferredGovernancePreset, 'ownership');
      return;
    }
    const latestActivity = this.serverDiscoveryActivities[0] || this.unsharedLocalDiscoveryActivities[0];
    if (record.action === 'workspace' && latestActivity != null) {
      this.openDiscoveryActivityWorkspace(latestActivity);
      return;
    }
    if (record.action === 'entity' && record.entityId != null) {
      this.openDiscoveryActivityEntity(record.entityId);
    }
  }

  getDiscoverySharedGovernanceSnapshotMeta(card: DiscoverySharedGovernanceSnapshotCard): string | undefined {
    return card.key === 'definition'
      ? this.translateOrFallback('entity.list.snapshot.definition.meta', '定义工作台')
      : this.translateOrFallback('entity.list.snapshot.discovery.meta', '发现工作台');
  }

  getDiscoverySharedGovernanceSnapshotStatusLabel(status: DiscoverySharedGovernanceSnapshotCard['status']): string {
    switch (status) {
      case 'success':
        return this.translateOrFallback('entity.list.snapshot.status.success', '已就绪');
      case 'warning':
        return this.translateOrFallback('entity.list.snapshot.status.warning', '待收口');
      case 'error':
        return this.translateOrFallback('entity.list.snapshot.status.error', '有阻塞');
      default:
        return this.translateOrFallback('entity.list.snapshot.status.info', '已记录');
    }
  }

  getActiveTelemetryCandidateSummary(row: TelemetryDiscoveryRow): EntitySummary | undefined {
    const candidate = this.getActiveTelemetryCandidate(row);
    if (candidate == null) {
      return undefined;
    }
    return row.candidateSummaryMap?.[candidate.entityId];
  }

  getSuggestedTelemetryCandidateSummary(row: TelemetryDiscoveryRow): EntitySummary | undefined {
    const candidate = this.getSuggestedTelemetryCandidate(row);
    if (candidate == null) {
      return undefined;
    }
    return row.candidateSummaryMap?.[candidate.entityId];
  }

  getResolvedTelemetryCandidateSummary(row: TelemetryDiscoveryRow): EntitySummary | undefined {
    const candidate = this.getResolvedTelemetryCandidate(row);
    if (candidate == null) {
      return undefined;
    }
    return row.candidateSummaryMap?.[candidate.entityId];
  }

  getTelemetryDraftCompleteness(row: TelemetryDiscoveryRow): string {
    const entity = row.draftDto.entity;
    let completed = 0;
    const checkpoints = [
      this.trimText(entity.name),
      this.trimText(entity.type),
      row.identityMatches.length > 0 ? 'identities' : undefined,
      this.trimText(entity.owner),
      this.trimText(entity.system),
      this.trimText(entity.environment)
    ];
    checkpoints.forEach(item => {
      if (item != null) {
        completed += 1;
      }
    });
    return `${Math.round((completed / checkpoints.length) * 100)}%`;
  }

  getTelemetryGovernanceRiskLevel(row: TelemetryDiscoveryRow): TelemetryGovernanceRiskLevel {
    if (this.isTelemetryDiscoveryResolved(row)) {
      return 'low';
    }
    if (row.candidates.length > 1) {
      return 'high';
    }
    if (row.identityMatches.length === 0 || this.hasTelemetryDraftOwnershipGap(row)) {
      return 'high';
    }
    if (this.getActiveTelemetryCandidate(row) != null) {
      return 'medium';
    }
    return 'low';
  }

  getTelemetryGovernanceRiskLabel(row: TelemetryDiscoveryRow): string {
    const risk = this.getTelemetryGovernanceRiskLevel(row);
    return this.translateOrFallback(`entity.telemetry.discovery.risk.${risk}`, this.humanize(risk));
  }

  getTelemetryGovernanceRiskColor(row: TelemetryDiscoveryRow): string {
    switch (this.getTelemetryGovernanceRiskLevel(row)) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      default:
        return 'success';
    }
  }

  getTelemetryGovernanceAction(row: TelemetryDiscoveryRow): TelemetryGovernanceAction {
    if (this.isTelemetryDiscoveryResolved(row)) {
      return 'open';
    }
    if (row.candidates.length > 1) {
      return 'review';
    }
    if (this.getActiveTelemetryCandidate(row) != null) {
      return 'merge';
    }
    if (row.identityMatches.length === 0 || this.hasTelemetryDraftOwnershipGap(row)) {
      return 'enrich';
    }
    return 'create';
  }

  getTelemetryGovernanceActionLabel(row: TelemetryDiscoveryRow): string {
    const action = this.getTelemetryGovernanceAction(row);
    return this.translateOrFallback(`entity.telemetry.discovery.action.${action}`, this.humanize(action));
  }

  getTelemetryGovernanceRecommendation(row: TelemetryDiscoveryRow): string {
    if (this.isTelemetryDiscoveryResolved(row)) {
      return this.translateOrFallback(
        'entity.telemetry.discovery.recommendation.resolved',
        '目录已归并，可继续补齐负责人、系统和处置手册。'
      );
    }
    if (row.candidates.length > 1) {
      return this.translateOrFallback(
        'entity.telemetry.discovery.recommendation.review',
        '识别到多个目录候选，建议先确认目标实体，再执行归并或批量动作。'
      );
    }
    if (this.getActiveTelemetryCandidate(row) != null) {
      return this.translateOrFallback(
        'entity.telemetry.discovery.recommendation.matched',
        '已找到目录候选，建议优先归并到已有实体，避免重复目录项。'
      );
    }
    if (this.trimText(row.draftDto.entity.owner) == null || this.trimText(row.draftDto.entity.system) == null) {
      return this.translateOrFallback(
        'entity.telemetry.discovery.recommendation.enrich',
        '建议先补齐负责人和系统，再批量创建目录实体。'
      );
    }
    return this.translateOrFallback(
      'entity.telemetry.discovery.recommendation.create',
      '这条线索已具备最小目录信息，可直接创建为新实体。'
    );
  }

  getTelemetryCandidateContext(row: TelemetryDiscoveryRow): string | undefined {
    const summary = this.getActiveTelemetryCandidateSummary(row) || this.getSuggestedTelemetryCandidateSummary(row);
    if (summary == null) {
      return undefined;
    }
    const parts = [
      this.trimText(summary.entity.owner),
      this.trimText(summary.entity.system),
      this.trimText(summary.entity.environment),
      summary.status?.status ? this.translateOrFallback(`entity.status.${summary.status.status}`, this.humanize(summary.status.status)) : undefined
    ].filter((item): item is string => item != null);
    return parts.length > 0 ? parts.join(' · ') : undefined;
  }

  private normalizeScope(scope?: string | null): TelemetryDiscoveryScope {
    if (scope === 'matched' || scope === 'new' || scope === 'resolved') {
      return scope;
    }
    return 'all';
  }

  private toCurrentQueryParams(params: ParamMap): Record<string, string | number> {
    const result: Record<string, string | number> = {};
    params.keys.forEach(key => {
      const value = params.get(key);
      if (value != null && value !== '') {
        result[key] = value;
      }
    });
    return result;
  }

  private syncRoute(updates: Record<string, string | number | null>): void {
    const queryParams: Record<string, string | number> = {};
    Object.entries(this.currentQueryParams).forEach(([key, value]) => {
      if (value != null && value !== '') {
        queryParams[key] = value;
      }
    });
    Object.entries(updates).forEach(([key, value]) => {
      if (value == null || value === '') {
        delete queryParams[key];
      } else {
        queryParams[key] = value;
      }
    });
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams
    });
  }

  private loadTelemetryDiscovery(query: string): void {
    this.lastLoadedQuery = query;
    this.telemetryDiscoveryLoading = true;
    this.monitorSvc.searchMonitors(undefined, undefined, query, 9, 0, 12).subscribe({
      next: message => {
        if (message.code !== 0) {
          this.telemetryDiscoveryLoading = false;
          this.notifySvc.warning(this.translateOrFallback('entity.entry-source.telemetry', 'Telemetry Discovery'), message.msg);
          this.cdr.markForCheck();
          return;
        }
        const monitors = message.data?.content || [];
        if (monitors.length === 0) {
          this.telemetryDiscoveryLoading = false;
          this.telemetryDiscoveryRows = [];
          this.selectedTelemetryMonitorIds = new Set<number>();
          this.lastGovernanceHookActivitySignature = undefined;
          this.runPendingWorkspaceRemedy();
          this.cdr.markForCheck();
          return;
        }
        const requests = monitors.map(monitor =>
          this.entitySvc.getMonitorBindingCandidates(monitor.id).pipe(
            catchError(() =>
              of({
                code: 1,
                msg: 'candidate lookup failed',
                data: []
              } as Message<EntityMonitorBindingCandidate[]>)
            ),
            map(response => ({
              monitor,
              response
            }))
          )
        );
        forkJoin(requests)
          .pipe(
            switchMap(rows => {
              const candidateEntityIds = Array.from(
                new Set(
                  rows.flatMap(item =>
                    (item.response.code === 0 ? item.response.data || [] : []).map(candidate => candidate.entityId)
                  )
                )
              );
              if (candidateEntityIds.length === 0) {
                return of({ rows, summaryMap: {} as Record<number, EntitySummary> });
              }
              return this.entitySvc.searchEntitiesByIds(candidateEntityIds).pipe(
                map(summaryMessage => ({
                  rows,
                  summaryMap: this.indexCandidateSummaries(summaryMessage.data?.content || [])
                })),
                catchError(() => of({ rows, summaryMap: {} as Record<number, EntitySummary> }))
              );
            })
          )
          .subscribe({
          next: ({ rows, summaryMap }) => {
            this.telemetryDiscoveryLoading = false;
            this.telemetryDiscoveryRows = rows.map(item => {
              const candidates = item.response.code === 0 ? item.response.data || [] : [];
              const identityMatches = this.extractTelemetryIdentityMatches(item.monitor);
              return {
                monitor: item.monitor,
                candidates,
                topCandidate: candidates[0],
                identityMatches,
                draftDto: this.buildTelemetryEntityDto(item.monitor, identityMatches),
                candidateSummaryMap: summaryMap
              };
            });
            this.pruneTelemetryDiscoverySelection();
            this.scheduleDiscoveryGovernanceHookSync();
            this.cdr.markForCheck();
          },
          error: () => {
            this.telemetryDiscoveryLoading = false;
            this.telemetryDiscoveryRows = monitors.map(monitor => {
              const identityMatches = this.extractTelemetryIdentityMatches(monitor);
              return {
                monitor,
                candidates: [],
                topCandidate: undefined,
                identityMatches,
                draftDto: this.buildTelemetryEntityDto(monitor, identityMatches),
                candidateSummaryMap: {}
              };
            });
            this.pruneTelemetryDiscoverySelection();
            this.scheduleDiscoveryGovernanceHookSync();
            this.runPendingWorkspaceRemedy();
            this.cdr.markForCheck();
          }
        });
      },
      error: error => {
        this.telemetryDiscoveryLoading = false;
        this.notifySvc.error(
          this.translateOrFallback('entity.entry-source.telemetry', 'Telemetry Discovery'),
          error?.msg || error?.message || 'Search failed'
        );
        this.cdr.markForCheck();
      }
    });
  }

  private pruneTelemetryDiscoverySelection(): void {
    const visibleIds = new Set(this.telemetryDiscoveryRows.map(row => row.monitor.id));
    const next = new Set<number>();
    this.selectedTelemetryMonitorIds.forEach(monitorId => {
      const row = this.telemetryDiscoveryRows.find(item => item.monitor.id === monitorId);
      if (visibleIds.has(monitorId) && row && this.isTelemetryDiscoverySelectable(row)) {
        next.add(monitorId);
      }
    });
    this.selectedTelemetryMonitorIds = next;
  }

  private buildTelemetryEntityDto(monitor: Monitor, identityMatches: Array<{ key: string; value: string }>): EntityDto {
    const entityType = this.inferTelemetryEntityType(monitor, identityMatches);
    const entity = new Entity();
    entity.type = entityType;
    entity.name = this.inferTelemetryEntityName(monitor, entityType, identityMatches);
    entity.displayName = this.trimText(monitor.name);
    entity.namespace =
      findTelemetryIdentityValue(identityMatches, 'service.namespace') || findTelemetryIdentityValue(identityMatches, 'k8s.namespace.name');
    entity.environment = findTelemetryIdentityValue(identityMatches, 'deployment.environment.name');
    entity.owner = this.lookupTelemetryContext(monitor, ['team', 'owner', 'service.owner']);
    entity.runbook = this.lookupTelemetryContext(monitor, ['runbook', 'service.runbook', 'documentation']);
    entity.source = 'otel_resource';
    const inferredLabels = this.inferTelemetryLabels(monitor);
    entity.labels = inferredLabels.length > 0 ? Object.fromEntries(inferredLabels.map(label => [label.key, label.value])) : undefined;

    const identities = identityMatches.map((identity, index) => {
      const nextIdentity = new EntityIdentity();
      nextIdentity.identityKey = identity.key;
      nextIdentity.identityValue = identity.value;
      nextIdentity.identityType = 'otel_resource';
      nextIdentity.priority = this.defaultIdentityPriority(identity.key);
      nextIdentity.primaryIdentity = index === 0 || identity.key === this.primaryIdentityKeyForType(entityType);
      return nextIdentity;
    });

    const monitorBind = new EntityMonitorBind();
    monitorBind.monitorId = monitor.id;
    monitorBind.bindType = 'manual';
    monitorBind.bindSource = 'manual';
    monitorBind.status = 'active';
    monitorBind.score = 100;

    const dto = new EntityDto();
    dto.entity = entity;
    dto.identities = identities;
    dto.monitorBinds = [monitorBind];
    dto.relations = [];
    return dto;
  }

  private buildDefinitionSeedRecord(dto: EntityDto): Record<string, unknown> {
    const entity = dto.entity;
    const metadata: Record<string, unknown> = {
      name: entity.name || 'new-entity'
    };
    const spec: Record<string, unknown> = {
      source: entity.source || 'manual'
    };

    if (this.trimText(entity.namespace) != null) {
      metadata.namespace = entity.namespace;
    }
    if (this.trimText(entity.owner) != null) {
      metadata.owner = entity.owner;
    }
    if ((entity.additionalOwners || []).length > 0) {
      metadata.additionalOwners = entity.additionalOwners
        ?.filter(owner => this.trimText(owner.name) != null)
        .map(owner => ({
          name: owner.name,
          type: owner.type
        }));
    }
    if (this.trimText(entity.inheritFrom) != null) {
      metadata.inheritFrom = entity.inheritFrom;
    }
    if (this.trimText(entity.displayName) != null) {
      metadata.displayName = entity.displayName;
    }
    if (this.trimText(entity.description) != null) {
      metadata.description = entity.description;
    }
    if (entity.labels != null && Object.keys(entity.labels).length > 0) {
      metadata.labels = entity.labels;
    }
    if ((entity.tags || []).length > 0) {
      metadata.tags = entity.tags?.filter(tag => this.trimText(tag) != null);
    }
    if ((entity.links || []).length > 0) {
      metadata.links = entity.links
        ?.filter(link => this.trimText(link.url) != null)
        .map(link => ({
          name: link.name,
          type: link.type,
          provider: link.provider,
          url: link.url
        }));
    }
    if ((entity.contacts || []).length > 0) {
      metadata.contacts = entity.contacts
        ?.filter(contact => this.trimText(contact.contact || contact.value) != null)
        .map(contact => ({
          name: contact.name,
          type: contact.type,
          contact: contact.contact || contact.value,
          value: contact.value || contact.contact
        }));
    }
    if (this.trimText(entity.environment) != null) {
      spec.environment = entity.environment;
    }
    if (this.trimText(entity.subtype) != null) {
      spec.type = entity.subtype;
    }
    if (this.trimText(entity.owner) != null) {
      spec.ownedBy = entity.owner;
    }
    if (this.trimText(entity.criticality) != null) {
      spec.criticality = entity.criticality;
    }
    if (this.trimText(entity.runbook) != null) {
      spec.runbook = entity.runbook;
    }
    if (this.trimText(entity.lifecycle) != null) {
      spec.lifecycle = entity.lifecycle;
    }
    if (this.trimText(entity.tier) != null) {
      spec.tier = entity.tier;
    }
    if (this.trimText(entity.system) != null) {
      spec.partOf = entity.system;
    }
    if ((entity.componentOf || []).length > 0) {
      spec.componentOf = entity.componentOf?.filter(value => this.trimText(value) != null);
    }
    if ((entity.components || []).length > 0) {
      spec.components = entity.components?.filter(value => this.trimText(value) != null);
    }
    if ((entity.implementedBy || []).length > 0) {
      spec.implementedBy = entity.implementedBy?.filter(value => this.trimText(value) != null);
    }
    if (entity.apiInterface != null && (this.trimText(entity.apiInterface.fileRef) != null || entity.apiInterface.definition != null)) {
      spec.interface = {
        fileRef: entity.apiInterface.fileRef,
        definition: entity.apiInterface.definition
      };
    }
    if ((entity.languages || []).length > 0) {
      spec.languages = entity.languages?.filter(value => this.trimText(value) != null);
    }
    if ((dto.identities || []).length > 0 || (dto.monitorBinds || []).length > 0) {
      const telemetry: Record<string, unknown> = {};
      if ((dto.identities || []).length > 0) {
        telemetry.identities = (dto.identities || [])
          .filter(identity => this.trimText(identity.identityKey) != null && this.trimText(identity.identityValue) != null)
          .map(identity => ({
            key: identity.identityKey,
            value: identity.identityValue,
            type: identity.identityType,
            priority: identity.priority,
            primary: !!identity.primaryIdentity
          }));
      }
      if ((dto.monitorBinds || []).length > 0) {
        telemetry.monitors = (dto.monitorBinds || []).map(bind => ({
          monitorId: bind.monitorId,
          bindType: bind.bindType,
          bindSource: bind.bindSource,
          status: bind.status,
          score: bind.score,
          matchContext: bind.matchContext
        }));
      }
      spec.telemetry = telemetry;
    }
    if ((dto.relations || []).length > 0) {
      spec.dependsOn = (dto.relations || [])
        .map(relation => this.trimText(relation.targetRef))
        .filter((value): value is string => value != null);
      spec.relations = (dto.relations || []).map(relation => ({
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
    if (entity.integrations != null) {
      spec.integrations = entity.integrations;
    }
    if (entity.extensions != null) {
      spec.extensions = entity.extensions;
    }
    if (entity.hertzbeat != null) {
      spec.hertzbeat = entity.hertzbeat;
    }

    return {
      apiVersion: 'hertzbeat/v1',
      kind: entity.type,
      metadata,
      spec
    };
  }

  private recordDiscoveryActivity(activity: DiscoveryGovernanceActivity): void {
    const next = [activity, ...this.localDiscoveryActivities.filter(item => item.id !== activity.id)].slice(0, 8);
    this.localDiscoveryActivities = next;
    writeDiscoveryGovernanceActivities(next, 8);
    this.entitySvc.saveDiscoveryGovernanceActivity(activity).subscribe({
      next: message => {
        if (message.code === 0 && message.data != null) {
          const persisted = [message.data, ...this.serverDiscoveryActivities.filter(item => item.id !== message.data!.id)].slice(0, 8);
          this.serverDiscoveryActivities = persisted;
          this.cdr.markForCheck();
        }
      }
    });
    this.loadServerGovernanceActivities();
    this.cdr.markForCheck();
  }

  private scheduleDiscoveryGovernanceHookSync(): void {
    if (this.discoveryGovernanceHookSyncTimer != null) {
      clearTimeout(this.discoveryGovernanceHookSyncTimer);
    }
    this.discoveryGovernanceHookSyncTimer = setTimeout(() => {
      this.discoveryGovernanceHookSyncTimer = undefined;
      this.syncDiscoveryGovernanceHookActivity();
    }, 320);
  }

  private syncDiscoveryGovernanceHookActivity(): void {
    const cards = this.discoveryGovernanceHookCards;
    if (cards.length === 0) {
      return;
    }
    const signature = this.buildGovernanceHookSignature(
      cards,
      this.telemetryDiscoverySearch,
      this.telemetryDiscoveryScope,
      this.owner,
      this.system,
      this.environment,
      this.source,
      this.status,
      this.preferredGovernancePreset?.id
    );
    if (signature === this.lastGovernanceHookActivitySignature) {
      return;
    }
    this.lastGovernanceHookActivitySignature = signature;
    const activityId = this.buildGovernanceHookActivityId('discovery', signature);
    this.recordDiscoveryActivity({
      id: activityId,
      happenedAt: new Date().toISOString(),
      status: this.areGovernanceHooksReady(cards) ? 'success' : 'warning',
      action: 'policy-hook',
      summary: this.translateOrFallback('entity.discovery.hooks.activity.summary', '治理评分钩子已更新'),
      detail: this.buildGovernanceHookDetail(cards),
      workspacePath: this.router.createUrlTree(['/entities', 'discovery'], { queryParams: { ...this.currentQueryParams } }).toString()
    });
  }

  private loadGovernancePresets(): void {
    this.entitySvc.getDiscoveryGovernancePresets(8).subscribe({
      next: message => {
        if (message.code !== 0) {
          this.governancePresets = readDiscoveryGovernancePresets(8);
          this.governancePresetRegistrySource = this.governancePresets.length > 0 ? 'local' : 'empty';
          this.cdr.markForCheck();
          return;
        }
        const serverPresets = (message.data || []).slice(0, 8);
        this.governancePresets = serverPresets.length > 0 ? serverPresets : readDiscoveryGovernancePresets(8);
        this.governancePresetRegistrySource = serverPresets.length > 0 ? 'shared' : this.governancePresets.length > 0 ? 'local' : 'empty';
        writeDiscoveryGovernancePresets(this.governancePresets, 8);
        if (!this.governancePresetsMigrated) {
          this.governancePresetsMigrated = true;
          this.syncLocalGovernancePresets(serverPresets);
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

  private loadDiscoveryGovernanceActivities(): void {
    this.entitySvc.getDiscoveryGovernanceActivities(8).subscribe({
      next: message => {
        if (message.code !== 0) {
          this.serverDiscoveryActivities = [];
          this.localDiscoveryActivities = readDiscoveryGovernanceActivities(8);
          this.cdr.markForCheck();
          return;
        }
        const serverActivities = (message.data || []).slice(0, 8);
        this.serverDiscoveryActivities = serverActivities;
        this.localDiscoveryActivities = readDiscoveryGovernanceActivities(8);
        if (!this.discoveryActivitiesMigrated) {
          this.discoveryActivitiesMigrated = true;
          this.syncLocalDiscoveryActivities(serverActivities);
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.serverDiscoveryActivities = [];
        this.localDiscoveryActivities = readDiscoveryGovernanceActivities(8);
        this.cdr.markForCheck();
      }
    });
  }

  private loadDefinitionWorkspaceActivities(): void {
    this.entitySvc.getDefinitionWorkspaceActivities(8).subscribe({
      next: message => {
        if (message.code !== 0) {
          this.serverWorkspaceActivities = [];
          this.cdr.markForCheck();
          return;
        }
        this.serverWorkspaceActivities = [...(message.data || [])]
          .map(activity => ({
            ...activity,
            happenedAt: this.normalizeLifecycleTimestamp(activity.happenedAt) || formatDate(Date.now(), 'yyyy-MM-dd HH:mm:ss', 'en-US')
          }))
          .sort((left, right) => this.compareDiscoveryTimestamps(left.happenedAt, right.happenedAt));
        this.cdr.markForCheck();
      },
      error: () => {
        this.serverWorkspaceActivities = [];
        this.cdr.markForCheck();
      }
    });
  }

  private syncLocalGovernancePresets(serverPresets: DiscoveryGovernancePreset[]): void {
    const localPresets = readDiscoveryGovernancePresets(8);
    const missing = localPresets.filter(localPreset => !serverPresets.some(serverPreset => serverPreset.id === localPreset.id));
    if (missing.length === 0) {
      return;
    }
    forkJoin(
      missing.map(preset =>
        this.entitySvc.saveDiscoveryGovernancePreset(preset).pipe(catchError(() => of(undefined)))
      )
    ).subscribe(() => {
      this.loadGovernancePresets();
    });
  }

  private syncLocalDiscoveryActivities(serverActivities: DiscoveryGovernanceActivity[]): void {
    const localActivities = this.localDiscoveryActivities;
    const missing = localActivities.filter(localActivity => !serverActivities.some(serverActivity => serverActivity.id === localActivity.id));
    if (missing.length === 0) {
      return;
    }
    forkJoin(
      missing.map(activity =>
        this.entitySvc.saveDiscoveryGovernanceActivity(activity).pipe(catchError(() => of(undefined)))
      )
    ).subscribe(() => {
      this.loadDiscoveryGovernanceActivities();
    });
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
    return summary === this.translateOrFallback('entity.definition.workspace.hooks.activity.summary', '治理评分钩子已更新')
      || summary === '治理评分钩子已更新';
  }

  private isGovernanceHookDiscoveryActivity(activity: DiscoveryGovernanceActivity | undefined): boolean {
    if (activity == null) {
      return false;
    }
    if (activity.action === 'policy-hook') {
      return true;
    }
    const summary = this.trimText(activity.summary);
    return summary === this.translateOrFallback('entity.discovery.hooks.activity.summary', '治理评分钩子已更新')
      || summary === '治理评分钩子已更新';
  }

  private openDefinitionWorkspace(preset?: DiscoveryGovernancePreset, remedy?: DiscoveryWorkspaceRemedy): void {
    this.router.navigate(['/entities', 'import'], {
      queryParams: {
        format: 'json',
        remedy: remedy || null,
        ...buildGovernancePresetQueryParams(preset),
        owner: this.trimText(this.ownerDraft) || null,
        system: this.trimText(this.systemDraft || undefined) || null,
        environment: this.trimText(this.environmentDraft || undefined) || null,
        source: this.trimText(this.sourceDraft || undefined) || null
      }
    });
  }

  private normalizeWorkspaceRemedy(value?: string | null): DiscoveryWorkspaceRemedy | undefined {
    switch (value) {
      case 'preset':
      case 'ownership':
      case 'definition':
      case 'telemetry':
        return value;
      default:
        return undefined;
    }
  }

  private runPendingWorkspaceRemedy(): void {
    const remedy = this.pendingWorkspaceRemedy;
    if (remedy == null) {
      return;
    }
    this.pendingWorkspaceRemedy = undefined;
    setTimeout(() => {
      switch (remedy) {
        case 'preset':
          this.scrollToWorkspaceSection('discovery-governance-filters');
          break;
        case 'ownership':
          this.scrollToWorkspaceSection(this.visibleTelemetryDiscoveryRows.length > 0 ? 'discovery-bulk-governance' : 'discovery-governance-filters');
          break;
        case 'definition':
          this.openDefinitionWorkspace(this.preferredGovernancePreset, 'ownership');
          break;
        case 'telemetry':
        default:
          this.scrollToWorkspaceSection('discovery-results-card');
      }
    }, 0);
  }

  private persistLocalGovernancePreset(preset: DiscoveryGovernancePreset): void {
    const next = [preset, ...this.governancePresets.filter(item => item.id !== preset.id && item.name !== preset.name)]
      .sort((left, right) => this.compareDiscoveryTimestamps(left.updatedAt, right.updatedAt))
      .slice(0, 8);
    this.governancePresets = next;
    writeDiscoveryGovernancePresets(next, 8);
    this.presetNameDraft = '';
    this.notifySvc.success(
      this.translateOrFallback('entity.entry-source.telemetry', 'Telemetry Discovery'),
      this.translateOrFallback('entity.telemetry.discovery.preset.saved', '治理预设已保存。')
    );
    this.cdr.markForCheck();
  }

  private applyGovernancePresetDelete(presetId: string): void {
    const next = this.governancePresets.filter(item => item.id !== presetId);
    this.governancePresets = next;
    writeDiscoveryGovernancePresets(next, 8);
    this.cdr.markForCheck();
  }

  private compareDiscoveryTimestamps(left?: string | number | null, right?: string | number | null): number {
    const leftValue = left == null ? 0 : new Date(left).getTime();
    const rightValue = right == null ? 0 : new Date(right).getTime();
    return rightValue - leftValue;
  }

  private loadServerGovernanceActivities(): void {
    this.entitySvc.getDefinitionActivities(undefined, 16).subscribe({
      next: message => {
        if (message.code !== 0) {
          this.serverGovernanceActivities = [];
          this.cdr.markForCheck();
          return;
        }
        this.serverGovernanceActivities = this.sortServerActivities(
          (message.data || []).filter(activity => !this.isDefinitionActivityType(activity.activityType) && this.matchesServerGovernanceScope(activity))
        ).slice(0, 8);
        this.cdr.markForCheck();
      },
      error: () => {
        this.serverGovernanceActivities = [];
        this.cdr.markForCheck();
      }
    });
  }

  private matchesServerGovernanceScope(activity: EntityDefinitionActivity): boolean {
    const haystack = this.normalizeSearchScope(`${activity.summary || ''} ${activity.detail || ''}`) || '';
    const query = this.normalizeSearchScope(this.trimText(this.telemetryDiscoverySearch));
    if (query != null && !haystack.includes(query)) {
      return false;
    }
    const owner = this.normalizeSearchScope(this.trimText(this.owner));
    if (owner != null && !haystack.includes(owner)) {
      return false;
    }
    const system = this.normalizeSearchScope(this.trimText(this.system));
    if (system != null && !haystack.includes(system)) {
      return false;
    }
    const environment = this.normalizeSearchScope(this.trimText(this.environment));
    if (environment != null && !haystack.includes(environment)) {
      return false;
    }
    const source = this.normalizeSearchScope(this.trimText(this.source));
    if (source != null && !haystack.includes(source)) {
      return false;
    }
    return true;
  }

  private isDefinitionActivityType(activityType?: string | null): boolean {
    return activityType === 'definition_import' || activityType === 'definition_update';
  }

  private sortServerActivities(activities: EntityDefinitionActivity[]): EntityDefinitionActivity[] {
    return [...activities].sort((left, right) => {
      const leftValue = new Date(left.gmtCreate || 0).getTime();
      const rightValue = new Date(right.gmtCreate || 0).getTime();
      return rightValue - leftValue;
    });
  }

  private normalizeSearchScope(value?: string | null): string | undefined {
    const trimmed = this.trimText(value);
    if (trimmed == null) {
      return undefined;
    }
    return trimmed.toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  private normalizeLifecycleTimestamp(value?: string | number | null): string | undefined {
    if (value == null || value === '') {
      return undefined;
    }
    return String(value);
  }

  private buildMergedEntityRefs(rows: TelemetryDiscoveryRow[], responses: Message<void>[]): DiscoveryGovernanceActivityEntityRef[] {
    const refs = new Map<number, DiscoveryGovernanceActivityEntityRef>();
    responses.forEach((message, index) => {
      if (message.code !== 0) {
        return;
      }
      const candidate = this.getActiveTelemetryCandidate(rows[index]);
      if (candidate == null) {
        return;
      }
      refs.set(candidate.entityId, {
        entityId: candidate.entityId,
        entityName: candidate.entityName
      });
    });
    return Array.from(refs.values());
  }

  private cloneEntityDto(source: EntityDto): EntityDto {
    const payload = new EntityDto();
    payload.entity = Object.assign(new Entity(), source.entity);
    payload.identities = (source.identities || []).map(identity => Object.assign(new EntityIdentity(), identity));
    payload.monitorBinds = (source.monitorBinds || []).map(bind => Object.assign(new EntityMonitorBind(), bind));
    payload.relations = (source.relations || []).map(relation => ({ ...relation }));
    return payload;
  }

  private applyBulkGovernanceOverrides(payload: EntityDto): EntityDto {
    const owner = this.trimText(this.bulkOwnerDraft);
    const system = this.trimText(this.bulkSystemDraft || undefined);
    if (owner != null) {
      payload.entity.owner = owner;
    }
    if (system != null) {
      payload.entity.system = system;
      payload.entity.labels = {
        ...(payload.entity.labels || {}),
        system
      };
    }
    return payload;
  }

  private bindTelemetryMonitorToCandidate(row: TelemetryDiscoveryRow) {
    const candidate = this.getActiveTelemetryCandidate(row);
    if (candidate == null) {
      return of({
        code: 1,
        msg: this.translateOrFallback('entity.telemetry.discovery.bind.no-candidate', '当前线索没有候选实体可归并。'),
        data: undefined
      } as Message<void>);
    }
    return this.entitySvc.getEntity(candidate.entityId).pipe(
      switchMap(message => {
        if (message.code !== 0 || message.data == null) {
          return of({
            code: message.code || 1,
            msg: message.msg || this.translateOrFallback('entity.telemetry.discovery.bind.load-failed', '加载候选实体失败。'),
            data: undefined
          } as Message<void>);
        }
        const payload = this.withTelemetryMonitorBound(message.data, row.monitor, candidate);
        if ((message.data.monitorBinds || []).some(bind => bind.monitorId === row.monitor.id)) {
          return of({
            code: 0,
            msg: this.translateOrFallback('entity.telemetry.discovery.bind.already', '该监控已经归并到候选实体。'),
            data: undefined
          } as Message<void>);
        }
        return this.entitySvc.editEntity(payload).pipe(
          map(editMessage => ({
            code: editMessage.code,
            msg: editMessage.msg,
            data: undefined
          }) as Message<void>)
        );
      }),
      catchError(error =>
        of({
          code: 1,
          msg: error?.msg || error?.message || this.translateOrFallback('entity.telemetry.discovery.bind.failed', '归并失败，请稍后再试。'),
          data: undefined
        } as Message<void>)
      )
    );
  }

  private withTelemetryMonitorBound(source: EntityDto, monitor: Monitor, candidate: EntityMonitorBindingCandidate): EntityDto {
    const payload = new EntityDto();
    payload.entity = Object.assign(new Entity(), source.entity);
    payload.identities = (source.identities || []).map(identity => Object.assign(new EntityIdentity(), identity));
    payload.monitorBinds = (source.monitorBinds || []).map(bind => Object.assign(new EntityMonitorBind(), bind));
    payload.relations = (source.relations || []).map(relation => ({ ...relation }));
    payload.monitorBinds.push(this.buildTelemetryMonitorBind(monitor, candidate));
    return payload;
  }

  private buildTelemetryMonitorBind(monitor: Monitor, candidate?: EntityMonitorBindingCandidate): EntityMonitorBind {
    const bind = new EntityMonitorBind();
    bind.monitorId = monitor.id;
    bind.bindType = candidate ? 'candidate' : 'manual';
    bind.bindSource = candidate ? 'telemetry_discovery' : 'manual';
    bind.status = 'active';
    bind.score = candidate?.score || 100;
    bind.matchContext = candidate?.matchedIdentities;
    return bind;
  }

  private refreshTelemetryDiscoveryState(): void {
    const query = this.trimText(this.telemetryDiscoverySearch);
    if (query == null) {
      this.cdr.markForCheck();
      return;
    }
    this.loadTelemetryDiscovery(query);
  }

  private extractTelemetryIdentityMatches(monitor: Monitor): Array<{ key: string; value: string }> {
    return extractTelemetryIdentityMatchesForMonitor(monitor, {
      hostLikeApps: this.hostLikeApps,
      deviceLikeApps: this.deviceLikeApps,
      queueLikeApps: this.queueLikeApps,
      apiLikeApps: this.apiLikeApps,
      endpointLikeApps: this.endpointLikeApps,
      databaseLikeApps: this.databaseLikeApps,
      middlewareLikeApps: this.middlewareLikeApps,
      serviceLikeApps: this.serviceLikeApps
    });
  }

  private inferTelemetryEntityType(monitor: Monitor, identities: Array<{ key: string; value: string }>): string {
    return inferTelemetryEntityTypeForMonitor(monitor, identities, {
      hostLikeApps: this.hostLikeApps,
      deviceLikeApps: this.deviceLikeApps,
      queueLikeApps: this.queueLikeApps,
      apiLikeApps: this.apiLikeApps,
      endpointLikeApps: this.endpointLikeApps,
      databaseLikeApps: this.databaseLikeApps,
      middlewareLikeApps: this.middlewareLikeApps,
      serviceLikeApps: this.serviceLikeApps
    });
  }

  private inferTelemetryEntityName(monitor: Monitor, entityType: string, identities: Array<{ key: string; value: string }>): string {
    const inferredName = inferTelemetryEntityNameForMonitor(monitor, entityType, identities);
    return inferredName === 'monitor-unknown' ? `monitor-${monitor.id}` : inferredName;
  }

  private primaryIdentityKeyForType(entityType: string): string {
    return getPrimaryIdentityKeyForEntityType(entityType);
  }

  private lookupTelemetryContext(monitor: Monitor, keys: string[]): string | undefined {
    for (const key of keys) {
      const labelValue = this.trimText(monitor.labels?.[key]);
      if (labelValue != null) {
        return labelValue;
      }
      const annotationValue = this.trimText(monitor.annotations?.[key]);
      if (annotationValue != null) {
        return annotationValue;
      }
    }
    return undefined;
  }

  private inferTelemetryLabels(monitor: Monitor): Array<{ key: string; value: string }> {
    const labels: Array<{ key: string; value: string }> = [];
    this.catalogLabelPresets.forEach(labelKey => {
      const value = this.lookupTelemetryContext(monitor, [labelKey]);
      if (value != null) {
        labels.push({ key: labelKey, value });
      }
    });
    return labels;
  }

  private defaultIdentityPriority(identityKey?: string): number {
    return getEntityIdentityPriority(identityKey);
  }

  private trimText(value?: string | null): string | undefined {
    if (value == null) {
      return undefined;
    }
    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
  }

  private readQueryValue(value: string | null): string | undefined {
    return this.trimText(value || undefined);
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

  private indexCandidateSummaries(summaries: EntitySummary[]): Record<number, EntitySummary> {
    return summaries.reduce(
      (accumulator, summary) => {
        if (summary.entity?.id != null) {
          accumulator[summary.entity.id] = summary;
        }
        return accumulator;
      },
      {} as Record<number, EntitySummary>
    );
  }

  private matchesGovernanceFilters(row: TelemetryDiscoveryRow): boolean {
    return (
      this.matchesGovernanceValue(this.getRowOwner(row), this.owner) &&
      this.matchesGovernanceValue(this.getRowSystem(row), this.system) &&
      this.matchesGovernanceValue(this.getRowSource(row), this.source) &&
      this.matchesGovernanceValue(this.getRowEnvironment(row), this.environment) &&
      this.matchesGovernanceValue(this.getRowStatus(row), this.status)
    );
  }

  private matchesGovernanceValue(actual?: string, expected?: string): boolean {
    if (expected == null) {
      return true;
    }
    return this.trimText(actual)?.toLowerCase() === expected.toLowerCase();
  }

  private getGovernancePresetConflictFieldsForRow(
    row: TelemetryDiscoveryRow,
    preset: DiscoveryGovernancePreset
  ): GovernanceConflictField[] {
    const fields: GovernanceConflictField[] = [];
    if (this.trimText(preset.owner) != null && this.trimText(preset.owner) !== this.getRowOwner(row)) {
      fields.push('owner');
    }
    if (this.trimText(preset.system) != null && this.trimText(preset.system) !== this.getRowSystem(row)) {
      fields.push('system');
    }
    if (this.trimText(preset.environment) != null && this.trimText(preset.environment) !== this.getRowEnvironment(row)) {
      fields.push('environment');
    }
    if (this.trimText(preset.source) != null && this.trimText(preset.source) !== this.getRowSource(row)) {
      fields.push('source');
    }
    if (this.trimText(preset.status) != null && this.trimText(preset.status) !== this.getRowStatus(row)) {
      fields.push('status');
    }
    return fields;
  }

  private getGovernanceFieldLabel(field: GovernanceConflictField): string {
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

  private getRowOwner(row: TelemetryDiscoveryRow): string | undefined {
    const summary = this.getResolvedTelemetryCandidateSummary(row) || this.getActiveTelemetryCandidateSummary(row);
    return this.trimText(summary?.entity.owner) || this.trimText(row.draftDto.entity.owner);
  }

  private getRowSystem(row: TelemetryDiscoveryRow): string | undefined {
    const summary = this.getResolvedTelemetryCandidateSummary(row) || this.getActiveTelemetryCandidateSummary(row);
    return this.trimText(summary?.entity.system) || this.trimText(row.draftDto.entity.system);
  }

  private getRowSource(row: TelemetryDiscoveryRow): string | undefined {
    const summary = this.getResolvedTelemetryCandidateSummary(row) || this.getActiveTelemetryCandidateSummary(row);
    return this.trimText(summary?.entity.source) || this.trimText(row.draftDto.entity.source);
  }

  private getRowEnvironment(row: TelemetryDiscoveryRow): string | undefined {
    const summary = this.getResolvedTelemetryCandidateSummary(row) || this.getActiveTelemetryCandidateSummary(row);
    return this.trimText(summary?.entity.environment) || this.trimText(row.draftDto.entity.environment);
  }

  private getRowStatus(row: TelemetryDiscoveryRow): string | undefined {
    const summary = this.getResolvedTelemetryCandidateSummary(row) || this.getActiveTelemetryCandidateSummary(row);
    return this.trimText(summary?.status?.status) || this.trimText(row.draftDto.entity.status);
  }

  private isTelemetryDraftDefinitionReady(row: TelemetryDiscoveryRow): boolean {
    return (
      this.trimText(row.draftDto.entity.name) != null &&
      this.trimText(row.draftDto.entity.type) != null &&
      !this.hasTelemetryDraftOwnershipGap(row) &&
      row.identityMatches.length > 0
    );
  }

  private scrollToWorkspaceSection(sectionId: string): void {
    if (typeof document === 'undefined') {
      return;
    }
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  private buildGovernanceHookDetail(cards: Array<{ title: string; metric: string }>): string {
    return cards.map(card => `${card.title} ${card.metric}`).join(' · ');
  }

  private buildGovernanceHookSignature(cards: Array<{ key: string; metric: string }>, ...parts: Array<string | undefined>): string {
    return [
      ...parts.map(value => this.trimText(value) || '-'),
      ...cards.map(card => `${card.key}:${card.metric}`)
    ].join('|');
  }

  private buildGovernanceHookActivityId(prefix: string, signature: string): string {
    let hash = 0;
    for (let index = 0; index < signature.length; index += 1) {
      hash = (hash * 31 + signature.charCodeAt(index)) >>> 0;
    }
    return `${prefix}-governance-hook-${hash.toString(36)}`;
  }

  private areGovernanceHooksReady(cards: Array<{ metric: string }>): boolean {
    return cards.every(card => {
      const normalized = this.trimText(card.metric) || '';
      if (normalized.includes('/')) {
        const [readyValue, totalValue] = normalized.split('/');
        const ready = Number(readyValue);
        const total = Number(totalValue);
        return !Number.isNaN(ready) && !Number.isNaN(total) && total > 0 && ready >= total;
      }
      return normalized === this.translateOrFallback('entity.detail.hooks.ready', '已就绪');
    });
  }

  getTelemetryDraftTitle(row: TelemetryDiscoveryRow): string {
    return row.draftDto.entity.displayName || row.draftDto.entity.name;
  }

  getTelemetryDraftSubtitle(row: TelemetryDiscoveryRow): string | undefined {
    const entity = row.draftDto.entity;
    if (!entity.displayName || entity.displayName === entity.name) {
      return undefined;
    }
    return entity.name;
  }

  getTelemetryDraftKindLabel(row: TelemetryDiscoveryRow): string {
    return this.translateOrFallback(`entity.type.${row.draftDto.entity.type}`, this.humanize(row.draftDto.entity.type));
  }

  getTelemetryDraftContextSummary(row: TelemetryDiscoveryRow): string | undefined {
    const entity = row.draftDto.entity;
    const segments = [
      this.trimText(entity.namespace),
      this.trimText(entity.environment),
      this.trimText(entity.owner),
      this.trimText(entity.system)
    ].filter((value): value is string => value != null);
    return segments.length > 0 ? segments.join(' · ') : undefined;
  }

  getTelemetryDraftIdentitySummary(row: TelemetryDiscoveryRow): string | undefined {
    const entity = row.draftDto.entity;
    const segments = [
      `${row.draftDto.identities?.length || 0} ${this.translateOrFallback('entity.telemetry.discovery.draft.identities', '身份标识')}`,
      `${row.draftDto.monitorBinds?.length || 0} ${this.translateOrFallback('entity.telemetry.discovery.draft.monitors', '监控绑定')}`,
      this.trimText(entity.source) ? this.translateOrFallback(`entity.source.${entity.source}`, this.humanize(entity.source)) : undefined
    ].filter((value): value is string => value != null);
    return segments.join(' · ');
  }

  private hasTelemetryDraftOwnershipGap(row: TelemetryDiscoveryRow): boolean {
    return this.trimText(row.draftDto.entity.owner) == null || this.trimText(row.draftDto.entity.system) == null;
  }
}
