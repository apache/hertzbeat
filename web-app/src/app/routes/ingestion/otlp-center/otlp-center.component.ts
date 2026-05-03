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

import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { I18NService } from '@core';
import { ALAIN_I18N_TOKEN } from '@delon/theme';
import { SharedModule } from '@shared';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzDescriptionsModule } from 'ng-zorro-antd/descriptions';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { catchError } from 'rxjs/operators';
import { forkJoin, of } from 'rxjs';

import {
  OtlpBoundEntity,
  OtlpCanonicalIdentitySample,
  OtlpGuideSnippet,
  OtlpIngestionGuide,
  OtlpIngestionOverview,
  OtlpSignalGuide,
  OtlpSignalOverview
} from '../../../pojo/OtlpIngestion';
import { AuthService } from '../../../service/auth.service';
import { OtlpIngestionService } from '../../../service/otlp-ingestion.service';
import { PlatformContextChipItem } from '../../../shared/components/platform-context-chip-bar/platform-context-chip-bar.component';
import { PlatformFactsStripItem } from '../../../shared/components/platform-facts-strip/platform-facts-strip.component';
import { PlatformDrawerPillItem } from '../../../shared/components/platform-drawer-pill-row/platform-drawer-pill-row.component';
import { PlatformDrawerSectionListItem } from '../../../shared/components/platform-drawer-section-list/platform-drawer-section-list.component';
import { PlatformKeyValueGridItem } from '../../../shared/components/platform-key-value-grid/platform-key-value-grid.component';
import { PlatformStageMetaChipItem } from '../../../shared/components/platform-stage-meta-header/platform-stage-meta-header.component';
import { PlatformSummaryMetricGridItem } from '../../../shared/components/platform-summary-metric-grid/platform-summary-metric-grid.component';
import { PlatformSupportActionItem } from '../../../shared/components/platform-support-action-bar/platform-support-action-bar.component';

@Component({
  selector: 'app-otlp-center',
  standalone: true,
  imports: [
    CommonModule,
    SharedModule,
    NzAlertModule,
    NzButtonModule,
    NzCardModule,
    NzDescriptionsModule,
    NzDividerModule,
    NzEmptyModule,
    NzIconModule,
    NzSpinModule,
    NzTagModule,
    NzTabsModule
  ],
  templateUrl: './otlp-center.component.html',
  styleUrl: './otlp-center.component.less'
})
export class OtlpCenterComponent implements OnInit {
  loading = false;
  loadFailed = false;
  loadErrorMessage = '';
  overview = new OtlpIngestionOverview();
  guide = new OtlpIngestionGuide();
  activeProtocol: 'http' | 'grpc' = 'http';
  bindingSummary = {
    canonicalIdentityKeys: [],
    recentServices: [],
    recentIdentitySamples: [],
    recentBoundEntities: []
  } as {
    canonicalIdentityKeys: string[];
    recentServices: string[];
    recentIdentitySamples: OtlpCanonicalIdentitySample[];
    recentBoundEntities: OtlpBoundEntity[];
  };
  activeSnippetIndex = 0;
  tokenLoading = false;
  generatedToken?: string;
  preferredSignal?: 'metrics' | 'logs' | 'traces';

  constructor(
    private otlpIngestionSvc: OtlpIngestionService,
    private authSvc: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private notification: NzNotificationService,
    @Inject(ALAIN_I18N_TOKEN) private i18n: I18NService
  ) {}

  ngOnInit(): void {
    this.preferredSignal = this.resolvePreferredSignal();
    this.reload();
  }

  reload(): void {
    this.loading = true;
    this.loadFailed = false;
    this.loadErrorMessage = '';
    forkJoin({
      overview: this.otlpIngestionSvc.getOverview().pipe(catchError(() => of(undefined))),
      guide: this.otlpIngestionSvc.getGuide().pipe(catchError(() => of(undefined))),
      bindings: this.otlpIngestionSvc.getBindings().pipe(catchError(() => of(undefined)))
    }).subscribe({
      next: result => {
        this.loading = false;
        if (result.overview?.code === 0 && result.overview.data != null) {
          this.overview = result.overview.data;
        }
        if (result.guide?.code === 0 && result.guide.data != null) {
          this.guide = result.guide.data;
        }
        if (result.bindings?.code === 0 && result.bindings.data != null) {
          this.bindingSummary = result.bindings.data;
        }
        if (!result.overview || !result.guide || !result.bindings) {
          this.loadFailed = true;
          this.loadErrorMessage = this.i18n.fanyi('ingestion.otlp.loadFailed');
        }
      },
      error: () => {
        this.loading = false;
        this.loadFailed = true;
        this.loadErrorMessage = this.i18n.fanyi('ingestion.otlp.loadFailed');
      }
    });
  }

  get signalCards(): OtlpSignalOverview[] {
    return this.sortByPreferredSignal([
      { ...this.overview.metrics, signal: 'metrics' },
      { ...this.overview.logs, signal: 'logs' },
      { ...this.overview.traces, signal: 'traces' }
    ]);
  }

  get signalGuides(): OtlpSignalGuide[] {
    return this.sortByPreferredSignal((this.guide.signals || []).filter(signal => signal.protocol === this.activeProtocol));
  }

  get snippets(): OtlpGuideSnippet[] {
    return (this.guide.snippets || []).filter(snippet => snippet.protocol === this.activeProtocol);
  }

  get activeSnippet(): OtlpGuideSnippet | undefined {
    return this.snippets[this.activeSnippetIndex] || this.snippets[0];
  }

  get hasSuccessfulIntake(): boolean {
    return this.overview.activeSignalCount > 0;
  }

  get successMessage(): string {
    if (this.overview.activeSignalCount >= 3) {
      return this.i18n.fanyi('ingestion.otlp.success.all');
    }
    if (this.overview.activeSignalCount === 2) {
      return this.i18n.fanyi('ingestion.otlp.success.partial');
    }
    if (this.overview.activeSignalCount === 1) {
      return this.i18n.fanyi('ingestion.otlp.success.single');
    }
    return this.i18n.fanyi('ingestion.otlp.success.pending');
  }

  get successDescription(): string {
    const serviceNames = this.bindingSummary.recentServices?.slice(0, 3) || [];
    if (this.hasSuccessfulIntake) {
      const parts: string[] = [];
      if (serviceNames.length > 0) {
        parts.push(`${this.i18n.fanyi('ingestion.otlp.success.services')}${serviceNames.join(' / ')}`);
      }
      if (this.overview.boundEntityCount > 0) {
        parts.push(`${this.i18n.fanyi('ingestion.otlp.success.entities')}${this.overview.boundEntityCount}`);
      }
      if (this.overview.latestObservedAt) {
        parts.push(
          `${this.i18n.fanyi('ingestion.otlp.success.latest')}${new Date(this.overview.latestObservedAt).toLocaleString()}`
        );
      }
      return parts.join('，') || this.i18n.fanyi('ingestion.otlp.success.partial');
    }
    return this.i18n.fanyi('ingestion.otlp.success.pending.desc');
  }

  get onboardingConsoleTitle(): string {
    return this.i18n.fanyi(this.hasSuccessfulIntake ? 'ingestion.otlp.console.title.active' : 'ingestion.otlp.console.title');
  }

  get onboardingConsoleCopy(): string {
    return this.i18n.fanyi(this.hasSuccessfulIntake ? 'ingestion.otlp.console.copy.active' : 'ingestion.otlp.console.copy');
  }

  get recentServiceCount(): number {
    return this.bindingSummary.recentServices?.length || this.overview.recentServiceCount || 0;
  }

  get onboardingConsoleFacts(): PlatformFactsStripItem[] {
    return [
      {
        label: this.i18n.fanyi('ingestion.otlp.console.result.signals'),
        value: `${this.overview.activeSignalCount || 0}`,
        tone: this.overview.activeSignalCount > 0 ? 'success' : 'default'
      },
      {
        label: this.i18n.fanyi('ingestion.otlp.console.result.services'),
        value: `${this.recentServiceCount}`,
        tone: this.recentServiceCount > 0 ? 'accent' : 'default'
      },
      {
        label: this.i18n.fanyi('ingestion.otlp.console.result.entities'),
        value: `${this.overview.boundEntityCount || 0}`,
        tone: this.overview.boundEntityCount > 0 ? 'accent' : 'default'
      },
      {
        label: this.i18n.fanyi('ingestion.otlp.console.result.protocol'),
        value: this.activeProtocol.toUpperCase(),
        tone: 'accent'
      }
    ];
  }

  get signalsStageMetaChips(): PlatformStageMetaChipItem[] {
    return [
      {
        text: `${this.i18n.fanyi('ingestion.otlp.overview.activeSignals')} · ${this.overview.activeSignalCount || 0}`,
        tone: this.overview.activeSignalCount > 0 ? 'success' : 'default'
      }
    ];
  }

  get overviewStageMetaChips(): PlatformStageMetaChipItem[] {
    return [
      {
        text: `${this.i18n.fanyi('ingestion.otlp.latest')} · ${this.overview.recentEvents.length || 0}`,
        tone: this.overview.recentEvents.length > 0 ? 'accent' : 'default'
      }
    ];
  }

  get workspaceStageMetaChips(): PlatformStageMetaChipItem[] {
    return [
      {
        text: `${this.i18n.fanyi('ingestion.otlp.console.result.services')} · ${this.recentServiceCount}`,
        tone: this.recentServiceCount > 0 ? 'accent' : 'default'
      }
    ];
  }

  get workspaceActionItems(): PlatformSupportActionItem[] {
    return [
      {
        key: 'metrics',
        label: this.i18n.fanyi('ingestion.otlp.cta.metrics')
      },
      {
        key: 'logs',
        label: this.i18n.fanyi('ingestion.otlp.cta.logs')
      },
      {
        key: 'traces',
        label: this.i18n.fanyi('ingestion.otlp.cta.traces')
      }
    ];
  }

  get guideStageMetaChips(): PlatformStageMetaChipItem[] {
    return [
      {
        text: `${this.i18n.fanyi('ingestion.otlp.console.result.protocol')} · ${this.activeProtocol.toUpperCase()}`,
        tone: 'accent'
      },
      {
        text: `${this.i18n.fanyi('ingestion.otlp.console.result.signals')} · ${this.signalGuides.length}`,
        tone: this.signalGuides.length > 0 ? 'success' : 'default'
      }
    ];
  }

  get guideProtocolItems(): PlatformDrawerPillItem[] {
    return [
      {
        text: this.guide.httpProtocolLabel || 'OTLP HTTP',
        actionKey: 'http',
        active: this.activeProtocol === 'http'
      },
      {
        text: this.guide.grpcProtocolLabel || 'OTLP gRPC',
        actionKey: 'grpc',
        active: this.activeProtocol === 'grpc'
      }
    ];
  }

  get snippetStageMetaChips(): PlatformStageMetaChipItem[] {
    return [
      {
        text: `${this.i18n.fanyi('ingestion.otlp.snippet.title')} · ${this.snippets.length}`,
        tone: this.snippets.length > 0 ? 'accent' : 'default'
      }
    ];
  }

  get bindingStageMetaChips(): PlatformStageMetaChipItem[] {
    return [
      {
        text: `${this.i18n.fanyi('ingestion.otlp.binding.title')} · ${this.bindingSummary.canonicalIdentityKeys.length || 0}`,
        tone: this.bindingSummary.canonicalIdentityKeys.length > 0 ? 'accent' : 'default'
      }
    ];
  }

  get boundEntitiesStageMetaChips(): PlatformStageMetaChipItem[] {
    return [
      {
        text: `${this.i18n.fanyi('ingestion.otlp.binding.entities')} · ${this.bindingSummary.recentBoundEntities.length || 0}`,
        tone: this.bindingSummary.recentBoundEntities.length > 0 ? 'success' : 'default'
      }
    ];
  }

  get bindingIdentityKeyItems(): PlatformContextChipItem[] {
    return (this.bindingSummary.canonicalIdentityKeys || []).map(key => ({
      label: this.i18n.fanyi('ingestion.otlp.binding.identity'),
      value: key
    }));
  }

  get bindingRecentServiceItems(): PlatformContextChipItem[] {
    return (this.bindingSummary.recentServices || []).map(service => ({
      label: this.i18n.fanyi('ingestion.otlp.binding.services'),
      value: service
    }));
  }

  get guideSignalItems(): PlatformDrawerSectionListItem[] {
    return this.signalGuides.map(signal => ({
      title: this.getSignalLabel(signal.signal),
      meta: signal.endpoint || '-',
      secondaryMeta: [signal.mode, signal.summary, signal.note].filter((item): item is string => !!item)
    }));
  }

  get guideAuthItems(): PlatformKeyValueGridItem[] {
    const items: PlatformKeyValueGridItem[] = [
      {
        label: this.i18n.fanyi('ingestion.otlp.guide.auth'),
        value: `${this.guide.authHeaderName || '-'}: ${this.guide.authHeaderExample || '-'}`
      }
    ];
    if (this.activeProtocol === 'grpc' && this.guide.grpcAuthorityExample) {
      items.push({
        label: this.i18n.fanyi('ingestion.otlp.guide.grpc-authority'),
        value: this.guide.grpcAuthorityExample
      });
    }
    return items;
  }

  get identitySampleItems(): PlatformDrawerSectionListItem[] {
    return (this.bindingSummary.recentIdentitySamples || []).map(sample => ({
      title: sample.key,
      meta: sample.value,
      secondaryMeta: [this.getSignalLabel(sample.signal)]
    }));
  }

  get boundEntityItems(): PlatformDrawerSectionListItem[] {
    return (this.bindingSummary.recentBoundEntities || []).map(entity => ({
      title: entity.displayName || entity.name || '-',
      meta: `${entity.type || '-'} / ${entity.namespace || '-'}`,
      secondaryMeta: [
        `${entity.primaryIdentityKey || '-'} = ${entity.primaryIdentityValue || '-'}`,
        `${this.i18n.fanyi('ingestion.otlp.binding.monitorBinds')}: ${entity.monitorBindCount || 0}`
      ],
      actionLabel: this.i18n.fanyi('ingestion.otlp.cta.viewEntity'),
      actionKey: `${entity.entityId}`
    }));
  }

  get overviewMetricItems(): PlatformSummaryMetricGridItem[] {
    return [
      {
        label: this.i18n.fanyi('ingestion.otlp.overview.services'),
        value: `${this.overview.recentServiceCount || 0}`,
        tone: this.overview.recentServiceCount > 0 ? 'accent' : 'default'
      },
      {
        label: this.i18n.fanyi('ingestion.otlp.overview.entities'),
        value: `${this.overview.boundEntityCount || 0}`,
        tone: this.overview.boundEntityCount > 0 ? 'accent' : 'default'
      },
      {
        label: this.i18n.fanyi('ingestion.otlp.overview.activeSignals'),
        value: `${this.overview.activeSignalCount || 0}`,
        tone: this.overview.activeSignalCount > 0 ? 'success' : 'default'
      }
    ];
  }

  jumpToLogs(): void {
    this.router.navigate(['/log/manage'], { queryParams: this.buildConsoleQueryParams() });
  }

  jumpToTraces(): void {
    this.router.navigate(['/trace/manage'], { queryParams: this.buildConsoleQueryParams() });
  }

  jumpToMetricsConsole(): void {
    this.router.navigate(['/ingestion/otlp/metrics'], { queryParams: this.buildConsoleQueryParams() });
  }

  onWorkspaceAction(actionKey: string): void {
    switch (actionKey) {
      case 'metrics':
        this.jumpToMetricsConsole();
        break;
      case 'logs':
        this.jumpToLogs();
        break;
      case 'traces':
        this.jumpToTraces();
        break;
      default:
        break;
    }
  }

  jumpToDiscovery(): void {
    this.router.navigate(['/entities/discovery']);
  }

  jumpToEntities(): void {
    this.router.navigate(['/entities']);
  }

  openTokenManagement(): void {
    this.router.navigate(['/setting/settings/token']);
  }

  openEntity(entityId?: number): void {
    if (entityId == null) {
      return;
    }
    this.router.navigate(['/entities', entityId]);
  }

  onBoundEntityAction(actionKey: string): void {
    const entityId = Number(actionKey);
    if (!Number.isNaN(entityId)) {
      this.openEntity(entityId);
    }
  }

  async copySnippet(snippet?: OtlpGuideSnippet): Promise<void> {
    if (!snippet?.content) {
      return;
    }
    await this.copyText(snippet.content, this.i18n.fanyi('ingestion.otlp.copy.success'));
  }

  generateIngestionToken(): void {
    this.tokenLoading = true;
    this.authSvc.generateToken(this.i18n.fanyi('ingestion.otlp.token.defaultName')).subscribe({
      next: message => {
        this.tokenLoading = false;
        if (message.code === 0 && message.data != null) {
          this.generatedToken = message.data?.token;
          this.notification.success(
            this.i18n.fanyi('common.notify.operate-success'),
            this.i18n.fanyi('ingestion.otlp.token.generated')
          );
          return;
        }
        this.notification.warning(
          this.i18n.fanyi('common.notify.operate-failed'),
          message.msg || this.i18n.fanyi('ingestion.otlp.token.generateFailed')
        );
      },
      error: () => {
        this.tokenLoading = false;
      }
    });
  }

  async copyGeneratedToken(): Promise<void> {
    if (!this.generatedToken) {
      return;
    }
    await this.copyText(this.generatedToken, this.i18n.fanyi('ingestion.otlp.token.copySuccess'));
  }

  getSignalLabel(signal?: string): string {
    switch (signal) {
      case 'metrics':
        return this.i18n.fanyi('ingestion.otlp.signal.metrics');
      case 'logs':
        return this.i18n.fanyi('ingestion.otlp.signal.logs');
      case 'traces':
        return this.i18n.fanyi('ingestion.otlp.signal.traces');
      default:
        return signal || '';
    }
  }

  getSignalStatusTagColor(signal?: OtlpSignalOverview): string {
    return signal?.active ? 'success' : 'default';
  }

  switchProtocol(protocol: 'http' | 'grpc'): void {
    this.activeProtocol = protocol;
    this.activeSnippetIndex = 0;
  }

  onGuideProtocolSelected(actionKey: string): void {
    if (actionKey === 'http' || actionKey === 'grpc') {
      this.switchProtocol(actionKey);
    }
  }

  private resolvePreferredSignal(): 'metrics' | 'logs' | 'traces' | undefined {
    const signal = this.route.snapshot.queryParamMap.get('signal');
    if (signal === 'metrics' || signal === 'logs' || signal === 'traces') {
      return signal;
    }
    return undefined;
  }

  private sortByPreferredSignal<T extends { signal?: string }>(items: T[]): T[] {
    if (!this.preferredSignal) {
      return items;
    }
    return [...items].sort((left, right) => {
      if (left.signal === right.signal) {
        return 0;
      }
      if (left.signal === this.preferredSignal) {
        return -1;
      }
      if (right.signal === this.preferredSignal) {
        return 1;
      }
      return 0;
    });
  }

  private async copyText(value: string, successMessage: string): Promise<void> {
    await navigator.clipboard.writeText(value);
    this.notification.success(this.i18n.fanyi('common.notify.copy-success'), successMessage);
  }

  private buildConsoleQueryParams(): Record<string, string> | undefined {
    const recentEntity = this.bindingSummary.recentBoundEntities?.[0];
    const recentService = this.bindingSummary.recentServices?.[0] || recentEntity?.primaryIdentityValue;
    const end = this.overview.latestObservedAt || Date.now();
    const start = Math.max(end - 60 * 60 * 1000, 0);
    const params: Record<string, string> = {
      start: `${start}`,
      end: `${end}`,
      returnTo: '/ingestion/otlp',
      returnLabel: this.i18n.fanyi('ingestion.otlp.title')
    };
    if (recentEntity?.entityId != null) {
      params.entityId = `${recentEntity.entityId}`;
    }
    const entityName = recentEntity?.displayName || recentEntity?.name;
    if (entityName) {
      params.entityName = entityName;
    }
    if (recentService) {
      params.serviceName = recentService;
    }
    return params;
  }
}
