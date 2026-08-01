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

import { Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { TFunction } from 'i18next';
import type { Key } from 'react';
import { useTranslation } from 'react-i18next';

import { OperationalStatePanel } from '@/shared/operational-page/operational-page';

import type { AlertActionCapabilities } from '../model/alert-action-capability';
import type { AlertSilenceListEvidence } from '../model/alert-silence-page-model';
import { alertSilencePageSizes, type AlertSilence, type AlertSilenceQuery } from '../model/alert-silence-model';
import { AlertSilenceActions } from './alert-silence-actions';
import styles from '../shared/alert-policy-page.module.css';

type AlertSilenceResultsProps = {
  evidence: AlertSilenceListEvidence;
  query: AlertSilenceQuery;
  capabilities: AlertActionCapabilities;
  writeLocked: boolean;
  selectedIds: number[];
  selectIds: (ids: number[]) => void;
  actions: {
    changePage: (page: number, size: number) => void;
    edit: (id: number) => void;
    toggle: (silence: AlertSilence, enabled: boolean) => void;
    remove: (id: number) => void;
  };
};

export function AlertSilenceResults(props: AlertSilenceResultsProps) {
  const { t } = useTranslation();
  const { evidence } = props;
  if (evidence.kind === 'loading') return <OperationalStatePanel kind="loading" title={t('common.loading')} />;
  if (evidence.kind === 'empty') return <OperationalStatePanel kind="empty" title={t('alertSilences.empty')} />;
  if (evidence.kind === 'unavailable')
    return <OperationalStatePanel kind="unavailable" title={t('common.unavailable')} />;
  if (evidence.kind === 'error')
    return <OperationalStatePanel kind="error" title={t('common.routeError.description')} />;
  return <AlertSilenceReadyResults {...props} evidence={evidence} />;
}

function AlertSilenceReadyResults({
  evidence,
  query,
  capabilities,
  writeLocked,
  selectedIds,
  selectIds,
  actions
}: AlertSilenceResultsProps & { evidence: Extract<AlertSilenceListEvidence, { kind: 'ready' }> }) {
  const { t } = useTranslation();
  return (
    <Table<AlertSilence>
      rowKey="id"
      size="small"
      dataSource={evidence.records}
      columns={columns(t, capabilities, writeLocked, actions)}
      {...(capabilities.canDelete
        ? {
            rowSelection: {
              selectedRowKeys: selectedIds,
              getCheckboxProps: () => ({ disabled: writeLocked }),
              onChange: (keys: Key[]) => {
                if (!writeLocked) selectIds(keys.filter((key): key is number => typeof key === 'number'));
              }
            }
          }
        : {})}
      scroll={{ x: 1310 }}
      pagination={{
        current: query.pageIndex + 1,
        pageSize: query.pageSize,
        pageSizeOptions: [...alertSilencePageSizes],
        showSizeChanger: true,
        disabled: writeLocked,
        total: evidence.total,
        onChange: (page, pageSize) => {
          if (!writeLocked) actions.changePage(page, pageSize);
        }
      }}
    />
  );
}

function columns(
  t: TFunction,
  capabilities: AlertActionCapabilities,
  writeLocked: boolean,
  actions: {
    edit: (id: number) => void;
    toggle: (silence: AlertSilence, enabled: boolean) => void;
    remove: (id: number) => void;
  }
): ColumnsType<AlertSilence> {
  return [
    { title: t('alertSilences.name'), dataIndex: 'name', width: 210 },
    { title: t('alertSilences.scope'), width: 250, render: (_value, item) => scope(t, item) },
    { title: t('alertSilences.schedule'), width: 330, render: (_value, item) => schedule(t, item) },
    { title: t('alertSilences.times'), dataIndex: 'times', width: 100, render: (value?: number) => value ?? '—' },
    {
      title: t('alertSilences.updated'),
      width: 180,
      render: (_value, item) => item.gmtUpdate ?? item.gmtCreate ?? '—'
    },
    {
      title: t('common.actions'),
      width: 250,
      render: (_value, item) => (
        <AlertSilenceActions silence={item} capabilities={capabilities} writeLocked={writeLocked} {...actions} />
      )
    }
  ];
}

function scope(t: TFunction, silence: AlertSilence) {
  if (silence.matchAll !== false) return <Tag>{t('alertSilences.allAlerts')}</Tag>;
  return (
    <div className={styles.labels}>
      {Object.entries(silence.labels ?? {}).map(([key, value]) => (
        <Tag key={key}>
          {key}:{value}
        </Tag>
      ))}
    </div>
  );
}

function schedule(t: TFunction, silence: AlertSilence) {
  const recurring = silence.type === 1;
  return (
    <Space direction="vertical" size={0}>
      <Tag color="processing">{t(recurring ? 'alertSilences.recurring' : 'alertSilences.once')}</Tag>
      <Typography.Text type="secondary">
        {recurring
          ? `${t('alertSilences.selectedDays', { count: silence.days?.length ?? 0 })} · ${formatClock(silence.periodStart)} – ${formatClock(silence.periodEnd)}`
          : `${formatDate(silence.periodStart)} – ${formatDate(silence.periodEnd)}`}
      </Typography.Text>
    </Space>
  );
}

function formatDate(value?: string | number | null) {
  if (value == null) return '—';
  const timestamp = typeof value === 'number' ? value : Date.parse(value);
  return Number.isFinite(timestamp)
    ? new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'medium' }).format(timestamp)
    : '—';
}

function formatClock(value?: string | null) {
  if (!value) return '—';
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp)
    ? new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(timestamp)
    : '—';
}
