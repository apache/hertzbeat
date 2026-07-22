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

import styles from '../shared/alert-center.module.css';
import {
  alertPageSizes,
  alertSeverities,
  type AlertGroup,
  type AlertSeverity,
  type AlertStatus
} from '../model/alert-model';
import type { AlertListState } from '../model/alert-center-view-model';
import { AlertCenterRetryButton } from './alert-center-retry-button';

type Translator = (key: string) => string;

type AlertCenterResultsProps = {
  state: AlertListState;
  pageIndex: number;
  pageSize: number;
  onPageChange: (page: number, pageSize: number) => void;
  retry: () => unknown;
};

export function AlertCenterResults({ state, pageIndex, pageSize, onPageChange, retry }: AlertCenterResultsProps) {
  const { t } = useTranslation();
  if (state.kind === 'unavailable') {
    return (
      <Alert
        type="warning"
        showIcon
        message={t('alert.listUnavailable')}
        action={<AlertCenterRetryButton onClick={retry} />}
      />
    );
  }
  if (state.kind === 'error') {
    return (
      <Alert
        type="error"
        showIcon
        message={t('alert.listLoadFailed')}
        action={<AlertCenterRetryButton onClick={retry} />}
      />
    );
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
      columns={buildColumns(t)}
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

function buildColumns(t: Translator): ColumnsType<AlertGroup> {
  return [
    { title: t('alert.name'), render: (_value, row) => alertName(row) },
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
}

function alertName(row: AlertGroup) {
  return row.commonLabels?.alertname || row.groupLabels?.alertname || `#${row.id}`;
}

/** Keeps Ant Design presentation tokens out of the Alert domain model. */
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
