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

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { I18NService } from '@core';
import { ALAIN_I18N_TOKEN } from '@delon/theme';
import { catchError, forkJoin, map, of } from 'rxjs';

import { OpsWorkspaceFacade } from '../../core/ops-workspace/ops-workspace.facade';
import { AppCount } from '../../pojo/AppCount';
import { SingleAlert } from '../../pojo/SingleAlert';
import { AlertService } from '../../service/alert.service';
import { MonitorService } from '../../service/monitor.service';
import { ActivityTimelineItem } from '../../shared/components/activity-timeline/activity-timeline.component';
import { PageShellAction } from '../../shared/components/page-shell/page-shell.component';
import {
  WorkspaceGuidanceAction,
  WorkspaceGuidanceLink,
  WorkspaceGuidanceReason
} from '../../shared/components/workspace-guidance-panel/workspace-guidance-panel.component';

interface OverviewSummaryCardViewModel {
  key: string;
  label: string;
  value: string;
  hint: string;
  delta: string;
  tone: 'primary' | 'success' | 'warning' | 'danger';
}

interface ProblemFocusViewModel {
  title: string;
  severity: string;
  severityLabel: string;
  entity: string;
  owner: string;
  summary: string;
}

interface ImpactedEntityViewModel {
  name: string;
  type: string;
  severity: string;
  severityLabel: string;
  owner: string;
  status: string;
  statusLabel: string;
  lastIssue: string;
}

interface TrendViewModel {
  label: string;
  value: string;
  insight: string;
  tone: 'primary' | 'success' | 'warning' | 'danger';
}

interface CoverageItemViewModel {
  label: string;
  total: string;
  healthy: string;
  abnormal: string;
}

interface QuickEntryItemViewModel {
  label: string;
  copy: string;
  route: string;
}

interface WorkspaceReadyFactViewModel {
  label: string;
  value: string;
}

interface WorkspaceStatusItemViewModel {
  key: 'workspace' | 'ingestion' | 'entities' | 'alerts';
  label: string;
  value: string;
  ready: boolean;
}

interface ChecklistItemViewModel {
  key: string;
  label: string;
  ready: boolean;
}

interface OverviewRequestState<T> {
  data: T;
  failed: boolean;
}

@Component({
  standalone: false,
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent implements OnInit {
  loading = true;
  summaryCards: OverviewSummaryCardViewModel[] = [];
  trendCards: TrendViewModel[] = [];
  impactedEntities: ImpactedEntityViewModel[] = [];
  activityItems: ActivityTimelineItem[] = [];
  coverageItems: CoverageItemViewModel[] = [];
  workspaceReadyFacts: WorkspaceReadyFactViewModel[] = [];
  workspaceStatusItems: WorkspaceStatusItemViewModel[] = [];
  checklistItems: ChecklistItemViewModel[] = [];
  problemFocus?: ProblemFocusViewModel;
  showSetupGuide = false;
  private hasReadyOverview = false;

  get quickEntryItems(): QuickEntryItemViewModel[] {
    return [
      { label: this.t('dashboard.quick-entry.entities'), copy: this.t('dashboard.quick-entry.entities.copy'), route: '/entities' },
      { label: this.t('dashboard.quick-entry.logs'), copy: this.t('dashboard.quick-entry.logs.copy'), route: '/log/manage' },
      { label: this.t('dashboard.quick-entry.traces'), copy: this.t('dashboard.quick-entry.traces.copy'), route: '/trace/manage' },
      { label: this.t('dashboard.quick-entry.metrics'), copy: this.t('dashboard.quick-entry.metrics.copy'), route: '/ingestion/otlp/metrics' },
      { label: this.t('dashboard.quick-entry.dashboards'), copy: this.t('dashboard.quick-entry.dashboards.copy'), route: '/dashboard' }
    ];
  }

  constructor(
    private readonly monitorSvc: MonitorService,
    private readonly alertSvc: AlertService,
    private readonly router: Router,
    private readonly opsFacade: OpsWorkspaceFacade,
    private readonly cdr: ChangeDetectorRef,
    @Inject(ALAIN_I18N_TOKEN) private readonly i18nSvc: I18NService
  ) {}

  get pageActions(): PageShellAction[] {
    if (this.showSetupGuide) {
      return [{ key: 'refresh', label: this.t('dashboard.darkops.action.refresh'), tone: 'default' }];
    }
    return [
      { key: 'refresh', label: this.t('dashboard.darkops.action.refresh'), tone: 'default' },
      { key: 'open-alerts', label: this.t('dashboard.darkops.action.review-alerts'), tone: 'primary' }
    ];
  }

  get guidanceHeadline(): string {
    return this.showSetupGuide ? this.t('dashboard.guidance.setup.headline') : this.t('dashboard.guidance.ready.headline');
  }

  get guidanceDescription(): string {
    return this.showSetupGuide ? this.t('dashboard.guidance.setup.description') : this.t('dashboard.guidance.ready.description');
  }

  get guidanceReasons(): WorkspaceGuidanceReason[] {
    if (this.showSetupGuide) {
      return [
        { label: this.t('dashboard.setup.status.logs'), value: this.t('dashboard.setup.status.pending') },
        { label: this.t('dashboard.setup.status.traces'), value: this.t('dashboard.setup.status.pending') },
        { label: this.t('dashboard.setup.status.metrics'), value: this.t('dashboard.setup.status.pending') }
      ];
    }
    return this.workspaceReadyFacts.slice(0, 3).map(fact => ({
      label: fact.label,
      value: fact.value
    }));
  }

  get guidancePrimaryAction(): WorkspaceGuidanceAction | undefined {
    if (this.showSetupGuide) {
      return { key: 'open-onboarding', label: this.t('dashboard.guidance.setup.action'), tone: 'primary' };
    }
    return { key: 'open-problem-focus', label: this.t('dashboard.problem-focus.open-context'), tone: 'primary' };
  }

  get guidanceSecondaryAction(): WorkspaceGuidanceAction | undefined {
    if (this.showSetupGuide) {
      return undefined;
    }
    return { key: 'open-alerts', label: this.t('dashboard.problem-focus.review-alerts'), tone: 'default' };
  }

  get guidanceNextLinks(): WorkspaceGuidanceLink[] {
    if (this.showSetupGuide) {
      return [];
    }
    return this.quickEntryItems.slice(0, 3).map(item => ({
      key: item.route,
      label: item.label,
      description: item.copy
    }));
  }

  ngOnInit(): void {
    this.opsFacade.setQueryContext({ route: 'overview' });
    this.loadOverview();
  }

  onPageAction(actionKey: string): void {
    if (actionKey === 'open-alerts') {
      void this.router.navigateByUrl('/alerts');
      return;
    }
    this.loadOverview();
  }

  onGuidanceAction(actionKey: string): void {
    switch (actionKey) {
      case 'open-onboarding':
        void this.router.navigate(['/ingestion/otlp'], { queryParams: { signal: 'logs' } });
        return;
      case 'open-problem-focus':
        this.openProblemFocus();
        return;
      case 'open-alerts':
        void this.router.navigateByUrl('/alerts');
        return;
      default:
        this.onPageAction(actionKey);
    }
  }

  onGuidanceNext(actionKey: string): void {
    switch (actionKey) {
      default:
        void this.router.navigateByUrl(actionKey);
    }
  }

  openProblemFocus(): void {
    if (!this.problemFocus) {
      return;
    }
    this.opsFacade.openDrawer({
      kind: 'alert',
      title: this.problemFocus.title,
      subtitle: `${this.problemFocus.entity} · ${this.problemFocus.severityLabel}`,
      status: this.problemFocus.severity,
      description: this.problemFocus.summary,
      sections: [
        { label: this.t('dashboard.problem-focus.owner'), value: this.problemFocus.owner },
        { label: this.t('dashboard.problem-focus.entity'), value: this.problemFocus.entity }
      ]
    });
  }

  openImpactedEntity(entity: ImpactedEntityViewModel): void {
    this.opsFacade.openDrawer({
      kind: 'entity',
      title: `${entity.name} ${entity.type}`,
      subtitle: this.t('dashboard.affected.drawer-subtitle'),
      status: entity.severity,
      description: entity.lastIssue,
      sections: [
        { label: this.t('dashboard.problem-focus.owner'), value: entity.owner },
        { label: this.t('dashboard.affected.status-label'), value: entity.statusLabel }
      ]
    });
  }

  openSummaryCard(card: OverviewSummaryCardViewModel): void {
    this.opsFacade.openDrawer({
      kind: 'custom',
      title: card.label,
      subtitle: this.t('dashboard.summary.drawer-subtitle'),
      description: card.hint,
      sections: [
        { label: this.t('dashboard.summary.value'), value: card.value },
        { label: this.t('dashboard.summary.delta'), value: card.delta }
      ]
    });
  }

  openQuickEntry(item: QuickEntryItemViewModel): void {
    void this.router.navigateByUrl(item.route);
  }

  private loadOverview(): void {
    this.loading = true;
    forkJoin({
      appCounts: this.monitorSvc.getAppsMonitorSummary().pipe(
        map(
          (message): OverviewRequestState<AppCount[]> => ({
            data: message.code === 0 && Array.isArray(message.data) ? message.data : [],
            failed: false
          })
        ),
        catchError(() => of({ data: [] as AppCount[], failed: true }))
      ),
      alerts: this.alertSvc.loadAlerts(undefined, undefined, 0, 6).pipe(
        map(
          (message): OverviewRequestState<SingleAlert[]> => ({
            data: message.code === 0 && message.data?.content ? message.data.content : [],
            failed: false
          })
        ),
        catchError(() => of({ data: [] as SingleAlert[], failed: true }))
      )
    }).subscribe(({ appCounts, alerts }) => {
      const nextAppCounts = appCounts.data;
      const nextAlerts = alerts.data;
      const hasFreshContext = nextAppCounts.length > 0 || nextAlerts.length > 0;

      if (hasFreshContext) {
        this.hasReadyOverview = true;
        this.showSetupGuide = false;
        this.applyOverviewData(nextAppCounts, nextAlerts);
      } else if (!this.hasReadyOverview && !appCounts.failed && !alerts.failed) {
        this.showSetupGuide = true;
        this.applyOverviewData([], []);
      }

      this.loading = false;
      this.cdr.markForCheck();
    });
  }

  private applyOverviewData(appCounts: AppCount[], alerts: SingleAlert[]): void {
    this.summaryCards = this.buildSummaryCards(appCounts, alerts);
    this.problemFocus = this.buildProblemFocus(alerts);
    this.trendCards = this.buildTrendCards(appCounts, alerts);
    this.impactedEntities = this.buildImpactedEntities(appCounts, alerts);
    this.activityItems = this.buildActivityItems(alerts);
    this.coverageItems = this.buildCoverageItems(appCounts);
    this.workspaceReadyFacts = this.buildWorkspaceReadyFacts(appCounts, alerts);
    this.workspaceStatusItems = this.buildWorkspaceStatusItems(appCounts, alerts);
    this.checklistItems = this.buildChecklistItems(appCounts, alerts);
  }

  private buildWorkspaceReadyFacts(appCounts: AppCount[], alerts: SingleAlert[]): WorkspaceReadyFactViewModel[] {
    const totalEntities = appCounts.reduce((sum, item) => sum + item.size, 0);
    const unassignedIssues = alerts.filter(alert => !this.hasAlertOwner(alert)).length;

    return [
      { label: this.t('dashboard.workbench.fact.entities'), value: String(totalEntities) },
      { label: this.t('dashboard.workbench.fact.alerts'), value: String(alerts.length) },
      { label: this.t('dashboard.workbench.fact.unassigned'), value: String(unassignedIssues) }
    ];
  }

  private buildSummaryCards(appCounts: AppCount[], alerts: SingleAlert[]): OverviewSummaryCardViewModel[] {
    const totalEntities = appCounts.reduce((sum, item) => sum + item.size, 0);
    const healthyEntities = appCounts.reduce((sum, item) => sum + item.availableSize, 0);
    const degradedEntities = appCounts.reduce((sum, item) => sum + item.unAvailableSize + item.unManageSize, 0);
    const criticalAlerts = alerts.filter(alert => this.getAlertSeverity(alert) === 'critical').length;
    const unassignedIssues = alerts.filter(alert => !this.hasAlertOwner(alert)).length;

    return [
      {
        key: 'critical',
        label: this.t('dashboard.summary.critical.label'),
        value: String(criticalAlerts),
        hint: this.t('dashboard.summary.critical.hint'),
        delta: criticalAlerts > 0 ? this.t('dashboard.summary.critical.delta.active') : this.t('dashboard.summary.critical.delta.idle'),
        tone: criticalAlerts > 0 ? 'danger' : 'primary'
      },
      {
        key: 'unassigned',
        label: this.t('dashboard.summary.unassigned.label'),
        value: String(unassignedIssues),
        hint: this.t('dashboard.summary.unassigned.hint'),
        delta: unassignedIssues > 0 ? this.t('dashboard.summary.unassigned.delta.active') : this.t('dashboard.summary.unassigned.delta.idle'),
        tone: unassignedIssues > 0 ? 'warning' : 'success'
      },
      {
        key: 'degraded',
        label: this.t('dashboard.summary.degraded.label'),
        value: String(degradedEntities),
        hint: this.t('dashboard.summary.degraded.hint'),
        delta: degradedEntities > 0 ? this.t('dashboard.summary.degraded.delta.active', { count: degradedEntities }) : this.t('dashboard.summary.degraded.delta.idle'),
        tone: degradedEntities > 0 ? 'warning' : healthyEntities > 0 || totalEntities > 0 ? 'success' : 'primary'
      }
    ];
  }

  private buildWorkspaceStatusItems(appCounts: AppCount[], alerts: SingleAlert[]): WorkspaceStatusItemViewModel[] {
    const totalEntities = appCounts.reduce((sum, item) => sum + item.size, 0);
    const hasSignals = totalEntities > 0 || alerts.length > 0;
    return [
      {
        key: 'workspace',
        label: this.t('dashboard.home.status.workspace'),
        value: this.t('dashboard.home.status.ready'),
        ready: true
      },
      {
        key: 'ingestion',
        label: this.t('dashboard.home.status.ingestion'),
        value: hasSignals ? this.t('dashboard.home.status.ready') : this.t('dashboard.home.status.pending'),
        ready: hasSignals
      },
      {
        key: 'entities',
        label: this.t('dashboard.home.status.entities'),
        value: totalEntities > 0 ? this.t('dashboard.home.status.ready') : this.t('dashboard.home.status.pending'),
        ready: totalEntities > 0
      },
      {
        key: 'alerts',
        label: this.t('dashboard.home.status.alerts'),
        value: alerts.length > 0 ? this.t('dashboard.home.status.ready') : this.t('dashboard.home.status.pending'),
        ready: alerts.length > 0
      }
    ];
  }

  private buildChecklistItems(appCounts: AppCount[], alerts: SingleAlert[]): ChecklistItemViewModel[] {
    const totalEntities = appCounts.reduce((sum, item) => sum + item.size, 0);
    const hasSignals = totalEntities > 0 || alerts.length > 0;
    return [
      { key: 'data-source', label: this.t('dashboard.setup.checklist.data-source'), ready: hasSignals },
      { key: 'entities', label: this.t('dashboard.setup.checklist.entities'), ready: totalEntities > 0 },
      { key: 'logs', label: this.t('dashboard.setup.checklist.logs'), ready: hasSignals },
      { key: 'traces', label: this.t('dashboard.setup.checklist.traces'), ready: hasSignals },
      { key: 'metrics', label: this.t('dashboard.setup.checklist.metrics'), ready: hasSignals },
      { key: 'alerts', label: this.t('dashboard.setup.checklist.alerts'), ready: alerts.length > 0 },
      { key: 'dashboards', label: this.t('dashboard.setup.checklist.dashboards'), ready: false }
    ];
  }

  private buildProblemFocus(alerts: SingleAlert[]): ProblemFocusViewModel | undefined {
    const focus = alerts[0];
    if (!focus) {
      return {
        title: this.t('dashboard.problem-focus.empty.title'),
        severity: 'healthy',
        severityLabel: this.getSeverityLabel('healthy'),
        entity: this.t('dashboard.problem-focus.empty.entity'),
        owner: this.t('dashboard.problem-focus.empty.owner'),
        summary: this.t('dashboard.problem-focus.empty.summary')
      };
    }

    const severity = this.getAlertSeverity(focus);
    return {
      title: focus.content || focus.annotations?.summary || this.t('dashboard.problem-focus.default-title'),
      severity,
      severityLabel: this.getSeverityLabel(severity),
      entity: focus.labels?.service || focus.labels?.job || focus.labels?.instance || this.t('dashboard.problem-focus.default-entity'),
      owner: this.getAlertOwnerLabel(focus),
      summary: focus.annotations?.summary || focus.content || this.t('dashboard.problem-focus.default-summary')
    };
  }

  private buildTrendCards(appCounts: AppCount[], alerts: SingleAlert[]): TrendViewModel[] {
    const totalEntities = appCounts.reduce((sum, item) => sum + item.size, 0);
    const alertPressure = alerts.length;
    const errorPressure = alerts.filter(alert => this.getAlertSeverity(alert) !== 'warning').length;

    return [
      {
        label: this.t('dashboard.trend.alert.label'),
        value: `${alertPressure}`,
        insight: this.t('dashboard.trend.alert.insight'),
        tone: alertPressure > 3 ? 'danger' : 'warning'
      },
      {
        label: this.t('dashboard.trend.availability.label'),
        value: `${totalEntities === 0 ? 100 : Math.round((appCounts.reduce((sum, item) => sum + item.availableSize, 0) / totalEntities) * 100)}%`,
        insight: this.t('dashboard.trend.availability.insight'),
        tone: 'success'
      },
      {
        label: this.t('dashboard.trend.error.label'),
        value: `${Math.max(1, errorPressure)}`,
        insight: this.t('dashboard.trend.error.insight'),
        tone: errorPressure > 0 ? 'danger' : 'primary'
      }
    ];
  }

  private buildImpactedEntities(appCounts: AppCount[], alerts: SingleAlert[]): ImpactedEntityViewModel[] {
    const alertByCategory = alerts.reduce<Record<string, SingleAlert | undefined>>((acc, alert) => {
      const key = (alert.labels?.service || alert.labels?.job || alert.labels?.instance || '').toLowerCase();
      if (key && !acc[key]) {
        acc[key] = alert;
      }
      return acc;
    }, {});

    return appCounts
      .slice()
      .sort((left, right) => right.size - left.size)
      .slice(0, 5)
      .map(item => {
        const key = `${item.app || item.category}`.toLowerCase();
        const linkedAlert = alertByCategory[key];
        const degraded = item.unAvailableSize + item.unManageSize;
        return {
          name: item.app || item.category,
          type: item.category || 'service',
          severity: linkedAlert ? this.getAlertSeverity(linkedAlert) : degraded > 0 ? 'warning' : 'healthy',
          severityLabel: this.getSeverityLabel(linkedAlert ? this.getAlertSeverity(linkedAlert) : degraded > 0 ? 'warning' : 'healthy'),
          owner: this.getAlertOwnerLabel(linkedAlert),
          status: degraded > 0 ? 'impacted' : 'healthy',
          statusLabel: degraded > 0 ? this.t('dashboard.affected.status.impacted', { count: degraded }) : this.t('dashboard.affected.status.healthy'),
          lastIssue: linkedAlert?.content || this.t('dashboard.affected.last-issue.healthy', { healthy: item.availableSize, total: item.size })
        };
      });
  }

  private buildActivityItems(alerts: SingleAlert[]): ActivityTimelineItem[] {
    return alerts.slice(0, 6).map(alert => ({
      title: alert.content || alert.annotations?.summary || this.t('dashboard.activity.default-title'),
      detail: `${this.getAlertOwnerLabel(alert)} · ${alert.labels?.service || alert.labels?.job || alert.labels?.instance || this.t('dashboard.activity.pending-entity')}`,
      timestamp: new Date(alert.gmtUpdate || Date.now()).toLocaleString(),
      tone: this.getAlertSeverity(alert) === 'critical' ? 'danger' : this.getAlertSeverity(alert) === 'warning' ? 'warning' : 'info',
      tag: this.getAlertStatusLabel(alert.status || 'firing')
    }));
  }

  private buildCoverageItems(appCounts: AppCount[]): CoverageItemViewModel[] {
    return appCounts.slice(0, 6).map(item => {
      const abnormalCount = item.unAvailableSize + item.unManageSize;
      return {
        label: item.category || item.app || this.t('dashboard.coverage.unknown'),
        total: this.t('dashboard.coverage.total', { count: item.size }),
        healthy: this.t('dashboard.coverage.healthy', { count: item.availableSize }),
        abnormal: abnormalCount > 0 ? this.t('dashboard.coverage.abnormal', { count: abnormalCount }) : this.t('dashboard.coverage.clean')
      };
    });
  }

  private getAlertSeverity(alert?: SingleAlert): string {
    return (alert?.labels?.severity || alert?.annotations?.severity || 'warning').toLowerCase();
  }

  private getAlertOwnerLabel(alert?: SingleAlert): string {
    return alert?.labels?.owner || alert?.annotations?.owner || this.t('dashboard.owner.unassigned');
  }

  private hasAlertOwner(alert?: SingleAlert): boolean {
    return !!(alert?.labels?.owner || alert?.annotations?.owner);
  }

  private getSeverityLabel(severity: string): string {
    return this.t(`dashboard.severity.${severity}`) || severity;
  }

  private getAlertStatusLabel(status: string): string {
    return this.t(`alert.status.${status}`);
  }

  private t(key: string, params?: Record<string, string | number>): string {
    return this.i18nSvc.fanyi(key, params);
  }
}
