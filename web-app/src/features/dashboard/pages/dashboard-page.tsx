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
import { Link } from 'react-router-dom';

import { alertRoutePaths, monitorRoutePaths } from '@/shared/navigation/app-paths';
import { OperationalPage, OperationalPageHeader } from '@/shared/operational-page';
import { DashboardAlertSummary } from '../components/dashboard-alert-results';
import { DashboardCollectorResults } from '../components/dashboard-collector-results';
import { DashboardMonitorDistribution, DashboardMonitorSummary } from '../components/dashboard-monitor-results';
import { DashboardLabelResults } from '../components/dashboard-label-results';
import { DashboardRecentAlertResults } from '../components/dashboard-recent-alert-results';
import { useDashboardController } from '../controller/use-dashboard-controller';
import styles from '../components/dashboard.module.css';

export function DashboardPage() {
  const { t } = useTranslation();
  const dashboard = useDashboardController();
  return (
    <OperationalPage>
      <OperationalPageHeader
        title={t('dashboard.title')}
        description={t('dashboard.description')}
        actions={
          <Button
            onClick={() => {
              void dashboard.refresh();
            }}
          >
            {t('common.refresh')}
          </Button>
        }
      />
      <section className={styles.summaryBoard} aria-label={t('dashboard.operationsSummary')}>
        <section className={styles.summaryRow} aria-label={t('dashboard.monitorSummary')}>
          <div className={styles.summaryIdentity}>
            <Typography.Text strong>{t('dashboard.monitorSummary')}</Typography.Text>
            <Link to={monitorRoutePaths.list}>{t('dashboard.openMonitors')}</Link>
          </div>
          <DashboardMonitorSummary state={dashboard.monitorState} />
        </section>
        <section className={styles.summaryRow} aria-label={t('dashboard.alertSummary')}>
          <div className={styles.summaryIdentity}>
            <Typography.Text strong>{t('dashboard.alertSummary')}</Typography.Text>
            <Link to={alertRoutePaths.center}>{t('dashboard.openAlerts')}</Link>
          </div>
          <DashboardAlertSummary state={dashboard.alertState} />
        </section>
      </section>
      <DashboardRecentAlertResults state={dashboard.recentAlertState} />
      <DashboardLabelResults state={dashboard.labelState} />
      <DashboardMonitorDistribution state={dashboard.monitorState} />
      <DashboardCollectorResults state={dashboard.collectorState} />
    </OperationalPage>
  );
}
