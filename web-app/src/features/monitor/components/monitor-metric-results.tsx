/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { OperationalStatePanel } from '@/shared/operational-page';

import type { MonitorMetricWorkbenchController } from '../model/monitor-detail-model';
import { availableFavoriteGroups, filterRealtimeGroups } from './monitor-metric-group-navigation';
import { MonitorMetricToolbar, type MetricView } from './monitor-metric-toolbar';
import { MonitorRealtimeResult } from './monitor-realtime-results';
import { MonitorSelectedHistoryTray } from './monitor-selected-history-tray';
import styles from './monitor-metric-workbench.module.css';

export function MonitorMetricResults({ state, actions }: MonitorMetricWorkbenchController) {
  const [view, setView] = useState<MetricView>('all');
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const favoriteGroups = useMemo(() => availableFavoriteGroups(state.favoriteCollection), [state.favoriteCollection]);
  const groups = useMemo(
    () => filterRealtimeGroups(state.realtimeGroups, favoriteGroups, view, search, groupFilter),
    [favoriteGroups, groupFilter, search, state.realtimeGroups, view]
  );
  useActivateSelectedHistory(state, actions);
  return (
    <>
      <MonitorMetricToolbar
        state={state}
        actions={actions}
        view={view}
        search={search}
        groupFilter={groupFilter}
        favoriteCount={favoriteGroups.size}
        onViewChange={setView}
        onSearchChange={setSearch}
        onGroupFilterChange={setGroupFilter}
        onBeginLayoutEdit={() => {
          setView('all');
          setSearch('');
          setGroupFilter('');
        }}
      />
      <MonitorSelectedHistoryTray state={state} actions={actions} />
      <MetricResultsBody
        state={state}
        actions={actions}
        groups={groups}
        favoriteGroupCount={favoriteGroups.size}
        view={view}
      />
    </>
  );
}

function MetricResultsBody({
  state,
  actions,
  groups,
  favoriteGroupCount,
  view
}: {
  state: MonitorMetricWorkbenchController['state'];
  actions: MonitorMetricWorkbenchController['actions'];
  groups: MonitorMetricWorkbenchController['state']['realtimeGroups'];
  favoriteGroupCount: number;
  view: MetricView;
}) {
  const { t } = useTranslation();
  if (view === 'favorites' && state.favoriteCollection.kind !== 'ready') {
    return <FavoriteCollectionState kind={state.favoriteCollection.kind} />;
  }
  if (view === 'favorites' && favoriteGroupCount === 0) {
    return <FavoriteCollectionState kind="empty" />;
  }
  if (groups.length === 0) return <OperationalStatePanel kind="no-match" title={t('monitorMetrics.noMatches')} />;
  return (
    <div className={styles.currentValueWorkspace}>
      <MonitorRealtimeResult
        state={state}
        actions={actions}
        groups={groups}
        onSelectMetric={metricKey => {
          actions.setMetric(metricKey);
          actions.activateHistoryChart(metricKey);
        }}
      />
    </div>
  );
}

function useActivateSelectedHistory(
  state: MonitorMetricWorkbenchController['state'],
  actions: MonitorMetricWorkbenchController['actions']
) {
  const activatedHistoryKey = useRef<string | undefined>(undefined);
  useEffect(() => {
    const metricKey = state.selectedHistoryChart?.metric.key;
    if (!metricKey || !state.historySupported) {
      activatedHistoryKey.current = undefined;
      return;
    }
    if (activatedHistoryKey.current === metricKey) return;
    activatedHistoryKey.current = metricKey;
    actions.activateHistoryChart(metricKey);
  }, [actions, state.historySupported, state.selectedHistoryChart?.metric.key]);
}

function FavoriteCollectionState({ kind }: { kind: 'loading' | 'empty' | 'unavailable' | 'error' }) {
  const { t } = useTranslation();
  switch (kind) {
    case 'loading':
      return <OperationalStatePanel kind="loading" title={t('monitorMetrics.loading')} />;
    case 'empty':
      return <OperationalStatePanel kind="empty" title={t('monitorMetrics.favoriteEmpty')} />;
    case 'unavailable':
      return <OperationalStatePanel kind="unavailable" title={t('common.unavailable')} />;
    case 'error':
      return <OperationalStatePanel kind="error" title={t('common.routeError.description')} />;
  }
}
