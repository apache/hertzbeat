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

import { Alert, Button, Empty, Popconfirm, Space, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useTranslation } from 'react-i18next';

import { labelPageSizes, type LabelRecord } from '../api/label-api';
import { buildLabelDisplayName, labelTypeKey } from '../model/label-model';
import styles from './label.module.css';

type LabelResultsProps = {
  loading: boolean;
  error: boolean;
  records: LabelRecord[];
  pageIndex: number;
  pageSize: number;
  total: number;
  onPageChange: (pageIndex: number, pageSize: number) => void;
  onCopy: (label: LabelRecord) => void;
  onEdit: (label: LabelRecord) => void;
  onRemove: (id: number) => void;
  onInspect: (label: LabelRecord) => void;
};

export function LabelResults(props: LabelResultsProps) {
  const { t } = useTranslation();
  if (props.error) return <Alert type="error" showIcon title={t('labels.unavailable')} />;
  if (!props.loading && props.records.length === 0) return <Empty description={t('labels.empty')} />;

  const columns: ColumnsType<LabelRecord> = [
    {
      title: t('labels.label'),
      render: (_value, row) => (
        <Button type="link" className={styles.labelLink ?? ''} onClick={() => props.onInspect(row)}>
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
          <Button type="link" onClick={() => props.onCopy(row)}>{t('labels.copy')}</Button>
          <Button type="link" onClick={() => props.onEdit(row)}>{t('common.edit')}</Button>
          <Popconfirm title={t('labels.deleteConfirm')} onConfirm={() => row.id && props.onRemove(row.id)}>
            <Button type="link" danger>{t('labels.delete')}</Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <Table<LabelRecord>
      rowKey="id"
      size="small"
      loading={props.loading}
      columns={columns}
      dataSource={props.records}
      pagination={{
        current: props.pageIndex + 1,
        pageSize: props.pageSize,
        pageSizeOptions: [...labelPageSizes],
        showSizeChanger: true,
        total: props.total,
        onChange: (page, pageSize) => props.onPageChange(page - 1, pageSize)
      }}
    />
  );
}

function formatTime(value?: number | string) {
  if (value == null) return '—';
  const timestamp = typeof value === 'number' ? value : Date.parse(value);
  if (!Number.isFinite(timestamp)) return '—';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'short' }).format(timestamp);
}
