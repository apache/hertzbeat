/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Button, Popconfirm, Space, Switch, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { TFunction } from 'i18next';

import styles from '../../shared/alert-policy-page.module.css';
import type { NoticeRuleActionCapabilities } from '../model/notice-rule-action-capability';
import { noticeRuleDraftFromDetail, type NoticeRule } from '../model/notice-rule-model';

export type NoticeRuleTableColumnActions = {
  edit: (id: number) => void;
  remove: (rule: NoticeRule) => void;
  toggle: (rule: NoticeRule, enable: boolean) => void;
};

type NoticeRuleColumnContext = {
  actions: NoticeRuleTableColumnActions;
  busy: boolean;
  capabilities: NoticeRuleActionCapabilities;
  dependenciesReady: boolean;
  t: TFunction;
  togglingRuleId: number | null;
};

export function buildNoticeRuleTableColumns(context: NoticeRuleColumnContext): ColumnsType<NoticeRule> {
  return [
    { title: context.t('noticeRules.name'), dataIndex: 'name', width: 210 },
    receiverColumn(context.t),
    templateColumn(context.t),
    scopeColumn(context.t),
    { title: context.t('noticeRules.schedule'), width: 210, render: (_value, rule) => scheduleText(context.t, rule) },
    { title: context.t('noticeRules.updated'), width: 190, render: (_value, rule) => formatRuleTime(rule) },
    enabledColumn(context),
    ...(context.capabilities.canEdit || context.capabilities.canDelete ? [actionColumn(context)] : [])
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

function enabledColumn(context: NoticeRuleColumnContext): ColumnsType<NoticeRule>[number] {
  return {
    title: context.t('noticeRules.enabled'),
    key: 'enabled',
    width: 100,
    fixed: 'right',
    render: (_value, rule) =>
      context.capabilities.canToggle ? (
        <Switch
          checked={rule.enable}
          disabled={context.busy || !context.dependenciesReady}
          loading={context.togglingRuleId === rule.id}
          onClick={enable => context.actions.toggle(rule, enable)}
        />
      ) : (
        <Tag color={rule.enable ? 'success' : 'default'}>
          {context.t(rule.enable ? 'noticeRules.enabled' : 'noticeRules.disabled')}
        </Tag>
      )
  };
}

function actionColumn(context: NoticeRuleColumnContext): ColumnsType<NoticeRule>[number] {
  return {
    title: context.t('common.actions'),
    key: 'actions',
    width: 160,
    fixed: 'right',
    render: (_value, rule) => (
      <Space>
        {context.capabilities.canEdit ? (
          <Button
            type="link"
            disabled={context.busy || !context.dependenciesReady}
            onClick={() => context.actions.edit(rule.id)}
          >
            {context.t('common.edit')}
          </Button>
        ) : null}
        {context.capabilities.canDelete ? (
          <Popconfirm title={context.t('noticeRules.deleteConfirm')} onConfirm={() => context.actions.remove(rule)}>
            <Button type="link" danger disabled={context.busy}>
              {context.t('noticeRules.delete')}
            </Button>
          </Popconfirm>
        ) : null}
      </Space>
    )
  };
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
