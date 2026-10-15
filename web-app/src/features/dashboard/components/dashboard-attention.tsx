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
import { Link } from 'react-router-dom';
import { alertRoutePaths } from '@/shared/navigation/app-paths';
import type { DashboardOverview } from '../model/dashboard-overview';
import type { DashboardRotation } from '../model/dashboard-signals';
import { DashboardAlertRows, DashboardDownRows } from './dashboard-attention-rows';
import { DashboardRotationControls } from './dashboard-rotation-controls';
import styles from './dashboard-overview.module.css';

type Props = { overview: DashboardOverview; rotation: DashboardRotation };
export function DashboardAttention({ overview, rotation }: Props) {
  const { t } = useTranslation();
  const offset = rotation.activeIndex * 2;
  const alerts = overview.alerts.slice(offset, offset + 2);
  const monitors = overview.downMonitors.slice(
    Math.max(0, offset - overview.alerts.length),
    Math.max(0, offset + 2 - overview.alerts.length)
  );
  if (isEmptyAttention(overview))
    return (
      <section className={styles.quietAttention} aria-label={t('dashboard.v2.attention')}>
        <p>{t('dashboard.v2.noAttention')}</p>
        <Link to={`${alertRoutePaths.center}?status=firing`}>{t('dashboard.v3.allAlerts')}</Link>
      </section>
    );
  return (
    <section
      className={styles.attentionSection}
      aria-label={t('dashboard.v2.attention')}
      onMouseEnter={() => rotation.setMetricInteracting(true)}
      onMouseLeave={() => rotation.setMetricInteracting(false)}
      onFocusCapture={() => rotation.setMetricInteracting(true)}
      onBlurCapture={event => {
        if (!event.currentTarget.contains(event.relatedTarget)) rotation.setMetricInteracting(false);
      }}
    >
      <div className={styles.attentionTools}>
        <AttentionSummary overview={overview} />
        {rotation.metricCount > 1 && <DashboardRotationControls signals={rotation} />}
        <Link to={`${alertRoutePaths.center}?status=firing`}>{t('dashboard.v3.allAlerts')}</Link>
      </div>
      <div className={styles.attentionList}>
        {overview.alertState !== 'ready' && <StateLine state={overview.alertState} />}
        <div className={`${styles.attentionPage} ${rotation.metricExiting ? styles.attentionExiting : ''}`}>
          <DashboardAlertRows alerts={alerts} />
          <DashboardDownRows monitors={monitors} />
        </div>
        {overview.downState !== 'ready' && <StateLine state={overview.downState} />}
      </div>
    </section>
  );
}

function isEmptyAttention(overview: DashboardOverview) {
  return (
    overview.alertState === 'ready' &&
    overview.downState === 'ready' &&
    !overview.alerts.length &&
    !overview.alertTotal &&
    !overview.downMonitors.length &&
    !overview.distribution?.counts[2]
  );
}
function StateLine({ state }: { state: string }) {
  const { t } = useTranslation();
  return (
    <p className={styles.empty} role="status">
      {t(`dashboard.workspace.states.${state}`)}
    </p>
  );
}

function AttentionSummary({ overview }: { overview: DashboardOverview }) {
  const { t } = useTranslation();
  return (
    <p className={styles.attentionSummary}>
      {overview.alertState === 'ready' && overview.alertTotal !== undefined && (
        <span>{t('dashboard.v3.firingGroups', { count: overview.alertTotal })}</span>
      )}
      {overview.downState === 'ready' && overview.distribution && (
        <span>{t('dashboard.v3.unavailableMonitors', { count: overview.distribution.counts[2] })}</span>
      )}
    </p>
  );
}
