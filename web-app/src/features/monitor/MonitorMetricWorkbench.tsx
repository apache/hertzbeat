/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, App, Button, Empty, Select, Spin, Table, Tabs, Tag, Typography } from 'antd';
import { useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import {
  loadFavoriteMetrics,
  loadHistoryMetric,
  loadMonitorMetricCatalog,
  loadRealtimeMetric,
  updateFavoriteMetric,
  type Monitor,
  type MonitorDetailMetric
} from './monitor-api';
import { monitorHistoryRows, monitorMetricOptions, monitorRealtimeRows } from './monitor-detail-model';
import styles from './MonitorMetricWorkbench.module.css';

function formatMetricTime(value?: number) {
  return value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'medium' }).format(value) : '—';
}

function MetricState({ failed, pending, empty, children }: { failed: boolean; pending: boolean; empty: boolean; children: ReactNode }) {
  const { t } = useTranslation();
  if (failed) return <Alert type="error" showIcon message={t('common.unavailable')} />;
  if (!pending && empty) return <Empty description={t('monitorMetrics.empty')} />;
  return children;
}

function resolveMetricOptions(catalogMetrics: MonitorDetailMetric[] | undefined, detailMetrics: MonitorDetailMetric[]) {
  return monitorMetricOptions(catalogMetrics ?? detailMetrics);
}

function resolveMetricKey(selected: string, options: ReturnType<typeof monitorMetricOptions>) {
  return selected || options[0]?.key || '';
}

function isFavoriteMetric(favorites: string[] | undefined, metricKey: string) {
  return favorites?.includes(metricKey) ?? false;
}

function RealtimeTable({ rows, pending }: { rows: ReturnType<typeof monitorRealtimeRows>; pending: boolean }) {
  const { t } = useTranslation();
  const columns = [
    {
      title: t('monitorMetrics.labels'),
      dataIndex: 'labels',
      render: (labels: Record<string, string>) => <div className={styles.labels}>
        {Object.entries(labels).map(([key, value]) => <Tag key={key}>{key}={value}</Tag>)}
      </div>
    },
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
  return <Table rowKey="key" size="small" loading={pending} dataSource={rows} columns={columns} pagination={{ pageSize: 20 }} />;
}

export function MonitorMetricWorkbench({ monitor, metrics }: { monitor: Monitor; metrics: MonitorDetailMetric[] }) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const catalog = useQuery({
    queryKey: ['monitor-metric-catalog', monitor.id, monitor.app],
    queryFn: () => loadMonitorMetricCatalog(monitor)
  });
  const options = useMemo(() => resolveMetricOptions(catalog.data?.metrics, metrics), [catalog.data?.metrics, metrics]);
  const [metricKey, setMetricKey] = useState('');
  const [history, setHistory] = useState('30m');
  const activeMetricKey = resolveMetricKey(metricKey, options);
  const metric = options.find(item => item.key === activeMetricKey);
  const favorites = useQuery({
    queryKey: ['monitor-favorites', monitor.id],
    queryFn: () => loadFavoriteMetrics(monitor.id)
  });
  const realtime = useQuery({
    queryKey: ['monitor-realtime', monitor.id, activeMetricKey],
    queryFn: () => loadRealtimeMetric(monitor.id, activeMetricKey),
    enabled: Boolean(activeMetricKey),
    refetchInterval: 10_000
  });
  const historical = useQuery({
    queryKey: ['monitor-history', monitor.id, activeMetricKey, history],
    queryFn: () => loadHistoryMetric(monitor, metric!, history),
    enabled: Boolean(metric)
  });
  const favorite = isFavoriteMetric(favorites.data, activeMetricKey);
  const favoriteMutation = useMutation({
    mutationFn: () => updateFavoriteMetric(monitor.id, activeMetricKey, !favorite),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['monitor-favorites', monitor.id] });
      void message.success(t('monitorMetrics.favoriteSaved'));
    },
    onError: () => void message.error(t('monitorMetrics.favoriteFailed'))
  });
  const realtimeRows = monitorRealtimeRows(realtime.data ?? {});
  const historyRows = monitorHistoryRows(historical.data ?? {});

  if (catalog.isPending) return <div className={styles.workbench}><Spin /></div>;
  if (catalog.isError && options.length === 0) return <div className={styles.workbench}><Alert type="error" showIcon message={t('common.unavailable')} /></div>;
  if (options.length === 0) return <div className={styles.workbench}><Empty description={t('monitorMetrics.noCatalog')} /></div>;
  return <section className={styles.workbench}>
    <header className={styles.heading}>
      <Typography.Title level={4}>{t('monitorMetrics.title')}</Typography.Title>
      <Typography.Text type="secondary">{t('monitorMetrics.description')}</Typography.Text>
    </header>
    <div className={styles.toolbar}>
      <Select
        showSearch
        optionFilterProp="label"
        value={activeMetricKey}
        onChange={setMetricKey}
        options={options.map(item => ({ value: item.key, label: item.unit ? `${item.key} (${item.unit})` : item.key }))}
      />
      <Select value={history} onChange={setHistory} options={['30m', '1h', '6h', '24h'].map(value => ({ value, label: value }))} />
      <Button loading={favoriteMutation.isPending} onClick={() => favoriteMutation.mutate()}>
        {t(favorite ? 'monitorMetrics.unfavorite' : 'monitorMetrics.favorite')}
      </Button>
      <Button onClick={() => { void realtime.refetch(); void historical.refetch(); }}>
        {t('common.refresh')}
      </Button>
    </div>
    <Tabs items={[
      {
        key: 'realtime',
        label: t('monitorMetrics.realtime'),
        children: <MetricState failed={realtime.isError} pending={realtime.isPending} empty={realtimeRows.length === 0}>
          <RealtimeTable rows={realtimeRows} pending={realtime.isPending} />
        </MetricState>
      },
      {
        key: 'history',
        label: t('monitorMetrics.history'),
        children: <MetricState failed={historical.isError} pending={historical.isPending} empty={historyRows.length === 0}>
          <HistoryTable rows={historyRows} pending={historical.isPending} />
        </MetricState>
      }
    ]} />
  </section>;
}
