/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Button, Checkbox, Empty, Pagination, Skeleton, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';

import type { CollectorListState, CollectorMutationAction, CollectorRecord } from '../model/collector-model';
import { collectorPageSizes, type CollectorPageSize, type CollectorQuery } from '../model/collector-query-model';

type Props = {
  state: CollectorListState;
  query: CollectorQuery;
  selected: string[];
  busy: boolean;
  onPage: (pageIndex: number, pageSize: CollectorPageSize) => void;
  onSelect: (name: string, checked: boolean) => void;
  onSelectAll: (checked: boolean) => void;
  onAction: (action: CollectorMutationAction, collectors: string[]) => void;
};

export function CollectorList(props: Props) {
  const { t } = useTranslation();
  if (props.state.kind === 'loading') {
    return (
      <div data-testid="collector-loading">
        <Skeleton active />
      </div>
    );
  }
  if (props.state.kind === 'empty') {
    return <Empty description={t('collectors.empty')} />;
  }
  if (props.state.kind === 'unavailable') {
    return <StateMessage title={t('collectors.unavailable')} />;
  }
  if (props.state.kind === 'error') {
    return <StateMessage title={t('common.routeError.description')} />;
  }
  const columns = collectorColumns(props, t);
  return (
    <div>
      <Table
        rowKey="name"
        columns={columns}
        dataSource={props.state.records}
        loading={props.busy}
        pagination={false}
        scroll={{ x: 1120 }}
      />
      <Pagination
        current={props.query.pageIndex + 1}
        pageSize={props.query.pageSize}
        pageSizeOptions={[...collectorPageSizes]}
        total={props.state.total}
        showSizeChanger
        onChange={(page, pageSize) => props.onPage(page - 1, pageSize as CollectorPageSize)}
      />
    </div>
  );
}

function collectorColumns(props: Props, t: TFunction): ColumnsType<CollectorRecord> {
  return [...selectionColumns(props, t), ...factColumns(t), actionColumn(props, t)];
}

function selectionColumns(props: Props, t: TFunction): ColumnsType<CollectorRecord> {
  const records = props.state.kind === 'ready' ? props.state.records : [];
  const mutable = records.filter(record => !record.immutable);
  const allSelected = mutable.length > 0 && mutable.every(record => props.selected.includes(record.name));
  const someSelected = mutable.some(record => props.selected.includes(record.name));
  return [
    {
      key: 'select',
      width: 48,
      title: (
        <Checkbox
          aria-label={t('collectors.selectAll')}
          checked={allSelected}
          indeterminate={!allSelected && someSelected}
          disabled={props.busy || mutable.length === 0}
          onChange={event => props.onSelectAll(event.target.checked)}
        />
      ),
      render: (_, record) => (
        <Checkbox
          aria-label={t('collectors.select', { name: record.name })}
          checked={props.selected.includes(record.name)}
          disabled={props.busy || record.immutable}
          onChange={event => props.onSelect(record.name, event.target.checked)}
        />
      )
    }
  ];
}

function factColumns(t: TFunction): ColumnsType<CollectorRecord> {
  return [
    { title: t('collectors.name'), dataIndex: 'name', key: 'name' },
    {
      title: t('collectors.status'),
      key: 'status',
      render: (_, record) => (
        <Tag color={record.online ? 'success' : 'error'}>
          {t(record.online ? 'collectors.online' : 'collectors.offline')}
        </Tag>
      )
    },
    {
      title: t('collectors.mode'),
      dataIndex: 'mode',
      key: 'mode',
      render: (value: string | null) => value || '—'
    },
    {
      title: t('collectors.tasks'),
      key: 'tasks',
      render: (_, record) => record.pinMonitorNum + record.dispatchMonitorNum
    },
    { title: t('collectors.pinned'), dataIndex: 'pinMonitorNum', key: 'pinned' },
    { title: t('collectors.dispatched'), dataIndex: 'dispatchMonitorNum', key: 'dispatched' },
    { title: t('collectors.address'), dataIndex: 'address', key: 'address' },
    {
      title: t('collectors.version'),
      dataIndex: 'version',
      key: 'version',
      render: (value: string | null) => value || '—'
    }
  ];
}

function actionColumn(props: Props, t: TFunction): ColumnsType<CollectorRecord>[number] {
  return {
    title: t('common.actions'),
    key: 'actions',
    fixed: 'right',
    render: (_, record) =>
      record.immutable ? (
        <Typography.Text type="secondary">{t('collectors.protected')}</Typography.Text>
      ) : (
        <div className="collector-row-actions">
          <Button
            size="small"
            disabled={props.busy}
            aria-label={t(record.online ? 'collectors.takeOfflineNamed' : 'collectors.takeOnlineNamed', {
              name: record.name
            })}
            onClick={() => props.onAction(record.online ? 'offline' : 'online', [record.name])}
          >
            {t(record.online ? 'collectors.takeOffline' : 'collectors.takeOnline')}
          </Button>
          <Button
            size="small"
            danger
            disabled={props.busy}
            aria-label={t('collectors.deleteNamed', { name: record.name })}
            onClick={() => props.onAction('delete', [record.name])}
          >
            {t('collectors.delete')}
          </Button>
        </div>
      )
  };
}

function StateMessage({ title }: { title: string }) {
  return <Empty description={title} />;
}
