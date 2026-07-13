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
import { Alert, App, Button, Drawer, Empty, Input, Popconfirm, Select, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { TFunction } from 'i18next';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';

import type { PageResult } from '@/core/http/api-message';

import { AlertManagementNav } from './AlertManagementNav';
import { AlertNotificationNav } from './AlertNotificationNav';
import styles from './AlertPolicyPage.module.css';
import editorStyles from './NoticeTemplateEditor.module.css';
import { NoticeTemplateEditor } from './NoticeTemplateEditor';
import pageStyles from './NoticeTemplatePage.module.css';
import { receiverTypeDefinitions } from './notice-receiver-model';
import { deleteNoticeTemplate, loadNoticeTemplate, loadNoticeTemplates, saveNoticeTemplate } from './notice-template-api';
import {
  createNoticeTemplateDraft,
  isNoticeTemplateReadOnly,
  noticeTemplateDraftFromDetail,
  noticeTemplatePageSizes,
  readNoticeTemplateQuery,
  validateNoticeTemplateDraft,
  writeNoticeTemplateQuery,
  type NoticeTemplate,
  type NoticeTemplateDraft
} from './notice-template-model';

function formatTemplateTime(template: NoticeTemplate) {
  const value = template.gmtUpdate ?? template.gmtCreate;
  if (value == null) return '—';
  const timestamp = typeof value === 'number' ? value : Date.parse(value);
  return Number.isFinite(timestamp)
    ? new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'medium' }).format(timestamp)
    : '—';
}

function templateTypeLabel(t: TFunction, template: NoticeTemplate) {
  return t(receiverTypeDefinitions.find(definition => definition.type === template.type)?.labelKey ?? 'noticeReceivers.types.unknown');
}

function templateColumns(t: TFunction, view: (template: NoticeTemplate) => void, edit: (id: number) => void, remove: (id: number) => void): ColumnsType<NoticeTemplate> {
  return [
    { title: t('noticeTemplates.name'), dataIndex: 'name', width: 260 },
    { title: t('noticeTemplates.type'), width: 180, render: (_value, template) => <Tag color="processing">{templateTypeLabel(t, template)}</Tag> },
    { title: t('noticeTemplates.source'), width: 150, render: (_value, template) => <Tag>{t(template.preset ? 'noticeTemplates.preset' : 'noticeTemplates.custom')}</Tag> },
    { title: t('noticeTemplates.updated'), width: 190, render: (_value, template) => formatTemplateTime(template) },
    {
      title: t('common.actions'),
      width: 160,
      render: (_value, template) => isNoticeTemplateReadOnly(template) ? (
        <Button type="link" onClick={() => view(template)}>{t('common.view')}</Button>
      ) : (
        <Space>
          <Button type="link" onClick={() => edit(template.id!)}>{t('common.edit')}</Button>
          <Popconfirm title={t('noticeTemplates.deleteConfirm')} onConfirm={() => remove(template.id!)}>
            <Button type="link" danger>{t('noticeTemplates.delete')}</Button>
          </Popconfirm>
        </Space>
      )
    }
  ];
}

function NoticeTemplateResults({ data, pending, failed, columns, pageIndex, pageSize, onPageChange }: {
  data: PageResult<NoticeTemplate> | undefined;
  pending: boolean;
  failed: boolean;
  columns: ColumnsType<NoticeTemplate>;
  pageIndex: number;
  pageSize: number;
  onPageChange: (page: number, pageSize: number) => void;
}) {
  const { t } = useTranslation();
  if (failed) return <Alert type="error" showIcon message={t('common.unavailable')} />;
  if (!pending && (data?.content.length ?? 0) === 0) return <Empty description={t('noticeTemplates.empty')} />;
  return <Table<NoticeTemplate> rowKey={template => String(template.id ?? `${template.type}-${template.name}`)} size="small" loading={pending} dataSource={data?.content ?? []} columns={columns} scroll={{ x: 940 }} pagination={{ current: pageIndex + 1, pageSize, pageSizeOptions: [...noticeTemplatePageSizes], showSizeChanger: true, total: data?.totalElements ?? 0, onChange: onPageChange }} />;
}

export function NoticeTemplatePage() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const query = readNoticeTemplateQuery(params);
  const [name, setName] = useState(query.name);
  const [draft, setDraft] = useState<NoticeTemplateDraft | null>(null);
  const [preview, setPreview] = useState<NoticeTemplate | null>(null);
  const templates = useQuery({ queryKey: ['notice-templates', query], queryFn: () => loadNoticeTemplates(query) });
  const edit = useMutation({ mutationFn: loadNoticeTemplate, onSuccess: template => setDraft(noticeTemplateDraftFromDetail(template)), onError: () => void message.error(t('noticeTemplates.loadFailed')) });
  const save = useMutation({ mutationFn: saveNoticeTemplate, onSuccess: () => { setDraft(null); void queryClient.invalidateQueries({ queryKey: ['notice-templates'] }); void message.success(t('noticeTemplates.saveSuccess')); }, onError: () => void message.error(t('noticeTemplates.saveFailed')) });
  const remove = useMutation({ mutationFn: deleteNoticeTemplate, onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['notice-templates'] }); void message.success(t('noticeTemplates.deleteSuccess')); }, onError: () => void message.error(t('noticeTemplates.deleteFailed')) });
  const updateQuery = (patch: Partial<typeof query>) => setParams(writeNoticeTemplateQuery({ ...query, ...patch }));
  const submit = () => {
    if (!draft || validateNoticeTemplateDraft(draft).length > 0) {
      void message.warning(t('noticeTemplates.validation'));
      return;
    }
    save.mutate(draft);
  };
  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div><Typography.Title level={2}>{t('noticeTemplates.title')}</Typography.Title><Typography.Text type="secondary">{t('noticeTemplates.description')}</Typography.Text></div>
        <Button type="primary" onClick={() => setDraft(createNoticeTemplateDraft())}>{t('noticeTemplates.new')}</Button>
      </header>
      <AlertManagementNav />
      <AlertNotificationNav />
      <div className={pageStyles.toolbar}>
        <Select aria-label={t('noticeTemplates.source')} value={query.preset ? 'preset' : 'custom'} options={[{ value: 'preset', label: t('noticeTemplates.preset') }, { value: 'custom', label: t('noticeTemplates.custom') }]} onChange={value => updateQuery({ preset: value === 'preset', pageIndex: 0 })} />
        <Input allowClear value={name} placeholder={t('noticeTemplates.search')} onChange={event => setName(event.target.value)} onPressEnter={() => updateQuery({ name: name.trim(), pageIndex: 0 })} />
        <Button type="primary" onClick={() => updateQuery({ name: name.trim(), pageIndex: 0 })}>{t('common.query')}</Button>
        <Button onClick={() => void templates.refetch()}>{t('common.refresh')}</Button>
      </div>
      <NoticeTemplateResults data={templates.data} pending={templates.isPending} failed={templates.isError} columns={templateColumns(t, setPreview, id => edit.mutate(id), id => remove.mutate(id))} pageIndex={query.pageIndex} pageSize={query.pageSize} onPageChange={(page, pageSize) => updateQuery({ pageIndex: page - 1, pageSize })} />
      {draft && <NoticeTemplateEditor draft={draft} saving={save.isPending} update={patch => setDraft(current => current ? { ...current, ...patch } : current)} close={() => setDraft(null)} submit={submit} />}
      <Drawer width={720} open={preview != null} title={preview?.name} onClose={() => setPreview(null)}>
        {preview && <pre className={editorStyles.preview}>{preview.content}</pre>}
      </Drawer>
    </div>
  );
}
