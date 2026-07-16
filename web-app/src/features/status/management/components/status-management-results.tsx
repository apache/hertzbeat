/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */
import { Alert, Button, Empty, Popconfirm, Space, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useTranslation } from 'react-i18next';

import type { StatusComponent, StatusIncident } from '../model/status-management-contract';
import { statusIncidentPageSizes } from '../model/status-incident-query';
import {
  incidentStateKey,
  latestIncidentMessage,
  statusStateKey
} from '../model/status-management-model';

type ComponentResultsProps = {
  loading: boolean;
  error: boolean;
  records: StatusComponent[];
  onEdit: (record: StatusComponent) => void;
  onDelete: (id: number) => void;
};

export function ComponentResults({ loading, error, records, onEdit, onDelete }: ComponentResultsProps) {
  const { t } = useTranslation();
  if (error) return <Alert type="error" showIcon message={t('common.unavailable')} />;
  if (!loading && records.length === 0) return <Empty description={t('status.noComponents')} />;
  const columns: ColumnsType<StatusComponent> = [
    { title: t('status.component'), dataIndex: 'name' },
    {
      title: t('status.descriptionLabel'),
      dataIndex: 'description',
      render: (value: string | null | undefined) => value || '—'
    },
    {
      title: t('statusManagement.method'),
      dataIndex: 'method',
      render: value => t(value === 0 ? 'statusManagement.automatic' : 'statusManagement.manual')
    },
    {
      title: t('status.state'),
      dataIndex: 'state',
      render: (_value, row) => {
        const state = row.method === 1 ? row.configState : row.state;
        return <Tag color={state === 0 ? 'green' : 'red'}>{t(statusStateKey(state))}</Tag>;
      }
    },
    {
      title: t('common.actions'),
      width: 170,
      render: (_value, row) => (
        <Space size={2}>
          <Button type="link" onClick={() => onEdit(row)}>{t('common.edit')}</Button>
          <Popconfirm
            title={t('statusManagement.deleteComponentConfirm')}
            onConfirm={() => row.id && onDelete(row.id)}
          >
            <Button type="link" danger>{t('statusManagement.delete')}</Button>
          </Popconfirm>
        </Space>
      )
    }
  ];
  return <Table rowKey="id" size="small" loading={loading} pagination={false} columns={columns} dataSource={records} />;
}

type IncidentResultsProps = {
  loading: boolean;
  error: boolean;
  records: StatusIncident[];
  pageIndex: number;
  pageSize: number;
  total: number;
  onPageChange: (pageIndex: number, pageSize: number) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
};

export function IncidentResults(props: IncidentResultsProps) {
  const { loading, error, records, pageIndex, pageSize, total, onPageChange, onEdit, onDelete } = props;
  const { t } = useTranslation();
  if (error) return <Alert type="error" showIcon message={t('common.unavailable')} />;
  if (!loading && records.length === 0) return <Empty description={t('status.noIncidents')} />;
  const columns: ColumnsType<StatusIncident> = [
    { title: t('status.incident'), dataIndex: 'name' },
    {
      title: t('status.state'),
      dataIndex: 'state',
      width: 140,
      render: (value: number) => <Tag>{t(incidentStateKey(value))}</Tag>
    },
    { title: t('status.components'), render: (_value, row) => row.components?.map(item => item.name).join(', ') || '—' },
    { title: t('statusManagement.latestUpdate'), render: (_value, row) => latestIncidentMessage(row) },
    {
      title: t('common.actions'),
      width: 180,
      render: (_value, row) => (
        <Space size={2}>
          <Button type="link" onClick={() => row.id && onEdit(row.id)}>{t('statusManagement.update')}</Button>
          <Popconfirm
            title={t('statusManagement.deleteIncidentConfirm')}
            onConfirm={() => row.id && onDelete(row.id)}
          >
            <Button type="link" danger>{t('statusManagement.delete')}</Button>
          </Popconfirm>
        </Space>
      )
    }
  ];
  return (
    <Table
      rowKey="id"
      size="small"
      loading={loading}
      columns={columns}
      dataSource={records}
      pagination={{
        current: pageIndex + 1,
        pageSize,
        pageSizeOptions: [...statusIncidentPageSizes],
        showSizeChanger: true,
        total,
        onChange: (page, size) => onPageChange(page - 1, size)
      }}
    />
  );
}
