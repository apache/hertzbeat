/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Alert, Empty, Skeleton, Statistic, Table, Tag, Typography } from 'antd';
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
      <Alert
        className={styles.summaryState ?? ''}
        type={state.kind === 'error' ? 'error' : 'warning'}
        showIcon
        message={t(`dashboard.monitorStates.${state.kind}`)}
      />
    );
  }
  const totals = monitorTotals(state.apps);
  return (
    <>
      <Statistic title={t('dashboard.total')} value={totals.total} />
      <Statistic title={t('dashboard.available')} value={totals.available} />
      <Statistic title={t('dashboard.unavailable')} value={totals.unavailable} />
    </>
  );
}

export function DashboardMonitorDistribution({ state }: { state: DashboardMonitorState }) {
  const { t } = useTranslation();
  if (state.kind !== 'ready' && state.kind !== 'empty') return null;
  return (
    <section className={styles.section}>
      <Typography.Title level={4}>{t('dashboard.distribution')}</Typography.Title>
      {state.apps.length === 0 ? (
        <Empty description={t('dashboard.empty')} />
      ) : (
        <Table<AppCount>
          rowKey={row => `${row.category}-${row.app}`}
          pagination={false}
          size="small"
          dataSource={state.apps}
          columns={monitorColumns(t)}
        />
      )}
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
