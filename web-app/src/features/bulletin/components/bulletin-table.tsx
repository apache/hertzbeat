/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Button, Popconfirm, Space, Table, Tag, type TableProps } from 'antd';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';

import type { BulletinActionCapabilities } from '../model/bulletin-action-capability';
import { bulletinPageSizes, formatBulletinTime, type Bulletin, type BulletinQuery } from '../model/bulletin-model';
import styles from '../bulletin-page.module.css';

type BulletinTableActions = {
  changePage: (page: number, pageSize: number) => unknown;
  edit: (id: number) => unknown;
  remove: (record: Bulletin) => unknown;
  select: (id: number) => unknown;
  selectIds: (ids: number[]) => unknown;
};

type BulletinTableProps = {
  actions: BulletinTableActions;
  capabilities: BulletinActionCapabilities;
  listKind: 'idle' | 'loading' | 'correcting' | 'ready' | 'empty' | 'invalid' | 'permission' | 'unavailable' | 'error';
  query: BulletinQuery;
  records: Bulletin[];
  selectedId: number | null;
  selectedIds: number[];
  total: number;
  readLocked: boolean;
  writeLocked: boolean;
};

export function BulletinTable(props: BulletinTableProps) {
  const { t } = useTranslation();
  if (props.listKind !== 'ready') return null;
  return (
    <Table<Bulletin>
      rowKey="id"
      dataSource={props.records}
      scroll={{ x: 920 }}
      rowClassName={record => (record.id === props.selectedId ? (styles.selectedRow ?? '') : '')}
      onRow={record => (props.readLocked ? {} : { onClick: () => props.actions.select(record.id) })}
      {...createBulletinRowSelectionProps(props)}
      pagination={
        props.listKind === 'ready'
          ? {
              current: props.query.pageIndex + 1,
              pageSize: props.query.pageSize,
              total: props.total,
              showSizeChanger: true,
              pageSizeOptions: [...bulletinPageSizes],
              disabled: props.readLocked,
              onChange: props.actions.changePage
            }
          : false
      }
      columns={createBulletinColumns(props.actions, props.readLocked, props.writeLocked, props.capabilities, t)}
    />
  );
}

function createBulletinRowSelectionProps(props: BulletinTableProps): Pick<TableProps<Bulletin>, 'rowSelection'> {
  if (!props.capabilities.canDelete) return {};
  return {
    rowSelection: {
      selectedRowKeys: props.selectedIds,
      getCheckboxProps: () => ({ disabled: props.writeLocked }),
      onChange: keys => {
        if (!props.writeLocked) props.actions.selectIds(keys.filter((key): key is number => typeof key === 'number'));
      }
    }
  };
}

function createBulletinColumns(
  actions: BulletinTableActions,
  readLocked: boolean,
  writeLocked: boolean,
  capabilities: BulletinActionCapabilities,
  t: TFunction
): NonNullable<TableProps<Bulletin>['columns']> {
  return [
    { title: t('bulletin.name'), dataIndex: 'name', width: 180 },
    { title: t('bulletin.application'), dataIndex: 'app', width: 150, render: value => <Tag>{value}</Tag> },
    { title: t('bulletin.monitors'), dataIndex: 'monitorIds', width: 110, render: (value: number[]) => value.length },
    { title: t('bulletin.creator'), dataIndex: 'creator', width: 140 },
    {
      title: t('bulletin.updated'),
      width: 180,
      render: (_, record) => formatBulletinTime(record.gmtUpdate ?? record.gmtCreate)
    },
    {
      title: t('common.actions'),
      fixed: 'right',
      width: 260,
      render: (_, record) => (
        <Space onClick={event => event.stopPropagation()}>
          <Button type="link" disabled={readLocked} onClick={() => actions.select(record.id)}>
            {t('bulletin.viewMetrics')}
          </Button>
          {capabilities.canWrite && (
            <Button type="link" disabled={writeLocked} onClick={() => void actions.edit(record.id)}>
              {t('common.edit')}
            </Button>
          )}
          {capabilities.canDelete && (
            <Popconfirm
              disabled={writeLocked}
              title={t('bulletin.deleteConfirm')}
              onConfirm={() => void actions.remove(record)}
            >
              <Button type="link" danger disabled={writeLocked}>
                {t('bulletin.delete')}
              </Button>
            </Popconfirm>
          )}
        </Space>
      )
    }
  ];
}
