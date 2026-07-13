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

import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Empty, Input, Select, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { loadAlertGroups, loadAlertSummary, type AlertGroup, type AlertPage, type AlertSummary } from './alert-api';
import { alertPageSizes, alertStatusColor, readAlertQuery, writeAlertQuery } from './alert-model';
import styles from './AlertCenterPage.module.css';

type Translator = (key: string) => string;

function formatTime(value?: number | string | null) {
  if (value == null) return '—';
  const timestamp = typeof value === 'number' ? value : Date.parse(value);
  if (!Number.isFinite(timestamp)) return '—';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'medium' }).format(timestamp);
}

function alertName(row: AlertGroup) {
  return row.commonLabels?.alertname || row.groupLabels?.alertname || `#${row.id}`;
}

function buildColumns(t: Translator): ColumnsType<AlertGroup> {
  return [
    { title: t('alert.name'), render: (_value, row) => alertName(row) },
    {
      title: t('alert.status.label'),
      dataIndex: 'status',
      width: 150,
      render: (value?: string) => <Tag color={alertStatusColor(value)}>{value || t('alert.status.unknown')}</Tag>
    },
    {
      title: t('alert.severity.label'),
      width: 140,
      render: (_value, row) => row.commonLabels?.severity || '—'
    },
    {
      title: t('alert.labels'),
      render: (_value, row) => (
        <div className={styles.labels}>
          {Object.entries(row.commonLabels ?? {}).slice(0, 4).map(([key, value]) => (
            <Tag key={key}>{key}={value}</Tag>
          ))}
        </div>
      )
    },
    { title: t('alert.updated'), dataIndex: 'gmtUpdate', width: 190, render: formatTime }
  ];
}

function SummaryStrip({ summary, failed }: { summary: AlertSummary | undefined; failed: boolean }) {
  const { t } = useTranslation();
  if (failed) return <Alert type="warning" showIcon message={t('alert.summaryUnavailable')} />;
  if (!summary) return null;
  const items = [
    ['alert.summary.total', summary.total],
    ['alert.summary.acknowledged', summary.dealNum],
    ['alert.summary.warning', summary.priorityWarningNum],
    ['alert.summary.critical', summary.priorityCriticalNum],
    ['alert.summary.emergency', summary.priorityEmergencyNum]
  ] as const;
  return (
    <div className={styles.summary}>
      {items.map(([key, value]) => (
        <div className={styles.metric} key={key}>
          <span>{t(key)}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  );
}

function AlertResults({ data, pending, failed, columns, pageIndex, pageSize, onPageChange }: {
  data: AlertPage | undefined;
  pending: boolean;
  failed: boolean;
  columns: ColumnsType<AlertGroup>;
  pageIndex: number;
  pageSize: number;
  onPageChange: (page: number, pageSize: number) => void;
}) {
  const { t } = useTranslation();
  if (failed) return <Alert type="error" showIcon message={t('common.unavailable')} />;
  if (!pending && (data?.content.length ?? 0) === 0) return <Empty description={t('alert.empty')} />;
  return (
    <Table<AlertGroup>
      rowKey="id"
      size="small"
      loading={pending}
      dataSource={data?.content ?? []}
      columns={columns}
      pagination={{
        current: pageIndex + 1,
        pageSize,
        pageSizeOptions: [...alertPageSizes],
        showSizeChanger: true,
        total: data?.totalElements ?? 0,
        onChange: onPageChange
      }}
    />
  );
}

export function AlertCenterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const query = readAlertQuery(params);
  const [draftSearch, setDraftSearch] = useState(query.search);
  const summary = useQuery({ queryKey: ['alert-summary'], queryFn: loadAlertSummary });
  const groups = useQuery({ queryKey: ['alert-groups', query], queryFn: () => loadAlertGroups(query) });
  const updateQuery = (patch: Partial<typeof query>) => setParams(writeAlertQuery({ ...query, ...patch }));
  const runSearch = () => updateQuery({ search: draftSearch.trim(), pageIndex: 0 });
  const refresh = () => {
    void summary.refetch();
    void groups.refetch();
  };

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div>
          <Typography.Title level={2}>{t('alert.title')}</Typography.Title>
          <Typography.Text type="secondary">{t('alert.description')}</Typography.Text>
        </div>
        <Button onClick={() => void navigate('/alerts/rules')}>{t('alertRules.manage')}</Button>
      </header>
      <div className={styles.toolbar}>
        <Input
          allowClear
          value={draftSearch}
          placeholder={t('alert.search')}
          onChange={event => setDraftSearch(event.target.value)}
          onPressEnter={runSearch}
        />
        <Select
          value={query.status}
          onChange={status => updateQuery({ status, pageIndex: 0 })}
          options={['', 'firing', 'acknowledged', 'resolved'].map(value => ({
            value,
            label: t(value ? `alert.status.${value}` : 'alert.status.all')
          }))}
        />
        <Select
          value={query.severity}
          onChange={severity => updateQuery({ severity, pageIndex: 0 })}
          options={['', 'warning', 'critical', 'emergency'].map(value => ({
            value,
            label: t(value ? `alert.severity.${value}` : 'alert.severity.all')
          }))}
        />
        <Button type="primary" onClick={runSearch}>{t('common.query')}</Button>
        <Button onClick={refresh}>{t('common.refresh')}</Button>
      </div>
      <SummaryStrip summary={summary.data} failed={summary.isError} />
      <AlertResults
        data={groups.data}
        pending={groups.isPending}
        failed={groups.isError}
        columns={buildColumns(t)}
        pageIndex={query.pageIndex}
        pageSize={query.pageSize}
        onPageChange={(page, pageSize) => updateQuery({ pageIndex: page - 1, pageSize })}
      />
    </div>
  );
}
