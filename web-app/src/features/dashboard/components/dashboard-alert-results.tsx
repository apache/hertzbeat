/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Skeleton } from 'antd';
import { useTranslation } from 'react-i18next';

import { OperationalStatePanel } from '@/shared/operational-page';
import { isDashboardFailureState, type DashboardAlertState, unresolvedAlertTotal } from '../model/dashboard-model';
import styles from './dashboard.module.css';
import { DashboardSummaryMetric } from './dashboard-summary-metric';

export function DashboardAlertSummary({ state }: { state: DashboardAlertState }) {
  const { t } = useTranslation();
  if (state.kind === 'loading') {
    return <Skeleton className={styles.summaryLoading ?? ''} active paragraph={false} />;
  }
  if (isDashboardFailureState(state)) {
    return (
      <OperationalStatePanel kind={summaryStateKind(state.kind)} title={t(`dashboard.alertStates.${state.kind}`)} />
    );
  }
  if (state.kind === 'empty') {
    return <OperationalStatePanel kind="empty" title={t('dashboard.alertEmpty')} />;
  }
  const summary = state.summary;
  return (
    <dl className={styles.monitorEvidence}>
      <DashboardSummaryMetric label={t('dashboard.unresolvedAlerts')} value={unresolvedAlertTotal(summary)} />
      <DashboardSummaryMetric label={t('alert.summary.warning')} value={summary.priorityWarningNum} />
      <DashboardSummaryMetric label={t('alert.summary.critical')} value={summary.priorityCriticalNum} />
      <DashboardSummaryMetric label={t('alert.summary.emergency')} value={summary.priorityEmergencyNum} />
    </dl>
  );
}

function summaryStateKind(kind: 'missing' | 'permission' | 'unavailable' | 'contract' | 'error') {
  if (kind === 'permission') return 'permission' as const;
  if (kind === 'error') return 'error' as const;
  return 'unavailable' as const;
}
