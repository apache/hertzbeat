/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Skeleton } from 'antd';
import { useTranslation } from 'react-i18next';

import { OperationalStatePanel } from '@/shared/operational-page';
import { isDashboardFailureState, monitorTotals, type DashboardMonitorState } from '../model/dashboard-model';
import styles from './dashboard.module.css';
import { DashboardSummaryMetric } from './dashboard-summary-metric';

export function DashboardMonitorSummary({ state }: { state: DashboardMonitorState }) {
  const { t } = useTranslation();
  if (state.kind === 'loading') {
    return <Skeleton className={styles.summaryLoading ?? ''} active paragraph={false} />;
  }
  if (isDashboardFailureState(state)) {
    return (
      <OperationalStatePanel kind={summaryStateKind(state.kind)} title={t(`dashboard.monitorStates.${state.kind}`)} />
    );
  }
  if (state.kind === 'empty') {
    return <OperationalStatePanel kind="empty" title={t('dashboard.empty')} />;
  }
  const totals = monitorTotals(state.apps);
  return (
    <dl className={styles.monitorEvidence}>
      <DashboardSummaryMetric label={t('dashboard.unavailable')} value={totals.unavailable} />
      <DashboardSummaryMetric label={t('monitor.status.paused')} value={totals.unmanaged} />
    </dl>
  );
}

function summaryStateKind(kind: 'missing' | 'permission' | 'unavailable' | 'contract' | 'error') {
  if (kind === 'permission') return 'permission' as const;
  if (kind === 'error') return 'error' as const;
  return 'unavailable' as const;
}
