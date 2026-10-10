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

import type { TFunction } from 'i18next';
import { useState, type ReactNode } from 'react';
import { DownOutlined, UpOutlined } from '@ant-design/icons';

import { HertzBeatMetricTimeSeriesResult } from '@/platform/perses';
import type { ExactTimeWindow } from '@/shared/query-context';

import { createLogTrendPersesResult } from '../model/explore-perses-result-model';
import type { LogHistoryEvidence } from '../model/explore-signal-contract';
import { explorePersesMessages } from './explore-perses-messages';
import styles from './log-result.module.css';
import { ExploreLogSeverityLegend } from './explore-log-severity-legend';

export function ExploreLogStatistics({
  statistics,
  timeWindow,
  runtimeIdentity,
  defaultCollapsed = false,
  headerAction,
  onTimeWindowChange,
  retry,
  t
}: {
  statistics: Pick<LogHistoryEvidence, 'overview' | 'trend'>;
  timeWindow: ExactTimeWindow;
  runtimeIdentity: string;
  defaultCollapsed?: boolean;
  headerAction?: ReactNode;
  onTimeWindowChange?: ((window: ExactTimeWindow) => void) | undefined;
  retry?: (() => Promise<void>) | undefined;
  t: TFunction;
}) {
  return (
    <div className={styles.statistics}>
      <Trend
        key={defaultCollapsed ? 'timeseries' : 'logs'}
        defaultCollapsed={defaultCollapsed}
        legend={<ExploreLogSeverityLegend statistics={statistics} t={t} />}
        statistics={statistics}
        headerAction={headerAction}
        timeWindow={timeWindow}
        runtimeIdentity={runtimeIdentity}
        onTimeWindowChange={onTimeWindowChange}
        retry={retry}
        t={t}
      />
    </div>
  );
}

function Trend({
  defaultCollapsed,
  legend,
  headerAction,
  statistics,
  timeWindow,
  runtimeIdentity,
  onTimeWindowChange,
  retry,
  t
}: {
  defaultCollapsed: boolean;
  statistics: Pick<LogHistoryEvidence, 'trend'>;
  legend: ReactNode;
  headerAction?: ReactNode;
  timeWindow: ExactTimeWindow;
  runtimeIdentity: string;
  onTimeWindowChange?: ((window: ExactTimeWindow) => void) | undefined;
  retry?: (() => Promise<void>) | undefined;
  t: TFunction;
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const rows = statistics.trend.kind === 'ready' ? statistics.trend.data.buckets : [];
  const singleBucketCount = rows.length === 1 ? rows[0]?.count : undefined;
  const density = collapsed ? 'compact' : 'visualization';
  const evidenceState = trendEvidenceState(statistics.trend, rows.length, singleBucketCount, t);
  return (
    <section className={styles.trend} aria-label={t('exploreLog.trend')} data-trend-density={density}>
      <header className={styles.trendHeader}>
        <div className={styles.trendHeading}>{evidenceState}</div>
        <div className={styles.trendLegend}>{legend}</div>
        {headerAction && <div className={styles.trendHeaderAction}>{headerAction}</div>}
        {retry && (
          <button type="button" className={styles.trendRetry} onClick={() => void retry()}>
            {t('common.retry')}
          </button>
        )}
        <TrendCollapseToggle available={rows.length > 0} collapsed={collapsed} onChange={setCollapsed} t={t} />
      </header>
      {!collapsed && statistics.trend.kind === 'ready' && rows.length > 0 ? (
        <TrendResult
          trend={statistics.trend.data}
          timeWindow={timeWindow}
          runtimeIdentity={runtimeIdentity}
          onTimeWindowChange={onTimeWindowChange}
          t={t}
        />
      ) : null}
    </section>
  );
}

function TrendCollapseToggle({
  available,
  collapsed,
  onChange,
  t
}: {
  available: boolean;
  collapsed: boolean;
  onChange: (collapsed: boolean) => void;
  t: TFunction;
}) {
  if (!available) return null;
  return (
    <button
      type="button"
      className={styles.trendToggle}
      aria-label={t(collapsed ? 'explore.perses.expandTrend' : 'explore.perses.collapseTrend')}
      aria-expanded={!collapsed}
      onClick={() => onChange(!collapsed)}
    >
      {collapsed ? <DownOutlined aria-hidden /> : <UpOutlined aria-hidden />}
    </button>
  );
}

function trendEvidenceState(
  trend: LogHistoryEvidence['trend'],
  rowCount: number,
  singleBucketCount: number | undefined,
  t: TFunction
): ReactNode {
  if (trend.kind === 'error') {
    return (
      <span className={styles.evidenceState} role="alert">
        {t(trend.reason === 'permission' ? 'exploreLog.trendPermission' : 'exploreLog.statisticsUnavailable')}
      </span>
    );
  }
  if (rowCount === 0) return <span className={styles.evidenceState}>{t('exploreLog.trendEmpty')}</span>;
  if (rowCount === 1) {
    return (
      <span className={styles.evidenceState}>{t('exploreLog.trendInsufficient', { count: singleBucketCount })}</span>
    );
  }
  return null;
}

function TrendResult({
  trend,
  timeWindow,
  runtimeIdentity,
  onTimeWindowChange,
  t
}: {
  trend: Extract<LogHistoryEvidence['trend'], { kind: 'ready' }>['data'];
  timeWindow: ExactTimeWindow;
  runtimeIdentity: string;
  onTimeWindowChange?: ((window: ExactTimeWindow) => void) | undefined;
  t: TFunction;
}) {
  const result = createLogTrendPersesResult(trend, timeWindow, runtimeIdentity);
  const peak = Math.max(...trend.buckets.map(bucket => bucket.count));
  return (
    <HertzBeatMetricTimeSeriesResult
      className={styles.trendChart}
      title={t('exploreLog.trend')}
      ariaLabel={t('exploreLog.trend')}
      query={result.query}
      outcome={result.outcome}
      runtimeIdentity={result.runtimeIdentity}
      messages={explorePersesMessages(t)}
      timeSeriesDisplay="bar"
      timeSeriesCompact
      timeSeriesCountAxisMax={peak}
      timeSeriesYDomain={peak > 0 ? { min: 0, max: peak } : undefined}
      onTimeWindowChange={onTimeWindowChange}
      timeWindowChangeEnabled={onTimeWindowChange != null}
      variant="compact"
    />
  );
}
