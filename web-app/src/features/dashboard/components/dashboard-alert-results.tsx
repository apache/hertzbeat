/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Skeleton, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import { isDashboardFailureState, type DashboardAlertState } from '../model/dashboard-model';
import styles from './dashboard.module.css';
import { DashboardSummaryMetric } from './dashboard-summary-metric';

export function DashboardAlertSummary({ state }: { state: DashboardAlertState }) {
  const { t } = useTranslation();
  if (state.kind === 'loading') {
    return <Skeleton className={styles.summaryLoading ?? ''} active paragraph={false} />;
  }
  if (isDashboardFailureState(state)) {
    return (
      <Typography.Text className={styles.summaryStatus ?? ''} type={state.kind === 'error' ? 'danger' : 'secondary'}>
        {t(`dashboard.alertStates.${state.kind}`)}
      </Typography.Text>
    );
  }
  const summary = state.summary;
  return (
    <dl className={styles.monitorEvidence}>
      <DashboardSummaryMetric label={t('alert.summary.total')} value={summary.total} />
      <DashboardSummaryMetric label={t('alert.summary.nonFiring')} value={`${summary.dealNum} (${summary.rate}%)`} />
      <DashboardSummaryMetric label={t('alert.summary.warning')} value={summary.priorityWarningNum} />
      <DashboardSummaryMetric label={t('alert.summary.critical')} value={summary.priorityCriticalNum} />
      <DashboardSummaryMetric label={t('alert.summary.emergency')} value={summary.priorityEmergencyNum} />
    </dl>
  );
}
