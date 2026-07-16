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

import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Descriptions, Empty, Space, Spin, Tag, Typography } from 'antd';
import type { DescriptionsProps } from 'antd';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { loadMonitorDetail, type Monitor } from './monitor-api';
import { monitorStatusColor, monitorStatusKey, safeMonitorReturnTo } from './monitor-model';
import { MonitorMetricWorkbench } from './monitor-metric-workbench';
import styles from './monitor-detail-page.module.css';

type Translator = (key: string) => string;

function monitorDescriptionItems(t: Translator, monitor: Monitor): NonNullable<DescriptionsProps['items']> {
  return [
    {
      key: 'status',
      label: t('monitor.status.label'),
      children: <Tag color={monitorStatusColor(monitor.status)}>{t(monitorStatusKey(monitor.status))}</Tag>
    },
    { key: 'app', label: t('monitor.application'), children: monitor.app },
    { key: 'instance', label: t('monitor.editor.endpoint'), children: monitor.instance },
    { key: 'interval', label: t('monitor.editor.interval'), children: monitor.intervals ?? '—' },
    { key: 'description', label: t('monitor.editor.descriptionLabel'), children: monitor.description || '—', span: 2 }
  ];
}

export function MonitorDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { monitorId = '' } = useParams();
  const [searchParams] = useSearchParams();
  const returnTo = safeMonitorReturnTo(searchParams.get('returnTo'));
  const query = useQuery({ queryKey: ['monitor-detail', monitorId], queryFn: () => loadMonitorDetail(monitorId), enabled: Boolean(monitorId) });
  if (query.isError) return <Alert type="error" showIcon message={t('common.unavailable')} />;
  if (query.isPending) return <Spin />;
  if (!query.isPending && !query.data) return <Empty description={t('monitor.empty')} />;
  const monitor = query.data?.monitor;
  if (!monitor) return <Empty description={t('monitor.empty')} />;
  return <div className={styles.page}>
    <header className={styles.heading}>
      <div>
        <Typography.Title level={2}>{monitor.name}</Typography.Title>
        <Typography.Text type="secondary">{monitor.instance}</Typography.Text>
      </div>
      <Space>
        <Button onClick={() => void navigate(returnTo)}>{t('common.back')}</Button>
        <Button type="primary" onClick={() => void navigate(`/monitors/${monitorId}/edit?returnTo=${encodeURIComponent(returnTo)}`)}>
          {t('common.edit')}
        </Button>
      </Space>
    </header>
    <Descriptions size="small" column={2} items={monitorDescriptionItems(t, monitor)} />
    <MonitorMetricWorkbench monitor={monitor} metrics={query.data.metrics ?? []} />
  </div>;
}
