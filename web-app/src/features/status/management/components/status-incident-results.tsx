/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Button, Pagination, Popconfirm, Space, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useTranslation } from 'react-i18next';

import { OperationalStatePanel } from '@/shared/operational-page';

import type { StatusIncident } from '../model/status-management-contract';
import { statusIncidentPageSizes } from '../model/status-incident-query';
import {
  incidentStateKey,
  latestIncidentMessage,
  type StatusIncidentCollectionState
} from '../model/status-management-model';

export type IncidentResultsProps = {
  state: StatusIncidentCollectionState<StatusIncident>;
  detailLoading: boolean;
  records: StatusIncident[];
  pageIndex: number;
  pageSize: number;
  total: number;
  commandLocked: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  onPageChange: (pageIndex: number, pageSize: number) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
};

export function IncidentResults(props: IncidentResultsProps) {
  const { t } = useTranslation();
  if (props.state.kind === 'loading') {
    return <OperationalStatePanel kind="loading" title={t('statusManagement.loadingIncidents')} />;
  }
  if (props.state.kind === 'unavailable') {
    return <OperationalStatePanel kind="unavailable" title={t('common.unavailable')} />;
  }
  if (props.state.kind === 'permission')
    return <OperationalStatePanel kind="permission" title={t('common.permission.roleRequiredDescription')} />;
  if (props.state.kind === 'error') return <OperationalStatePanel kind="error" title={t('common.routeError.title')} />;
  if (props.state.kind === 'empty') return <OperationalStatePanel kind="empty" title={t('status.noIncidents')} />;

  const pagination = incidentPagination(props);
  return (
    <>
      <Table
        rowKey="id"
        size="small"
        loading={props.detailLoading}
        columns={incidentColumns(props, t)}
        dataSource={props.records}
        pagination={props.records.length === 0 ? false : pagination}
        scroll={{ x: 900 }}
      />
      {props.records.length === 0 && props.total > 0 && <Pagination {...pagination} />}
    </>
  );
}

function incidentColumns(props: IncidentResultsProps, t: (key: string) => string): ColumnsType<StatusIncident> {
  return [
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
    ...incidentActionColumns(props, t)
  ];
}

function incidentActionColumns(props: IncidentResultsProps, t: (key: string) => string): ColumnsType<StatusIncident> {
  if (!props.canUpdate && !props.canDelete) return [];
  return [
    {
      title: t('common.actions'),
      fixed: 'right',
      width: 180,
      render: (_value, row) => (
        <Space size={2}>
          {props.canUpdate && (
            <Button type="link" disabled={props.commandLocked} onClick={() => row.id && props.onEdit(row.id)}>
              {t('statusManagement.update')}
            </Button>
          )}
          {props.canDelete && (
            <Popconfirm
              title={t('statusManagement.deleteIncidentConfirm')}
              okButtonProps={{ disabled: props.commandLocked }}
              onConfirm={() => row.id && props.onDelete(row.id)}
            >
              <Button type="link" danger disabled={props.commandLocked}>
                {t('statusManagement.delete')}
              </Button>
            </Popconfirm>
          )}
        </Space>
      )
    }
  ];
}

function incidentPagination(props: IncidentResultsProps) {
  return {
    current: props.pageIndex + 1,
    pageSize: props.pageSize,
    pageSizeOptions: [...statusIncidentPageSizes],
    showSizeChanger: true,
    disabled: props.commandLocked,
    total: props.total,
    onChange: (page: number, size: number) => props.onPageChange(page - 1, size)
  };
}
