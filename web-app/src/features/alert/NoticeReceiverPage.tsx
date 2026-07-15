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

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, App, Button, Empty, Input, Popconfirm, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { TFunction } from 'i18next';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';

import type { PageResult } from '@/core/http/api-message';
import { SettingsNav } from '@/shared/settings/settings-nav';

import { deleteNoticeReceiver, loadNoticeReceiver, loadNoticeReceivers, saveNoticeReceiver, testNoticeReceiver } from './notice-receiver-api';
import {
  createNoticeReceiverDraft,
  noticeReceiverDraftFromDetail,
  noticeReceiverPageSizes,
  noticeReceiverSettingSummary,
  readNoticeReceiverQuery,
  receiverTypeDefinitions,
  validateNoticeReceiverDraft,
  writeNoticeReceiverQuery,
  type NoticeReceiver,
  type NoticeReceiverDraft
} from './notice-receiver-model';
import styles from './AlertPolicyPage.module.css';
import { NoticeReceiverEditor } from './NoticeReceiverEditor';

function formatReceiverTime(receiver: NoticeReceiver) {
  const value = receiver.gmtUpdate ?? receiver.gmtCreate;
  if (value == null) return '—';
  const timestamp = typeof value === 'number' ? value : Date.parse(value);
  if (!Number.isFinite(timestamp)) return '—';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'medium' }).format(timestamp);
}

function receiverTypeLabel(t: TFunction, receiver: NoticeReceiver) {
  return t(receiverTypeDefinitions.find(definition => definition.type === receiver.type)?.labelKey ?? 'noticeReceivers.types.unknown');
}

function receiverSetting(t: TFunction, receiver: NoticeReceiver) {
  const summary = noticeReceiverSettingSummary(receiver);
  return summary.kind === 'configured' ? <Tag>{t('noticeReceivers.configured')}</Tag> : <Typography.Text>{summary.value}</Typography.Text>;
}

function receiverColumns(t: TFunction, edit: (id: number) => void, remove: (id: number) => void): ColumnsType<NoticeReceiver> {
  return [
    { title: t('noticeReceivers.name'), dataIndex: 'name', width: 240 },
    { title: t('noticeReceivers.type'), width: 180, render: (_value, receiver) => <Tag color="processing">{receiverTypeLabel(t, receiver)}</Tag> },
    { title: t('noticeReceivers.setting'), width: 300, render: (_value, receiver) => receiverSetting(t, receiver) },
    { title: t('noticeReceivers.updated'), width: 190, render: (_value, receiver) => formatReceiverTime(receiver) },
    {
      title: t('common.actions'),
      width: 150,
      render: (_value, receiver) => (
        <Space>
          <Button type="link" onClick={() => edit(receiver.id)}>{t('common.edit')}</Button>
          <Popconfirm title={t('noticeReceivers.deleteConfirm')} onConfirm={() => remove(receiver.id)}>
            <Button type="link" danger>{t('noticeReceivers.delete')}</Button>
          </Popconfirm>
        </Space>
      )
    }
  ];
}

function NoticeReceiverResults({ data, pending, failed, columns, pageIndex, pageSize, onPageChange }: {
  data: PageResult<NoticeReceiver> | undefined;
  pending: boolean;
  failed: boolean;
  columns: ColumnsType<NoticeReceiver>;
  pageIndex: number;
  pageSize: number;
  onPageChange: (page: number, pageSize: number) => void;
}) {
  const { t } = useTranslation();
  if (failed) return <Alert type="error" showIcon message={t('common.unavailable')} />;
  if (!pending && (data?.content.length ?? 0) === 0) return <Empty description={t('noticeReceivers.empty')} />;
  return <Table<NoticeReceiver> rowKey="id" size="small" loading={pending} dataSource={data?.content ?? []} columns={columns} scroll={{ x: 1060 }} pagination={{ current: pageIndex + 1, pageSize, pageSizeOptions: [...noticeReceiverPageSizes], showSizeChanger: true, total: data?.totalElements ?? 0, onChange: onPageChange }} />;
}

export function NoticeReceiverPage() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const query = readNoticeReceiverQuery(params);
  const [name, setName] = useState(query.name);
  const [draft, setDraft] = useState<NoticeReceiverDraft | null>(null);
  const receivers = useQuery({ queryKey: ['notice-receivers', query], queryFn: () => loadNoticeReceivers(query) });
  const edit = useMutation({ mutationFn: loadNoticeReceiver, onSuccess: receiver => setDraft(noticeReceiverDraftFromDetail(receiver)), onError: () => void message.error(t('noticeReceivers.loadFailed')) });
  const save = useMutation({ mutationFn: saveNoticeReceiver, onSuccess: () => { setDraft(null); void queryClient.invalidateQueries({ queryKey: ['notice-receivers'] }); void message.success(t('noticeReceivers.saveSuccess')); }, onError: () => void message.error(t('noticeReceivers.saveFailed')) });
  const test = useMutation({ mutationFn: testNoticeReceiver, onSuccess: () => void message.success(t('noticeReceivers.testSuccess')), onError: () => void message.error(t('noticeReceivers.testFailed')) });
  const remove = useMutation({ mutationFn: deleteNoticeReceiver, onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['notice-receivers'] }); void message.success(t('noticeReceivers.deleteSuccess')); }, onError: () => void message.error(t('noticeReceivers.deleteFailed')) });
  const updateQuery = (patch: Partial<typeof query>) => setParams(writeNoticeReceiverQuery({ ...query, ...patch }));
  const submit = (action: 'save' | 'test') => {
    if (!draft || validateNoticeReceiverDraft(draft).length > 0) {
      void message.warning(t('noticeReceivers.validation'));
      return;
    }
    if (action === 'save') save.mutate(draft);
    else test.mutate(draft);
  };
  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div><Typography.Title level={2}>{t('noticeReceivers.title')}</Typography.Title><Typography.Text type="secondary">{t('noticeReceivers.description')}</Typography.Text></div>
        <Button type="primary" onClick={() => setDraft(createNoticeReceiverDraft())}>{t('noticeReceivers.new')}</Button>
      </header>
      <SettingsNav />
      <div className={styles.toolbar}>
        <Input allowClear value={name} placeholder={t('noticeReceivers.search')} onChange={event => setName(event.target.value)} onPressEnter={() => updateQuery({ name: name.trim(), pageIndex: 0 })} />
        <Button type="primary" onClick={() => updateQuery({ name: name.trim(), pageIndex: 0 })}>{t('common.query')}</Button>
        <Button onClick={() => void receivers.refetch()}>{t('common.refresh')}</Button>
      </div>
      <NoticeReceiverResults data={receivers.data} pending={receivers.isPending} failed={receivers.isError} columns={receiverColumns(t, id => edit.mutate(id), id => remove.mutate(id))} pageIndex={query.pageIndex} pageSize={query.pageSize} onPageChange={(page, pageSize) => updateQuery({ pageIndex: page - 1, pageSize })} />
      {draft && <NoticeReceiverEditor draft={draft} saving={save.isPending} testing={test.isPending} update={patch => setDraft(current => current ? { ...current, ...patch } : current)} close={() => setDraft(null)} submit={() => submit('save')} test={() => submit('test')} />}
    </div>
  );
}
