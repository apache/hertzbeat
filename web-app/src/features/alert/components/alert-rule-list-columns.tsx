/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import type { ColumnsType } from 'antd/es/table';
import type { TFunction } from 'i18next';

import type { AlertRule } from '../model/alert-rule-model';
import {
  AlertRuleActionCell,
  AlertRuleEnabledCell,
  AlertRuleIdentityCell,
  AlertRuleLabelsCell,
  AlertRuleTextCell,
  AlertRuleTypeCell,
  type AlertRuleColumnActions
} from './alert-rule-list-table-cells';

export function buildAlertRuleListColumns(t: TFunction, actions: AlertRuleColumnActions): ColumnsType<AlertRule> {
  return [
    { title: t('alertRules.name'), width: 220, render: (_value, rule) => <AlertRuleIdentityCell rule={rule} /> },
    { title: t('alertRules.type'), width: 180, render: (_value, rule) => <AlertRuleTypeCell rule={rule} t={t} /> },
    {
      title: t('alertRules.expression'),
      dataIndex: 'expr',
      width: 280,
      render: (value: string | null) => <AlertRuleTextCell value={value} />
    },
    {
      title: t('alertRules.template'),
      dataIndex: 'template',
      width: 260,
      render: (value: string | null) => <AlertRuleTextCell value={value} />
    },
    {
      title: t('alertRules.labels'),
      dataIndex: 'labels',
      width: 240,
      render: (value: Record<string, string> | null) => <AlertRuleLabelsCell labels={value} />
    },
    {
      title: t('alertRules.enabled'),
      dataIndex: 'enable',
      width: 100,
      render: (enabled: boolean, rule) => <AlertRuleEnabledCell actions={actions} enabled={enabled} rule={rule} />
    },
    {
      title: t('common.actions'),
      width: 150,
      render: (_value, rule) => <AlertRuleActionCell actions={actions} rule={rule} t={t} />
    }
  ];
}
