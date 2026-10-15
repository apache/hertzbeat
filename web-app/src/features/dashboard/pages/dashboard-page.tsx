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

import { Select } from 'antd';
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
        <div className={styles.summary}>
          <DashboardMonitorStatus overview={start.overview} />
          <DashboardAttention
            overview={start.overview}
            rotation={start.attentionRotation}
            actions={
              <div className={styles.pageActions}>
                <DashboardSetupActions
                  canCreateMonitor={start.canCreateMonitor}
                  createMonitorTarget={start.createMonitorTarget}
                  telemetryTarget={start.telemetryTarget}
                />
              </div>
            }
          />
        </div>
        <section aria-label={t('dashboard.v3.signalOverview')} className={styles.signalSection}>
          <DashboardScopeHeader signals={signals} />
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

function DashboardScopeHeader({ signals }: { signals: ReturnType<typeof useDashboardStartController>['signals'] }) {
  const { t } = useTranslation();
  return (
    <div className={styles.scopeHeader}>
      <div className={styles.scopeControls}>
        <Select
          aria-label={t('dashboard.v2.service')}
          placeholder={scopePlaceholder(signals, 'service', t)}
          disabled={!signals.serviceName && (signals.catalogState !== 'ready' || signals.options.length === 0)}
          allowClear
          showSearch
          value={signals.serviceName || undefined}
          onChange={value => signals.setService(value ?? '')}
          options={[...new Set(signals.options.map(entity => entity.name))].map(name => ({
            value: name,
            label: name
          }))}
        />
        <Select
          aria-label={t('dashboard.v2.environment')}
          placeholder={scopePlaceholder(signals, 'environment', t)}
          disabled={
            !signals.environment &&
            (signals.catalogState !== 'ready' || !signals.options.some(entity => entity.environment))
          }
          allowClear
          showSearch
          value={signals.environment || undefined}
          onChange={value => signals.setEnvironment(value ?? '')}
          options={[
            ...new Set(signals.options.flatMap(entity => (entity.environment ? [entity.environment] : [])))
          ].map(name => ({ value: name, label: name }))}
        />
      </div>
    </div>
  );
}

function scopePlaceholder(
  signals: ReturnType<typeof useDashboardStartController>['signals'],
  scope: 'service' | 'environment',
  t: (key: string) => string
) {
  if (signals.catalogState === 'loading') return t(`dashboard.v2.${scope}Loading`);
  if (signals.catalogState === 'error') return t(`dashboard.v2.${scope}Unavailable`);
  const available =
    scope === 'service' ? signals.options.length > 0 : signals.options.some(entity => entity.environment);
  return t(
    available ? `dashboard.v2.${scope === 'service' ? 'allServices' : 'allEnvironments'}` : `dashboard.v2.${scope}Empty`
  );
}
