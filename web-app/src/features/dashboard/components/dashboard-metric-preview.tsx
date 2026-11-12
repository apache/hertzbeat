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
import { buildExplorePath } from '@/features/explore';
import type { DashboardSignals } from '../model/dashboard-signals';
import { DashboardSparkline } from './dashboard-sparkline';
import styles from './dashboard-signals.module.css';
import { Button } from 'antd';
import { DashboardRotationControls } from './dashboard-rotation-controls';
import { BarChartOutlined, StarFilled, FullscreenOutlined } from '@ant-design/icons';
import { dashboardMetricFormat } from '../model/dashboard-metric-format';
import { dashboardMetricPreview } from '../model/dashboard-metric-preview';
type Props = { signals: DashboardSignals };
export function DashboardMetricPreview({ signals }: Props) {
  const { t } = useTranslation();
  const active = signals.active;
  const target = buildExplorePath({
    signal: 'metrics',
    savedView: active?.viewKey,
    timeRange: 'last-15m',
    start: signals.clock.start,
    end: signals.clock.end,
    timeZone: 'UTC',
    serviceName: signals.serviceName || undefined,
    environment: signals.environment || undefined
  });
  return (
    <section
      className={`${styles.region} ${styles.metricCard}`}
      aria-labelledby="start-metrics-title"
      onMouseEnter={() => signals.setMetricInteracting(true)}
      onMouseLeave={() => signals.setMetricInteracting(false)}
      onFocusCapture={() => signals.setMetricInteracting(true)}
      onBlurCapture={event => {
        if (!event.currentTarget.contains(event.relatedTarget)) signals.setMetricInteracting(false);
      }}
    >
      <header>
        <h3 id="start-metrics-title">
          <BarChartOutlined aria-hidden="true" /> {t('dashboard.workspace.signals.metrics.title')}
        </h3>
        <span className={styles.cardTime}>
          {t('dashboard.v3.savedMetrics')}
          {signals.metricCount > 0 && (
            <>
              {' '}
              · {signals.activeIndex + 1}/{signals.metricCount}
            </>
          )}{' '}
          <StarFilled aria-hidden="true" />
        </span>
        <Link to={target} aria-label={t('dashboard.v3.openExplore')} title={t('dashboard.v3.openExplore')}>
          <FullscreenOutlined aria-hidden="true" />
        </Link>
      </header>
      {active ? (
        <div
          className={`${styles.metricContent} ${signals.metricExiting ? styles.metricExiting : ''}`}
          data-metric-motion={signals.metricExiting ? 'exiting' : 'visible'}
        >
          <MetricEvidence signals={signals} />
        </div>
      ) : (
        <EmptyMetrics signals={signals} target={target} />
      )}
      {active && (
        <footer className={styles.cardFooter}>
          <DashboardRotationControls signals={signals} />
        </footer>
      )}
    </section>
  );
}
function EmptyMetrics({ signals, target }: Props & { target: string }) {
  const { t } = useTranslation();
  if (signals.favoriteState !== 'ready')
    return (
      <p role="status" className={styles.empty}>
        {t(signals.favoriteState === 'loading' ? 'dashboard.v2.loading' : 'dashboard.v2.unavailable')}
      </p>
    );
  return (
    <div className={styles.emptyMetrics}>
      <p>{t('dashboard.v2.noFavoriteMetrics')}</p>
      <Button href={target} type="primary">
        {t('dashboard.v2.chooseMetric')}
      </Button>
    </div>
  );
}
function MetricEvidence({ signals }: Props) {
  const { t } = useTranslation();
  const query = signals.metric;
  if (!query?.isSuccess || query.isFetching)
    return (
      <p role="status" className={styles.empty}>
        {t(query?.error ? 'dashboard.v2.unavailable' : 'dashboard.v2.loading')}
      </p>
    );
  const data = dashboardMetricPreview(query.data, signals.clock.start, signals.clock.end);
  if (data.kind !== 'ready') {
    const messages = {
      empty: 'dashboard.v2.noSamples',
      over_budget: 'dashboard.v2.over_budget',
      unavailable: 'dashboard.v2.unavailable'
    };
    return <p className={styles.empty}>{t(messages[data.kind])}</p>;
  }
  return (
    <div className={styles.metricSeries}>
      {data.series.map((series, index) => {
        const last = series.points.filter(point => point !== null).at(-1);
        const format = dashboardMetricFormat(
          series.name,
          series.unit,
          series.points.flatMap(point => (point ? [point[1]] : []))
        );
        return (
          <div key={`${series.name}-${index}`}>
            <div className={styles.metricInfo}>
              <div className={styles.metricName}>
                <strong title={`${signals.active?.label ?? ''} · ${series.name}`}>
                  {signals.active?.label || series.name}
                </strong>
              </div>
              <div className={styles.metricValue}>
                <span>{t('dashboard.v3.latest')}</span>
                <strong title={last ? format.exact(last[1]) : undefined}>{last ? format.format(last[1]) : '—'}</strong>
              </div>
            </div>
            <DashboardSparkline
              points={series.points}
              start={signals.clock.start}
              end={signals.clock.end}
              label={series.name}
              variant="area"
              formatValue={format.format}
              exactValue={format.exact}
            />
          </div>
        );
      })}
    </div>
  );
}
