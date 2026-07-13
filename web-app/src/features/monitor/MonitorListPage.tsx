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
import { Alert, App, Button, Empty, Input, Popconfirm, Select, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { TableRowSelection } from 'antd/es/table/interface';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

import { loadMonitorApps, loadMonitors, mutateMonitors, type Monitor } from './monitor-api';
import {
  buildMonitorRoutePath,
  monitorAppOptions,
  monitorPageSizes,
  monitorStatusColor,
  monitorStatusKey,
  parseMonitorTimestamp,
  readMonitorQuery,
  writeMonitorQuery,
  type MonitorAction
} from './monitor-model';
import styles from './MonitorListPage.module.css';

type Translator = (key: string) => string;

function formatMonitorTime(value?: number | string) {
  const timestamp = parseMonitorTimestamp(value);
  return timestamp ? new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'medium' }).format(timestamp) : '—';
}

type ActionRunner = (action: MonitorAction, ids: number[]) => void;

type MonitorRowActionsProps = {
  monitor: Monitor;
  open: (path: string) => void;
  run: ActionRunner;
  returnTo: string;
};

function MonitorRowActions({ monitor, open, run, returnTo }: MonitorRowActionsProps) {
  const { t } = useTranslation();
  const toggleAction: MonitorAction = monitor.status === 0 ? 'enable' : 'pause';
  return <Space size={2}>
    <Button type="link" onClick={() => open(buildMonitorRoutePath(monitor.id, 'view', returnTo))}>{t('common.view')}</Button>
    <Button type="link" onClick={() => open(buildMonitorRoutePath(monitor.id, 'edit', returnTo))}>{t('common.edit')}</Button>
    <Button type="link" onClick={() => run('copy', [monitor.id])}>{t('monitorActions.copy')}</Button>
    <Button type="link" onClick={() => run(toggleAction, [monitor.id])}>{t(`monitorActions.${toggleAction}`)}</Button>
    <Popconfirm title={t('monitorActions.deleteConfirm')} onConfirm={() => run('delete', [monitor.id])}>
      <Button type="link" danger>{t('monitorActions.delete')}</Button>
    </Popconfirm>
  </Space>;
}

function buildMonitorColumns(t: Translator, open: (path: string) => void, run: ActionRunner, returnTo: string): ColumnsType<Monitor> {
  return [
    { title: t('monitor.name'), dataIndex: 'name', render: (_value: string, row) => <div className={styles.name}><strong>{row.name}</strong><span>{row.instance}</span></div> },
    { title: t('monitor.application'), dataIndex: 'app', render: (value: string) => <Tag>{value}</Tag> },
    { title: t('monitor.status.label'), dataIndex: 'status', render: (value: number) => <Tag color={monitorStatusColor(value)}>{t(monitorStatusKey(value))}</Tag> },
    { title: t('monitor.updated'), dataIndex: 'gmtUpdate', render: (value: number | string | undefined, row) => formatMonitorTime(value ?? row.gmtCreate) },
    { title: t('common.actions'), width: 370, render: (_value: unknown, row) => <MonitorRowActions monitor={row} open={open} run={run} returnTo={returnTo} /> }
  ];
}

function BulkActions({ selectedIds, run }: { selectedIds: number[]; run: ActionRunner }) {
  const { t } = useTranslation();
  if (selectedIds.length === 0) return null;
  return <div className={styles.bulk}>
    <Typography.Text>{t('monitorActions.selected', { count: selectedIds.length })}</Typography.Text>
    <Space>
      <Button onClick={() => run('enable', selectedIds)}>{t('monitorActions.enable')}</Button>
      <Button onClick={() => run('pause', selectedIds)}>{t('monitorActions.pause')}</Button>
      <Popconfirm title={t('monitorActions.deleteConfirm')} onConfirm={() => run('delete', selectedIds)}>
        <Button danger>{t('monitorActions.delete')}</Button>
      </Popconfirm>
    </Space>
  </div>;
}

function MonitorResults({ failed, pending, rows, total, query, updateQuery, columns, selectedIds, selectIds }: {
  failed: boolean;
  pending: boolean;
  rows: Monitor[];
  total: number;
  query: ReturnType<typeof readMonitorQuery>;
  updateQuery: (patch: Partial<ReturnType<typeof readMonitorQuery>>) => void;
  columns: ColumnsType<Monitor>;
  selectedIds: number[];
  selectIds: (ids: number[]) => void;
}) {
  const { t } = useTranslation();
  if (failed) return <Alert type="error" showIcon message={t('common.unavailable')} />;
  if (!pending && rows.length === 0) return <Empty description={t('monitor.empty')} />;
  const rowSelection: TableRowSelection<Monitor> = {
    selectedRowKeys: selectedIds,
    onChange: keys => selectIds(keys.flatMap(key => typeof key === 'number' ? [key] : []))
  };
  return <Table<Monitor>
    rowKey="id"
    size="small"
    loading={pending}
    dataSource={rows}
    columns={columns}
    rowSelection={rowSelection}
    pagination={{
      current: query.pageIndex + 1,
      pageSize: query.pageSize,
      pageSizeOptions: [...monitorPageSizes],
      showSizeChanger: true,
      total,
      onChange: (page, pageSize) => updateQuery({ pageIndex: page - 1, pageSize })
    }}
  />;
}

export function MonitorListPage() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryState = readMonitorQuery(searchParams);
  const [draftSearch, setDraftSearch] = useState(queryState.search);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const monitors = useQuery({ queryKey: ['monitors', queryState], queryFn: () => loadMonitors(queryState) });
  const apps = useQuery({ queryKey: ['monitor-apps'], queryFn: loadMonitorApps });
  const appOptions = useMemo(() => monitorAppOptions(apps.data ?? []), [apps.data]);
  const mutation = useMutation({
    mutationFn: ({ action, ids }: { action: MonitorAction; ids: number[] }) => mutateMonitors(action, ids),
    onSuccess: () => {
      setSelectedIds([]);
      void queryClient.invalidateQueries({ queryKey: ['monitors'] });
      void message.success(t('monitorActions.success'));
    },
    onError: () => void message.error(t('monitorActions.failed'))
  });

  const updateQuery = (patch: Partial<typeof queryState>) => {
    const next = { ...queryState, ...patch };
    setSearchParams(writeMonitorQuery(next));
  };
  const runAction: ActionRunner = (action, ids) => mutation.mutate({ action, ids });
  const columns = buildMonitorColumns(t, path => void navigate(path), runAction, `${location.pathname}${location.search}`);

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <Typography.Title level={2}>{t('monitor.title')}</Typography.Title>
        <Typography.Text type="secondary">{t('monitor.description')}</Typography.Text>
      </header>
      <div className={styles.toolbar}>
        <Input
          value={draftSearch}
          allowClear
          placeholder={t('monitor.search')}
          onChange={event => setDraftSearch(event.target.value)}
          onPressEnter={() => updateQuery({ search: draftSearch.trim(), pageIndex: 0 })}
        />
        <Select
          allowClear
          showSearch
          optionFilterProp="label"
          placeholder={t('monitor.application')}
          value={queryState.app || undefined}
          options={appOptions}
          onChange={value => updateQuery({ app: value ?? '', pageIndex: 0 })}
        />
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
      <BulkActions selectedIds={selectedIds} run={runAction} />
      <MonitorResults
        failed={monitors.isError}
        pending={monitors.isPending}
        rows={monitors.data?.content ?? []}
        total={monitors.data?.totalElements ?? 0}
        query={queryState}
        updateQuery={updateQuery}
        columns={columns}
        selectedIds={selectedIds}
        selectIds={setSelectedIds}
      />
    </div>
  );
}
