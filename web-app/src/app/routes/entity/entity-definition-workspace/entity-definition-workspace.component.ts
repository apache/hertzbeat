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
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnInit } from '@angular/core';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { I18NService } from '@core';
import { ALAIN_I18N_TOKEN } from '@delon/theme';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { Entity } from '../../../pojo/Entity';
import { EntityCatalogSuggestions } from '../../../pojo/EntityCatalogSuggestions';
import { EntityDefinitionFormat, EntityDefinitionRequest } from '../../../pojo/EntityDefinition';
import { EntityDefinitionActivity, EntityDto } from '../../../pojo/EntityDetail';
import { EntityDiscoveryGovernanceActivity, EntityDiscoveryGovernancePreset } from '../../../pojo/EntityDiscoveryGovernance';
import { DefinitionWorkspaceTemplate } from '../../../pojo/EntityDefinitionWorkspaceTemplate';
import { EntityService } from '../../../service/entity.service';
import { PlatformRailNavGroup, PlatformRailNavItem } from '../../../shared/components/platform-rail-nav/platform-rail-nav.component';
import { PlatformFactsStripItem } from '../../../shared/components/platform-facts-strip/platform-facts-strip.component';
import {
  WorkspaceGuidanceAction,
  WorkspaceGuidanceLink,
  WorkspaceGuidanceReason
} from '../../../shared/components/workspace-guidance-panel/workspace-guidance-panel.component';
import { normalizeDefinitionRequest } from '../entity-definition-request.util';
import { DEFINITION_DISCOVERY_QUERY_IDENTITY_KEYS } from '../entity-otel-identity.util';
import { buildGovernancePresetQueryParams, readGovernancePresetFromQuery } from '../entity-discovery-preset.util';
import {
  DefinitionWorkspaceTemplateSource,
  readDefinitionWorkspaceTemplates,
  writeDefinitionWorkspaceTemplates
} from '../entity-definition-template.util';
import {
  DefinitionWorkspaceResumeState,
  persistDefinitionWorkspaceResumeState,
  readDefinitionWorkspaceResumeState
} from '../entity-definition-resume.util';
import {
  DefinitionImportActivity,
  DefinitionImportActivityFormat,
  DefinitionImportActivityStatus,
  readDefinitionImportActivities,
  writeDefinitionImportActivities
} from '../entity-definition-activity.util';
import { findDiscoveryGovernanceActivity } from '../entity-discovery-activity.util';
import {
  buildGovernanceRegistryPolicyPresentation,
  buildGovernanceRecipePresentation,
  buildGovernanceRegistrySignalPresentation,
  GovernanceRecipePriority,
  GovernanceRegistrySignalPresentation,
  requiresGovernanceRegistryRemediation
} from '../entity-governance-recipe.util';

interface DefinitionImportPreviewRow {
  dto: EntityDto;
  title: string;
  subtitle?: string;
  kindLabel: string;
  sourceLabel: string;
  telemetryLabel: string;
  gapKeys: ImportPreviewGapKey[];
  gaps: string[];
  validationColor: string;
  validationLabel: string;
  readinessScore: number;
}

type ImportPreviewGapKey = 'owner' | 'system' | 'implementedBy' | 'telemetry' | 'runbook';

interface DefinitionGovernanceHint {
  id: string;
  tone: 'warning' | 'processing' | 'default';
  title: string;
  copy: string;
  metric?: string;
}

interface DefinitionImportResultRow {
  entityId: number;
  title: string;
  subtitle: string | undefined;
  kindLabel: string;
  sourceLabel: string;
}

type StarterDefinitionKind = 'system' | 'service' | 'api' | 'endpoint';
type DefinitionDraftSource = 'blank' | 'example' | 'starter' | 'preset' | 'template' | 'seed' | 'manual' | 'entity';

interface StarterTemplatePreset {
  id: string;
  kind: StarterDefinitionKind;
  title: string;
  copy: string;
  emphasis?: string;
}

interface DefinitionWorkspaceSeedState {
  content?: string;
  format?: EntityDefinitionFormat;
  source?: string;
  count?: number;
  autoPreview?: boolean;
  activityId?: string;
}

interface DefinitionWorkspaceLifecycleRecord {
  id: string;
  title: string;
  summary: string;
  detail?: string;
  happenedAt?: string;
  actionLabel?: string;
  action?: 'discovery' | 'entity-detail' | 'entity-editor' | 'entity' | 'snapshot-discovery' | 'snapshot-definition';
  entityId?: number;
}

interface DefinitionSharedGovernanceSnapshotCard {
  key: 'discovery' | 'definition';
  title: string;
  status: DefinitionImportActivityStatus | EntityDiscoveryGovernanceActivity['status'];
  summary: string;
  detail?: string;
  happenedAt?: string;
  actionLabel: string;
  action: 'discovery' | 'definition';
}

type GovernanceConflictField = 'owner' | 'system' | 'environment' | 'source' | 'status';
type DefinitionWorkspaceRemedy = 'preset' | 'ownership' | 'definition' | 'telemetry';

interface DefinitionGovernanceHookCard {
  key: 'registry' | 'preset' | 'ownership' | 'definition' | 'telemetry';
  title: string;
  metric: string;
  summary: string;
  priority: GovernanceRecipePriority;
  priorityLabel: string;
  nextStep: string;
  actionLabel: string;
  action: 'preset' | 'ownership' | 'definition' | 'telemetry' | 'registry-refresh' | 'registry-sync' | 'registry-seed';
  preset?: EntityDiscoveryGovernancePreset;
}

interface DefinitionGovernancePolicyCard {
  key: 'registry' | 'preset' | 'ownership' | 'definition' | 'telemetry';
  title: string;
  summary: string;
  actionLabel: string;
  action: DefinitionGovernanceHookCard['action'];
  preset?: EntityDiscoveryGovernancePreset;
}

type DefinitionImportPreviewScope = 'all' | 'ready' | 'attention' | 'telemetry';

interface DefinitionImportQueueGroup {
  key: 'ready' | 'attention' | 'telemetry';
  title: string;
  summary: string;
  actionLabel: string;
  action: 'submit-ready' | 'focus-attention' | 'open-discovery';
  scope: DefinitionImportPreviewScope;
  rows: DefinitionImportPreviewRow[];
}

type DefinitionImportPreviewRowAction = 'submit-ready' | 'ownership' | 'telemetry';

interface DefinitionResumeNextActionCard {
  title: string;
  copy: string;
  actionLabel: string;
  secondaryLabel?: string;
  action: 'submit-ready' | 'telemetry' | 'ownership' | 'view-entity' | 'open-catalog';
  row?: DefinitionImportPreviewRow;
  entityId?: number;
}

@Component({
  standalone: false,  selector: 'app-entity-definition-workspace',
  templateUrl: './entity-definition-workspace.component.html',
  styleUrls: ['./entity-definition-workspace.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EntityDefinitionWorkspaceComponent implements OnInit {
  readonly starterDefinitionKinds: StarterDefinitionKind[] = ['system', 'service', 'api', 'endpoint'];
  entityId?: number;
  entityTitle?: string;
  entityKindLabel?: string;
  isEditMode = false;
  importFormat: EntityDefinitionFormat = 'yaml';
  importDraft = '';
  importError?: string;
  importParsing = false;
  importSubmitting = false;
  importSubmitSucceeded = false;
  importPreviewDtos: EntityDto[] = [];
  importPreviewRows: DefinitionImportPreviewRow[] = [];
  importResultRows: DefinitionImportResultRow[] = [];
  importPreviewScope: DefinitionImportPreviewScope = 'all';
  importActivities: DefinitionImportActivity[] = readDefinitionImportActivities(8);
  serverWorkspaceActivities: DefinitionImportActivity[] = [];
  serverImportActivities: DefinitionImportActivity[] = [];
  serverGovernanceActivities: EntityDefinitionActivity[] = [];
  sharedDiscoveryActivities: EntityDiscoveryGovernanceActivity[] = [];
  workspaceTemplates: DefinitionWorkspaceTemplate[] = readDefinitionWorkspaceTemplates(8);
  workspaceTemplateRegistrySource: 'shared' | 'local' | 'empty' = 'empty';
  templateNameDraft = '';
  draftSourceType: DefinitionDraftSource = 'example';
  draftSourceName?: string;
  importOwnerDraft = '';
  importSystemDraft?: string | null = null;
  importRunbookDraft = '';
  governancePresetSeed?: EntityDiscoveryGovernancePreset;
  catalogSuggestions = new EntityCatalogSuggestions();
  seedSource?: string;
  seedEntityCount?: number;
  seedActivityId?: string;
  returnDiscoveryPath?: string;
  private loadedDefinitionContent = '';
  private loadedDefinitionFormat: Exclude<EntityDefinitionFormat, 'curl'> = 'yaml';
  private suppressDraftSourceTracking = false;
  private workspaceTemplatesMigrated = false;
  private definitionWorkspaceActivitiesMigrated = false;
  private definitionGovernanceHookSyncTimer?: ReturnType<typeof setTimeout>;
  private lastGovernanceHookActivitySignature?: string;
  private pendingWorkspaceRemedy?: DefinitionWorkspaceRemedy;
  private readonly handledImportPreviewRowKeys = new Set<string>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private entitySvc: EntityService,
    private notifySvc: NzNotificationService,
    private cdr: ChangeDetectorRef,
    @Inject(ALAIN_I18N_TOKEN) private i18nSvc: I18NService
  ) {}

  ngOnInit(): void {
    this.loadCatalogSuggestions();
    this.loadWorkspaceTemplates();
    this.loadDefinitionWorkspaceActivities();
    this.loadDiscoveryGovernanceActivities();
    this.route.paramMap.subscribe(paramMap => {
      const entityIdParam = paramMap.get('entityId');
      const parsedEntityId = entityIdParam == null ? NaN : Number(entityIdParam);
      this.entityId = Number.isNaN(parsedEntityId) ? undefined : parsedEntityId;
      this.isEditMode = this.entityId != undefined;
      const format = this.route.snapshot.queryParamMap.get('format');
      if (format === 'yaml' || format === 'json' || format === 'curl') {
        this.importFormat = format;
      } else {
        this.importFormat = 'yaml';
      }
      this.resetWorkspaceState();
      this.pendingWorkspaceRemedy = this.normalizeWorkspaceRemedy(this.route.snapshot.queryParamMap.get('remedy'));
      this.governancePresetSeed = this.resolveGovernancePresetSeed(this.route.snapshot.queryParamMap);
      this.returnDiscoveryPath = this.trimText(this.route.snapshot.queryParamMap.get('returnDiscoveryPath') || undefined);
      this.applyGovernancePresetDrafts();
      this.recordGovernancePresetWorkspaceActivity();
      if (this.isEditMode) {
        this.loadExistingEntityWorkspace();
        return;
      }
      const seedState = this.readSeedState();
      if (seedState?.format === 'yaml' || seedState?.format === 'json' || seedState?.format === 'curl') {
        this.importFormat = seedState.format;
      }
      if (seedState?.content != null && seedState.content.trim() !== '') {
        this.applySeedState(seedState);
        return;
      }
      const resumeToken = this.trimText(this.route.snapshot.queryParamMap.get('resumeDefinitionToken') || undefined);
      if (resumeToken != null) {
        this.loadResumeStateFromServer(resumeToken);
        return;
      }
      this.continueWithoutResumeSeed();
    });
  }

  private continueWithoutResumeSeed(): void {
      const seedActivityId = this.trimText(this.route.snapshot.queryParamMap.get('seedActivity') || undefined);
      if (seedActivityId != null) {
        this.loadSeedStateFromServer(seedActivityId);
        return;
      }
      if (this.importDraft.trim() === '') {
        this.setDraftContent(this.getDefinitionImportExample(), 'example');
      }
      this.loadDefinitionActivities();
      this.runPendingWorkspaceRemedy();
      this.cdr.markForCheck();
  }

  get importReadyCount(): number {
    return this.activeImportPreviewRows.filter(row => row.gaps.length === 0).length;
  }

  get importNeedsAttentionCount(): number {
    return this.activeImportPreviewRows.filter(row => row.gaps.length > 0).length;
  }

  get importTelemetryPendingCount(): number {
    return this.activeImportPreviewRows.filter(row => (row.dto.monitorBinds?.length || 0) === 0 && (row.dto.identities?.length || 0) === 0).length;
  }

  get importOwnerMissingCount(): number {
    return this.activeImportPreviewRows.filter(row => row.gapKeys.includes('owner')).length;
  }

  get importSystemMissingCount(): number {
    return this.activeImportPreviewRows.filter(row => row.gapKeys.includes('system')).length;
  }

  get importRunbookMissingCount(): number {
    return this.activeImportPreviewRows.filter(row => row.gapKeys.includes('runbook')).length;
  }

  get activeImportPreviewRows(): DefinitionImportPreviewRow[] {
    if (this.handledImportPreviewRowKeys.size === 0) {
      return this.importPreviewRows;
    }
    return this.importPreviewRows.filter(row => !this.handledImportPreviewRowKeys.has(this.getImportPreviewRowKey(row)));
  }

  get importBlockedCount(): number {
    return this.activeImportPreviewRows.filter(row => row.gaps.length > 0).length;
  }

  get canSubmitReadyPreviewRows(): boolean {
    return !this.isEditMode && this.importReadyCount > 0 && !this.importSubmitting && !this.importParsing;
  }

  get visibleImportPreviewRows(): DefinitionImportPreviewRow[] {
    const rows = this.activeImportPreviewRows;
    switch (this.importPreviewScope) {
      case 'ready':
        return rows.filter(row => row.gaps.length === 0);
      case 'attention':
        return rows.filter(row => row.gaps.length > 0);
      case 'telemetry':
        return rows.filter(row => (row.dto.monitorBinds?.length || 0) === 0 && (row.dto.identities?.length || 0) === 0);
      case 'all':
      default:
        return rows;
    }
  }

  get definitionImportQueueGroups(): DefinitionImportQueueGroup[] {
    const rows = this.activeImportPreviewRows;
    if (rows.length === 0) {
      return [];
    }
    const groups: DefinitionImportQueueGroup[] = [];
    const readyRows = rows.filter(row => row.gaps.length === 0);
    const attentionRows = rows.filter(row => row.gaps.length > 0);
    const telemetryRows = rows.filter(row => (row.dto.monitorBinds?.length || 0) === 0 && (row.dto.identities?.length || 0) === 0);
    if (readyRows.length > 0) {
      groups.push({
        key: 'ready',
        title: this.translateOrFallback('entity.definition.import.queue.ready.title', '可直接导入'),
        summary: this.translateOrFallback(
          'entity.definition.import.queue.ready.copy',
          attentionRows.length > 0
            ? `${readyRows.length} 条定义已经满足基本要求，可以先导入就绪项，剩余待处理项继续留在这里。`
            : `${readyRows.length} 条定义已经达到最小目录基线，可以直接导入到目录里。`
        ),
        actionLabel: this.translateOrFallback(
          attentionRows.length > 0 ? 'entity.definition.import.queue.ready.import' : 'entity.definition.import.queue.ready.action',
          attentionRows.length > 0 ? '只导入就绪项' : '立即导入'
        ),
        action: 'submit-ready',
        scope: 'ready',
        rows: readyRows
      });
    }
    if (attentionRows.length > 0) {
      groups.push({
        key: 'attention',
        title: this.translateOrFallback('entity.definition.import.queue.attention.title', '需要先补齐'),
        summary: this.translateOrFallback(
          'entity.definition.import.queue.attention.copy',
          `${attentionRows.length} 条定义还缺 owner、system、runbook 或接口上下文，建议先补齐再导入。`
        ),
        actionLabel: this.translateOrFallback('entity.definition.import.queue.attention.action', '聚焦待补齐项'),
        action: 'focus-attention',
        scope: 'attention',
        rows: attentionRows
      });
    }
    if (telemetryRows.length > 0) {
      groups.push({
        key: 'telemetry',
        title: this.translateOrFallback('entity.definition.import.queue.telemetry.title', '导入后仍需回到 discovery'),
        summary: this.translateOrFallback(
          'entity.definition.import.queue.telemetry.copy',
          `${telemetryRows.length} 条定义还没有遥测绑定，导入后仍需要回到遥测发现补充相关信息。`
        ),
        actionLabel: this.translateOrFallback('entity.definition.import.queue.telemetry.action', '回到 discovery 补证据'),
        action: 'open-discovery',
        scope: 'telemetry',
        rows: telemetryRows
      });
    }
    return groups;
  }

  get resumeNextActionCard(): DefinitionResumeNextActionCard | undefined {
    const handledRowKey = this.trimText(this.route.snapshot.queryParamMap.get('resumeHandledRowKey') || undefined);
    if (handledRowKey == null) {
      return undefined;
    }
    const handledRow = this.importPreviewRows.find(row => this.getImportPreviewRowKey(row) === handledRowKey);
    const handledRowTitle = handledRow?.title || this.translateOrFallback('entity.definition.resume.row', '这条定义');
    const nextTelemetryRow = this.getNextTelemetryImportPreviewRow();
    if (nextTelemetryRow != null) {
      return {
        title: this.translateOrFallback('entity.definition.resume.next-telemetry.title', '继续处理下一条遥测线索'),
        copy: this.translateOrFallback(
          'entity.definition.resume.next-telemetry.copy',
          `${handledRowTitle} 已经处理完成，建议直接继续处理 ${nextTelemetryRow.title}。`
        ),
        actionLabel: this.translateOrFallback('entity.definition.resume.next-telemetry.action', '继续处理下一条'),
        secondaryLabel: handledRow ? this.translateOrFallback('entity.definition.resume.view-handled-entity', '查看刚处理的实体') : undefined,
        action: 'telemetry',
        row: nextTelemetryRow,
        entityId: this.getResumeHandledEntityId()
      };
    }
    if (this.importReadyCount > 0) {
      return {
        title: this.translateOrFallback('entity.definition.resume.submit-ready.title', '继续导入就绪项'),
        copy: this.translateOrFallback(
          'entity.definition.resume.submit-ready.copy',
          `${handledRowTitle} 已经处理完成，当前还有 ${this.importReadyCount} 条定义可以直接导入。`
        ),
        actionLabel: this.translateOrFallback('entity.definition.resume.submit-ready.action', '导入就绪项'),
        secondaryLabel: this.getResumeHandledEntityId() != null
          ? this.translateOrFallback('entity.definition.resume.view-handled-entity', '查看刚处理的实体')
          : undefined,
        action: 'submit-ready',
        entityId: this.getResumeHandledEntityId()
      };
    }
    const nextAttentionRow = this.activeImportPreviewRows.find(row => row.gaps.length > 0);
    if (nextAttentionRow != null) {
      return {
        title: this.translateOrFallback('entity.definition.resume.next-attention.title', '继续补齐剩余阻塞项'),
        copy: this.translateOrFallback(
          'entity.definition.resume.next-attention.copy',
          `${handledRowTitle} 已经处理完成，当前还剩需要补充基础信息的定义，建议直接跳到下一条继续处理。`
        ),
        actionLabel: this.translateOrFallback('entity.definition.resume.next-attention.action', '继续补齐下一条'),
        secondaryLabel: this.getResumeHandledEntityId() != null
          ? this.translateOrFallback('entity.definition.resume.view-handled-entity', '查看刚处理的实体')
          : undefined,
        action: 'ownership',
        row: nextAttentionRow,
        entityId: this.getResumeHandledEntityId()
      };
    }
    const handledEntityId = this.getResumeHandledEntityId();
    if (handledEntityId != null) {
      return {
        title: this.translateOrFallback('entity.definition.resume.completed.title', '这批定义已经处理完'),
        copy: this.translateOrFallback(
          'entity.definition.resume.completed.copy',
          `${handledRowTitle} 已完成处理，当前 definition queue 已经清空，可以直接查看刚创建或归并的实体。`
        ),
        actionLabel: this.translateOrFallback('entity.definition.resume.completed.action', '查看刚处理的实体'),
        secondaryLabel: this.translateOrFallback('entity.definition.resume.open-catalog', '回到实体目录'),
        action: 'view-entity',
        entityId: handledEntityId
      };
    }
    return undefined;
  }

  get workspaceGuidanceHeadline(): string {
    return this.resumeNextActionCard?.title
      || this.workspaceGuidanceQueueGroups[0]?.title
      || this.translateOrFallback('entity.definition.workspace.guidance.headline.default', '下一步：先处理最靠前的一组定义');
  }

  get workspaceGuidanceDescription(): string {
    return this.resumeNextActionCard?.copy
      || this.workspaceGuidanceQueueGroups[0]?.summary
      || this.translateOrFallback(
        'entity.definition.workspace.guidance.description.default',
        '当前页面会把定义分成可导入、需补充和需回到遥测发现三类，建议先处理最靠前的一类。'
      );
  }

  get workspaceGuidancePrimaryAction(): WorkspaceGuidanceAction | undefined {
    if (this.resumeNextActionCard != null) {
      return {
        key: 'resume-primary',
        label: this.resumeNextActionCard.actionLabel,
        tone: 'primary'
      };
    }
    const primaryGroup = this.workspaceGuidanceQueueGroups[0];
    if (primaryGroup != null) {
      return {
        key: primaryGroup.action,
        label: primaryGroup.actionLabel,
        tone: 'primary'
      };
    }
    return undefined;
  }

  get workspaceGuidanceSecondaryAction(): WorkspaceGuidanceAction | undefined {
    if (this.resumeNextActionCard?.secondaryLabel) {
      return {
        key: 'resume-secondary',
        label: this.resumeNextActionCard.secondaryLabel,
        tone: 'default'
      };
    }
    const secondaryGroup = this.workspaceGuidanceQueueGroups[1];
    if (secondaryGroup != null) {
      return {
        key: secondaryGroup.action,
        label: secondaryGroup.actionLabel,
        tone: 'default'
      };
    }
    return undefined;
  }

  get workspaceGuidanceReasons(): WorkspaceGuidanceReason[] {
    return [
      {
        label: this.translateOrFallback('entity.definition.import.summary.ready', '可直接导入'),
        value: String(this.importReadyCount)
      },
      {
        label: this.translateOrFallback('entity.definition.import.summary.attention', '建议补齐'),
        value: String(this.importNeedsAttentionCount)
      },
      {
        label: this.translateOrFallback('entity.definition.import.summary.telemetry', '缺少遥测绑定'),
        value: String(this.importTelemetryPendingCount)
      }
    ];
  }

  get workspaceGuidanceNextLinks(): WorkspaceGuidanceLink[] {
    return this.workspaceGuidanceQueueGroups.map(group => ({
      key: group.action,
      label: group.title,
      description: group.summary
    }));
  }

  get importSummaryFacts(): PlatformFactsStripItem[] {
    return [
      {
        label: this.translateOrFallback('entity.definition.import.summary.ready', '可直接导入'),
        value: String(this.importReadyCount),
        tone: 'success'
      },
      {
        label: this.translateOrFallback('entity.definition.import.summary.attention', '建议补齐'),
        value: String(this.importNeedsAttentionCount),
        tone: 'warning'
      },
      {
        label: this.translateOrFallback('entity.definition.import.summary.telemetry', '缺少遥测绑定'),
        value: String(this.importTelemetryPendingCount),
        tone: 'default'
      }
    ];
  }

  private get workspaceGuidanceQueueGroups(): DefinitionImportQueueGroup[] {
    return this.definitionImportQueueGroups.slice(0, 3);
  }

  get importGovernanceHints(): DefinitionGovernanceHint[] {
    if (this.importPreviewRows.length === 0) {
      return [];
    }
    const hints: DefinitionGovernanceHint[] = [];
    if (this.importOwnerMissingCount > 0) {
      hints.push({
        id: 'owner',
        tone: 'warning',
        title: this.translateOrFallback('entity.definition.workspace.guidance.owner.title', '建议先补齐负责人'),
        copy: this.translateOrFallback(
          'entity.definition.workspace.guidance.owner.copy',
          '当前定义包里仍有实体缺少负责人。导入前先批量补齐，可以避免后续逐条回到目录里修复。'
        ),
        metric: `${this.importOwnerMissingCount} ${this.translateOrFallback('entity.definition.workspace.guidance.metric.rows', '条定义')}`
      });
    }
    if (this.importSystemMissingCount > 0) {
      hints.push({
        id: 'system',
        tone: 'warning',
        title: this.translateOrFallback('entity.definition.workspace.guidance.system.title', '建议先补齐所属系统'),
        copy: this.translateOrFallback(
          'entity.definition.workspace.guidance.system.copy',
          '服务、API 或端点如果缺少所属系统，后续治理、筛选和依赖分析都会变得分散。'
        ),
        metric: `${this.importSystemMissingCount} ${this.translateOrFallback('entity.definition.workspace.guidance.metric.rows', '条定义')}`
      });
    }
    if (this.importRunbookMissingCount > 0) {
      hints.push({
        id: 'runbook',
        tone: 'processing',
        title: this.translateOrFallback('entity.definition.workspace.guidance.runbook.title', '可以提前补齐处置手册'),
        copy: this.translateOrFallback(
          'entity.definition.workspace.guidance.runbook.copy',
          '如果这批实体要直接进入运维目录，先补齐 runbook 会让详情页和告警上下文立即可用。'
        ),
        metric: `${this.importRunbookMissingCount} ${this.translateOrFallback('entity.definition.workspace.guidance.metric.rows', '条定义')}`
      });
    }
    if (this.importTelemetryPendingCount > 0) {
      hints.push({
        id: 'telemetry',
        tone: 'default',
        title: this.translateOrFallback('entity.definition.workspace.guidance.telemetry.title', '遥测绑定还需要后续治理'),
        copy: this.translateOrFallback(
          'entity.definition.workspace.guidance.telemetry.copy',
          '定义导入后，仍建议回到遥测发现继续补充归并、绑定和来源信息。'
        ),
        metric: `${this.importTelemetryPendingCount} ${this.translateOrFallback('entity.definition.workspace.guidance.metric.rows', '条定义')}`
      });
    }
    if (this.hasImportGovernanceOverrides) {
      hints.unshift({
        id: 'override',
        tone: 'processing',
        title: this.translateOrFallback('entity.definition.workspace.guidance.override.title', '当前已启用批量补齐'),
        copy: this.translateOrFallback(
          'entity.definition.workspace.guidance.override.copy',
          '这些治理默认值只会补齐缺失字段，不会覆盖原始定义中的已有内容。'
        )
      });
    }
    return hints.slice(0, 4);
  }

  get hasImportGovernanceOverrides(): boolean {
    return (
      this.trimText(this.importOwnerDraft) != null ||
      this.trimText(this.importSystemDraft || undefined) != null ||
      this.trimText(this.importRunbookDraft) != null
    );
  }

  get importGovernanceOverrideSummary(): Array<{ label: string; value: string }> {
    const entries: Array<{ label: string; value: string }> = [];
    const owner = this.trimText(this.importOwnerDraft);
    const system = this.trimText(this.importSystemDraft || undefined);
    const runbook = this.validImportRunbookDraft;
    if (owner != null) {
      entries.push({
        label: this.translateOrFallback('entity.field.owner', '负责人'),
        value: owner
      });
    }
    if (system != null) {
      entries.push({
        label: this.translateOrFallback('entity.field.system', '所属系统'),
        value: system
      });
    }
    if (runbook != null) {
      entries.push({
        label: this.translateOrFallback('entity.field.runbook', '处置手册'),
        value: runbook
      });
    }
    return entries;
  }

  get importRunbookValidationMessage(): string | undefined {
    const runbook = this.trimText(this.importRunbookDraft);
    if (runbook == null) {
      return undefined;
    }
    return this.isValidUrl(runbook)
      ? undefined
      : this.translateOrFallback('entity.definition.workspace.governance.runbook.invalid', '处置手册需要是有效的 http(s) 链接。');
  }

  get hasImportGovernanceValidationError(): boolean {
    return this.importRunbookValidationMessage != null;
  }

  private get validImportRunbookDraft(): string | undefined {
    const runbook = this.trimText(this.importRunbookDraft);
    if (runbook == null || !this.isValidUrl(runbook)) {
      return undefined;
    }
    return runbook;
  }

  get showDefinitionActivityPanel(): boolean {
    return (
      this.importResultRows.length > 0 ||
      this.serverWorkspaceActivities.length > 0 ||
      this.serverImportActivities.length > 0 ||
      this.serverGovernanceActivities.length > 0 ||
      this.importActivities.length > 0
    );
  }

  get showDefinitionDraftSupport(): boolean {
    return this.canUseStarterDefinitions || this.hasSeedSummary || (!this.isEditMode && this.importPreviewRows.length > 0);
  }

  get showDefinitionGovernanceSupport(): boolean {
    return this.governancePresetSeed != null || this.definitionGovernanceHookCards.length > 0 || this.definitionSharedGovernanceSnapshots.length > 0;
  }

  get showDefinitionSupportPanel(): boolean {
    return this.showDefinitionDraftSupport || this.showDefinitionGovernanceSupport || this.definitionLifecycleRecords.length > 0 || this.showDefinitionActivityPanel;
  }

  get hasSeedSummary(): boolean {
    return this.seedSource != null && (this.seedEntityCount || 0) > 0;
  }

  get governancePresetSeedSummary(): string[] {
    const preset = this.governancePresetSeed;
    if (preset == null) {
      return [];
    }
    return [
      this.trimText(preset.name),
      this.trimText(preset.bulkOwner || preset.owner),
      this.trimText(preset.bulkSystem || preset.system),
      this.trimText(preset.environment),
      this.trimText(preset.source)
    ].filter((value): value is string => value != null);
  }

  get governancePresetConflictCount(): number {
    const preset = this.governancePresetSeed;
    if (preset == null) {
      return 0;
    }
    return this.importPreviewRows.filter(row => this.getGovernancePresetConflictFields(row.dto.entity, preset).length > 0).length;
  }

  get governancePresetConflictRollups(): Array<{ field: GovernanceConflictField; label: string; count: number }> {
    const preset = this.governancePresetSeed;
    if (preset == null) {
      return [];
    }
    const counters = new Map<GovernanceConflictField, number>();
    this.importPreviewRows.forEach(row => {
      this.getGovernancePresetConflictFields(row.dto.entity, preset).forEach(field => {
        counters.set(field, (counters.get(field) || 0) + 1);
      });
    });
    return (['owner', 'system', 'environment', 'source', 'status'] as GovernanceConflictField[])
      .map(field => ({ field, label: this.getGovernanceFieldLabel(field), count: counters.get(field) || 0 }))
      .filter(item => item.count > 0);
  }

  get hasGovernancePresetConflictSummary(): boolean {
    return this.governancePresetSeed != null && this.importPreviewRows.length > 0;
  }

  get definitionGovernanceHookCards(): DefinitionGovernanceHookCard[] {
    const rows = this.importPreviewRows;
    const total = rows.length;
    const registrySignal = this.getDefinitionRegistrySignal();
    const registryCard: DefinitionGovernanceHookCard = {
      key: 'registry',
      title: this.translateOrFallback('entity.governance.registry.signal.title', '共享目录状态'),
      metric: registrySignal.metric,
      summary: registrySignal.summary,
      priority: registrySignal.priority,
      priorityLabel: registrySignal.priorityLabel,
      nextStep: registrySignal.nextStep,
      actionLabel: this.getDefinitionRegistryActionLabel(registrySignal),
      action: this.getDefinitionRegistryAction(registrySignal)
    };
    if (total === 0) {
      return [registryCard];
    }
    const preset = this.governancePresetSeed;
    const presetAlignedCount =
      preset == null ? 0 : rows.filter(row => this.getGovernancePresetConflictFields(row.dto.entity, preset).length === 0).length;
    const ownershipReadyCount = rows.filter(
      row =>
        this.trimText(row.dto.entity.owner) != null &&
        this.trimText(row.dto.entity.system) != null &&
        this.trimText(row.dto.entity.runbook) != null
    ).length;
    const definitionReadyCount = rows.filter(row => row.gaps.length === 0).length;
    const telemetryReadyCount = rows.filter(row => (row.dto.identities?.length || 0) > 0 || (row.dto.monitorBinds?.length || 0) > 0).length;
    const cards: Array<Omit<DefinitionGovernanceHookCard, 'priority' | 'priorityLabel' | 'nextStep'>> = [
      {
        key: 'preset',
        title: this.translateOrFallback('entity.list.hooks.preset.title', '共享预设对齐'),
        metric: `${presetAlignedCount}/${total}`,
        summary:
          preset != null
            ? this.translateOrFallback(
                'entity.definition.workspace.hooks.preset.copy',
                `${presetAlignedCount} 条定义已经与共享预设 ${preset.name} 对齐，后续可以直接复用这组默认值。`
              )
            : this.translateOrFallback('entity.definition.workspace.hooks.preset.empty', '当前还没有共享预设，建议先从遥测发现带着上下文进入。'),
        actionLabel: this.translateOrFallback('entity.definition.workspace.hooks.preset.action', '查看共享预设'),
        action: 'preset',
        preset
      },
      {
        key: 'ownership',
        title: this.translateOrFallback('entity.list.hooks.ownership.title', '归属基线'),
        metric: `${ownershipReadyCount}/${total}`,
        summary: this.translateOrFallback(
          'entity.definition.workspace.hooks.ownership.copy',
          '负责人、系统和处置手册已经可以在导入前批量补齐，减少导入后再回目录逐条修复。'
        ),
        actionLabel: this.translateOrFallback('entity.definition.workspace.hooks.ownership.action', '补充基础信息'),
        action: 'ownership',
        preset
      },
      {
        key: 'definition',
        title: this.translateOrFallback('entity.list.hooks.definition.title', '定义状态'),
        metric: `${definitionReadyCount}/${total}`,
        summary: this.translateOrFallback(
          'entity.definition.workspace.hooks.definition.copy',
          '当前这批定义已经可以直接检查内容是否完整，再决定是否导入。'
        ),
        actionLabel: this.translateOrFallback('entity.definition.workspace.hooks.definition.action', '检查导入预览'),
        action: 'definition',
        preset
      },
      {
        key: 'telemetry',
        title: this.translateOrFallback('entity.list.hooks.telemetry.title', '证据收敛'),
        metric: `${telemetryReadyCount}/${total}`,
        summary: this.translateOrFallback(
          'entity.definition.workspace.hooks.telemetry.copy',
          '身份标识和监控绑定已经能和目录定义一起查看，便于后续继续补充信息。'
        ),
        actionLabel: this.translateOrFallback('entity.definition.workspace.hooks.telemetry.action', '回到遥测发现'),
        action: 'telemetry',
        preset
      }
    ];
    return [registryCard, ...cards.map(card => ({
      ...card,
      ...buildGovernanceRecipePresentation(
        card.key,
        (card.key === 'preset' && preset != null && presetAlignedCount === total)
          || (card.key === 'ownership' && ownershipReadyCount === total)
          || (card.key === 'definition' && definitionReadyCount === total)
          || (card.key === 'telemetry' && telemetryReadyCount === total),
        this.translateOrFallback.bind(this)
      )
    }))];
  }

  get definitionGovernancePolicyCards(): DefinitionGovernancePolicyCard[] {
    const cards: DefinitionGovernancePolicyCard[] = [];
    const registrySignal = this.getDefinitionRegistrySignal();
    if (requiresGovernanceRegistryRemediation(registrySignal)) {
      const registryPolicy = buildGovernanceRegistryPolicyPresentation(registrySignal, this.translateOrFallback.bind(this));
      cards.push({
        key: 'registry',
        title: registryPolicy.title,
        summary: registryPolicy.summary,
        actionLabel: this.getDefinitionRegistryActionLabel(registrySignal),
        action: this.getDefinitionRegistryAction(registrySignal)
      });
    }
    const rows = this.importPreviewRows;
    const total = rows.length;
    if (total === 0) {
      return cards;
    }
    const preset = this.governancePresetSeed;
    const presetConflictCount =
      preset == null ? 0 : rows.filter(row => this.getGovernancePresetConflictFields(row.dto.entity, preset).length > 0).length;
    const ownershipReadyCount = rows.filter(
      row =>
        this.trimText(row.dto.entity.owner) != null &&
        this.trimText(row.dto.entity.system) != null &&
        this.trimText(row.dto.entity.runbook) != null
    ).length;
    const definitionReadyCount = rows.filter(row => row.gaps.length === 0).length;
    const telemetryReadyCount = rows.filter(row => (row.dto.identities?.length || 0) > 0 || (row.dto.monitorBinds?.length || 0) > 0).length;

    if (preset != null && presetConflictCount > 0) {
      cards.push({
        key: 'preset',
        title: this.translateOrFallback('entity.definition.workspace.policy.preset.title', '先检查共享预设差异'),
        summary: this.translateOrFallback(
          'entity.definition.workspace.policy.preset.copy',
          `${presetConflictCount} 条定义和共享预设 ${preset.name} 还有差异，建议先检查相关字段再继续导入。`
        ),
        actionLabel: this.translateOrFallback('entity.detail.policy.preset.action', '查看共享预设'),
        action: 'preset',
        preset
      });
    }

    if (ownershipReadyCount < total) {
      cards.push({
        key: 'ownership',
        title: this.translateOrFallback('entity.definition.workspace.policy.ownership.title', '先补充基础信息'),
        summary: this.translateOrFallback(
          'entity.definition.workspace.policy.ownership.copy',
          `${total - ownershipReadyCount} 条定义还缺负责人、所属系统或处置手册，建议先批量补齐，再继续导入。`
        ),
        actionLabel: this.translateOrFallback('entity.definition.workspace.hooks.ownership.action', '补充基础信息'),
        action: 'ownership',
        preset
      });
    }

    if (definitionReadyCount < total) {
      cards.push({
        key: 'definition',
        title: this.translateOrFallback('entity.definition.workspace.policy.definition.title', '先检查定义内容'),
        summary: this.translateOrFallback(
          'entity.definition.workspace.policy.definition.copy',
          `${total - definitionReadyCount} 条定义在导入前还需要处理，建议先检查预览结果。`
        ),
        actionLabel: this.translateOrFallback('entity.definition.workspace.hooks.definition.action', '检查导入预览'),
        action: 'definition',
        preset
      });
    }

    if (telemetryReadyCount < total) {
      cards.push({
        key: 'telemetry',
        title: this.translateOrFallback('entity.definition.workspace.policy.telemetry.title', '回补证据入口'),
        summary: this.translateOrFallback(
          'entity.definition.workspace.policy.telemetry.copy',
          `${total - telemetryReadyCount} 条定义还缺身份标识或监控绑定，建议回到 discovery 补齐统一证据入口。`
        ),
        actionLabel: this.translateOrFallback('entity.definition.workspace.hooks.telemetry.action', '回到遥测发现'),
        action: 'telemetry',
        preset
      });
    }

    return cards.slice(0, 3);
  }

  get workspaceTitle(): string {
    return this.isEditMode
      ? this.translateOrFallback('entity.definition.workspace.edit-title', '编辑实体定义')
      : this.translateOrFallback('entity.definition.import.title', '导入实体定义');
  }

  get workspaceDescription(): string {
    return this.isEditMode
      ? this.translateOrFallback(
          'entity.definition.workspace.edit-copy',
          '直接编辑当前实体的定义内容，保存后会回写目录元数据、遥测绑定和依赖关系。'
        )
      : this.translateOrFallback(
          'entity.definition.import.copy',
          '支持一次导入多个定义文档。适合把 HertzBeat 风格的 catalog bundle、YAML 文件或 API cURL 请求直接导入成实体。'
        );
  }

  get definitionRailGroups(): PlatformRailNavGroup[] {
    const summaryGroup: PlatformRailNavGroup = {
      key: 'summary',
      title: this.workspaceTitle,
      hintTitle: this.isEditMode ? this.entityTitle : undefined,
      hintMeta: this.isEditMode && this.entityKindLabel ? `${this.entityKindLabel}${this.entityId ? ' · #' + this.entityId : ''}` : undefined,
      items: [
        {
          key: 'ready',
          label: this.translateOrFallback('entity.definition.import.summary.ready', '可直接导入'),
          icon: 'file-text',
          count: this.importReadyCount,
          static: true
        },
        {
          key: 'attention',
          label: this.translateOrFallback('entity.definition.import.summary.attention', '建议补齐'),
          icon: 'warning',
          count: this.importNeedsAttentionCount,
          static: true
        },
        {
          key: 'telemetry',
          label: this.translateOrFallback('entity.definition.import.summary.telemetry', '缺少遥测绑定'),
          icon: 'apartment',
          count: this.importTelemetryPendingCount,
          static: true
        }
      ]
    };

    const actionItems: PlatformRailNavItem[] = [];
    if (!this.isEditMode) {
      actionItems.push({
        key: 'create-definition',
        label: this.translateOrFallback('entity.action.create-definition', '从定义创建'),
        icon: 'form'
      });
      actionItems.push({
        key: 'open-discovery',
        label: this.translateOrFallback('entity.entry-source.telemetry', '遥测发现'),
        icon: 'apartment'
      });
    }
    if (this.isEditMode) {
      actionItems.push({
        key: 'open-detail',
        label: this.translateOrFallback('entity.definition.workspace.open-detail', '打开实体详情'),
        icon: 'profile'
      });
      actionItems.push({
        key: 'open-editor',
        label: this.translateOrFallback('entity.definition.workspace.open-editor', '回到表单编辑'),
        icon: 'edit'
      });
    }
    actionItems.push({
      key: 'open-catalog',
      label: this.translateOrFallback('entity.list.kicker', '实体目录'),
      icon: 'appstore'
    });

    return [
      summaryGroup,
      {
        key: 'actions',
        title: this.translateOrFallback('entity.list.portal.actions', '运维动作'),
        items: actionItems
      }
    ];
  }

  get submitActionLabel(): string {
    if (!this.isEditMode && this.importPreviewRows.length > 0) {
      if (this.importReadyCount > 0 && this.importBlockedCount > 0) {
        return this.translateOrFallback('entity.definition.import.submit-ready', '导入就绪项');
      }
      if (this.importReadyCount === 0 && this.importBlockedCount > 0) {
        return this.translateOrFallback('entity.definition.import.submit-blocked', '先处理阻塞项');
      }
    }
    return this.isEditMode
      ? this.translateOrFallback('entity.definition.workspace.save', '保存定义')
      : this.translateOrFallback('entity.definition.import.submit', '导入实体');
  }

  get canSubmitCurrentDraft(): boolean {
    if (this.hasImportGovernanceValidationError) {
      return false;
    }
    if (!this.isEditMode) {
      if (this.importPreviewRows.length === 0) {
        return true;
      }
      return this.importReadyCount > 0 || this.importBlockedCount > 0;
    }
    return this.importPreviewRows.length <= 1;
  }

  get canUseStarterDefinitions(): boolean {
    return !this.isEditMode && this.importFormat !== 'curl';
  }

  get canSaveWorkspaceTemplate(): boolean {
    return this.canUseStarterDefinitions && this.trimText(this.templateNameDraft) != null && this.importDraft.trim() !== '';
  }

  get canClearImportDraft(): boolean {
    return (
      !this.importParsing &&
      !this.importSubmitting &&
      (this.importDraft.trim() !== '' || this.importPreviewRows.length > 0 || this.importResultRows.length > 0 || this.importError != null)
    );
  }

  openImportRunbookDraft(): void {
    const runbook = this.trimText(this.importRunbookDraft);
    if (runbook == null || !this.isValidUrl(runbook) || typeof window === 'undefined') {
      return;
    }
    window.open(runbook, '_blank', 'noopener');
  }

  clearImportRunbookDraft(): void {
    this.importRunbookDraft = '';
    this.refreshImportPreviewRows();
  }

  get draftSourceLabel(): string {
    switch (this.draftSourceType) {
      case 'blank':
        return this.translateOrFallback('entity.definition.workspace.source.blank', '空白草稿');
      case 'preset':
        return `${this.translateOrFallback('entity.definition.workspace.source.preset', '预置模板')} · ${this.draftSourceName || this.translateOrFallback('entity.definition.workspace.source.unknown', '未命名')}`;
      case 'starter':
        return `${this.translateOrFallback('entity.definition.workspace.source.starter', '快速模板')} · ${this.draftSourceName || this.translateOrFallback('entity.definition.workspace.source.unknown', '未命名')}`;
      case 'template':
        return `${this.translateOrFallback('entity.definition.workspace.source.template', '共享模板')} · ${this.draftSourceName || this.translateOrFallback('entity.definition.workspace.source.unknown', '未命名')}`;
      case 'seed':
        return `${this.translateOrFallback('entity.definition.workspace.source.seed', '发现草稿')} · ${this.draftSourceName || this.translateOrFallback('entity.definition.workspace.source.external', '外部定义')}`;
      case 'entity':
        return `${this.translateOrFallback('entity.definition.workspace.source.entity', '当前实体')} · ${this.draftSourceName || this.translateOrFallback('entity.detail', '实体详情')}`;
      case 'manual':
        return this.translateOrFallback('entity.definition.workspace.source.manual', '手工草稿');
      default:
        return this.translateOrFallback('entity.definition.workspace.source.example', '示例定义');
    }
  }

  get draftSourceCopy(): string {
    switch (this.draftSourceType) {
      case 'blank':
        return this.translateOrFallback(
          'entity.definition.workspace.source.blank.copy',
          '当前草稿已经清空。你可以从 starter、共享模板开始，或直接粘贴一份新的定义。'
        );
      case 'preset':
        return this.translateOrFallback(
          'entity.definition.workspace.source.preset.copy',
          '这份草稿来自预置模板，适合按常见场景快速生成一份目录定义。'
        );
      case 'starter':
        return this.translateOrFallback(
          'entity.definition.workspace.source.starter.copy',
          '这份草稿来自内置 starter，已经按当前目录建议预填 owner、system、namespace 和环境。'
        );
      case 'template':
        return this.translateOrFallback(
          'entity.definition.workspace.source.template.copy',
          '这份草稿来自已保存的共享模板，适合在不同会话和不同设备上复用同类目录定义。'
        );
      case 'seed':
        return this.translateOrFallback(
          'entity.definition.workspace.source.seed.copy',
          '这份草稿来自遥测发现或导入结果，可以补充信息后再导入。'
        );
      case 'entity':
        return this.translateOrFallback(
          'entity.definition.workspace.source.entity.copy',
          '当前正在编辑现有实体定义，保存后会直接回写目录元数据、遥测绑定和依赖关系。'
        );
      case 'manual':
        return this.translateOrFallback(
          'entity.definition.workspace.source.manual.copy',
          '当前草稿已经脱离原始 starter 或模板，后续会按你现在的内容继续预览和导入。'
        );
      default:
        return this.translateOrFallback(
          'entity.definition.workspace.source.example.copy',
          '当前显示的是默认示例定义，用来帮助你快速开始 definition-first 录入。'
        );
    }
  }

  get draftSourceTone(): string {
    switch (this.draftSourceType) {
      case 'blank':
        return 'default';
      case 'entity':
      case 'seed':
        return 'processing';
      case 'preset':
        return 'purple';
      case 'manual':
        return 'default';
      default:
        return 'blue';
    }
  }

  get starterTemplatePresets(): StarterTemplatePreset[] {
    const namespace = this.catalogSuggestions.namespaces[0] || 'commerce';
    const system = this.resolvePreferredSystem();
    return [
      {
        id: 'preset-system',
        kind: 'system',
        title: this.translateOrFallback('entity.definition.workspace.preset.system.title', '业务系统基线'),
        copy: this.translateOrFallback(
          'entity.definition.workspace.preset.system.copy',
          '适合先把系统 owner、tier、lifecycle 和环境定义清楚，再承接后续服务和 API。'
        ),
        emphasis: `${namespace} / ${system}`
      },
      {
        id: 'preset-service',
        kind: 'service',
        title: this.translateOrFallback('entity.definition.workspace.preset.service.title', '核心服务基线'),
        copy: this.translateOrFallback(
          'entity.definition.workspace.preset.service.copy',
          '预置 languages、system 和 telemetry identities，适合直接作为核心服务 starter。'
        ),
        emphasis: this.resolvePreferredOwner()
      },
      {
        id: 'preset-api',
        kind: 'api',
        title: this.translateOrFallback('entity.definition.workspace.preset.api.title', '公共 API 基线'),
        copy: this.translateOrFallback(
          'entity.definition.workspace.preset.api.copy',
          '默认带 implementedBy 和 interface.fileRef，适合对外接口目录录入。'
        ),
        emphasis: 'implementedBy / interface'
      },
      {
        id: 'preset-endpoint',
        kind: 'endpoint',
        title: this.translateOrFallback('entity.definition.workspace.preset.endpoint.title', '外部端点基线'),
        copy: this.translateOrFallback(
          'entity.definition.workspace.preset.endpoint.copy',
          '默认带 endpoint.url 遥测身份，适合先把入口 URL 收进口径统一的实体目录。'
        ),
        emphasis: 'endpoint.url'
      }
    ];
  }

  get starterOwnerSuggestions(): string[] {
    return this.catalogSuggestions.owners.slice(0, 6);
  }

  get starterSystemSuggestions(): string[] {
    return this.catalogSuggestions.systems.slice(0, 6);
  }

  get governanceOwnerSuggestions(): string[] {
    return [this.resolvePreferredOwner(), ...this.catalogSuggestions.owners]
      .filter((value, index, all) => this.trimText(value) != null && all.findIndex(item => item === value) === index)
      .slice(0, 8);
  }

  get governanceSystemSuggestions(): string[] {
    return [this.resolvePreferredSystem(), ...this.catalogSuggestions.systems]
      .filter((value, index, all) => this.trimText(value) != null && all.findIndex(item => item === value) === index)
      .slice(0, 8);
  }

  get starterNamespaceSuggestions(): string[] {
    return this.catalogSuggestions.namespaces.slice(0, 6);
  }

  get starterEnvironmentSuggestions(): string[] {
    return this.catalogSuggestions.environments.slice(0, 4);
  }

  get latestSharedDiscoveryGovernanceHookActivity(): EntityDiscoveryGovernanceActivity | undefined {
    return this.sharedDiscoveryActivities.find(activity => this.isGovernanceHookDiscoveryActivity(activity));
  }

  get latestSharedDefinitionGovernanceHookActivity(): DefinitionImportActivity | undefined {
    return this.serverWorkspaceActivities.find(activity => this.isGovernanceHookWorkspaceActivity(activity));
  }

  get definitionSharedGovernanceSnapshots(): DefinitionSharedGovernanceSnapshotCard[] {
    const snapshots: DefinitionSharedGovernanceSnapshotCard[] = [];
    const discovery = this.latestSharedDiscoveryGovernanceHookActivity;
    if (discovery != null) {
      snapshots.push({
        key: 'discovery',
        title: this.translateOrFallback('entity.list.snapshot.discovery.title', '最近发现记录'),
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
        title: this.translateOrFallback('entity.list.snapshot.definition.title', '最近定义记录'),
        status: definition.status,
        summary: definition.summary,
        detail: this.trimText(definition.detail),
        happenedAt: this.normalizeLifecycleTimestamp(definition.happenedAt),
        actionLabel: this.translateOrFallback('entity.definition.workspace.hooks.ownership.action', '补充基础信息'),
        action: 'definition'
      });
    }
    return snapshots.sort((left, right) => this.compareLifecycleTimestamp(left.happenedAt, right.happenedAt));
  }

  get definitionLifecycleRecords(): DefinitionWorkspaceLifecycleRecord[] {
    const registrySignal = this.getDefinitionRegistrySignal();
    const records: DefinitionWorkspaceLifecycleRecord[] = [
      {
        id: 'draft-source',
        title: this.translateOrFallback('entity.detail.lifecycle.source', '来源更新'),
        summary: this.draftSourceLabel,
        detail: [this.draftSourceCopy, registrySignal.metric, this.getWorkspaceTemplateRegistrySummary()]
          .filter((value): value is string => this.trimText(value) != null)
          .join(' · '),
        actionLabel:
          this.seedDiscoveryActivity?.workspacePath != null
            ? this.translateOrFallback('entity.discovery.activity.resume', '继续处理')
            : this.isEditMode
              ? this.translateOrFallback('entity.definition.workspace.open-detail', '打开实体详情')
              : this.translateOrFallback('entity.entry-source.action.manual', '开始页面录入'),
        action:
          this.seedDiscoveryActivity?.workspacePath != null ? 'discovery' : this.isEditMode ? 'entity-detail' : 'entity-editor'
      }
    ];

    const latestSharedSnapshot = this.definitionSharedGovernanceSnapshots[0];
    if (latestSharedSnapshot != null) {
      records.push({
        id: `snapshot:${latestSharedSnapshot.key}`,
        title: this.translateOrFallback('entity.detail.snapshot.title', '共享目录状态'),
        summary: latestSharedSnapshot.summary,
        detail: this.joinWorkspaceLifecycleDetail(
          this.getDefinitionSharedGovernanceSnapshotMeta(latestSharedSnapshot),
          registrySignal.metric,
          this.getWorkspaceTemplateRegistrySummary(),
          latestSharedSnapshot.detail
        ),
        happenedAt: latestSharedSnapshot.happenedAt,
        actionLabel: latestSharedSnapshot.actionLabel,
        action: latestSharedSnapshot.key === 'definition' ? 'snapshot-definition' : 'snapshot-discovery'
      });
    }

    if (this.serverImportActivities[0] != null) {
      const activity = this.serverImportActivities[0];
      records.push({
        id: `server:${activity.id}`,
        title: this.translateOrFallback('entity.detail.lifecycle.definition', '定义更新'),
        summary: this.getServerImportActivitySummary(activity),
        detail: this.trimText(activity.detail),
        happenedAt: activity.happenedAt,
        actionLabel: activity.entityId
          ? this.translateOrFallback('entity.definition.workspace.open-detail', '打开实体详情')
          : this.translateOrFallback('entity.definition.edit', '编辑定义'),
        action: activity.entityId ? 'entity-detail' : 'entity-editor'
      });
    }

    if (this.serverGovernanceActivities[0] != null) {
      const activity = this.serverGovernanceActivities[0];
      records.push({
        id: `governance:${activity.id}`,
        title: this.getServerGovernanceActivityTitle(activity),
        summary: activity.summary,
        detail: this.trimText(activity.detail),
        happenedAt: activity.gmtCreate == null ? undefined : String(activity.gmtCreate),
        actionLabel: activity.entityId
          ? this.translateOrFallback('entity.definition.workspace.open-detail', '打开实体详情')
          : this.translateOrFallback('entity.list.kicker', '实体目录'),
        action: activity.entityId ? 'entity' : 'entity-detail',
        entityId: activity.entityId
      });
    }

    if (this.seedDiscoveryActivity != null) {
      records.push({
        id: `seed:${this.seedDiscoveryActivity.id}`,
        title: this.translateOrFallback('entity.detail.lifecycle.discovery', '归并治理'),
        summary: this.seedDiscoveryActivity.summary,
        detail: this.trimText(this.seedDiscoveryActivity.detail),
        happenedAt: this.normalizeLifecycleTimestamp(this.seedDiscoveryActivity.happenedAt),
        actionLabel:
          this.seedDiscoveryActivity.workspacePath != null
            ? this.translateOrFallback('entity.discovery.activity.resume', '继续处理')
            : undefined,
        action: this.seedDiscoveryActivity.workspacePath != null ? 'discovery' : undefined
      });
    } else if (this.serverImportActivities.length === 0 && this.serverGovernanceActivities.length === 0 && this.serverWorkspaceActivities[0] != null) {
      const activity = this.serverWorkspaceActivities[0];
      records.push({
        id: `workspace:${activity.id}`,
        title: this.translateOrFallback('entity.detail.history.server', '目录更新记录'),
        summary: activity.summary,
        detail: this.trimText(activity.detail),
        happenedAt: activity.happenedAt,
        actionLabel: activity.entityId
          ? this.translateOrFallback('entity.definition.workspace.open-detail', '打开实体详情')
          : undefined,
        action: activity.entityId ? 'entity-detail' : undefined,
        entityId: activity.entityId
      });
    } else if (this.serverImportActivities.length === 0 && this.serverGovernanceActivities.length === 0 && this.importActivities[0] != null) {
      const activity = this.importActivities[0];
      records.push({
        id: `local:${activity.id}`,
        title: this.translateOrFallback('entity.detail.history.title', '最近记录'),
        summary: activity.summary,
        detail: this.trimText(activity.detail),
        happenedAt: activity.happenedAt
      });
    }

    return records;
  }

  get seedDiscoveryActivity() {
    return this.seedActivityId ? findDiscoveryGovernanceActivity(this.seedActivityId) : undefined;
  }

  openCatalog(): void {
    this.router.navigate(['/entities']);
  }

  onDefinitionRailItemSelected(item: PlatformRailNavItem): void {
    switch (item.key) {
      case 'create-definition':
        this.createDefinitionEntity();
        return;
      case 'open-detail':
        this.openEntityDetail();
        return;
      case 'open-editor':
        this.openEntityEditor();
        return;
      case 'open-discovery':
        this.openDiscovery();
        return;
      case 'open-catalog':
        this.openCatalog();
        return;
      default:
        return;
    }
  }

  openDiscovery(remedy?: DefinitionWorkspaceRemedy): void {
    if (this.navigateToReturnDiscoveryWorkspace(remedy)) {
      return;
    }
    const nextTelemetryRow = this.getNextTelemetryImportPreviewRow();
    if (nextTelemetryRow != null) {
      this.openDiscoveryForImportPreviewRow(nextTelemetryRow, remedy);
      return;
    }
    const resumeState = this.persistWorkspaceResumeState();
    this.router.navigate(['/entities', 'discovery'], {
      queryParams: {
        query: null,
        remedy: remedy || null,
        resumeDefinitionToken: resumeState.token,
        ...buildGovernancePresetQueryParams(this.governancePresetSeed),
        owner: null,
        ownerContext: this.trimText(this.importOwnerDraft) || this.trimText(this.governancePresetSeed?.bulkOwner || this.governancePresetSeed?.owner) || null,
        system: null,
        systemContext:
          this.trimText(this.importSystemDraft || undefined) ||
          this.trimText(this.governancePresetSeed?.bulkSystem || this.governancePresetSeed?.system) ||
          null,
        environment: null,
        environmentContext: this.trimText(this.governancePresetSeed?.environment) || null,
        source: null,
        sourceContext: this.trimText(this.governancePresetSeed?.source) || null
      }
    });
  }

  private getNextTelemetryImportPreviewRow(): DefinitionImportPreviewRow | undefined {
    return this.activeImportPreviewRows.find(row => row.gapKeys.includes('telemetry'));
  }

  private getResumeHandledEntityId(): number | undefined {
    const handledEntityId = Number(this.route.snapshot.queryParamMap.get('resumeHandledEntityId'));
    if (Number.isNaN(handledEntityId) || handledEntityId <= 0) {
      return undefined;
    }
    return handledEntityId;
  }

  private openDiscoveryForImportPreviewRow(row: DefinitionImportPreviewRow | undefined, remedy?: DefinitionWorkspaceRemedy): void {
    const entity = row?.dto.entity;
    const resumeState = this.persistWorkspaceResumeState();
    this.router.navigate(['/entities', 'discovery'], {
      queryParams: {
        query: row == null ? null : this.getImportPreviewRowDiscoveryQuery(row),
        remedy: remedy || null,
        resumeDefinitionToken: resumeState.token,
        resumeHandledRowKey: row == null ? null : this.getImportPreviewRowKey(row),
        ...buildGovernancePresetQueryParams(this.governancePresetSeed),
        owner: null,
        ownerContext:
          this.trimText(entity?.owner) ||
          this.trimText(this.importOwnerDraft) ||
          this.trimText(this.governancePresetSeed?.bulkOwner || this.governancePresetSeed?.owner) ||
          null,
        system: null,
        systemContext:
          this.trimText(entity?.system) ||
          this.trimText(this.importSystemDraft || undefined) ||
          this.trimText(this.governancePresetSeed?.bulkSystem || this.governancePresetSeed?.system) ||
          null,
        environment: null,
        environmentContext: this.trimText(entity?.environment) || this.trimText(this.governancePresetSeed?.environment) || null,
        source: null,
        sourceContext: this.trimText(entity?.source) || this.trimText(this.governancePresetSeed?.source) || null
      }
    });
  }

  private openEditorForImportPreviewRow(row: DefinitionImportPreviewRow): void {
    const resumeState = this.persistWorkspaceResumeState();
    this.router.navigate(['/entities', 'new'], {
      queryParams: {
        entrySource: 'definition',
        focus: 'ownership',
        type: row.dto.entity.type || null,
        resumeDefinitionToken: resumeState.token,
        resumeHandledRowKey: this.getImportPreviewRowKey(row),
        ...buildGovernancePresetQueryParams(this.governancePresetSeed)
      },
      state: {
        seedEntityDto: this.cloneEntityDto(row.dto)
      }
    });
  }

  openEntityDetail(): void {
    if (!this.isEditMode || this.entityId == undefined) {
      this.openCatalog();
      return;
    }
    this.router.navigate(['/entities', this.entityId]);
  }

  openEntityEditor(): void {
    if (!this.isEditMode || this.entityId == undefined) {
      this.createDefinitionEntity();
      return;
    }
    this.router.navigate(['/entities', this.entityId, 'edit']);
  }

  createDefinitionEntity(): void {
    this.router.navigate(['/entities', 'new'], {
      queryParams: {
        entrySource: 'definition',
        surface: 'yaml',
        definitionFormat: this.importFormat,
        ...buildGovernancePresetQueryParams(this.governancePresetSeed)
      }
    });
  }

  applyStarterDefinition(kind: StarterDefinitionKind): void {
    if (!this.canUseStarterDefinitions) {
      return;
    }
    this.setDraftContent(
      this.buildStarterDefinition(kind, this.importFormat === 'json' ? 'json' : 'yaml'),
      'starter',
      this.translateOrFallback(`entity.type.${kind}`, this.humanize(kind))
    );
    this.importError = undefined;
    this.importPreviewRows = [];
    this.importResultRows = [];
    this.importSubmitSucceeded = false;
    this.cdr.markForCheck();
  }

  applyStarterTemplatePreset(preset: StarterTemplatePreset): void {
    if (!this.canUseStarterDefinitions) {
      return;
    }
    this.setDraftContent(
      this.buildStarterDefinition(preset.kind, this.importFormat === 'json' ? 'json' : 'yaml'),
      'preset',
      preset.title
    );
    this.importError = undefined;
    this.importPreviewRows = [];
    this.importResultRows = [];
    this.importSubmitSucceeded = false;
    this.cdr.markForCheck();
  }

  saveWorkspaceTemplate(): void {
    const name = this.trimText(this.templateNameDraft);
    const content = this.trimText(this.importDraft);
    if (!this.canUseStarterDefinitions || name == null || content == null) {
      return;
    }
    const format: Exclude<EntityDefinitionFormat, 'curl'> = this.importFormat === 'json' ? 'json' : 'yaml';
    const existing = this.workspaceTemplates.find(item => item.name === name);
    const template: DefinitionWorkspaceTemplate = {
      id: existing?.id || `definition-template-${Date.now()}`,
      name,
      format,
      content,
      summary: this.getWorkspaceTemplateSummaryForSave(format),
      source: this.mapDraftSourceToTemplateSource(),
      kind: this.importPreviewRows.length === 1 ? this.importPreviewRows[0].dto.entity.type : this.importPreviewRows.length > 1 ? 'bundle' : undefined,
      updatedAt: new Date().toISOString()
    };
    this.entitySvc.saveDefinitionWorkspaceTemplate(template).subscribe({
      next: message => {
        if (message.code !== 0 || message.data == null) {
          this.persistWorkspaceTemplate(template, 'local');
          return;
        }
        this.persistWorkspaceTemplate(message.data, 'shared');
      },
      error: () => {
        this.persistWorkspaceTemplate(template, 'local');
      }
    });
  }

  applyWorkspaceTemplate(template: DefinitionWorkspaceTemplate): void {
    if (!this.canUseStarterDefinitions) {
      return;
    }
    this.importFormat = template.format;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { format: template.format },
      queryParamsHandling: 'merge'
    });
    this.setDraftContent(template.content, 'template', template.name);
    this.importError = undefined;
    this.importPreviewRows = [];
    this.importResultRows = [];
    this.importSubmitSucceeded = false;
    this.cdr.markForCheck();
  }

  onImportDraftChanged(value: string): void {
    this.handledImportPreviewRowKeys.clear();
    if (this.suppressDraftSourceTracking || value.trim() === '') {
      return;
    }
    if (this.draftSourceType !== 'manual') {
      this.draftSourceType = 'manual';
      this.draftSourceName = undefined;
      this.cdr.markForCheck();
    }
  }

  removeWorkspaceTemplateFromEvent(event: Event, templateId: string): void {
    event.stopPropagation();
    this.entitySvc.deleteDefinitionWorkspaceTemplate(templateId).subscribe({
      next: () => {
        this.applyWorkspaceTemplateDelete(templateId, 'shared');
      },
      error: () => {
        this.applyWorkspaceTemplateDelete(templateId, 'local');
      }
    });
  }

  applyImportOwnerSuggestion(value: string): void {
    this.importOwnerDraft = value;
    this.refreshImportPreviewRows();
  }

  applyImportSystemSuggestion(value: string): void {
    this.importSystemDraft = value;
    this.refreshImportPreviewRows();
  }

  clearImportDraft(): void {
    this.importDraft = '';
    this.draftSourceType = 'blank';
    this.draftSourceName = undefined;
    this.importError = undefined;
    this.importPreviewRows = [];
    this.importResultRows = [];
    this.importSubmitSucceeded = false;
    this.handledImportPreviewRowKeys.clear();
    this.cdr.markForCheck();
  }

  clearImportGovernanceOverrides(): void {
    this.importOwnerDraft = '';
    this.importSystemDraft = null;
    this.importRunbookDraft = '';
    this.refreshImportPreviewRows();
  }

  private applyGovernancePresetDrafts(): void {
    const preset = this.governancePresetSeed;
    if (preset == null) {
      return;
    }
    if (this.trimText(this.importOwnerDraft) == null) {
      this.importOwnerDraft = this.trimText(preset.bulkOwner || preset.owner) || '';
    }
    if (this.trimText(this.importSystemDraft || undefined) == null) {
      this.importSystemDraft = this.trimText(preset.bulkSystem || preset.system) || null;
    }
  }

  private resolveGovernancePresetSeed(queryParams: ParamMap): EntityDiscoveryGovernancePreset | undefined {
    const explicitPreset = readGovernancePresetFromQuery(queryParams);
    if (explicitPreset != null) {
      return explicitPreset;
    }
    const owner = this.trimText(queryParams.get('owner') || undefined);
    const system = this.trimText(queryParams.get('system') || undefined);
    const source = this.trimText(queryParams.get('source') || undefined);
    const environment = this.trimText(queryParams.get('environment') || undefined);
    const status = this.trimText(queryParams.get('status') || undefined);
    const hasScope = [owner, system, source, environment, status].some(value => value != null);
    if (!hasScope) {
      return undefined;
    }
    return {
      id: 'workspace-scope',
      name: this.translateOrFallback('entity.definition.workspace.governance.scope-name', '当前治理范围'),
      owner: owner || undefined,
      system: system || undefined,
      source: source || undefined,
      environment: environment || undefined,
      status: status || undefined,
      bulkOwner: owner || undefined,
      bulkSystem: system || undefined
    };
  }

  private recordGovernancePresetWorkspaceActivity(): void {
    const preset = this.governancePresetSeed;
    if (preset == null) {
      return;
    }
    const activityId = [
      'governance-preset-workspace',
      this.isEditMode && this.entityId != undefined ? `entity-${this.entityId}` : 'create',
      this.trimText(preset.id) || this.trimText(preset.name) || 'preset'
    ].join(':');
    const detail = [
      this.trimText(preset.name),
      this.trimText(preset.bulkOwner || preset.owner),
      this.trimText(preset.bulkSystem || preset.system),
      this.trimText(preset.environment),
      this.trimText(preset.source)
    ]
      .filter((value): value is string => value != null)
      .join(' · ');
    this.entitySvc
      .saveDefinitionWorkspaceActivity({
        id: activityId,
        happenedAt: new Date().toISOString(),
        status: 'success',
        format: this.importFormat,
        summary: this.translateOrFallback('entity.definition.workspace.activity.preset-applied', '已应用共享预设'),
        detail,
        entityId: this.entityId,
        entityName: this.entityTitle
      })
      .subscribe({
        next: message => {
          if (message.code === 0 && message.data != null) {
            this.loadDefinitionWorkspaceActivities();
          }
        }
      });
  }

  private resolvePreferredOwner(): string {
    return (
      this.trimText(this.importOwnerDraft) ||
      this.trimText(this.governancePresetSeed?.bulkOwner || this.governancePresetSeed?.owner) ||
      this.catalogSuggestions.owners[0] ||
      'platform-team'
    );
  }

  private resolvePreferredSystem(): string {
    return (
      this.trimText(this.importSystemDraft || undefined) ||
      this.trimText(this.governancePresetSeed?.bulkSystem || this.governancePresetSeed?.system) ||
      this.catalogSuggestions.systems[0] ||
      'commerce-platform'
    );
  }

  private resolvePreferredEnvironment(): string {
    return this.trimText(this.governancePresetSeed?.environment) || this.catalogSuggestions.environments[0] || 'prod';
  }

  private resolvePreferredSource(): string {
    return this.trimText(this.governancePresetSeed?.source) || 'manual';
  }

  onFormatChange(format: EntityDefinitionFormat): void {
    const previousFormat = this.importFormat;
    this.importFormat = format;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { format },
      queryParamsHandling: 'merge'
    });
    this.importError = undefined;
    if (!this.isEditMode) {
      this.cdr.markForCheck();
      return;
    }
    if (format === 'curl') {
      const sourceFormat: Exclude<EntityDefinitionFormat, 'curl'> =
        previousFormat === 'json' || previousFormat === 'yaml' ? previousFormat : this.loadedDefinitionFormat;
      const sourceContent = previousFormat === 'curl' ? this.loadedDefinitionContent : this.importDraft.trim() || this.loadedDefinitionContent;
      this.loadedDefinitionFormat = sourceFormat;
      this.loadedDefinitionContent = sourceContent || this.loadedDefinitionContent;
      this.setDraftContent(this.buildDefinitionCurlPreview(sourceFormat, this.loadedDefinitionContent), 'entity', this.entityTitle);
      this.cdr.markForCheck();
      return;
    }
    this.loadExistingDefinitionContent(format);
  }

  parseDefinitionImport(): void {
    const content = this.importDraft.trim();
    if (content === '') {
      this.importError = this.translateOrFallback('entity.definition.import.empty', '请先粘贴实体定义。');
      this.importPreviewRows = [];
      this.cdr.markForCheck();
      return;
    }
    this.importParsing = true;
    this.importPreviewScope = 'all';
    this.importError = undefined;
    this.importPreviewRows = [];
    this.importPreviewDtos = [];
    this.importResultRows = [];
    this.importSubmitSucceeded = false;
    this.handledImportPreviewRowKeys.clear();
    const request = normalizeDefinitionRequest(this.importFormat, content);
    this.entitySvc.parseEntityDefinitionBundle(request).subscribe({
      next: message => {
        this.importParsing = false;
        if (message.code === 0) {
          this.importPreviewDtos = (message.data || []).map(dto => this.cloneEntityDto(dto));
          this.refreshImportPreviewRows();
          this.runPendingWorkspaceRemedy();
          if (this.isEditMode && this.importPreviewRows.length > 1) {
            this.importError = this.translateOrFallback(
              'entity.definition.workspace.single-required',
              '编辑现有实体时，一次只能保存一个定义文档。'
            );
          }
          this.recordImportActivity({
            status:
              this.isEditMode && this.importPreviewRows.length > 1
                ? 'error'
                : this.importPreviewRows.some(row => row.gaps.length > 0)
                ? 'warning'
                : 'success',
            format: this.importFormat,
            summary: this.translateOrFallback('entity.definition.import.activity.preview', `已预览 ${this.importPreviewRows.length} 个定义`),
            detail:
              this.importPreviewRows.length > 0
                ? `${this.translateOrFallback('entity.definition.import.summary.ready', '可直接导入')} ${this.importReadyCount} · ${this.translateOrFallback('entity.definition.import.summary.attention', '建议补齐')} ${this.importNeedsAttentionCount}`
                : undefined
          });
        } else {
          this.importError = message.msg || this.translateOrFallback('entity.definition.import.parse-failed', '定义解析失败。');
          this.recordImportActivity({
            status: 'error',
            format: this.importFormat,
            summary: this.translateOrFallback('entity.definition.import.activity.preview-failed', '定义预览失败'),
            detail: this.importError
          });
        }
        this.cdr.markForCheck();
      },
      error: error => {
        this.importParsing = false;
        this.importError = error?.msg || error?.message || this.translateOrFallback('entity.definition.import.parse-failed', '定义解析失败。');
        this.recordImportActivity({
          status: 'error',
          format: this.importFormat,
          summary: this.translateOrFallback('entity.definition.import.activity.preview-failed', '定义预览失败'),
          detail: this.importError
        });
        this.cdr.markForCheck();
      }
    });
  }

  submitDefinitionImport(): void {
    const content = this.importDraft.trim();
    if (content === '') {
      this.importError = this.translateOrFallback('entity.definition.import.empty', '请先粘贴实体定义。');
      this.cdr.markForCheck();
      return;
    }
    if (this.importPreviewRows.length === 0) {
      this.parseDefinitionImport();
      return;
    }
    if (!this.isEditMode && this.importReadyCount === 0) {
      this.importError = this.translateOrFallback(
        'entity.definition.import.blocked',
        '当前定义都还有阻塞项，建议先补充基础信息或回到遥测发现补证据后再导入。'
      );
      if (this.importTelemetryPendingCount > 0 && this.importNeedsAttentionCount === this.importTelemetryPendingCount) {
        this.openDiscovery('telemetry');
        return;
      }
      this.importPreviewScope = 'attention';
      this.scrollToWorkspaceSection('definition-governance-bulk');
      this.cdr.markForCheck();
      return;
    }
    if (this.isEditMode && this.importPreviewRows.length > 1) {
      this.importError = this.translateOrFallback(
        'entity.definition.workspace.single-required',
        '编辑现有实体时，一次只能保存一个定义文档。'
      );
      this.cdr.markForCheck();
      return;
    }
    this.importSubmitting = true;
    this.importError = undefined;
    if (!this.isEditMode) {
      this.createEntitiesFromPreviewRows(this.activeImportPreviewRows.filter(row => row.gaps.length === 0));
      return;
    }
    const request = normalizeDefinitionRequest(this.importFormat, content);
    const request$: Observable<{ code: number; msg: string; data: number[] | void }> =
      this.isEditMode && this.entityId != undefined
        ? this.entitySvc.editEntityByDefinition(this.entityId, request)
        : this.entitySvc.newEntityBundleByDefinition(request);
    request$.subscribe({
      next: message => {
        this.importSubmitting = false;
        if (message.code === 0) {
          if (this.isEditMode && this.entityId != undefined) {
            const preview = this.importPreviewRows[0];
            this.importResultRows = [
              {
                entityId: this.entityId,
                title: preview?.title || this.entityTitle || `${this.translateOrFallback('entity.detail', '实体详情')} #${this.entityId}`,
                subtitle: preview?.subtitle,
                kindLabel: preview?.kindLabel || this.entityKindLabel || '-',
                sourceLabel: preview?.sourceLabel || this.translateOrFallback('entity.source.manual', '手工维护')
              }
            ];
            this.importSubmitSucceeded = true;
            this.recordImportActivity({
              status: 'success',
              format: this.importFormat,
              summary: this.translateOrFallback('entity.definition.import.activity.update-success', '实体定义已更新'),
              detail: preview?.kindLabel,
              entityId: this.entityId,
              entityName: this.importResultRows[0].title
            });
          this.notifySvc.success(
              this.translateOrFallback('entity.definition.workspace.edit-title', '编辑实体定义'),
              this.translateOrFallback('entity.definition.workspace.save-success', '实体定义保存成功。')
            );
            if (this.navigateToReturnDiscoveryWorkspace()) {
              return;
            }
            this.loadDefinitionActivities();
            this.loadExistingEntityWorkspace(false);
            this.cdr.markForCheck();
            return;
          }
          const createdIds = Array.isArray(message.data) ? message.data : [];
          const createdCount = createdIds.length;
          this.importResultRows = createdIds
            .map((entityId: number, index: number) => {
              const preview = this.importPreviewRows[index];
              if (preview == null) {
                return undefined;
              }
              return {
                entityId,
                title: preview.title,
                subtitle: preview.subtitle,
                kindLabel: preview.kindLabel,
                sourceLabel: preview.sourceLabel
              };
            })
            .filter((item: DefinitionImportResultRow | undefined): item is DefinitionImportResultRow => item != null);
          this.importSubmitSucceeded = true;
          this.recordImportActivity({
            status: 'success',
            format: this.importFormat,
            summary:
              createdCount > 1
                ? this.translateOrFallback('entity.definition.import.activity.bundle-success', `已导入 ${createdCount} 个实体`)
                : this.translateOrFallback('entity.definition.import.activity.single-success', '已导入 1 个实体'),
            detail:
              this.importPreviewRows.length > 0
                ? `${this.translateOrFallback('entity.definition.import.summary.ready', '可直接导入')} ${this.importReadyCount} · ${this.translateOrFallback('entity.definition.import.summary.attention', '建议补齐')} ${this.importNeedsAttentionCount}`
                : undefined
          });
          this.importResultRows.forEach(row => {
            this.recordImportActivity({
              status: 'success',
              format: this.importFormat,
              summary: this.translateOrFallback('entity.definition.import.activity.entity-created', '实体已创建'),
              detail: row.kindLabel,
              entityId: row.entityId,
              entityName: row.title
            });
          });
          this.notifySvc.success(
            this.translateOrFallback('entity.definition.import.title', '导入实体定义'),
            createdCount > 1
              ? this.translateOrFallback('entity.definition.import.success-bundle', `已导入 ${createdCount} 个实体。`)
              : this.translateOrFallback('entity.definition.import.success-single', '实体导入成功。')
          );
          this.loadDefinitionActivities();
          this.cdr.markForCheck();
          return;
        }
        this.importError =
          message.msg ||
          this.translateOrFallback(
            this.isEditMode ? 'entity.definition.import.activity.update-failed' : 'entity.definition.import.create-failed',
            this.isEditMode ? '实体定义保存失败。' : '实体导入失败。'
          );
        this.recordImportActivity({
          status: 'error',
          format: this.importFormat,
          summary: this.translateOrFallback(
            this.isEditMode ? 'entity.definition.import.activity.update-failed' : 'entity.definition.import.activity.create-failed',
            this.isEditMode ? '实体定义保存失败' : '实体导入失败'
          ),
          detail: this.importError
        });
        this.cdr.markForCheck();
      },
      error: (error: any) => {
        this.importSubmitting = false;
        this.importError =
          error?.msg ||
          error?.message ||
          this.translateOrFallback(
            this.isEditMode ? 'entity.definition.import.activity.update-failed' : 'entity.definition.import.create-failed',
            this.isEditMode ? '实体定义保存失败。' : '实体导入失败。'
          );
        this.recordImportActivity({
          status: 'error',
          format: this.importFormat,
          summary: this.translateOrFallback(
            this.isEditMode ? 'entity.definition.import.activity.update-failed' : 'entity.definition.import.activity.create-failed',
            this.isEditMode ? '实体定义保存失败' : '实体导入失败'
          ),
          detail: this.importError
        });
        this.cdr.markForCheck();
      }
    });
  }

  viewImportedEntity(entityId: number): void {
    this.router.navigate(['/entities', entityId]);
  }

  openDefinitionLifecycleRecord(record: DefinitionWorkspaceLifecycleRecord): void {
    switch (record.action) {
      case 'snapshot-discovery':
        this.openDiscovery('ownership');
        return;
      case 'snapshot-definition':
        this.pendingWorkspaceRemedy = 'ownership';
        this.runPendingWorkspaceRemedy();
        return;
      case 'entity':
        if (record.entityId != null) {
          this.router.navigate(['/entities', record.entityId]);
          return;
        }
        this.openCatalog();
        return;
      case 'discovery':
        if (this.seedDiscoveryActivity?.workspacePath != null) {
          this.router.navigateByUrl(this.seedDiscoveryActivity.workspacePath);
          return;
        }
        this.openDiscovery();
        return;
      case 'entity-detail':
        this.openEntityDetail();
        return;
      case 'entity-editor':
      default:
        this.openEntityEditor();
    }
  }

  runDefinitionGovernanceHook(card: DefinitionGovernanceHookCard): void {
    switch (card.action) {
      case 'registry-refresh':
        this.refreshWorkspaceTemplateRegistry();
        return;
      case 'registry-sync':
        this.syncWorkspaceTemplateRegistry();
        return;
      case 'registry-seed':
        if (this.canUseStarterDefinitions) {
          this.scrollToWorkspaceSection('definition-template-registry');
          return;
        }
        this.openDiscovery();
        return;
      case 'preset':
        this.openDiscovery();
        return;
      case 'ownership':
        this.scrollToWorkspaceSection('definition-governance-bulk');
        return;
      case 'definition':
        if (this.importPreviewRows.length === 0) {
          this.parseDefinitionImport();
          return;
        }
        this.scrollToWorkspaceSection('definition-import-preview');
        return;
      case 'telemetry':
      default:
        this.openDiscovery();
    }
  }

  runDefinitionGovernancePolicy(card: DefinitionGovernancePolicyCard): void {
    switch (card.action) {
      case 'registry-refresh':
        this.refreshWorkspaceTemplateRegistry();
        return;
      case 'registry-sync':
        this.syncWorkspaceTemplateRegistry();
        return;
      case 'registry-seed':
        if (this.canUseStarterDefinitions) {
          this.scrollToWorkspaceSection('definition-template-registry');
          return;
        }
        this.openDiscovery();
        return;
      case 'preset':
        this.openDiscovery();
        return;
      case 'ownership':
        this.scrollToWorkspaceSection('definition-governance-bulk');
        return;
      case 'definition':
        if (this.importPreviewRows.length === 0) {
          this.parseDefinitionImport();
          return;
        }
        this.scrollToWorkspaceSection('definition-import-preview');
        return;
      case 'telemetry':
      default:
        this.openDiscovery();
    }
  }

  onWorkspaceGuidanceAction(actionKey: string): void {
    if (actionKey === 'resume-primary' && this.resumeNextActionCard != null) {
      this.runResumeNextAction(this.resumeNextActionCard);
      return;
    }
    if (actionKey === 'resume-secondary' && this.resumeNextActionCard != null) {
      this.runResumeSecondaryAction(this.resumeNextActionCard);
      return;
    }
    if (actionKey === 'open-discovery') {
      this.openDiscovery();
      return;
    }
    if (actionKey === 'open-catalog') {
      this.openCatalog();
      return;
    }
    if (actionKey === 'submit-ready') {
      if (this.canSubmitReadyPreviewRows) {
        this.submitDefinitionImport();
        return;
      }
      this.scrollToWorkspaceSection('definition-import-preview');
      return;
    }
    if (actionKey === 'focus-attention') {
      this.scrollToWorkspaceSection('definition-governance-bulk');
      return;
    }
    if (actionKey.startsWith('policy-')) {
      const index = Number(actionKey.replace('policy-', ''));
      const card = this.definitionGovernancePolicyCards[index];
      if (card != null) {
        this.runDefinitionGovernancePolicy(card);
      }
      return;
    }
    if (actionKey.startsWith('hook-')) {
      const index = Number(actionKey.replace('hook-', ''));
      const card = this.definitionGovernanceHookCards[index];
      if (card != null) {
        this.runDefinitionGovernanceHook(card);
      }
    }
  }

  onWorkspaceGuidanceNext(actionKey: string): void {
    this.onWorkspaceGuidanceAction(actionKey);
  }

  runDefinitionImportQueueAction(group: DefinitionImportQueueGroup): void {
    this.importPreviewScope = group.scope;
    if (group.action === 'submit-ready') {
      if (this.canSubmitReadyPreviewRows) {
        this.submitDefinitionImport();
        return;
      }
      this.scrollToWorkspaceSection('definition-import-preview');
      this.cdr.markForCheck();
      return;
    }
    if (group.action === 'open-discovery') {
      this.openDiscoveryForImportPreviewRow(group.rows[0], 'telemetry');
      return;
    }
    if (group.action === 'focus-attention') {
      this.scrollToWorkspaceSection('definition-governance-bulk');
      this.cdr.markForCheck();
      return;
    }
    this.scrollToWorkspaceSection('definition-import-preview');
    this.cdr.markForCheck();
  }

  getImportPreviewRowActionLabel(row: DefinitionImportPreviewRow): string {
    switch (this.getImportPreviewRowAction(row)) {
      case 'submit-ready':
        return this.translateOrFallback('entity.definition.import.row-action.ready', '立即导入这一条');
      case 'telemetry':
        return this.translateOrFallback('entity.definition.import.row-action.telemetry', '回到遥测发现补充信息');
      case 'ownership':
      default:
        return this.translateOrFallback('entity.definition.import.row-action.ownership', '补充基础信息');
    }
  }

  runImportPreviewRowAction(row: DefinitionImportPreviewRow): void {
    switch (this.getImportPreviewRowAction(row)) {
      case 'submit-ready':
        if (this.isEditMode) {
          this.submitDefinitionImport();
          return;
        }
        this.importSubmitting = true;
        this.importError = undefined;
        this.createEntitiesFromPreviewRows([row]);
        return;
      case 'telemetry':
        this.openDiscoveryForImportPreviewRow(row, 'telemetry');
        return;
      case 'ownership':
      default:
        this.openEditorForImportPreviewRow(row);
    }
  }

  runResumeNextAction(card: DefinitionResumeNextActionCard): void {
    switch (card.action) {
      case 'submit-ready':
        if (this.canSubmitReadyPreviewRows) {
          this.submitDefinitionImport();
          return;
        }
        this.scrollToWorkspaceSection('definition-import-preview');
        return;
      case 'telemetry':
        this.openDiscoveryForImportPreviewRow(card.row, 'telemetry');
        return;
      case 'ownership':
        if (card.row != null) {
          this.openEditorForImportPreviewRow(card.row);
          return;
        }
        this.scrollToWorkspaceSection('definition-governance-bulk');
        return;
      case 'view-entity':
        if (card.entityId != null) {
          this.viewImportedEntity(card.entityId);
          return;
        }
        this.openCatalog();
        return;
      case 'open-catalog':
      default:
        this.openCatalog();
    }
  }

  runResumeSecondaryAction(card: DefinitionResumeNextActionCard): void {
    if (card.action === 'view-entity') {
      this.openCatalog();
      return;
    }
    if (card.entityId != null) {
      this.viewImportedEntity(card.entityId);
      return;
    }
    this.openCatalog();
  }

  runDefinitionSharedGovernanceSnapshot(card: DefinitionSharedGovernanceSnapshotCard): void {
    if (card.action === 'discovery') {
      this.openDiscovery('ownership');
      return;
    }
    this.pendingWorkspaceRemedy = 'ownership';
    this.runPendingWorkspaceRemedy();
  }

  trackByImportPreviewRow(_index: number, row: DefinitionImportPreviewRow): string {
    const entity = row.dto.entity;
    return `${entity.type}:${entity.namespace || 'default'}:${entity.name}`;
  }

  trackByDefinitionImportQueueGroup(_index: number, item: DefinitionImportQueueGroup): string {
    return item.key;
  }

  trackByDefinitionLifecycleRecord(_index: number, item: DefinitionWorkspaceLifecycleRecord): string {
    return item.id;
  }

  trackByDefinitionSharedGovernanceSnapshot(_index: number, item: DefinitionSharedGovernanceSnapshotCard): string {
    return item.key;
  }

  trackByImportActivity(_index: number, item: DefinitionImportActivity): string {
    return item.id;
  }

  private getDefinitionRegistrySignal(): GovernanceRegistrySignalPresentation {
    return buildGovernanceRegistrySignalPresentation(
      this.workspaceTemplateRegistrySource,
      this.definitionSharedGovernanceSnapshots[0]?.happenedAt,
      this.translateOrFallback.bind(this)
    );
  }

  private getDefinitionRegistryAction(card: GovernanceRegistrySignalPresentation): DefinitionGovernanceHookCard['action'] {
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

  private getDefinitionRegistryActionLabel(card: GovernanceRegistrySignalPresentation): string {
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

  trackByServerGovernanceActivity(_index: number, item: EntityDefinitionActivity): number {
    return item.id;
  }

  trackByImportResult(_index: number, item: DefinitionImportResultRow): number {
    return item.entityId;
  }

  trackByWorkspaceTemplate(_index: number, item: DefinitionWorkspaceTemplate): string {
    return item.id;
  }

  trackByGovernanceHint(_index: number, item: DefinitionGovernanceHint): string {
    return item.id;
  }

  trackByGovernanceConflictRollup(_index: number, item: { field: GovernanceConflictField }): string {
    return item.field;
  }

  trackByDefinitionGovernanceHookCard(_index: number, item: DefinitionGovernanceHookCard): string {
    return item.key;
  }

  trackByDefinitionGovernancePolicyCard(_index: number, item: DefinitionGovernancePolicyCard): string {
    return item.key;
  }

  trackByStarterTemplatePreset(_index: number, item: StarterTemplatePreset): string {
    return item.id;
  }

  trackByValue(_index: number, value: string): string {
    return value;
  }

  trackByIndex(index: number): number {
    return index;
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

  getDefinitionSharedGovernanceSnapshotMeta(card: DefinitionSharedGovernanceSnapshotCard): string | undefined {
    return card.key === 'definition'
      ? this.translateOrFallback('entity.list.snapshot.definition.meta', '定义记录')
      : this.translateOrFallback('entity.list.snapshot.discovery.meta', '发现记录');
  }

  getDefinitionSharedGovernanceSnapshotStatusLabel(status: DefinitionSharedGovernanceSnapshotCard['status']): string {
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

  private scrollToWorkspaceSection(sectionId: string): void {
    if (typeof document === 'undefined') {
      return;
    }
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  private normalizeWorkspaceRemedy(value?: string | null): DefinitionWorkspaceRemedy | undefined {
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
        case 'ownership':
          if (this.isEditMode && this.entityId != null) {
            this.router.navigate(['/entities', this.entityId, 'edit'], {
              queryParams: {
                focus: 'ownership',
                ...buildGovernancePresetQueryParams(this.governancePresetSeed)
              }
            });
            return;
          }
          if (!this.isEditMode && this.importPreviewRows.length === 0 && this.importDraft.trim() !== '') {
            this.pendingWorkspaceRemedy = remedy;
            this.parseDefinitionImport();
            return;
          }
          this.scrollToWorkspaceSection('definition-governance-bulk');
          break;
        case 'definition':
          if (this.importPreviewRows.length === 0 && this.importDraft.trim() !== '') {
            this.pendingWorkspaceRemedy = remedy;
            this.parseDefinitionImport();
            return;
          }
          this.scrollToWorkspaceSection('definition-import-preview');
          break;
        case 'telemetry':
        default:
          this.openDiscovery('ownership');
      }
    }, 0);
  }

  private navigateToReturnDiscoveryWorkspace(remedy?: DefinitionWorkspaceRemedy): boolean {
    const path = this.trimText(this.returnDiscoveryPath);
    if (path == null) {
      return false;
    }
    try {
      const urlTree = this.router.parseUrl(path);
      const nextQueryParams = { ...urlTree.queryParams } as Record<string, string | undefined>;
      if (remedy != null) {
        nextQueryParams['remedy'] = remedy;
      } else {
        delete nextQueryParams['remedy'];
      }
      urlTree.queryParams = nextQueryParams;
      this.router.navigateByUrl(urlTree);
      return true;
    } catch {
      return false;
    }
  }

  getServerImportActivitySummary(activity: DefinitionImportActivity): string {
    switch (activity.summary) {
      case 'Definition updated':
        return this.translateOrFallback('entity.definition.import.activity.update-success', '实体定义已更新');
      case 'Entity created':
        return this.translateOrFallback('entity.definition.import.activity.entity-created', '实体已创建');
      case 'Definition bundle imported':
        return this.translateOrFallback('entity.definition.import.activity.bundle-success', '定义包已导入');
      case 'Definition previewed':
      case 'Definition bundle previewed':
        return this.translateOrFallback('entity.definition.import.activity.preview', '已预览定义包');
      case 'Definition preview failed':
        return this.translateOrFallback('entity.definition.import.activity.preview-failed', '定义预览失败');
      case 'Entity import failed':
        return this.translateOrFallback('entity.definition.import.activity.create-failed', '实体导入失败');
      case 'Entity definition save failed':
        return this.translateOrFallback('entity.definition.import.activity.update-failed', '实体定义保存失败');
      default:
        return activity.summary;
    }
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

  openServerGovernanceActivity(activity: EntityDefinitionActivity): void {
    if (activity.entityId != null) {
      this.router.navigate(['/entities', activity.entityId]);
      return;
    }
    this.openCatalog();
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

  private loadDefinitionActivities(entityId?: number): void {
    this.entitySvc.getDefinitionActivities(entityId, 8).subscribe({
      next: message => {
        if (message.code !== 0) {
          this.serverImportActivities = [];
          this.serverGovernanceActivities = [];
          this.cdr.markForCheck();
          return;
        }
        const activities = this.sortServerActivities(message.data || []);
        this.serverImportActivities = activities
          .filter(activity => activity.activityType === 'definition_import' || activity.activityType === 'definition_update')
          .map(activity => this.toServerImportActivity(activity));
        this.serverGovernanceActivities = activities.filter(
          activity => activity.activityType !== 'definition_import' && activity.activityType !== 'definition_update'
        );
        this.cdr.markForCheck();
      },
      error: () => {
        this.serverImportActivities = [];
        this.serverGovernanceActivities = [];
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
        if (!this.isEditMode && this.importDraft.trim() === '') {
          this.setDraftContent(this.getDefinitionImportExample(), 'example');
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.catalogSuggestions = new EntityCatalogSuggestions();
        this.cdr.markForCheck();
      }
    });
  }

  private loadExistingEntityWorkspace(resetPreview = true): void {
    if (this.entityId == undefined) {
      return;
    }
    const requestedFormat = this.importFormat === 'curl' ? 'yaml' : this.importFormat;
    this.importParsing = true;
    if (resetPreview) {
      this.importPreviewRows = [];
      this.importPreviewDtos = [];
      this.importResultRows = [];
      this.importSubmitSucceeded = false;
    }
    forkJoin({
      entityMessage: this.entitySvc.getEntity(this.entityId).pipe(catchError(() => of(undefined))),
      definitionMessage: this.entitySvc.getEntityDefinition(this.entityId, requestedFormat).pipe(catchError(() => of(undefined)))
    }).subscribe({
      next: ({ entityMessage, definitionMessage }) => {
        this.importParsing = false;
        if (entityMessage?.code === 0 && entityMessage.data != null) {
          const entity = entityMessage.data.entity;
          this.entityTitle = this.getEntityTitle(entity);
          this.entityKindLabel = this.translateOrFallback(`entity.type.${entity.type}`, this.humanize(entity.type));
          this.recordGovernancePresetWorkspaceActivity();
        }
        if (definitionMessage?.code === 0 && typeof definitionMessage.data === 'string') {
          this.loadedDefinitionFormat = requestedFormat;
          this.loadedDefinitionContent = definitionMessage.data;
          this.setDraftContent(
            this.importFormat === 'curl' ? this.buildDefinitionCurlPreview(requestedFormat, definitionMessage.data) : definitionMessage.data,
            'entity',
            this.entityTitle
          );
          this.importError = undefined;
        } else {
          this.importError =
            definitionMessage?.msg ||
            this.translateOrFallback('entity.definition.workspace.load-failed', '当前实体定义加载失败。');
        }
        this.loadDefinitionActivities(this.entityId);
        this.runPendingWorkspaceRemedy();
        this.cdr.markForCheck();
      },
      error: error => {
        this.importParsing = false;
        this.importError =
          error?.msg || error?.message || this.translateOrFallback('entity.definition.workspace.load-failed', '当前实体定义加载失败。');
        this.serverImportActivities = [];
        this.serverGovernanceActivities = [];
        this.cdr.markForCheck();
      }
    });
  }

  private loadExistingDefinitionContent(format: Exclude<EntityDefinitionFormat, 'curl'>): void {
    if (!this.isEditMode || this.entityId == undefined) {
      return;
    }
    this.importParsing = true;
    this.entitySvc.getEntityDefinition(this.entityId, format).subscribe({
      next: message => {
        this.importParsing = false;
        if (message.code === 0 && typeof message.data === 'string') {
          this.loadedDefinitionFormat = format;
          this.loadedDefinitionContent = message.data;
          this.setDraftContent(message.data, 'entity', this.entityTitle);
          this.importError = undefined;
        } else {
          this.importError = message.msg || this.translateOrFallback('entity.definition.workspace.load-failed', '当前实体定义加载失败。');
        }
        this.runPendingWorkspaceRemedy();
        this.cdr.markForCheck();
      },
      error: error => {
        this.importParsing = false;
        this.importError =
          error?.msg || error?.message || this.translateOrFallback('entity.definition.workspace.load-failed', '当前实体定义加载失败。');
        this.cdr.markForCheck();
      }
    });
  }

  private buildDefinitionCurlPreview(format: Exclude<EntityDefinitionFormat, 'curl'>, content: string): string {
    if (this.entityId == undefined) {
      return '';
    }
    const payload = JSON.stringify(
      {
        format,
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

  private resetWorkspaceState(): void {
    this.entityTitle = undefined;
    this.entityKindLabel = undefined;
    this.importDraft = '';
    this.draftSourceType = 'example';
    this.draftSourceName = undefined;
    this.importError = undefined;
    this.importParsing = false;
    this.importSubmitting = false;
    this.importSubmitSucceeded = false;
    this.importPreviewDtos = [];
    this.importPreviewRows = [];
    this.importResultRows = [];
    this.serverImportActivities = [];
    this.serverGovernanceActivities = [];
    this.importOwnerDraft = '';
    this.importSystemDraft = null;
    this.importRunbookDraft = '';
    this.governancePresetSeed = undefined;
    this.seedSource = undefined;
    this.seedEntityCount = undefined;
    this.seedActivityId = undefined;
    this.returnDiscoveryPath = undefined;
    this.loadedDefinitionContent = '';
    this.loadedDefinitionFormat = 'yaml';
    this.handledImportPreviewRowKeys.clear();
  }

  private readSeedState(): DefinitionWorkspaceSeedState | undefined {
    const navigationState = this.router.getCurrentNavigation()?.extras.state as Record<string, unknown> | undefined;
    const historyState = window.history.state as Record<string, unknown> | undefined;
    const seedActivityId = this.trimText(this.route.snapshot.queryParamMap.get('seedActivity') || undefined);
    const resumeToken = this.trimText(this.route.snapshot.queryParamMap.get('resumeDefinitionToken') || undefined);
    const resumeState = readDefinitionWorkspaceResumeState(resumeToken);
    const discoveryActivity = findDiscoveryGovernanceActivity(seedActivityId);
    const content = this.trimText(
      resumeState?.content ||
        (navigationState?.seedDefinitionDraft as string | undefined) ||
        (historyState?.seedDefinitionDraft as string | undefined) ||
        discoveryActivity?.seedDefinitionDraft
    );
    if (content == null) {
      return undefined;
    }
    const format = ((navigationState?.seedDefinitionFormat as EntityDefinitionFormat | undefined) ||
      (resumeState?.format as EntityDefinitionFormat | undefined) ||
      (historyState?.seedDefinitionFormat as EntityDefinitionFormat | undefined) ||
      discoveryActivity?.seedDefinitionFormat ||
      this.importFormat) as EntityDefinitionFormat;
    if (resumeState != null) {
      this.importOwnerDraft = this.trimText(resumeState.ownerDraft) || '';
      this.importSystemDraft = this.trimText(resumeState.systemDraft || undefined) || null;
      this.importRunbookDraft = this.trimText(resumeState.runbookDraft) || '';
    }
    return {
      content,
      format,
      source: this.trimText(
        resumeState?.source ||
          (navigationState?.seedDefinitionSource as string | undefined) ||
          (historyState?.seedDefinitionSource as string | undefined) ||
          discoveryActivity?.seedDefinitionSource
      ),
      count: Number(
        (resumeState?.count as number | undefined) ||
          (navigationState?.seedDefinitionCount as number | undefined) ||
          (historyState?.seedDefinitionCount as number | undefined) ||
          discoveryActivity?.seedDefinitionCount ||
          0
      ),
      autoPreview: !!(resumeState != null || navigationState?.seedDefinitionAutoPreview || historyState?.seedDefinitionAutoPreview || discoveryActivity != null),
      activityId: seedActivityId
    };
  }

  private persistWorkspaceResumeState(): DefinitionWorkspaceResumeState {
    const queryParams: Record<string, string> = {};
    this.route.snapshot.queryParamMap.keys.forEach(key => {
      if (key === 'resumeDefinitionToken') {
        return;
      }
      const value = this.trimText(this.route.snapshot.queryParamMap.get(key) || undefined);
      if (value != null) {
        queryParams[key] = value;
      }
    });
    queryParams['format'] = this.importFormat;
    const resumeState = persistDefinitionWorkspaceResumeState({
      content: this.importDraft,
      format: this.importFormat,
      source: this.seedSource || this.draftSourceType,
      count: this.importPreviewRows.length || this.seedEntityCount || 0,
      ownerDraft: this.importOwnerDraft,
      systemDraft: this.importSystemDraft,
      runbookDraft: this.importRunbookDraft,
      queryParams
    });
    this.entitySvc
      .saveDefinitionWorkspaceResume(resumeState)
      .pipe(catchError(() => of(undefined)))
      .subscribe();
    return resumeState;
  }

  private loadResumeStateFromServer(token: string): void {
    this.entitySvc
      .getDefinitionWorkspaceResume(token)
      .pipe(catchError(() => of(undefined)))
      .subscribe(message => {
        const resumeState = message?.data;
        if (resumeState?.content != null && resumeState.content.trim() !== '') {
          this.importOwnerDraft = this.trimText(resumeState.ownerDraft) || '';
          this.importSystemDraft = this.trimText(resumeState.systemDraft || undefined) || null;
          this.importRunbookDraft = this.trimText(resumeState.runbookDraft) || '';
          this.applySeedState({
            content: resumeState.content,
            format: resumeState.format,
            source: this.trimText(resumeState.source),
            count: resumeState.count,
            autoPreview: true,
            activityId: this.trimText(this.route.snapshot.queryParamMap.get('seedActivity') || undefined)
          });
          return;
        }
        this.continueWithoutResumeSeed();
      });
  }

  private applySeedState(seedState: DefinitionWorkspaceSeedState): void {
    if (seedState.format === 'yaml' || seedState.format === 'json' || seedState.format === 'curl') {
      this.importFormat = seedState.format;
    }
    if (seedState.content != null && seedState.content.trim() !== '') {
      this.setDraftContent(
        seedState.content,
        'seed',
        seedState.source === 'telemetry' ? this.translateOrFallback('entity.entry-source.telemetry', '遥测发现') : undefined
      );
      this.seedSource = seedState.source;
      this.seedEntityCount = seedState.count;
      this.seedActivityId = seedState.activityId;
    }
    this.loadDefinitionActivities();
    if (seedState.autoPreview && this.importDraft.trim() !== '') {
      this.parseDefinitionImport();
      return;
    }
    this.cdr.markForCheck();
  }

  private loadSeedStateFromServer(activityId: string): void {
    this.entitySvc.getDiscoveryGovernanceActivities(1, activityId).subscribe({
      next: message => {
        const activity = message.code === 0 ? message.data?.[0] : undefined;
        const seedState = this.toSeedStateFromActivity(activityId, activity);
        if (seedState != null) {
          this.applySeedState(seedState);
          return;
        }
        if (this.importDraft.trim() === '') {
          this.setDraftContent(this.getDefinitionImportExample(), 'example');
        }
        this.loadDefinitionActivities();
        this.cdr.markForCheck();
      },
      error: () => {
        if (this.importDraft.trim() === '') {
          this.setDraftContent(this.getDefinitionImportExample(), 'example');
        }
        this.loadDefinitionActivities();
        this.cdr.markForCheck();
      }
    });
  }

  private toSeedStateFromActivity(activityId: string, activity?: EntityDiscoveryGovernanceActivity): DefinitionWorkspaceSeedState | undefined {
    const content = this.trimText(activity?.seedDefinitionDraft);
    if (content == null) {
      return undefined;
    }
    return {
      content,
      format: (activity?.seedDefinitionFormat || this.importFormat) as EntityDefinitionFormat,
      source: this.trimText(activity?.seedDefinitionSource),
      count: Number(activity?.seedDefinitionCount || 0),
      autoPreview: true,
      activityId
    };
  }

  private normalizeLifecycleTimestamp(value?: string | number | null): string | undefined {
    if (value == null || value === '') {
      return undefined;
    }
    const text = String(value).trim();
    if (text === '') {
      return undefined;
    }
    const normalized = text.includes('T') ? text : text.replace(' ', 'T');
    const parsed = new Date(normalized);
    if (Number.isNaN(parsed.getTime())) {
      return text;
    }
    return parsed.toISOString();
  }

  private compareLifecycleTimestamp(left?: string | number | null, right?: string | number | null): number {
    const leftValue = new Date(this.normalizeLifecycleTimestamp(left) || 0).getTime();
    const rightValue = new Date(this.normalizeLifecycleTimestamp(right) || 0).getTime();
    return rightValue - leftValue;
  }

  formatImportActivityTimestamp(value?: string | number | null): string {
    const normalized = this.normalizeLifecycleTimestamp(value);
    if (normalized == null) {
      return '-';
    }
    const parsed = new Date(normalized);
    if (Number.isNaN(parsed.getTime())) {
      return normalized.replace('T', ' ');
    }
    return formatDate(parsed, 'yyyy-MM-dd HH:mm:ss', 'en-US');
  }

  private toImportPreviewRow(dto: EntityDto): DefinitionImportPreviewRow {
    const entity = dto.entity;
    const title = this.getEntityTitle(entity);
    const gapKeys: ImportPreviewGapKey[] = [];
    const gaps: string[] = [];
    if (this.trimText(entity.owner) == null) {
      gapKeys.push('owner');
      gaps.push(this.translateOrFallback('entity.field.owner', '负责人'));
    }
    if (this.trimText(entity.system) == null && ['service', 'api', 'endpoint', 'database', 'queue', 'middleware'].includes(entity.type)) {
      gapKeys.push('system');
      gaps.push(this.translateOrFallback('entity.field.system', '所属系统'));
    }
    if (['api'].includes(entity.type) && (entity.implementedBy || []).length === 0) {
      gapKeys.push('implementedBy');
      gaps.push(this.translateOrFallback('entity.field.implemented-by', 'Implemented by'));
    }
    if ((dto.identities || []).length === 0 && (dto.monitorBinds || []).length === 0) {
      gapKeys.push('telemetry');
      gaps.push(this.translateOrFallback('entity.definition.import.gap.telemetry', '遥测绑定'));
    }
    if (this.trimText(entity.runbook) == null) {
      gapKeys.push('runbook');
      gaps.push(this.translateOrFallback('entity.field.runbook', '处置手册'));
    }
    const readinessScore = Math.max(0, 100 - gaps.length * 20);
    return {
      dto,
      title,
      subtitle: this.getEntitySubtitle(entity),
      kindLabel: this.translateOrFallback(`entity.type.${entity.type}`, this.humanize(entity.type)),
      sourceLabel: this.translateOrFallback(`entity.source.${entity.source}`, this.humanize(entity.source || 'manual')),
      telemetryLabel:
        (dto.monitorBinds || []).length > 0 || (dto.identities || []).length > 0
          ? this.translateOrFallback('entity.definition.import.telemetry.ready', '已识别遥测绑定')
          : this.translateOrFallback('entity.definition.import.telemetry.pending', '待补充遥测绑定'),
      gapKeys,
      gaps,
      validationColor: gaps.length === 0 ? 'success' : 'warning',
      validationLabel:
        gaps.length === 0
          ? this.translateOrFallback('entity.definition.import.validation.ready', '可直接导入')
          : this.translateOrFallback('entity.definition.import.validation.needs-attention', '导入前建议补齐'),
      readinessScore
    };
  }

  private getEntityTitle(entity?: Entity): string {
    if (entity == null) {
      return '-';
    }
    return entity.displayName || entity.name;
  }

  private getEntitySubtitle(entity?: Entity): string | undefined {
    if (entity == null || !entity.displayName || entity.displayName === entity.name) {
      return undefined;
    }
    return entity.name;
  }

  private getDefinitionImportExample(): string {
    const namespace = this.catalogSuggestions.namespaces[0] || 'commerce';
    const owner = this.resolvePreferredOwner();
    const system = this.resolvePreferredSystem();
    const serviceOwner = this.trimText(this.governancePresetSeed?.bulkOwner) || owner;
    const environment = this.resolvePreferredEnvironment();
    const source = this.resolvePreferredSource();
    return [
      'apiVersion: hertzbeat/v1',
      'kind: system',
      'metadata:',
      `  name: ${system}`,
      `  namespace: ${namespace}`,
      `  owner: ${owner}`,
      'spec:',
      `  source: ${source}`,
      `  environment: ${environment}`,
      '  lifecycle: production',
      '  tier: tier1',
      '---',
      'apiVersion: hertzbeat/v1',
      'kind: service',
      'metadata:',
      '  name: checkout',
      `  namespace: ${namespace}`,
      `  owner: ${serviceOwner}`,
      'spec:',
      `  source: ${source}`,
      `  environment: ${environment}`,
      '  tier: tier1',
      `  system: ${system}`,
      '  dependsOn:',
      `    - datastore:${namespace}/order-db`
    ].join('\n');
  }

  private buildStarterDefinition(kind: StarterDefinitionKind, format: 'yaml' | 'json'): string {
    const namespace = this.catalogSuggestions.namespaces[0] || 'commerce';
    const owner = this.resolvePreferredOwner();
    const environment = this.resolvePreferredEnvironment();
    const system = this.resolvePreferredSystem();
    const inheritFrom = this.catalogSuggestions.inheritFromRefs[0];
    const language = this.catalogSuggestions.languages[0] || 'java';
    const normalizedEnvironment = environment === 'prod' ? 'production' : environment;
    const source = this.resolvePreferredSource();

    const definition = this.buildStarterDefinitionObject(kind, {
      namespace,
      owner,
      environment,
      normalizedEnvironment,
      system,
      source,
      inheritFrom,
      language
    });
    return format === 'json' ? JSON.stringify(definition, null, 2) : this.renderYamlDefinition(definition);
  }

  getWorkspaceTemplateSummary(template: DefinitionWorkspaceTemplate): string {
    const base =
      template.summary ||
      `${template.format.toUpperCase()} · ${this.getTemplateSourceLabel(template.source)} · ${this.translateOrFallback('entity.definition.workspace.template.custom', '自定义模板')}`;
    return [this.getWorkspaceTemplateRegistrySummary(), base, template.creator]
      .filter((value): value is string => this.trimText(value) != null)
      .join(' · ');
  }

  getWorkspaceTemplateRegistrySummary(): string | undefined {
    if (this.workspaceTemplateRegistrySource === 'empty') {
      return undefined;
    }
    return `${this.translateOrFallback('entity.governance.registry.label', '当前来源')}：${this.translateOrFallback(
      'entity.governance.registry.' + this.workspaceTemplateRegistrySource,
      this.workspaceTemplateRegistrySource
    )}`;
  }

  get canSyncWorkspaceTemplateRegistry(): boolean {
    return this.workspaceTemplateRegistrySource === 'local' && readDefinitionWorkspaceTemplates(8).length > 0;
  }

  private joinWorkspaceLifecycleDetail(...segments: Array<string | undefined>): string | undefined {
    const values = segments.filter((value): value is string => this.trimText(value) != null);
    const unique = values.filter((value, index, all) => all.indexOf(value) === index);
    return unique.length > 0 ? unique.join(' · ') : undefined;
  }

  refreshWorkspaceTemplateRegistry(): void {
    this.loadWorkspaceTemplates();
    this.recordImportActivity({
      id: `definition-template-registry-refresh-${Date.now()}`,
      status: 'success',
      format: this.importFormat,
      summary: this.translateOrFallback('entity.governance.registry.refresh.activity', '已刷新共享目录'),
      detail: this.getWorkspaceTemplateRegistrySummary()
    });
    this.notifySvc.success(
      this.translateOrFallback('entity.definition.import.title', '导入实体定义'),
      this.translateOrFallback('entity.governance.registry.refresh.success', '已尝试从共享目录刷新预设。')
    );
  }

  syncWorkspaceTemplateRegistry(): void {
    const localTemplates = readDefinitionWorkspaceTemplates(8);
    if (localTemplates.length === 0) {
      this.notifySvc.warning(
        this.translateOrFallback('entity.definition.import.title', '导入实体定义'),
        this.translateOrFallback('entity.definition.workspace.template.sync.empty', '当前没有可同步的本地模板。')
      );
      return;
    }
    forkJoin(
      localTemplates.map(template => this.entitySvc.saveDefinitionWorkspaceTemplate(template).pipe(catchError(() => of(undefined))))
    ).subscribe({
      next: results => {
        const syncedCount = results.filter(result => result?.code === 0).length;
        this.loadWorkspaceTemplates();
        this.recordImportActivity({
          id: `definition-template-registry-sync-${Date.now()}`,
          status: syncedCount > 0 ? 'success' : 'warning',
          format: this.importFormat,
          summary:
            syncedCount > 0
              ? this.translateOrFallback('entity.definition.workspace.template.sync.activity', '已将本地模板同步到共享目录')
              : this.translateOrFallback('entity.governance.registry.sync.warning', '共享目录当前不可写，仍保留本地内容。'),
          detail: [
            this.getWorkspaceTemplateRegistrySummary(),
            syncedCount > 0 ? `${syncedCount} ${this.translateOrFallback('entity.definition.workspace.template.custom', '自定义模板')}` : undefined
          ]
            .filter((value): value is string => this.trimText(value) != null)
            .join(' · ')
        });
        if (syncedCount > 0) {
          this.notifySvc.success(
            this.translateOrFallback('entity.definition.import.title', '导入实体定义'),
            this.translateOrFallback('entity.definition.workspace.template.sync.success', '本地模板已同步到共享目录。')
          );
          return;
        }
        this.notifySvc.warning(
          this.translateOrFallback('entity.definition.import.title', '导入实体定义'),
          this.translateOrFallback('entity.governance.registry.sync.warning', '共享目录当前不可写，仍保留本地内容。')
        );
      },
      error: () => {
        this.notifySvc.warning(
          this.translateOrFallback('entity.definition.import.title', '导入实体定义'),
          this.translateOrFallback('entity.governance.registry.sync.warning', '共享目录当前不可写，仍保留本地内容。')
        );
      }
    });
  }

  refreshImportPreviewRows(): void {
    this.importPreviewRows = this.importPreviewDtos.map(dto => this.toImportPreviewRow(this.applyImportGovernanceOverridesToDto(this.cloneEntityDto(dto))));
    this.applyResumeHandledPreviewRow();
    this.scheduleDefinitionGovernanceHookSync();
    this.cdr.markForCheck();
  }

  private createEntitiesFromPreviewRows(rows: DefinitionImportPreviewRow[]): void {
    if (rows.length === 0) {
      this.importSubmitting = false;
      this.importError = this.translateOrFallback(
        'entity.definition.import.blocked',
        '当前定义都还有阻塞项，建议先补充基础信息或回到遥测发现补证据后再导入。'
      );
      this.cdr.markForCheck();
      return;
    }
    const requestDtos = rows.map(row => this.applyImportGovernanceOverridesToDto(this.cloneEntityDto(row.dto)));
    const requests = requestDtos.map(dto =>
      this.entitySvc.newEntity(dto).pipe(
        catchError(error =>
          of({
            code: 1,
            msg: error?.msg || error?.message || 'Create failed',
            data: 0
          })
        )
      )
    );
    forkJoin(requests).subscribe({
      next: responses => {
        this.importSubmitting = false;
        const attemptedCount = requestDtos.length;
        const succeededRows = rows.filter((_, index) => {
          const message = responses[index];
          return message.code === 0 && typeof message.data === 'number' && message.data > 0;
        });
        const createdRows = responses
          .map((message, index) => {
            if (message.code !== 0 || typeof message.data !== 'number' || message.data <= 0) {
              return undefined;
            }
            const preview = this.toImportPreviewRow(requestDtos[index]);
            return {
              entityId: message.data,
              title: preview.title,
              subtitle: preview.subtitle,
              kindLabel: preview.kindLabel,
              sourceLabel: preview.sourceLabel
            } as DefinitionImportResultRow;
          })
          .filter((item: DefinitionImportResultRow | undefined): item is DefinitionImportResultRow => item != null);
        const failedCount = responses.length - createdRows.length;
        this.importResultRows = createdRows;
        this.importSubmitSucceeded = createdRows.length > 0;
        if (createdRows.length > 0) {
          this.markImportPreviewRowsHandled(succeededRows);
        }
        if (createdRows.length > 0) {
          this.recordImportActivity({
            status: failedCount > 0 ? 'warning' : 'success',
            format: this.importFormat,
            summary:
              createdRows.length > 1
                ? this.translateOrFallback('entity.definition.import.activity.bundle-success', `已导入 ${createdRows.length} 个实体`)
                : this.translateOrFallback('entity.definition.import.activity.single-success', '已导入 1 个实体'),
            detail: this.buildImportGovernanceActivityDetail(createdRows.length, attemptedCount)
          });
          createdRows.forEach(row => {
            this.recordImportActivity({
              status: 'success',
              format: this.importFormat,
              summary: this.translateOrFallback('entity.definition.import.activity.entity-created', '实体已创建'),
              detail: row.kindLabel,
              entityId: row.entityId,
              entityName: row.title
            });
          });
          this.notifySvc.success(
            this.translateOrFallback('entity.definition.import.title', '导入实体定义'),
            failedCount > 0 || this.importBlockedCount > 0
              ? this.translateOrFallback(
                  'entity.definition.import.success-ready-only',
                  `已导入 ${createdRows.length} 条就绪定义，其余项保留在当前页面继续处理。`
                )
              : createdRows.length > 1
              ? this.translateOrFallback('entity.definition.import.success-bundle', `已导入 ${createdRows.length} 个实体。`)
              : this.translateOrFallback('entity.definition.import.success-single', '实体导入成功。')
          );
          this.loadDefinitionActivities();
        }
        if (failedCount > 0) {
          this.importError = this.translateOrFallback('entity.definition.import.partial-failed', `仍有 ${failedCount} 个实体未能创建，请检查定义后重试。`);
          if (createdRows.length === 0) {
            this.recordImportActivity({
              status: 'error',
              format: this.importFormat,
              summary: this.translateOrFallback('entity.definition.import.activity.create-failed', '实体导入失败'),
              detail: this.importError
            });
          }
        }
        this.cdr.markForCheck();
      },
      error: error => {
        this.importSubmitting = false;
        this.importError = error?.msg || error?.message || this.translateOrFallback('entity.definition.import.create-failed', '实体导入失败。');
        this.recordImportActivity({
          status: 'error',
          format: this.importFormat,
          summary: this.translateOrFallback('entity.definition.import.activity.create-failed', '实体导入失败'),
          detail: this.importError
        });
        this.cdr.markForCheck();
      }
    });
  }

  private markImportPreviewRowsHandled(rows: DefinitionImportPreviewRow[]): void {
    rows.forEach(row => this.handledImportPreviewRowKeys.add(this.getImportPreviewRowKey(row)));
  }

  private applyResumeHandledPreviewRow(): void {
    const handledRowKey = this.trimText(this.route.snapshot.queryParamMap.get('resumeHandledRowKey') || undefined);
    if (handledRowKey == null) {
      return;
    }
    const matchedRow = this.importPreviewRows.find(row => this.getImportPreviewRowKey(row) === handledRowKey);
    if (matchedRow == null) {
      return;
    }
    this.handledImportPreviewRowKeys.add(handledRowKey);
    const handledEntityId = Number(this.route.snapshot.queryParamMap.get('resumeHandledEntityId'));
    if (!Number.isNaN(handledEntityId) && handledEntityId > 0 && !this.importResultRows.some(row => row.entityId === handledEntityId)) {
      this.importResultRows = [
        {
          entityId: handledEntityId,
          title: matchedRow.title,
          subtitle: matchedRow.subtitle,
          kindLabel: matchedRow.kindLabel,
          sourceLabel: matchedRow.sourceLabel
        },
        ...this.importResultRows
      ];
      this.importSubmitSucceeded = true;
    }
    this.advanceImportPreviewAfterResume();
  }

  private advanceImportPreviewAfterResume(): void {
    if (this.activeImportPreviewRows.length === 0) {
      this.importPreviewScope = 'all';
      return;
    }
    const nextTelemetryRow = this.getNextTelemetryImportPreviewRow();
    if (nextTelemetryRow != null) {
      this.importPreviewScope = 'telemetry';
    } else if (this.activeImportPreviewRows.some(row => row.gaps.length > 0)) {
      this.importPreviewScope = 'attention';
    } else if (this.activeImportPreviewRows.some(row => row.gaps.length === 0)) {
      this.importPreviewScope = 'ready';
    } else {
      this.importPreviewScope = 'all';
    }
    setTimeout(() => {
      this.scrollToWorkspaceSection('definition-import-preview');
      this.cdr.markForCheck();
    }, 0);
  }

  private getImportPreviewRowKey(row: DefinitionImportPreviewRow): string {
    return `${row.dto.entity.type}:${row.dto.entity.namespace || 'default'}:${row.dto.entity.name}`;
  }

  private getImportPreviewRowDiscoveryQuery(row: DefinitionImportPreviewRow): string {
    const identities = row.dto.identities || [];
    const preferredIdentity = DEFINITION_DISCOVERY_QUERY_IDENTITY_KEYS
      .map(key => identities.find(identity => identity.identityKey === key && this.trimText(identity.identityValue) != null))
      .find((identity): identity is NonNullable<typeof identity> => identity != null);
    return this.trimText(preferredIdentity?.identityValue) || this.trimText(row.subtitle) || this.trimText(row.dto.entity.name) || row.title;
  }

  private getImportPreviewRowAction(row: DefinitionImportPreviewRow): DefinitionImportPreviewRowAction {
    if (row.gaps.length === 0) {
      return 'submit-ready';
    }
    if (row.gapKeys.some(gap => gap !== 'telemetry')) {
      return 'ownership';
    }
    return 'telemetry';
  }

  private buildStarterDefinitionObject(
    kind: StarterDefinitionKind,
    context: {
      namespace: string;
      owner: string;
      environment: string;
      normalizedEnvironment: string;
      system: string;
      source: string;
      inheritFrom?: string;
      language: string;
    }
  ): Record<string, any> {
    switch (kind) {
      case 'system':
        return {
          apiVersion: 'hertzbeat/v1',
          kind: 'system',
          metadata: {
            name: context.system,
            namespace: context.namespace,
            owner: context.owner
          },
          spec: {
            source: context.source,
            environment: context.environment,
            lifecycle: context.normalizedEnvironment,
            tier: 'tier1'
          }
        };
      case 'api':
        return {
          apiVersion: 'hertzbeat/v1',
          kind: 'api',
          metadata: {
            name: 'payments-public-api',
            namespace: context.namespace,
            owner: context.owner,
            ...(context.inheritFrom ? { inheritFrom: context.inheritFrom } : {})
          },
          spec: {
            source: context.source,
            environment: context.environment,
            lifecycle: context.normalizedEnvironment,
            tier: 'tier1',
            system: context.system,
            implementedBy: [`service:${context.namespace}/payments-api`],
            interface: {
              fileRef: 'openapi/payments-public-api.yaml'
            }
          }
        };
      case 'endpoint':
        return {
          apiVersion: 'hertzbeat/v1',
          kind: 'endpoint',
          metadata: {
            name: 'payments-public-endpoint',
            namespace: context.namespace,
            owner: context.owner
          },
          spec: {
            source: context.source,
            environment: context.environment,
            lifecycle: context.normalizedEnvironment,
            tier: 'tier2',
            system: context.system,
            telemetry: {
              identities: [
                {
                  key: 'endpoint.url',
                  value: 'https://api.example.com/payments',
                  type: 'manual',
                  primary: true
                }
              ]
            }
          }
        };
      default:
        return {
          apiVersion: 'hertzbeat/v1',
          kind: 'service',
          metadata: {
            name: 'payments-api',
            namespace: context.namespace,
            owner: context.owner,
            ...(context.inheritFrom ? { inheritFrom: context.inheritFrom } : {})
          },
          spec: {
            source: context.source,
            environment: context.environment,
            lifecycle: context.normalizedEnvironment,
            tier: 'tier1',
            system: context.system,
            languages: [context.language],
            telemetry: {
              identities: [
                {
                  key: 'service.name',
                  value: 'payments-api',
                  type: 'derived',
                  primary: true
                }
              ]
            }
          }
        };
    }
  }

  private renderYamlDefinition(value: any, indent = 0): string {
    if (Array.isArray(value)) {
      return value
        .map(item => {
          if (item == null || typeof item !== 'object') {
            return `${'  '.repeat(indent)}- ${this.renderScalar(item)}`;
          }
          const nested = this.renderYamlDefinition(item, indent + 1);
          return `${'  '.repeat(indent)}-\n${nested}`;
        })
        .join('\n');
    }
    return Object.entries(value)
      .map(([key, entryValue]) => {
        if (Array.isArray(entryValue)) {
          return entryValue.length === 0
            ? `${'  '.repeat(indent)}${key}: []`
            : `${'  '.repeat(indent)}${key}:\n${this.renderYamlDefinition(entryValue, indent + 1)}`;
        }
        if (entryValue != null && typeof entryValue === 'object') {
          return `${'  '.repeat(indent)}${key}:\n${this.renderYamlDefinition(entryValue, indent + 1)}`;
        }
        return `${'  '.repeat(indent)}${key}: ${this.renderScalar(entryValue)}`;
      })
      .join('\n');
  }

  private renderScalar(value: any): string {
    if (typeof value === 'string') {
      return /^[a-zA-Z0-9._:/-]+$/.test(value) ? value : `"${value.replace(/"/g, '\\"')}"`;
    }
    if (value == null) {
      return 'null';
    }
    return String(value);
  }

  private persistImportActivities(): void {
    writeDefinitionImportActivities(this.importActivities, 8);
  }

  private loadDefinitionWorkspaceActivities(): void {
    this.entitySvc.getDefinitionWorkspaceActivities(8).subscribe({
      next: message => {
        if (message.code !== 0) {
          this.serverWorkspaceActivities = [];
          this.cdr.markForCheck();
          return;
        }
        const serverActivities = (message.data || []).slice(0, 8).map(activity => this.toServerWorkspaceActivity(activity));
        this.serverWorkspaceActivities = serverActivities;
        if (!this.definitionWorkspaceActivitiesMigrated) {
          this.definitionWorkspaceActivitiesMigrated = true;
          this.syncLocalDefinitionWorkspaceActivities(serverActivities);
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.serverWorkspaceActivities = [];
        this.cdr.markForCheck();
      }
    });
  }

  private loadDiscoveryGovernanceActivities(): void {
    this.entitySvc.getDiscoveryGovernanceActivities(8).subscribe({
      next: message => {
        if (message.code !== 0) {
          this.sharedDiscoveryActivities = [];
          this.cdr.markForCheck();
          return;
        }
        this.sharedDiscoveryActivities = [...(message.data || [])].sort((left, right) =>
          this.compareLifecycleTimestamp(left.happenedAt, right.happenedAt)
        );
        this.cdr.markForCheck();
      },
      error: () => {
        this.sharedDiscoveryActivities = [];
        this.cdr.markForCheck();
      }
    });
  }

  private syncLocalDefinitionWorkspaceActivities(serverActivities: DefinitionImportActivity[]): void {
    const localActivities = readDefinitionImportActivities(8);
    const missing = localActivities.filter(localActivity => !serverActivities.some(serverActivity => serverActivity.id === localActivity.id));
    if (missing.length === 0) {
      return;
    }
    forkJoin(
      missing.map(activity =>
        this.entitySvc.saveDefinitionWorkspaceActivity(this.toPersistedWorkspaceActivity(activity)).pipe(catchError(() => of(undefined)))
      )
    ).subscribe(() => {
      this.loadDefinitionWorkspaceActivities();
    });
  }

  private toServerImportActivity(activity: EntityDefinitionActivity): DefinitionImportActivity {
    const format: DefinitionImportActivityFormat =
      activity.format === 'json' || activity.format === 'curl' ? activity.format : 'yaml';
    return {
      id: `server-${activity.id}`,
      happenedAt: formatDate(activity.gmtCreate || Date.now(), 'yyyy-MM-dd HH:mm:ss', 'en-US'),
      status: (activity.status as DefinitionImportActivityStatus) || 'success',
      format,
      summary: activity.summary,
      detail: this.trimText(activity.detail),
      entityId: activity.entityId
    };
  }

  private toServerWorkspaceActivity(activity: DefinitionImportActivity): DefinitionImportActivity {
    return {
      ...activity,
      happenedAt: this.normalizeLifecycleTimestamp(activity.happenedAt) || formatDate(Date.now(), 'yyyy-MM-dd HH:mm:ss', 'en-US'),
      creator: this.trimText(activity.creator)
    };
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

  private recordImportActivity(params: {
    id?: string;
    status: DefinitionImportActivityStatus;
    format: EntityDefinitionFormat;
    summary: string;
    detail?: string;
    entityId?: number;
    entityName?: string;
  }): void {
    const activity: DefinitionImportActivity = {
      id: params.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      happenedAt: new Date().toISOString(),
      status: params.status,
      format: params.format,
      summary: params.summary,
      detail: this.trimText(params.detail),
      entityId: params.entityId,
      entityName: this.trimText(params.entityName)
    };
    this.importActivities = [activity, ...this.importActivities.filter(item => item.id !== activity.id)].slice(0, 8);
    this.persistImportActivities();
    this.entitySvc.saveDefinitionWorkspaceActivity(this.toPersistedWorkspaceActivity(activity)).subscribe({
      next: message => {
        if (message.code === 0 && message.data != null) {
          const persisted = this.toServerWorkspaceActivity(message.data);
          this.serverWorkspaceActivities = [persisted, ...this.serverWorkspaceActivities.filter(item => item.id !== persisted.id)].slice(0, 8);
          this.cdr.markForCheck();
        }
      }
    });
  }

  private scheduleDefinitionGovernanceHookSync(): void {
    if (this.definitionGovernanceHookSyncTimer != null) {
      clearTimeout(this.definitionGovernanceHookSyncTimer);
    }
    this.definitionGovernanceHookSyncTimer = setTimeout(() => {
      this.definitionGovernanceHookSyncTimer = undefined;
      this.syncDefinitionGovernanceHookActivity();
    }, 320);
  }

  private syncDefinitionGovernanceHookActivity(): void {
    const cards = this.definitionGovernanceHookCards;
    if (cards.length === 0) {
      return;
    }
    const signature = this.buildGovernanceHookSignature(
      cards,
      this.entityId == null ? undefined : String(this.entityId),
      this.seedActivityId,
      this.importFormat,
      this.governancePresetSeed?.id,
      this.draftSourceType
    );
    if (signature === this.lastGovernanceHookActivitySignature) {
      return;
    }
    this.lastGovernanceHookActivitySignature = signature;
    this.recordImportActivity({
      id: this.buildGovernanceHookActivityId('definition', signature),
      status: this.areGovernanceHooksReady(cards) ? 'success' : 'warning',
      format: this.importFormat,
      summary: this.translateOrFallback('entity.definition.workspace.hooks.activity.summary', '处理建议已更新'),
      detail: this.buildGovernanceHookDetail(cards)
    });
  }

  private toPersistedWorkspaceActivity(activity: DefinitionImportActivity): DefinitionImportActivity {
    const normalized = this.normalizeLifecycleTimestamp(activity.happenedAt);
    return {
      ...activity,
      happenedAt: normalized == null ? new Date().toISOString().slice(0, 19) : normalized.slice(0, 19)
    };
  }

  private sortServerActivities(activities: EntityDefinitionActivity[]): EntityDefinitionActivity[] {
    return [...activities].sort((left, right) => {
      const leftValue = new Date(left.gmtCreate || 0).getTime();
      const rightValue = new Date(right.gmtCreate || 0).getTime();
      return rightValue - leftValue;
    });
  }

  private trimText(value?: string | null): string | undefined {
    if (value == null) {
      return undefined;
    }
    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
  }

  private isValidUrl(value: string): boolean {
    try {
      const parsed = new URL(value);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
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

  private getGovernancePresetConflictFields(
    entity: Entity,
    preset: EntityDiscoveryGovernancePreset
  ): GovernanceConflictField[] {
    const fields: GovernanceConflictField[] = [];
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

  private getWorkspaceTemplateSummaryForSave(format: Exclude<EntityDefinitionFormat, 'curl'>): string {
    const sourceLabel = this.getTemplateSourceLabel(this.mapDraftSourceToTemplateSource());
    if (this.importPreviewRows.length > 1) {
      return `${format.toUpperCase()} · ${sourceLabel} · ${this.translateOrFallback('entity.definition.workspace.template.bundle', '定义包')} · ${this.importPreviewRows.length}`;
    }
    if (this.importPreviewRows.length === 1) {
      return `${format.toUpperCase()} · ${sourceLabel} · ${this.importPreviewRows[0].kindLabel}`;
    }
    return `${format.toUpperCase()} · ${sourceLabel} · ${this.translateOrFallback('entity.definition.workspace.template.custom', '自定义模板')}`;
  }

  private getTemplateSourceLabel(source?: DefinitionWorkspaceTemplateSource): string {
    switch (source) {
      case 'preset':
        return this.translateOrFallback('entity.definition.workspace.source.preset', '预置模板');
      case 'starter':
        return this.translateOrFallback('entity.definition.workspace.source.starter', 'Starter');
      case 'seed':
        return this.translateOrFallback('entity.definition.workspace.source.seed', '发现草稿');
      case 'manual':
        return this.translateOrFallback('entity.definition.workspace.source.manual', '手工草稿');
      default:
        return this.translateOrFallback('entity.definition.workspace.source.template', '共享模板');
    }
  }

  private loadWorkspaceTemplates(): void {
    this.entitySvc.getDefinitionWorkspaceTemplates(8).subscribe({
      next: message => {
        if (message.code !== 0) {
          this.workspaceTemplates = readDefinitionWorkspaceTemplates(8);
          this.workspaceTemplateRegistrySource = this.workspaceTemplates.length > 0 ? 'local' : 'empty';
          this.cdr.markForCheck();
          return;
        }
        const serverTemplates = (message.data || []).slice(0, 8).map(template => ({
          ...template,
          updatedAt: this.normalizeLifecycleTimestamp(template.updatedAt) || new Date().toISOString()
        }));
        this.workspaceTemplates = serverTemplates.length > 0 ? serverTemplates : readDefinitionWorkspaceTemplates(8);
        this.workspaceTemplateRegistrySource = serverTemplates.length > 0 ? 'shared' : this.workspaceTemplates.length > 0 ? 'local' : 'empty';
        writeDefinitionWorkspaceTemplates(this.workspaceTemplates, 8);
        if (!this.workspaceTemplatesMigrated) {
          this.workspaceTemplatesMigrated = true;
          this.syncLocalWorkspaceTemplates(serverTemplates);
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.workspaceTemplates = readDefinitionWorkspaceTemplates(8);
        this.workspaceTemplateRegistrySource = this.workspaceTemplates.length > 0 ? 'local' : 'empty';
        this.cdr.markForCheck();
      }
    });
  }

  private syncLocalWorkspaceTemplates(serverTemplates: DefinitionWorkspaceTemplate[]): void {
    const localTemplates = readDefinitionWorkspaceTemplates(8);
    const missing = localTemplates.filter(
      localTemplate =>
        !serverTemplates.some(
          serverTemplate => serverTemplate.id === localTemplate.id || serverTemplate.name === localTemplate.name
        )
    );
    if (missing.length === 0) {
      return;
    }
    forkJoin(
      missing.map(template =>
        this.entitySvc.saveDefinitionWorkspaceTemplate(template).pipe(catchError(() => of(undefined)))
      )
    ).subscribe(() => {
      this.loadWorkspaceTemplates();
    });
  }

  private persistWorkspaceTemplate(
    template: DefinitionWorkspaceTemplate,
    registrySource: 'shared' | 'local' = this.workspaceTemplateRegistrySource === 'empty' ? 'local' : this.workspaceTemplateRegistrySource
  ): void {
    const persisted: DefinitionWorkspaceTemplate = {
      ...template,
      updatedAt: this.normalizeLifecycleTimestamp(template.updatedAt) || new Date().toISOString()
    };
    const next = [persisted, ...this.workspaceTemplates.filter(item => item.id !== persisted.id && item.name !== persisted.name)]
      .sort((left, right) => this.compareTemplateTimestamps(left.updatedAt, right.updatedAt))
      .slice(0, 8);
    this.workspaceTemplates = next;
    this.workspaceTemplateRegistrySource = next.length === 0 ? 'empty' : registrySource;
    writeDefinitionWorkspaceTemplates(next, 8);
    this.templateNameDraft = '';
    this.notifySvc.success(
      this.translateOrFallback('entity.definition.import.title', '导入实体定义'),
      this.translateOrFallback('entity.definition.workspace.template.saved', '模板已保存，可在下次起草时直接复用。')
    );
    this.cdr.markForCheck();
  }

  private applyWorkspaceTemplateDelete(templateId: string, registrySource?: 'shared' | 'local'): void {
    const next = this.workspaceTemplates.filter(item => item.id !== templateId);
    this.workspaceTemplates = next;
    this.workspaceTemplateRegistrySource =
      next.length === 0 ? 'empty' : registrySource || (this.workspaceTemplateRegistrySource === 'shared' ? 'shared' : 'local');
    writeDefinitionWorkspaceTemplates(next, 8);
    this.cdr.markForCheck();
  }

  private compareTemplateTimestamps(left?: string | number | null, right?: string | number | null): number {
    const leftValue = new Date(this.normalizeLifecycleTimestamp(left) || 0).getTime();
    const rightValue = new Date(this.normalizeLifecycleTimestamp(right) || 0).getTime();
    return rightValue - leftValue;
  }

  private mapDraftSourceToTemplateSource(): DefinitionWorkspaceTemplateSource {
    switch (this.draftSourceType) {
      case 'preset':
        return 'preset';
      case 'starter':
        return 'starter';
      case 'seed':
        return 'seed';
      case 'manual':
        return 'manual';
      default:
        return 'saved';
    }
  }

  private setDraftContent(content: string, sourceType: DefinitionDraftSource, sourceName?: string): void {
    this.suppressDraftSourceTracking = true;
    this.importDraft = content;
    this.draftSourceType = sourceType;
    this.draftSourceName = this.trimText(sourceName);
    this.suppressDraftSourceTracking = false;
  }

  private applyImportGovernanceOverridesToDto(dto: EntityDto): EntityDto {
    const entity = dto.entity;
    const owner = this.trimText(this.importOwnerDraft);
    const system = this.trimText(this.importSystemDraft || undefined);
    const runbook = this.validImportRunbookDraft;
    if (entity != null) {
      if (!this.trimText(entity.owner) && owner) {
        entity.owner = owner;
      }
      if (!this.trimText(entity.system) && system) {
        entity.system = system;
      }
      if (!this.trimText(entity.runbook) && runbook) {
        entity.runbook = runbook;
      }
    }
    return dto;
  }

  private buildImportGovernanceActivityDetail(createdCount?: number, attemptedCount?: number): string {
    const parts = [
      createdCount != null && attemptedCount != null && attemptedCount !== createdCount
        ? `${this.translateOrFallback('entity.definition.import.activity.ready-only', '仅导入就绪项')} ${createdCount}/${attemptedCount}`
        : undefined,
      this.trimText(this.importOwnerDraft)
        ? `${this.translateOrFallback('entity.field.owner', '负责人')} ${this.importOwnerDraft.trim()}`
        : undefined,
      this.trimText(this.importSystemDraft || undefined)
        ? `${this.translateOrFallback('entity.field.system', '所属系统')} ${this.importSystemDraft!.trim()}`
        : undefined,
      this.validImportRunbookDraft
        ? `${this.translateOrFallback('entity.field.runbook', '处置手册')} ${this.validImportRunbookDraft}`
        : undefined
    ].filter((value): value is string => value != null);
    return parts.length > 0
      ? parts.join(' · ')
      : `${this.translateOrFallback('entity.definition.import.summary.ready', '可直接导入')} ${this.importReadyCount} · ${this.translateOrFallback('entity.definition.import.summary.attention', '建议补齐')} ${this.importNeedsAttentionCount}`;
  }

  private cloneEntityDto(dto: EntityDto): EntityDto {
    return JSON.parse(JSON.stringify(dto)) as EntityDto;
  }
}
