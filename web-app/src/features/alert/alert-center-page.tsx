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

import { Alert, Button, Empty, Input, Select, Skeleton, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useTranslation } from 'react-i18next';

import {
  alertPageSizes,
  alertSeverities,
  alertStatusColor,
  alertStatusFilters,
  type AlertGroup,
  type AlertSeverity,
  type AlertStatus,
  type AlertStatusFilter,
  type AlertSummary
} from './alert-model';
import { AlertManagementNav } from './alert-management-nav';
import styles from './alert-center-page.module.css';
import {
  useAlertCenterController,
  type AlertListState,
  type AlertSummaryState
} from './controller/use-alert-center-controller';

type Translator = (key: string) => string;

function alertName(row: AlertGroup) {
  return row.commonLabels?.alertname || row.groupLabels?.alertname || `#${row.id}`;
}

function statusLabel(t: Translator, status: AlertStatus) {
  return t(`alert.status.${status}`);
}

function severityLabel(t: Translator, severity: string | undefined) {
  return severity && alertSeverities.includes(severity as Exclude<AlertSeverity, ''>)
    ? t(`alert.severity.${severity}`)
    : t('alert.status.unknown');
}

function buildColumns(t: Translator): ColumnsType<AlertGroup> {
  return [
    { title: t('alert.name'), render: (_value, row) => alertName(row) },
    {
      title: t('alert.status.label'),
      dataIndex: 'status',
      width: 150,
      render: (value: AlertStatus) => <Tag color={alertStatusColor(value)}>{statusLabel(t, value)}</Tag>
    },
    {
      title: t('alert.severity.label'),
      width: 140,
      render: (_value, row) => severityLabel(t, row.commonLabels?.severity)
    },
    {
      title: t('alert.labels'),
      render: (_value, row) => (
        <div className={styles.labels}>
          {Object.entries(row.commonLabels ?? {}).filter(([key]) => key !== 'severity').slice(0, 4).map(([key, value]) => (
            <Tag key={key}>{key}={value}</Tag>
          ))}
        </div>
      )
    },
    {
      title: t('alert.updated'),
      dataIndex: 'gmtUpdate',
      width: 190,
      render: (value: AlertGroup['gmtUpdate']) => value ?? '—'
    }
  ];
}

function SummaryStrip({ state, retry }: { state: AlertSummaryState; retry: () => unknown }) {
  const { t } = useTranslation();
  if (state.kind === 'loading') return <Skeleton active paragraph={false} />;
  if (state.kind === 'unavailable') {
    return <Alert type="warning" showIcon message={t('alert.summaryUnavailable')} action={<Retry onClick={retry} />} />;
  }
  if (state.kind === 'error') {
    return <Alert type="error" showIcon message={t('alert.summaryLoadFailed')} action={<Retry onClick={retry} />} />;
  }
  return <SummaryValues summary={state.summary} />;
}

function SummaryValues({ summary }: { summary: AlertSummary }) {
  const { t } = useTranslation();
  const items = [
    ['alert.summary.total', summary.total],
    ['alert.summary.nonFiring', summary.dealNum],
    ['alert.summary.warning', summary.priorityWarningNum],
    ['alert.summary.critical', summary.priorityCriticalNum],
    ['alert.summary.emergency', summary.priorityEmergencyNum]
  ] as const;
  return (
    <section aria-label={t('alert.summary.scope')}>
      <Typography.Text type="secondary">{t('alert.summary.scope')}</Typography.Text>
      <div className={styles.summary}>
        {items.map(([key, value]) => (
          <div className={styles.metric} key={key}>
            <span>{t(key)}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function AlertResults({ state, columns, pageIndex, pageSize, onPageChange, retry }: {
  state: AlertListState;
  columns: ColumnsType<AlertGroup>;
  pageIndex: number;
  pageSize: number;
  onPageChange: (page: number, pageSize: number) => void;
  retry: () => unknown;
}) {
  const { t } = useTranslation();
  if (state.kind === 'unavailable') {
    return <Alert type="warning" showIcon message={t('alert.listUnavailable')} action={<Retry onClick={retry} />} />;
  }
  if (state.kind === 'error') {
    return <Alert type="error" showIcon message={t('alert.listLoadFailed')} action={<Retry onClick={retry} />} />;
  }
  if (state.kind === 'empty') return <Empty description={t('alert.empty')} />;
  const records = state.kind === 'ready' ? state.records : [];
  const total = state.kind === 'ready' ? state.total : 0;
  return (
    <Table<AlertGroup>
      rowKey="id"
      size="small"
      loading={state.kind === 'loading'}
      dataSource={records}
      columns={columns}
      pagination={{
        current: pageIndex + 1,
        pageSize,
        pageSizeOptions: [...alertPageSizes],
        showSizeChanger: true,
        total,
        onChange: onPageChange
      }}
    />
  );
}

function Retry({ onClick }: { onClick: () => unknown }) {
  const { t } = useTranslation();
  return <Button size="small" onClick={() => { void onClick(); }}>{t('common.retry')}</Button>;
}

export function AlertCenterPage() {
  const { t } = useTranslation();
  const controller = useAlertCenterController();
  const { draft, list, query, refreshing, summary } = controller.state;

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div>
          <Typography.Title level={2}>{t('alert.title')}</Typography.Title>
          <Typography.Text type="secondary">{t('alert.description')}</Typography.Text>
        </div>
        <Button onClick={() => { void controller.manageRules(); }}>{t('alertRules.manage')}</Button>
      </header>
      <AlertManagementNav />
      <div className={styles.toolbar}>
        <Input allowClear value={draft.search} placeholder={t('alert.search')}
          onChange={event => controller.setDraft('search', event.target.value)} onPressEnter={controller.submitFilters} />
        <Input allowClear value={draft.serviceName} placeholder={t('instrumentation.field.serviceName')}
          onChange={event => controller.setDraft('serviceName', event.target.value)} onPressEnter={controller.submitFilters} />
        <Input allowClear value={draft.serviceNamespace} placeholder={t('instrumentation.field.serviceNamespace')}
          onChange={event => controller.setDraft('serviceNamespace', event.target.value)} onPressEnter={controller.submitFilters} />
        <Input allowClear value={draft.environment} placeholder={t('instrumentation.field.serviceEnvironment')}
          onChange={event => controller.setDraft('environment', event.target.value)} onPressEnter={controller.submitFilters} />
        <Select<AlertStatusFilter> value={query.status} onChange={controller.changeStatus}
          options={['', ...alertStatusFilters].map(value => ({
            value, label: t(value ? `alert.status.${value}` : 'alert.status.all')
          }))} />
        <Select<AlertSeverity> value={query.severity} onChange={controller.changeSeverity}
          options={['', ...alertSeverities].map(value => ({
            value, label: t(value ? `alert.severity.${value}` : 'alert.severity.all')
          }))} />
        <Button type="primary" onClick={controller.submitFilters}>{t('common.query')}</Button>
        <Button loading={refreshing} onClick={() => { void controller.refresh(); }}>{t('common.refresh')}</Button>
      </div>
      <SummaryStrip state={summary} retry={controller.retrySummary} />
      <AlertResults state={list} columns={buildColumns(t)} pageIndex={query.pageIndex} pageSize={query.pageSize}
        onPageChange={controller.changePage} retry={controller.retryList} />
    </div>
  );
}
