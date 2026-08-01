/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Button, Table, Tabs, Tag } from 'antd';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { OperationalStatePanel } from '@/shared/operational-page';

import type {
  MonitorMetricWorkbenchController,
  monitorHistoryRows,
  monitorRealtimeRows
} from '../model/monitor-detail-model';
import styles from './monitor-metric-workbench.module.css';

const historyTablePageSize = 20;

export function MonitorMetricResults({ state, actions }: MonitorMetricWorkbenchController) {
  const { t } = useTranslation();
  return (
    <Tabs
      items={[
        { key: 'realtime', label: t('monitorMetrics.realtime'), children: <RealtimeResult state={state} /> },
        { key: 'history', label: t('monitorMetrics.history'), children: <HistoryResult state={state} /> },
        {
          key: 'favorites',
          label: t('monitorMetrics.favorites'),
          children: <FavoriteCollection state={state} actions={actions} />
        }
      ]}
    />
  );
}

function FavoriteCollection({ state, actions }: MonitorMetricWorkbenchController) {
  const { t } = useTranslation();
  const evidence = state.favoriteCollection;
  if (evidence.kind !== 'ready') return <FavoriteCollectionState kind={evidence.kind} />;
  const selected = evidence.items.some(item => item.available && item.key === state.metricKey);
  return (
    <div className={styles.favoriteCollection}>
      <div className={styles.favoriteList}>
        {evidence.items.map(item => (
          <span key={item.key} className={styles.favoriteItem}>
            <Button
              disabled={!item.available}
              type={item.key === state.metricKey ? 'primary' : 'default'}
              onClick={() => actions.setMetric(item.key)}
            >
              {item.key}
            </Button>
            {!item.available && <Tag>{t('monitorMetrics.favoriteUnavailable')}</Tag>}
          </span>
        ))}
      </div>
      {selected ? (
        <Tabs
          items={[
            { key: 'realtime', label: t('monitorMetrics.realtime'), children: <RealtimeResult state={state} /> },
            { key: 'history', label: t('monitorMetrics.history'), children: <HistoryResult state={state} /> }
          ]}
        />
      ) : (
        <OperationalStatePanel kind="empty" title={t('monitorMetrics.favoriteSelect')} />
      )}
    </div>
  );
}

function FavoriteCollectionState({ kind }: { kind: 'loading' | 'empty' | 'unavailable' | 'error' }) {
  const { t } = useTranslation();
  switch (kind) {
    case 'loading':
      return <OperationalStatePanel kind="loading" title={t('monitorMetrics.loading')} />;
    case 'empty':
      return <OperationalStatePanel kind="empty" title={t('monitorMetrics.favoriteEmpty')} />;
    case 'unavailable':
      return <OperationalStatePanel kind="unavailable" title={t('common.unavailable')} />;
    case 'error':
      return <OperationalStatePanel kind="error" title={t('common.routeError.description')} />;
  }
}

function RealtimeResult({ state }: Pick<MonitorMetricWorkbenchController, 'state'>) {
  return (
    <MetricState kind={state.realtime.kind}>
      <RealtimeTable rows={state.realtime.rows} pending={state.realtime.kind === 'loading'} />
    </MetricState>
  );
}

function HistoryResult({ state }: Pick<MonitorMetricWorkbenchController, 'state'>) {
  return (
    <MetricState kind={state.historical.kind}>
      <HistoryTable rows={state.historical.rows} pending={state.historical.kind === 'loading'} />
    </MetricState>
  );
}

function MetricState({
  kind,
  children
}: {
  kind: 'loading' | 'empty' | 'unsupported' | 'unavailable' | 'error' | 'ready';
  children: ReactNode;
}) {
  const { t } = useTranslation();
  if (kind === 'unsupported')
    return <OperationalStatePanel kind="empty" title={t('monitorMetrics.historyUnsupported')} />;
  if (kind === 'unavailable') return <OperationalStatePanel kind="unavailable" title={t('common.unavailable')} />;
  if (kind === 'error') return <OperationalStatePanel kind="error" title={t('common.routeError.description')} />;
  if (kind === 'empty') return <OperationalStatePanel kind="empty" title={t('monitorMetrics.empty')} />;
  return children;
}

function RealtimeTable({ rows, pending }: { rows: ReturnType<typeof monitorRealtimeRows>; pending: boolean }) {
  const { t } = useTranslation();
  const columns = [
    {
      title: t('monitorMetrics.labels'),
      dataIndex: 'labels',
      render: (labels: Record<string, string>) => (
        <div className={styles.labels}>
          {Object.entries(labels).map(([key, value]) => (
            <Tag key={key}>
              {key}={value}
            </Tag>
          ))}
        </div>
      )
    },
    { title: t('monitorMetrics.field'), dataIndex: 'field' },
    { title: t('monitorMetrics.unit'), dataIndex: 'unit', render: (value: string | null) => value ?? '—' },
    { title: t('monitorMetrics.time'), dataIndex: 'time', render: formatMetricTime },
    { title: t('monitorMetrics.value'), dataIndex: 'value' }
  ];
  return <Table rowKey="key" size="small" loading={pending} dataSource={rows} columns={columns} pagination={false} />;
}

function HistoryTable({ rows, pending }: { rows: ReturnType<typeof monitorHistoryRows>; pending: boolean }) {
  const { t } = useTranslation();
  const columns = [
    { title: t('monitorMetrics.series'), dataIndex: 'series', render: (value: string) => value || '—' },
    { title: t('monitorMetrics.time'), dataIndex: 'time', render: formatMetricTime },
    { title: t('monitorMetrics.value'), dataIndex: 'value' }
  ];
  return (
    <Table
      rowKey="key"
      size="small"
      loading={pending}
      dataSource={rows}
      columns={columns}
      pagination={{ pageSize: historyTablePageSize }}
    />
  );
}

function formatMetricTime(value?: number | null) {
  return value == null
    ? '—'
    : new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'medium' }).format(value);
}
