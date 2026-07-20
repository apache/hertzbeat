/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */
import { Alert, Button, Empty, Pagination, Popconfirm, Space, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useTranslation } from 'react-i18next';

import type { StatusCollectionState, StatusIncidentCollectionState } from '../model/status-management-model';
import type { StatusComponent, StatusIncident } from '../model/status-management-contract';
import { statusIncidentPageSizes } from '../model/status-incident-query';
import {
  incidentStateKey,
  latestIncidentMessage,
  statusComponentMethod,
  statusComponentState,
  statusStateKey
} from '../model/status-management-model';

type ComponentResultsProps = {
  state: StatusCollectionState<StatusComponent>;
  commandLocked: boolean;
  onEdit: (record: StatusComponent) => void;
  onDelete: (id: number) => void;
};

export function ComponentResults({ state, commandLocked, onEdit, onDelete }: ComponentResultsProps) {
  const { t } = useTranslation();
  if (state.kind === 'unavailable') return <Alert type="error" showIcon message={t('common.unavailable')} />;
  if (state.kind === 'error') return <Alert type="error" showIcon message={t('common.routeError.title')} />;
  if (state.kind === 'empty') return <Empty description={t('status.noComponents')} />;
  const records = state.kind === 'ready' ? state.records : [];
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
        const state = row.method === statusComponentMethod.manual ? row.configState : row.state;
        return <Tag color={state === statusComponentState.normal ? 'green' : 'red'}>{t(statusStateKey(state))}</Tag>;
      }
    },
    {
      title: t('common.actions'),
      width: 170,
      render: (_value, row) => (
        <Space size={2}>
          <Button type="link" disabled={commandLocked} onClick={() => onEdit(row)}>
            {t('common.edit')}
          </Button>
          <Popconfirm
            title={t('statusManagement.deleteComponentConfirm')}
            okButtonProps={{ disabled: commandLocked }}
            onConfirm={() => row.id && onDelete(row.id)}
          >
            <Button type="link" danger disabled={commandLocked}>
              {t('statusManagement.delete')}
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];
  return (
    <Table
      rowKey="id"
      size="small"
      loading={state.kind === 'loading'}
      pagination={false}
      columns={columns}
      dataSource={records}
    />
  );
}

type IncidentResultsProps = {
  state: StatusIncidentCollectionState<StatusIncident>;
  detailLoading: boolean;
  records: StatusIncident[];
  pageIndex: number;
  pageSize: number;
  total: number;
  commandLocked: boolean;
  onPageChange: (pageIndex: number, pageSize: number) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
};

export function IncidentResults(props: IncidentResultsProps) {
  const { state, detailLoading, records, pageIndex, pageSize, total, commandLocked, onPageChange, onEdit, onDelete } =
    props;
  const { t } = useTranslation();
  if (state.kind === 'unavailable') return <Alert type="error" showIcon message={t('common.unavailable')} />;
  if (state.kind === 'error') return <Alert type="error" showIcon message={t('common.routeError.title')} />;
  if (state.kind === 'empty') return <Empty description={t('status.noIncidents')} />;
  const columns: ColumnsType<StatusIncident> = [
    { title: t('status.incident'), dataIndex: 'name' },
    {
      title: t('status.state'),
      dataIndex: 'state',
      width: 140,
      render: (value: number) => <Tag>{t(incidentStateKey(value))}</Tag>
    },
    {
      title: t('status.components'),
      render: (_value, row) => row.components?.map(item => item.name).join(', ') || '—'
    },
    { title: t('statusManagement.latestUpdate'), render: (_value, row) => latestIncidentMessage(row) },
    {
      title: t('common.actions'),
      width: 180,
      render: (_value, row) => (
        <Space size={2}>
          <Button type="link" disabled={commandLocked} onClick={() => row.id && onEdit(row.id)}>
            {t('statusManagement.update')}
          </Button>
          <Popconfirm
            title={t('statusManagement.deleteIncidentConfirm')}
            okButtonProps={{ disabled: commandLocked }}
            onConfirm={() => row.id && onDelete(row.id)}
          >
            <Button type="link" danger disabled={commandLocked}>
              {t('statusManagement.delete')}
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];
  const pagination = incidentPagination(pageIndex, pageSize, total, commandLocked, onPageChange);
  return (
    <>
      <Table
        rowKey="id"
        size="small"
        loading={state.kind === 'loading' || detailLoading}
        columns={columns}
        dataSource={records}
        pagination={records.length === 0 ? false : pagination}
      />
      {state.kind === 'ready' && records.length === 0 && total > 0 && <Pagination {...pagination} />}
    </>
  );
}

function incidentPagination(
  pageIndex: number,
  pageSize: number,
  total: number,
  disabled: boolean,
  onPageChange: (pageIndex: number, pageSize: number) => void
) {
  return {
    current: pageIndex + 1,
    pageSize,
    pageSizeOptions: [...statusIncidentPageSizes],
    showSizeChanger: true,
    disabled,
    total,
    onChange: (page: number, size: number) => onPageChange(page - 1, size)
  };
}
