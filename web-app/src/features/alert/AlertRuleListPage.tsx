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
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';

import type { PageResult } from '@/core/http/api-message';

import { deleteAlertRules, loadAlertRules, updateAlertRuleEnabled } from './alert-rule-api';
import { alertRulePageSizes, readAlertRuleQuery, writeAlertRuleQuery, type AlertRule } from './alert-rule-model';
import styles from './AlertRuleListPage.module.css';

type Translator = (key: string) => string;
type RuleOperation =
  | { type: 'toggle'; rule: AlertRule; enabled: boolean }
  | { type: 'delete'; id: number };

type RuleActions = {
  edit: (id: number) => void;
  toggle: (rule: AlertRule, enabled: boolean) => void;
  remove: (id: number) => void;
};

function formatRuleTime(value?: string | number | null) {
  if (value == null) return '—';
  const timestamp = typeof value === 'number' ? value : Date.parse(value);
  if (!Number.isFinite(timestamp)) return '—';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'medium' }).format(timestamp);
}

function RuleActionCell({ rule, actions, t }: { rule: AlertRule; actions: RuleActions; t: Translator }) {
  return (
    <Space>
      <Button type="link" onClick={() => actions.edit(rule.id)}>{t('common.edit')}</Button>
      <Popconfirm title={t('alertRules.deleteConfirm')} onConfirm={() => actions.remove(rule.id)}>
        <Button type="link" danger>{t('alertRules.delete')}</Button>
      </Popconfirm>
    </Space>
  );
}

function buildColumns(t: Translator, actions: RuleActions): ColumnsType<AlertRule> {
  return [
    {
      title: t('alertRules.name'),
      render: (_value, rule) => (
        <div className={styles.name}>
          <strong>{rule.name || `#${rule.id}`}</strong>
          <span>{rule.expr || '—'}</span>
        </div>
      )
    },
    {
      title: t('alertRules.type'),
      dataIndex: 'type',
      width: 170,
      render: (value?: string) => <Tag>{value || '—'}</Tag>
    },
    {
      title: t('alertRules.enabled'),
      dataIndex: 'enable',
      width: 100,
      render: (value: boolean | undefined, rule) => (
        <Switch checked={value !== false} onChange={enabled => actions.toggle(rule, enabled)} />
      )
    },
    { title: t('alertRules.updated'), dataIndex: 'gmtUpdate', width: 190, render: formatRuleTime },
    {
      title: t('common.actions'),
      width: 150,
      render: (_value, rule) => <RuleActionCell rule={rule} actions={actions} t={t} />
    }
  ];
}

function RuleResults({ data, pending, failed, columns, pageIndex, pageSize, onPageChange }: {
  data: PageResult<AlertRule> | undefined;
  pending: boolean;
  failed: boolean;
  columns: ColumnsType<AlertRule>;
  pageIndex: number;
  pageSize: number;
  onPageChange: (page: number, pageSize: number) => void;
}) {
  const { t } = useTranslation();
  if (failed) return <Alert type="error" showIcon message={t('common.unavailable')} />;
  if (!pending && (data?.content.length ?? 0) === 0) return <Empty description={t('alertRules.empty')} />;
  return (
    <Table<AlertRule>
      rowKey="id"
      size="small"
      loading={pending}
      dataSource={data?.content ?? []}
      columns={columns}
      pagination={{
        current: pageIndex + 1,
        pageSize,
        pageSizeOptions: [...alertRulePageSizes],
        showSizeChanger: true,
        total: data?.totalElements ?? 0,
        onChange: onPageChange
      }}
    />
  );
}

export function AlertRuleListPage() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const query = readAlertRuleQuery(params);
  const [search, setSearch] = useState(query.search);
  const rules = useQuery({ queryKey: ['alert-rules', query], queryFn: () => loadAlertRules(query) });
  const mutation = useMutation({
    mutationFn: (operation: RuleOperation) => operation.type === 'toggle'
      ? updateAlertRuleEnabled(operation.rule, operation.enabled)
      : deleteAlertRules([operation.id]),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['alert-rules'] });
      void message.success(t('alertRules.operationSuccess'));
    },
    onError: () => void message.error(t('alertRules.operationFailed'))
  });
  const updateQuery = (patch: Partial<typeof query>) => setParams(writeAlertRuleQuery({ ...query, ...patch }));
  const runSearch = () => updateQuery({ search: search.trim(), pageIndex: 0 });
  const actions: RuleActions = {
    edit: id => void navigate(`/alerts/rules/${id}/edit`),
    toggle: (rule, enabled) => mutation.mutate({ type: 'toggle', rule, enabled }),
    remove: id => mutation.mutate({ type: 'delete', id })
  };

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div>
          <Typography.Title level={2}>{t('alertRules.title')}</Typography.Title>
          <Typography.Text type="secondary">{t('alertRules.description')}</Typography.Text>
        </div>
        <Space>
          <Button onClick={() => void navigate('/alerts')}>{t('common.back')}</Button>
          <Button type="primary" onClick={() => void navigate('/alerts/rules/new')}>{t('alertRules.new')}</Button>
        </Space>
      </header>
      <div className={styles.toolbar}>
        <Input
          allowClear
          value={search}
          placeholder={t('alertRules.search')}
          onChange={event => setSearch(event.target.value)}
          onPressEnter={runSearch}
        />
        <Button type="primary" onClick={runSearch}>{t('common.query')}</Button>
        <Button onClick={() => void rules.refetch()}>{t('common.refresh')}</Button>
      </div>
      <RuleResults
        data={rules.data}
        pending={rules.isPending}
        failed={rules.isError}
        columns={buildColumns(t, actions)}
        pageIndex={query.pageIndex}
        pageSize={query.pageSize}
        onPageChange={(page, pageSize) => updateQuery({ pageIndex: page - 1, pageSize })}
      />
    </div>
  );
}
