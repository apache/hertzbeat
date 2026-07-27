/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Alert, Button, Empty, Popconfirm, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';

import type { NoticeActionCapabilities } from '../../model/notice-action-capability-model';
import type { NoticeReceiverListState } from '../model/notice-receiver-list-state';
import { noticeReceiverPageSizes, receiverTypeDefinitions, type NoticeReceiver } from '../model/notice-receiver-model';
import { noticeReceiverSettingSummary } from '../model/notice-receiver-summary';

export function NoticeReceiverResults({
  actionPolicy,
  state,
  busy,
  pageIndex,
  pageSize,
  edit,
  remove,
  onPageChange
}: {
  actionPolicy: NoticeActionCapabilities;
  state: NoticeReceiverListState;
  busy: boolean;
  pageIndex: number;
  pageSize: number;
  edit: (id: number) => void;
  remove: (record: NoticeReceiver) => void;
  onPageChange: (page: number, pageSize: number) => void;
}) {
  const { t } = useTranslation();
  if (state.kind === 'invalid' || state.kind === 'unavailable' || state.kind === 'error') {
    return <Alert type="error" showIcon message={t(`noticeReceivers.read.${state.kind}`)} />;
  }
  if (state.kind === 'ready' && state.records.length === 0) {
    return <Empty description={t('noticeReceivers.empty')} />;
  }
  const records = state.kind === 'ready' ? state.records : [];
  return (
    <Table<NoticeReceiver>
      rowKey="id"
      size="small"
      loading={state.kind === 'loading'}
      dataSource={records}
      columns={receiverColumns({ t, actionPolicy, busy, edit, remove })}
      scroll={{ x: 1060 }}
      pagination={{
        current: pageIndex + 1,
        pageSize,
        pageSizeOptions: [...noticeReceiverPageSizes],
        showSizeChanger: true,
        disabled: busy,
        ...(state.kind === 'ready' ? { total: state.total } : {}),
        onChange: onPageChange
      }}
    />
  );
}

type ReceiverColumnOptions = {
  t: TFunction;
  actionPolicy: NoticeActionCapabilities;
  busy: boolean;
  edit: (id: number) => void;
  remove: (record: NoticeReceiver) => void;
};

function receiverColumns({ t, actionPolicy, busy, edit, remove }: ReceiverColumnOptions): ColumnsType<NoticeReceiver> {
  const columns: ColumnsType<NoticeReceiver> = [
    { title: t('noticeReceivers.name'), dataIndex: 'name', width: 240 },
    {
      title: t('noticeReceivers.type'),
      width: 180,
      render: (_value, receiver) => <Tag>{receiverTypeLabel(t, receiver)}</Tag>
    },
    {
      title: t('noticeReceivers.setting'),
      width: 300,
      render: (_value, receiver) => {
        const summary = noticeReceiverSettingSummary(receiver);
        return summary.kind === 'configured' ? (
          <Tag>{t('noticeReceivers.configured')}</Tag>
        ) : (
          <Typography.Text>{summary.value}</Typography.Text>
        );
      }
    },
    { title: t('noticeReceivers.updated'), width: 190, render: (_value, receiver) => formatReceiverTime(receiver) }
  ];
  if (!hasNoticeReceiverRowActions(actionPolicy)) return columns;
  return [
    ...columns,
    {
      title: t('common.actions'),
      width: 150,
      render: (_value, receiver) => (
        <Space>
          {actionPolicy.canEdit ? (
            <Button type="link" disabled={busy} onClick={() => edit(receiver.id)}>
              {t('common.edit')}
            </Button>
          ) : null}
          {actionPolicy.canDelete ? (
            <Popconfirm
              disabled={busy}
              title={t('noticeReceivers.deleteConfirm')}
              okButtonProps={{ disabled: busy }}
              onConfirm={() => {
                if (!busy) remove(receiver);
              }}
            >
              <Button type="link" danger disabled={busy}>
                {t('noticeReceivers.delete')}
              </Button>
            </Popconfirm>
          ) : null}
        </Space>
      )
    }
  ];
}

function receiverTypeLabel(t: TFunction, receiver: NoticeReceiver) {
  return t(
    receiverTypeDefinitions.find(definition => definition.type === receiver.type)?.labelKey ??
      'noticeReceivers.types.unknown'
  );
}

function formatReceiverTime(receiver: NoticeReceiver) {
  const value = receiver.gmtUpdate ?? receiver.gmtCreate;
  if (!value) return '—';
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return '—';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'medium' }).format(timestamp);
}

function hasNoticeReceiverRowActions(capabilities: NoticeActionCapabilities) {
  return capabilities.canEdit || capabilities.canDelete;
}
