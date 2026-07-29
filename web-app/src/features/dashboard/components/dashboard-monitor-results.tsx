/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Skeleton, Table, Tag, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { buildMonitorListPath } from '@/shared/navigation/app-paths';
import {
  isDashboardFailureState,
  monitorTotals,
  type AppCount,
  type DashboardMonitorState
} from '../model/dashboard-model';
import styles from './dashboard.module.css';
import { DashboardSummaryMetric } from './dashboard-summary-metric';

export function DashboardMonitorSummary({ state }: { state: DashboardMonitorState }) {
  const { t } = useTranslation();
  if (state.kind === 'loading') {
    return <Skeleton className={styles.summaryLoading ?? ''} active paragraph={false} />;
  }
  if (isDashboardFailureState(state)) {
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
      <DashboardSummaryMetric label={t('dashboard.total')} value={totals.total} />
      <DashboardSummaryMetric label={t('dashboard.available')} value={totals.available} />
      <DashboardSummaryMetric label={t('dashboard.unavailable')} value={totals.unavailable} />
      <DashboardSummaryMetric label={t('monitor.status.paused')} value={totals.unmanaged} />
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
    {
      title: t('dashboard.application'),
      dataIndex: 'app',
      render: (value: string) => <Link to={buildMonitorListPath({ app: value })}>{value}</Link>
    },
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
    },
    {
      title: t('monitor.status.paused'),
      dataIndex: 'unManageSize',
      render: (value: number) => <Tag>{value}</Tag>
    }
  ];
}
