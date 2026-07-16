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

import { Alert, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { TableRowSelection } from 'antd/es/table/interface';
import { useTranslation } from 'react-i18next';

import type { Monitor, MonitorAction } from '../api/monitor-api';
import type { MonitorListEvidence } from '../model/monitor-list-model';
import { monitorPageSizes, monitorStatusColor, monitorStatusKey, parseMonitorTimestamp, type MonitorQuery } from '../model/monitor-model';

import { MonitorRowActions } from './monitor-list-actions';
import styles from './monitor-list.module.css';

export function MonitorListResults({ evidence, query, selectedIds, operating, actions }: {
  evidence: MonitorListEvidence; query: MonitorQuery; selectedIds: number[]; operating: boolean;
  actions: {
    changePage: (page: number, pageSize: number) => void; selectIds: (ids: number[]) => void;
    open: (id: number, mode: 'view' | 'edit') => void; run: (action: MonitorAction, ids: number[]) => void | Promise<void>;
  };
}) {
  const { t } = useTranslation();
  if (evidence.kind === 'loading') return <div role="status"><Spin /></div>;
  if (evidence.kind === 'empty') return <Empty description={t('monitor.empty')} />;
  if (evidence.kind === 'unavailable') return <Alert showIcon type="warning" message={t('common.unavailable')} />;
  if (evidence.kind === 'error') return <Alert showIcon type="error" message={t('common.routeError.description')} />;
  const rowSelection: TableRowSelection<Monitor> = {
    selectedRowKeys: selectedIds,
    onChange: keys => actions.selectIds(keys.flatMap(key => typeof key === 'number' ? [key] : []))
  };
  return <Table<Monitor> rowKey="id" size="small" dataSource={evidence.records}
    columns={columns(t, actions.open, actions.run, operating)} rowSelection={rowSelection}
    pagination={{ current: query.pageIndex + 1, pageSize: query.pageSize, pageSizeOptions: [...monitorPageSizes],
      showSizeChanger: true, total: evidence.total, onChange: actions.changePage }} />;
}

function columns(t: (key: string) => string, open: (id: number, mode: 'view' | 'edit') => void,
  run: (action: MonitorAction, ids: number[]) => void | Promise<void>, operating: boolean): ColumnsType<Monitor> {
  return [
    { title: t('monitor.name'), dataIndex: 'name', render: (_value: string, row) => <div className={styles.name}>
      <strong>{row.name}</strong><span>{row.instance}</span></div> },
    { title: t('monitor.application'), dataIndex: 'app', render: (value: string) => <Tag>{value}</Tag> },
    { title: t('monitor.status.label'), dataIndex: 'status', render: (value: number) =>
      <Tag color={monitorStatusColor(value)}>{t(monitorStatusKey(value))}</Tag> },
    { title: t('monitor.updated'), dataIndex: 'gmtUpdate', render: (value: number | string | undefined, row) =>
      formatMonitorTime(value ?? row.gmtCreate) },
    { title: t('common.actions'), width: 370, render: (_value: unknown, row) =>
      <MonitorRowActions monitor={row} open={open} run={run} disabled={operating} /> }
  ];
}

function formatMonitorTime(value?: number | string) {
  const timestamp = parseMonitorTimestamp(value);
  return timestamp === undefined ? '—'
    : new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'medium' }).format(timestamp);
}
