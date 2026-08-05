/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Skeleton, Tag } from 'antd';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';

import type { RuntimeStatusPresentation, RuntimeStatusViewModel } from '@/features/runtime-status';
import { OperationalStatePanel } from '@/shared/operational-page';

import styles from './dashboard.module.css';
import { DashboardSummaryMetric } from './dashboard-summary-metric';

export function DashboardRuntimeSummary({ state }: { state: RuntimeStatusViewModel }) {
  const { t } = useTranslation();
  if (state.state === 'loading') {
    return <Skeleton className={styles.summaryLoading ?? ''} active paragraph={false} />;
  }
  if (state.state === 'request-failed') {
    return (
      <OperationalStatePanel
        kind={runtimeFailureStateKind(state.failure)}
        title={t(`dashboard.runtimeStates.${state.failure}`)}
      />
    );
  }
  return (
    <dl className={styles.monitorEvidence}>
      <RuntimeMetric label={t('dashboard.runtime.server')} status={state.snapshot.server} t={t} />
      <RuntimeMetric label={t('dashboard.runtime.storage')} status={state.snapshot.storage} t={t} />
      <RuntimeMetric label={t('dashboard.runtime.collectors')} status={state.snapshot.collectors} t={t} />
    </dl>
  );
}

function RuntimeMetric({ label, status, t }: { label: string; status: RuntimeStatusPresentation; t: TFunction }) {
  return (
    <DashboardSummaryMetric
      label={label}
      value={<Tag color={runtimeStatusColor(status.status)}>{t(`dashboard.runtime.status.${status.status}`)}</Tag>}
    />
  );
}

function runtimeStatusColor(status: RuntimeStatusPresentation['status']) {
  if (status === 'available') return 'success';
  if (status === 'degraded') return 'warning';
  if (status === 'unavailable') return 'error';
  return 'default';
}

function runtimeFailureStateKind(failure: 'permission' | 'unavailable' | 'contract' | 'error') {
  if (failure === 'permission') return 'permission' as const;
  if (failure === 'error') return 'error' as const;
  return 'unavailable' as const;
}
