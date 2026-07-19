/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Alert, Button, Empty, Popconfirm, Space, Switch, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';

import styles from '../../alert-policy-page.module.css';
import {
  noticeRuleDraftFromDetail,
  noticeRulePageSizes,
  type NoticeRule,
  type NoticeRuleListState
} from '../model/notice-rule-model';

type NoticeRuleTableActions = {
  changePage: (page: number, pageSize: number) => void;
  edit: (id: number) => void;
  remove: (rule: NoticeRule) => void;
  toggle: (rule: NoticeRule, enable: boolean) => void;
};

type NoticeRuleTableProps = {
  actions: NoticeRuleTableActions;
  busy: boolean;
  dependenciesReady: boolean;
  pageIndex: number;
  pageSize: number;
  state: NoticeRuleListState;
  togglingRuleId: number | null;
};

type ColumnContext = Pick<NoticeRuleTableProps, 'actions' | 'busy' | 'dependenciesReady' | 'togglingRuleId'> & {
  t: TFunction;
};

export function NoticeRuleTable(props: NoticeRuleTableProps) {
  const { t } = useTranslation();
  return (
    <NoticeRuleResults
      {...props}
      columns={noticeRuleColumns({
        actions: props.actions,
        busy: props.busy,
        dependenciesReady: props.dependenciesReady,
        t,
        togglingRuleId: props.togglingRuleId
      })}
    />
  );
}

function noticeRuleColumns(context: ColumnContext): ColumnsType<NoticeRule> {
  return [
    { title: context.t('noticeRules.name'), dataIndex: 'name', width: 210 },
    receiverColumn(context.t),
    templateColumn(context.t),
    scopeColumn(context.t),
    { title: context.t('noticeRules.schedule'), width: 210, render: (_value, rule) => scheduleText(context.t, rule) },
    { title: context.t('noticeRules.updated'), width: 190, render: (_value, rule) => formatRuleTime(rule) },
    enabledColumn(context),
    actionColumn(context)
  ];
}

function receiverColumn(t: TFunction): ColumnsType<NoticeRule>[number] {
  return {
    title: t('noticeRules.receivers'),
    width: 260,
    render: (_value, rule) => (
      <div className={styles.labels}>
        {rule.receiverName.map((name, index) => (
          <Tag key={`${rule.receiverId[index] ?? index}-${name}`}>{name}</Tag>
        ))}
      </div>
    )
  };
}

function templateColumn(t: TFunction): ColumnsType<NoticeRule>[number] {
  return {
    title: t('noticeRules.template'),
    width: 180,
    render: (_value, rule) =>
      rule.templateId == null ? <Tag>{t('noticeRules.defaultTemplate')}</Tag> : rule.templateName || '—'
  };
}

function scopeColumn(t: TFunction): ColumnsType<NoticeRule>[number] {
  return {
    title: t('noticeRules.scope'),
    width: 150,
    render: (_value, rule) => (
      <Tag color={rule.filterAll ? 'processing' : 'default'}>
        {t(rule.filterAll ? 'noticeRules.allAlerts' : 'noticeRules.filtered')}
      </Tag>
    )
  };
}

function enabledColumn(context: ColumnContext): ColumnsType<NoticeRule>[number] {
  return {
    title: context.t('noticeRules.enabled'),
    key: 'enabled',
    width: 100,
    fixed: 'right',
    render: (_value, rule) => (
      <Switch
        checked={rule.enable}
        disabled={context.busy || !context.dependenciesReady}
        loading={context.togglingRuleId === rule.id}
        onClick={enable => context.actions.toggle(rule, enable)}
      />
    )
  };
}

function actionColumn(context: ColumnContext): ColumnsType<NoticeRule>[number] {
  return {
    title: context.t('common.actions'),
    key: 'actions',
    width: 160,
    fixed: 'right',
    render: (_value, rule) => (
      <Space>
        <Button
          type="link"
          disabled={context.busy || !context.dependenciesReady}
          onClick={() => context.actions.edit(rule.id)}
        >
          {context.t('common.edit')}
        </Button>
        <Popconfirm title={context.t('noticeRules.deleteConfirm')} onConfirm={() => context.actions.remove(rule)}>
          <Button type="link" danger disabled={context.busy}>
            {context.t('noticeRules.delete')}
          </Button>
        </Popconfirm>
      </Space>
    )
  };
}

function NoticeRuleResults({
  state,
  columns,
  pageIndex,
  pageSize,
  actions
}: NoticeRuleTableProps & {
  columns: ColumnsType<NoticeRule>;
}) {
  const { t } = useTranslation();
  if (['invalid', 'unavailable', 'error'].includes(state.kind)) {
    return <Alert type="error" showIcon message={t(`noticeRules.read.${state.kind}`)} />;
  }
  if (state.kind === 'empty') return <Empty description={t('noticeRules.empty')} />;
  const records = state.kind === 'ready' ? state.records : [];
  return (
    <Table<NoticeRule>
      rowKey="id"
      size="small"
      loading={state.kind === 'loading'}
      dataSource={records}
      columns={columns}
      scroll={{ x: 1460 }}
      pagination={{
        current: pageIndex + 1,
        pageSize,
        pageSizeOptions: [...noticeRulePageSizes],
        showSizeChanger: true,
        total: state.kind === 'ready' ? state.total : 0,
        onChange: actions.changePage
      }}
    />
  );
}

function formatRuleTime(rule: NoticeRule) {
  const value = rule.gmtUpdate ?? rule.gmtCreate;
  if (value == null) return '—';
  const timestamp = typeof value === 'number' ? value : Date.parse(value);
  return Number.isFinite(timestamp)
    ? new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'medium' }).format(timestamp)
    : '—';
}

function scheduleText(t: TFunction, rule: NoticeRule) {
  const days =
    rule.days?.length && rule.days.length < 7
      ? t('noticeRules.selectedDays', { count: rule.days.length })
      : t('noticeRules.everyDay');
  if (!rule.periodStart || !rule.periodEnd) return days;
  const draft = noticeRuleDraftFromDetail(rule);
  return `${days} · ${draft.periodStart}-${draft.periodEnd}`;
}
