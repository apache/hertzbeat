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
import { Alert, App, Button, Empty, Input, Modal, Popconfirm, Select, Space, Switch, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { TFunction } from 'i18next';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';

import type { PageResult } from '@/core/http/api-message';

import { deleteAlertInhibit, loadAlertInhibit, loadAlertInhibits, saveAlertInhibit, updateAlertInhibitEnabled } from './alert-inhibit-api';
import {
  alertInhibitDraftFromDetail,
  alertInhibitPageSizes,
  createAlertInhibitDraft,
  readAlertInhibitQuery,
  validateAlertInhibitDraft,
  writeAlertInhibitQuery,
  type AlertInhibit,
  type AlertInhibitDraft
} from './alert-inhibit-model';
import { AlertManagementNav } from './AlertManagementNav';
import { AlertNoiseControlNav } from './AlertNoiseControlNav';
import styles from './AlertPolicyPage.module.css';

type InhibitOperation =
  | { type: 'toggle'; inhibit: AlertInhibit; enabled: boolean }
  | { type: 'delete'; id: number };

const commonLabels = ['alertname', 'instance', 'job', 'severity', 'service', 'host', 'env'];

function formatInhibitTime(inhibit: AlertInhibit) {
  const value = inhibit.gmtUpdate ?? inhibit.gmtCreate;
  if (value == null) return '—';
  const timestamp = typeof value === 'number' ? value : Date.parse(value);
  if (!Number.isFinite(timestamp)) return '—';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'medium' }).format(timestamp);
}

function matcherTags(labels?: Record<string, string>) {
  return <div className={styles.labels}>{Object.entries(labels ?? {}).map(([key, value]) => <Tag key={key}>{key}:{value}</Tag>)}</div>;
}

function AlertInhibitEditor({ draft, saving, update, close, submit }: {
  draft: AlertInhibitDraft;
  saving: boolean;
  update: (patch: Partial<AlertInhibitDraft>) => void;
  close: () => void;
  submit: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Modal
      open
      maskClosable={false}
      title={t(draft.id ? 'alertInhibits.edit' : 'alertInhibits.new')}
      okText={t('common.save')}
      cancelText={t('common.cancel')}
      confirmLoading={saving}
      onCancel={close}
      onOk={submit}
    >
      <div className={styles.form}>
        <label className={styles.wide}>
          {t('alertInhibits.name')}
          <Input value={draft.name} onChange={event => update({ name: event.target.value })} />
        </label>
        <label className={styles.wide}>
          {t('alertInhibits.sourceLabels')}
          <Input.TextArea rows={2} value={draft.sourceLabelsText} placeholder={t('alertInhibits.matcherPlaceholder')} onChange={event => update({ sourceLabelsText: event.target.value })} />
          <span className={styles.hint}>{t('alertInhibits.sourceHelp')}</span>
        </label>
        <label className={styles.wide}>
          {t('alertInhibits.targetLabels')}
          <Input.TextArea rows={2} value={draft.targetLabelsText} placeholder={t('alertInhibits.matcherPlaceholder')} onChange={event => update({ targetLabelsText: event.target.value })} />
          <span className={styles.hint}>{t('alertInhibits.targetHelp')}</span>
        </label>
        <label className={styles.wide}>
          {t('alertInhibits.equalLabels')}
          <Select
            mode="tags"
            maxCount={10}
            value={draft.equalLabels}
            tokenSeparators={[',']}
            options={commonLabels.map(value => ({ value, label: value }))}
            onChange={equalLabels => update({ equalLabels })}
          />
          <span className={styles.hint}>{t('alertInhibits.equalHelp')}</span>
        </label>
        <label>
          {t('alertInhibits.enabled')}
          <Switch checked={draft.enable} onChange={enable => update({ enable })} />
        </label>
      </div>
    </Modal>
  );
}

function buildInhibitColumns(t: TFunction, edit: (id: number) => void, operate: (operation: InhibitOperation) => void): ColumnsType<AlertInhibit> {
  return [
    { title: t('alertInhibits.name'), dataIndex: 'name', width: 210 },
    { title: t('alertInhibits.sourceLabels'), dataIndex: 'sourceLabels', render: matcherTags },
    { title: t('alertInhibits.targetLabels'), dataIndex: 'targetLabels', render: matcherTags },
    {
      title: t('alertInhibits.equalLabels'),
      dataIndex: 'equalLabels',
      render: (labels?: string[]) => <div className={styles.labels}>{(labels ?? []).map(label => <Tag key={label}>{label}</Tag>)}</div>
    },
    {
      title: t('alertInhibits.enabled'),
      dataIndex: 'enable',
      width: 90,
      render: (value: boolean | undefined, inhibit) => (
        <Switch checked={value !== false} onChange={enabled => operate({ type: 'toggle', inhibit, enabled })} />
      )
    },
    { title: t('alertInhibits.updated'), width: 180, render: (_value, inhibit) => formatInhibitTime(inhibit) },
    {
      title: t('common.actions'),
      width: 150,
      render: (_value, inhibit) => (
        <Space>
          <Button type="link" onClick={() => edit(inhibit.id)}>{t('common.edit')}</Button>
          <Popconfirm title={t('alertInhibits.deleteConfirm')} onConfirm={() => operate({ type: 'delete', id: inhibit.id })}>
            <Button type="link" danger>{t('alertInhibits.delete')}</Button>
          </Popconfirm>
        </Space>
      )
    }
  ];
}

function AlertInhibitResults({ data, pending, failed, columns, pageIndex, pageSize, onPageChange }: {
  data: PageResult<AlertInhibit> | undefined;
  pending: boolean;
  failed: boolean;
  columns: ColumnsType<AlertInhibit>;
  pageIndex: number;
  pageSize: number;
  onPageChange: (page: number, pageSize: number) => void;
}) {
  const { t } = useTranslation();
  if (failed) return <Alert type="error" showIcon message={t('common.unavailable')} />;
  if (!pending && (data?.content.length ?? 0) === 0) return <Empty description={t('alertInhibits.empty')} />;
  return (
    <Table<AlertInhibit>
      rowKey="id"
      size="small"
      loading={pending}
      dataSource={data?.content ?? []}
      columns={columns}
      scroll={{ x: 1200 }}
      pagination={{
        current: pageIndex + 1,
        pageSize,
        pageSizeOptions: [...alertInhibitPageSizes],
        showSizeChanger: true,
        total: data?.totalElements ?? 0,
        onChange: onPageChange
      }}
    />
  );
}

export function AlertInhibitPage() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const query = readAlertInhibitQuery(params);
  const [search, setSearch] = useState(query.search);
  const [draft, setDraft] = useState<AlertInhibitDraft | null>(null);
  const inhibits = useQuery({ queryKey: ['alert-inhibit-policies', query], queryFn: () => loadAlertInhibits(query) });
  const edit = useMutation({
    mutationFn: loadAlertInhibit,
    onSuccess: inhibit => setDraft(alertInhibitDraftFromDetail(inhibit)),
    onError: () => void message.error(t('alertInhibits.loadFailed'))
  });
  const save = useMutation({
    mutationFn: saveAlertInhibit,
    onSuccess: () => {
      setDraft(null);
      void queryClient.invalidateQueries({ queryKey: ['alert-inhibit-policies'] });
      void message.success(t('alertInhibits.saveSuccess'));
    },
    onError: () => void message.error(t('alertInhibits.saveFailed'))
  });
  const operation = useMutation({
    mutationFn: (action: InhibitOperation) => action.type === 'toggle'
      ? updateAlertInhibitEnabled(action.inhibit, action.enabled)
      : deleteAlertInhibit(action.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['alert-inhibit-policies'] });
      void message.success(t('alertInhibits.operationSuccess'));
    },
    onError: () => void message.error(t('alertInhibits.operationFailed'))
  });
  const updateQuery = (patch: Partial<typeof query>) => setParams(writeAlertInhibitQuery({ ...query, ...patch }));
  const runSearch = () => updateQuery({ search: search.trim(), pageIndex: 0 });
  const submit = () => {
    if (!draft || validateAlertInhibitDraft(draft).length > 0) {
      void message.warning(t('alertInhibits.validation'));
      return;
    }
    save.mutate(draft);
  };

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div>
          <Typography.Title level={2}>{t('alertInhibits.title')}</Typography.Title>
          <Typography.Text type="secondary">{t('alertInhibits.description')}</Typography.Text>
        </div>
        <Button type="primary" onClick={() => setDraft(createAlertInhibitDraft())}>{t('alertInhibits.new')}</Button>
      </header>
      <AlertManagementNav />
      <AlertNoiseControlNav />
      <div className={styles.toolbar}>
        <Input
          allowClear
          value={search}
          placeholder={t('alertInhibits.search')}
          onChange={event => setSearch(event.target.value)}
          onPressEnter={runSearch}
        />
        <Button type="primary" onClick={runSearch}>{t('common.query')}</Button>
        <Button onClick={() => void inhibits.refetch()}>{t('common.refresh')}</Button>
      </div>
      <AlertInhibitResults
        data={inhibits.data}
        pending={inhibits.isPending}
        failed={inhibits.isError}
        columns={buildInhibitColumns(t, id => edit.mutate(id), action => operation.mutate(action))}
        pageIndex={query.pageIndex}
        pageSize={query.pageSize}
        onPageChange={(page, pageSize) => updateQuery({ pageIndex: page - 1, pageSize })}
      />
      {draft && (
        <AlertInhibitEditor
          draft={draft}
          saving={save.isPending}
          update={patch => setDraft(current => current ? { ...current, ...patch } : current)}
          close={() => setDraft(null)}
          submit={submit}
        />
      )}
    </div>
  );
}
