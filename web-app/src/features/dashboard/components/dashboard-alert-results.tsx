/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Alert, Skeleton, Statistic } from 'antd';
import { useTranslation } from 'react-i18next';

import type { DashboardAlertState } from '../model/dashboard-model';
import styles from './dashboard.module.css';

export function DashboardAlertSummary({ state }: { state: DashboardAlertState }) {
  const { t } = useTranslation();
  if (state.kind === 'loading') {
    return <Skeleton className={styles.summaryLoading ?? ''} active paragraph={false} />;
  }
  if (state.kind === 'missing' || state.kind === 'unavailable' || state.kind === 'error') {
    return (
      <Alert
        className={styles.summaryState ?? ''}
        type={state.kind === 'error' ? 'error' : 'warning'}
        showIcon
        message={t(`dashboard.alertStates.${state.kind}`)}
      />
    );
  }
  return <Statistic title={t('dashboard.alerts')} value={state.summary.total} />;
}
