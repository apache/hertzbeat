/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Alert, Button, Select } from 'antd';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { OperationalStatePanel } from '@/shared/operational-page';

import {
  monitorMetricHistoryRanges,
  type MonitorHistoryChart,
  type MonitorMetricWorkbenchController
} from '../model/monitor-detail-model';
import type { MonitorHistoryChartRenderInput, MonitorHistoryChartRuntime } from './monitor-history-chart-runtime';
import styles from './monitor-metric-workbench.module.css';
import { useActivateWhenVisible } from './use-activate-when-visible';

export function MonitorHistoryResult({ state, actions }: Pick<MonitorMetricWorkbenchController, 'state' | 'actions'>) {
  const { t } = useTranslation();
  return (
    <HistoryAvailabilityBoundary availability={state.historyAvailability}>
      {state.historyCharts.length === 0 && !state.hasMoreHistoryCharts ? (
        <OperationalStatePanel
          kind="empty"
          title={t(state.historySupported ? 'monitorMetrics.empty' : 'monitorMetrics.historyUnsupported')}
        />
      ) : (
        <div className={styles.historyGrid}>
          {state.historyCharts.map(chart => (
            <MonitorHistoryChartCard key={chart.metric.key} chart={chart} actions={actions} />
          ))}
          {state.hasMoreHistoryCharts ? <HistoryLoadMore actions={actions} /> : null}
        </div>
      )}
    </HistoryAvailabilityBoundary>
  );
}

function HistoryAvailabilityBoundary({
  availability,
  children
}: {
  availability: MonitorMetricWorkbenchController['state']['historyAvailability'];
  children: ReactNode;
}) {
  const { t } = useTranslation();
  if (availability.kind === 'loading')
    return <OperationalStatePanel kind="loading" title={t('monitorMetrics.loading')} />;
  if (availability.kind === 'unavailable')
    return <OperationalStatePanel kind="unavailable" title={t('common.unavailable')} />;
  if (availability.kind === 'unknown')
    return <OperationalStatePanel kind="unavailable" title={t('monitorMetrics.storageUnknown')} />;
  if (availability.kind === 'error')
    return <OperationalStatePanel kind="error" title={t('common.routeError.description')} />;
  return (
    <div className={styles.historyResult}>
      {availability.kind === 'degraded' ? (
        <Alert type="warning" showIcon message={t('monitorMetrics.storageDegraded')} />
      ) : null}
      {children}
    </div>
  );
}

export function MonitorSelectedHistoryResult({
  state,
  actions
}: Pick<MonitorMetricWorkbenchController, 'state' | 'actions'>) {
  const { t } = useTranslation();
  const chart = state.selectedHistoryChart;
  return (
    <HistoryAvailabilityBoundary availability={state.historyAvailability}>
      {chart ? (
        <MonitorHistoryChartCard chart={chart} actions={actions} />
      ) : (
        <OperationalStatePanel kind="empty" title={t('monitorMetrics.historyUnsupported')} />
      )}
    </HistoryAvailabilityBoundary>
  );
}

function MonitorHistoryChartCard({
  chart,
  actions
}: {
  chart: MonitorHistoryChart;
  actions: MonitorMetricWorkbenchController['actions'];
}) {
  const { t } = useTranslation();
  const target = useActivateWhenVisible<HTMLElement>(
    true,
    () => actions.activateHistoryChart(chart.metric.key),
    '240px 0px'
  );
  return (
    <article ref={target} className={styles.historyChart} data-history-metric={chart.metric.key}>
      <header className={styles.historyChartHeader}>
        <div className={styles.historyChartTitle}>
          <h5>{chart.metric.key}</h5>
          {chart.metric.unit ? <span>{chart.metric.unit}</span> : null}
        </div>
        <div className={styles.historyChartActions}>
          <Select
            size="small"
            value={chart.history}
            aria-label={t('monitorMetrics.historyRange')}
            onChange={value => actions.setHistoryChartRange(chart.metric.key, value)}
            options={monitorMetricHistoryRanges.map(value => ({ value, label: value }))}
          />
          <Button size="small" onClick={() => actions.refreshHistoryChart(chart.metric.key)}>
            {t('common.refresh')}
          </Button>
        </div>
      </header>
      <HistoryChartEvidence chart={chart} />
    </article>
  );
}

function HistoryChartEvidence({ chart }: { chart: MonitorHistoryChart }) {
  const { t } = useTranslation();
  if (chart.result.kind === 'unavailable') return <ChartState kind="unavailable" title={t('common.unavailable')} />;
  if (chart.result.kind === 'error') return <ChartState kind="error" title={t('common.routeError.description')} />;
  if (chart.result.kind === 'empty') return <ChartState kind="empty" title={t('monitorMetrics.empty')} />;
  if (chart.result.kind === 'unsupported')
    return <ChartState kind="empty" title={t('monitorMetrics.historyUnsupported')} />;
  if (chart.result.kind === 'loading') return <ChartState kind="loading" title={t('monitorMetrics.loading')} />;
  return <HistoryChartCanvas chart={chart} />;
}

function HistoryChartCanvas({ chart }: { chart: MonitorHistoryChart }) {
  const { t } = useTranslation();
  const element = useRef<HTMLDivElement>(null);
  const runtime = useRef<MonitorHistoryChartRuntime | undefined>(undefined);
  const input = useMemo<MonitorHistoryChartRenderInput>(
    () => ({
      title: chart.metric.key,
      unit: chart.metric.unit,
      series: chart.result.rows,
      saveImageTitle: t('monitorMetrics.saveImage')
    }),
    [chart.metric.key, chart.metric.unit, chart.result.rows, t]
  );
  const latest = useRef(input);
  useEffect(() => {
    latest.current = input;
    runtime.current?.update(input);
  }, [input]);
  useEffect(() => {
    let cancelled = false;
    async function mountChart() {
      const module = await import('./monitor-history-chart-runtime');
      if (cancelled || !element.current) return;
      runtime.current = module.createMonitorHistoryChart(element.current, latest.current);
    }
    void mountChart();
    return () => {
      cancelled = true;
      runtime.current?.dispose();
      runtime.current = undefined;
    };
  }, [chart.metric.key]);
  return <div ref={element} className={styles.historyChartCanvas} role="img" aria-label={chart.metric.key} />;
}

function ChartState({ kind, title }: { kind: 'loading' | 'empty' | 'unavailable' | 'error'; title: string }) {
  return (
    <div className={styles.historyChartState}>
      <OperationalStatePanel kind={kind} title={title} />
    </div>
  );
}

function HistoryLoadMore({ actions }: Pick<MonitorMetricWorkbenchController, 'actions'>) {
  const { t } = useTranslation();
  const target = useActivateWhenVisible<HTMLButtonElement>(true, actions.loadMoreHistoryCharts);
  return (
    <Button ref={target} className={styles.loadMore!} onClick={actions.loadMoreHistoryCharts}>
      {t('monitorMetrics.loadMoreHistory')}
    </Button>
  );
}
