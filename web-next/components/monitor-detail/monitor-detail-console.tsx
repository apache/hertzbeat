'use client';

import Link from 'next/link';
import { Activity, HelpCircle, LineChart, RefreshCw, Star } from 'lucide-react';
import React from 'react';
import {
  HzActionGroup,
  HzIconLink,
  HzInlineContextMark,
  HzMonitorBreadcrumb,
  HzMonitorDetailConsoleShell,
  HzMonitorDetailTabLabel,
  HzMonitorDetailTabPanel,
  HzMonitorDetailTabs,
  HzMonitorDetailWorkbenchFrame,
  HzMonitorRefreshToolbar
} from '@hertzbeat/ui';
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

const REFRESH_OPTIONS = [
  { value: 10 },
  { value: 30 },
  { value: 60 },
  { value: 300 },
  { value: -1 }
] as const;

export function MonitorDetailConsole({
  monitor,
  currentTab,
  refreshInterval,
  refreshCountdown,
  backHref,
  helpHref,
  appHref,
  grafanaUrl,
  navigationContext,
  refreshTarget,
  grafanaRefreshFallbackTab,
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
  refreshTarget?: MonitorDetailConsoleTabKey;
  grafanaRefreshFallbackTab?: Exclude<MonitorDetailConsoleTabKey, 'grafana'>;
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
    <HzMonitorDetailTabLabel
      tabKey={key}
      icon={Icon}
      data-monitor-detail-tab-label-owner="hertzbeat-ui-detail-tab-label"
    >
      {label}
    </HzMonitorDetailTabLabel>
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

  const selectedRefreshValue = String(refreshInterval);
  const refreshOptions = REFRESH_OPTIONS.map(option => ({
    value: String(option.value),
    label: option.value > 0 ? t('monitor.detail.config-refresh', { time: option.value }) : t('monitor.detail.close-refresh')
  }));
  const selectedRefreshHasMenuOption = refreshOptions.some(option => option.value === selectedRefreshValue);
  const effectiveRefreshOptions =
    selectedRefreshHasMenuOption || refreshInterval <= 0
      ? refreshOptions
      : [{ value: selectedRefreshValue, label: t('monitor.detail.auto-refresh', { time: refreshInterval }) }, ...refreshOptions];
  const refreshCopy =
    refreshInterval > 0
      ? t('monitor.detail.auto-refresh', { time: refreshCountdown })
      : t('monitor.detail.close-refresh');

  const breadcrumbApp = navigationContext?.app || monitor.app || null;
  const breadcrumbAppTranslation = breadcrumbApp ? t(`monitor.app.${breadcrumbApp}`) : null;
  const breadcrumbAppLabel =
    breadcrumbAppTranslation && breadcrumbAppTranslation !== `monitor.app.${breadcrumbApp}`
      ? breadcrumbAppTranslation
      : breadcrumbApp;

  const detailTabExtra = (
    <HzActionGroup
      layout="end-wrap"
      density="inline"
      data-monitor-detail-tab-extra-owner="hertzbeat-ui-action-group"
      data-monitor-detail-tab-extra-contract="angular-refresh-help"
    >
      <HzMonitorRefreshToolbar
        refreshLabel={refreshCopy}
        refreshActionLabel={t('common.refresh')}
        selectedRefresh={selectedRefreshValue}
        refreshOptions={effectiveRefreshOptions}
        refreshIcon={<RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />}
        onRefreshChange={value => onSelectRefreshInterval(Number(value))}
        onRefresh={onRefresh}
        data-monitor-refresh-toolbar-variant="compact-toolbar-extra"
        data-monitor-refresh-toolbar-position="tabbar-extra"
        data-monitor-refresh-toolbar-density="inline-quiet-controls"
        data-hz-monitor-refresh-toolbar-layout="single-row-compact"
        data-monitor-detail-refresh-options-contract="angular-config-refresh-copy"
        data-monitor-detail-refresh-copy-contract="angular-deadline-label"
        data-monitor-detail-default-refresh-contract={refreshInterval === 90 ? 'angular-deadline-90' : undefined}
        data-monitor-detail-refresh-current-option={selectedRefreshHasMenuOption ? 'configured-option' : 'angular-default-deadline-current'}
        data-monitor-detail-countdown-reset-contract="angular-deadline-reset"
        data-monitor-detail-refresh-target={refreshTarget}
        data-monitor-detail-grafana-refresh-target={currentTab === 'grafana' ? grafanaRefreshFallbackTab : undefined}
      />
      {helpHref ? (
        <HzIconLink
          href={helpHref}
          label={t('common.button.help')}
          target="_blank"
          rel="noreferrer"
          data-monitor-detail-help-action="angular-docs-help"
          data-monitor-detail-help-owner="hertzbeat-ui-icon-link"
          data-monitor-detail-help-target={helpHref}
        >
          <HelpCircle aria-hidden="true" className="h-3.5 w-3.5" />
        </HzIconLink>
      ) : null}
    </HzActionGroup>
  );

  return (
    <HzMonitorDetailConsoleShell
      data-monitor-console-layout="angular-workbench"
      data-monitor-console-tone="operator-sheet"
      data-monitor-detail-console-shell-owner="hertzbeat-ui-detail-console-shell"
      data-monitor-detail-completion-guard="reported-angular-no-card-stack"
      data-monitor-detail-body-stack-state="single-workbench-table-rows"
      data-monitor-detail-completion-header="breadcrumb-only"
      data-monitor-first-viewport-rhythm="angular-tight"
      data-monitor-detail-history-catalog-load="angular-tab-click-lazy"
      data-monitor-detail-history-tab-load="angular-click-load-metric-chart"
      data-monitor-detail-realtime-tab-load="angular-click-load-real-time-metric"
      data-monitor-detail-favorite-tab-load="angular-click-load-favorite-metrics"
      data-monitor-detail-grafana-fallback-tab="angular-previous-data-tab"
    >
      <HzMonitorBreadcrumb
        data-monitor-detail-header-mode="breadcrumb-only"
        data-monitor-detail-reference-source="apache-hertzbeat-master-monitor-detail"
        data-monitor-detail-breadcrumb-owner="hertzbeat-ui-monitor-breadcrumb"
        aria-label={t('monitor.detail')}
      >
        <Link href="/">
          {t('menu.dashboard')}
        </Link>
        <span>/</span>
        <Link
          href={backHref}
          data-monitor-detail-list-return="angular-app-filter"
          data-monitor-detail-list-return-target={backHref}
        >
          {t('monitor.list')}
        </Link>
        <span>/</span>
        <span>{t('monitor.detail')}</span>
        {breadcrumbApp ? (
          appHref ? (
            <HzInlineContextMark
              component={Link}
              href={appHref}
              placement="breadcrumb"
              data-monitor-detail-context-mark="breadcrumb"
              data-monitor-detail-context-mark-owner="hertzbeat-ui-inline-context-mark"
              data-monitor-detail-app-definition-link="angular-monitor-app"
              data-monitor-detail-app-definition-target={appHref}
            >
              {breadcrumbAppLabel || breadcrumbApp}
            </HzInlineContextMark>
          ) : (
            <HzInlineContextMark
              placement="breadcrumb"
              data-monitor-detail-context-mark="breadcrumb"
              data-monitor-detail-context-mark-owner="hertzbeat-ui-inline-context-mark"
            >
              {breadcrumbAppLabel || breadcrumbApp}
            </HzInlineContextMark>
          )
        ) : null}
      </HzMonitorBreadcrumb>

      <HzMonitorDetailWorkbenchFrame
        data-monitor-workbench-stage="angular-layout"
        data-monitor-workbench-stage-owner="hertzbeat-ui-detail-workbench-frame"
        data-monitor-workbench-stage-chrome="angular-tabset-direct"
        data-monitor-workbench-stage-rhythm="direct-tab-body"
        tabs={
          <HzMonitorDetailTabs
            items={tabs}
            selectedKey={currentTab}
            onSelect={onSelectTab}
            panelIdPrefix={panelIdPrefix}
            extra={detailTabExtra}
            data-monitor-detail-tabs-owner="hertzbeat-ui-monitor-detail-tabs"
          />
        }
        tabsetProps={{
          'data-monitor-detail-tabset-type': 'bottom-underline-switch'
        } as React.HTMLAttributes<HTMLDivElement>}
      >

        <HzMonitorDetailTabPanel
          id={`${panelIdPrefix}-panel-${currentTab}`}
          tabId={`${panelIdPrefix}-tab-${currentTab}`}
          active
          data-monitor-console-tab-panel-owner="hertzbeat-ui-detail-tab-panel"
        >
          {renderTabContent()}
        </HzMonitorDetailTabPanel>
      </HzMonitorDetailWorkbenchFrame>
    </HzMonitorDetailConsoleShell>
  );
}
