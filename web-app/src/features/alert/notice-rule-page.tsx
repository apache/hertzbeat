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
import { Alert, App, Button, Empty, Input, Popconfirm, Space, Switch, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { TFunction } from 'i18next';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';

import type { PageResult } from '@/core/http/api-message';
import { SettingsNav } from '@/shared/settings/settings-nav';

import styles from './alert-policy-page.module.css';
import { NoticeRuleEditor } from './notice-rule-editor';
import {
  deleteNoticeRule,
  loadAllNoticeReceivers,
  loadAllNoticeTemplates,
  loadNoticeRule,
  loadNoticeRules,
  saveNoticeRule
} from './notice-rule-api';
import {
  createNoticeRuleDraft,
  noticeRuleDraftFromDetail,
  noticeRulePageSizes,
  readNoticeRuleQuery,
  validateNoticeRuleDraft,
  writeNoticeRuleQuery,
  type NoticeRule,
  type NoticeRuleDraft
} from './notice-rule-model';

function formatRuleTime(rule: NoticeRule) {
  const value = rule.gmtUpdate ?? rule.gmtCreate;
  if (value == null) return '—';
  const timestamp = typeof value === 'number' ? value : Date.parse(value);
  return Number.isFinite(timestamp)
    ? new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'medium' }).format(timestamp)
    : '—';
}

function scheduleText(t: TFunction, rule: NoticeRule) {
  const days = rule.days?.length && rule.days.length < 7 ? t('noticeRules.selectedDays', { count: rule.days.length }) : t('noticeRules.everyDay');
  if (!rule.periodStart || !rule.periodEnd) return days;
  const draft = noticeRuleDraftFromDetail(rule);
  return `${days} · ${draft.periodStart}-${draft.periodEnd}`;
}

function ruleColumns(t: TFunction, saving: boolean, edit: (id: number) => void, update: (rule: NoticeRule, patch: Partial<NoticeRuleDraft>) => void, remove: (id: number) => void): ColumnsType<NoticeRule> {
  return [
    { title: t('noticeRules.name'), dataIndex: 'name', width: 210 },
    { title: t('noticeRules.receivers'), width: 260, render: (_value, rule) => <div className={styles.labels}>{rule.receiverName?.map((name, index) => <Tag key={`${rule.receiverId[index] ?? index}-${name}`}>{name}</Tag>)}</div> },
    { title: t('noticeRules.template'), width: 180, render: (_value, rule) => rule.templateId == null ? <Tag>{t('noticeRules.defaultTemplate')}</Tag> : rule.templateName || '—' },
    { title: t('noticeRules.scope'), width: 150, render: (_value, rule) => <Tag color={rule.filterAll ? 'processing' : 'default'}>{t(rule.filterAll ? 'noticeRules.allAlerts' : 'noticeRules.filtered')}</Tag> },
    { title: t('noticeRules.schedule'), width: 210, render: (_value, rule) => scheduleText(t, rule) },
    { title: t('noticeRules.enabled'), width: 100, render: (_value, rule) => <Switch checked={rule.enable} loading={saving} onChange={enable => update(rule, { enable })} /> },
    { title: t('noticeRules.updated'), width: 190, render: (_value, rule) => formatRuleTime(rule) },
    {
      title: t('common.actions'),
      width: 160,
      fixed: 'right',
      render: (_value, rule) => (
        <Space>
          <Button type="link" onClick={() => edit(rule.id)}>{t('common.edit')}</Button>
          <Popconfirm title={t('noticeRules.deleteConfirm')} onConfirm={() => remove(rule.id)}>
            <Button type="link" danger>{t('noticeRules.delete')}</Button>
          </Popconfirm>
        </Space>
      )
    }
  ];
}

function NoticeRuleResults({ data, pending, failed, columns, pageIndex, pageSize, onPageChange }: {
  data: PageResult<NoticeRule> | undefined;
  pending: boolean;
  failed: boolean;
  columns: ColumnsType<NoticeRule>;
  pageIndex: number;
  pageSize: number;
  onPageChange: (page: number, pageSize: number) => void;
}) {
  const { t } = useTranslation();
  if (failed) return <Alert type="error" showIcon message={t('common.unavailable')} />;
  if (!pending && (data?.content.length ?? 0) === 0) return <Empty description={t('noticeRules.empty')} />;
  return <Table<NoticeRule> rowKey="id" size="small" loading={pending} dataSource={data?.content ?? []} columns={columns} scroll={{ x: 1460 }} pagination={{ current: pageIndex + 1, pageSize, pageSizeOptions: [...noticeRulePageSizes], showSizeChanger: true, total: data?.totalElements ?? 0, onChange: onPageChange }} />;
}

export function NoticeRulePage() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const query = readNoticeRuleQuery(params);
  const [name, setName] = useState(query.name);
  const [draft, setDraft] = useState<NoticeRuleDraft | null>(null);
  const rules = useQuery({ queryKey: ['notice-rules', query], queryFn: () => loadNoticeRules(query) });
  const receivers = useQuery({ queryKey: ['notice-receivers', 'all'], queryFn: loadAllNoticeReceivers, staleTime: 30_000 });
  const templates = useQuery({ queryKey: ['notice-templates', 'all'], queryFn: loadAllNoticeTemplates, staleTime: 30_000 });
  const edit = useMutation({ mutationFn: loadNoticeRule, onSuccess: rule => setDraft(noticeRuleDraftFromDetail(rule)), onError: () => void message.error(t('noticeRules.loadFailed')) });
  const save = useMutation({ mutationFn: (nextDraft: NoticeRuleDraft) => saveNoticeRule(nextDraft, receivers.data ?? [], templates.data ?? []), onSuccess: () => { setDraft(null); void queryClient.invalidateQueries({ queryKey: ['notice-rules'] }); void message.success(t('noticeRules.saveSuccess')); }, onError: () => void message.error(t('noticeRules.saveFailed')) });
  const remove = useMutation({ mutationFn: deleteNoticeRule, onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['notice-rules'] }); void message.success(t('noticeRules.deleteSuccess')); }, onError: () => void message.error(t('noticeRules.deleteFailed')) });
  const updateQuery = (patch: Partial<typeof query>) => setParams(writeNoticeRuleQuery({ ...query, ...patch }));
  const updateRule = (rule: NoticeRule, patch: Partial<NoticeRuleDraft>) => save.mutate({ ...noticeRuleDraftFromDetail(rule), ...patch });
  const submit = () => {
    if (!draft || validateNoticeRuleDraft(draft).length > 0) {
      void message.warning(t('noticeRules.validation'));
      return;
    }
    save.mutate(draft);
  };
  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div><Typography.Title level={2}>{t('noticeRules.title')}</Typography.Title><Typography.Text type="secondary">{t('noticeRules.description')}</Typography.Text></div>
        <Button type="primary" disabled={receivers.isError || templates.isError} onClick={() => setDraft(createNoticeRuleDraft())}>{t('noticeRules.new')}</Button>
      </header>
      <SettingsNav />
      {(receivers.isError || templates.isError) && <Alert type="warning" showIcon message={t('noticeRules.optionsUnavailable')} />}
      <div className={styles.toolbar}>
        <Input allowClear value={name} placeholder={t('noticeRules.search')} onChange={event => setName(event.target.value)} onPressEnter={() => updateQuery({ name: name.trim(), pageIndex: 0 })} />
        <Button type="primary" onClick={() => updateQuery({ name: name.trim(), pageIndex: 0 })}>{t('common.query')}</Button>
        <Button onClick={() => void rules.refetch()}>{t('common.refresh')}</Button>
      </div>
      <NoticeRuleResults data={rules.data} pending={rules.isPending} failed={rules.isError} columns={ruleColumns(t, save.isPending, id => edit.mutate(id), updateRule, id => remove.mutate(id))} pageIndex={query.pageIndex} pageSize={query.pageSize} onPageChange={(page, pageSize) => updateQuery({ pageIndex: page - 1, pageSize })} />
      {draft && <NoticeRuleEditor draft={draft} receivers={receivers.data ?? []} templates={templates.data ?? []} saving={save.isPending} update={patch => setDraft(current => current ? { ...current, ...patch } : current)} close={() => setDraft(null)} submit={submit} />}
    </div>
  );
}
