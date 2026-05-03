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
import { NgForm } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { I18NService } from '@core';
import { ALAIN_I18N_TOKEN } from '@delon/theme';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import {
  Entity,
  EntityApiInterface,
  EntityCatalogContact,
  EntityCatalogLink,
  EntityHertzBeatCodeLocation,
  EntityHertzBeatConfig,
  EntityHertzBeatSavedQuery,
  EntityOwnerRef
} from '../../../pojo/Entity';
import { EntityCatalogSuggestions } from '../../../pojo/EntityCatalogSuggestions';
import { EntityDefinitionRequest } from '../../../pojo/EntityDefinition';
import { EntityDto } from '../../../pojo/EntityDetail';
import { EntityIdentity } from '../../../pojo/EntityIdentity';
import { EntityMonitorBind } from '../../../pojo/EntityMonitorBind';
import { EntityMonitorBindingCandidate } from '../../../pojo/EntityMonitorBindingCandidate';
import { EntityRelation } from '../../../pojo/EntityRelation';
import { EntitySummary } from '../../../pojo/EntitySummary';
import { EntityDiscoveryGovernancePreset } from '../../../pojo/EntityDiscoveryGovernance';
import { Message } from '../../../pojo/Message';
import { Monitor } from '../../../pojo/Monitor';
import { EntityService } from '../../../service/entity.service';
import { MonitorService } from '../../../service/monitor.service';
import { WorkspaceShellTab } from '../../../shared/components/workspace-shell/workspace-shell.component';
import { PlatformDrawerFactItem } from '../../../shared/components/platform-drawer-facts/platform-drawer-facts.component';
import { normalizeDefinitionRequest } from '../entity-definition-request.util';
import { readDefinitionWorkspaceResumeState } from '../entity-definition-resume.util';
import { renderDefinitionPreviewHtml } from '../entity-definition-preview.util';
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
  buildGovernancePresetQueryParams,
  isGovernancePresetQueryKey,
  readGovernancePresetFromQuery
} from '../entity-discovery-preset.util';

interface KeyValueDraft {
  key: string;
  value: string;
}

interface LinkDraft {
  name: string;
  type: string;
  provider: string;
  url: string;
}

interface ContactDraft {
  name: string;
  type: string;
  value: string;
}

interface OwnerDraft {
  name: string;
  type: string;
}

interface SavedQueryDraft {
  name: string;
  query: string;
}

interface CodeLocationDraft {
  repositoryURL: string;
  paths: string;
}

interface RelationQuickTemplate {
  value: string;
  icon: string;
  title: string;
  description: string;
}

type DraftListField =
  | 'componentOfDraft'
  | 'componentsDraft'
  | 'implementedByDraft'
  | 'languagesDraft'
  | 'catalogTagsDraft'
  | 'performanceTagsDraft'
  | 'pipelineFingerprintsDraft';

interface TypeCard {
  value: string;
  icon: string;
  title: string;
  description: string;
}

interface EntrySourceOption {
  value: 'manual' | 'telemetry' | 'definition';
  icon: string;
  title: string;
  description: string;
}

interface CatalogRailItem {
  value: string;
  icon: string;
}

interface TelemetryDiscoveryResult {
  monitor: Monitor;
  inferredType: string;
  inferredName: string;
  inferredDisplayName?: string;
  inferredNamespace?: string;
  inferredEnvironment?: string;
  inferredOwner?: string;
  inferredRunbook?: string;
  inferredLabels: KeyValueDraft[];
  identityMatches: Array<{ key: string; value: string }>;
  candidates: EntityMonitorBindingCandidate[];
}

type TelemetryDiscoveryScope = 'all' | 'matched' | 'new' | 'resolved';
type GovernanceConflictField = 'owner' | 'system' | 'environment' | 'source' | 'status';

type DefinitionPreviewFormat = 'yaml' | 'json' | 'curl';
type DefinitionImportFormat = 'yaml' | 'json' | 'curl';
type EditorSurfaceMode = 'editor' | 'yaml' | 'json';
type EditorStage = 'basic' | 'ownership' | 'evidence' | 'relations';

@Component({
  standalone: false,  selector: 'app-entity-editor',
  templateUrl: './entity-editor.component.html',
  styleUrls: ['./entity-editor.component.less']
})
export class EntityEditorComponent implements OnInit {
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

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private entitySvc: EntityService,
    private monitorSvc: MonitorService,
    private notifySvc: NzNotificationService,
    @Inject(ALAIN_I18N_TOKEN) private i18nSvc: I18NService
  ) {}

  readonly helpLink = 'https://hertzbeat.apache.org/docs/help/guide';
  readonly typeOptions: string[] = ['system', 'service', 'host', 'database', 'queue', 'middleware', 'device', 'api', 'endpoint', 'k8s_workload'];
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
  readonly criticalityOptions: string[] = ['low', 'medium', 'high', 'critical'];
  readonly lifecycleOptions: string[] = ['production', 'staging', 'development', 'experimental', 'deprecated'];
  readonly tierOptions: string[] = ['tier0', 'tier1', 'tier2', 'tier3'];
  readonly sourceOptions: string[] = ['manual', 'rule', 'otel_resource', 'derived'];
  readonly identityTypeOptions: string[] = ['manual', 'otel_resource', 'monitor', 'rule'];
  readonly bindTypeOptions: string[] = ['manual', 'suggested'];
  readonly bindSourceOptions: string[] = ['manual', 'rule', 'otel_resource'];
  readonly bindStatusOptions: string[] = ['active', 'suggested'];
  readonly relationTypeOptions: string[] = ['depends_on', 'calls', 'connects_to', 'runs_on', 'backed_by'];
  readonly relationSourceOptions: string[] = ['manual', 'discovery', 'trace', 'network', 'rule'];
  readonly relationStatusOptions: string[] = ['confirmed', 'suggested'];
  readonly identityPresetKeys: string[] = ENTITY_IDENTITY_PRESET_KEYS;
  readonly typeCards: TypeCard[] = [
    {
      value: 'system',
      icon: 'apartment',
      title: 'System',
      description: 'Top-level software domain that groups related services, datastores, and APIs.'
    },
    {
      value: 'service',
      icon: 'deployment-unit',
      title: 'Service',
      description: 'Application or API workload with owners, alerts, and dependencies.'
    },
    { value: 'host', icon: 'desktop', title: 'Host', description: 'Physical or virtual machine that multiple monitors can roll up into.' },
    {
      value: 'database',
      icon: 'database',
      title: 'Database',
      description: 'Storage engine that needs ownership, runbook, and incident context.'
    },
    {
      value: 'queue',
      icon: 'unordered-list',
      title: 'Queue',
      description: 'Messaging destination that should expose owner, delivery context, and incident links.'
    },
    {
      value: 'middleware',
      icon: 'cluster',
      title: 'Middleware',
      description: 'Cache, MQ, registry, or platform dependency shared across services.'
    },
    {
      value: 'api',
      icon: 'branches',
      title: 'API',
      description: 'Catalog API contract with ownedBy, implementedBy, interface, and system context.'
    },
    {
      value: 'endpoint',
      icon: 'global',
      title: 'Endpoint',
      description: 'External URL, domain, or probe target that should surface its availability evidence.'
    },
    {
      value: 'device',
      icon: 'api',
      title: 'Device',
      description: 'Network or hardware asset that should have one operational owner and status.'
    },
    {
      value: 'k8s_workload',
      icon: 'appstore',
      title: 'K8s Workload',
      description: 'Deployment or workload tracked through namespace, workload, and environment.'
    }
  ];
  readonly entrySourceOptions: EntrySourceOption[] = [
    {
      value: 'manual',
      icon: 'edit',
      title: 'Manual Entry',
      description: 'Create the entity in the UI first, then fill in ownership, evidence, and relationships.'
    },
    {
      value: 'telemetry',
      icon: 'apartment',
      title: 'Telemetry Discovery',
      description: 'Start from monitors and OpenTelemetry resource attributes, then backfill the entity record.'
    },
    {
      value: 'definition',
      icon: 'code',
      title: 'Definition Preview',
      description: 'Enter the minimum metadata and generate a definition preview for API or GitOps workflows.'
    }
  ];
  readonly catalogLabelPresets: string[] = ['team', 'system', 'tier', 'lifecycle', 'region', 'cluster'];
  readonly linkTypeOptions: string[] = ['dashboard', 'repository', 'documentation', 'api', 'oncall', 'link'];
  readonly contactTypeOptions: string[] = ['team', 'slack', 'email', 'oncall', 'webhook', 'contact'];
  readonly ownerTypeOptions: string[] = ['team', 'group', 'service', 'user', 'email'];
  readonly relationQuickTemplates: RelationQuickTemplate[] = [
    {
      value: 'depends_on',
      icon: 'deployment-unit',
      title: 'Depends on',
      description: 'Use when this entity relies on another component to stay healthy.'
    },
    {
      value: 'calls',
      icon: 'branches',
      title: 'Calls',
      description: 'Use for request flow dependencies such as upstream APIs or services.'
    },
    {
      value: 'connects_to',
      icon: 'api',
      title: 'Connects to',
      description: 'Use for network, broker, or endpoint connectivity.'
    },
    {
      value: 'runs_on',
      icon: 'desktop',
      title: 'Runs on',
      description: 'Use when the current entity is deployed on a host or platform.'
    },
    {
      value: 'backed_by',
      icon: 'database',
      title: 'Backed by',
      description: 'Use for stores, queues, and persistence dependencies.'
    }
  ];

  loading = true;
  saving = false;
  isEditMode = false;
  entityId?: number;
  teamCount = 0;
  catalogTotalCount = 0;
  catalogGroupCounts: Record<string, number> = {};
  entrySource: EntrySourceOption['value'] = 'manual';
  editorSurfaceMode: EditorSurfaceMode = 'editor';
  activeEditorStage: EditorStage = 'basic';
  activeTabIndex = 0;
  previewRailCollapsed = false;
  definitionPreviewDrawerVisible = false;
  showAdvancedDetails = false;
  definitionPreviewFormat: DefinitionPreviewFormat = 'yaml';
  definitionImportFormat: DefinitionImportFormat = 'yaml';
  definitionImportDraft = '';
  definitionImportError?: string;
  definitionBundleEntityCount = 0;
  definitionSyncing = false;
  moduleName = 'New Entity';
  helpMessageContent =
    'Entity editor follows a catalog-first workflow: choose a source, fill the minimum metadata, and keep a definition preview in sync.';
  catalogSuggestions = new EntityCatalogSuggestions();
  listQueryParams: Record<string, string | number | null> = {};
  entityDto: EntityDto = this.createEmptyEntityDto();
  labelDrafts: KeyValueDraft[] = [];
  linkDrafts: LinkDraft[] = [];
  contactDrafts: ContactDraft[] = [];
  catalogTagsDraft = '';
  codeLocationDrafts: CodeLocationDraft[] = [];
  eventQueryDrafts: SavedQueryDraft[] = [];
  logQueryDrafts: SavedQueryDraft[] = [];
  componentOfDraft = '';
  componentOfInput = '';
  componentsDraft = '';
  componentsInput = '';
  implementedByDraft = '';
  implementedByInput = '';
  apiInterfaceDefinitionDraft = '';
  apiInterfaceFileRef = '';
  languagesDraft = '';
  languagesInput = '';
  catalogTagsInput = '';
  performanceTagsInput = '';
  pipelineFingerprintsInput = '';
  performanceTagsDraft = '';
  pipelineFingerprintsDraft = '';
  integrationsDraft = '';
  extensionsDraft = '';
  monitorSearch = '';
  monitorSearchLoading = false;
  monitorSearchResults: Monitor[] = [];
  monitorPreviewMap: Record<number, Monitor> = {};
  telemetryDiscoveryLoading = false;
  telemetryDiscoveryResults: TelemetryDiscoveryResult[] = [];
  telemetryDiscoveryScope: TelemetryDiscoveryScope = 'all';
  telemetrySelectedMonitorId?: number;
  manualMonitorId = '';
  manualMonitorIdFeedback?: string;
  relationSearch = '';
  relationSearchLoading = false;
  relationSearchResults: EntitySummary[] = [];
  relationTargetMap: Record<number, Entity> = {};
  relationQuickTemplate = 'depends_on';
  manualRelationTargetId = '';
  manualRelationTargetRef = '';
  manualRelationTargetIdFeedback?: string;
  manualRelationTargetRefFeedback?: string;
  governancePresetSeed?: EntityDiscoveryGovernancePreset;
  definitionResumeToken?: string;
  definitionResumeHandledRowKey?: string;
  private pendingFocusSectionId?: string;
  private appliedSeedEntityDtoSignature?: string;

  ngOnInit(): void {
    this.loadCatalogSuggestions();
    this.route.paramMap.subscribe(paramMap => {
      this.listQueryParams = this.extractListQueryParams(this.route.snapshot.queryParams);
      const entityIdParam = paramMap.get('entityId');
      const parsedEntityId = entityIdParam == null ? NaN : Number(entityIdParam);
      this.entityId = Number.isNaN(parsedEntityId) ? undefined : parsedEntityId;
      this.isEditMode = this.entityId != undefined;
      this.applyDefinitionRouteState();
      this.moduleName = this.translateOrFallback(
        this.isEditMode ? 'entity.edit' : 'entity.new',
        this.isEditMode ? 'Edit Entity' : 'New Entity'
      );
      this.helpMessageContent = this.translateOrFallback(
        this.isEditMode ? 'entity.edit.help' : 'entity.new.help',
        'Entity editor follows a catalog-first workflow: choose a source, fill the minimum metadata, and keep a definition preview in sync.'
      );
      if (this.isEditMode) {
        if (this.editorSurfaceMode === 'editor') {
          this.entrySource = 'manual';
        }
        this.loadEntity(this.entityId!);
      } else {
        this.resetForm();
        this.applyDefinitionRouteState();
        this.loading = false;
        if (this.editorSurfaceMode !== 'editor') {
          this.syncDefinitionDraftFromSource(this.editorSurfaceMode === 'json' ? 'json' : 'yaml', true);
        }
        this.applyTelemetryMonitorRouteState();
        this.applyRequestedFocus();
        this.recordGovernancePresetEditorActivity();
      }
    });
  }

  get entity(): Entity {
    return this.entityDto.entity;
  }

  get workspaceTabs(): WorkspaceShellTab[] {
    const tabsEnabled = this.isEditMode && this.entityId != undefined;
    return [
      { key: 'entity', label: this.translateOrFallback('entity.detail', '实体工作台'), active: true },
      { key: 'monitors', label: this.translateOrFallback('menu.monitor.center', '监控工作台'), active: false, disabled: !tabsEnabled },
      { key: 'logs', label: this.translateOrFallback('log.manage.title', '日志工作台'), active: false, disabled: !tabsEnabled },
      { key: 'traces', label: this.translateOrFallback('trace.center.detail.title', '链路工作台'), active: false, disabled: !tabsEnabled }
    ];
  }

  onWorkspaceTabSelect(key: string): void {
    if (!this.isEditMode || this.entityId == undefined) {
      return;
    }
    switch (key) {
      case 'entity':
        this.router.navigate(['/entities', this.entityId], { queryParams: this.listQueryParams });
        return;
      case 'monitors':
        this.router.navigate(['/monitors'], { queryParams: this.getMonitorCenterQueryParams() });
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

  get identities(): EntityIdentity[] {
    return this.entityDto.identities || [];
  }

  get monitorBinds(): EntityMonitorBind[] {
    return this.entityDto.monitorBinds || [];
  }

  get relations(): EntityRelation[] {
    return this.entityDto.relations || [];
  }

  get completionPercent(): number {
    const checklist = this.setupChecklist;
    const completed = checklist.filter(item => item.done).length;
    return Math.round((completed / checklist.length) * 100);
  }

  get setupChecklist(): Array<{ title: string; description: string; done: boolean; tabIndex: number; sectionId: string }> {
    return [
      {
        title: this.translateOrFallback('entity.guide.profile', 'Profile'),
        description: this.translateOrFallback('entity.guide.profile.desc', 'Pick a type and give the entity a stable name.'),
        done: this.hasProfileReady(),
        tabIndex: 0,
        sectionId: 'section-basic'
      },
      {
        title: this.translateOrFallback('entity.guide.evidence', 'Evidence'),
        description: this.translateOrFallback(
          'entity.guide.evidence.desc',
          'Connect monitors and identities so alerts and logs roll up here.'
        ),
        done: this.hasEvidenceReady(),
        tabIndex: 1,
        sectionId: 'section-identities'
      },
      {
        title: this.translateOrFallback('entity.guide.owner', 'Ownership'),
        description: this.translateOrFallback('entity.guide.owner.desc', 'Attach an owner or runbook so responders know what to do next.'),
        done: this.hasOwnerReady(),
        tabIndex: 0,
        sectionId: 'section-ownership'
      },
      {
        title: this.translateOrFallback('entity.guide.context', 'Context'),
        description: this.translateOrFallback(
          'entity.guide.context.desc',
          'Add topology, notes, and metadata that make incidents easier to triage.'
        ),
        done: this.hasContextReady(),
        tabIndex: 2,
        sectionId: 'section-relations'
      }
    ];
  }

  get editorStages(): Array<{ value: EditorStage; title: string; description: string; sectionId: string; done: boolean }> {
    return [
      {
        value: 'basic',
        title: this.translateOrFallback('entity.editor.stage.basic', '基本信息'),
        description: this.translateOrFallback('entity.editor.stage.basic.desc', '先确认类型、名称和核心元数据。'),
        sectionId: this.entrySource === 'telemetry' ? 'section-discovery' : 'section-basic',
        done: this.hasProfileReady()
      },
      {
        value: 'ownership',
        title: this.translateOrFallback('entity.editor.stage.ownership', '归属与处置'),
        description: this.translateOrFallback('entity.editor.stage.ownership.desc', '明确负责人、系统归属和 runbook。'),
        sectionId: 'section-ownership',
        done: this.hasOwnerReady()
      },
      {
        value: 'evidence',
        title: this.translateOrFallback('entity.editor.stage.evidence', '证据关联'),
        description: this.translateOrFallback('entity.editor.stage.evidence.desc', '补齐标识与监控，让实时证据能汇聚到实体。'),
        sectionId: 'section-identities',
        done: this.hasEvidenceReady()
      },
      {
        value: 'relations',
        title: this.translateOrFallback('entity.editor.stage.relations', '关系与扩展'),
        description: this.translateOrFallback('entity.editor.stage.relations.desc', '补依赖、标签、代码位置和扩展定义。'),
        sectionId: 'section-relations',
        done: this.hasContextReady()
      }
    ];
  }

  get previewStatusLabel(): string {
    if (this.completionPercent >= 100) {
      return this.translateOrFallback('entity.preview.ready', 'Ready');
    }
    if (this.hasEvidenceReady()) {
      return this.translateOrFallback('entity.preview.enriched', 'Enriched');
    }
    return this.translateOrFallback('entity.preview.draft', 'Draft');
  }

  get previewStatusColor(): string {
    if (this.completionPercent >= 100) {
      return '#389e0d';
    }
    if (this.hasEvidenceReady()) {
      return '#1677ff';
    }
    return '#d48806';
  }

  get labelCount(): number {
    return this.labelDrafts.filter(item => this.trimText(item.key) != null && this.trimText(item.value) != null).length;
  }

  get validLabels(): KeyValueDraft[] {
    return this.labelDrafts.filter(item => this.trimText(item.key) != null && this.trimText(item.value) != null);
  }

  get validCatalogTags(): string[] {
    return this.buildStringList(this.catalogTagsDraft, this.entity.tags);
  }

  get validPerformanceTags(): string[] {
    return this.buildStringList(this.performanceTagsDraft);
  }

  get validPipelineFingerprints(): string[] {
    return this.buildStringList(this.pipelineFingerprintsDraft);
  }

  get validLinks(): LinkDraft[] {
    return this.linkDrafts.filter(item => this.trimText(item.url) != null);
  }

  get validContacts(): ContactDraft[] {
    return this.contactDrafts.filter(item => this.trimText(item.value) != null);
  }

  get structuredComponentOfValues(): string[] {
    return this.buildStringList(this.componentOfDraft, this.entity.componentOf);
  }

  get structuredComponentsValues(): string[] {
    return this.buildStringList(this.componentsDraft, this.entity.components);
  }

  get structuredImplementedByValues(): string[] {
    return this.buildStringList(this.implementedByDraft, this.entity.implementedBy);
  }

  get structuredLanguageValues(): string[] {
    return this.buildStringList(this.languagesDraft, this.entity.languages);
  }

  get runbookValidationMessage(): string | undefined {
    return this.getUrlValidationMessage(
      this.entity.runbook,
      this.translateOrFallback('entity.field.runbook', 'Runbook')
    );
  }

  get hasStructuredValidationErrors(): boolean {
    return this.getStructuredValidationError() != null;
  }

  get selectedEntrySource(): EntrySourceOption {
    return this.entrySourceOptions.find(option => option.value === this.entrySource) || this.entrySourceOptions[0];
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

  get governancePresetOriginLabel(): string | undefined {
    const preset = this.governancePresetSeed;
    if (preset == null) {
      return undefined;
    }
    if (preset.id === 'workspace-scope') {
      return this.translateOrFallback('entity.editor.governance-preset.origin.scope', '当前目录治理范围');
    }
    return this.translateOrFallback('entity.editor.governance-preset.origin.shared', '共享治理预设');
  }

  get governancePresetConflictLabels(): string[] {
    return this.getGovernancePresetConflictFields(this.entity, this.governancePresetSeed).map(field => this.getGovernanceFieldLabel(field));
  }

  get hasGovernancePresetConflictSummary(): boolean {
    return this.governancePresetConflictLabels.length > 0;
  }

  get governancePresetConflictCopy(): string | undefined {
    if (!this.hasGovernancePresetConflictSummary) {
      return undefined;
    }
    return `${this.translateOrFallback('entity.editor.governance-preset.conflict.copy', '当前实体与共享治理预设仍有偏差，建议先处理这些字段：')} ${this.governancePresetConflictLabels.join('、')}`;
  }

  get entrySourceSummaryTitle(): string {
    switch (this.entrySource) {
      case 'telemetry':
        return this.translateOrFallback('entity.entry-source.summary.telemetry.title', 'Start from live telemetry');
      case 'definition':
        return this.translateOrFallback('entity.entry-source.summary.definition.title', 'Generate a reusable definition');
      default:
        return this.translateOrFallback('entity.entry-source.summary.manual.title', 'Create the entity record first');
    }
  }

  get entrySourceSummaryDescription(): string {
    switch (this.entrySource) {
      case 'telemetry':
        return this.translateOrFallback(
          'entity.entry-source.summary.telemetry.desc',
          'Start from monitors and OpenTelemetry resource fields, then complete the owner, runbook, and dependencies.'
        );
      case 'definition':
        return this.translateOrFallback(
          'entity.entry-source.summary.definition.desc',
          'Fill in only the minimum required metadata first. The page keeps a definition draft in sync for API or GitOps workflows.'
        );
      default:
        return this.translateOrFallback(
          'entity.entry-source.summary.manual.desc',
          'Use the UI to create the entity record directly, then gradually complete telemetry, ownership, and dependencies.'
        );
    }
  }

  get activeEditorStageTitle(): string {
    switch (this.activeEditorStage) {
      case 'basic':
        return this.translateOrFallback('entity.editor.basic', '基本信息');
      case 'ownership':
        return this.translateOrFallback('entity.editor.ownership-runbook', '归属与处置');
      case 'evidence':
        return this.translateOrFallback('entity.editor.stage.evidence', '证据关联');
      default:
        return this.translateOrFallback('entity.editor.relations-and-labels', '关系与扩展');
    }
  }

  get activeEditorStageDescription(): string {
    switch (this.activeEditorStage) {
      case 'basic':
        return this.entrySourceSummaryDescription;
      case 'ownership':
        return this.translateOrFallback('entity.editor.ownership.copy', '先明确谁负责、影响等级多高，以及故障时应该从哪里开始处置。');
      case 'evidence':
        return this.translateOrFallback('entity.editor.stage.evidence.desc', '把身份标识和监控证据接上，让目录能接住实时证据。');
      default:
        return this.translateOrFallback('entity.editor.relations.copy', '先补齐关键上下游和目录标签，后续再逐步接入自动发现和拓扑建议。');
    }
  }

  get entrySourceHighlights(): string[] {
    switch (this.entrySource) {
      case 'telemetry':
        return [
          this.translateOrFallback('entity.entry-source.highlight.telemetry.1', 'Search the monitors that belong to this entity.'),
          this.translateOrFallback(
            'entity.entry-source.highlight.telemetry.2',
            'Use recommended OpenTelemetry resource identities whenever possible.'
          ),
          this.translateOrFallback(
            'entity.entry-source.highlight.telemetry.3',
            'After evidence is linked, fill in owner, runbook, and relationships.'
          )
        ];
      case 'definition':
        return [
          this.translateOrFallback('entity.entry-source.highlight.definition.1', 'Keep only the minimum required fields at first.'),
          this.translateOrFallback('entity.entry-source.highlight.definition.2', 'The definition preview updates as you edit the entity.'),
          this.translateOrFallback(
            'entity.entry-source.highlight.definition.3',
            'This workflow is useful when the entity will later be managed by API or GitOps.'
          )
        ];
      default:
        return [
          this.translateOrFallback('entity.entry-source.highlight.manual.1', 'Choose the type and set a stable entity name first.'),
          this.translateOrFallback(
            'entity.entry-source.highlight.manual.2',
            'Ownership and runbook can be recorded immediately in the same form.'
          ),
          this.translateOrFallback(
            'entity.entry-source.highlight.manual.3',
            'Evidence and dependencies can be added incrementally after creation.'
          )
        ];
    }
  }

  get entrySourceActionLabel(): string {
    switch (this.entrySource) {
      case 'telemetry':
        return this.translateOrFallback('entity.entry-source.action.telemetry', 'Go to Evidence');
      case 'definition':
        return this.translateOrFallback('entity.entry-source.action.definition', 'Fill Minimum Fields');
      default:
        return this.translateOrFallback('entity.entry-source.action.manual', 'Fill Basic Info');
    }
  }

  get requiredFieldLabels(): string[] {
    const requiredKeys = ['entity.field.type', 'entity.field.name'];
    if (this.entrySource === 'definition') {
      requiredKeys.push('entity.field.owner');
    }
    if (this.entrySource === 'telemetry') {
      requiredKeys.push('entity.guide.evidence');
    }
    return requiredKeys.map(key => {
      switch (key) {
        case 'entity.field.type':
          return this.translateOrFallback(key, 'Type');
        case 'entity.field.name':
          return this.translateOrFallback(key, 'Name');
        case 'entity.field.owner':
          return this.translateOrFallback(key, 'Owner');
        case 'entity.guide.evidence':
          return this.translateOrFallback(key, 'Evidence');
        default:
          return key;
      }
    });
  }

  get previewRequiredFieldLabels(): string[] {
    return this.requiredFieldLabels.slice(0, 4);
  }

  get previewRequiredOverflowCount(): number {
    return Math.max(this.requiredFieldLabels.length - this.previewRequiredFieldLabels.length, 0);
  }

  get definitionImportPlaceholder(): string {
    switch (this.definitionImportFormat) {
      case 'curl':
        return this.translateOrFallback(
          'entity.definition.import.placeholder.curl',
          'Paste the cURL command generated from the definition preview or your automation workflow.'
        );
      case 'json':
        return this.translateOrFallback(
          'entity.definition.import.placeholder.json',
          'Paste a JSON entity definition. The editor will extract metadata, telemetry, and dependencies.'
        );
      default:
        return this.translateOrFallback(
          'entity.definition.import.placeholder.yaml',
          'Paste a YAML entity definition. The editor will extract metadata, telemetry, and dependencies.'
        );
    }
  }

  get integrationsPlaceholder(): string {
    return this.translateOrFallback(
      'entity.hertzbeat.integrations.placeholder',
      '{\n  "pagerduty": {\n    "serviceURL": "https://www.pagerduty.com/service-directory/Pshopping-cart"\n  }\n}'
    );
  }

  get extensionsPlaceholder(): string {
    return this.translateOrFallback(
      'entity.hertzbeat.extensions.placeholder',
      '{\n  "hertzbeat.apache.org/shopping-cart": {\n    "customField": "customValue"\n  }\n}'
    );
  }

  get telemetryMatchPreview(): Array<{ key: string; value: string }> {
    const entries: Array<{ key: string; value: string }> = [];
    const entityName = this.trimText(this.entity.name);
    const displayName = this.trimText(this.entity.displayName);
    const namespace = this.trimText(this.entity.namespace);
    const environment = this.trimText(this.entity.environment);

    switch (this.entity.type) {
      case 'service':
        if (entityName != null) {
          entries.push({ key: 'service.name', value: entityName });
        }
        if (namespace != null) {
          entries.push({ key: 'service.namespace', value: namespace });
        }
        break;
      case 'host':
        if (entityName != null) {
          entries.push({ key: 'host.name', value: entityName });
        }
        break;
      case 'endpoint':
        if (entityName != null) {
          entries.push({ key: 'endpoint.url', value: entityName });
        }
        break;
      case 'api':
        if (namespace != null) {
          entries.push({ key: 'service.namespace', value: namespace });
        }
        if (entityName != null) {
          entries.push({ key: 'service.name', value: entityName });
        }
        break;
      case 'queue':
        if (entityName != null) {
          entries.push({ key: 'messaging.destination.name', value: entityName });
        }
        break;
      case 'k8s_workload':
        if (namespace != null) {
          entries.push({ key: 'k8s.namespace.name', value: namespace });
        }
        if (entityName != null || displayName != null) {
          entries.push({ key: 'k8s.workload.name', value: entityName || displayName || '' });
        }
        break;
      default:
        if (entityName != null) {
          entries.push({ key: 'service.name', value: entityName });
        }
        break;
    }

    if (environment != null) {
      entries.push({ key: 'deployment.environment.name', value: environment });
    }
    if (displayName != null && displayName !== entityName) {
      entries.push({ key: 'display_name', value: displayName });
    }

    return entries.filter(item => item.value.trim() !== '');
  }

  get telemetryDiscoveryMatchedCount(): number {
    return this.telemetryDiscoveryResults.filter(result => result.candidates.length > 0).length;
  }

  get telemetryDiscoveryResolvedCount(): number {
    return this.telemetryDiscoveryResults.filter(result => this.hasTelemetryResolvedCandidate(result)).length;
  }

  get telemetryDiscoveryNewCount(): number {
    return this.telemetryDiscoveryResults.filter(result => result.candidates.length === 0).length;
  }

  get telemetryDiscoveryIdentityReadyCount(): number {
    return this.telemetryDiscoveryResults.filter(result => result.identityMatches.length > 0).length;
  }

  get visibleTelemetryDiscoveryResults(): TelemetryDiscoveryResult[] {
    switch (this.telemetryDiscoveryScope) {
      case 'resolved':
        return this.telemetryDiscoveryResults.filter(result => this.hasTelemetryResolvedCandidate(result));
      case 'matched':
        return this.telemetryDiscoveryResults.filter(result => result.candidates.length > 0);
      case 'new':
        return this.telemetryDiscoveryResults.filter(result => result.candidates.length === 0);
      default:
        return this.telemetryDiscoveryResults;
    }
  }

  get isSystemEntity(): boolean {
    return this.entity.type === 'system';
  }

  get definitionPreviewObject(): Record<string, unknown> {
    const metadata: Record<string, unknown> = {
      name: this.entity.name || 'new-entity'
    };
    const spec: Record<string, unknown> = {
      source: this.entity.source || 'manual'
    };

    if (this.trimText(this.entity.namespace) != null) {
      metadata.namespace = this.entity.namespace;
    }
    if (this.trimText(this.entity.owner) != null) {
      metadata.owner = this.entity.owner;
    }
    if ((this.entity.additionalOwners || []).length > 0) {
      metadata.additionalOwners = this.buildOwnerRefs();
    }
    if (this.trimText(this.entity.inheritFrom) != null) {
      metadata.inheritFrom = this.entity.inheritFrom;
    }
    if (this.trimText(this.entity.displayName) != null) {
      metadata.displayName = this.entity.displayName;
    }
    if (this.trimText(this.entity.description) != null) {
      metadata.description = this.entity.description;
    }
    const labels = this.buildLabels();
    if (labels != null && Object.keys(labels).length > 0) {
      metadata.labels = labels;
    }
    const tags = this.buildMetadataTags(labels);
    if (tags != null && tags.length > 0) {
      metadata.tags = tags;
    }
    const links = this.buildLinks();
    if (links != null && links.length > 0) {
      metadata.links = links.map(link => ({
        name: link.name,
        type: link.type,
        provider: link.provider,
        url: link.url
      }));
    }
    const contacts = this.buildContacts();
    if (contacts != null && contacts.length > 0) {
      metadata.contacts = contacts.map(contact => ({
        name: contact.name,
        type: contact.type,
        contact: contact.contact || contact.value,
        value: contact.value || contact.contact
      }));
    }
    if (this.trimText(this.entity.environment) != null) {
      spec.environment = this.entity.environment;
    }
    if (this.trimText(this.entity.subtype) != null) {
      spec.type = this.entity.subtype;
    }
    if (this.trimText(this.entity.owner) != null) {
      spec.ownedBy = this.entity.owner;
    }
    if (this.trimText(this.entity.criticality) != null) {
      spec.criticality = this.entity.criticality;
    }
    if (this.trimText(this.entity.runbook) != null) {
      spec.runbook = this.entity.runbook;
    }
    if (this.trimText(this.entity.lifecycle) != null) {
      spec.lifecycle = this.entity.lifecycle;
    }
    if (this.trimText(this.entity.tier) != null) {
      spec.tier = this.entity.tier;
    }
    if (this.trimText(this.entity.system) != null) {
      spec.partOf = this.entity.system;
    }
    const componentOf = this.buildStringList(this.componentOfDraft, this.entity.componentOf);
    if (componentOf.length > 0) {
      spec.componentOf = componentOf;
    }
    const components = this.buildStringList(this.componentsDraft, this.entity.components);
    if (components.length > 0) {
      spec.components = components;
    }
    const implementedBy = this.buildStringList(this.implementedByDraft, this.entity.implementedBy);
    if (implementedBy.length > 0) {
      spec.implementedBy = implementedBy;
    }
    const apiInterface = this.buildApiInterface();
    if (apiInterface != null) {
      spec.interface = apiInterface;
    }
    const languages = this.buildStringList(this.languagesDraft, this.entity.languages);
    if (languages.length > 0) {
      spec.languages = languages;
    }
    if (this.identities.length > 0 || this.monitorBinds.length > 0) {
      spec.telemetry = {};
      if (this.identities.length > 0) {
        Object.assign(spec.telemetry as Record<string, unknown>, {
          identities: this.identities
            .filter(identity => this.trimText(identity.identityKey) != null && this.trimText(identity.identityValue) != null)
            .map(identity => ({
              key: identity.identityKey,
              value: identity.identityValue,
              type: identity.identityType,
              priority: identity.priority,
              primary: !!identity.primaryIdentity
            }))
        });
      }
      if (this.monitorBinds.length > 0) {
        Object.assign(spec.telemetry as Record<string, unknown>, {
          monitors: this.monitorBinds.map(bind => ({
            monitorId: bind.monitorId,
            bindType: bind.bindType,
            bindSource: bind.bindSource,
            status: bind.status,
            score: bind.score,
            matchContext: bind.matchContext
          }))
        });
      }
    }
    if (this.relations.length > 0) {
      spec.dependsOn = this.relations
        .map(relation => this.getRelationReference(relation))
        .filter((value): value is string => value != null);
      spec.relations = this.relations.map(relation => ({
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
      kind: this.toDefinitionKind(this.entity.type) || 'service',
      metadata,
      spec
    };
    const integrations = this.parseJsonDraftObject(this.integrationsDraft);
    if (integrations != null && Object.keys(integrations).length > 0) {
      definition.integrations = integrations;
    }
    const extensions = this.parseJsonDraftObject(this.extensionsDraft);
    if (extensions != null && Object.keys(extensions).length > 0) {
      definition.extensions = extensions;
    }
    const hertzbeat = this.buildHertzBeatConfig();
    if (hertzbeat != null) {
      definition.hertzbeat = hertzbeat;
    }

    return definition;
  }

  get definitionPreview(): string {
    if (this.editorSurfaceMode !== 'editor' && this.definitionImportDraft.trim() !== '') {
      return this.definitionImportDraft;
    }
    if (this.definitionPreviewFormat === 'json') {
      return JSON.stringify(this.definitionPreviewObject, null, 2);
    }
    if (this.definitionPreviewFormat === 'curl') {
      return this.definitionCurlPreview;
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
        value: String(this.monitorBinds.length)
      },
      {
        label: this.i18nSvc.fanyi('entity.editor.relations-and-labels'),
        value: String(this.relations.length + this.validLabels.length + this.validLinks.length + this.validContacts.length)
      }
    ];
  }

  get definitionPreviewToolbarBadges(): string[] {
    return [this.definitionPreviewFormat.toUpperCase()];
  }

  get definitionPreviewSectionTitle(): string {
    return this.translateOrFallback('entity.definition.title', 'Entity Definition Preview');
  }

  get definitionCurlPreview(): string {
    const payload = JSON.stringify(this.buildDefinitionRequest(), null, 2).replace(/'/g, "'\\''");
    return [
      "curl -X POST 'http://127.0.0.1:1157/api/entities/definition'",
      "  -H 'Content-Type: application/json'",
      "  -H 'Authorization: <token>'",
      `  -d '${payload}'`
    ].join(' \\\n');
  }

  openDefinitionSurface(): void {
    this.definitionPreviewDrawerVisible = true;
  }

  closeDefinitionPreviewDrawer(): void {
    this.definitionPreviewDrawerVisible = false;
  }

  get recommendedIdentities(): Array<{ key: string; value: string }> {
    const entries: Array<{ key: string; value: string }> = [];
    const entityName = this.trimText(this.entity.name);
    const namespace = this.trimText(this.entity.namespace);
    const environment = this.trimText(this.entity.environment);
    switch (this.entity.type) {
      case 'service':
        if (namespace != null) {
          entries.push({ key: 'service.namespace', value: namespace });
        }
        if (entityName != null) {
          entries.push({ key: 'service.name', value: entityName });
        }
        break;
      case 'host':
        if (entityName != null) {
          entries.push({ key: 'host.name', value: entityName });
        }
        break;
      case 'endpoint':
        if (entityName != null) {
          entries.push({ key: 'endpoint.url', value: entityName });
        }
        break;
      case 'queue':
        if (entityName != null) {
          entries.push({ key: 'messaging.destination.name', value: entityName });
        }
        break;
      case 'k8s_workload':
        if (namespace != null) {
          entries.push({ key: 'k8s.namespace.name', value: namespace });
        }
        if (entityName != null) {
          entries.push({ key: 'k8s.workload.name', value: entityName });
        }
        break;
      default:
        if (entityName != null) {
          entries.push({ key: 'service.name', value: entityName });
        }
        break;
    }
    if (environment != null) {
      entries.push({ key: 'deployment.environment.name', value: environment });
    }
    return entries.filter((entry, index, all) => all.findIndex(item => item.key === entry.key && item.value === entry.value) === index);
  }

  get ownerSuggestions(): string[] {
    return this.catalogSuggestions.owners.slice(0, 8);
  }

  get systemSuggestions(): string[] {
    return this.catalogSuggestions.systems.slice(0, 8);
  }

  get entityReferenceSuggestions(): string[] {
    const currentEntityRef = this.currentEntityReference;
    return this.catalogSuggestions.entityRefs
      .filter(item => item !== currentEntityRef)
      .slice(0, 12);
  }

  loadEntity(entityId: number): void {
    this.loading = true;
    this.entitySvc.getEntity(entityId).subscribe({
      next: message => {
        this.loading = false;
        if (message.code === 0 && message.data != null) {
          this.entityDto = this.cloneEntityDto(message.data);
          this.applyGovernancePresetSeedValues(true);
          this.syncDraftStateFromEntity();
          this.resolveMonitorBindPreviews();
          this.resolveRelationTargets();
          if (this.editorSurfaceMode !== 'editor') {
            this.syncDefinitionDraftFromSource(this.editorSurfaceMode === 'json' ? 'json' : 'yaml', true);
          }
          this.applyRequestedFocus();
          this.recordGovernancePresetEditorActivity();
          return;
        }
        this.notifySvc.warning(this.translateOrFallback('entity.edit', 'Edit Entity'), message.msg);
        this.backToEntityList();
      },
      error: error => {
        this.loading = false;
        this.notifySvc.error(this.translateOrFallback('entity.edit', 'Edit Entity'), error?.msg || error?.message || 'Load failed');
        this.backToEntityList();
      }
    });
  }

  onSave(form: NgForm): void {
    const useDefinitionFlow = this.entrySource === 'definition' || this.editorSurfaceMode !== 'editor';
    if (!useDefinitionFlow && form.invalid) {
      Object.values(form.controls).forEach(control => {
        control.markAsDirty();
        control.updateValueAndValidity();
      });
      return;
    }
    this.normalizeStructuredDraftStateBeforeSave();
    const validationError = this.getStructuredValidationError();
    if (validationError != null) {
      this.notifySvc.warning(
        this.translateOrFallback(this.isEditMode ? 'entity.edit' : 'entity.new', this.isEditMode ? 'Edit Entity' : 'New Entity'),
        validationError
      );
      return;
    }
    let payload: EntityDto;
    let definitionRequest: EntityDefinitionRequest;
    try {
      payload = this.buildPayload();
      definitionRequest = this.buildDefinitionRequest();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Save failed';
      this.notifySvc.warning(
        this.translateOrFallback(this.isEditMode ? 'entity.edit' : 'entity.new', this.isEditMode ? 'Edit Entity' : 'New Entity'),
        message
      );
      return;
    }
    this.saving = true;
    const request$: Observable<Message<number | number[] | void>> = useDefinitionFlow
      ? this.isEditMode
        ? this.entitySvc.editEntityByDefinition(this.entityId!, definitionRequest)
        : this.entitySvc.newEntityBundleByDefinition(definitionRequest)
      : this.isEditMode
      ? this.entitySvc.editEntity(payload)
      : this.entitySvc.newEntity(payload);
    request$.subscribe({
      next: message => {
        this.saving = false;
        if (message.code === 0) {
          const createdEntityIds = Array.isArray(message.data)
            ? message.data.map(value => Number(value)).filter(value => !Number.isNaN(value) && value > 0)
            : [Number(message.data)].filter(value => !Number.isNaN(value) && value > 0);
          const successMessage =
            !this.isEditMode && createdEntityIds.length > 1
              ? this.translateOrFallback(
                  'entity.definition.bundle.create-success',
                  `Bundle import created ${createdEntityIds.length} entities.`
                )
              : this.translateOrFallback(
                  this.isEditMode ? 'common.notify.edit-success' : 'common.notify.new-success',
                  this.isEditMode ? 'Save success' : 'Create success'
                );
          this.notifySvc.success(
            this.translateOrFallback(this.isEditMode ? 'entity.edit' : 'entity.new', this.isEditMode ? 'Edit Entity' : 'New Entity'),
            successMessage
          );
          if (!this.isEditMode && this.openDefinitionWorkspaceResume(createdEntityIds[0])) {
            return;
          }
          if (this.isEditMode && this.entityId != undefined) {
            const returnUrl = this.buildEditSuccessReturnUrl(payload);
            if (returnUrl != null) {
              this.router.navigateByUrl(returnUrl);
              return;
            }
            this.router.navigate(['/entities', this.entityId], { queryParams: this.listQueryParams });
          } else {
            if (createdEntityIds.length > 0) {
              this.router.navigate(['/entities', createdEntityIds[0]], { queryParams: this.listQueryParams });
            } else {
              this.router.navigate(['/entities'], {
                queryParams: {
                  ...this.listQueryParams,
                  type: payload.entity.type || null,
                  search: payload.entity.name || null
                }
              });
            }
          }
          return;
        }
        this.notifySvc.warning(
          this.translateOrFallback(this.isEditMode ? 'entity.edit' : 'entity.new', this.isEditMode ? 'Edit Entity' : 'New Entity'),
          message.msg
        );
      },
      error: error => {
        this.saving = false;
        this.notifySvc.error(
          this.translateOrFallback(this.isEditMode ? 'entity.edit' : 'entity.new', this.isEditMode ? 'Edit Entity' : 'New Entity'),
          error?.msg || error?.message || 'Save failed'
        );
      }
    });
  }

  onCancel(): void {
    this.backToEntityList();
  }

  onAddLabel(): void {
    this.labelDrafts = [...this.labelDrafts, { key: '', value: '' }];
  }

  onAddLabelPreset(labelKey: string): void {
    if (this.labelDrafts.some(label => label.key === labelKey)) {
      return;
    }
    this.labelDrafts = [...this.labelDrafts, { key: labelKey, value: '' }];
  }

  onRemoveLabel(index: number): void {
    this.labelDrafts = this.labelDrafts.filter((_, currentIndex) => currentIndex !== index);
  }

  onAddAdditionalOwner(): void {
    this.entity.additionalOwners = [...(this.entity.additionalOwners || []), { name: '', type: 'team' }];
  }

  onRemoveAdditionalOwner(index: number): void {
    this.entity.additionalOwners = (this.entity.additionalOwners || []).filter((_, currentIndex) => currentIndex !== index);
  }

  copyPrimaryOwnerToAdditionalOwners(): void {
    const primaryOwner = this.trimText(this.entity.owner);
    if (primaryOwner == null) {
      return;
    }
    if ((this.entity.additionalOwners || []).some(owner => this.trimText(owner.name) === primaryOwner)) {
      return;
    }
    this.entity.additionalOwners = [...(this.entity.additionalOwners || []), { name: primaryOwner, type: 'team' }];
  }

  promoteAdditionalOwner(index: number): void {
    const owner = (this.entity.additionalOwners || [])[index];
    const ownerName = this.trimText(owner?.name);
    if (ownerName == null) {
      return;
    }
    this.entity.owner = ownerName;
    this.onRemoveAdditionalOwner(index);
  }

  onAddLink(type?: string): void {
    const normalizedType = type || 'link';
    this.linkDrafts = [
      ...this.linkDrafts,
      {
        name: this.getStructuredItemTemplateLabel('link', normalizedType),
        type: normalizedType,
        provider: '',
        url: ''
      }
    ];
  }

  openRunbook(): void {
    const runbook = this.trimText(this.entity.runbook);
    if (runbook == null || this.runbookValidationMessage != null) {
      return;
    }
    window.open(runbook, '_blank', 'noopener,noreferrer');
  }

  clearRunbook(): void {
    this.entity.runbook = undefined;
  }

  applyRunbookExample(): void {
    const entityName = this.trimText(this.entity.name) || 'checkout-api';
    this.entity.runbook = `https://wiki.example.com/runbooks/${entityName}`;
  }

  applyOwnerSuggestion(value: string, index?: number): void {
    const normalized = this.trimText(value);
    if (normalized == null) {
      return;
    }
    if (index == undefined) {
      this.entity.owner = normalized;
      return;
    }
    const owners = [...(this.entity.additionalOwners || [])];
    if (owners[index] == null) {
      return;
    }
    owners[index] = { ...owners[index], name: normalized };
    this.entity.additionalOwners = owners;
  }

  applyNamespaceSuggestion(value: string): void {
    this.entity.namespace = this.trimText(value);
  }

  applyEnvironmentSuggestion(value: string): void {
    this.entity.environment = this.trimText(value);
  }

  applySystemSuggestion(value: string): void {
    this.entity.system = this.trimText(value);
  }

  applyInheritFromSuggestion(value: string): void {
    this.entity.inheritFrom = this.trimText(value);
  }

  applyReferenceSuggestion(field: 'componentOfDraft' | 'componentsDraft' | 'implementedByDraft' | 'manualRelationTargetRef', value: string): void {
    const normalized = this.trimText(value);
    if (normalized == null) {
      return;
    }
    this[field] = this.appendDraftValue(this[field], normalized);
  }

  applyLanguageSuggestion(value: string): void {
    const normalized = this.trimText(value);
    if (normalized == null) {
      return;
    }
    this.languagesDraft = this.appendDraftValue(this.languagesDraft, normalized);
  }

  onDraftChipEnter(field: DraftListField, rawValue: string): void {
    const normalized = this.trimText(rawValue);
    if (normalized == null) {
      this.setDraftInputValue(field, '');
      return;
    }
    this[field] = this.appendDraftValue(this[field], normalized);
    this.setDraftInputValue(field, '');
  }

  removeDraftChip(field: DraftListField, value: string): void {
    const nextValues = this.buildStringList(this[field]).filter(item => item !== value);
    this[field] = nextValues.join(', ');
  }

  appendReferenceChip(
    field: Exclude<DraftListField, 'languagesDraft' | 'performanceTagsDraft' | 'pipelineFingerprintsDraft'>,
    value: string
  ): void {
    if (field === 'catalogTagsDraft') {
      this.seedCatalogTagPreset(value);
      return;
    }
    this.applyReferenceSuggestion(field, value);
  }

  appendLanguageChip(value: string): void {
    this.applyLanguageSuggestion(value);
  }

  applyLinkProviderSuggestion(index: number, value: string): void {
    const normalized = this.trimText(value);
    if (normalized == null || this.linkDrafts[index] == null) {
      return;
    }
    const links = [...this.linkDrafts];
    links[index] = { ...links[index], provider: normalized };
    this.linkDrafts = links;
  }

  onRemoveLink(index: number): void {
    this.linkDrafts = this.linkDrafts.filter((_, currentIndex) => currentIndex !== index);
  }

  onAddContact(type?: string): void {
    const normalizedType = type || 'contact';
    this.contactDrafts = [
      ...this.contactDrafts,
      {
        name: this.getStructuredItemTemplateLabel('contact', normalizedType),
        type: normalizedType,
        value: ''
      }
    ];
  }

  onRemoveContact(index: number): void {
    this.contactDrafts = this.contactDrafts.filter((_, currentIndex) => currentIndex !== index);
  }

  onAddCodeLocation(): void {
    this.codeLocationDrafts = [...this.codeLocationDrafts, { repositoryURL: '', paths: '' }];
  }

  onRemoveCodeLocation(index: number): void {
    this.codeLocationDrafts = this.codeLocationDrafts.filter((_, currentIndex) => currentIndex !== index);
  }

  onAddEventQuery(): void {
    this.eventQueryDrafts = [...this.eventQueryDrafts, { name: '', query: '' }];
  }

  onRemoveEventQuery(index: number): void {
    this.eventQueryDrafts = this.eventQueryDrafts.filter((_, currentIndex) => currentIndex !== index);
  }

  onAddLogQuery(): void {
    this.logQueryDrafts = [...this.logQueryDrafts, { name: '', query: '' }];
  }

  onRemoveLogQuery(index: number): void {
    this.logQueryDrafts = this.logQueryDrafts.filter((_, currentIndex) => currentIndex !== index);
  }

  onAddIdentity(presetKey?: string): void {
    const identity = new EntityIdentity();
    const nextIdentityKey = presetKey || this.primaryIdentityKeyForType(this.entity.type || 'service');
    identity.identityType = 'manual';
    identity.identityKey = nextIdentityKey;
    identity.identityValue = '';
    identity.priority = this.defaultIdentityPriority(nextIdentityKey);
    identity.primaryIdentity = this.identities.length === 0;
    this.entityDto.identities = [...this.identities, identity];
  }

  addRecommendedIdentities(): void {
    this.recommendedIdentities.forEach(identity => {
      this.addIdentityFromSuggestion(identity.key, identity.value);
    });
  }

  applySuggestedIdentity(identityKey: string, identityValue: string): void {
    this.addIdentityFromSuggestion(identityKey, identityValue);
  }

  onRemoveIdentity(index: number): void {
    const removedIdentity = this.identities[index];
    this.entityDto.identities = this.identities.filter((_, currentIndex) => currentIndex !== index);
    if (removedIdentity?.primaryIdentity) {
      this.ensurePrimaryIdentity(this.primaryIdentityKeyForType(this.entity.type || 'service'));
    }
  }

  setPrimaryIdentity(index: number): void {
    this.entityDto.identities = this.identities.map((identity, currentIndex) => {
      const nextIdentity = Object.assign(new EntityIdentity(), identity);
      nextIdentity.primaryIdentity = currentIndex === index;
      return nextIdentity;
    });
  }

  searchMonitors(): void {
    const query = this.monitorSearch.trim();
    if (query === '') {
      this.monitorSearchResults = [];
      this.telemetryDiscoveryResults = [];
      return;
    }
    this.monitorSearchLoading = true;
    this.monitorSvc.searchMonitors(undefined, undefined, query, 9, 0, 6).subscribe({
      next: message => {
        this.monitorSearchLoading = false;
        if (message.code === 0) {
          const results = message.data?.content || [];
          results.forEach(result => {
            this.monitorPreviewMap[result.id] = result;
          });
          this.monitorSearchResults = results;
          this.populateTelemetryDiscovery(results);
          return;
        }
        this.notifySvc.warning(this.translateOrFallback('entity.section.monitors', 'Bound Monitors'), message.msg);
      },
      error: error => {
        this.monitorSearchLoading = false;
        this.telemetryDiscoveryLoading = false;
        this.notifySvc.error(
          this.translateOrFallback('entity.section.monitors', 'Bound Monitors'),
          error?.msg || error?.message || 'Search failed'
        );
      }
    });
  }

  onAddMonitorBindFromSearch(monitor: Monitor): void {
    this.monitorPreviewMap[monitor.id] = monitor;
    this.addMonitorBind(monitor.id);
  }

  applyTelemetryDiscoveryResult(result: TelemetryDiscoveryResult): void {
    const primaryCandidate = this.getTelemetryPrimaryCandidate(result);
    if (primaryCandidate?.alreadyBound) {
      this.telemetrySelectedMonitorId = result.monitor.id;
      const messageKey =
        this.isEditMode && primaryCandidate.entityId === this.entityId
          ? 'entity.telemetry.discovery.current-resolved-hint'
          : 'entity.telemetry.discovery.resolved-hint';
      const fallback =
        this.isEditMode && primaryCandidate.entityId === this.entityId
          ? '这条监控已经归并到当前实体，无需重复采用，可继续补充目录信息。'
          : '这条监控已经归并到目录实体，可直接打开实体继续补充目录信息。';
      this.notifySvc.info(this.translateOrFallback('entity.entry-source.telemetry', 'Telemetry Discovery'), this.translateOrFallback(messageKey, fallback));
      return;
    }
    this.telemetrySelectedMonitorId = result.monitor.id;
    this.entity.type = result.inferredType;
    this.entity.name = result.inferredName;
    this.entity.displayName = result.inferredDisplayName || this.entity.displayName;
    this.entity.namespace = result.inferredNamespace || this.entity.namespace;
    this.entity.environment = result.inferredEnvironment || this.entity.environment;
    this.entity.owner = result.inferredOwner || this.entity.owner;
    this.entity.runbook = result.inferredRunbook || this.entity.runbook;
    this.entity.source = 'otel_resource';
    this.applyTelemetryLabels(result.inferredLabels);
    this.addMonitorBind(result.monitor.id);
    result.identityMatches.forEach(identity => {
      this.addIdentityFromSuggestion(identity.key, identity.value);
    });
    this.ensurePrimaryIdentity(this.primaryIdentityKeyForType(result.inferredType));
    this.notifySvc.success(
      this.translateOrFallback('entity.entry-source.telemetry', 'Telemetry Discovery'),
      this.translateOrFallback('entity.telemetry.apply.success', '已根据遥测结果生成实体草稿并关联监控。')
    );
  }

  openTelemetryCandidate(candidate: EntityMonitorBindingCandidate): void {
    this.router.navigate(['/entities', candidate.entityId], { queryParams: this.listQueryParams });
  }

  getTelemetryPrimaryCandidate(result: TelemetryDiscoveryResult): EntityMonitorBindingCandidate | undefined {
    return result.candidates[0];
  }

  hasTelemetryResolvedCandidate(result: TelemetryDiscoveryResult): boolean {
    return !!this.getTelemetryPrimaryCandidate(result)?.alreadyBound;
  }

  isTelemetryCurrentEntityCandidate(result: TelemetryDiscoveryResult): boolean {
    return this.isEditMode && this.getTelemetryPrimaryCandidate(result)?.entityId === this.entityId;
  }

  isTelemetryResolvedCurrentEntity(result: TelemetryDiscoveryResult): boolean {
    return this.isTelemetryCurrentEntityCandidate(result) && this.hasTelemetryResolvedCandidate(result);
  }

  canApplyTelemetryDiscoveryResult(result: TelemetryDiscoveryResult): boolean {
    return !this.hasTelemetryResolvedCandidate(result);
  }

  getTelemetryDiscoverySummary(result: TelemetryDiscoveryResult): string {
    const parts = [this.translateOrFallback(`entity.type.${result.inferredType}`, this.humanize(result.inferredType)), result.inferredName];
    if (this.trimText(result.inferredNamespace) != null) {
      parts.push(result.inferredNamespace!);
    }
    if (this.trimText(result.inferredEnvironment) != null) {
      parts.push(result.inferredEnvironment!);
    }
    return parts.join(' / ');
  }

  getTelemetryDiscoveryHint(result: TelemetryDiscoveryResult): string {
    const primaryCandidate = this.getTelemetryPrimaryCandidate(result);
    if (primaryCandidate != null) {
      if (primaryCandidate.alreadyBound) {
        if (this.isEditMode && primaryCandidate.entityId === this.entityId) {
          return this.translateOrFallback(
            'entity.telemetry.discovery.current-resolved-hint',
            '这条监控已经归并到当前实体，无需重复采用，可继续补充目录信息。'
          );
        }
        return this.translateOrFallback(
          'entity.telemetry.discovery.resolved-hint',
          '这条监控已经归并到目录实体，可直接打开实体继续补充目录信息。'
        );
      }
      return this.translateOrFallback(
        'entity.telemetry.discovery.candidate-hint',
        `已匹配到目录实体 ${primaryCandidate.entityName}，推荐优先合并到现有实体。`
      );
    }
    return this.translateOrFallback('entity.telemetry.discovery.create-hint', '当前没有目录候选，可直接基于这份遥测生成新的实体草稿。');
  }

  setTelemetryDiscoveryScope(scope: TelemetryDiscoveryScope): void {
    this.telemetryDiscoveryScope = scope;
  }

  onAddMonitorBindById(): void {
    const validationMessage = this.getManualMonitorIdValidationMessage();
    if (validationMessage != null) {
      this.manualMonitorIdFeedback = validationMessage;
      this.notifySvc.warning(this.translateOrFallback('entity.section.monitors', 'Bound Monitors'), validationMessage);
      return;
    }
    const monitorId = this.parseEntityNumericInput(this.manualMonitorId)!;
    this.addMonitorBind(monitorId);
    this.manualMonitorId = '';
    this.manualMonitorIdFeedback = undefined;
  }

  onRemoveMonitorBind(index: number): void {
    this.entityDto.monitorBinds = this.monitorBinds.filter((_, currentIndex) => currentIndex !== index);
  }

  searchRelationTargets(): void {
    const query = this.relationSearch.trim();
    if (query === '') {
      this.relationSearchResults = [];
      return;
    }
    this.relationSearchLoading = true;
    this.entitySvc.searchEntities(undefined, undefined, undefined, undefined, query, 0, 6).subscribe({
      next: message => {
        this.relationSearchLoading = false;
        if (message.code === 0) {
          this.relationSearchResults = (message.data?.content || []).filter(summary => summary.entity.id !== this.entityId);
          this.relationSearchResults.forEach(summary => {
            this.relationTargetMap[summary.entity.id] = summary.entity;
          });
          return;
        }
        this.notifySvc.warning(this.translateOrFallback('entity.section.relations', 'Relations'), message.msg);
      },
      error: error => {
        this.relationSearchLoading = false;
        this.notifySvc.error(
          this.translateOrFallback('entity.section.relations', 'Relations'),
          error?.msg || error?.message || 'Search failed'
        );
      }
    });
  }

  onAddRelationFromSearch(summary: EntitySummary): void {
    this.relationTargetMap[summary.entity.id] = summary.entity;
    this.addRelation(summary.entity.id, this.relationQuickTemplate);
  }

  onAddRelationById(): void {
    const validationMessage = this.getManualRelationTargetIdValidationMessage();
    if (validationMessage != null) {
      this.manualRelationTargetIdFeedback = validationMessage;
      this.notifySvc.warning(this.translateOrFallback('entity.section.relations', 'Relations'), validationMessage);
      return;
    }
    const targetEntityId = this.parseEntityNumericInput(this.manualRelationTargetId)!;
    this.addRelation(targetEntityId, this.relationQuickTemplate);
    this.manualRelationTargetId = '';
    this.manualRelationTargetIdFeedback = undefined;
    this.resolveRelationTargets();
  }

  onAddRelationByRef(): void {
    const validationMessage = this.getManualRelationTargetRefValidationMessage();
    if (validationMessage != null) {
      this.manualRelationTargetRefFeedback = validationMessage;
      this.notifySvc.warning(this.translateOrFallback('entity.section.relations', 'Relations'), validationMessage);
      return;
    }
    const targetRef = this.trimText(this.manualRelationTargetRef)!;
    if (this.hasRelationTargetRef(targetRef)) {
      this.manualRelationTargetRef = '';
      return;
    }
    const relation = new EntityRelation();
    if (this.isEditMode && this.entityId != undefined) {
      relation.sourceEntityId = this.entityId;
    }
    relation.targetRef = targetRef;
    relation.relationType = this.relationQuickTemplate;
    relation.relationSource = 'manual';
    relation.status = 'confirmed';
    relation.score = 100;
    this.entityDto.relations = [...this.relations, relation];
    this.manualRelationTargetRef = '';
    this.manualRelationTargetRefFeedback = undefined;
  }

  onRemoveRelation(index: number): void {
    this.entityDto.relations = this.relations.filter((_, currentIndex) => currentIndex !== index);
  }

  getEntityTitle(): string {
    return this.entity.displayName || this.entity.name || this.translateOrFallback('entity.new', 'New Entity');
  }

  setEntrySource(source: EntrySourceOption['value']): void {
    this.entrySource = source;
    this.activeEditorStage = 'basic';
    this.activeTabIndex = source === 'telemetry' ? 1 : 0;
    if (source === 'definition') {
      this.setEditorSurfaceMode('yaml', true);
    } else {
      this.setEditorSurfaceMode('editor');
    }
    if (!this.isEditMode) {
      switch (source) {
        case 'telemetry':
          this.entity.source = 'otel_resource';
          break;
        case 'manual':
          this.entity.source = 'manual';
          break;
        default:
          if (!this.trimText(this.entity.source)) {
            this.entity.source = 'manual';
          }
          break;
      }
    }
    if (source !== 'telemetry') {
      this.telemetrySelectedMonitorId = undefined;
    }
  }

  goToTab(tabIndex: number): void {
    this.activeTabIndex = tabIndex;
    switch (tabIndex) {
      case 1:
        this.scrollToSection('section-identities');
        return;
      case 2:
        this.scrollToSection('section-relations');
        return;
      default:
        this.scrollToSection('section-basic');
    }
  }

  setActiveEditorStage(stage: EditorStage, sectionId?: string): void {
    this.activeEditorStage = stage;
    if (sectionId != null) {
      this.scrollToSection(sectionId);
    }
  }

  togglePreviewRail(): void {
    this.previewRailCollapsed = !this.previewRailCollapsed;
  }

  goToEntrySourceStep(): void {
    if (this.entrySource === 'definition') {
      this.setEditorSurfaceMode('yaml', true);
      return;
    }
    this.scrollToSection(this.entrySource === 'telemetry' ? 'section-discovery' : 'section-basic');
  }

  setEditorSurfaceMode(mode: EditorSurfaceMode, syncDraft = false): void {
    this.editorSurfaceMode = mode;
    if (mode === 'editor') {
      return;
    }
    const nextFormat: DefinitionPreviewFormat = mode === 'json' ? 'json' : 'yaml';
    this.definitionPreviewFormat = nextFormat;
    this.definitionImportFormat = nextFormat;
    this.definitionImportError = undefined;
    this.syncDefinitionDraftFromSource(nextFormat, syncDraft);
  }

  scrollToSection(sectionId: string): void {
    this.editorSurfaceMode = 'editor';
    this.activeEditorStage = this.resolveEditorStage(sectionId);
    if (typeof document === 'undefined') {
      return;
    }
    requestAnimationFrame(() => {
      document.getElementById(sectionId)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    });
  }

  setDefinitionPreviewFormat(format: DefinitionPreviewFormat): void {
    this.definitionPreviewFormat = format;
    if (this.editorSurfaceMode !== 'editor' && format !== 'curl') {
      this.definitionImportFormat = format;
      this.syncDefinitionDraftFromSource(format, true);
    }
  }

  private resolveEditorStage(sectionId: string): EditorStage {
    if (sectionId === 'section-ownership') {
      return 'ownership';
    }
    if (sectionId === 'section-identities' || sectionId === 'section-monitors') {
      return 'evidence';
    }
    if (sectionId === 'section-relations' || sectionId === 'section-hertzbeat') {
      return 'relations';
    }
    return 'basic';
  }

  setDefinitionImportFormat(format: DefinitionImportFormat): void {
    this.definitionImportFormat = format;
    this.definitionImportError = undefined;
    if (format === 'curl') {
      this.definitionImportDraft = this.definitionCurlPreview;
      return;
    }
    if (this.editorSurfaceMode !== 'editor') {
      this.syncDefinitionDraftFromSource(format, true);
    }
  }

  async copyDefinitionPreview(): Promise<void> {
    if (!navigator?.clipboard?.writeText) {
      this.notifySvc.warning(
        this.translateOrFallback('entity.definition.title', 'Entity Definition Preview'),
        this.translateOrFallback('entity.definition.copy.unsupported', 'Clipboard copy is not available in the current browser.')
      );
      return;
    }
    try {
      await navigator.clipboard.writeText(this.definitionPreview);
      this.notifySvc.success(
        this.translateOrFallback('entity.definition.title', 'Entity Definition Preview'),
        this.translateOrFallback('entity.definition.copy.success', 'Definition content copied.')
      );
    } catch (error: any) {
      this.notifySvc.error(
        this.translateOrFallback('entity.definition.title', 'Entity Definition Preview'),
        error?.message || this.translateOrFallback('entity.definition.copy.fail', 'Copy failed.')
      );
    }
  }

  downloadDefinitionPreview(): void {
    if (typeof document === 'undefined') {
      return;
    }
    let format: 'curl' | 'json' | 'yaml' = 'yaml';
    if (this.definitionPreviewFormat === 'curl') {
      format = 'curl';
    } else if (this.editorSurfaceMode === 'json' || this.definitionPreviewFormat === 'json') {
      format = 'json';
    }
    const blob = new Blob([this.definitionPreview], {
      type: format === 'json' ? 'application/json' : format === 'curl' ? 'text/plain' : 'application/yaml'
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${this.entity.name || 'entity-definition'}.${format === 'curl' ? 'sh' : format}`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  loadDefinitionPreviewIntoDraft(): void {
    this.definitionImportDraft = this.definitionPreview;
    this.definitionImportFormat = this.definitionPreviewFormat === 'curl' ? 'curl' : this.definitionPreviewFormat;
    this.definitionImportError = undefined;
    this.definitionBundleEntityCount = 0;
  }

  clearDefinitionDraft(): void {
    this.definitionImportDraft = '';
    this.definitionImportError = undefined;
    this.definitionBundleEntityCount = 0;
  }

  applyDefinitionDraft(): void {
    const draft = this.definitionImportDraft.trim();
    if (draft === '') {
      this.definitionImportError = this.translateOrFallback(
        'entity.definition.import.empty',
        'Paste a definition first, then apply it to the form.'
      );
      return;
    }
    const request = normalizeDefinitionRequest(this.definitionImportFormat, draft);
    this.entitySvc.parseEntityDefinitionBundle(request).subscribe({
      next: message => {
        const entityDtos = Array.isArray(message.data) ? message.data : [];
        if (message.code === 0 && entityDtos.length > 0) {
          this.applyParsedEntityDto(entityDtos[0]);
          this.definitionImportError = undefined;
          this.definitionBundleEntityCount = entityDtos.length;
          this.notifySvc.success(
            this.translateOrFallback('entity.definition.title', 'Entity Definition Preview'),
            entityDtos.length > 1
              ? this.translateOrFallback(
                  'entity.definition.bundle.import.success',
                  `Bundle parsed successfully. The first entity is loaded into the form, and saving will create ${entityDtos.length} entities together.`
                )
              : this.translateOrFallback('entity.definition.import.success', 'Definition content applied to the form.')
          );
          return;
        }
        this.definitionImportError = message.msg || this.translateOrFallback('entity.definition.import.fail', 'Definition parsing failed.');
        this.definitionBundleEntityCount = 0;
        this.notifySvc.error(
          this.translateOrFallback('entity.definition.title', 'Entity Definition Preview'),
          this.definitionImportError || this.translateOrFallback('entity.definition.import.fail', 'Definition parsing failed.')
        );
      },
      error: error => {
        this.definitionImportError =
          error?.msg || error?.message || this.translateOrFallback('entity.definition.import.fail', 'Definition parsing failed.');
        this.definitionBundleEntityCount = 0;
        this.notifySvc.error(
          this.translateOrFallback('entity.definition.title', 'Entity Definition Preview'),
          this.definitionImportError || this.translateOrFallback('entity.definition.import.fail', 'Definition parsing failed.')
        );
      }
    });
  }

  selectType(type: string): void {
    this.entity.type = type;
  }

  getSubtypePlaceholder(type: string): string {
    switch (type) {
      case 'system':
        return this.translateOrFallback('entity.field.subtype.placeholder.system', '例如 business-capability');
      case 'database':
        return this.translateOrFallback('entity.field.subtype.placeholder.database', '例如 postgres');
      case 'queue':
        return this.translateOrFallback('entity.field.subtype.placeholder.queue', '例如 topic');
      case 'api':
        return this.translateOrFallback('entity.field.subtype.placeholder.api', '例如 public-api');
      case 'endpoint':
        return this.translateOrFallback('entity.field.subtype.placeholder.endpoint', '例如 https-endpoint');
      case 'host':
        return this.translateOrFallback('entity.field.subtype.placeholder.host', '例如 vm');
      case 'middleware':
        return this.translateOrFallback('entity.field.subtype.placeholder.middleware', '例如 kafka');
      case 'device':
        return this.translateOrFallback('entity.field.subtype.placeholder.device', '例如 gateway');
      case 'k8s_workload':
        return this.translateOrFallback('entity.field.subtype.placeholder.k8s_workload', '例如 deployment');
      default:
        return this.translateOrFallback('entity.field.subtype.placeholder.service', '例如 web-service');
    }
  }

  getTypeIcon(type: string): string {
    return this.typeCards.find(item => item.value === type)?.icon || 'deployment-unit';
  }

  getTypeDescription(type: string): string {
    const fallback = this.typeCards.find(item => item.value === type)?.description || '';
    return this.translateOrFallback(`entity.type-desc.${type}`, fallback);
  }

  hasSuggestedIdentity(identityKey: string): boolean {
    return this.identities.some(identity => identity.identityKey === identityKey);
  }

  getIdentityPreview(identity: EntityIdentity): string {
    return `${identity.identityKey} = ${identity.identityValue}`;
  }

  getRelationPreview(relation: EntityRelation): string {
    return `${this.humanize(relation.relationType)} -> ${this.getRelationTargetName(relation)}`;
  }

  getMonitorOptionLabel(monitor: Monitor): string {
    const segments = [monitor.name, monitor.app, monitor.instance].filter(Boolean);
    return segments.join(' / ');
  }

  getMonitorPreview(bind: EntityMonitorBind): string {
    const preview = this.monitorPreviewMap[bind.monitorId];
    if (preview == null) {
      return `#${bind.monitorId}`;
    }
    return `${preview.name} / ${preview.app}${preview.instance ? ` / ${preview.instance}` : ''}`;
  }

  getMonitorBindStatusLabel(bind: EntityMonitorBind): string {
    const preview = this.monitorPreviewMap[bind.monitorId];
    switch (preview?.status) {
      case 1:
        return this.translateOrFallback('entity.monitor.status.up', 'Up');
      case 2:
        return this.translateOrFallback('entity.monitor.status.down', 'Down');
      case 0:
        return this.translateOrFallback('entity.monitor.status.paused', 'Paused');
      default:
        return this.translateOrFallback('entity.monitor.status.unknown', 'Unknown');
    }
  }

  getMonitorBindStatusClass(bind: EntityMonitorBind): string {
    const preview = this.monitorPreviewMap[bind.monitorId];
    switch (preview?.status) {
      case 1:
        return 'healthy';
      case 2:
        return 'problem';
      case 0:
        return 'muted';
      default:
        return 'neutral';
    }
  }

  getMonitorBindInstance(bind: EntityMonitorBind): string | undefined {
    return this.trimText(this.monitorPreviewMap[bind.monitorId]?.instance);
  }

  getMonitorBindApp(bind: EntityMonitorBind): string | undefined {
    return this.trimText(this.monitorPreviewMap[bind.monitorId]?.app);
  }

  getRelationTargetName(relation: EntityRelation): string {
    const targetRef = this.trimText(relation.targetRef);
    const targetEntityId = relation.targetEntityId;
    if (targetEntityId == null || targetEntityId <= 0) {
      return targetRef || '-';
    }
    const target = this.relationTargetMap[targetEntityId];
    if (target == null) {
      return targetRef || `#${targetEntityId}`;
    }
    return target.displayName || target.name || `#${targetEntityId}`;
  }

  isMonitorBound(monitorId: number): boolean {
    return this.monitorBinds.some(bind => bind.monitorId === monitorId);
  }

  hasRelationTarget(targetEntityId: number): boolean {
    return this.relations.some(relation => relation.targetEntityId === targetEntityId);
  }

  hasRelationTargetRef(targetRef: string): boolean {
    const normalizedTargetRef = this.trimText(targetRef);
    if (normalizedTargetRef == null) {
      return false;
    }
    return this.relations.some(relation => this.trimText(relation.targetRef) === normalizedTargetRef);
  }

  getRelationQuickTemplateDescription(value: string): string {
    switch (value) {
      case 'depends_on':
        return this.translateOrFallback('entity.relation.template.depends-on.desc', '先用依赖模板收口最常见的上下游依赖，再补说明。');
      case 'calls':
        return this.translateOrFallback('entity.relation.template.calls.desc', '适合接口、服务之间的调用关系。');
      case 'connects_to':
        return this.translateOrFallback('entity.relation.template.connects-to.desc', '适合网络、消息或端点连通关系。');
      case 'runs_on':
        return this.translateOrFallback('entity.relation.template.runs-on.desc', '适合服务运行在主机、集群或平台上的关系。');
      case 'backed_by':
        return this.translateOrFallback('entity.relation.template.backed-by.desc', '适合数据库、缓存、队列等支撑关系。');
      default:
        return this.translateOrFallback('entity.relation.template.default', '先用常见关系模板收口，再补说明。');
    }
  }

  getRelationQuickTemplateTitle(value: string): string {
    switch (value) {
      case 'depends_on':
        return this.translateOrFallback('entity.relation-type.depends_on', '依赖');
      case 'calls':
        return this.translateOrFallback('entity.relation-type.calls', '调用');
      case 'connects_to':
        return this.translateOrFallback('entity.relation-type.connects_to', '连接到');
      case 'runs_on':
        return this.translateOrFallback('entity.relation-type.runs_on', '运行于');
      case 'backed_by':
        return this.translateOrFallback('entity.relation-type.backed_by', '由其支撑');
      default:
        return this.humanize(value);
    }
  }

  getRelationSummaryCopy(relation: EntityRelation): string {
    const description = this.trimText(relation.description);
    if (description != null) {
      return description;
    }
    return this.getRelationQuickTemplateDescription(relation.relationType);
  }

  getContactPlaceholder(contact: ContactDraft): string {
    switch (contact.type) {
      case 'email':
        return this.translateOrFallback('entity.contact.placeholder.email', '例如 owner@example.com');
      case 'webhook':
        return this.translateOrFallback('entity.contact.placeholder.webhook', '例如 https://hooks.example.com/entity-alerts');
      case 'slack':
        return this.translateOrFallback('entity.contact.placeholder.slack', '例如 #payments-oncall');
      case 'team':
        return this.translateOrFallback('entity.contact.placeholder.team', '例如 payments-team');
      case 'oncall':
        return this.translateOrFallback('entity.contact.placeholder.oncall', '例如 pagerduty://payments-primary');
      default:
        return this.translateOrFallback('entity.contact.placeholder.default', '例如 #payments-oncall 或 owner@example.com');
    }
  }

  getIdentityValidationMessage(identity: EntityIdentity): string | undefined {
    const hasKey = this.trimText(identity.identityKey) != null;
    const hasValue = this.trimText(identity.identityValue) != null;
    if (!hasKey && !hasValue) {
      return undefined;
    }
    if (!hasKey) {
      return this.translateOrFallback('entity.identity.validation.key', '标识键不能为空，或者删除这张空白卡片。');
    }
    if (!hasValue) {
      return this.translateOrFallback('entity.identity.validation.value', '标识值不能为空，或者删除这张空白卡片。');
    }
    return undefined;
  }

  getIdentityPresetOptions(identity: EntityIdentity): string[] {
    const preferredKey = this.primaryIdentityKeyForType(this.entity.type || 'service');
    const currentKey = this.trimText(identity.identityKey);
    return [preferredKey, ...this.identityPresetKeys]
      .filter((value, index, source) => source.indexOf(value) === index)
      .filter(value => value !== currentKey)
      .slice(0, 6);
  }

  applyIdentityPreset(index: number, identityKey: string): void {
    const normalized = this.trimText(identityKey);
    if (normalized == null || this.identities[index] == null) {
      return;
    }
    const identities = [...this.identities];
    const nextIdentity = Object.assign(new EntityIdentity(), identities[index]);
    nextIdentity.identityKey = normalized;
    nextIdentity.priority = this.defaultIdentityPriority(normalized);
    identities[index] = nextIdentity;
    this.entityDto.identities = identities;
  }

  getIdentityValuePlaceholder(identity: EntityIdentity): string {
    switch (this.trimText(identity.identityKey)) {
      case 'service.name':
        return this.translateOrFallback('entity.identity.placeholder.service-name', '例如 checkout-api');
      case 'host.name':
        return this.translateOrFallback('entity.identity.placeholder.host-name', '例如 worker-prod-01');
      case 'endpoint.url':
        return this.translateOrFallback('entity.identity.placeholder.endpoint-url', '例如 https://api.example.com/orders');
      case 'service.instance.id':
        return this.translateOrFallback('entity.identity.placeholder.instance-id', '例如 checkout-api-7df6f9d7bb-jt4p2');
      default:
        return this.translateOrFallback('entity.field.identity-value', '标识值');
    }
  }

  getLabelValidationMessage(label: KeyValueDraft): string | undefined {
    const hasKey = this.trimText(label.key) != null;
    const hasValue = this.trimText(label.value) != null;
    if (!hasKey && !hasValue) {
      return undefined;
    }
    if (!hasKey) {
      return this.translateOrFallback('entity.label.validation.key', '标签键不能为空，或者删除这行空白标签。');
    }
    if (!hasValue) {
      return this.translateOrFallback('entity.label.validation.value', '标签值不能为空，或者删除这行空白标签。');
    }
    return undefined;
  }

  getLinkValidationMessage(link: LinkDraft): string | undefined {
    const url = this.trimText(link.url);
    const hasDraftContent = this.trimText(link.name) != null || this.trimText(link.provider) != null || url != null;
    if (!hasDraftContent) {
      return undefined;
    }
    if (url == null) {
      return this.translateOrFallback('entity.link.validation.url-required', '链接地址不能为空，或者删除这张空白卡片。');
    }
    return this.getUrlValidationMessage(url, link.name || this.translateOrFallback('entity.field.links', 'Link'));
  }

  getContactValidationMessage(contact: ContactDraft): string | undefined {
    const value = this.trimText(contact.value);
    const hasDraftContent = this.trimText(contact.name) != null || value != null;
    if (!hasDraftContent) {
      return undefined;
    }
    if (value == null) {
      return this.translateOrFallback('entity.contact.validation.required', '联系人信息不能为空，或者删除这张空白卡片。');
    }
    if (contact.type === 'email' && !this.isValidEmail(value)) {
      return this.translateOrFallback('entity.contact.validation.email', '联系人邮箱需要是有效的邮箱地址。');
    }
    if (contact.type === 'webhook') {
      return this.getUrlValidationMessage(value, this.translateOrFallback('entity.contact-type.webhook', 'Webhook'));
    }
    return undefined;
  }

  getCodeLocationValidationMessage(item: CodeLocationDraft): string | undefined {
    const repositoryURL = this.trimText(item.repositoryURL);
    const paths = this.buildStringList(item.paths);
    if (repositoryURL == null && paths.length === 0) {
      return undefined;
    }
    if (repositoryURL == null) {
      return this.translateOrFallback('entity.hertzbeat.code-location.validation.repository', '仓库地址不能为空，或者删除这行空白代码位置。');
    }
    return this.getUrlValidationMessage(
      repositoryURL,
      this.translateOrFallback('entity.hertzbeat.code-locations', '代码位置')
    );
  }

  getSavedQueryValidationMessage(item: SavedQueryDraft, category: 'events' | 'logs'): string | undefined {
    const name = this.trimText(item.name);
    const query = this.trimText(item.query);
    if (name == null && query == null) {
      return undefined;
    }
    if (query == null) {
      return category === 'events'
        ? this.translateOrFallback('entity.hertzbeat.events.validation.query', '事件查询语句不能为空，或者删除这行空白查询。')
        : this.translateOrFallback('entity.hertzbeat.logs.validation.query', '日志查询语句不能为空，或者删除这行空白查询。');
    }
    return undefined;
  }

  getApiInterfaceValidationMessage(): string | undefined {
    const fileRef = this.trimText(this.apiInterfaceFileRef);
    if (fileRef != null && !this.isValidUrl(fileRef)) {
      return this.translateOrFallback('entity.api-interface.file-ref.invalid', '接口定义引用需要是有效的 http(s) 链接。');
    }
    const definition = this.trimText(this.apiInterfaceDefinitionDraft);
    if (definition == null) {
      return undefined;
    }
    try {
      this.parseStructuredDraftObject(
        definition,
        this.translateOrFallback('entity.api-interface.definition.invalid', '接口定义需要是 JSON 或 YAML 对象。'),
        true
      );
      return undefined;
    } catch (error) {
      return error instanceof Error
        ? error.message
        : this.translateOrFallback('entity.api-interface.definition.invalid', '接口定义需要是 JSON 或 YAML 对象。');
    }
  }

  getIntegrationsValidationMessage(): string | undefined {
    return this.getJsonObjectDraftValidationMessage(
      this.integrationsDraft,
      'entity.hertzbeat.integrations.invalid',
      '集成配置需要是 JSON 对象。'
    );
  }

  getExtensionsValidationMessage(): string | undefined {
    return this.getJsonObjectDraftValidationMessage(
      this.extensionsDraft,
      'entity.hertzbeat.extensions.invalid',
      '扩展配置需要是 JSON 对象。'
    );
  }

  getManualMonitorIdValidationMessage(): string | undefined {
    const monitorId = this.parseEntityNumericInput(this.manualMonitorId);
    if (monitorId == null || monitorId <= 0) {
      return this.translateOrFallback('entity.monitor.add-id.invalid', '请先填写有效的监控 ID。');
    }
    if (this.isMonitorBound(monitorId)) {
      return this.translateOrFallback('entity.monitor.add-id.duplicate', '这条监控已经绑定到当前实体。');
    }
    return undefined;
  }

  getManualRelationTargetIdValidationMessage(): string | undefined {
    const targetEntityId = this.parseEntityNumericInput(this.manualRelationTargetId);
    if (targetEntityId == null || targetEntityId <= 0) {
      return this.translateOrFallback('entity.relation.add-id.invalid', '请先填写有效的实体 ID。');
    }
    if (this.entityId != undefined && targetEntityId === this.entityId) {
      return this.translateOrFallback('entity.relation.self-invalid', 'The relation target cannot be the current entity.');
    }
    if (this.hasRelationTarget(targetEntityId)) {
      return this.translateOrFallback('entity.relation.add-id.duplicate', '这个实体已经在当前关系列表里。');
    }
    return undefined;
  }

  getManualRelationTargetRefValidationMessage(): string | undefined {
    const targetRef = this.trimText(this.manualRelationTargetRef);
    if (targetRef == null) {
      return this.translateOrFallback('entity.relation.add-ref.invalid', '请先填写有效的实体引用。');
    }
    if (this.hasRelationTargetRef(targetRef)) {
      return this.translateOrFallback('entity.relation.add-ref.duplicate', '这个实体引用已经在当前关系列表里。');
    }
    return undefined;
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

  trackByTypeCard(_index: number, item: TypeCard): string {
    return item.value;
  }

  trackByCatalogRailItem(_index: number, item: CatalogRailItem): string {
    return item.value;
  }

  trackByRelationQuickTemplate(_index: number, item: RelationQuickTemplate): string {
    return item.value;
  }

  trackByEntrySource(_index: number, item: EntrySourceOption): string {
    return item.value;
  }

  trackByValue(_index: number, value: string): string {
    return value;
  }

  trackByIdentity(_index: number, identity: EntityIdentity): string {
    return `${identity.identityKey}:${identity.identityValue}:${identity.priority}:${identity.primaryIdentity}`;
  }

  trackByMonitor(_index: number, monitor: Monitor): number {
    return monitor.id;
  }

  trackByTelemetryDiscovery(_index: number, result: TelemetryDiscoveryResult): number {
    return result.monitor.id;
  }

  trackByMonitorBind(_index: number, bind: EntityMonitorBind): string {
    return `${bind.monitorId}:${bind.bindType}:${bind.status}`;
  }

  trackByEntitySummary(_index: number, summary: EntitySummary): number {
    return summary.entity.id;
  }

  trackByRelation(_index: number, relation: EntityRelation): string {
    return `${relation.targetEntityId ?? 'ref'}:${relation.targetRef ?? ''}:${relation.relationType}:${relation.status}`;
  }

  trackByKeyValue(_index: number, item: { key: string; value: string }): string {
    return `${item.key}:${item.value}`;
  }

  trackByChecklist(
    _index: number,
    item: { title: string; description: string; done: boolean; tabIndex: number; sectionId: string }
  ): string {
    return `${item.title}:${item.tabIndex}`;
  }

  trackByEditorStage(
    _index: number,
    item: { value: EditorStage; title: string; description: string; sectionId: string; done: boolean }
  ): string {
    return item.value;
  }

  trackByIndex(index: number): number {
    return index;
  }

  trackByString(_index: number, value: string): string {
    return value;
  }

  private resetForm(): void {
    this.entityDto = this.createEmptyEntityDto();
    this.entrySource = 'manual';
    this.editorSurfaceMode = 'editor';
    this.activeTabIndex = 0;
    this.showAdvancedDetails = false;
    this.definitionPreviewFormat = 'yaml';
    this.definitionImportFormat = 'yaml';
    this.definitionImportDraft = '';
    this.definitionImportError = undefined;
    this.definitionBundleEntityCount = 0;
    this.labelDrafts = [];
    this.linkDrafts = [];
    this.contactDrafts = [];
    this.catalogTagsDraft = '';
    this.catalogTagsInput = '';
    this.codeLocationDrafts = [];
    this.eventQueryDrafts = [];
    this.logQueryDrafts = [];
    this.componentOfDraft = '';
    this.componentOfInput = '';
    this.componentsDraft = '';
    this.componentsInput = '';
    this.implementedByDraft = '';
    this.implementedByInput = '';
    this.apiInterfaceDefinitionDraft = '';
    this.apiInterfaceFileRef = '';
    this.languagesDraft = '';
    this.languagesInput = '';
    this.performanceTagsInput = '';
    this.pipelineFingerprintsInput = '';
    this.performanceTagsDraft = '';
    this.pipelineFingerprintsDraft = '';
    this.integrationsDraft = '';
    this.extensionsDraft = '';
    this.monitorSearch = '';
    this.monitorSearchResults = [];
    this.monitorPreviewMap = {};
    this.telemetryDiscoveryLoading = false;
    this.telemetryDiscoveryResults = [];
    this.telemetrySelectedMonitorId = undefined;
    this.manualMonitorId = '';
    this.appliedSeedEntityDtoSignature = undefined;
    this.relationSearch = '';
    this.relationSearchResults = [];
    this.relationTargetMap = {};
    this.relationQuickTemplate = 'depends_on';
    this.manualRelationTargetId = '';
    this.manualRelationTargetRef = '';
    this.governancePresetSeed = undefined;
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
      }
    });
  }

  private loadCatalogSuggestions(): void {
    this.entitySvc.getCatalogSuggestions().subscribe({
      next: message => {
        if (message.code !== 0 || message.data == null) {
          return;
        }
        this.catalogSuggestions = Object.assign(new EntityCatalogSuggestions(), message.data);
      },
      error: () => {
        this.catalogSuggestions = new EntityCatalogSuggestions();
      }
    });
  }

  getCatalogQueryParams(type?: string): Record<string, string | number | null> {
    return {
      ...this.listQueryParams,
      type: type || null
    };
  }

  getCatalogGroupCount(type?: string): number {
    if (type == null) {
      return this.catalogTotalCount;
    }
    return this.catalogGroupCounts[type] || 0;
  }

  private createEmptyEntityDto(): EntityDto {
    const dto = new EntityDto();
    const entity = new Entity();
    entity.type = 'service';
    entity.subtype = undefined;
    entity.additionalOwners = [];
    entity.componentOf = [];
    entity.components = [];
    entity.implementedBy = [];
    entity.apiInterface = undefined;
    entity.languages = [];
    entity.source = 'manual';
    entity.links = [];
    entity.contacts = [];
    entity.tags = [];
    entity.integrations = undefined;
    entity.extensions = undefined;
    entity.hertzbeat = undefined;
    dto.entity = entity;
    dto.identities = [];
    dto.monitorBinds = [];
    dto.relations = [];
    return dto;
  }

  private cloneEntityDto(source: EntityDto): EntityDto {
    const dto = new EntityDto();
    dto.entity = Object.assign(new Entity(), source.entity || {});
    dto.entity.additionalOwners = (source.entity?.additionalOwners || []).map(owner => Object.assign(new EntityOwnerRef(), owner));
    dto.entity.componentOf = [...(source.entity?.componentOf || [])];
    dto.entity.components = [...(source.entity?.components || [])];
    dto.entity.implementedBy = [...(source.entity?.implementedBy || [])];
    dto.entity.apiInterface = this.cloneJsonObject(source.entity?.apiInterface) as EntityApiInterface | undefined;
    dto.entity.languages = [...(source.entity?.languages || [])];
    dto.entity.links = (source.entity?.links || []).map(link => Object.assign(new EntityCatalogLink(), link));
    dto.entity.contacts = (source.entity?.contacts || []).map(contact => Object.assign(new EntityCatalogContact(), contact));
    dto.entity.tags = [...(source.entity?.tags || [])];
    dto.entity.integrations = this.cloneJsonObject(source.entity?.integrations);
    dto.entity.extensions = this.cloneJsonObject(source.entity?.extensions);
    dto.entity.hertzbeat = this.cloneJsonObject(source.entity?.hertzbeat) as EntityHertzBeatConfig | undefined;
    dto.identities = (source.identities || []).map(identity => {
      const nextIdentity = Object.assign(new EntityIdentity(), identity);
      nextIdentity.identityValue = this.normalizeDerivedIdentityValue(nextIdentity, dto.entity);
      return nextIdentity;
    });
    dto.monitorBinds = (source.monitorBinds || []).map(bind => Object.assign(new EntityMonitorBind(), bind));
    const sourceEntityId = source.entity?.id;
    dto.relations = (source.relations || [])
      .filter(relation => {
        if (sourceEntityId == null) {
          return relation.sourceEntityId == null || relation.sourceEntityId <= 0;
        }
        return relation.sourceEntityId == null || relation.sourceEntityId === sourceEntityId;
      })
      .map(relation => Object.assign(new EntityRelation(), relation));
    return dto;
  }

  private buildPayload(): EntityDto {
    const payload = new EntityDto();
    const entity = new Entity();
    if (this.isEditMode) {
      entity.id = this.entityId!;
    }
    entity.type = this.trimText(this.entity.type) || 'service';
    entity.name = this.trimText(this.entity.name) || '';
    entity.displayName = this.trimText(this.entity.displayName);
    entity.subtype = this.trimText(this.entity.subtype);
    entity.namespace = this.trimText(this.entity.namespace);
    entity.environment = this.trimText(this.entity.environment);
    entity.owner = this.trimText(this.entity.owner);
    entity.additionalOwners = this.buildOwnerRefs();
    entity.criticality = this.trimText(this.entity.criticality);
    entity.runbook = this.trimText(this.entity.runbook);
    entity.lifecycle = this.trimText(this.entity.lifecycle);
    entity.tier = this.trimText(this.entity.tier);
    entity.system = this.trimText(this.entity.system);
    entity.componentOf = this.buildStringList(this.componentOfDraft, this.entity.componentOf);
    entity.components = this.buildStringList(this.componentsDraft, this.entity.components);
    entity.implementedBy = this.buildStringList(this.implementedByDraft, this.entity.implementedBy);
    entity.apiInterface = this.buildApiInterface(true);
    entity.inheritFrom = this.trimText(this.entity.inheritFrom);
    entity.languages = this.buildStringList(this.languagesDraft, this.entity.languages);
    entity.links = this.buildLinks();
    entity.contacts = this.buildContacts();
    entity.tags = this.buildStringList(this.catalogTagsDraft, this.entity.tags);
    entity.integrations = this.parseJsonDraftObject(
      this.integrationsDraft,
      this.translateOrFallback('entity.hertzbeat.integrations.invalid', '集成配置需要是 JSON 对象。'),
      true
    );
    entity.extensions = this.parseJsonDraftObject(
      this.extensionsDraft,
      this.translateOrFallback('entity.hertzbeat.extensions.invalid', '扩展配置需要是 JSON 对象。'),
      true
    );
    entity.hertzbeat = this.buildHertzBeatConfig();
    entity.source = this.trimText(this.entity.source) || 'manual';
    entity.description = this.trimText(this.entity.description);
    entity.labels = this.buildLabels();
    payload.entity = entity;
    payload.identities = this.identities
      .map(identity => {
        const nextIdentity = new EntityIdentity();
        nextIdentity.identityKey = this.trimText(identity.identityKey) || '';
        nextIdentity.identityValue = this.normalizeDerivedIdentityValue(identity, entity);
        nextIdentity.identityType = this.trimText(identity.identityType) || 'manual';
        nextIdentity.priority = identity.priority == null ? this.defaultIdentityPriority(nextIdentity.identityKey) : identity.priority;
        nextIdentity.primaryIdentity = !!identity.primaryIdentity;
        return nextIdentity;
      })
      .filter(identity => identity.identityKey !== '' && identity.identityValue !== '');
    payload.monitorBinds = this.monitorBinds
      .map(bind => {
        const nextBind = new EntityMonitorBind();
        nextBind.monitorId = bind.monitorId;
        nextBind.bindType = this.trimText(bind.bindType) || 'manual';
        nextBind.bindSource = this.trimText(bind.bindSource) || 'manual';
        nextBind.status = this.trimText(bind.status) || 'active';
        nextBind.score = bind.score == null ? 100 : bind.score;
        nextBind.matchContext = bind.matchContext;
        return nextBind;
      })
      .filter(bind => bind.monitorId != null);
    payload.relations = this.relations
      .map(relation => {
        const nextRelation = new EntityRelation();
        if (!this.isEditMode) {
          delete (nextRelation as Partial<EntityRelation>).sourceEntityId;
        } else {
          nextRelation.sourceEntityId = this.entityId!;
        }
        nextRelation.targetEntityId = relation.targetEntityId;
        nextRelation.targetRef = this.trimText(relation.targetRef);
        nextRelation.relationType = this.trimText(relation.relationType) || 'depends_on';
        nextRelation.relationSource = this.trimText(relation.relationSource) || 'manual';
        nextRelation.status = this.trimText(relation.status) || 'confirmed';
        nextRelation.description = this.trimText(relation.description);
        nextRelation.score = relation.score == null ? 100 : relation.score;
        nextRelation.attributes = relation.attributes;
        return nextRelation;
      })
      .filter(relation => relation.targetEntityId != null || relation.targetRef != null);
    return payload;
  }

  private buildDefinitionRequest(): EntityDefinitionRequest {
    const request = new EntityDefinitionRequest();
    const rawDefinitionDraft = this.definitionImportDraft.trim();
    if (!this.isEditMode && this.definitionBundleEntityCount > 1 && rawDefinitionDraft !== '') {
      return normalizeDefinitionRequest(this.definitionImportFormat, rawDefinitionDraft);
    }
    if (this.editorSurfaceMode === 'json') {
      request.format = 'json';
      request.content = rawDefinitionDraft || JSON.stringify(this.definitionPreviewObject, null, 2);
      return request;
    }
    if (this.editorSurfaceMode === 'yaml') {
      request.format = 'yaml';
      request.content = rawDefinitionDraft || this.toYaml(this.definitionPreviewObject);
      return request;
    }
    request.format = this.definitionPreviewFormat === 'json' ? 'json' : 'yaml';
    request.content =
      this.definitionPreviewFormat === 'json'
        ? JSON.stringify(this.definitionPreviewObject, null, 2)
        : this.toYaml(this.definitionPreviewObject);
    return request;
  }

  private applyParsedEntityDto(source: EntityDto): void {
    this.entityDto = this.cloneEntityDto(source);
    if (this.isEditMode && this.entityId != undefined) {
      this.entityDto.entity.id = this.entityId;
    }
    this.syncDraftStateFromEntity();
    this.entrySource = 'definition';
    this.editorSurfaceMode = 'editor';
    this.activeTabIndex = 0;
    this.resolveRelationTargets();
  }

  private applyDefinitionRouteState(): void {
    this.governancePresetSeed = readGovernancePresetFromQuery(this.route.snapshot.queryParamMap);
    this.definitionResumeToken = this.trimText(this.route.snapshot.queryParamMap.get('resumeDefinitionToken') || undefined);
    this.definitionResumeHandledRowKey = this.trimText(this.route.snapshot.queryParamMap.get('resumeHandledRowKey') || undefined);
    const requestedEntrySource = this.route.snapshot.queryParamMap.get('entrySource');
    const requestedSurface = this.route.snapshot.queryParamMap.get('surface');
    const requestedFormat = this.route.snapshot.queryParamMap.get('definitionFormat');
    const requestedType = this.normalizeDefinitionKind(this.route.snapshot.queryParamMap.get('type'));
    this.pendingFocusSectionId = this.resolveRequestedFocusSectionId(this.route.snapshot.queryParamMap.get('focus'));
    if (!this.isEditMode && requestedType != null) {
      this.entity.type = requestedType;
    }
    if (requestedEntrySource === 'manual' || requestedEntrySource === 'telemetry' || requestedEntrySource === 'definition') {
      this.entrySource = requestedEntrySource;
      if (requestedEntrySource === 'telemetry') {
        this.entity.source = 'otel_resource';
      }
    }
    if (requestedSurface === 'json' || requestedSurface === 'yaml') {
      this.editorSurfaceMode = requestedSurface;
      this.entrySource = 'definition';
      this.definitionPreviewFormat = requestedSurface;
      this.definitionImportFormat = requestedSurface;
    }
    if (requestedFormat === 'json' || requestedFormat === 'yaml' || requestedFormat === 'curl') {
      this.definitionPreviewFormat = requestedFormat;
      this.definitionImportFormat = requestedFormat;
    }
    this.applyGovernancePresetSeedValues(true);
    this.applySeedEntityDtoRouteState();
  }

  private applyTelemetryMonitorRouteState(): void {
    const requestedMonitorId = Number(this.route.snapshot.queryParamMap.get('monitorId'));
    if (this.isEditMode || this.entrySource !== 'telemetry' || Number.isNaN(requestedMonitorId) || requestedMonitorId <= 0) {
      return;
    }
    this.telemetryDiscoveryLoading = true;
    this.monitorSvc.getMonitor(requestedMonitorId).subscribe({
      next: message => {
        const monitor =
          message.code === 0 ? ((message.data?.monitor as Monitor | undefined) ?? (message.data as Monitor | undefined)) : undefined;
        if (monitor == null) {
          this.telemetryDiscoveryLoading = false;
          this.notifySvc.warning(
            this.translateOrFallback('entity.entry-source.telemetry', 'Telemetry Discovery'),
            message.msg || this.translateOrFallback('entity.telemetry.discovery.empty', '没有找到可用的监控线索。')
          );
          return;
        }
        this.monitorPreviewMap[monitor.id] = monitor;
        this.monitorSearch = this.trimText(monitor.instance) || this.trimText(monitor.name) || `${monitor.id}`;
        this.entitySvc
          .getMonitorBindingCandidates(monitor.id)
          .pipe(
            catchError(() =>
              of({
                code: 1,
                msg: 'candidate lookup failed',
                data: []
              } as Message<EntityMonitorBindingCandidate[]>)
            )
          )
          .subscribe({
            next: response => {
              this.telemetryDiscoveryLoading = false;
              const result = this.buildTelemetryDiscoveryResult(monitor, response.code === 0 ? response.data || [] : []);
              this.telemetryDiscoveryResults = [result];
              this.telemetryDiscoveryScope = 'all';
              this.applyTelemetryDiscoveryResult(result);
            },
            error: () => {
              this.telemetryDiscoveryLoading = false;
              const result = this.buildTelemetryDiscoveryResult(monitor, []);
              this.telemetryDiscoveryResults = [result];
              this.telemetryDiscoveryScope = 'all';
              this.applyTelemetryDiscoveryResult(result);
            }
          });
      },
      error: error => {
        this.telemetryDiscoveryLoading = false;
        this.notifySvc.error(
          this.translateOrFallback('entity.entry-source.telemetry', 'Telemetry Discovery'),
          error?.msg || error?.message || 'Load failed'
        );
      }
    });
  }

  private syncDefinitionDraftFromSource(format: Exclude<DefinitionPreviewFormat, 'curl'>, force = false): void {
    const shouldSync = force || this.definitionImportDraft.trim() === '' || this.definitionImportFormat !== format;
    if (!shouldSync) {
      return;
    }
    if (!this.isEditMode || this.entityId == undefined) {
      this.definitionImportDraft =
        format === 'json' ? JSON.stringify(this.definitionPreviewObject, null, 2) : this.toYaml(this.definitionPreviewObject);
      this.definitionBundleEntityCount = 0;
      return;
    }
    this.definitionSyncing = true;
    this.entitySvc.getEntityDefinition(this.entityId, format).subscribe({
      next: message => {
        this.definitionSyncing = false;
        if (this.editorSurfaceMode === 'editor') {
          return;
        }
        const definitionContent = typeof message.data === 'string' ? message.data : message.msg;
        if (message.code === 0 && definitionContent != null) {
          this.definitionImportDraft = definitionContent;
          this.definitionImportError = undefined;
          this.definitionBundleEntityCount = 0;
          return;
        }
        this.definitionImportDraft =
          format === 'json' ? JSON.stringify(this.definitionPreviewObject, null, 2) : this.toYaml(this.definitionPreviewObject);
        this.definitionBundleEntityCount = 0;
      },
      error: error => {
        this.definitionSyncing = false;
        this.definitionImportDraft =
          format === 'json' ? JSON.stringify(this.definitionPreviewObject, null, 2) : this.toYaml(this.definitionPreviewObject);
        this.definitionImportError =
          error?.msg || error?.message || this.translateOrFallback('entity.definition.import.fail', 'Definition parsing failed.');
        this.definitionBundleEntityCount = 0;
      }
    });
  }

  private normalizeDerivedIdentityValue(identity: EntityIdentity, entity: Entity): string {
    const identityKey = this.trimText(identity.identityKey) || '';
    const currentValue = this.trimText(identity.identityValue) || '';
    const identityType = this.trimText(identity.identityType) || '';
    const entityName = this.trimText(entity.name);
    const displayName = this.trimText(entity.displayName);

    if (identityType === 'manual') {
      return currentValue;
    }

    if (identityKey === 'service.name' && entityName != null && ['service', 'database', 'middleware'].includes(entity.type || '')) {
      return entityName;
    }

    if (identityKey === 'messaging.destination.name' && entityName != null && entity.type === 'queue') {
      return entityName;
    }

    if (identityKey === 'display_name' && displayName != null) {
      return displayName;
    }

    if (identityKey === 'k8s.workload.name' && entityName != null) {
      return entityName;
    }

    return currentValue;
  }

  private parseEntityNumericInput(value?: string | number | null): number | undefined {
    const normalized = this.trimText(value == null ? undefined : String(value));
    if (normalized == null || !/^\d+$/.test(normalized)) {
      return undefined;
    }
    const parsed = Number(normalized);
    if (!Number.isSafeInteger(parsed) || parsed <= 0) {
      return undefined;
    }
    return parsed;
  }

  private buildLabels(): Record<string, string> | undefined {
    const labels = this.labelDrafts.reduce<Record<string, string>>((result, draft) => {
      const key = this.trimText(draft.key);
      const value = this.trimText(draft.value);
      if (key != null && value != null) {
        result[key] = value;
      }
      return result;
    }, {});
    return Object.keys(labels).length > 0 ? labels : undefined;
  }

  private buildDefinitionTags(labels: Record<string, string>): string[] {
    return Object.entries(labels)
      .filter(([key]) => this.trimText(key) != null)
      .map(([key, value]) => {
        const normalizedKey = this.trimText(key) || key;
        const normalizedValue = this.trimText(value);
        return normalizedValue != null ? `${normalizedKey}:${normalizedValue}` : normalizedKey;
      });
  }

  private buildMetadataTags(labels?: Record<string, string>): string[] | undefined {
    const tags = this.buildStringList(this.catalogTagsDraft, this.entity.tags);
    if (tags.length > 0) {
      return tags;
    }
    if (labels != null && Object.keys(labels).length > 0) {
      return this.buildDefinitionTags(labels);
    }
    return undefined;
  }

  private mapLabelsToDrafts(labels?: Record<string, string>): KeyValueDraft[] {
    return Object.entries(labels || {}).map(([key, value]) => ({ key, value }));
  }

  private buildLinks(): EntityCatalogLink[] | undefined {
    const links = this.linkDrafts
      .map(draft => {
        const url = this.trimText(draft.url);
        if (url == null) {
          return undefined;
        }
        const link = new EntityCatalogLink();
        link.name = this.trimText(draft.name);
        link.type = this.trimText(draft.type) || 'link';
        link.provider = this.trimText(draft.provider);
        link.url = url;
        return link;
      })
      .filter((item): item is EntityCatalogLink => item != null);
    return links.length > 0 ? links : undefined;
  }

  private mapLinksToDrafts(links?: EntityCatalogLink[]): LinkDraft[] {
    return (links || []).map(link => ({
      name: link.name || '',
      type: link.type || 'link',
      provider: link.provider || '',
      url: link.url || ''
    }));
  }

  private buildOwnerRefs(): EntityOwnerRef[] | undefined {
    const owners = (this.entity.additionalOwners || [])
      .map(owner => {
        const name = this.trimText(owner?.name);
        if (name == null) {
          return undefined;
        }
        const item = new EntityOwnerRef();
        item.name = name;
        item.type = this.trimText(owner?.type) || 'team';
        return item;
      })
      .filter((item): item is EntityOwnerRef => item != null);
    return owners.length > 0 ? owners : undefined;
  }

  private buildContacts(): EntityCatalogContact[] | undefined {
    const contacts = this.contactDrafts
      .map(draft => {
        const value = this.trimText(draft.value);
        if (value == null) {
          return undefined;
        }
        const contact = new EntityCatalogContact();
        contact.name = this.trimText(draft.name);
        contact.type = this.trimText(draft.type) || 'contact';
        contact.value = value;
        contact.contact = value;
        return contact;
      })
      .filter((item): item is EntityCatalogContact => item != null);
    return contacts.length > 0 ? contacts : undefined;
  }

  private mapContactsToDrafts(contacts?: EntityCatalogContact[]): ContactDraft[] {
    return (contacts || []).map(contact => ({
      name: contact.name || '',
      type: contact.type || 'contact',
      value: contact.contact || contact.value || ''
    }));
  }

  private buildHertzBeatConfig(): EntityHertzBeatConfig | undefined {
    const codeLocations = this.codeLocationDrafts
      .map(draft => {
        const repositoryURL = this.trimText(draft.repositoryURL);
        const paths = this.buildStringList(draft.paths);
        if (repositoryURL == null && paths.length === 0) {
          return undefined;
        }
        const item = new EntityHertzBeatCodeLocation();
        item.repositoryURL = repositoryURL;
        item.paths = paths;
        return item;
      })
      .filter((item): item is EntityHertzBeatCodeLocation => item != null);
    const events = this.buildSavedQueries(this.eventQueryDrafts);
    const logs = this.buildSavedQueries(this.logQueryDrafts);
    const performanceTags = this.buildStringList(this.performanceTagsDraft);
    const fingerprints = this.buildStringList(this.pipelineFingerprintsDraft);
    if (codeLocations.length === 0 && events.length === 0 && logs.length === 0 && performanceTags.length === 0 && fingerprints.length === 0) {
      return undefined;
    }
    const hertzbeat = new EntityHertzBeatConfig();
    hertzbeat.codeLocations = codeLocations.length > 0 ? codeLocations : undefined;
    hertzbeat.events = events.length > 0 ? events : undefined;
    hertzbeat.logs = logs.length > 0 ? logs : undefined;
    hertzbeat.performanceData = performanceTags.length > 0 ? { tags: performanceTags } : undefined;
    hertzbeat.pipelines = fingerprints.length > 0 ? { fingerprints } : undefined;
    return hertzbeat;
  }

  private buildApiInterface(strict = false): EntityApiInterface | undefined {
    const fileRef = this.trimText(this.apiInterfaceFileRef);
    const definition = this.parseStructuredDraftObject(
      this.apiInterfaceDefinitionDraft,
      this.translateOrFallback('entity.api-interface.definition.invalid', '接口定义需要是 JSON 或 YAML 对象。'),
      strict
    );
    if (fileRef == null && definition == null) {
      return undefined;
    }
    const apiInterface = new EntityApiInterface();
    apiInterface.fileRef = fileRef;
    apiInterface.definition = definition;
    return apiInterface;
  }

  private buildSavedQueries(source: SavedQueryDraft[]): EntityHertzBeatSavedQuery[] {
    return source
      .map(draft => {
        const query = this.trimText(draft.query);
        if (query == null) {
          return undefined;
        }
        const item = new EntityHertzBeatSavedQuery();
        item.name = this.trimText(draft.name);
        item.query = query;
        return item;
      })
      .filter((item): item is EntityHertzBeatSavedQuery => item != null);
  }

  private syncDraftStateFromEntity(): void {
    this.labelDrafts = this.mapLabelsToDrafts(this.entity.labels);
    this.linkDrafts = this.mapLinksToDrafts(this.entity.links);
    this.contactDrafts = this.mapContactsToDrafts(this.entity.contacts);
    this.catalogTagsDraft = (this.entity.tags || []).join(', ');
    this.catalogTagsInput = '';
    this.codeLocationDrafts = this.mapCodeLocationsToDrafts(this.entity.hertzbeat?.codeLocations);
    this.eventQueryDrafts = this.mapSavedQueriesToDrafts(this.entity.hertzbeat?.events);
    this.logQueryDrafts = this.mapSavedQueriesToDrafts(this.entity.hertzbeat?.logs);
    this.componentOfDraft = (this.entity.componentOf || []).join(', ');
    this.componentOfInput = '';
    this.componentsDraft = (this.entity.components || []).join(', ');
    this.componentsInput = '';
    this.implementedByDraft = (this.entity.implementedBy || []).join(', ');
    this.implementedByInput = '';
    this.apiInterfaceDefinitionDraft = this.stringifyStructuredDraft(this.entity.apiInterface?.definition);
    this.apiInterfaceFileRef = this.entity.apiInterface?.fileRef || '';
    this.languagesDraft = (this.entity.languages || []).join(', ');
    this.languagesInput = '';
    this.performanceTagsInput = '';
    this.pipelineFingerprintsInput = '';
    this.performanceTagsDraft = (this.entity.hertzbeat?.performanceData?.tags || []).join(', ');
    this.pipelineFingerprintsDraft = (this.entity.hertzbeat?.pipelines?.fingerprints || []).join(', ');
    this.integrationsDraft = this.stringifyJsonDraft(this.entity.integrations);
    this.extensionsDraft = this.stringifyJsonDraft(this.entity.extensions);
  }

  private mapCodeLocationsToDrafts(codeLocations?: EntityHertzBeatCodeLocation[]): CodeLocationDraft[] {
    return (codeLocations || []).map(codeLocation => ({
      repositoryURL: codeLocation.repositoryURL || '',
      paths: (codeLocation.paths || []).join(', ')
    }));
  }

  private mapSavedQueriesToDrafts(queries?: EntityHertzBeatSavedQuery[]): SavedQueryDraft[] {
    return (queries || []).map(query => ({
      name: query.name || '',
      query: query.query || ''
    }));
  }

  private stringifyJsonDraft(value?: Record<string, unknown>): string {
    if (value == null || Object.keys(value).length === 0) {
      return '';
    }
    return JSON.stringify(value, null, 2);
  }

  private stringifyStructuredDraft(value?: unknown): string {
    if (value == null) {
      return '';
    }
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value as Record<string, unknown>).length === 0) {
      return '';
    }
    return JSON.stringify(value, null, 2);
  }

  private parseJsonDraftObject(
    value: string,
    errorMessage?: string,
    strict = false
  ): Record<string, unknown> | undefined {
    const normalized = this.trimText(value);
    if (normalized == null) {
      return undefined;
    }
    try {
      const parsed = JSON.parse(normalized);
      if (parsed == null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error(errorMessage || 'JSON object expected');
      }
      return parsed as Record<string, unknown>;
    } catch (error) {
      if (strict) {
        throw new Error(errorMessage || (error instanceof Error ? error.message : 'JSON object expected'));
      }
      return undefined;
    }
  }

  private parseStructuredDraftObject(
    value: string,
    errorMessage?: string,
    strict = false
  ): Record<string, unknown> | undefined {
    const normalized = this.trimText(value);
    if (normalized == null) {
      return undefined;
    }
    try {
      const parsedJson = JSON.parse(normalized);
      return this.ensureDefinitionRecord(parsedJson);
    } catch {
      try {
        const parsedYaml = this.parseYamlDefinition(normalized);
        return this.ensureDefinitionRecord(parsedYaml);
      } catch (error) {
        if (strict) {
          throw new Error(errorMessage || (error instanceof Error ? error.message : 'Structured object expected'));
        }
        return undefined;
      }
    }
  }

  private normalizeRecordValue(value: unknown): Record<string, unknown> | undefined {
    if (value == null || typeof value !== 'object' || Array.isArray(value)) {
      return undefined;
    }
    return this.cloneJsonObject(value as Record<string, unknown>);
  }

  private normalizeHertzBeatConfig(value: unknown): EntityHertzBeatConfig | undefined {
    if (value == null || typeof value !== 'object' || Array.isArray(value)) {
      return undefined;
    }
    return this.cloneJsonObject(value as EntityHertzBeatConfig);
  }

  private normalizeApiInterface(value: unknown): EntityApiInterface | undefined {
    if (value == null || typeof value !== 'object' || Array.isArray(value)) {
      return undefined;
    }
    const source = value as Record<string, unknown>;
    const fileRef = this.normalizeString(source.fileRef) || this.normalizeString(source.fileref) || this.normalizeString(source.file_ref);
    const definition = this.toRecord(source.definition) || this.toRecord(source.schema);
    if (fileRef == undefined && definition == undefined) {
      return undefined;
    }
    const apiInterface = new EntityApiInterface();
    apiInterface.fileRef = fileRef;
    apiInterface.definition = definition;
    return apiInterface;
  }

  private cloneJsonObject<T>(value: T | undefined): T | undefined {
    if (value == null) {
      return undefined;
    }
    return JSON.parse(JSON.stringify(value)) as T;
  }

  private addIdentityFromSuggestion(identityKey: string, identityValue: string): void {
    if (this.identities.some(identity => identity.identityKey === identityKey && identity.identityValue === identityValue)) {
      return;
    }
    const identity = new EntityIdentity();
    identity.identityType = 'otel_resource';
    identity.identityKey = identityKey;
    identity.identityValue = identityValue;
    identity.priority = this.defaultIdentityPriority(identityKey);
    identity.primaryIdentity = this.identities.length === 0;
    this.entityDto.identities = [...this.identities, identity];
  }

  private addMonitorBind(monitorId: number): void {
    if (this.isMonitorBound(monitorId)) {
      return;
    }
    const bind = new EntityMonitorBind();
    bind.monitorId = monitorId;
    bind.bindType = 'manual';
    bind.bindSource = 'manual';
    bind.status = 'active';
    bind.score = 100;
    this.entityDto.monitorBinds = [...this.monitorBinds, bind];
  }

  private addRelation(targetEntityId: number, relationType = 'depends_on'): void {
    if (this.entityId != undefined && targetEntityId === this.entityId) {
      this.notifySvc.warning(
        this.translateOrFallback('entity.section.relations', 'Relations'),
        this.translateOrFallback('entity.relation.self-invalid', 'The relation target cannot be the current entity.')
      );
      return;
    }
    if (this.hasRelationTarget(targetEntityId)) {
      return;
    }
    const relation = new EntityRelation();
    if (this.isEditMode && this.entityId != undefined) {
      relation.sourceEntityId = this.entityId;
    }
    relation.targetEntityId = targetEntityId;
    relation.relationType = relationType;
    relation.relationSource = 'manual';
    relation.status = 'confirmed';
    relation.score = 100;
    this.entityDto.relations = [...this.relations, relation];
  }

  private populateTelemetryDiscovery(monitors: Monitor[]): void {
    this.telemetryDiscoveryScope = 'all';
    if (monitors.length === 0) {
      this.telemetryDiscoveryLoading = false;
      this.telemetryDiscoveryResults = [];
      return;
    }
    if (this.entrySource !== 'telemetry') {
      this.telemetryDiscoveryLoading = false;
      this.telemetryDiscoveryResults = monitors.map(monitor => this.buildTelemetryDiscoveryResult(monitor, []));
      return;
    }
    this.telemetryDiscoveryLoading = true;
    const requests = monitors.map(monitor =>
      this.entitySvc.getMonitorBindingCandidates(monitor.id).pipe(
        catchError(() =>
          of({
            code: 1,
            msg: 'candidate lookup failed',
            data: []
          } as Message<EntityMonitorBindingCandidate[]>)
        )
      )
    );
    forkJoin(requests).subscribe({
      next: responses => {
        this.telemetryDiscoveryLoading = false;
        this.telemetryDiscoveryResults = monitors.map((monitor, index) => {
          const response = responses[index];
          return this.buildTelemetryDiscoveryResult(monitor, response.code === 0 ? response.data || [] : []);
        });
      },
      error: () => {
        this.telemetryDiscoveryLoading = false;
        this.telemetryDiscoveryResults = monitors.map(monitor => this.buildTelemetryDiscoveryResult(monitor, []));
      }
    });
  }

  private buildTelemetryDiscoveryResult(monitor: Monitor, candidates: EntityMonitorBindingCandidate[]): TelemetryDiscoveryResult {
    const identityMatches = this.extractTelemetryIdentityMatches(monitor);
    const inferredType = this.inferTelemetryEntityType(monitor, identityMatches);
    const inferredNamespace =
      findTelemetryIdentityValue(identityMatches, 'service.namespace') ||
      findTelemetryIdentityValue(identityMatches, 'k8s.namespace.name');
    const inferredEnvironment = findTelemetryIdentityValue(identityMatches, 'deployment.environment.name');
    return {
      monitor,
      inferredType,
      inferredName: this.inferTelemetryEntityName(monitor, inferredType, identityMatches),
      inferredDisplayName: this.trimText(monitor.name),
      inferredNamespace,
      inferredEnvironment,
      inferredOwner: this.lookupTelemetryContext(monitor, ['team', 'owner', 'service.owner']),
      inferredRunbook: this.lookupTelemetryContext(monitor, ['runbook', 'service.runbook', 'documentation']),
      inferredLabels: this.inferTelemetryLabels(monitor),
      identityMatches,
      candidates
    };
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

  private inferTelemetryLabels(monitor: Monitor): KeyValueDraft[] {
    const labels: KeyValueDraft[] = [];
    this.catalogLabelPresets.forEach(labelKey => {
      const value = this.lookupTelemetryContext(monitor, [labelKey]);
      if (value != null) {
        labels.push({ key: labelKey, value });
      }
    });
    return labels;
  }

  private applyTelemetryLabels(labels: KeyValueDraft[]): void {
    const merged = new Map<string, string>();
    this.labelDrafts.forEach(label => {
      const key = this.trimText(label.key);
      const value = this.trimText(label.value);
      if (key != null && value != null) {
        merged.set(key, value);
      }
    });
    labels.forEach(label => {
      const key = this.trimText(label.key);
      const value = this.trimText(label.value);
      if (key != null && value != null && !merged.has(key)) {
        merged.set(key, value);
      }
    });
    this.labelDrafts = Array.from(merged.entries()).map(([key, value]) => ({ key, value }));
  }

  private ensurePrimaryIdentity(preferredKey: string): void {
    if (this.identities.length === 0) {
      return;
    }
    const nextIdentities = this.identities.map(identity => Object.assign(new EntityIdentity(), identity));
    let primaryIndex = nextIdentities.findIndex(identity => identity.primaryIdentity);
    if (primaryIndex < 0) {
      primaryIndex = nextIdentities.findIndex(identity => identity.identityKey === preferredKey);
    }
    if (primaryIndex < 0) {
      primaryIndex = 0;
    }
    nextIdentities.forEach((identity, index) => {
      identity.primaryIdentity = index === primaryIndex;
    });
    this.entityDto.identities = nextIdentities;
  }

  hasProfileReady(): boolean {
    return this.trimText(this.entity.type) != null && this.trimText(this.entity.name) != null;
  }

  hasEvidenceReady(): boolean {
    return this.monitorBinds.length > 0 || this.identities.length > 0;
  }

  hasOwnerReady(): boolean {
    return this.trimText(this.entity.owner) != null || this.trimText(this.entity.runbook) != null || this.validContacts.length > 0;
  }

  hasContextReady(): boolean {
    return (
      this.relations.length > 0 ||
      this.labelCount > 0 ||
      this.validLinks.length > 0 ||
      this.trimText(this.entity.description) != null ||
      this.trimText(this.entity.lifecycle) != null ||
      this.trimText(this.entity.tier) != null ||
      this.trimText(this.entity.system) != null ||
      this.buildStringList(this.implementedByDraft, this.entity.implementedBy).length > 0 ||
      this.buildApiInterface() != null
    );
  }

  private resolveRelationTargets(): void {
    const relationTargetIds = Array.from(
      new Set(this.relations.map(relation => relation.targetEntityId).filter((value): value is number => value != null))
    );
    if (relationTargetIds.length === 0) {
      this.relationTargetMap = {};
      return;
    }
    this.entitySvc.searchEntitiesByIds(relationTargetIds).subscribe({
      next: message => {
        if (message.code !== 0) {
          return;
        }
        const targetMap = { ...this.relationTargetMap };
        (message.data?.content || []).forEach(summary => {
          targetMap[summary.entity.id] = summary.entity;
        });
        this.relationTargetMap = targetMap;
      }
    });
  }

  private resolveMonitorBindPreviews(): void {
    const monitorIds = Array.from(new Set(this.monitorBinds.map(bind => bind.monitorId).filter((value): value is number => value != null && value > 0)));
    if (monitorIds.length === 0) {
      this.monitorPreviewMap = {};
      return;
    }
    const requests = monitorIds.map(monitorId =>
      this.monitorSvc.getMonitor(monitorId).pipe(
        catchError(() =>
          of({
            code: 1,
            msg: 'monitor lookup failed'
          } as Message<Monitor>)
        )
      )
    );
    forkJoin(requests).subscribe(results => {
      const nextMap = { ...this.monitorPreviewMap };
      results.forEach(result => {
        const monitor = this.extractMonitorFromMessage(result);
        if (monitor != null) {
          nextMap[monitor.id] = monitor;
        }
      });
      this.monitorPreviewMap = nextMap;
    });
  }

  private extractMonitorFromMessage(message: Message<Monitor>): Monitor | undefined {
    if (message.code !== 0) {
      return undefined;
    }
    return ((message.data as { monitor?: Monitor } | undefined)?.monitor ?? message.data) as Monitor | undefined;
  }

  private get currentEntityReference(): string | undefined {
    const entityType = this.trimText(this.entity.type);
    const entityName = this.trimText(this.entity.name);
    if (entityType == null || entityName == null) {
      return undefined;
    }
    const namespace = this.trimText(this.entity.namespace) || 'default';
    return `${entityType}:${namespace}/${entityName}`;
  }

  private trimText(value?: string): string | undefined {
    if (value == null) {
      return undefined;
    }
    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
  }

  private appendDraftValue(currentValue: string, nextValue: string): string {
    const existing = this.buildStringList(currentValue);
    if (existing.includes(nextValue)) {
      return existing.join(', ');
    }
    return [...existing, nextValue].join(', ');
  }

  private seedCatalogTagPreset(value: string): void {
    const normalized = this.trimText(value);
    if (normalized == null) {
      return;
    }
    const prefix = normalized.endsWith(':') ? normalized : `${normalized}:`;
    if (this.catalogTagsInput.startsWith(prefix)) {
      return;
    }
    this.catalogTagsInput = prefix;
  }

  private setDraftInputValue(field: DraftListField, value: string): void {
    switch (field) {
      case 'componentOfDraft':
        this.componentOfInput = value;
        break;
      case 'componentsDraft':
        this.componentsInput = value;
        break;
      case 'implementedByDraft':
        this.implementedByInput = value;
        break;
      case 'languagesDraft':
        this.languagesInput = value;
        break;
      case 'catalogTagsDraft':
        this.catalogTagsInput = value;
        break;
      case 'performanceTagsDraft':
        this.performanceTagsInput = value;
        break;
      case 'pipelineFingerprintsDraft':
        this.pipelineFingerprintsInput = value;
        break;
      default:
        break;
    }
  }

  private getStructuredItemTemplateLabel(kind: 'link' | 'contact', type: string): string {
    if (kind === 'link') {
      switch (type) {
        case 'dashboard':
          return this.translateOrFallback('entity.link.template.dashboard', 'Dashboard');
        case 'repository':
          return this.translateOrFallback('entity.link.template.repository', 'Repository');
        case 'documentation':
          return this.translateOrFallback('entity.link.template.documentation', 'Documentation');
        case 'api':
          return this.translateOrFallback('entity.link.template.api', 'API');
        case 'oncall':
          return this.translateOrFallback('entity.link.template.oncall', 'On-call');
        default:
          return this.translateOrFallback('entity.link.template.generic', 'Link');
      }
    }
    switch (type) {
      case 'team':
        return this.translateOrFallback('entity.contact.template.team', 'Team');
      case 'slack':
        return this.translateOrFallback('entity.contact.template.slack', 'Slack');
      case 'email':
        return this.translateOrFallback('entity.contact.template.email', 'Email');
      case 'oncall':
        return this.translateOrFallback('entity.contact.template.oncall', 'On-call');
      case 'webhook':
        return this.translateOrFallback('entity.contact.template.webhook', 'Webhook');
      default:
        return this.translateOrFallback('entity.contact.template.generic', 'Contact');
    }
  }

  private getStructuredValidationError(): string | undefined {
    if (this.runbookValidationMessage != null) {
      return this.runbookValidationMessage;
    }
    const invalidLink = this.linkDrafts.find(link => this.getLinkValidationMessage(link) != null);
    if (invalidLink != null) {
      return this.getLinkValidationMessage(invalidLink);
    }
    const invalidContact = this.contactDrafts.find(contact => this.getContactValidationMessage(contact) != null);
    if (invalidContact != null) {
      return this.getContactValidationMessage(invalidContact);
    }
    const invalidIdentity = this.identities.find(identity => this.getIdentityValidationMessage(identity) != null);
    if (invalidIdentity != null) {
      return this.getIdentityValidationMessage(invalidIdentity);
    }
    const invalidLabel = this.labelDrafts.find(label => this.getLabelValidationMessage(label) != null);
    if (invalidLabel != null) {
      return this.getLabelValidationMessage(invalidLabel);
    }
    const invalidCodeLocation = this.codeLocationDrafts.find(item => this.getCodeLocationValidationMessage(item) != null);
    if (invalidCodeLocation != null) {
      return this.getCodeLocationValidationMessage(invalidCodeLocation);
    }
    const invalidEventQuery = this.eventQueryDrafts.find(item => this.getSavedQueryValidationMessage(item, 'events') != null);
    if (invalidEventQuery != null) {
      return this.getSavedQueryValidationMessage(invalidEventQuery, 'events');
    }
    const invalidLogQuery = this.logQueryDrafts.find(item => this.getSavedQueryValidationMessage(item, 'logs') != null);
    if (invalidLogQuery != null) {
      return this.getSavedQueryValidationMessage(invalidLogQuery, 'logs');
    }
    const apiInterfaceValidationMessage = this.getApiInterfaceValidationMessage();
    if (apiInterfaceValidationMessage != null) {
      return apiInterfaceValidationMessage;
    }
    const integrationsValidationMessage = this.getIntegrationsValidationMessage();
    if (integrationsValidationMessage != null) {
      return integrationsValidationMessage;
    }
    const extensionsValidationMessage = this.getExtensionsValidationMessage();
    if (extensionsValidationMessage != null) {
      return extensionsValidationMessage;
    }
    return undefined;
  }

  private normalizeStructuredDraftStateBeforeSave(): void {
    this.entity.additionalOwners = (this.entity.additionalOwners || []).filter(owner => this.trimText(owner?.name) != null);
    this.linkDrafts = this.linkDrafts.filter(
      draft => this.trimText(draft.name) != null || this.trimText(draft.provider) != null || this.trimText(draft.url) != null
    );
    this.contactDrafts = this.contactDrafts.filter(draft => this.trimText(draft.name) != null || this.trimText(draft.value) != null);
    this.labelDrafts = this.labelDrafts.filter(draft => this.trimText(draft.key) != null || this.trimText(draft.value) != null);
    this.codeLocationDrafts = this.codeLocationDrafts.filter(
      draft => this.trimText(draft.repositoryURL) != null || this.buildStringList(draft.paths).length > 0
    );
    this.eventQueryDrafts = this.eventQueryDrafts.filter(
      draft => this.trimText(draft.name) != null || this.trimText(draft.query) != null
    );
    this.logQueryDrafts = this.logQueryDrafts.filter(
      draft => this.trimText(draft.name) != null || this.trimText(draft.query) != null
    );
    this.entityDto.identities = this.identities.filter(
      identity => this.trimText(identity.identityKey) != null || this.trimText(identity.identityValue) != null
    );
    if (this.identities.length > 0 && !this.identities.some(identity => identity.primaryIdentity)) {
      this.ensurePrimaryIdentity(this.primaryIdentityKeyForType(this.entity.type || 'service'));
    }
  }

  private getUrlValidationMessage(value: string | undefined, label: string): string | undefined {
    const normalized = this.trimText(value);
    if (normalized == null) {
      return undefined;
    }
    if (this.isValidUrl(normalized)) {
      return undefined;
    }
    return `${label}${this.translateOrFallback('entity.validation.url', ' 需要是有效的 http(s) 链接。')}`;
  }

  private isValidUrl(value: string): boolean {
    try {
      const parsed = new URL(value);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  private isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  private getJsonObjectDraftValidationMessage(value: string, i18nKey: string, fallback: string): string | undefined {
    const normalized = this.trimText(value);
    if (normalized == null) {
      return undefined;
    }
    try {
      this.parseJsonDraftObject(normalized, this.translateOrFallback(i18nKey, fallback), true);
      return undefined;
    } catch (error) {
      return error instanceof Error ? error.message : this.translateOrFallback(i18nKey, fallback);
    }
  }

  private defaultIdentityPriority(identityKey?: string): number {
    return getEntityIdentityPriority(identityKey);
  }

  private backToEntityList(): void {
    if (this.openDefinitionWorkspaceResume()) {
      return;
    }
    this.router.navigate(['/entities'], { queryParams: this.listQueryParams });
  }

  private getMonitorCenterQueryParams(): Record<string, string | number | null> {
    return {
      entityId: this.entityId != undefined ? `${this.entityId}` : null,
      entityName: this.getWorkspaceEntityLabel(),
      returnTo: this.router.url,
      returnLabel: this.getWorkspaceEntityLabel()
    };
  }

  private getLogManageQueryParams(): Record<string, string | number | null> {
    return {
      entityId: this.entityId != undefined ? `${this.entityId}` : null,
      entityName: this.getWorkspaceEntityLabel(),
      serviceName: this.trimText(this.entity.name) || null,
      serviceNamespace: this.trimText(this.entity.namespace) || null,
      environment: this.trimText(this.entity.environment) || null,
      search: this.getWorkspaceEntityLabel(),
      returnTo: this.router.url,
      returnLabel: this.getWorkspaceEntityLabel()
    };
  }

  private getTraceCenterQueryParams(): Record<string, string | number | null> {
    return {
      entityId: this.entityId != undefined ? `${this.entityId}` : null,
      entityName: this.getWorkspaceEntityLabel(),
      serviceName: this.trimText(this.entity.name) || null,
      serviceNamespace: this.trimText(this.entity.namespace) || null,
      environment: this.trimText(this.entity.environment) || null,
      returnTo: this.router.url,
      returnLabel: this.getWorkspaceEntityLabel()
    };
  }

  private getWorkspaceEntityLabel(): string {
    return this.trimText(this.entity.displayName) || this.trimText(this.entity.name) || this.translateOrFallback('entity.detail', '实体工作台');
  }

  private buildEditSuccessReturnUrl(payload: EntityDto): string | undefined {
    const returnTo = this.getRouteQueryParam('returnTo');
    if (!this.isEditMode || returnTo == null) {
      return undefined;
    }
    const responseResultParams = this.buildEditSuccessResponseResultParams(payload);
    if (Object.keys(responseResultParams).length === 0) {
      return returnTo;
    }
    return this.appendQueryParamsToUrl(returnTo, responseResultParams);
  }

  private buildEditSuccessResponseResultParams(payload: EntityDto): Record<string, string> {
    if (this.getRouteQueryParam('focus') !== 'relations') {
      return {};
    }
    const relationCount = Math.max(
      (payload.relations || []).filter(relation => relation.targetEntityId != null || this.trimText(relation.targetRef) != null).length,
      1
    );
    return {
      responseResultKind: 'relations',
      responseResultAction: 'update',
      responseResultCount: `${relationCount}`
    };
  }

  private getRouteQueryParam(key: string): string | undefined {
    const value = this.route.snapshot.queryParams?.[key];
    return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;
  }

  private appendQueryParamsToUrl(url: string, params: Record<string, string>): string {
    const [base, hash] = url.split('#', 2);
    const [path, queryString = ''] = base.split('?', 2);
    const searchParams = new URLSearchParams(queryString);
    Object.entries(params).forEach(([key, value]) => {
      searchParams.set(key, value);
    });
    const nextQuery = searchParams.toString();
    const nextUrl = nextQuery !== '' ? `${path}?${nextQuery}` : path;
    return hash != null ? `${nextUrl}#${hash}` : nextUrl;
  }

  private openDefinitionWorkspaceResume(createdEntityId?: number): boolean {
    const token = this.definitionResumeToken;
    if (!token) {
      return false;
    }
    const navigateToWorkspace = (resumeState?: { queryParams?: Record<string, string>; format?: string }) => {
      this.router.navigate(['/entities', 'import'], {
        queryParams: {
          ...(resumeState?.queryParams || {}),
          format: resumeState?.format || 'yaml',
          resumeDefinitionToken: token,
          resumeHandledRowKey: createdEntityId != null ? this.definitionResumeHandledRowKey || null : null,
          resumeHandledEntityId: createdEntityId != null ? createdEntityId : null
        }
      });
    };
    const resumeState = readDefinitionWorkspaceResumeState(token);
    if (resumeState != null) {
      navigateToWorkspace(resumeState);
      return true;
    }
    this.entitySvc
      .getDefinitionWorkspaceResume(token)
      .pipe(catchError(() => of(undefined)))
      .subscribe(message => navigateToWorkspace(message?.data));
    return true;
  }

  openGovernancePresetDiscovery(): void {
    const preset = this.governancePresetSeed;
    if (preset == null) {
      return;
    }
    this.router.navigate(['/entities', 'discovery'], {
      queryParams: {
        ...this.listQueryParams,
        ...buildGovernancePresetQueryParams(preset),
        owner: this.trimText(preset.bulkOwner || preset.owner) || null,
        system: this.trimText(preset.bulkSystem || preset.system) || null,
        environment: this.trimText(preset.environment) || null,
        source: this.trimText(preset.source) || null
      }
    });
  }

  focusGovernancePresetConflict(): void {
    const fields = this.getGovernancePresetConflictFields(this.entity, this.governancePresetSeed);
    if (fields.length === 0) {
      this.openGovernancePresetDiscovery();
      return;
    }
    this.scrollToSection(this.resolveGovernanceConflictSectionId(fields[0]));
  }

  private recordGovernancePresetEditorActivity(): void {
    const preset = this.governancePresetSeed;
    if (preset == null) {
      return;
    }
    const activityId = [
      'governance-preset-editor',
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
        format: this.editorSurfaceMode === 'json' ? 'json' : 'yaml',
        summary: this.translateOrFallback('entity.definition.workspace.activity.preset-applied', '已套用共享治理预设'),
        detail,
        entityId: this.entityId,
        entityName: this.trimText(this.entity.displayName) || this.trimText(this.entity.name)
      })
      .subscribe();
  }

  private extractListQueryParams(queryParams: Record<string, unknown>): Record<string, string | number | null> {
    const nextParams: Record<string, string | number | null> = {};
    Object.entries(queryParams || {}).forEach(([key, value]) => {
      if (
        key === 'surface' ||
        key === 'definitionFormat' ||
        key === 'entrySource' ||
        key === 'monitorId' ||
        key === 'focus' ||
        isGovernancePresetQueryKey(key)
      ) {
        return;
      }
      if (typeof value === 'string' || typeof value === 'number') {
        nextParams[key] = value;
      }
    });
    return nextParams;
  }

  private applyRequestedFocus(): void {
    if (this.pendingFocusSectionId == null) {
      return;
    }
    const nextSectionId = this.pendingFocusSectionId;
    this.pendingFocusSectionId = undefined;
    this.scrollToSection(nextSectionId);
  }

  private resolveRequestedFocusSectionId(value?: string | null): string | undefined {
    switch (value) {
      case 'basic':
        return 'section-basic';
      case 'ownership':
      case 'runbook':
      case 'catalog':
        return 'section-ownership';
      case 'identities':
        return 'section-identities';
      case 'monitors':
      case 'evidence':
        return 'section-monitors';
      case 'relations':
        return 'section-relations';
      case 'hertzbeat':
        return 'section-hertzbeat';
      default:
        return undefined;
    }
  }

  private applySeedEntityDtoRouteState(): void {
    if (this.isEditMode) {
      return;
    }
    const navigationState = this.router.getCurrentNavigation()?.extras.state as Record<string, unknown> | undefined;
    const historyState = window.history.state as Record<string, unknown> | undefined;
    const seedEntityDto = (navigationState?.seedEntityDto as EntityDto | undefined) || (historyState?.seedEntityDto as EntityDto | undefined);
    if (seedEntityDto == null || seedEntityDto.entity == null) {
      return;
    }
    const signature = this.getSeedEntityDtoSignature(seedEntityDto);
    if (signature === this.appliedSeedEntityDtoSignature) {
      return;
    }
    this.appliedSeedEntityDtoSignature = signature;
    this.applyParsedEntityDto(seedEntityDto);
  }

  private getSeedEntityDtoSignature(seed: EntityDto): string {
    const entity = seed.entity || ({} as Entity);
    return `${entity.type || 'entity'}:${entity.namespace || 'default'}:${entity.name || entity.displayName || 'draft'}`;
  }

  private applyGovernancePresetSeedValues(onlyFillMissing = true): void {
    const preset = this.governancePresetSeed;
    if (preset == null) {
      return;
    }
    const presetOwner = this.trimText(preset.bulkOwner || preset.owner);
    const presetSystem = this.trimText(preset.bulkSystem || preset.system);
    const presetEnvironment = this.trimText(preset.environment);
    const presetSource = this.trimText(preset.source);

    if (!onlyFillMissing || this.trimText(this.entity.owner) == null) {
      this.entity.owner = presetOwner;
    }
    if (!onlyFillMissing || this.trimText(this.entity.system) == null) {
      this.entity.system = presetSystem;
    }
    if (!onlyFillMissing || this.trimText(this.entity.environment) == null) {
      this.entity.environment = presetEnvironment;
    }
    if (presetSource != null) {
      const currentSource = this.trimText(this.entity.source);
      const shouldApplySource =
        !onlyFillMissing ||
        currentSource == null ||
        (!this.isEditMode && this.entrySource !== 'telemetry' && currentSource === 'manual');
      if (shouldApplySource) {
        this.entity.source = presetSource;
      }
    }
  }

  private getGovernancePresetConflictFields(
    entity: Entity,
    preset?: EntityDiscoveryGovernancePreset
  ): GovernanceConflictField[] {
    if (preset == null) {
      return [];
    }
    const fields: GovernanceConflictField[] = [];
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

  private resolveGovernanceConflictSectionId(field: GovernanceConflictField): string {
    switch (field) {
      case 'owner':
      case 'system':
        return 'section-ownership';
      case 'environment':
      case 'source':
      case 'status':
      default:
        return 'section-basic';
    }
  }

  private parseDefinitionDraft(input: string): Record<string, unknown> {
    const payload = this.extractCurlPayload(input) || input;
    try {
      const parsedJson = JSON.parse(payload);
      return this.ensureDefinitionRecord(parsedJson);
    } catch {
      const parsedYaml = this.parseYamlDefinition(payload);
      return this.ensureDefinitionRecord(parsedYaml);
    }
  }

  private ensureDefinitionRecord(value: unknown): Record<string, unknown> {
    if (value == null || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error(this.translateOrFallback('entity.definition.import.invalid', 'The definition must be a YAML or JSON object.'));
    }
    return value as Record<string, unknown>;
  }

  private applyDefinitionObject(definition: Record<string, unknown>): void {
    const metadata = this.toRecord(definition.metadata);
    const spec = this.toRecord(definition.spec);
    const telemetry = this.toRecord(spec?.telemetry);
    const entity = Object.assign(new Entity(), this.entity);
    entity.type = this.resolveDefinitionEntityType(definition, spec) || entity.type || 'service';
    entity.name = this.normalizeString(metadata?.name) || entity.name || '';
    entity.displayName = this.normalizeString(metadata?.displayName);
    entity.subtype = this.resolveDefinitionSubtype(spec, entity.type);
    entity.description = this.normalizeString(metadata?.description) || this.normalizeString(spec?.description);
    entity.owner = this.normalizeString(metadata?.owner) || this.normalizeString(spec?.ownedBy) || this.normalizeString(spec?.owner);
    entity.additionalOwners = this.mapDefinitionOwnerRefs(metadata?.additionalOwners || spec?.additionalOwners || spec?.owners);
    entity.inheritFrom = this.normalizeString(metadata?.inheritFrom) || this.normalizeString(metadata?.inherit_from);
    entity.namespace = this.normalizeString(metadata?.namespace) || this.normalizeString(spec?.namespace);
    entity.environment = this.normalizeString(spec?.environment);
    entity.criticality = this.normalizeString(spec?.criticality);
    entity.source = this.normalizeString(spec?.source) || entity.source || 'manual';
    entity.runbook = this.normalizeString(spec?.runbook) || this.extractRunbook(metadata?.links || spec?.links);
    entity.lifecycle = this.normalizeString(spec?.lifecycle);
    entity.tier = this.normalizeString(spec?.tier);
    entity.componentOf = this.mapDefinitionStringList(spec?.componentOf);
    entity.components = this.mapDefinitionStringList(spec?.components);
    entity.system =
      this.normalizeString(spec?.partOf) ||
      this.normalizeString(spec?.system) ||
      this.normalizeString(spec?.systemName) ||
      this.normalizeString(spec?.system_name) ||
      entity.componentOf[0];
    entity.implementedBy = this.mapDefinitionStringList(spec?.implementedBy);
    entity.apiInterface = this.normalizeApiInterface(spec?.interface || definition.interface);
    entity.languages = this.mapDefinitionStringList(spec?.languages);
    entity.links = this.mapDefinitionLinks(metadata?.links || spec?.links, entity.runbook);
    entity.contacts = this.mapDefinitionContacts(metadata?.contacts || spec?.contacts);
    entity.tags = this.mapDefinitionStringList(metadata?.tags);
    entity.integrations = this.normalizeRecordValue(definition.integrations);
    entity.extensions = this.normalizeRecordValue(definition.extensions);
    entity.hertzbeat = this.normalizeHertzBeatConfig(definition.hertzbeat);

    const nextDto = new EntityDto();
    nextDto.entity = entity;
    nextDto.identities = this.mapDefinitionIdentities(telemetry?.identities);
    nextDto.monitorBinds = this.mapDefinitionMonitorBinds(telemetry?.monitors);
    nextDto.relations = this.mapDefinitionRelations(spec?.relations || spec?.dependencies || spec?.dependsOn);
    this.entityDto = nextDto;
    this.syncDraftStateFromEntity();
    this.entrySource = 'definition';
    this.activeTabIndex = 0;
    this.resolveRelationTargets();
  }

  private normalizeDefinitionKind(value: unknown): string | undefined {
    const kind = this.normalizeString(value);
    if (kind == undefined) {
      return undefined;
    }
    switch (kind.toLowerCase()) {
      case 'entity':
        return undefined;
      case 'datastore':
        return 'database';
      case 'api':
        return 'api';
      default:
        return kind.toLowerCase();
    }
  }

  private normalizeSupportedEntityType(value: unknown): string | undefined {
    const normalized = this.normalizeDefinitionKind(value);
    if (normalized == undefined) {
      return undefined;
    }
    return this.typeOptions.includes(normalized) ? normalized : undefined;
  }

  private resolveDefinitionEntityType(definition: Record<string, unknown>, spec?: Record<string, unknown>): string | undefined {
    return this.normalizeSupportedEntityType(definition.kind)
      || this.normalizeSupportedEntityType(spec?.entityType)
      || this.normalizeSupportedEntityType(spec?.entity_type)
      || this.normalizeSupportedEntityType(spec?.type)
      || 'service';
  }

  private resolveDefinitionSubtype(spec?: Record<string, unknown>, entityType?: string): string | undefined {
    const explicitSubtype = this.normalizeString(spec?.subtype)
      || this.normalizeString(spec?.serviceType)
      || this.normalizeString(spec?.resourceType);
    if (explicitSubtype != undefined) {
      return explicitSubtype;
    }
    const rawType = this.normalizeString(spec?.type);
    if (rawType == undefined) {
      return undefined;
    }
    const supportedEntityType = this.normalizeSupportedEntityType(rawType);
    if (supportedEntityType != undefined && supportedEntityType === entityType) {
      return undefined;
    }
    return rawType;
  }

  private toDefinitionKind(value?: string): string | undefined {
    const normalized = this.normalizeString(value);
    switch (normalized) {
      case 'database':
        return 'datastore';
      case 'api':
        return 'api';
      case 'endpoint':
        return 'endpoint';
      default:
        return normalized;
    }
  }

  private extractCurlPayload(input: string): string | undefined {
    const normalized = input.trim();
    const singleQuoteIndex = normalized.indexOf("-d '");
    if (singleQuoteIndex >= 0) {
      const payloadStart = singleQuoteIndex + 4;
      const payloadEnd = normalized.lastIndexOf("'");
      if (payloadEnd > payloadStart) {
        return normalized
          .slice(payloadStart, payloadEnd)
          .replace(/'\\\\''/g, "'")
          .replace(/\\\\/g, '\\');
      }
    }
    const doubleQuoteIndex = normalized.indexOf('-d "');
    if (doubleQuoteIndex >= 0) {
      const payloadStart = doubleQuoteIndex + 4;
      const payloadEnd = normalized.lastIndexOf('"');
      if (payloadEnd > payloadStart) {
        return normalized.slice(payloadStart, payloadEnd).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
      }
    }
    return undefined;
  }

  private toRecord(value: unknown): Record<string, unknown> | undefined {
    if (value == null || typeof value !== 'object' || Array.isArray(value)) {
      return undefined;
    }
    return value as Record<string, unknown>;
  }

  private normalizeString(value: unknown): string | undefined {
    return typeof value === 'string' ? this.trimText(value) : undefined;
  }

  private mapDefinitionIdentities(value: unknown): EntityIdentity[] {
    if (!Array.isArray(value)) {
      return [];
    }
    return value
      .map(item => this.toRecord(item))
      .filter((item): item is Record<string, unknown> => item != null)
      .map(item => {
        const identity = new EntityIdentity();
        identity.identityKey = this.normalizeString(item.key) || '';
        identity.identityValue = this.normalizeString(item.value) || '';
        identity.identityType = this.normalizeString(item.type) || 'manual';
        identity.priority = this.defaultIdentityPriority(identity.identityKey);
        identity.primaryIdentity = Boolean(item.primary);
        return identity;
      })
      .filter(identity => identity.identityKey !== '' && identity.identityValue !== '');
  }

  private mapDefinitionMonitorBinds(value: unknown): EntityMonitorBind[] {
    if (!Array.isArray(value)) {
      return [];
    }
    return value
      .map(item => this.toRecord(item))
      .filter((item): item is Record<string, unknown> => item != null)
      .map(item => {
        const bind = new EntityMonitorBind();
        bind.monitorId = Number(item.monitorId);
        bind.bindType = this.normalizeString(item.bindType) || 'manual';
        bind.bindSource = this.normalizeString(item.bindSource) || 'manual';
        bind.status = this.normalizeString(item.status) || 'active';
        bind.score = Number(item.score) || 100;
        return bind;
      })
      .filter(bind => !Number.isNaN(bind.monitorId) && bind.monitorId > 0);
  }

  private mapDefinitionRelations(value: unknown): EntityRelation[] {
    if (!Array.isArray(value)) {
      return [];
    }
    return value
      .map(item => {
        if (typeof item === 'string' || typeof item === 'number') {
          return typeof item === 'number'
            ? ({ targetEntityId: item, relationType: 'depends_on' } as Record<string, unknown>)
            : ({ targetRef: item, relationType: 'depends_on' } as Record<string, unknown>);
        }
        return this.toRecord(item);
      })
      .filter((item): item is Record<string, unknown> => item != null)
      .map(item => {
        const relation = new EntityRelation();
        if (this.isEditMode && this.entityId != undefined) {
          relation.sourceEntityId = this.entityId;
        }
        const rawTargetEntityId = Number(item.targetEntityId);
        relation.targetEntityId = Number.isNaN(rawTargetEntityId) || rawTargetEntityId <= 0 ? undefined : rawTargetEntityId;
        relation.targetRef = this.normalizeString(item.targetRef) || this.normalizeString(item.ref);
        relation.relationType = this.normalizeString(item.relationType) || 'depends_on';
        relation.relationSource = this.normalizeString(item.relationSource) || 'manual';
        relation.status = this.normalizeString(item.status) || 'confirmed';
        relation.description = this.normalizeString(item.description);
        relation.score = Number(item.score) || 100;
        return relation;
      })
      .filter(relation => (relation.targetEntityId != null && relation.targetEntityId > 0) || this.trimText(relation.targetRef) != null);
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

  private mapDefinitionStringList(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }
    return value
      .map(item => {
        if (typeof item === 'string') {
          return this.normalizeString(item);
        }
        if (item != null && typeof item === 'object') {
          const record = this.toRecord(item);
          return this.normalizeString(record?.name) || this.normalizeString(record?.team) || this.normalizeString(record?.value);
        }
        return undefined;
      })
      .filter((item): item is string => item != null && item !== '');
  }

  private mapDefinitionOwnerRefs(value: unknown): EntityOwnerRef[] {
    if (!Array.isArray(value)) {
      return [];
    }
    return value
      .map(item => {
        if (typeof item === 'string') {
          return { name: item.trim(), type: 'team' } as EntityOwnerRef;
        }
        const record = this.toRecord(item);
        const name =
          this.normalizeString(record?.name) || this.normalizeString(record?.team) || this.normalizeString(record?.value) || undefined;
        if (name == undefined) {
          return undefined;
        }
        const owner = new EntityOwnerRef();
        owner.name = name;
        owner.type = this.normalizeString(record?.type) || 'team';
        return owner;
      })
      .filter((item): item is EntityOwnerRef => item != null);
  }

  private mapDefinitionTags(value: unknown): KeyValueDraft[] {
    if (!Array.isArray(value)) {
      return [];
    }
    return value
      .flatMap(item => {
        if (typeof item !== 'string') {
          return [];
        }
        const separatorIndex = item.indexOf(':');
        if (separatorIndex <= 0 || separatorIndex === item.length - 1) {
          return [{ key: item.trim(), value: '' }];
        }
        return [
          {
            key: item.slice(0, separatorIndex).trim(),
            value: item.slice(separatorIndex + 1).trim()
          }
        ];
      })
      .filter(item => item.key !== '');
  }

  private mapDefinitionLabels(metadata?: Record<string, unknown>): KeyValueDraft[] {
    const labels = this.toRecord(metadata?.labels);
    if (labels != undefined) {
      return Object.entries(labels)
        .map(([key, value]) => ({ key, value: this.normalizeString(value) || '' }))
        .filter(item => item.key.trim() !== '');
    }
    return this.mapDefinitionTags(metadata?.tags);
  }

  private mapDefinitionLinks(value: unknown, runbook?: string): EntityCatalogLink[] {
    const nextLinks: EntityCatalogLink[] = [];
    if (Array.isArray(value)) {
      value
        .map(item => this.toRecord(item))
        .filter((item): item is Record<string, unknown> => item != null)
        .forEach(item => {
          const url = this.normalizeString(item.url) || this.normalizeString(item.href);
          if (url == null) {
            return;
          }
          const link = new EntityCatalogLink();
          link.name = this.normalizeString(item.name) || this.normalizeString(item.label);
          link.type = this.normalizeString(item.type) || 'link';
          link.provider = this.normalizeString(item.provider);
          link.url = url;
          nextLinks.push(link);
        });
    } else if (value != null && typeof value === 'object' && !Array.isArray(value)) {
      Object.entries(value as Record<string, unknown>).forEach(([key, raw]) => {
        const url = this.normalizeString(raw);
        if (url == null) {
          return;
        }
        const link = new EntityCatalogLink();
        link.name = key;
        link.type = key === 'runbook' ? 'runbook' : 'link';
        link.provider = key === 'runbook' ? 'manual' : undefined;
        link.url = url;
        nextLinks.push(link);
      });
    }
    if (runbook != null && !nextLinks.some(link => (link.type || link.name) === 'runbook')) {
      nextLinks.unshift({ name: 'runbook', type: 'runbook', url: runbook });
    }
    return nextLinks;
  }

  private mapDefinitionContacts(value: unknown): EntityCatalogContact[] {
    if (Array.isArray(value)) {
      return value
        .map(item => this.toRecord(item))
        .filter((item): item is Record<string, unknown> => item != null)
        .map(item => {
          const contact = new EntityCatalogContact();
          contact.name = this.normalizeString(item.name) || this.normalizeString(item.label);
          contact.type = this.normalizeString(item.type) || 'contact';
          contact.value = this.normalizeString(item.value) || this.normalizeString(item.contact) || this.normalizeString(item.url);
          contact.contact = contact.value;
          return contact;
        })
        .filter(contact => this.trimText(contact.value) != null);
    }
    if (value != null && typeof value === 'object' && !Array.isArray(value)) {
      return Object.entries(value as Record<string, unknown>)
        .map(([key, raw]) => {
          const contact = new EntityCatalogContact();
          contact.name = key;
          contact.type = key;
          contact.value = this.normalizeString(raw);
          contact.contact = contact.value;
          return contact;
        })
        .filter(contact => this.trimText(contact.value) != null);
    }
    return [];
  }

  private extractRunbook(value: unknown): string | undefined {
    if (!Array.isArray(value)) {
      if (value != null && typeof value === 'object' && !Array.isArray(value)) {
        return this.normalizeString((value as Record<string, unknown>).runbook);
      }
      return undefined;
    }
    const runbook = value
      .map(item => this.toRecord(item))
      .find(item => {
        const name = this.normalizeString(item?.name);
        const type = this.normalizeString(item?.type);
        return name === 'runbook' || type === 'runbook';
      });
    return this.normalizeString(runbook?.url);
  }

  private buildStringList(draftValue?: string, existing?: string[], fallback?: string): string[] {
    const raw = this.trimText(draftValue);
    const draftItems =
      raw == undefined
        ? []
        : raw
            .split(',')
            .map(item => this.trimText(item))
            .filter((item): item is string => item != null);
    const values = draftItems.length > 0 ? draftItems : [...(existing || [])];
    if (fallback != undefined && values.length === 0) {
      return [fallback];
    }
    return Array.from(new Set(values));
  }

  private parseYamlDefinition(input: string): unknown {
    const lines = input
      .split(/\r?\n/g)
      .map(line => line.replace(/\t/g, '  '))
      .filter(line => line.trim() !== '' && !line.trim().startsWith('#'));
    let index = 0;

    const readNestedBlock = (indent: number, reader: () => unknown, fallback: unknown = null): unknown => {
      if (index >= lines.length) {
        return fallback;
      }
      const nextIndent = this.leadingSpaces(lines[index]);
      if (nextIndent <= indent) {
        return fallback;
      }
      return reader();
    };

    const parseInlineObject = (line: string, indent: number, parseBlock: (indent: number) => unknown): Record<string, unknown> => {
      const { key, value } = this.parseYamlPair(line);
      const result: Record<string, unknown> = {};
      result[key] = value === '' ? readNestedBlock(indent - 2, () => parseBlock(indent), null) : this.parseYamlScalar(value);

      if (index < lines.length && this.leadingSpaces(lines[index]) > indent - 2) {
        const extra = parseBlock(indent);
        if (extra != null && typeof extra === 'object' && !Array.isArray(extra)) {
          Object.assign(result, extra);
        }
      }
      return result;
    };

    const parseBlock = (indent: number): unknown => {
      let container: unknown;

      while (index < lines.length) {
        const line = lines[index];
        const currentIndent = this.leadingSpaces(line);
        if (currentIndent < indent) {
          break;
        }
        if (currentIndent > indent) {
          throw new Error(this.translateOrFallback('entity.definition.import.invalid', 'The definition must be a YAML or JSON object.'));
        }

        const trimmed = line.trim();
        if (trimmed.startsWith('-')) {
          if (container == null) {
            container = [];
          }
          if (!Array.isArray(container)) {
            throw new Error(this.translateOrFallback('entity.definition.import.invalid', 'The definition must be a YAML or JSON object.'));
          }

          const afterDash = trimmed.slice(1).trim();
          index += 1;
          if (afterDash === '') {
            container.push(readNestedBlock(indent, () => parseBlock(indent + 2), null));
            continue;
          }

          if (this.looksLikeYamlPair(afterDash)) {
            const objectItem = parseInlineObject(afterDash, indent + 2, parseBlock);
            container.push(objectItem);
            continue;
          }

          container.push(this.parseYamlScalar(afterDash));
          continue;
        }

        if (container == null) {
          container = {};
        }
        if (Array.isArray(container)) {
          throw new Error(this.translateOrFallback('entity.definition.import.invalid', 'The definition must be a YAML or JSON object.'));
        }

        const { key, value } = this.parseYamlPair(trimmed);
        index += 1;
        if (value === '') {
          (container as Record<string, unknown>)[key] = readNestedBlock(indent, () => parseBlock(indent + 2), null);
          continue;
        }
        (container as Record<string, unknown>)[key] = this.parseYamlScalar(value);
      }

      return container ?? {};
    };

    return parseBlock(0);
  }

  private parseYamlPair(line: string): { key: string; value: string } {
    const separatorIndex = line.indexOf(':');
    if (separatorIndex <= 0) {
      throw new Error(this.translateOrFallback('entity.definition.import.invalid', 'The definition must be a YAML or JSON object.'));
    }
    return {
      key: line.slice(0, separatorIndex).trim(),
      value: line.slice(separatorIndex + 1).trim()
    };
  }

  private looksLikeYamlPair(value: string): boolean {
    return value.includes(':') && !value.startsWith('"') && !value.startsWith("'");
  }

  private parseYamlScalar(value: string): unknown {
    if (value === 'null') {
      return null;
    }
    if (value === 'true') {
      return true;
    }
    if (value === 'false') {
      return false;
    }
    if (/^-?\d+(\.\d+)?$/.test(value)) {
      return Number(value);
    }
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      try {
        return JSON.parse(value.startsWith("'") ? `"${value.slice(1, -1).replace(/"/g, '\\"')}"` : value);
      } catch {
        return value.slice(1, -1);
      }
    }
    return value;
  }

  private leadingSpaces(value: string): number {
    return value.length - value.trimStart().length;
  }

  private toYaml(value: unknown, indent = 0): string {
    const prefix = '  '.repeat(indent);
    if (Array.isArray(value)) {
      if (value.length === 0) {
        return '[]';
      }
      return value
        .map(item => {
          if (this.isScalar(item)) {
            return `${prefix}- ${this.formatYamlValue(item)}`;
          }
          const nested = this.toYaml(item, indent + 1);
          return `${prefix}-\n${nested}`;
        })
        .join('\n');
    }
    if (value != null && typeof value === 'object') {
      const entries = Object.entries(value as Record<string, unknown>).filter(([, current]) => {
        if (current == null) {
          return false;
        }
        if (Array.isArray(current)) {
          return current.length > 0;
        }
        if (typeof current === 'object') {
          return Object.keys(current as Record<string, unknown>).length > 0;
        }
        return true;
      });
      return entries
        .map(([key, current]) => {
          if (this.isScalar(current)) {
            return `${prefix}${key}: ${this.formatYamlValue(current)}`;
          }
          return `${prefix}${key}:\n${this.toYaml(current, indent + 1)}`;
        })
        .join('\n');
    }
    return `${prefix}${this.formatYamlValue(value)}`;
  }

  private isScalar(value: unknown): value is string | number | boolean {
    return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
  }

  private formatYamlValue(value: unknown): string {
    if (typeof value === 'string') {
      if (value === '' || /[:#[\]{},"'\n]/.test(value)) {
        return JSON.stringify(value);
      }
      return value;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      return `${value}`;
    }
    if (value == null) {
      return 'null';
    }
    return JSON.stringify(value);
  }
}
