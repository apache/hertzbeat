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

import { useId } from 'react';
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
        <span>{t('dashboard.daily.monitors.title')}</span>
        <span className={styles.monitorRingWrap}>
          <MonitorRing distribution={distribution} />
          <span className={styles.monitorRingTotal}>
            {value}
            {distribution && t('dashboard.v3.monitorUnit')}
          </span>
        </span>
      </Link>
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
      </div>
    </section>
  );
}
function MonitorRing({ distribution }: { distribution: DashboardOverview['distribution'] }) {
  const { t } = useTranslation();
  const titleId = useId();
  const { segments, remainder } = monitorDistributionSegments(distribution);
  return (
    <svg
      className={styles.monitorRing}
      viewBox="0 0 112 112"
      role="img"
      aria-label={t('dashboard.v3.monitorDistribution')}
      aria-describedby={titleId}
    >
      <title id={titleId}>
        {remainder !== undefined && remainder > 0
          ? t('dashboard.v3.monitorRemainder', { count: remainder })
          : t('dashboard.v3.monitorDistribution')}
      </title>
      <circle className={styles.monitorRingTrack} cx="56" cy="56" r="46" />
      {segments.map(segment => (
        <circle
          key={segment.status}
          className={`${styles.monitorArc} ${styles[segment.status]}`}
          cx="56"
          cy="56"
          r="46"
          pathLength="100"
          strokeDasharray={`${segment.share} ${100 - segment.share}`}
          strokeDashoffset={-segment.offset}
        />
      ))}
    </svg>
  );
}
