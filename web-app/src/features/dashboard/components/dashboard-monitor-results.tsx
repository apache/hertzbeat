/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Skeleton, Table, Tag, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import { monitorTotals, type AppCount, type DashboardMonitorState } from '../model/dashboard-model';
import styles from './dashboard.module.css';

export function DashboardMonitorSummary({ state }: { state: DashboardMonitorState }) {
  const { t } = useTranslation();
  if (state.kind === 'loading') {
    return <Skeleton className={styles.summaryLoading ?? ''} active paragraph={false} />;
  }
  if (state.kind === 'missing' || state.kind === 'unavailable' || state.kind === 'error') {
    return (
      <Typography.Text className={styles.summaryStatus ?? ''} type={state.kind === 'error' ? 'danger' : 'secondary'}>
        {t(`dashboard.monitorStates.${state.kind}`)}
      </Typography.Text>
    );
  }
  if (state.kind === 'empty') {
    return <Typography.Text type="secondary">{t('dashboard.empty')}</Typography.Text>;
  }
  const totals = monitorTotals(state.apps);
  return (
    <dl className={styles.monitorEvidence}>
      <DashboardMetric label={t('dashboard.total')} value={totals.total} />
      <DashboardMetric label={t('dashboard.available')} value={totals.available} />
      <DashboardMetric label={t('dashboard.unavailable')} value={totals.unavailable} />
    </dl>
  );
}

export function DashboardMonitorDistribution({ state }: { state: DashboardMonitorState }) {
  const { t } = useTranslation();
  if (state.kind !== 'ready') return null;
  return (
    <section className={styles.section}>
      <Typography.Title level={4}>{t('dashboard.distribution')}</Typography.Title>
      <Table<AppCount>
        rowKey={row => `${row.category}-${row.app}`}
        pagination={false}
        size="small"
        dataSource={state.apps}
        columns={monitorColumns(t)}
      />
    </section>
  );
}

function monitorColumns(t: ReturnType<typeof useTranslation>['t']) {
  return [
    { title: t('dashboard.application'), dataIndex: 'app' },
    { title: t('dashboard.category'), dataIndex: 'category' },
    { title: t('dashboard.total'), dataIndex: 'size' },
    {
      title: t('dashboard.available'),
      dataIndex: 'availableSize',
      render: (value: number) => <Tag color="green">{value}</Tag>
    },
    {
      title: t('dashboard.unavailable'),
      dataIndex: 'unAvailableSize',
      render: (value: number) => <Tag color={value > 0 ? 'red' : 'default'}>{value}</Tag>
    }
  ];
}

function DashboardMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className={styles.metric}>
      <dt className={styles.metricLabel}>{label}</dt>
      <dd className={styles.metricValue}>{value}</dd>
    </div>
  );
}
