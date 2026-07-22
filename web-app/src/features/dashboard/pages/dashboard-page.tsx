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
import { Button, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { DashboardAlertSummary } from '../components/dashboard-alert-results';
import { DashboardMonitorDistribution, DashboardMonitorSummary } from '../components/dashboard-monitor-results';
import { useDashboardController } from '../controller/use-dashboard-controller';
import styles from '../components/dashboard.module.css';

export function DashboardPage() {
  const { t } = useTranslation();
  const dashboard = useDashboardController();
  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div>
          <Typography.Title level={2}>{t('dashboard.title')}</Typography.Title>
          <Typography.Text type="secondary">{t('dashboard.description')}</Typography.Text>
        </div>
        <Button
          onClick={() => {
            void dashboard.refresh();
          }}
        >
          {t('common.refresh')}
        </Button>
      </header>
      <div className={styles.metrics}>
        <section className={styles.monitorMetrics} aria-label={t('dashboard.monitorSummary')}>
          <DashboardMonitorSummary state={dashboard.monitorState} />
        </section>
        <section className={styles.alertMetric} aria-label={t('dashboard.alertSummary')}>
          <DashboardAlertSummary state={dashboard.alertState} />
        </section>
      </div>
      <DashboardMonitorDistribution state={dashboard.monitorState} />
    </div>
  );
}
