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

import { Button, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { SortOrder } from 'antd/es/table/interface';
import type { TFunction } from 'i18next';

import type { Monitor } from '../model/monitor-contract';
import { monitorDiscoveryTypeKey } from '../model/monitor-model';

import styles from './monitor-list.module.css';

type MonitorIdentityActions = {
  changeApp: (app: string) => void;
  copyInstance: (instance: string) => Promise<boolean>;
};

export function monitorIdentityColumns(
  t: TFunction,
  nameSortOrder: SortOrder,
  actions: MonitorIdentityActions,
  operating: boolean
): ColumnsType<Monitor> {
  return [
    {
      title: t('monitor.name'),
      dataIndex: 'name',
      sorter: true,
      sortOrder: nameSortOrder,
      render: (_value: string, row) => (
        <div className={styles.name}>
          <strong>{row.name}</strong>
          {renderMonitorTarget(row, actions.copyInstance, t)}
          {renderMonitorLabels(row.labels)}
        </div>
      )
    },
    {
      title: t('monitor.application'),
      dataIndex: 'app',
      render: (value: string) => (
        <Button
          type="link"
          size="small"
          className={styles.appFilter ?? ''}
          disabled={operating}
          onClick={() => actions.changeApp(value)}
        >
          {value}
        </Button>
      )
    }
  ];
}

function renderMonitorTarget(monitor: Monitor, copyInstance: MonitorIdentityActions['copyInstance'], t: TFunction) {
  const discoveryTypeKey = monitorDiscoveryTypeKey(monitor.scrape);
  if (discoveryTypeKey) return <span>{t(discoveryTypeKey)}</span>;
  return (
    <Button
      type="link"
      className={styles.endpoint ?? ''}
      aria-label={t('monitor.copyEndpoint', { instance: monitor.instance })}
      onClick={() => void copyInstance(monitor.instance)}
    >
      {monitor.instance}
    </Button>
  );
}

function renderMonitorLabels(labels: Record<string, string> | null | undefined) {
  if (!labels) return null;
  const entries = Object.entries(labels).sort(([left], [right]) => left.localeCompare(right));
  if (entries.length === 0) return null;
  return (
    <div className={styles.rowLabels}>
      {entries.map(([key, value]) => (
        <Tag key={key}>{`${key}:${value}`}</Tag>
      ))}
    </div>
  );
}
