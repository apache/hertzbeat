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

import { RightOutlined } from '@ant-design/icons';
import { Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import type { ReactNode } from 'react';

import { OperationalStatePanel } from '@/shared/operational-page/operational-page';
import { pageSelectionLabels } from '@/shared/table-selection';

import styles from '../shared/alert-center.module.css';
import type { AlertCenterActionPolicy } from '../model/alert-capability-model';
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

const alertScopeLabelAliases = [
  ['service.name', 'serviceName', 'service'],
  ['service.namespace', 'serviceNamespace', 'namespace'],
  ['deployment.environment.name', 'environment', 'env'],
  ['instance']
] as const;

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
  const [expandedIds, setExpandedIds] = useState<number[]>([]);
  const fallback = renderResultFallback(state, t, retry);
  if (fallback) return fallback;

  const records = state.kind === 'ready' ? state.records : [];
  const rowSelection = alertCenterRowSelection(
    actionPolicy,
    busy,
    records,
    selectedIds,
    onSelectIds,
    pageSelectionLabels(t)
  );
  const actions = {
    acknowledge: onAcknowledge,
    remove: onRemove,
    resolve: onResolve,
    reopen: onReopen,
    unacknowledge: onUnacknowledge
  };
  return (
    <div className={styles.resultSurface} data-alert-workbench>
      <Table<AlertGroup>
        className={styles.alertTable ?? ''}
        rowKey="id"
        size="small"
        loading={state.kind === 'loading'}
        dataSource={records}
        columns={buildColumns({ t, actionPolicy, busy, actions })}
        {...(rowSelection ? { rowSelection } : {})}
        expandable={{
          expandedRowKeys: expandedIds,
          expandIcon: ({ expanded, expandable, onExpand, record }) =>
            expandable ? (
              <button
                type="button"
                className={styles.expandButton}
                aria-label={t(expanded ? 'alert.collapseDetails' : 'alert.expandDetails')}
                aria-expanded={expanded}
                onClick={event => {
                  event.stopPropagation();
                  onExpand(record, event);
                }}
              >
                <RightOutlined className={styles.expandIcon} aria-hidden="true" />
              </button>
            ) : (
              <span className={styles.expandPlaceholder} aria-hidden="true" />
            ),
          expandedRowRender: group => <AlertCenterGroupDetails alerts={group.alerts} />,
          onExpand: (expanded, group) => {
            setExpandedIds(ids => {
              if (!expanded) return ids.filter(id => id !== group.id);
              return ids.includes(group.id) ? ids : [...ids, group.id];
            });
          },
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
    </div>
  );
}

function renderResultFallback(state: AlertListState, t: Translator, retry: () => unknown): ReactNode {
  if (state.kind === 'empty') return <OperationalStatePanel kind="empty" title={t('alert.empty')} />;
  if (state.kind !== 'permission' && state.kind !== 'unavailable' && state.kind !== 'error') return null;
  return (
    <OperationalStatePanel
      kind={state.kind}
      title={t(alertListFailureMessageKey(state.kind))}
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
    {
      title: t('alert.name'),
      width: 380,
      render: (_value, row) => <AlertIdentityCell group={row} />
    },
    {
      title: t('alert.status.label'),
      dataIndex: 'status',
      width: 126,
      render: (value: AlertStatus) => <AlertStatusBadge status={value} label={t(`alert.status.${value}`)} />
    },
    {
      title: t('alert.severity.label'),
      width: 112,
      render: (_value, row) => <AlertSeverityBadge severity={row.commonLabels?.severity} t={t} />
    },
    {
      title: t('alert.updated'),
      dataIndex: 'gmtUpdate',
      width: 168,
      render: (value: AlertGroup['gmtUpdate']) => <span className={styles.updatedCell}>{value ?? '—'}</span>
    }
  ];
  const actionColumn = alertCenterActionColumn({ t, actionPolicy, busy, actions });
  return [...columns, actionColumn];
}

function AlertIdentityCell({ group }: { group: AlertGroup }) {
  const summary = group.commonAnnotations?.summary || group.commonAnnotations?.description;
  const scope = alertScopeValues(group.commonLabels);
  return (
    <div className={styles.alertIdentity}>
      <strong className={styles.alertName}>{alertGroupName(group)}</strong>
      {summary ? <span className={styles.alertSummary}>{summary}</span> : null}
      {scope.length > 0 ? (
        <div className={styles.alertScope}>
          {scope.map(value => (
            <span className={styles.alertScopeValue} key={value}>
              {value}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function alertScopeValues(labels: AlertGroup['commonLabels']) {
  if (!labels) return [];
  return alertScopeLabelAliases
    .map(keys => keys.map(key => labels[key]).find(Boolean))
    .filter((value, index, values): value is string => Boolean(value) && values.indexOf(value) === index)
    .slice(0, 3);
}

function AlertStatusBadge({ status, label }: { status: AlertStatus; label: string }) {
  return (
    <span className={styles.statusBadge} data-alert-status={status}>
      {label}
    </span>
  );
}

function AlertSeverityBadge({ t, severity }: { t: Translator; severity: string | undefined }) {
  const normalized =
    severity && alertSeverities.includes(severity as Exclude<AlertSeverity, ''>) ? severity : 'unknown';
  const label = normalized === 'unknown' ? t('alert.status.unknown') : t(`alert.severity.${normalized}`);
  return (
    <span className={styles.severityBadge} data-alert-severity={normalized}>
      {label}
    </span>
  );
}
