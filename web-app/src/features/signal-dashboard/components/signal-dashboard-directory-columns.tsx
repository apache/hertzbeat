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

import { Button, Space } from 'antd';
import type { TFunction } from 'i18next';
import type { TableColumnsType } from 'antd';
import { exportDashboardRecord } from '../model/signal-dashboard-download';
import { readSignalDashboard, type SignalDashboardRecord } from '../model/signal-dashboard-record';
import type { DashboardViewProps } from '../model/signal-dashboard-view-model';
import { SignalDashboardUpdatedTime } from './signal-dashboard-updated-time';

export function signalDashboardDirectoryColumns(
  { state, actions }: DashboardViewProps,
  t: TFunction
): TableColumnsType<SignalDashboardRecord> {
  return [
    {
      title: t('signalDashboard.name'),
      render: (_, record) => (
        <div>
          <strong>{record.title}</strong>
          <div>{record.description}</div>
        </div>
      )
    },
    {
      title: t('signalDashboard.state'),
      render: (_, record) => t(`signalDashboard.${readSignalDashboard(record).kind}`)
    },
    {
      title: t('signalDashboard.updated'),
      dataIndex: 'updateTime',
      render: (value: string | null | undefined) => (
        <SignalDashboardUpdatedTime value={value} timeZone={state.timeZone} />
      )
    },
    {
      title: t('common.actions'),
      render: (_, record) => (
        <Space size="small" wrap>
          <Button onClick={() => actions.open(record.dashboardKey)}>{t('signalDashboard.open')}</Button>
          <Button onClick={() => exportDashboardRecord(record)}>{t('signalDashboard.exportOriginal')}</Button>
          {state.incoming && state.canWrite && (
            <Button
              disabled={readSignalDashboard(record).kind !== 'document'}
              onClick={() => actions.receive(record.dashboardKey)}
            >
              {t('signalDashboard.appendPanel')}
            </Button>
          )}
        </Space>
      )
    }
  ];
}
