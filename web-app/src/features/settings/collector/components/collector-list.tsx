/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Button, Checkbox, Pagination, Space, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { TFunction } from 'i18next';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { OperationalStatePanel } from '@/shared/operational-page';

import type { CollectorListState, CollectorMutationAction, CollectorRecord } from '../model/collector-model';
import { collectorPageSizes, type CollectorPageSize, type CollectorQuery } from '../model/collector-query-model';
import { CollectorDetailsDrawer } from './collector-details-drawer';
import { CollectorKindTag } from './collector-kind-tag';
import { CollectorRowActions } from './collector-row-actions';

type Props = {
  canWrite: boolean;
  canDelete: boolean;
  state: CollectorListState;
  query: CollectorQuery;
  selected: string[];
  busy: boolean;
  onPage: (pageIndex: number, pageSize: CollectorPageSize) => void;
  onSelect: (name: string, checked: boolean) => void;
  onSelectAll: (checked: boolean) => void;
  onAction: (action: CollectorMutationAction, collectors: string[]) => void;
  onIntake: (name: string) => void;
  onRuntime: (name: string) => void;
};

export function CollectorList(props: Props) {
  const { t } = useTranslation();
  const [detailsName, setDetailsName] = useState<string | null>(null);
  if (props.state.kind === 'loading') {
    return <OperationalStatePanel kind="loading" title={t('collectors.loading')} />;
  }
  if (props.state.kind === 'empty') {
    return <OperationalStatePanel kind="empty" title={t('collectors.empty')} />;
  }
  if (props.state.kind === 'unavailable') {
    return <OperationalStatePanel kind="unavailable" title={t('collectors.unavailable')} />;
  }
  if (props.state.kind === 'permission') {
    return <OperationalStatePanel kind="permission" title={t('common.permission.roleRequiredDescription')} />;
  }
  if (props.state.kind === 'error') {
    return <OperationalStatePanel kind="error" title={t('common.routeError.description')} />;
  }
  const records = props.state.records;
  const detailsRecord = records.find(record => record.name === detailsName) ?? null;
  const detailsIndex = detailsRecord ? records.findIndex(record => record.name === detailsRecord.name) : -1;
  const columns = collectorColumns(props, t, setDetailsName);
  return (
    <div>
      <Table
        rowKey="name"
        columns={columns}
        dataSource={records}
        loading={props.busy}
        pagination={false}
        scroll={{ x: 920 }}
      />
      <Pagination
        current={props.query.pageIndex + 1}
        pageSize={props.query.pageSize}
        pageSizeOptions={[...collectorPageSizes]}
        total={props.state.total}
        showSizeChanger
        onChange={(page, pageSize) => {
          setDetailsName(null);
          props.onPage(page - 1, pageSize as CollectorPageSize);
        }}
      />
      <CollectorDetailsDrawer
        canWrite={props.canWrite}
        canDelete={props.canDelete}
        busy={props.busy}
        record={detailsRecord}
        position={detailsIndex + 1}
        total={records.length}
        onAction={props.onAction}
        onIntake={props.onIntake}
        onRuntime={props.onRuntime}
        onPrevious={() => setDetailsName(records[detailsIndex - 1]?.name ?? detailsName)}
        onNext={() => setDetailsName(records[detailsIndex + 1]?.name ?? detailsName)}
        onClose={() => setDetailsName(null)}
      />
    </div>
  );
}

function collectorColumns(props: Props, t: TFunction, onDetails: (name: string) => void): ColumnsType<CollectorRecord> {
  const selectable = props.canWrite || props.canDelete;
  return [...(selectable ? selectionColumns(props, t) : []), ...coreFactColumns(t), actionColumn(props, t, onDetails)];
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

function coreFactColumns(t: TFunction): ColumnsType<CollectorRecord> {
  return [
    { title: t('collectors.name'), dataIndex: 'name', key: 'name', width: 180, ellipsis: true },
    {
      title: t('collectors.kind.column'),
      key: 'kind',
      width: 150,
      render: (_, record) => <CollectorKindTag record={record} />
    },
    {
      title: t('collectors.status'),
      key: 'status',
      width: 100,
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
      width: 100,
      render: (value: string | null) => value || '—'
    },
    {
      title: t('collectors.tasks'),
      key: 'tasks',
      width: 80,
      render: (_, record) => record.pinMonitorNum + record.dispatchMonitorNum
    }
  ];
}

function actionColumn(
  props: Props,
  t: TFunction,
  onDetails: (name: string) => void
): ColumnsType<CollectorRecord>[number] {
  return {
    title: t('common.actions'),
    key: 'actions',
    fixed: 'right',
    width: 260,
    render: (_, record) => (
      <Space size={4} wrap>
        <Button
          size="small"
          aria-label={t('collectors.details.actionNamed', { name: record.name })}
          onClick={() => onDetails(record.name)}
        >
          {t('collectors.details.action')}
        </Button>
        <CollectorRowActions
          canWrite={props.canWrite}
          canDelete={props.canDelete}
          busy={props.busy}
          showConfiguration={false}
          onAction={props.onAction}
          onIntake={props.onIntake}
          onRuntime={props.onRuntime}
          record={record}
          t={t}
        />
      </Space>
    )
  };
}
