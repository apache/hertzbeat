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
  return <strong className={styles.name}>{rule.name || `#${rule.id}`}</strong>;
}

export function AlertRuleTypeCell({ rule, t }: { rule: AlertRule; t: TFunction }) {
  if (rule.type === null) return '—';
  const [kind, dataType] = rule.type.split('_');
  return (
    <Space direction="vertical" size={2}>
      <Tag>
        {t(`alertRules.kind.${kind}`)} · {t(`alertRules.dataType.${dataType}`)}
      </Tag>
      <Typography.Text type="secondary">{rule.datasource ?? '—'}</Typography.Text>
    </Space>
  );
}

export function AlertRuleTextCell({ value }: { value: string | null }) {
  if (!value) return '—';
  return (
    <Typography.Text className={styles.truncated ?? ''} ellipsis={{ tooltip: value }}>
      {value}
    </Typography.Text>
  );
}

export function AlertRuleLabelsCell({ labels }: { labels: Record<string, string> | null }) {
  const entries = Object.entries(labels ?? {});
  if (entries.length === 0) return '—';
  return (
    <Space className={styles.labels ?? ''} size={[4, 4]} wrap>
      {entries.map(([key, value]) => (
        <Tag key={key}>{`${key}:${value}`}</Tag>
      ))}
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
