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

import { deleteAlertSilence, loadAlertSilence, loadAlertSilences, saveAlertSilence, updateAlertSilenceEnabled } from './alert-silence-api';
import {
  alertSilenceDraftFromDetail,
  alertSilencePageSizes,
  createAlertSilenceDraft,
  readAlertSilenceQuery,
  validateAlertSilenceDraft,
  writeAlertSilenceQuery,
  type AlertSilence,
  type AlertSilenceDraft
} from './alert-silence-model';
import { AlertManagementNav } from './alert-management-nav';
import { AlertNoiseControlNav } from './alert-noise-control-nav';
import styles from './alert-policy-page.module.css';
import { AlertSilenceEditor } from './alert-silence-editor';

type SilenceOperation =
  | { type: 'toggle'; silence: AlertSilence; enabled: boolean }
  | { type: 'delete'; id: number };

function formatSilenceTime(value?: string | number | null) {
  if (value == null) return '—';
  const timestamp = typeof value === 'number' ? value : Date.parse(value);
  if (!Number.isFinite(timestamp)) return '—';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'medium' }).format(timestamp);
}

function formatClock(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '—';
  return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(date);
}

function scheduleCell(t: TFunction, silence: AlertSilence) {
  if ((silence.type ?? 0) === 0) {
    return (
      <Space direction="vertical" size={0}>
        <Tag color="processing">{t('alertSilences.once')}</Tag>
        <Typography.Text type="secondary">{formatSilenceTime(silence.periodStart)} – {formatSilenceTime(silence.periodEnd)}</Typography.Text>
      </Space>
    );
  }
  return (
    <Space direction="vertical" size={0}>
      <Tag color="processing">{t('alertSilences.recurring')}</Tag>
      <Typography.Text type="secondary">{t('alertSilences.selectedDays', { count: silence.days?.length ?? 0 })} · {formatClock(silence.periodStart)} – {formatClock(silence.periodEnd)}</Typography.Text>
    </Space>
  );
}

function scopeCell(t: TFunction, silence: AlertSilence) {
  if (silence.matchAll !== false) return <Tag>{t('alertSilences.allAlerts')}</Tag>;
  return <div className={styles.labels}>{Object.entries(silence.labels ?? {}).map(([key, value]) => <Tag key={key}>{key}:{value}</Tag>)}</div>;
}

function buildSilenceColumns(t: TFunction, edit: (id: number) => void, operate: (operation: SilenceOperation) => void): ColumnsType<AlertSilence> {
  return [
    { title: t('alertSilences.name'), dataIndex: 'name', width: 210 },
    { title: t('alertSilences.scope'), width: 250, render: (_value, silence) => scopeCell(t, silence) },
    { title: t('alertSilences.schedule'), width: 330, render: (_value, silence) => scheduleCell(t, silence) },
    { title: t('alertSilences.times'), dataIndex: 'times', width: 100, render: (value?: number) => value ?? 0 },
    {
      title: t('alertSilences.enabled'),
      dataIndex: 'enable',
      width: 90,
      render: (value: boolean | undefined, silence) => (
        <Switch checked={value !== false} onChange={enabled => operate({ type: 'toggle', silence, enabled })} />
      )
    },
    { title: t('alertSilences.updated'), width: 180, render: (_value, silence) => formatSilenceTime(silence.gmtUpdate ?? silence.gmtCreate) },
    {
      title: t('common.actions'),
      width: 150,
      render: (_value, silence) => (
        <Space>
          <Button type="link" onClick={() => edit(silence.id)}>{t('common.edit')}</Button>
          <Popconfirm title={t('alertSilences.deleteConfirm')} onConfirm={() => operate({ type: 'delete', id: silence.id })}>
            <Button type="link" danger>{t('alertSilences.delete')}</Button>
          </Popconfirm>
        </Space>
      )
    }
  ];
}

function AlertSilenceResults({ data, pending, failed, columns, pageIndex, pageSize, onPageChange }: {
  data: PageResult<AlertSilence> | undefined;
  pending: boolean;
  failed: boolean;
  columns: ColumnsType<AlertSilence>;
  pageIndex: number;
  pageSize: number;
  onPageChange: (page: number, pageSize: number) => void;
}) {
  const { t } = useTranslation();
  if (failed) return <Alert type="error" showIcon message={t('common.unavailable')} />;
  if (!pending && (data?.content.length ?? 0) === 0) return <Empty description={t('alertSilences.empty')} />;
  return (
    <Table<AlertSilence>
      rowKey="id"
      size="small"
      loading={pending}
      dataSource={data?.content ?? []}
      columns={columns}
      scroll={{ x: 1310 }}
      pagination={{
        current: pageIndex + 1,
        pageSize,
        pageSizeOptions: [...alertSilencePageSizes],
        showSizeChanger: true,
        total: data?.totalElements ?? 0,
        onChange: onPageChange
      }}
    />
  );
}

export function AlertSilencePage() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const query = readAlertSilenceQuery(params);
  const [search, setSearch] = useState(query.search);
  const [draft, setDraft] = useState<AlertSilenceDraft | null>(null);
  const silences = useQuery({ queryKey: ['alert-silence-policies', query], queryFn: () => loadAlertSilences(query) });
  const edit = useMutation({
    mutationFn: loadAlertSilence,
    onSuccess: silence => setDraft(alertSilenceDraftFromDetail(silence)),
    onError: () => void message.error(t('alertSilences.loadFailed'))
  });
  const save = useMutation({
    mutationFn: saveAlertSilence,
    onSuccess: () => {
      setDraft(null);
      void queryClient.invalidateQueries({ queryKey: ['alert-silence-policies'] });
      void message.success(t('alertSilences.saveSuccess'));
    },
    onError: () => void message.error(t('alertSilences.saveFailed'))
  });
  const operation = useMutation({
    mutationFn: (action: SilenceOperation) => action.type === 'toggle'
      ? updateAlertSilenceEnabled(action.silence, action.enabled)
      : deleteAlertSilence(action.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['alert-silence-policies'] });
      void message.success(t('alertSilences.operationSuccess'));
    },
    onError: () => void message.error(t('alertSilences.operationFailed'))
  });
  const updateQuery = (patch: Partial<typeof query>) => setParams(writeAlertSilenceQuery({ ...query, ...patch }));
  const runSearch = () => updateQuery({ search: search.trim(), pageIndex: 0 });
  const submit = () => {
    if (!draft || validateAlertSilenceDraft(draft).length > 0) {
      void message.warning(t('alertSilences.validation'));
      return;
    }
    save.mutate(draft);
  };

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div>
          <Typography.Title level={2}>{t('alertSilences.title')}</Typography.Title>
          <Typography.Text type="secondary">{t('alertSilences.description')}</Typography.Text>
        </div>
        <Button type="primary" onClick={() => setDraft(createAlertSilenceDraft())}>{t('alertSilences.new')}</Button>
      </header>
      <AlertManagementNav />
      <AlertNoiseControlNav />
      <div className={styles.toolbar}>
        <Input
          allowClear
          value={search}
          placeholder={t('alertSilences.search')}
          onChange={event => setSearch(event.target.value)}
          onPressEnter={runSearch}
        />
        <Button type="primary" onClick={runSearch}>{t('common.query')}</Button>
        <Button onClick={() => void silences.refetch()}>{t('common.refresh')}</Button>
      </div>
      <AlertSilenceResults
        data={silences.data}
        pending={silences.isPending}
        failed={silences.isError}
        columns={buildSilenceColumns(t, id => edit.mutate(id), action => operation.mutate(action))}
        pageIndex={query.pageIndex}
        pageSize={query.pageSize}
        onPageChange={(page, pageSize) => updateQuery({ pageIndex: page - 1, pageSize })}
      />
      {draft && (
        <AlertSilenceEditor
          draft={draft}
          saving={save.isPending}
          update={patch => setDraft(current => current ? { ...current, ...patch } : current)}
          replace={setDraft}
          close={() => setDraft(null)}
          submit={submit}
        />
      )}
    </div>
  );
}
