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

import { useTranslation } from 'react-i18next';
import { OperationalPage } from '@/shared/operational-page';
import { DashboardMonitorStatus, DashboardAttention, DashboardContinue } from '../components/dashboard-overview';
import { DashboardSetupActions } from '../components/dashboard-setup-actions';
import { DashboardMetricPreview } from '../components/dashboard-metric-preview';
import { DashboardLogPreview } from '../components/dashboard-log-preview';
import { DashboardTracePreview } from '../components/dashboard-trace-preview';
import styles from '../components/dashboard-start.module.css';
import { useDashboardStartController } from '../controller/use-dashboard-start-controller';

export function DashboardPage() {
  const { t } = useTranslation();
  const start = useDashboardStartController();
  const signals = start.signals;
  return (
    <div className={styles.page}>
      <OperationalPage mode="workspace">
        <div className={styles.pageActions}>
          <DashboardSetupActions
            canCreateMonitor={start.canCreateMonitor}
            createMonitorTarget={start.createMonitorTarget}
            telemetryTarget={start.telemetryTarget}
          />
        </div>
        <div className={styles.summary}>
          <DashboardMonitorStatus overview={start.overview} />
          <DashboardAttention overview={start.overview} rotation={start.attentionRotation} />
        </div>
        <section aria-label={t('dashboard.v3.signalOverview')} className={styles.signalSection}>
          <div className={styles.signalGrid}>
            <DashboardMetricPreview signals={signals} />
            <DashboardLogPreview signals={signals} />
            <DashboardTracePreview signals={signals} />
          </div>
        </section>
        <DashboardContinue overview={start.overview} directoryTarget={start.savedQueriesTarget} />
      </OperationalPage>
    </div>
  );
}
