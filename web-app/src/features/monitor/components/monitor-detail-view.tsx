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

import { Alert, Button, Descriptions, Empty, Space, Spin, Tag, Typography } from 'antd';
import type { DescriptionsProps } from 'antd';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import type {
  MonitorDetailEvidence, MonitorDetailViewActions, MonitorDetailViewState
} from '../model/monitor-detail-model';
import { monitorStatusColor, monitorStatusKey } from '../model/monitor-model';
import styles from './monitor-detail-view.module.css';

type Translator = (key: string) => string;
type DetailMonitor = Extract<MonitorDetailEvidence, { kind: 'ready' }>['detail']['monitor'];

export function MonitorDetailView({ state, actions, metricWorkbench }: {
  state: MonitorDetailViewState; actions: MonitorDetailViewActions; metricWorkbench?: ReactNode;
}) {
  const { t } = useTranslation();
  if (state.detail.kind === 'loading') return <div role="status"><Spin /></div>;
  if (state.detail.kind === 'missing') return <Empty description={t('common.notFound.description')} />;
  if (state.detail.kind === 'unavailable') return <Alert type="warning" showIcon message={t('common.unavailable')} />;
  if (state.detail.kind === 'error') return <Alert type="error" showIcon message={t('common.routeError.description')} />;
  const { monitor } = state.detail.detail;
  return <div className={styles.page}>
    <header className={styles.heading}>
      <div>
        <Typography.Title level={2}>{monitor.name}</Typography.Title>
        <Typography.Text type="secondary">{monitor.instance}</Typography.Text>
      </div>
      <Space>
        <Button onClick={actions.back}>{t('common.back')}</Button>
        <Button type="primary" onClick={actions.edit}>{t('common.edit')}</Button>
      </Space>
    </header>
    <Descriptions size="small" column={2} items={monitorDescriptionItems(t, monitor)} />
    {metricWorkbench}
  </div>;
}

function monitorDescriptionItems(t: Translator, monitor: DetailMonitor): NonNullable<DescriptionsProps['items']> {
  return [
    { key: 'status', label: t('monitor.status.label'),
      children: <Tag color={monitorStatusColor(monitor.status)}>{t(monitorStatusKey(monitor.status))}</Tag> },
    { key: 'app', label: t('monitor.application'), children: monitor.app },
    { key: 'instance', label: t('monitor.editor.endpoint'), children: monitor.instance },
    { key: 'interval', label: t('monitor.editor.interval'), children: monitor.intervals ?? '—' },
    { key: 'description', label: t('monitor.editor.descriptionLabel'), children: monitor.description || '—', span: 2 }
  ];
}
