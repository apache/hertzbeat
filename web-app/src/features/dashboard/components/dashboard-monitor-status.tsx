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
import { monitorRoutePaths } from '@/shared/navigation/app-paths';
import type { DashboardOverview } from '../model/dashboard-overview';
import { monitorDistributionSegments, monitorStatusOrder } from '../model/dashboard-monitor-distribution';
import styles from './dashboard-overview.module.css';

export function DashboardMonitorStatus({ overview }: { overview: DashboardOverview }) {
  const { t } = useTranslation();
  const distribution = overview.distribution;
  const value = distribution
    ? distribution.total
    : t(`dashboard.workspace.states.${overview.monitorState === 'ready' ? 'error' : overview.monitorState}`);
  const { segments, remainder } = monitorDistributionSegments(distribution);
  const description = remainder ? t('dashboard.v3.monitorRemainder', { count: remainder }) : undefined;
  return (
    <section
      className={styles.monitorStatus}
      aria-label={t('dashboard.v2.monitorStatus')}
      aria-busy={overview.monitorState === 'loading'}
    >
      <Link
        className={styles.monitorTotal}
        to={monitorRoutePaths.list}
        aria-label={`${t('dashboard.daily.monitors.title')} ${value}`}
      >
        {t('dashboard.daily.monitors.title')}{' '}
        <span>
          {value}
          {distribution && t('dashboard.v3.monitorUnit')}
        </span>
      </Link>
      <div
        className={styles.monitorBar}
        role="img"
        aria-label={t('dashboard.v3.monitorDistribution')}
        title={description}
      >
        {segments.map(segment => (
          <span
            key={segment.status}
            data-status={segment.status}
            className={styles[segment.status]}
            style={{ width: `${segment.share}%` }}
          />
        ))}
      </div>
      <MonitorLegend distribution={distribution} />
    </section>
  );
}

function MonitorLegend({ distribution }: { distribution: DashboardOverview['distribution'] }) {
  const { t } = useTranslation();
  const { remainder } = monitorDistributionSegments(distribution);
  const description = remainder ? t('dashboard.v3.monitorRemainder', { count: remainder }) : undefined;
  return (
    <div className={styles.statusCounts}>
      {monitorStatusOrder.map(({ status, index }) => (
        <Link
          key={status}
          to={`${monitorRoutePaths.list}?${new URLSearchParams({ status: String(index) })}`}
          className={styles[status]}
        >
          <i aria-hidden="true" />
          <span>{t(`monitor.status.${status}`)}</span>
          <span>{distribution ? distribution.counts[index] : '—'}</span>
          {distribution && distribution.total > 0 && (
            <small>{Math.round((distribution.counts[index]! / distribution.total) * 100)}%</small>
          )}
        </Link>
      ))}
      {!!remainder && (
        <div className={styles.otherStatus} title={description}>
          <i aria-hidden="true" />
          <span>{t('dashboard.v3.otherStatus')}</span>
          <span>{remainder}</span>
          <small>{Math.round((remainder / distribution!.total) * 100)}%</small>
        </div>
      )}
    </div>
  );
}
