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
import { Alert, Button, Descriptions, Empty, Space, Tag, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import { loadMonitorDetail } from './monitor-api';
import { monitorStatusColor, monitorStatusKey } from './monitor-model';

export function MonitorDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { monitorId = '' } = useParams();
  const query = useQuery({ queryKey: ['monitor-detail', monitorId], queryFn: () => loadMonitorDetail(monitorId), enabled: Boolean(monitorId) });
  if (query.isError) return <Alert type="error" showIcon message={t('common.unavailable')} />;
  if (!query.isPending && !query.data) return <Empty description={t('monitor.empty')} />;
  const monitor = query.data?.monitor;
  return <div><Space direction="vertical" size="large" style={{ width: '100%' }}><header><Typography.Title level={2}>{monitor?.name ?? t('monitor.detail')}</Typography.Title><Typography.Text type="secondary">{monitor?.instance}</Typography.Text></header><Space><Button onClick={() => void navigate('/monitors')}>{t('common.back')}</Button><Button type="primary" onClick={() => void navigate(`/monitors/${monitorId}/edit`)}>{t('common.edit')}</Button></Space>{monitor && <Descriptions bordered size="small" column={2} items={[{ key: 'status', label: t('monitor.status.label'), children: <Tag color={monitorStatusColor(monitor.status)}>{t(monitorStatusKey(monitor.status))}</Tag> }, { key: 'app', label: t('monitor.application'), children: monitor.app }, { key: 'instance', label: t('monitor.editor.endpoint'), children: monitor.instance }, { key: 'interval', label: t('monitor.editor.interval'), children: monitor.intervals ?? '—' }, { key: 'description', label: t('monitor.editor.descriptionLabel'), children: monitor.description || '—', span: 2 }]} />}</Space></div>;
}
