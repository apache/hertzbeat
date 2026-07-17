/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Alert, Button, Empty, Popconfirm, Space, Switch, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';

import styles from '../../alert-policy-page.module.css';
import { NoticeRuleEditor } from '../components/notice-rule-editor';
import { NoticeRuleToolbar } from '../components/notice-rule-toolbar';
import { useNoticeRuleController } from '../controller/notice-rule-controller';
import {
  noticeRuleDraftFromDetail,
  noticeRulePageSizes,
  type NoticeRule,
  type NoticeRuleListState
} from '../model/notice-rule-model';

function formatRuleTime(rule: NoticeRule) {
  const value = rule.gmtUpdate ?? rule.gmtCreate;
  if (value == null) return '—';
  const timestamp = typeof value === 'number' ? value : Date.parse(value);
  return Number.isFinite(timestamp)
    ? new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'medium' }).format(timestamp)
    : '—';
}

function scheduleText(t: TFunction, rule: NoticeRule) {
  const days = rule.days?.length && rule.days.length < 7
    ? t('noticeRules.selectedDays', { count: rule.days.length }) : t('noticeRules.everyDay');
  if (!rule.periodStart || !rule.periodEnd) return days;
  const draft = noticeRuleDraftFromDetail(rule);
  return `${days} · ${draft.periodStart}-${draft.periodEnd}`;
}

function ruleColumns(
  t: TFunction,
  saving: boolean,
  togglingRuleId: number | null,
  edit: (id: number) => void,
  toggle: (rule: NoticeRule, enable: boolean) => void,
  remove: (rule: NoticeRule) => void
): ColumnsType<NoticeRule> {
  return [
    { title: t('noticeRules.name'), dataIndex: 'name', width: 210 },
    { title: t('noticeRules.receivers'), width: 260, render: (_value, rule) => (
      <div className={styles.labels}>{rule.receiverName.map((name, index) => (
        <Tag key={`${rule.receiverId[index] ?? index}-${name}`}>{name}</Tag>
      ))}</div>
    ) },
    { title: t('noticeRules.template'), width: 180, render: (_value, rule) => rule.templateId == null
      ? <Tag>{t('noticeRules.defaultTemplate')}</Tag> : rule.templateName || '—' },
    { title: t('noticeRules.scope'), width: 150, render: (_value, rule) => (
      <Tag color={rule.filterAll ? 'processing' : 'default'}>
        {t(rule.filterAll ? 'noticeRules.allAlerts' : 'noticeRules.filtered')}
      </Tag>
    ) },
    { title: t('noticeRules.schedule'), width: 210, render: (_value, rule) => scheduleText(t, rule) },
    { title: t('noticeRules.updated'), width: 190, render: (_value, rule) => formatRuleTime(rule) },
    { title: t('noticeRules.enabled'), key: 'enabled', width: 100, fixed: 'right', render: (_value, rule) => (
      <Switch checked={rule.enable} disabled={saving || togglingRuleId !== null && togglingRuleId !== rule.id}
        loading={togglingRuleId === rule.id} onClick={enable => toggle(rule, enable)} />
    ) },
    { title: t('common.actions'), key: 'actions', width: 160, fixed: 'right', render: (_value, rule) => (
      <Space>
        <Button type="link" onClick={() => edit(rule.id)}>{t('common.edit')}</Button>
        <Popconfirm title={t('noticeRules.deleteConfirm')} onConfirm={() => remove(rule)}>
          <Button type="link" danger>{t('noticeRules.delete')}</Button>
        </Popconfirm>
      </Space>
    ) }
  ];
}

function NoticeRuleResults({ state, columns, pageIndex, pageSize, changePage }: {
  state: NoticeRuleListState;
  columns: ColumnsType<NoticeRule>;
  pageIndex: number;
  pageSize: number;
  changePage: (page: number, pageSize: number) => void;
}) {
  const { t } = useTranslation();
  if (['missing', 'invalid', 'unavailable', 'error'].includes(state.kind)) {
    return <Alert type="error" showIcon message={t(`noticeRules.read.${state.kind}`)} />;
  }
  if (state.kind === 'empty') return <Empty description={t('noticeRules.empty')} />;
  const records = state.kind === 'ready' ? state.records : [];
  return <Table<NoticeRule> rowKey="id" size="small" loading={state.kind === 'loading'} dataSource={records}
    columns={columns} scroll={{ x: 1460 }} pagination={{ current: pageIndex + 1, pageSize,
      pageSizeOptions: [...noticeRulePageSizes], showSizeChanger: true,
      total: state.kind === 'ready' ? state.total : 0, onChange: changePage }} />;
}

export function NoticeRulePage() {
  const { t } = useTranslation();
  const { state, actions } = useNoticeRuleController();
  return <div className={styles.page}>
    <NoticeRuleToolbar name={state.name} createDisabled={state.options.kind !== 'ready'}
      onNameChange={actions.setName} onQuery={actions.search} onRefresh={actions.refresh} onCreate={actions.create} />
    {state.options.kind !== 'ready' && state.options.kind !== 'loading'
      ? <Alert type={state.options.kind === 'empty' ? 'info' : 'warning'} showIcon
        message={t(`noticeRules.options.${state.options.kind}`)} /> : null}
    <NoticeRuleResults state={state.list} columns={ruleColumns(t, state.saving, state.togglingRuleId,
      id => void actions.edit(id), (rule, enable) => void actions.toggle(rule, enable),
      rule => void actions.remove(rule))} pageIndex={state.query.pageIndex} pageSize={state.query.pageSize}
      changePage={actions.changePage} />
    {state.draft ? <NoticeRuleEditor draft={state.draft} receivers={state.receivers} templates={state.templates}
      saving={state.saving} update={actions.updateDraft} close={actions.close}
      submit={() => void actions.submit()} /> : null}
  </div>;
}
