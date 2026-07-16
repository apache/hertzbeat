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

import { Alert, Button, Empty, Select, Spin, Table, Tabs, Tag, Typography } from 'antd';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import type {
  MonitorMetricWorkbenchController, monitorHistoryRows, monitorRealtimeRows
} from '../model/monitor-detail-model';
import styles from './monitor-metric-workbench.module.css';

function formatMetricTime(value?: number | null) {
  return value == null ? '—'
    : new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'medium' }).format(value);
}

function MetricState({ kind, children }: { kind: 'loading' | 'empty' | 'unavailable' | 'error' | 'ready'; children: ReactNode }) {
  const { t } = useTranslation();
  if (kind === 'unavailable') return <Alert type="warning" showIcon message={t('common.unavailable')} />;
  if (kind === 'error') return <Alert type="error" showIcon message={t('common.routeError.description')} />;
  if (kind === 'empty') return <Empty description={t('monitorMetrics.empty')} />;
  return children;
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

export function MonitorMetricWorkbench({ state, actions }: MonitorMetricWorkbenchController) {
  const { t } = useTranslation();
  const options = state.catalog.options;

  if (state.catalog.kind === 'loading') return <div className={styles.workbench}><Spin /></div>;
  if (state.catalog.kind === 'unavailable') return <div className={styles.workbench}><Alert type="warning" showIcon message={t('common.unavailable')} /></div>;
  if (state.catalog.kind === 'error') return <div className={styles.workbench}><Alert type="error" showIcon message={t('common.routeError.description')} /></div>;
  if (state.catalog.kind === 'fallback') return <section className={styles.workbench}>
    <Alert type="warning" showIcon message={t('common.unavailable')} description={state.catalog.references.join(', ')} />
  </section>;
  if (state.catalog.kind === 'empty') return <div className={styles.workbench}><Empty description={t('monitorMetrics.noCatalog')} /></div>;
  return <section className={styles.workbench}>
    <header className={styles.heading}>
      <Typography.Title level={4}>{t('monitorMetrics.title')}</Typography.Title>
      <Typography.Text type="secondary">{t('monitorMetrics.description')}</Typography.Text>
    </header>
    <div className={styles.toolbar}>
      <Select
        showSearch
        optionFilterProp="label"
        value={state.metricKey}
        onChange={actions.setMetric}
        options={options.map(item => ({ value: item.key, label: item.unit ? `${item.key} (${item.unit})` : item.key }))}
      />
      <Select value={state.history} onChange={actions.setHistory} options={['30m', '1h', '6h', '24h'].map(value => ({ value, label: value }))} />
      <Button disabled={state.favorite.kind !== 'ready'} loading={state.favoriteBusy}
        onClick={() => { void actions.toggleFavorite().catch(() => undefined); }}>
        {t(state.favorite.kind === 'ready' && state.favorite.value ? 'monitorMetrics.unfavorite' : 'monitorMetrics.favorite')}
      </Button>
      <Button onClick={actions.refresh}>
        {t('common.refresh')}
      </Button>
    </div>
    {state.favorite.kind === 'unavailable' && <Alert type="warning" showIcon message={t('common.unavailable')} />}
    {state.favorite.kind === 'error' && <Alert type="error" showIcon message={t('common.routeError.description')} />}
    <Tabs items={[
      {
        key: 'realtime',
        label: t('monitorMetrics.realtime'),
        children: <MetricState kind={state.realtime.kind}>
          <RealtimeTable rows={state.realtime.rows} pending={state.realtime.kind === 'loading'} />
        </MetricState>
      },
      {
        key: 'history',
        label: t('monitorMetrics.history'),
        children: <MetricState kind={state.historical.kind}>
          <HistoryTable rows={state.historical.rows} pending={state.historical.kind === 'loading'} />
        </MetricState>
      }
    ]} />
  </section>;
}
