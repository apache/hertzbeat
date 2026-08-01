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

import { Button, Popconfirm, Space, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';

import { OperationalStatePanel } from '@/shared/operational-page';

import { buildLabelDisplayName, labelTypeKey, type LabelListState, type LabelRecord } from '../model/label-model';
import { isLabelPageSize, labelPageSizes, type LabelPageSize } from '../model/label-query-model';
import styles from './label.module.css';

type LabelResultActions = {
  onCopy: (label: LabelRecord) => void;
  onEdit: (label: LabelRecord) => void;
  onRemove: (record: LabelRecord) => void;
  onInspect: (label: LabelRecord) => void;
};

type LabelResultsProps = LabelResultActions & {
  busy: boolean;
  canDelete: boolean;
  canUpdate: boolean;
  writeLocked: boolean;
  state: LabelListState;
  pageIndex: number;
  pageSize: LabelPageSize;
  onPageChange: (pageIndex: number, pageSize: LabelPageSize) => void;
};

export function LabelResults(props: LabelResultsProps) {
  const { t } = useTranslation();
  if (props.state.kind === 'loading') return <OperationalStatePanel kind="loading" title={t('labels.loading')} />;
  if (props.state.kind === 'permission')
    return <OperationalStatePanel kind="permission" title={t('labels.permission')} />;
  if (props.state.kind === 'unavailable')
    return <OperationalStatePanel kind="unavailable" title={t('labels.unavailable')} />;
  if (props.state.kind === 'error')
    return <OperationalStatePanel kind="error" title={t('common.routeError.description')} />;
  if (props.state.kind === 'empty') return <OperationalStatePanel kind="empty" title={t('labels.empty')} />;

  return (
    <Table<LabelRecord>
      rowKey="id"
      size="small"
      columns={createLabelColumns(t, props)}
      dataSource={props.state.records}
      scroll={{ x: 980 }}
      pagination={{
        disabled: props.busy,
        current: props.pageIndex + 1,
        pageSize: props.pageSize,
        pageSizeOptions: [...labelPageSizes],
        showSizeChanger: true,
        total: props.state.total,
        onChange: (page, pageSize) => {
          if (isLabelPageSize(pageSize)) props.onPageChange(page - 1, pageSize);
        }
      }}
    />
  );
}

function createLabelColumns(t: TFunction, actions: LabelResultsProps): ColumnsType<LabelRecord> {
  return [
    {
      title: t('labels.label'),
      width: 200,
      render: (_value, row) => (
        <Button type="link" className={styles.labelLink ?? ''} onClick={() => actions.onInspect(row)}>
          <Tag>{buildLabelDisplayName(row)}</Tag>
        </Button>
      )
    },
    {
      title: t('labels.descriptionLabel'),
      dataIndex: 'description',
      width: 260,
      render: (value: string | undefined) => value || '—'
    },
    {
      title: t('labels.type.label'),
      dataIndex: 'type',
      width: 120,
      render: (value: number | undefined) => t(labelTypeKey(value))
    },
    {
      title: t('labels.updated'),
      dataIndex: 'gmtUpdate',
      width: 180,
      render: (value: string | undefined, row) => formatTime(value ?? row.gmtCreate)
    },
    {
      title: t('common.actions'),
      fixed: 'right',
      width: 220,
      render: (_value, row) => (
        <Space size={2}>
          <Button type="link" onClick={() => actions.onCopy(row)}>
            {t('labels.copy')}
          </Button>
          <Button type="link" disabled={!actions.canUpdate || actions.writeLocked} onClick={() => actions.onEdit(row)}>
            {t('common.edit')}
          </Button>
          <Popconfirm
            disabled={!actions.canDelete || actions.writeLocked}
            okButtonProps={{ disabled: !actions.canDelete || actions.writeLocked }}
            title={t('labels.deleteConfirm')}
            onConfirm={() => actions.onRemove(row)}
          >
            <Button type="link" danger disabled={!actions.canDelete || actions.writeLocked}>
              {t('labels.delete')}
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];
}

function formatTime(value?: string) {
  if (value == null) return '—';
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return '—';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'short' }).format(timestamp);
}
