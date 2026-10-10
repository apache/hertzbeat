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

import type { ColumnsType } from 'antd/es/table';
import type { TFunction } from 'i18next';

import { AlertRuleExpressionCell } from './alert-rule-expression-cell';
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
    {
      title: t('alertRules.name'),
      width: 220,
      fixed: 'left',
      render: (_value, rule) => <AlertRuleIdentityCell rule={rule} />
    },
    { title: t('alertRules.type'), width: 180, render: (_value, rule) => <AlertRuleTypeCell rule={rule} t={t} /> },
    {
      title: t('alertRules.expression'),
      dataIndex: 'expr',
      width: 280,
      render: (value: string | null, rule) => (
        <AlertRuleExpressionCell value={value} name={rule.name || `#${rule.id}`} />
      )
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
      fixed: 'right',
      render: (enabled: boolean, rule) => <AlertRuleEnabledCell actions={actions} enabled={enabled} rule={rule} />
    },
    {
      title: t('common.actions'),
      width: 150,
      fixed: 'right',
      render: (_value, rule) => <AlertRuleActionCell actions={actions} rule={rule} t={t} />
    }
  ];
}
