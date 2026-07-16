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

import { Alert, Button, Empty, Input, Popconfirm, Space, Switch, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useTranslation } from 'react-i18next';

import { alertRulePageSizes, type AlertRule } from './alert-rule-model';
import { AlertManagementNav } from './alert-management-nav';
import styles from './alert-rule-list-page.module.css';
import { useAlertRuleListController, type AlertRuleListState } from './controller/use-alert-rule-list-controller';

type Translator = (key: string) => string;

function buildColumns(t: Translator, busy: boolean, edit: (id: number) => unknown,
  toggle: (rule: AlertRule, enabled: boolean) => unknown,
  remove: (id: number) => unknown): ColumnsType<AlertRule> {
  return [
    { title: t('alertRules.name'), width: 250, render: (_value, rule) => (
      <div className={styles.name}>
        <strong>{rule.name || `#${rule.id}`}</strong>
        <span>{rule.expr ?? '—'}</span>
      </div>
    ) },
    { title: t('alertRules.type'), width: 190, render: (_value, rule) => (
      <Space direction="vertical" size={2}>
        {rule.type === null ? '—' : <Tag>{rule.type}</Tag>}
        <Typography.Text type="secondary">{rule.datasource ?? '—'}</Typography.Text>
      </Space>
    ) },
    { title: t('alertRules.period'), dataIndex: 'period', width: 150, render: nullableNumber },
    { title: t('alertRules.times'), dataIndex: 'times', width: 130, render: nullableNumber },
    { title: t('alertRules.enabled'), dataIndex: 'enable', width: 100, render: (value: boolean, rule) => (
      <Switch checked={value} disabled={busy} onChange={enabled => { void toggle(rule, enabled); }} />
    ) },
    { title: t('alertRules.updated'), width: 190, render: (_value, rule) => rule.gmtUpdate ?? rule.gmtCreate ?? '—' },
    { title: t('common.actions'), width: 150, render: (_value, rule) => (
      <Space>
        <Button type="link" disabled={busy} onClick={() => { void edit(rule.id); }}>{t('common.edit')}</Button>
        <Popconfirm title={t('alertRules.deleteConfirm')} onConfirm={() => remove(rule.id)}>
          <Button type="link" danger disabled={busy}>{t('alertRules.delete')}</Button>
        </Popconfirm>
      </Space>
    ) }
  ];
}

function nullableNumber(value: number | null) {
  return value ?? '—';
}

function RuleResults({ state, columns, pageIndex, pageSize, changePage, retry }: {
  state: AlertRuleListState;
  columns: ColumnsType<AlertRule>;
  pageIndex: number;
  pageSize: number;
  changePage: (page: number, pageSize: number) => void;
  retry: () => unknown;
}) {
  const { t } = useTranslation();
  if (state.kind === 'unavailable') return <Failure message={t('common.unavailable')} retry={retry} />;
  if (state.kind === 'error') return <Failure message={t('common.routeError.description')} retry={retry} />;
  if (state.kind === 'empty') return <Empty description={t('alertRules.empty')} />;
  const records = state.kind === 'ready' ? state.records : [];
  const total = state.kind === 'ready' ? state.total : 0;
  return <Table<AlertRule> rowKey="id" size="small" loading={state.kind === 'loading'} dataSource={records}
    columns={columns} scroll={{ x: 1200 }} pagination={{ current: pageIndex + 1, pageSize,
      pageSizeOptions: [...alertRulePageSizes], showSizeChanger: true, total, onChange: changePage }} />;
}

function Failure({ message, retry }: { message: string; retry: () => unknown }) {
  const { t } = useTranslation();
  return <Alert type="error" showIcon message={message}
    action={<Button size="small" onClick={() => { void retry(); }}>{t('common.retry')}</Button>} />;
}

export function AlertRuleListPage() {
  const { t } = useTranslation();
  const controller = useAlertRuleListController();
  const { command, list, query, refreshing, search } = controller.state;
  const busy = command !== 'idle';
  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div><Typography.Title level={2}>{t('alertRules.title')}</Typography.Title>
          <Typography.Text type="secondary">{t('alertRules.description')}</Typography.Text></div>
        <Button type="primary" disabled={busy} onClick={controller.create}>{t('alertRules.new')}</Button>
      </header>
      <AlertManagementNav />
      <div className={styles.toolbar}>
        <Input allowClear value={search} placeholder={t('alertRules.search')}
          onChange={event => controller.setSearch(event.target.value)} onPressEnter={controller.submitSearch} />
        <Button type="primary" onClick={controller.submitSearch}>{t('common.query')}</Button>
        <Button loading={refreshing} onClick={() => { void controller.refresh(); }}>{t('common.refresh')}</Button>
      </div>
      <RuleResults state={list} columns={buildColumns(t, busy, controller.edit, controller.toggle, controller.remove)}
        pageIndex={query.pageIndex} pageSize={query.pageSize} changePage={controller.changePage} retry={controller.refresh} />
    </div>
  );
}
