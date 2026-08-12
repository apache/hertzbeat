/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Alert } from 'antd';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { OperationalStatePanel } from '@/shared/operational-page';

import type { MonitorHistoryChart, MonitorMetricWorkbenchController } from '../model/monitor-detail-model';
import type { MonitorHistoryChartRenderInput, MonitorHistoryChartRuntime } from './monitor-history-chart-runtime';
import styles from './monitor-history-results.module.css';

export function HistoryAvailabilityBoundary({
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

export function HistoryChartEvidence({ chart }: { chart: MonitorHistoryChart }) {
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
  const element = useRef<HTMLDivElement>(null);
  const runtime = useRef<MonitorHistoryChartRuntime | undefined>(undefined);
  const input = useMemo<MonitorHistoryChartRenderInput>(
    () => ({
      title: chart.metric.key,
      unit: chart.metric.unit,
      series: chart.result.rows
    }),
    [chart.metric.key, chart.metric.unit, chart.result.rows]
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
