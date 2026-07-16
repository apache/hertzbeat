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
import { Alert, Empty, Skeleton, Statistic, Table, Tag, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import { apiMessageGet } from '@/core/http/api-message';

import { type AppCount, hasMonitorData, monitorTotals } from './dashboard-model';
import styles from './dashboard-page.module.css';

type DashboardSummary = { apps: AppCount[] | null };
type AlertSummary = {
  total: number;
  dealNum: number;
  rate: number;
  priorityWarningNum: number;
  priorityCriticalNum: number;
  priorityEmergencyNum: number;
};

function DashboardFeedback({ failed, missing }: { failed: boolean; missing: boolean }) {
  const { t } = useTranslation();
  if (failed) return <Alert type="error" showIcon message={t('common.unavailable')} />;
  if (missing) return <Alert type="warning" showIcon message={t('dashboard.summaryUnavailable')} />;
  return null;
}

function DashboardResults({ appsPayload, alertTotal }: {
  appsPayload: AppCount[] | null;
  alertTotal: number;
}) {
  const { t } = useTranslation();
  const apps = hasMonitorData(appsPayload) ? appsPayload : [];
  const totals = monitorTotals(apps);
  return (
    <>
      {hasMonitorData(appsPayload) && (
        <section className={styles.metrics} aria-label={t('dashboard.monitorSummary')}>
          <Statistic title={t('dashboard.total')} value={totals.total} />
          <Statistic title={t('dashboard.available')} value={totals.available} />
          <Statistic title={t('dashboard.unavailable')} value={totals.unavailable} />
          <Statistic title={t('dashboard.alerts')} value={alertTotal} />
        </section>
      )}
      <section className={styles.section}>
        <Typography.Title level={4}>{t('dashboard.distribution')}</Typography.Title>
        {apps.length === 0 ? <Empty description={t('dashboard.empty')} /> : (
          <Table<AppCount>
            rowKey={row => `${row.category}-${row.app}`}
            pagination={false}
            size="small"
            dataSource={apps}
            columns={[
              { title: t('dashboard.application'), dataIndex: 'app' },
              { title: t('dashboard.category'), dataIndex: 'category' },
              { title: t('dashboard.total'), dataIndex: 'size' },
              {
                title: t('dashboard.available'),
                dataIndex: 'availableSize',
                render: (value: number) => <Tag color="green">{value}</Tag>
              },
              {
                title: t('dashboard.unavailable'),
                dataIndex: 'unAvailableSize',
                render: (value: number) => <Tag color={value > 0 ? 'red' : 'default'}>{value}</Tag>
              }
            ]}
          />
        )}
      </section>
    </>
  );
}

export function DashboardPage() {
  const { t } = useTranslation();
  const summary = useQuery({ queryKey: ['dashboard-summary'], queryFn: () => apiMessageGet<DashboardSummary>('/api/summary') });
  const alerts = useQuery({ queryKey: ['alert-summary'], queryFn: () => apiMessageGet<AlertSummary>('/api/alerts/summary') });
  const appsPayload = summary.data?.apps ?? null;
  const pending = summary.isPending || alerts.isPending;

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <Typography.Title level={2}>{t('dashboard.title')}</Typography.Title>
        <Typography.Text type="secondary">{t('dashboard.description')}</Typography.Text>
      </header>
      <DashboardFeedback
        failed={summary.isError || alerts.isError}
        missing={summary.isSuccess && !hasMonitorData(appsPayload)}
      />
      {pending ? <Skeleton active /> : (
        <DashboardResults appsPayload={appsPayload} alertTotal={alerts.data?.total ?? 0} />
      )}
    </div>
  );
}
