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
import { Alert, Button, Empty, Input, Select, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { loadMonitorApps, loadMonitors, type Monitor } from './monitor-api';
import { monitorAppOptions, monitorPageSizes, monitorStatusColor, monitorStatusKey, readMonitorQuery, writeMonitorQuery } from './monitor-model';
import styles from './MonitorListPage.module.css';

type Translator = (key: string) => string;

function formatMonitorTime(value?: number) {
  return value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'medium' }).format(value) : '—';
}

function buildMonitorColumns(t: Translator, open: (path: string) => void): ColumnsType<Monitor> {
  return [
    { title: t('monitor.name'), dataIndex: 'name', render: (_value: string, row) => <div className={styles.name}><strong>{row.name}</strong><span>{row.instance}</span></div> },
    { title: t('monitor.application'), dataIndex: 'app', render: (value: string) => <Tag>{value}</Tag> },
    { title: t('monitor.status.label'), dataIndex: 'status', render: (value: number) => <Tag color={monitorStatusColor(value)}>{t(monitorStatusKey(value))}</Tag> },
    { title: t('monitor.updated'), dataIndex: 'gmtUpdate', render: (value: number | undefined, row) => formatMonitorTime(value ?? row.gmtCreate) },
    { title: t('common.actions'), render: (_value: unknown, row) => <Space><Button type="link" onClick={() => open(`/monitors/${row.id}`)}>{t('common.view')}</Button><Button type="link" onClick={() => open(`/monitors/${row.id}/edit`)}>{t('common.edit')}</Button></Space> }
  ];
}

function MonitorResults({ failed, pending, rows, total, query, updateQuery, columns }: {
  failed: boolean;
  pending: boolean;
  rows: Monitor[];
  total: number;
  query: ReturnType<typeof readMonitorQuery>;
  updateQuery: (patch: Partial<ReturnType<typeof readMonitorQuery>>) => void;
  columns: ColumnsType<Monitor>;
}) {
  const { t } = useTranslation();
  if (failed) return <Alert type="error" showIcon message={t('common.unavailable')} />;
  if (!pending && rows.length === 0) return <Empty description={t('monitor.empty')} />;
  return <Table<Monitor> rowKey="id" size="small" loading={pending} dataSource={rows} columns={columns} pagination={{ current: query.pageIndex + 1, pageSize: query.pageSize, pageSizeOptions: [...monitorPageSizes], showSizeChanger: true, total, onChange: (page, pageSize) => updateQuery({ pageIndex: page - 1, pageSize }) }} />;
}

export function MonitorListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryState = readMonitorQuery(searchParams);
  const [draftSearch, setDraftSearch] = useState(queryState.search);
  const monitors = useQuery({ queryKey: ['monitors', queryState], queryFn: () => loadMonitors(queryState) });
  const apps = useQuery({ queryKey: ['monitor-apps'], queryFn: loadMonitorApps });
  const appOptions = useMemo(() => monitorAppOptions(apps.data ?? []), [apps.data]);

  const updateQuery = (patch: Partial<typeof queryState>) => {
    const next = { ...queryState, ...patch };
    setSearchParams(writeMonitorQuery(next));
  };
  const columns = buildMonitorColumns(t, path => void navigate(path));

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <Typography.Title level={2}>{t('monitor.title')}</Typography.Title>
        <Typography.Text type="secondary">{t('monitor.description')}</Typography.Text>
      </header>
      <div className={styles.toolbar}>
        <Input value={draftSearch} allowClear placeholder={t('monitor.search')} onChange={event => setDraftSearch(event.target.value)} onPressEnter={() => updateQuery({ search: draftSearch.trim(), pageIndex: 0 })} />
        <Select allowClear showSearch optionFilterProp="label" placeholder={t('monitor.application')} value={queryState.app || undefined} options={appOptions} onChange={value => updateQuery({ app: value ?? '', pageIndex: 0 })} />
        <Select value={queryState.status} onChange={value => updateQuery({ status: value, pageIndex: 0 })} options={[
          { value: '9', label: t('monitor.status.all') },
          { value: '1', label: t('monitor.status.available') },
          { value: '2', label: t('monitor.status.unavailable') },
          { value: '0', label: t('monitor.status.paused') }
        ]} />
        <Button type="primary" onClick={() => updateQuery({ search: draftSearch.trim(), pageIndex: 0 })}>{t('common.query')}</Button>
        <Button onClick={() => void monitors.refetch()}>{t('common.refresh')}</Button>
        <Button type="primary" onClick={() => void navigate('/monitors/new')}>{t('monitor.editor.newTitle')}</Button>
      </div>
      <MonitorResults failed={monitors.isError} pending={monitors.isPending} rows={monitors.data?.content ?? []} total={monitors.data?.totalElements ?? 0} query={queryState} updateQuery={updateQuery} columns={columns} />
    </div>
  );
}
