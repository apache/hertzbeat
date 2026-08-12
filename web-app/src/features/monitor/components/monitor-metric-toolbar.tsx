/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { PauseOutlined, ReloadOutlined } from '@ant-design/icons';
import { Button, Input, Select } from 'antd';
import { useTranslation } from 'react-i18next';

import { OperationalCommandBar } from '@/shared/operational-page';

import type { MonitorMetricWorkbenchController } from '../model/monitor-detail-model';
import { MonitorMetricLayoutToolbar } from './monitor-metric-layout-toolbar';
import styles from './monitor-metric-workbench.module.css';
import { MonitorRefreshSelect } from './monitor-refresh-select';
import { MonitorSegmentedSwitch } from './monitor-segmented-switch';

export type MetricView = 'all' | 'favorites';

type MonitorMetricToolbarProps = Pick<MonitorMetricWorkbenchController, 'state' | 'actions'> & {
  view: MetricView;
  search: string;
  groupFilter: string;
  favoriteCount: number;
  onViewChange: (value: MetricView) => void;
  onSearchChange: (value: string) => void;
  onGroupFilterChange: (value: string) => void;
  onBeginLayoutEdit: () => void;
};

export function MonitorMetricToolbar(props: MonitorMetricToolbarProps) {
  const { t } = useTranslation();
  return (
    <OperationalCommandBar
      ariaLabel={t('monitorMetrics.title')}
      primary={<MetricToolbarPrimary {...props} />}
      secondary={
        <div className={styles.metricToolbarSecondary}>
          <MetricRefreshControls state={props.state} actions={props.actions} />
          <MonitorMetricLayoutToolbar
            state={props.state.layout}
            actions={props.actions.layout}
            onBeginEdit={props.onBeginLayoutEdit}
          />
        </div>
      }
    />
  );
}

function MetricToolbarPrimary({
  state,
  view,
  search,
  groupFilter,
  favoriteCount,
  onViewChange,
  onSearchChange,
  onGroupFilterChange
}: MonitorMetricToolbarProps) {
  const { t } = useTranslation();
  return (
    <div className={styles.metricToolbarPrimary}>
      <Input
        allowClear
        type="search"
        value={search}
        aria-label={t('monitorMetrics.search')}
        placeholder={t('monitorMetrics.searchPlaceholder')}
        disabled={state.layout.editing}
        onChange={event => onSearchChange(event.target.value)}
      />
      <Select
        value={groupFilter}
        disabled={state.layout.editing}
        aria-label={t('monitorMetrics.groupFilter')}
        onChange={onGroupFilterChange}
        options={[
          { value: '', label: t('monitorMetrics.allGroups') },
          ...state.realtimeGroupNames.map(group => ({ value: group, label: group }))
        ]}
      />
      <MetricViewSwitch
        view={view}
        allCount={state.catalog.options.length}
        favoriteCount={favoriteCount}
        onChange={onViewChange}
        disabled={state.layout.editing}
      />
    </div>
  );
}

function MetricViewSwitch({
  view,
  allCount,
  favoriteCount,
  onChange,
  disabled
}: {
  view: MetricView;
  allCount: number;
  favoriteCount: number;
  onChange: (value: MetricView) => void;
  disabled: boolean;
}) {
  const { t } = useTranslation();
  return (
    <MonitorSegmentedSwitch<MetricView>
      label={t('monitorMetrics.metricView')}
      value={view}
      options={[
        { value: 'all', label: t('monitorMetrics.allMetricCount', { count: allCount }) },
        { value: 'favorites', label: t('monitorMetrics.favoriteMetricCount', { count: favoriteCount }) }
      ]}
      disabled={disabled}
      onChange={onChange}
    />
  );
}

function MetricRefreshControls({ state, actions }: Pick<MonitorMetricWorkbenchController, 'state' | 'actions'>) {
  const { t } = useTranslation();
  return (
    <div className={styles.metricRefreshControls}>
      <Button icon={<ReloadOutlined />} aria-label={t('common.refresh')} onClick={actions.refresh} />
      <MonitorRefreshSelect value={state.refreshSeconds} onChange={actions.setRefreshSeconds} />
      <span className={styles.recentSample}>
        {t('monitorMetrics.latestSample')}: {formatShortTime(latestSampleTime(state.realtimeGroups))}
      </span>
      <span className={state.refreshSeconds === 0 ? styles.pausedState : styles.liveState}>
        {t(state.refreshSeconds === 0 ? 'monitorMetrics.paused' : 'monitorMetrics.live')}
      </span>
      {state.refreshSeconds === 0 ? (
        <Button size="small" onClick={() => actions.setRefreshSeconds(60)}>
          {t('monitorMetrics.returnLive')}
        </Button>
      ) : (
        <Button
          size="small"
          icon={<PauseOutlined />}
          aria-label={t('monitorMetrics.pause')}
          onClick={() => actions.setRefreshSeconds(0)}
        />
      )}
    </div>
  );
}

function latestSampleTime(groups: MonitorMetricWorkbenchController['state']['realtimeGroups']) {
  let latest: number | null = null;
  for (const group of groups) {
    if (group.result.kind !== 'ready' && group.result.kind !== 'loading') continue;
    for (const row of group.result.rows) {
      const value = row.collectedAt ?? row.time;
      if (value != null) latest = latest == null ? value : Math.max(latest, value);
    }
  }
  return latest;
}

function formatShortTime(value: number | null) {
  return value == null ? '—' : new Intl.DateTimeFormat(undefined, { timeStyle: 'medium' }).format(value);
}
