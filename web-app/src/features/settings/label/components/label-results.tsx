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

import { MoreOutlined } from '@ant-design/icons';
import { Button, Dropdown, Popconfirm, Table, Tag } from 'antd';
import type { MenuProps } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { TableRowSelection } from 'antd/es/table/interface';
import type { TFunction } from 'i18next';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { OperationalStatePanel } from '@/shared/operational-page';
import { pageSelectionLabels, pageSelectionTitleCheckboxProps } from '@/shared/table-selection';

import { buildLabelDisplayName, labelTypeKey, type LabelListState, type LabelRecord } from '../model/label-model';
import { isLabelPageSize, labelPageSizes, type LabelPageSize } from '../model/label-query-model';
import styles from './label.module.css';

type LabelResultActions = {
  onCopy: (label: LabelRecord) => void;
  onEdit: (label: LabelRecord) => void;
  onRemove: (record: LabelRecord) => void;
  onInspect: (label: LabelRecord) => void;
};

type LabelResultsProps = LabelResultActions & {
  busy: boolean;
  canDelete: boolean;
  canUpdate: boolean;
  writeLocked: boolean;
  state: LabelListState;
  pageIndex: number;
  pageSize: LabelPageSize;
  onPageChange: (pageIndex: number, pageSize: LabelPageSize) => void;
  selectedIds: number[];
  onSelectionChange: (ids: number[]) => void;
};

export function LabelResults(props: LabelResultsProps) {
  const { t } = useTranslation();
  if (props.state.kind === 'loading') return <OperationalStatePanel kind="loading" title={t('labels.loading')} />;
  if (props.state.kind === 'permission')
    return <OperationalStatePanel kind="permission" title={t('labels.permission')} />;
  if (props.state.kind === 'unavailable')
    return <OperationalStatePanel kind="unavailable" title={t('labels.unavailable')} />;
  if (props.state.kind === 'error')
    return <OperationalStatePanel kind="error" title={t('common.routeError.description')} />;
  if (props.state.kind === 'empty') return <OperationalStatePanel kind="empty" title={t('labels.empty')} />;

  const rowSelection = createRowSelection(props, t);
  return (
    <Table<LabelRecord>
      rowKey="id"
      size="small"
      columns={createLabelColumns(t, props)}
      dataSource={props.state.records}
      {...(rowSelection ? { rowSelection } : {})}
      scroll={{ x: props.canDelete ? 872 : 824 }}
      pagination={{
        disabled: props.busy,
        current: props.pageIndex + 1,
        pageSize: props.pageSize,
        pageSizeOptions: [...labelPageSizes],
        showSizeChanger: true,
        total: props.state.total,
        onChange: (page, pageSize) => {
          if (isLabelPageSize(pageSize)) props.onPageChange(page - 1, pageSize);
        }
      }}
    />
  );
}

function createRowSelection(props: LabelResultsProps, t: TFunction): TableRowSelection<LabelRecord> | undefined {
  if (!props.canDelete) return undefined;
  return {
    preserveSelectedRowKeys: false,
    selectedRowKeys: props.selectedIds,
    getTitleCheckboxProps: () =>
      pageSelectionTitleCheckboxProps(
        props.selectedIds,
        props.state.kind === 'ready' ? props.state.records.map(record => record.id) : [],
        pageSelectionLabels(t)
      ),
    getCheckboxProps: () => ({ 'aria-label': t('labels.selectRow'), disabled: props.busy || props.writeLocked }),
    onChange: keys => props.onSelectionChange(keys.filter((key): key is number => typeof key === 'number'))
  };
}

function createLabelColumns(t: TFunction, actions: LabelResultsProps): ColumnsType<LabelRecord> {
  return [
    {
      title: t('labels.label'),
      width: 200,
      render: (_value, row) => (
        <Button type="link" className={styles.labelLink ?? ''} onClick={() => actions.onInspect(row)}>
          <Tag>{buildLabelDisplayName(row)}</Tag>
        </Button>
      )
    },
    {
      title: t('labels.descriptionLabel'),
      dataIndex: 'description',
      width: 260,
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
      render: (value: string | undefined, row) => formatTime(value ?? row.gmtCreate)
    },
    {
      title: t('common.actions'),
      align: 'center',
      fixed: 'right',
      width: 64,
      render: (_value, row) => <LabelRowActions t={t} row={row} actions={actions} />
    }
  ];
}

function LabelRowActions({ t, row, actions }: { t: TFunction; row: LabelRecord; actions: LabelResultsProps }) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const editDisabled = !actions.canUpdate || actions.writeLocked;
  const deleteDisabled = !actions.canDelete || actions.writeLocked;
  const items: MenuProps['items'] = [
    { key: 'copy', label: t('labels.copy') },
    { key: 'edit', label: t('common.edit'), disabled: editDisabled },
    { type: 'divider' },
    { key: 'delete', label: t('labels.delete'), danger: true, disabled: deleteDisabled }
  ];
  return (
    <Popconfirm
      open={deleteOpen}
      title={t('labels.deleteConfirm')}
      okButtonProps={{ danger: true, disabled: deleteDisabled }}
      onCancel={() => setDeleteOpen(false)}
      onConfirm={() => {
        if (!deleteDisabled) actions.onRemove(row);
        setDeleteOpen(false);
      }}
      onOpenChange={open => {
        if (!open) setDeleteOpen(false);
      }}
    >
      <Dropdown
        trigger={['click']}
        placement="bottomRight"
        menu={{
          items,
          onClick: ({ key }) => {
            if (key === 'copy') actions.onCopy(row);
            if (key === 'edit' && !editDisabled) actions.onEdit(row);
            if (key === 'delete' && !deleteDisabled) setDeleteOpen(true);
          }
        }}
      >
        <Button
          type="text"
          size="small"
          className={styles.actionTrigger ?? ''}
          aria-label={t('common.actions')}
          icon={<MoreOutlined aria-hidden="true" />}
        />
      </Dropdown>
    </Popconfirm>
  );
}

function formatTime(value?: string) {
  if (value == null) return '—';
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return '—';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'short' }).format(timestamp);
}
