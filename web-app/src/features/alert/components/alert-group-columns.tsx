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

import { Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { TFunction } from 'i18next';

import type { AlertGroupConverge } from '../model/alert-group-model';
import styles from '../shared/alert-policy-page.module.css';
import { AlertGroupActionCell, AlertGroupEnabledCell, type AlertGroupColumnActions } from './alert-group-table-cells';

export function buildAlertGroupColumns(
  t: TFunction,
  actions: AlertGroupColumnActions
): ColumnsType<AlertGroupConverge> {
  const seconds = (value: number | null) => (value === null ? '—' : t('alertGroups.seconds', { value }));
  return [
    { title: t('alertGroups.name'), dataIndex: 'name', width: 140 },
    { title: t('alertGroups.labels'), dataIndex: 'groupLabels', width: 120, render: renderLabels },
    { title: t('alertGroups.wait'), dataIndex: 'groupWait', width: 110, render: seconds },
    { title: t('alertGroups.interval'), dataIndex: 'groupInterval', width: 120, render: seconds },
    { title: t('alertGroups.repeat'), dataIndex: 'repeatInterval', width: 120, render: seconds },
    {
      title: t('alertGroups.enabled'),
      dataIndex: 'enable',
      width: 90,
      render: (value: boolean | null, group) => <AlertGroupEnabledCell actions={actions} group={group} value={value} />
    },
    {
      title: t('alertGroups.updated'),
      dataIndex: 'gmtUpdate',
      width: 170,
      render: (value: string | null) => value ?? '—'
    },
    {
      title: t('common.actions'),
      width: 100,
      render: (_value, group) => <AlertGroupActionCell actions={actions} group={group} t={t} />
    }
  ];
}

function renderLabels(labels: string[] | null) {
  return (
    <div className={styles.labels}>
      {(labels ?? []).map(label => (
        <Tag key={label}>{label}</Tag>
      ))}
    </div>
  );
}
