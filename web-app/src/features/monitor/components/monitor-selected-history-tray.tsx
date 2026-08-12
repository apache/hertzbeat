/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';

import type { MonitorHistoryChart, MonitorMetricWorkbenchController } from '../model/monitor-detail-model';
import { HistoryAvailabilityBoundary, HistoryChartEvidence } from './monitor-history-chart';
import styles from './monitor-history-results.module.css';
import { formatMetricTime, historyStatistics, selectedCurrentValue } from './monitor-history-values';
import { SelectedHistoryControls } from './monitor-selected-history-controls';

export function MonitorSelectedHistoryTray({
  state,
  actions
}: Pick<MonitorMetricWorkbenchController, 'state' | 'actions'>) {
  const { t } = useTranslation();
  const dock = state.layout.layout.historyDock;
  const resize = useHistoryDockResize(state, actions);
  const chart = state.selectedHistoryChart;
  if (!chart) return null;
  return (
    <section
      className={styles.selectedHistoryTray}
      data-monitor-history-tray=""
      data-history-metric={chart.metric.key}
      data-layout-editing={state.layout.editing}
      style={{ '--monitor-history-height': `${dock.height * 22}px` } as CSSProperties}
      aria-label={`${t('monitorMetrics.historyTrend')} ${chart.metric.key}`}
    >
      <SelectedHistoryHeader state={state} actions={actions} chart={chart} />
      <SelectedHistoryContent state={state} actions={actions} chart={chart} resize={resize} />
    </section>
  );
}

function SelectedHistoryContent({
  state,
  chart,
  resize
}: Pick<MonitorMetricWorkbenchController, 'state' | 'actions'> & {
  chart: MonitorHistoryChart;
  resize: ReturnType<typeof useHistoryDockResize>;
}) {
  const { t } = useTranslation();
  return (
    <>
      {state.layout.editing ? (
        <div
          className={styles.historyDockResizeHandle}
          role="separator"
          tabIndex={0}
          aria-orientation="horizontal"
          aria-label={t('monitorMetrics.layout.resizeHistory')}
          {...resize}
        />
      ) : null}
      <SelectedHistoryStatistics chart={chart} />
      <HistoryAvailabilityBoundary availability={state.historyAvailability}>
        <HistoryChartEvidence chart={chart} />
      </HistoryAvailabilityBoundary>
    </>
  );
}

function SelectedHistoryHeader({
  state,
  actions,
  chart
}: Pick<MonitorMetricWorkbenchController, 'state' | 'actions'> & {
  chart: MonitorHistoryChart;
}) {
  const { t } = useTranslation();
  const current = selectedCurrentValue(state, chart.metric.field);
  return (
    <header className={styles.selectedHistoryHeader}>
      <div className={styles.selectedHistoryIdentity}>
        <strong>{t('monitorMetrics.historyTrend')}:</strong>
        <span>{chart.metric.key}</span>
        <span className={styles.currentMetricValue}>
          {t('monitorMetrics.currentValue')}: {current.value}
          {chart.metric.unit ? ` ${chart.metric.unit}` : ''}
        </span>
        <time>{formatMetricTime(current.time)}</time>
      </div>
      <SelectedHistoryControls chart={chart} actions={actions} />
    </header>
  );
}

function useHistoryDockResize(
  state: MonitorMetricWorkbenchController['state'],
  actions: MonitorMetricWorkbenchController['actions']
) {
  const drag = useRef<{ startY: number; height: number } | null>(null);
  const update = (height: number) =>
    actions.layout.changeHistoryDock({
      ...state.layout.layout.historyDock,
      collapsed: false,
      height: Math.min(20, Math.max(8, height))
    });
  return {
    onPointerDown: (event: PointerEvent<HTMLDivElement>) => {
      drag.current = { startY: event.clientY, height: state.layout.layout.historyDock.height };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    onPointerMove: (event: PointerEvent<HTMLDivElement>) => {
      if (drag.current) update(drag.current.height + Math.round((event.clientY - drag.current.startY) / 22));
    },
    onPointerUp: (event: PointerEvent<HTMLDivElement>) => {
      drag.current = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId))
        event.currentTarget.releasePointerCapture(event.pointerId);
    },
    onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
      event.preventDefault();
      update(state.layout.layout.historyDock.height + (event.key === 'ArrowDown' ? 1 : -1));
    }
  };
}

function SelectedHistoryStatistics({ chart }: { chart: MonitorHistoryChart }) {
  const { t } = useTranslation();
  const statistics = historyStatistics(chart);
  if (!statistics) return null;
  const items = [
    [t('monitorMetrics.minimum'), statistics.minimum],
    [t('monitorMetrics.maximum'), statistics.maximum],
    [t('monitorMetrics.average'), statistics.average],
    [t('monitorMetrics.samples'), statistics.samples]
  ];
  return (
    <dl className={styles.historyStatistics}>
      {items.map(([label, value]) => (
        <div key={label} className={styles.historyStatistic}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
