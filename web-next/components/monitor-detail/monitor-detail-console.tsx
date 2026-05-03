'use client';

import Link from 'next/link';
import { Activity, BarChart3, FileText, GitBranch, LineChart, RefreshCw, Star } from 'lucide-react';
import React from 'react';
import {
  ObservabilityBadge,
  ObservabilityControlChip,
  ObservabilityTabStrip
} from '../observability';
import { Select } from '../ui/select';
import type { Monitor } from '../../lib/types';

type Translator = (key: string, params?: Record<string, string | number | null | undefined>) => string;

export type MonitorDetailConsoleTabKey = 'realtime' | 'history' | 'favorites' | 'grafana';

type MonitorWorkbenchSummaryFact = {
  key: 'realtime' | 'history' | 'favorite' | string;
  label: string;
  value: string;
};

type NavigationContext = {
  app?: string | null;
};

type SignalHandoffLinks = {
  metricsHref: string;
  logsHref: string;
  tracesHref: string;
};

const REFRESH_OPTIONS = [
  { value: 10, label: '10s' },
  { value: 30, label: '30s' },
  { value: 60, label: '60s' },
  { value: 300, label: '300s' },
  { value: -1, label: 'Off' }
] as const;

const cockpitSansStyle = {
  fontFamily: '"IBM Plex Sans", "Avenir Next", "Segoe UI", system-ui, sans-serif'
} as const;

const cockpitMonoStyle = {
  fontFamily: '"IBM Plex Mono", "SFMono-Regular", "SF Mono", ui-monospace, monospace'
} as const;

export function MonitorDetailConsole({
  monitor,
  currentTab,
  refreshInterval,
  refreshCountdown,
  backHref,
  appHref,
  grafanaUrl,
  navigationContext,
  signalHandoffLinks,
  onSelectTab,
  onSelectRefreshInterval,
  onRefresh,
  realtimeContent,
  historyContent,
  favoritesContent,
  grafanaContent,
  t
}: {
  monitor: Monitor;
  workbenchSummaryFacts?: MonitorWorkbenchSummaryFact[];
  currentTab: MonitorDetailConsoleTabKey;
  refreshInterval: number;
  refreshCountdown: number;
  backHref: string;
  editHref: string;
  helpHref?: string | null;
  appHref?: string | null;
  grafanaUrl?: string | null;
  navigationContext?: NavigationContext;
  signalHandoffLinks?: SignalHandoffLinks;
  onSelectTab: (tab: MonitorDetailConsoleTabKey) => void;
  onSelectRefreshInterval: (value: number) => void;
  onRefresh: () => void;
  realtimeContent: React.ReactNode;
  historyContent: React.ReactNode;
  favoritesContent: React.ReactNode;
  grafanaContent?: React.ReactNode;
  t: Translator;
}) {
  const panelIdPrefix = 'monitor-detail';
  const renderTabLabel = (
    key: 'realtime' | 'history' | 'favorites',
    label: string,
    Icon: typeof Activity
  ) => (
    <span
      className="inline-flex items-center gap-2"
      data-monitor-detail-tab-label-source="angular-title"
      data-monitor-detail-tab-label={key}
    >
      <Icon aria-hidden="true" className="h-3.5 w-3.5" data-monitor-detail-tab-icon={key} />
      <span>{label}</span>
    </span>
  );
  const tabs = [
    { key: 'realtime', label: renderTabLabel('realtime', t('monitor.detail.realtime'), Activity) },
    { key: 'history', label: renderTabLabel('history', t('monitor.detail.history'), LineChart) },
    { key: 'favorites', label: renderTabLabel('favorites', t('monitor.detail.favorite'), Star) },
    ...(grafanaUrl ? [{ key: 'grafana', label: t('monitor.detail.tab.grafana') }] : [])
  ] as Array<{ key: MonitorDetailConsoleTabKey; label: React.ReactNode }>;

  function renderTabContent() {
    switch (currentTab) {
      case 'realtime':
        return realtimeContent;
      case 'history':
        return historyContent;
      case 'favorites':
        return favoritesContent;
      case 'grafana':
        return grafanaContent ?? null;
      default:
        return realtimeContent;
    }
  }

  const refreshCopy =
    refreshInterval > 0
      ? `${t('monitor.detail.refresh-countdown')} ${refreshCountdown}s`
      : t('monitor.detail.refresh-disabled');

  const breadcrumbApp = navigationContext?.app || monitor.app || null;
  const breadcrumbAppTranslation = breadcrumbApp ? t(`monitor.app.${breadcrumbApp}`) : null;
  const breadcrumbAppLabel =
    breadcrumbAppTranslation && breadcrumbAppTranslation !== `monitor.app.${breadcrumbApp}`
      ? breadcrumbAppTranslation
      : breadcrumbApp;

  const refreshToolbar = (
    <div
      className="flex flex-wrap items-center justify-end gap-1.5"
      data-monitor-refresh-toolbar-variant="angular-tab-extra"
      data-monitor-refresh-toolbar-position="tabbar-extra"
      data-monitor-refresh-toolbar-density="angular-bordered-controls"
    >
      {signalHandoffLinks ? (
        <div
          className="flex min-w-0 flex-wrap items-center gap-1.5"
          data-monitor-signal-handoff="compact-actions"
          data-monitor-signal-handoff-source="context-only"
        >
          <ObservabilityControlChip
            as={Link}
            href={signalHandoffLinks.metricsHref}
            size="compact"
            title={t('otlp.metrics.title')}
            className="h-7 gap-1.5 px-2"
            data-monitor-signal-handoff-link="metrics"
          >
            <BarChart3 aria-hidden="true" className="h-3.5 w-3.5" />
            <span>{t('otlp.metrics.title')}</span>
          </ObservabilityControlChip>
          <ObservabilityControlChip
            as={Link}
            href={signalHandoffLinks.logsHref}
            size="compact"
            title={t('menu.log.manage')}
            className="h-7 gap-1.5 px-2"
            data-monitor-signal-handoff-link="logs"
          >
            <FileText aria-hidden="true" className="h-3.5 w-3.5" />
            <span>{t('menu.log.manage')}</span>
          </ObservabilityControlChip>
          <ObservabilityControlChip
            as={Link}
            href={signalHandoffLinks.tracesHref}
            size="compact"
            title={t('menu.trace.manage')}
            className="h-7 gap-1.5 px-2"
            data-monitor-signal-handoff-link="traces"
          >
            <GitBranch aria-hidden="true" className="h-3.5 w-3.5" />
            <span>{t('menu.trace.manage')}</span>
          </ObservabilityControlChip>
        </div>
      ) : null}
      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        <ObservabilityBadge
          as="span"
          size="compact"
          tone="tertiary"
          className="h-7 rounded-[2px] border border-[var(--ops-border-color)] bg-[var(--ops-surface-panel)] px-2.5 py-1 text-[11px] tracking-[0.04em]"
          style={cockpitMonoStyle}
          data-monitor-refresh-badge-variant="bordered"
        >
          {refreshCopy}
        </ObservabilityBadge>
        <Select
          aria-label={refreshCopy}
          data-monitor-refresh-select="true"
          data-monitor-refresh-select-density="bordered"
          value={refreshInterval}
          containerClassName="w-[82px]"
          className="h-7 min-w-0 text-[11px] font-medium text-[var(--ops-text-secondary)] hover:text-[var(--ops-text-primary)]"
          style={cockpitMonoStyle}
          onChange={event => onSelectRefreshInterval(Number(event.target.value))}
        >
          {REFRESH_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>
      <ObservabilityControlChip
        type="button"
        size="compact"
        aria-label={t('common.refresh')}
        title={t('common.refresh')}
        className="h-7 w-7 px-0"
        data-monitor-refresh-action-density="bordered"
        onClick={onRefresh}
      >
        <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />
        <span className="sr-only">{t('common.refresh')}</span>
      </ObservabilityControlChip>
    </div>
  );

  return (
    <div
      className="monitor-detail-page-frame -mx-4 space-y-2 border-t border-[var(--ops-border-color)] px-3 py-3 text-[var(--ops-text-primary)] sm:-mx-6 sm:px-3"
      data-monitor-console-layout="angular-workbench"
      data-monitor-console-tone="operator-sheet"
      data-monitor-detail-completion-guard="reported-angular-no-card-stack"
      data-monitor-detail-body-stack-state="single-workbench-table-rows"
      data-monitor-detail-completion-header="breadcrumb-only"
      data-monitor-first-viewport-rhythm="angular-tight"
      style={cockpitSansStyle}
    >
      <nav
        className="monitor-detail-workbench-breadcrumb flex flex-wrap items-center gap-2 border-b border-[var(--ops-border-color)] pb-2 text-[11px] text-[var(--ops-text-tertiary)]"
        data-monitor-detail-header-mode="breadcrumb-only"
        data-monitor-detail-reference-source="apache-hertzbeat-master-monitor-detail"
        aria-label={t('monitor.detail')}
      >
        <Link href="/" className="transition hover:text-[var(--ops-text-primary)]">
          {t('menu.dashboard')}
        </Link>
        <span className="text-[var(--ops-text-tertiary)]">/</span>
        <Link href={backHref} className="transition hover:text-[var(--ops-text-primary)]">
          {t('monitor.list')}
        </Link>
        <span className="text-[var(--ops-text-tertiary)]">/</span>
        <span className="text-[var(--ops-text-secondary)]">{t('monitor.detail')}</span>
        {breadcrumbApp ? (
          appHref ? (
            <ObservabilityControlChip
              as={Link}
              href={appHref}
              size="micro"
              className="ml-1"
              data-monitor-detail-app-chip="breadcrumb"
            >
              {breadcrumbAppLabel || breadcrumbApp}
            </ObservabilityControlChip>
          ) : (
            <ObservabilityControlChip as="span" size="micro" className="ml-1" data-monitor-detail-app-chip="breadcrumb">
              {breadcrumbAppLabel || breadcrumbApp}
            </ObservabilityControlChip>
          )
        ) : null}
      </nav>

      <section
        className="monitor-detail-workbench-layout overflow-visible bg-transparent"
        data-monitor-workbench-stage="angular-layout"
        data-monitor-workbench-stage-chrome="angular-tabset-direct"
        data-monitor-workbench-stage-rhythm="direct-tab-body"
      >
        <div className="monitor-detail-workbench-tabs pb-2" data-monitor-detail-tabset-type="angular-card">
          <ObservabilityTabStrip
            items={tabs}
            selectedKey={currentTab}
            onSelect={onSelectTab}
            panelIdPrefix={panelIdPrefix}
            tone="operator"
            variant="card"
            extra={refreshToolbar}
          />
        </div>

        <div
          className="space-y-2"
          data-monitor-console-tab-panel="true"
          data-monitor-console-tab-panel-rhythm="angular-tight"
          data-monitor-tab-body-surface="angular-tab-content-direct"
          id={`${panelIdPrefix}-panel-${currentTab}`}
          role="tabpanel"
          aria-labelledby={`${panelIdPrefix}-tab-${currentTab}`}
        >
          {renderTabContent()}
        </div>
      </section>
    </div>
  );
}
