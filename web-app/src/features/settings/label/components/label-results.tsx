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

import { Alert, Button, Empty, Popconfirm, Space, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';

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
  state: LabelListState;
  pageIndex: number;
  pageSize: LabelPageSize;
  onPageChange: (pageIndex: number, pageSize: LabelPageSize) => void;
};

export function LabelResults(props: LabelResultsProps) {
  const { t } = useTranslation();
  if (props.state.kind === 'loading') return <Spin data-testid="label-loading" />;
  if (props.state.kind === 'unavailable') return <Alert type="error" showIcon message={t('labels.unavailable')} />;
  if (props.state.kind === 'error') return <Alert type="error" showIcon message={t('common.routeError.description')} />;
  if (props.state.kind === 'empty') return <Empty description={t('labels.empty')} />;

  return (
    <Table<LabelRecord>
      rowKey="id"
      size="small"
      columns={createLabelColumns(t, props)}
      dataSource={props.state.records}
      pagination={{
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

function createLabelColumns(t: TFunction, actions: LabelResultActions): ColumnsType<LabelRecord> {
  return [
    {
      title: t('labels.label'),
      render: (_value, row) => (
        <Button type="link" className={styles.labelLink ?? ''} onClick={() => actions.onInspect(row)}>
          <Tag>{buildLabelDisplayName(row)}</Tag>
        </Button>
      )
    },
    {
      title: t('labels.descriptionLabel'),
      dataIndex: 'description',
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
      render: (value: number | string | undefined, row) => formatTime(value ?? row.gmtCreate)
    },
    {
      title: t('common.actions'),
      width: 220,
      render: (_value, row) => (
        <Space size={2}>
          <Button type="link" onClick={() => actions.onCopy(row)}>
            {t('labels.copy')}
          </Button>
          <Button type="link" onClick={() => actions.onEdit(row)}>
            {t('common.edit')}
          </Button>
          <Popconfirm title={t('labels.deleteConfirm')} onConfirm={() => actions.onRemove(row)}>
            <Button type="link" danger>
              {t('labels.delete')}
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];
}

function formatTime(value?: number | string) {
  if (value == null) return '—';
  const timestamp = typeof value === 'number' ? value : Date.parse(value);
  if (!Number.isFinite(timestamp)) return '—';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'short' }).format(timestamp);
}
