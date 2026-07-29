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
  busy: boolean;
  capabilities: BulletinActionCapabilities;
  listKind: 'idle' | 'loading' | 'ready' | 'empty' | 'invalid' | 'permission' | 'unavailable' | 'error';
  query: BulletinQuery;
  records: Bulletin[];
  selectedId: number | null;
  selectedIds: number[];
  total: number;
};

export function BulletinTable(props: BulletinTableProps) {
  const { t } = useTranslation();
  if (props.listKind !== 'loading' && props.listKind !== 'ready') return null;
  return (
    <Table<Bulletin>
      rowKey="id"
      loading={props.listKind === 'loading'}
      dataSource={props.records}
      rowClassName={record => (record.id === props.selectedId ? (styles.selectedRow ?? '') : '')}
      onRow={record => (props.busy ? {} : { onClick: () => props.actions.select(record.id) })}
      {...createBulletinRowSelectionProps(props)}
      pagination={
        props.listKind === 'ready'
          ? {
              current: props.query.pageIndex + 1,
              pageSize: props.query.pageSize,
              total: props.total,
              showSizeChanger: true,
              pageSizeOptions: [...bulletinPageSizes],
              disabled: props.busy,
              onChange: props.actions.changePage
            }
          : false
      }
      columns={createBulletinColumns(props.actions, props.busy, props.capabilities, t)}
    />
  );
}

function createBulletinRowSelectionProps(props: BulletinTableProps): Pick<TableProps<Bulletin>, 'rowSelection'> {
  if (!props.capabilities.canDelete) return {};
  return {
    rowSelection: {
      selectedRowKeys: props.selectedIds,
      getCheckboxProps: () => ({ disabled: props.busy }),
      onChange: keys => {
        if (!props.busy) props.actions.selectIds(keys.filter((key): key is number => typeof key === 'number'));
      }
    }
  };
}

function createBulletinColumns(
  actions: BulletinTableActions,
  busy: boolean,
  capabilities: BulletinActionCapabilities,
  t: TFunction
): NonNullable<TableProps<Bulletin>['columns']> {
  return [
    { title: t('bulletin.name'), dataIndex: 'name' },
    { title: t('bulletin.application'), dataIndex: 'app', render: value => <Tag>{value}</Tag> },
    { title: t('bulletin.monitors'), dataIndex: 'monitorIds', render: (value: number[]) => value.length },
    { title: t('bulletin.creator'), dataIndex: 'creator' },
    { title: t('bulletin.updated'), render: (_, record) => formatBulletinTime(record.gmtUpdate ?? record.gmtCreate) },
    {
      title: t('common.actions'),
      fixed: 'right',
      render: (_, record) => (
        <Space onClick={event => event.stopPropagation()}>
          <Button type="link" disabled={busy} onClick={() => actions.select(record.id)}>
            {t('bulletin.viewMetrics')}
          </Button>
          {capabilities.canWrite && (
            <Button type="link" disabled={busy} onClick={() => void actions.edit(record.id)}>
              {t('common.edit')}
            </Button>
          )}
          {capabilities.canDelete && (
            <Popconfirm
              disabled={busy}
              title={t('bulletin.deleteConfirm')}
              onConfirm={() => void actions.remove(record)}
            >
              <Button type="link" danger disabled={busy}>
                {t('bulletin.delete')}
              </Button>
            </Popconfirm>
          )}
        </Space>
      )
    }
  ];
}
