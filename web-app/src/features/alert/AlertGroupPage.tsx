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
import { Alert, App, Button, Empty, Input, InputNumber, Modal, Popconfirm, Select, Space, Switch, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { TFunction } from 'i18next';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';

import type { PageResult } from '@/core/http/api-message';

import { deleteAlertGroup, loadAlertGroup, loadAlertGroups, saveAlertGroup, updateAlertGroupEnabled } from './alert-group-api';
import {
  alertGroupDraftFromDetail,
  alertGroupPageSizes,
  createAlertGroupDraft,
  readAlertGroupQuery,
  validateAlertGroupDraft,
  writeAlertGroupQuery,
  type AlertGroupConverge,
  type AlertGroupDraft
} from './alert-group-model';
import { AlertManagementNav } from './AlertManagementNav';
import { AlertNoiseControlNav } from './AlertNoiseControlNav';
import styles from './AlertPolicyPage.module.css';

type GroupOperation =
  | { type: 'toggle'; group: AlertGroupConverge; enabled: boolean }
  | { type: 'delete'; id: number };

const commonGroupLabels = ['alertname', 'instance', 'job', 'severity', 'service', 'host', 'env'];

function formatGroupTime(value?: string | number | null) {
  if (value == null) return '—';
  const timestamp = typeof value === 'number' ? value : Date.parse(value);
  if (!Number.isFinite(timestamp)) return '—';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'medium' }).format(timestamp);
}

function AlertGroupEditor({ draft, saving, update, close, submit }: {
  draft: AlertGroupDraft;
  saving: boolean;
  update: (patch: Partial<AlertGroupDraft>) => void;
  close: () => void;
  submit: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Modal
      open
      maskClosable={false}
      title={t(draft.id ? 'alertGroups.edit' : 'alertGroups.new')}
      okText={t('common.save')}
      cancelText={t('common.cancel')}
      confirmLoading={saving}
      onCancel={close}
      onOk={submit}
    >
      <div className={styles.form}>
        <label className={styles.wide}>
          {t('alertGroups.name')}
          <Input value={draft.name} onChange={event => update({ name: event.target.value })} />
        </label>
        <label className={styles.wide}>
          {t('alertGroups.labels')}
          <Select
            mode="tags"
            maxCount={10}
            value={draft.groupLabels}
            tokenSeparators={[',']}
            options={commonGroupLabels.map(value => ({ value, label: value }))}
            onChange={groupLabels => update({ groupLabels })}
          />
        </label>
        <label>
          {t('alertGroups.wait')}
          <InputNumber min={0} step={30} value={draft.groupWait} onChange={value => update({ groupWait: value ?? 30 })} />
        </label>
        <label>
          {t('alertGroups.interval')}
          <InputNumber min={0} step={300} value={draft.groupInterval} onChange={value => update({ groupInterval: value ?? 300 })} />
        </label>
        <label>
          {t('alertGroups.repeat')}
          <InputNumber min={0} step={3600} value={draft.repeatInterval} onChange={value => update({ repeatInterval: value ?? 14400 })} />
        </label>
        <label>
          {t('alertGroups.enabled')}
          <Switch checked={draft.enable} onChange={enable => update({ enable })} />
        </label>
      </div>
    </Modal>
  );
}

function buildGroupColumns(t: TFunction, edit: (id: number) => void, operate: (operation: GroupOperation) => void): ColumnsType<AlertGroupConverge> {
  return [
    { title: t('alertGroups.name'), dataIndex: 'name' },
    {
      title: t('alertGroups.labels'),
      dataIndex: 'groupLabels',
      render: (labels?: string[]) => <div className={styles.labels}>{(labels ?? []).map(label => <Tag key={label}>{label}</Tag>)}</div>
    },
    { title: t('alertGroups.wait'), dataIndex: 'groupWait', width: 130, render: (value?: number) => t('alertGroups.seconds', { value: value ?? 0 }) },
    { title: t('alertGroups.interval'), dataIndex: 'groupInterval', width: 150, render: (value?: number) => t('alertGroups.seconds', { value: value ?? 0 }) },
    { title: t('alertGroups.repeat'), dataIndex: 'repeatInterval', width: 150, render: (value?: number) => t('alertGroups.seconds', { value: value ?? 0 }) },
    {
      title: t('alertGroups.enabled'),
      dataIndex: 'enable',
      width: 90,
      render: (value: boolean | undefined, group) => (
        <Switch checked={value !== false} onChange={enabled => operate({ type: 'toggle', group, enabled })} />
      )
    },
    { title: t('alertGroups.updated'), dataIndex: 'gmtUpdate', width: 180, render: formatGroupTime },
    {
      title: t('common.actions'),
      width: 150,
      render: (_value, group) => (
        <Space>
          <Button type="link" onClick={() => edit(group.id)}>{t('common.edit')}</Button>
          <Popconfirm title={t('alertGroups.deleteConfirm')} onConfirm={() => operate({ type: 'delete', id: group.id })}>
            <Button type="link" danger>{t('alertGroups.delete')}</Button>
          </Popconfirm>
        </Space>
      )
    }
  ];
}

function AlertGroupResults({ data, pending, failed, columns, pageIndex, pageSize, onPageChange }: {
  data: PageResult<AlertGroupConverge> | undefined;
  pending: boolean;
  failed: boolean;
  columns: ColumnsType<AlertGroupConverge>;
  pageIndex: number;
  pageSize: number;
  onPageChange: (page: number, pageSize: number) => void;
}) {
  const { t } = useTranslation();
  if (failed) return <Alert type="error" showIcon message={t('common.unavailable')} />;
  if (!pending && (data?.content.length ?? 0) === 0) return <Empty description={t('alertGroups.empty')} />;
  return (
    <Table<AlertGroupConverge>
      rowKey="id"
      size="small"
      loading={pending}
      dataSource={data?.content ?? []}
      columns={columns}
      scroll={{ x: 1100 }}
      pagination={{
        current: pageIndex + 1,
        pageSize,
        pageSizeOptions: [...alertGroupPageSizes],
        showSizeChanger: true,
        total: data?.totalElements ?? 0,
        onChange: onPageChange
      }}
    />
  );
}

export function AlertGroupPage() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const query = readAlertGroupQuery(params);
  const [search, setSearch] = useState(query.search);
  const [draft, setDraft] = useState<AlertGroupDraft | null>(null);
  const groups = useQuery({ queryKey: ['alert-group-policies', query], queryFn: () => loadAlertGroups(query) });
  const edit = useMutation({
    mutationFn: loadAlertGroup,
    onSuccess: group => setDraft(alertGroupDraftFromDetail(group)),
    onError: () => void message.error(t('alertGroups.loadFailed'))
  });
  const save = useMutation({
    mutationFn: saveAlertGroup,
    onSuccess: () => {
      setDraft(null);
      void queryClient.invalidateQueries({ queryKey: ['alert-group-policies'] });
      void message.success(t('alertGroups.saveSuccess'));
    },
    onError: () => void message.error(t('alertGroups.saveFailed'))
  });
  const operation = useMutation({
    mutationFn: (action: GroupOperation) => action.type === 'toggle'
      ? updateAlertGroupEnabled(action.group, action.enabled)
      : deleteAlertGroup(action.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['alert-group-policies'] });
      void message.success(t('alertGroups.operationSuccess'));
    },
    onError: () => void message.error(t('alertGroups.operationFailed'))
  });
  const updateQuery = (patch: Partial<typeof query>) => setParams(writeAlertGroupQuery({ ...query, ...patch }));
  const runSearch = () => updateQuery({ search: search.trim(), pageIndex: 0 });
  const submit = () => {
    if (!draft || validateAlertGroupDraft(draft).length > 0) {
      void message.warning(t('alertGroups.validation'));
      return;
    }
    save.mutate(draft);
  };

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div>
          <Typography.Title level={2}>{t('alertGroups.title')}</Typography.Title>
          <Typography.Text type="secondary">{t('alertGroups.description')}</Typography.Text>
        </div>
        <Button type="primary" onClick={() => setDraft(createAlertGroupDraft())}>{t('alertGroups.new')}</Button>
      </header>
      <AlertManagementNav />
      <AlertNoiseControlNav />
      <div className={styles.toolbar}>
        <Input
          allowClear
          value={search}
          placeholder={t('alertGroups.search')}
          onChange={event => setSearch(event.target.value)}
          onPressEnter={runSearch}
        />
        <Button type="primary" onClick={runSearch}>{t('common.query')}</Button>
        <Button onClick={() => void groups.refetch()}>{t('common.refresh')}</Button>
      </div>
      <AlertGroupResults
        data={groups.data}
        pending={groups.isPending}
        failed={groups.isError}
        columns={buildGroupColumns(t, id => edit.mutate(id), action => operation.mutate(action))}
        pageIndex={query.pageIndex}
        pageSize={query.pageSize}
        onPageChange={(page, pageSize) => updateQuery({ pageIndex: page - 1, pageSize })}
      />
      {draft && (
        <AlertGroupEditor
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
