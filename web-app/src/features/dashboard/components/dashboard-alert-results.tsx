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
  return (
    <div className={styles.alertEvidence}>
      <span className={styles.alertValue}>{state.summary.total}</span>
      <div>
        <div className={styles.metricLabel}>{t('dashboard.alerts')}</div>
        <Typography.Text type="secondary">
          {t(state.kind === 'empty' ? 'dashboard.alertEmpty' : 'dashboard.alertReady', {
            count: state.summary.total
          })}
        </Typography.Text>
      </div>
    </div>
  );
}
