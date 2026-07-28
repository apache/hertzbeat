/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Alert, Button, Empty, Popconfirm, Space, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useTranslation } from 'react-i18next';

import type { StatusComponent } from '../model/status-management-contract';
import {
  statusComponentMethod,
  statusComponentState,
  statusStateKey,
  type StatusCollectionState
} from '../model/status-management-model';

type ComponentResultsProps = {
  state: StatusCollectionState<StatusComponent>;
  canUpdate: boolean;
  canDelete: boolean;
  commandLocked: boolean;
  onEdit: (record: StatusComponent) => void;
  onDelete: (id: number) => void;
};

export function ComponentResults(props: ComponentResultsProps) {
  const { t } = useTranslation();
  if (props.state.kind === 'unavailable') return <Alert type="error" showIcon message={t('common.unavailable')} />;
  if (props.state.kind === 'permission')
    return <Alert type="warning" showIcon message={t('common.permission.roleRequiredDescription')} />;
  if (props.state.kind === 'error') return <Alert type="error" showIcon message={t('common.routeError.title')} />;
  if (props.state.kind === 'empty') return <Empty description={t('status.noComponents')} />;

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
    ...componentActionColumns(props, t)
  ];
  const records = props.state.kind === 'ready' ? props.state.records : [];
  return (
    <Table
      rowKey="id"
      size="small"
      loading={props.state.kind === 'loading'}
      pagination={false}
      columns={columns}
      dataSource={records}
    />
  );
}

function componentActionColumns(
  props: ComponentResultsProps,
  t: (key: string) => string
): ColumnsType<StatusComponent> {
  if (!props.canUpdate && !props.canDelete) return [];
  return [
    {
      title: t('common.actions'),
      width: 170,
      render: (_value, row) => (
        <Space size={2}>
          {props.canUpdate && (
            <Button type="link" disabled={props.commandLocked} onClick={() => props.onEdit(row)}>
              {t('common.edit')}
            </Button>
          )}
          {props.canDelete && (
            <Popconfirm
              title={t('statusManagement.deleteComponentConfirm')}
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
