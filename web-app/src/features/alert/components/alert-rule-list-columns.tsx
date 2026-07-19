/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import type { ColumnsType } from 'antd/es/table';
import type { TFunction } from 'i18next';

import type { AlertRule } from '../alert-rule-model';
import {
  AlertRuleActionCell,
  AlertRuleEnabledCell,
  AlertRuleIdentityCell,
  AlertRuleTypeCell,
  type AlertRuleColumnActions
} from './alert-rule-list-table-cells';

export function buildAlertRuleListColumns(t: TFunction, actions: AlertRuleColumnActions): ColumnsType<AlertRule> {
  return [
    { title: t('alertRules.name'), width: 250, render: (_value, rule) => <AlertRuleIdentityCell rule={rule} /> },
    { title: t('alertRules.type'), width: 190, render: (_value, rule) => <AlertRuleTypeCell rule={rule} /> },
    { title: t('alertRules.period'), dataIndex: 'period', width: 150, render: nullableNumber },
    { title: t('alertRules.times'), dataIndex: 'times', width: 130, render: nullableNumber },
    {
      title: t('alertRules.enabled'),
      dataIndex: 'enable',
      width: 100,
      render: (enabled: boolean, rule) => <AlertRuleEnabledCell actions={actions} enabled={enabled} rule={rule} />
    },
    { title: t('alertRules.updated'), width: 190, render: (_value, rule) => rule.gmtUpdate ?? rule.gmtCreate ?? '—' },
    {
      title: t('common.actions'),
      width: 150,
      render: (_value, rule) => <AlertRuleActionCell actions={actions} rule={rule} t={t} />
    }
  ];
}

function nullableNumber(value: number | null) {
  return value ?? '—';
}
