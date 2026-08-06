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

import { Alert } from 'antd';
import type { TFunction } from 'i18next';

import type { ExplorePageResult, LogHistoryEvidence, LogRow } from '../model/explore-signal-contract';
import type { LogExploreQuery } from '../model/explore-model';
import { TimeSeriesChart } from '@/shared/time-series-chart';
import { LogRows } from './log-rows';
import { LogStreamResult, type LiveLogView } from './log-stream-result';
import styles from './log-result.module.css';
import { SignalEmptyState, SignalResultFrame } from './signal-result-frame';

export type { LiveLogView } from './log-stream-result';

export function LogResult({
  data,
  query,
  t,
  navigate,
  evidenceCurrent = true,
  live,
  statistics
}: {
  data?: ExplorePageResult<LogRow> | undefined;
  query: LogExploreQuery;
  t: TFunction;
  navigate: (path: string) => void;
  evidenceCurrent?: boolean | undefined;
  live?: LiveLogView | undefined;
  statistics?: Pick<LogHistoryEvidence, 'overview' | 'trend'> | undefined;
}) {
  if (query.live && live) return <LogStreamResult stream={live} query={query} t={t} navigate={navigate} />;
  if (query.live) return <Alert type="error" showIcon message={t('exploreLog.streamFailed')} />;

  const result =
    !data || data.totalElements === 0 ? (
      <SignalResultFrame title={t('explore.signals.logs')} count={0}>
        <SignalEmptyState title={t('explore.empty.logs')} hint={t('explore.description')} />
      </SignalResultFrame>
    ) : (
      <LogRows
        rows={data.content}
        data={data}
        query={query}
        t={t}
        navigate={navigate}
        evidenceCurrent={evidenceCurrent}
      />
    );
  return (
    <>
      {statistics && <LogStatistics statistics={statistics} t={t} />}
      {result}
    </>
  );
}

function LogStatistics({
  statistics,
  t
}: {
  statistics: Pick<LogHistoryEvidence, 'overview' | 'trend'>;
  t: TFunction;
}) {
  const overviewRows =
    statistics.overview.kind === 'ready'
      ? ([
          ['total', statistics.overview.data.totalCount],
          ['trace', statistics.overview.data.traceCount],
          ['debug', statistics.overview.data.debugCount],
          ['info', statistics.overview.data.infoCount],
          ['warn', statistics.overview.data.warnCount],
          ['error', statistics.overview.data.errorCount],
          ['fatal', statistics.overview.data.fatalCount]
        ] as const)
      : [];
  const trendRows = statistics.trend.kind === 'ready' ? Object.entries(statistics.trend.data.hourlyStats).sort() : [];
  return (
    <div className={styles.statistics}>
      <section aria-label={t('exploreLog.overview')}>
        <h3>{t('exploreLog.overview')}</h3>
        {statistics.overview.kind === 'error' ? (
          <Alert type="warning" showIcon message={t('exploreLog.statisticsUnavailable')} />
        ) : (
          <dl className={styles.overviewStats}>
            {overviewRows.map(([key, value]) => (
              <div key={key}>
                <dt>{t(`exploreLog.statistics.${key}`)}</dt>
                <dd>{value.toLocaleString()}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>
      <section aria-label={t('exploreLog.trend')}>
        <h3>{t('exploreLog.trend')}</h3>
        {renderTrendStatistics(statistics.trend.kind, trendRows, t)}
      </section>
    </div>
  );
}

function renderTrendStatistics(kind: LogHistoryEvidence['trend']['kind'], rows: [string, number][], t: TFunction) {
  if (kind === 'error') return <Alert type="warning" showIcon message={t('exploreLog.statisticsUnavailable')} />;
  if (rows.length === 0) return <p>{t('exploreLog.trendEmpty')}</p>;
  return (
    <TimeSeriesChart
      title={t('exploreLog.trend')}
      ariaLabel={t('exploreLog.trend')}
      className={styles.trendChart}
      series={[
        {
          name: t('explore.signals.logs'),
          points: rows.map(([bucket, count]) => [new Date(bucket.replace(' ', 'T')).getTime(), count])
        }
      ]}
    />
  );
}
