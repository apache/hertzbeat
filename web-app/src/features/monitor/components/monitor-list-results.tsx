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

import { Alert, Empty, Spin, Table, Tag, type TableProps } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { SortOrder, TableRowSelection } from 'antd/es/table/interface';
import { useTranslation } from 'react-i18next';

import { isMonitorSortField, type Monitor, type MonitorAction } from '../model/monitor-contract';
import type { MonitorListEvidence } from '../model/monitor-list-model';
import {
  monitorPageSizes,
  monitorStatusColor,
  monitorStatusKey,
  parseMonitorTimestamp,
  type MonitorQuery
} from '../model/monitor-model';

import { MonitorRowActions } from './monitor-list-actions';
import styles from './monitor-list.module.css';

export function MonitorListResults({
  evidence,
  query,
  selectedIds,
  operating,
  actions
}: {
  evidence: MonitorListEvidence;
  query: MonitorQuery;
  selectedIds: number[];
  operating: boolean;
  actions: {
    changePage: (page: number, pageSize: number) => void;
    changeSort: (sort: MonitorQuery['sort'], order: MonitorQuery['order']) => void;
    selectIds: (ids: number[]) => void;
    open: (id: number, mode: 'view' | 'edit') => void;
    run: (action: MonitorAction, ids: number[]) => void | Promise<void>;
  };
}) {
  const { t } = useTranslation();
  if (evidence.kind === 'loading')
    return (
      <div role="status">
        <Spin />
      </div>
    );
  if (evidence.kind === 'empty') return <Empty description={t('monitor.empty')} />;
  if (evidence.kind === 'unavailable') return <Alert showIcon type="warning" message={t('common.unavailable')} />;
  if (evidence.kind === 'error') return <Alert showIcon type="error" message={t('common.routeError.description')} />;
  const rowSelection: TableRowSelection<Monitor> = {
    selectedRowKeys: selectedIds,
    getCheckboxProps: () => ({ disabled: operating }),
    onChange: keys => actions.selectIds(keys.flatMap(key => (typeof key === 'number' ? [key] : [])))
  };
  return (
    <Table<Monitor>
      rowKey="id"
      size="small"
      dataSource={evidence.records}
      columns={columns(t, query, actions.open, actions.run, operating)}
      rowSelection={rowSelection}
      onChange={monitorTableChange(actions.changeSort)}
      pagination={{
        current: query.pageIndex + 1,
        pageSize: query.pageSize,
        pageSizeOptions: [...monitorPageSizes],
        showSizeChanger: true,
        total: evidence.total,
        onChange: actions.changePage
      }}
    />
  );
}

function monitorTableChange(
  changeSort: (sort: MonitorQuery['sort'], order: MonitorQuery['order']) => void
): NonNullable<TableProps<Monitor>['onChange']> {
  return (_pagination, _filters, sorter, extra) => {
    if (extra.action !== 'sort') return;
    const active = Array.isArray(sorter) ? sorter.find(candidate => candidate.order) : sorter;
    const sort = isMonitorSortField(active?.field) ? active.field : null;
    const order = monitorQueryOrder(active?.order);
    if (sort && order) changeSort(sort, order);
    else changeSort(null, null);
  };
}

function columns(
  t: (key: string) => string,
  query: MonitorQuery,
  open: (id: number, mode: 'view' | 'edit') => void,
  run: (action: MonitorAction, ids: number[]) => void | Promise<void>,
  operating: boolean
): ColumnsType<Monitor> {
  return [
    {
      title: t('monitor.name'),
      dataIndex: 'name',
      sorter: true,
      sortOrder: monitorTableSortOrder(query, 'name'),
      render: (_value: string, row) => (
        <div className={styles.name}>
          <strong>{row.name}</strong>
          <span>{row.instance}</span>
        </div>
      )
    },
    { title: t('monitor.application'), dataIndex: 'app', render: (value: string) => <Tag>{value}</Tag> },
    {
      title: t('monitor.status.label'),
      dataIndex: 'status',
      sorter: true,
      sortOrder: monitorTableSortOrder(query, 'status'),
      render: (value: number) => <Tag color={monitorStatusColor(value)}>{t(monitorStatusKey(value))}</Tag>
    },
    {
      title: t('monitor.updated'),
      dataIndex: 'gmtUpdate',
      sorter: true,
      sortOrder: monitorTableSortOrder(query, 'gmtUpdate'),
      render: (value: number | string | null | undefined, row) => formatMonitorTime(value ?? row.gmtCreate)
    },
    {
      title: t('common.actions'),
      width: 370,
      render: (_value: unknown, row) => <MonitorRowActions monitor={row} open={open} run={run} disabled={operating} />
    }
  ];
}

function monitorTableSortOrder(query: MonitorQuery, field: NonNullable<MonitorQuery['sort']>): SortOrder {
  if (query.sort !== field) return null;
  if (query.order === 'asc') return 'ascend';
  if (query.order === 'desc') return 'descend';
  return null;
}

function monitorQueryOrder(order: SortOrder | undefined): MonitorQuery['order'] {
  if (order === 'ascend') return 'asc';
  if (order === 'descend') return 'desc';
  return null;
}

function formatMonitorTime(value?: number | string | null) {
  const timestamp = parseMonitorTimestamp(value);
  return timestamp === undefined
    ? '—'
    : new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'medium' }).format(timestamp);
}
