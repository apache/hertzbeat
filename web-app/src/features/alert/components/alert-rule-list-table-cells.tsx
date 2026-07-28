/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Button, Popconfirm, Space, Switch, Tag, Typography } from 'antd';
import type { TFunction } from 'i18next';

import type { AlertRule } from '../model/alert-rule-model';
import styles from '../shared/alert-rule-list.module.css';

export type AlertRuleColumnActions = {
  busy: boolean;
  canDelete: boolean;
  canWrite: boolean;
  edit: (id: number) => unknown;
  toggle: (rule: AlertRule, enabled: boolean) => unknown;
  remove: (id: number) => unknown;
};

export function AlertRuleIdentityCell({ rule }: { rule: AlertRule }) {
  return (
    <div className={styles.name}>
      <strong>{rule.name || `#${rule.id}`}</strong>
      <span>{rule.expr ?? '—'}</span>
    </div>
  );
}

export function AlertRuleTypeCell({ rule }: { rule: AlertRule }) {
  return (
    <Space direction="vertical" size={2}>
      {rule.type === null ? '—' : <Tag>{rule.type}</Tag>}
      <Typography.Text type="secondary">{rule.datasource ?? '—'}</Typography.Text>
    </Space>
  );
}

export function AlertRuleEnabledCell({
  actions,
  enabled,
  rule
}: {
  actions: AlertRuleColumnActions;
  enabled: boolean;
  rule: AlertRule;
}) {
  return (
    <Switch
      checked={enabled}
      disabled={actions.busy || !actions.canWrite}
      onChange={next => void actions.toggle(rule, next)}
    />
  );
}

export function AlertRuleActionCell({
  actions,
  rule,
  t
}: {
  actions: AlertRuleColumnActions;
  rule: AlertRule;
  t: TFunction;
}) {
  return (
    <Space>
      <Button type="link" disabled={actions.busy || !actions.canWrite} onClick={() => void actions.edit(rule.id)}>
        {t('common.edit')}
      </Button>
      <Popconfirm
        title={t('alertRules.deleteConfirm')}
        disabled={actions.busy || !actions.canDelete}
        okButtonProps={{ disabled: actions.busy || !actions.canDelete }}
        onConfirm={() => {
          if (!actions.busy && actions.canDelete) return actions.remove(rule.id);
        }}
      >
        <Button type="link" danger disabled={actions.busy || !actions.canDelete}>
          {t('alertRules.delete')}
        </Button>
      </Popconfirm>
    </Space>
  );
}
