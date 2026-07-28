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

import { Alert, Empty, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useTranslation } from 'react-i18next';
import type { ReactNode } from 'react';

import styles from '../shared/alert-center.module.css';
import { hasAlertCenterRowActions, type AlertCenterActionPolicy } from '../model/alert-capability-model';
import {
  alertPageSizes,
  alertSeverities,
  alertGroupName,
  type AlertGroup,
  type AlertSeverity,
  type AlertStatus
} from '../model/alert-model';
import type { AlertListState } from '../model/alert-center-view-model';
import { alertCenterActionColumn, type AlertCenterRowActionHandlers } from './alert-center-action-column';
import { AlertCenterGroupDetails } from './alert-center-group-details';
import { alertCenterRowSelection } from './alert-center-row-selection';
import { AlertCenterRetryButton } from './alert-center-retry-button';

type Translator = (key: string) => string;

type AlertCenterResultsProps = {
  actionPolicy: AlertCenterActionPolicy;
  onAcknowledge: (group: AlertGroup) => void | Promise<unknown>;
  busy: boolean;
  state: AlertListState;
  pageIndex: number;
  pageSize: number;
  selectedIds: number[];
  onPageChange: (page: number, pageSize: number) => void;
  onRemove: (group: AlertGroup) => void | Promise<unknown>;
  onReopen: (group: AlertGroup) => void | Promise<unknown>;
  onResolve: (group: AlertGroup) => void | Promise<unknown>;
  onUnacknowledge: (group: AlertGroup) => void | Promise<unknown>;
  onSelectIds: (ids: number[]) => void;
  retry: () => unknown;
};

type AlertCenterColumnsOptions = {
  t: Translator;
  actionPolicy: AlertCenterActionPolicy;
  busy: boolean;
  actions: AlertCenterRowActionHandlers;
};

export function AlertCenterResults({
  actionPolicy,
  onAcknowledge,
  busy,
  state,
  pageIndex,
  pageSize,
  selectedIds,
  onPageChange,
  onRemove,
  onReopen,
  onResolve,
  onUnacknowledge,
  onSelectIds,
  retry
}: AlertCenterResultsProps) {
  const { t } = useTranslation();
  const fallback = renderResultFallback(state, t, retry);
  if (fallback) return fallback;

  const records = state.kind === 'ready' ? state.records : [];
  const rowSelection = alertCenterRowSelection(actionPolicy, busy, selectedIds, onSelectIds);
  const actions = {
    acknowledge: onAcknowledge,
    remove: onRemove,
    resolve: onResolve,
    reopen: onReopen,
    unacknowledge: onUnacknowledge
  };
  return (
    <Table<AlertGroup>
      rowKey="id"
      size="small"
      loading={state.kind === 'loading'}
      dataSource={records}
      columns={buildColumns({ t, actionPolicy, busy, actions })}
      {...(rowSelection ? { rowSelection } : {})}
      expandable={{
        expandedRowRender: group => <AlertCenterGroupDetails alerts={group.alerts} />,
        rowExpandable: group => group.alerts.length > 0
      }}
      pagination={{
        current: pageIndex + 1,
        disabled: busy,
        pageSize,
        pageSizeOptions: [...alertPageSizes],
        showSizeChanger: true,
        total: state.kind === 'ready' ? state.total : 0,
        onChange: onPageChange
      }}
    />
  );
}

function renderResultFallback(state: AlertListState, t: Translator, retry: () => unknown): ReactNode {
  if (state.kind === 'empty') return <Empty description={t('alert.empty')} />;
  if (state.kind !== 'permission' && state.kind !== 'unavailable' && state.kind !== 'error') return null;
  return (
    <Alert
      type={state.kind === 'unavailable' ? 'warning' : 'error'}
      showIcon
      message={t(alertListFailureMessageKey(state.kind))}
      action={<AlertCenterRetryButton onClick={retry} />}
    />
  );
}

function alertListFailureMessageKey(kind: 'permission' | 'unavailable' | 'error') {
  if (kind === 'permission') return 'common.permission.roleRequiredDescription';
  if (kind === 'unavailable') return 'alert.listUnavailable';
  return 'alert.listLoadFailed';
}

function buildColumns({ t, actionPolicy, busy, actions }: AlertCenterColumnsOptions): ColumnsType<AlertGroup> {
  const columns: ColumnsType<AlertGroup> = [
    { title: t('alert.name'), render: (_value, row) => alertGroupName(row) },
    {
      title: t('alert.status.label'),
      dataIndex: 'status',
      width: 150,
      render: (value: AlertStatus) => <Tag color={alertStatusColor(value)}>{t(`alert.status.${value}`)}</Tag>
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
          {Object.entries(row.commonLabels ?? {})
            .filter(([key]) => key !== 'severity')
            .slice(0, 4)
            .map(([key, value]) => (
              <Tag key={key}>
                {key}={value}
              </Tag>
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
  if (!hasAlertCenterRowActions(actionPolicy)) return columns;
  const actionColumn = alertCenterActionColumn({ t, actionPolicy, busy, actions });
  return [...columns, actionColumn];
}

function alertStatusColor(status: AlertStatus) {
  if (status === 'firing') return 'red';
  if (status === 'acknowledged') return 'gold';
  if (status === 'resolved') return 'green';
  return 'default';
}

function severityLabel(t: Translator, severity: string | undefined) {
  return severity && alertSeverities.includes(severity as Exclude<AlertSeverity, ''>)
    ? t(`alert.severity.${severity}`)
    : t('alert.status.unknown');
}
