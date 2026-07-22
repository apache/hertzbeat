/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Button, Pagination, Space, Switch, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';

import type { PluginPageSize, PluginQuery, PluginRecord } from '../model/plugin-model';

export function PluginList(props: {
  records: PluginRecord[];
  total: number;
  query: PluginQuery;
  pageSizes: readonly PluginPageSize[];
  selectedIds: number[];
  canWrite: boolean;
  busy: boolean;
  onSelected: (ids: number[]) => void;
  onPage: (pageIndex: number, pageSize: PluginPageSize) => void;
  onToggle: (plugin: PluginRecord) => void;
  onDelete: (plugin: PluginRecord) => void;
}) {
  const { t } = useTranslation();
  return (
    <div>
      <Table
        rowKey="id"
        dataSource={props.records}
        columns={columns(props, t)}
        pagination={false}
        rowSelection={{
          selectedRowKeys: props.selectedIds,
          onChange: keys => props.onSelected(keys.map(Number)),
          getCheckboxProps: () => ({ disabled: !props.canWrite || props.busy })
        }}
      />
      <Pagination
        current={props.query.pageIndex + 1}
        pageSize={props.query.pageSize}
        pageSizeOptions={[...props.pageSizes]}
        total={props.total}
        showSizeChanger
        onChange={(page, size) => props.onPage(page - 1, size as PluginPageSize)}
      />
    </div>
  );
}

function columns(props: Parameters<typeof PluginList>[0], t: TFunction): ColumnsType<PluginRecord> {
  return [
    { title: t('plugins.name'), dataIndex: 'name', key: 'name' },
    {
      title: t('plugins.status'),
      key: 'status',
      render: (_, plugin) => (
        <Space>
          <Switch
            checked={plugin.enableStatus}
            disabled={!props.canWrite || props.busy}
            aria-label={t('plugins.toggle', { name: plugin.name })}
            onChange={() => props.onToggle(plugin)}
          />
          <Tag color={plugin.enableStatus ? 'success' : 'default'}>
            {t(plugin.enableStatus ? 'plugins.enabled' : 'plugins.disabled')}
          </Tag>
        </Space>
      )
    },
    {
      title: t('plugins.creator'),
      dataIndex: 'creator',
      key: 'creator',
      render: (value: string | undefined) => value || '—'
    },
    {
      title: t('plugins.created'),
      dataIndex: 'gmtCreate',
      key: 'gmtCreate',
      render: (value: string | undefined) => value || '—'
    },
    {
      title: t('plugins.paramCount'),
      dataIndex: 'paramCount',
      key: 'paramCount',
      render: (value: number | undefined) => value ?? t('plugins.unknown')
    },
    {
      title: t('common.actions'),
      key: 'actions',
      render: (_, plugin) => (
        <Button danger disabled={!props.canWrite || props.busy} onClick={() => props.onDelete(plugin)}>
          {t('common.delete')}
        </Button>
      )
    }
  ];
}
