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

import { AudioMutedOutlined, ClockCircleOutlined, SyncOutlined } from '@ant-design/icons';
import { Switch, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { TFunction } from 'i18next';
import type { Key } from 'react';
import { useTranslation } from 'react-i18next';

import { OperationalStatePanel, OperationalTableEmptyState } from '@/shared/operational-page/operational-page';
import { pageSelectionLabels, pageSelectionTitleCheckboxProps } from '@/shared/table-selection';

import type { AlertActionCapabilities } from '../model/alert-action-capability';
import type { AlertSilenceListEvidence } from '../model/alert-silence-page-model';
import { alertPolicyTableViewport } from '../model/alert-policy-table-viewport';
import { alertSilencePageSizes, type AlertSilence, type AlertSilenceQuery } from '../model/alert-silence-model';
import { AlertSilenceActions } from './alert-silence-actions';

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
  if (evidence.kind === 'unavailable')
    return <OperationalStatePanel kind="unavailable" title={t('common.unavailable')} />;
  if (evidence.kind === 'error')
    return <OperationalStatePanel kind="error" title={t('common.routeError.description')} />;
  return <AlertSilenceTable {...props} />;
}

function AlertSilenceTable({
  evidence,
  query,
  capabilities,
  writeLocked,
  selectedIds,
  selectIds,
  actions
}: AlertSilenceResultsProps) {
  const { t } = useTranslation();
  const ready = evidence.kind === 'ready' ? evidence : null;
  const records = ready?.records ?? [];
  const viewport = alertPolicyTableViewport(records.length, 1240);
  return (
    <Table<AlertSilence>
      rowKey="id"
      data-table-overflow={viewport.mode}
      size="small"
      dataSource={records}
      columns={columns(t, capabilities, writeLocked, actions, viewport.mode === 'scroll')}
      loading={evidence.kind === 'loading'}
      locale={{
        emptyText:
          evidence.kind === 'empty' ? <OperationalTableEmptyState title={t('alertSilences.empty')} /> : undefined
      }}
      {...(capabilities.canDelete
        ? {
            rowSelection: {
              selectedRowKeys: selectedIds,
              getTitleCheckboxProps: () =>
                pageSelectionTitleCheckboxProps(
                  selectedIds,
                  records.map(record => record.id),
                  pageSelectionLabels(t)
                ),
              getCheckboxProps: () => ({ disabled: writeLocked }),
              onChange: (keys: Key[]) => {
                if (!writeLocked) selectIds(keys.filter((key): key is number => typeof key === 'number'));
              }
            }
          }
        : {})}
      scroll={viewport.scroll}
      pagination={{
        current: query.pageIndex + 1,
        pageSize: query.pageSize,
        pageSizeOptions: [...alertSilencePageSizes],
        showSizeChanger: true,
        disabled: writeLocked,
        total: ready?.total ?? 0,
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
  },
  fixActionColumn: boolean
): ColumnsType<AlertSilence> {
  return [
    { title: t('alertSilences.name'), dataIndex: 'name', width: 220, align: 'center' },
    {
      title: t('alertSilences.type'),
      width: 190,
      align: 'center',
      render: (_value, item) => scheduleType(t, item)
    },
    {
      title: t('alertSilences.times'),
      dataIndex: 'times',
      width: 190,
      align: 'center',
      render: (value?: number) => (
        <Tag color="processing" icon={<AudioMutedOutlined />}>
          {value ?? '—'}
        </Tag>
      )
    },
    {
      title: t('alertSilences.enabled'),
      width: 180,
      align: 'center',
      render: (_value, item) => (
        <Switch
          aria-label={t('alertSilences.enabled')}
          checked={item.enable === true}
          disabled={!capabilities.canWrite || writeLocked || typeof item.enable !== 'boolean'}
          onChange={enabled => actions.toggle(item, enabled)}
        />
      )
    },
    {
      title: t('alertSilences.updated'),
      width: 220,
      align: 'center',
      render: (_value, item) => item.gmtUpdate ?? item.gmtCreate ?? '—'
    },
    {
      title: t('common.actions'),
      width: 240,
      align: 'center',
      ...(fixActionColumn ? { fixed: 'right' as const } : {}),
      render: (_value, item) => (
        <AlertSilenceActions
          silence={item}
          capabilities={capabilities}
          writeLocked={writeLocked}
          edit={actions.edit}
          remove={actions.remove}
        />
      )
    }
  ];
}

function scheduleType(t: TFunction, silence: AlertSilence) {
  const recurring = silence.type === 1;
  return (
    <Tag color="processing" icon={recurring ? <SyncOutlined /> : <ClockCircleOutlined />}>
      {t(recurring ? 'alertSilences.recurring' : 'alertSilences.once')}
    </Tag>
  );
}
