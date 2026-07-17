/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Alert, Button, Empty, Input, Popconfirm, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';

import { SettingsNav } from '@/shared/settings/settings-nav';

import styles from '../../alert-policy-page.module.css';
import { NoticeReceiverEditor } from '../components/notice-receiver-editor';
import { useNoticeReceiverController, type NoticeReceiverListState } from '../controller/notice-receiver-controller';
import {
  noticeReceiverPageSizes,
  noticeReceiverSettingSummary,
  receiverTypeDefinitions,
  type NoticeReceiver
} from '../model/notice-receiver-model';

function formatReceiverTime(receiver: NoticeReceiver) {
  const value = receiver.gmtUpdate ?? receiver.gmtCreate;
  if (!value) return '—';
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return '—';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'medium' }).format(timestamp);
}

function receiverTypeLabel(t: TFunction, receiver: NoticeReceiver) {
  return t(receiverTypeDefinitions.find(definition => definition.type === receiver.type)?.labelKey
    ?? 'noticeReceivers.types.unknown');
}

function receiverColumns(t: TFunction, edit: (id: number) => void, remove: (record: NoticeReceiver) => void): ColumnsType<NoticeReceiver> {
  return [
    { title: t('noticeReceivers.name'), dataIndex: 'name', width: 240 },
    { title: t('noticeReceivers.type'), width: 180,
      render: (_value, receiver) => <Tag>{receiverTypeLabel(t, receiver)}</Tag> },
    { title: t('noticeReceivers.setting'), width: 300, render: (_value, receiver) => {
      const summary = noticeReceiverSettingSummary(receiver);
      return summary.kind === 'configured' ? <Tag>{t('noticeReceivers.configured')}</Tag>
        : <Typography.Text>{summary.value}</Typography.Text>;
    } },
    { title: t('noticeReceivers.updated'), width: 190, render: (_value, receiver) => formatReceiverTime(receiver) },
    { title: t('common.actions'), width: 150, render: (_value, receiver) => (
      <Space>
        <Button type="link" onClick={() => edit(receiver.id)}>{t('common.edit')}</Button>
        <Popconfirm title={t('noticeReceivers.deleteConfirm')} onConfirm={() => remove(receiver)}>
          <Button type="link" danger>{t('noticeReceivers.delete')}</Button>
        </Popconfirm>
      </Space>
    ) }
  ];
}

function NoticeReceiverResults({ state, columns, pageIndex, pageSize, onPageChange }: {
  state: NoticeReceiverListState;
  columns: ColumnsType<NoticeReceiver>;
  pageIndex: number;
  pageSize: number;
  onPageChange: (page: number, pageSize: number) => void;
}) {
  const { t } = useTranslation();
  if (state.kind === 'invalid' || state.kind === 'unavailable' || state.kind === 'error' || state.kind === 'missing') {
    return <Alert type="error" showIcon message={t(`noticeReceivers.read.${state.kind}`)} />;
  }
  if (state.kind === 'ready' && state.records.length === 0) {
    return <Empty description={t('noticeReceivers.empty')} />;
  }
  const records = state.kind === 'ready' ? state.records : [];
  return <Table<NoticeReceiver> rowKey="id" size="small" loading={state.kind === 'loading'} dataSource={records}
    columns={columns} scroll={{ x: 1060 }} pagination={{ current: pageIndex + 1, pageSize,
      pageSizeOptions: [...noticeReceiverPageSizes], showSizeChanger: true,
      total: state.kind === 'ready' ? state.total : 0, onChange: onPageChange }} />;
}

export function NoticeReceiverPage() {
  const { t } = useTranslation();
  const { state, actions } = useNoticeReceiverController();
  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div>
          <Typography.Title level={2}>{t('noticeReceivers.title')}</Typography.Title>
          <Typography.Text type="secondary">{t('noticeReceivers.description')}</Typography.Text>
        </div>
        <Button type="primary" onClick={actions.create}>{t('noticeReceivers.new')}</Button>
      </header>
      <SettingsNav />
      <div className={styles.toolbar}>
        <Input allowClear value={state.name} placeholder={t('noticeReceivers.search')}
          onChange={event => actions.setName(event.target.value)} onPressEnter={actions.search} />
        <Button type="primary" onClick={actions.search}>{t('common.query')}</Button>
        <Button loading={state.refreshing} onClick={actions.refresh}>{t('common.refresh')}</Button>
      </div>
      <NoticeReceiverResults state={state.list} columns={receiverColumns(t, id => void actions.edit(id),
        record => void actions.remove(record))} pageIndex={state.query.pageIndex} pageSize={state.query.pageSize}
        onPageChange={actions.changePage} />
      {state.draft ? <NoticeReceiverEditor draft={state.draft} saving={state.saving} testing={state.testing}
        update={actions.updateDraft} selectType={actions.selectType} setSecretCleared={actions.setSecretCleared}
        close={actions.close} submit={() => void actions.submit()} test={() => void actions.sendTest()} /> : null}
    </div>
  );
}
