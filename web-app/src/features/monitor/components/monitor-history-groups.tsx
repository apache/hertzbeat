/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Button, Select, Space } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { OperationalStatePanel } from '@/shared/operational-page';
import type { MonitorHistoryChart, MonitorMetricWorkbenchController } from '../model/monitor-detail-model';
import { monitorFieldLabel, monitorGroupLabel, monitorHistoryLabel } from '../model/monitor-metric-labels';
import { HistoryAvailabilityBoundary, HistoryChartEvidence } from './monitor-history-chart';
import { SelectedHistoryControls } from './monitor-selected-history-controls';
import { useActivateWhenVisible } from './use-activate-when-visible';
import styles from './monitor-history-groups.module.css';

export function MonitorHistoryGroups(props: MonitorMetricWorkbenchController) {
  if (!props.state.historyGroupSelection || !props.actions.setHistoryGroups || !props.actions.setHistoryCollapsedGroups)
    return null;
  return <HistoryGroups key={props.state.historyGroupSelection.sourceKey} {...props} />;
}

function HistoryGroups({ state, actions }: MonitorMetricWorkbenchController) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const selection = state.historyGroupSelection!;
  return (
    <details className={styles.groups} onToggle={event => setOpen(event.currentTarget.open)}>
      <summary>{t('monitorMetrics.historyGroupsTitle')}</summary>
      {open ? (
        <>
          <HistoryGroupToolbar state={state} actions={actions} />
          <HistoryAvailabilityBoundary availability={state.historyAvailability}>
            {selection.selected.length === 0 ? (
              <OperationalStatePanel kind="no-match" title={t('monitorMetrics.noMatches')} />
            ) : null}
            {selection.names
              .filter(group => selection.selected.includes(group))
              .map(group => {
                const collapsed = selection.collapsed.includes(group);
                return (
                  <section key={group} className={styles.group}>
                    <Button
                      aria-expanded={!collapsed}
                      aria-label={t(collapsed ? 'monitorMetrics.expandGroup' : 'monitorMetrics.collapseGroup', {
                        group: monitorGroupLabel(state.metricLabels, group)
                      })}
                      title={group}
                      onClick={() =>
                        actions.setHistoryCollapsedGroups?.(
                          collapsed
                            ? selection.collapsed.filter(item => item !== group)
                            : [...selection.collapsed, group]
                        )
                      }
                    >
                      {monitorGroupLabel(state.metricLabels, group)}
                    </Button>
                    {!collapsed ? (
                      <div className={styles.charts}>
                        {state.historyCharts
                          .filter(chart => chart.metric.group === group)
                          .map(chart => (
                            <GroupedHistoryChart key={chart.metric.key} chart={chart} state={state} actions={actions} />
                          ))}
                      </div>
                    ) : null}
                  </section>
                );
              })}
            {state.hasMoreHistoryCharts ? (
              <Button onClick={actions.loadMoreHistoryCharts}>{t('monitorMetrics.loadMore')}</Button>
            ) : null}
          </HistoryAvailabilityBoundary>
        </>
      ) : null}
    </details>
  );
}

function HistoryGroupToolbar({ state, actions }: MonitorMetricWorkbenchController) {
  const { t } = useTranslation();
  const selection = state.historyGroupSelection!;
  return (
    <Space wrap className={styles.toolbar!}>
      <Select
        mode="multiple"
        value={selection.selected}
        aria-label={t('monitorMetrics.groupFilter')}
        className={styles.filter!}
        options={selection.names.map(value => ({ value, label: monitorGroupLabel(state.metricLabels, value) }))}
        onChange={values => actions.setHistoryGroups?.(values)}
      />
      <Button onClick={() => actions.setHistoryGroups?.(selection.names)}>{t('monitorMetrics.allGroups')}</Button>
      <Button onClick={() => actions.setHistoryCollapsedGroups?.([])}>{t('monitorMetrics.expandAllGroups')}</Button>
      <Button onClick={() => actions.setHistoryCollapsedGroups?.(selection.names)}>
        {t('monitorMetrics.collapseAllGroups')}
      </Button>
    </Space>
  );
}

function GroupedHistoryChart({
  chart,
  state,
  actions
}: {
  chart: MonitorHistoryChart;
  state: MonitorMetricWorkbenchController['state'];
  actions: MonitorMetricWorkbenchController['actions'];
}) {
  const ref = useActivateWhenVisible<HTMLDivElement>(chart.result.kind === 'loading', () =>
    actions.activateHistoryChart(chart.metric.key)
  );
  return (
    <article ref={ref} className={styles.chart} aria-label={chart.metric.key}>
      <header>
        <strong title={chart.metric.field}>
          {monitorFieldLabel(state.metricLabels, chart.metric.group, chart.metric.field)}
        </strong>
        <SelectedHistoryControls chart={chart} actions={actions} investigationSignals={state.investigationSignals} />
      </header>
      <HistoryChartEvidence chart={chart} title={monitorHistoryLabel(state.metricLabels, chart.metric)} />
    </article>
  );
}
