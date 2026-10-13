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
import { HertzBeatMetricTimeSeriesResult } from '@/platform/perses';
import type { ExactTimeWindow } from '@/shared/query-context';
import type { TraceHistogram, TraceLoad } from '../model/explore-trace-analytics';
import { explorePersesMessages } from './explore-perses-messages';
import { TraceAnalyticsState, TraceCoverage } from './explore-trace-analytics-state';
import { ExploreTraceHelp } from './explore-trace-help';
import styles from './explore-trace-population.module.css';
type Bucket = NonNullable<TraceHistogram['data']>['buckets'][number];
type Props = {
  load: TraceLoad<TraceHistogram>;
  retry: () => void;
  onWindowChange: ((window: { start: number; end: number; endExclusive: boolean }) => void) | undefined;
};
export function ExploreTraceHistogram({ load, retry, onWindowChange }: Props) {
  const { t } = useTranslation(),
    result = ['permission', 'idle'].includes(load.state) ? undefined : load.data,
    data = result?.state === 'ready' ? result.data : null;
  return (
    <section className={styles.region} aria-label={t('exploreTrace.analytics.trend')}>
      <HistogramTrend data={data} result={result} enabled={load.state === 'ready'} onWindowChange={onWindowChange} />
      <TraceAnalyticsState load={load} retry={retry} />
      {result && <TraceCoverage coverage={result.coverage} />}
      {data?.totalCount === 0 && (
        <p role="status" className={styles.hint}>
          {t('exploreTrace.analytics.empty')}
        </p>
      )}
      {data && result?.population === 'matched_traces' && (
        <ExploreTraceHelp labelKey="exploreTrace.layout.trendHelp">
          <p className={styles.hint}>{t('exploreTrace.analytics.traceBucketHint')}</p>
        </ExploreTraceHelp>
      )}
    </section>
  );
}
function selectedBuckets(buckets: Bucket[], window: ExactTimeWindow) {
  const selected = buckets.filter(bucket => bucket.end > window.from && bucket.start < window.to);
  const first = selected[0],
    last = selected.at(-1);
  return first && last ? { start: first.start, end: last.end, endExclusive: last.endExclusive } : undefined;
}

function HistogramChart({
  result,
  data,
  window,
  enabled,
  onWindowChange
}: {
  result: TraceHistogram;
  data: NonNullable<TraceHistogram['data']>;
  window: ExactTimeWindow;
  enabled: boolean;
  onWindowChange: Props['onWindowChange'];
}) {
  const { t } = useTranslation();
  return (
    <HertzBeatMetricTimeSeriesResult
      className={styles.chart}
      title={t('exploreTrace.analytics.trend')}
      ariaLabel={t('exploreTrace.analytics.trend')}
      query={{
        signal: 'metrics',
        queryKind: 'time-series',
        timeWindow: window,
        metric: { name: 'hertzbeat_trace_population_count' },
        limit: 1
      }}
      outcome={{
        state: 'ready',
        truncated: result.coverage?.truncated ?? false,
        data: {
          timeWindow: window,
          source: 'greptime_traces',
          series: [
            {
              key: 'trace-population-count',
              name: t(`exploreTrace.analytics.${result.population}`),
              labels: {},
              points: data.buckets.map(bucket => ({ timestamp: bucket.start, value: bucket.count }))
            }
          ]
        }
      }}
      runtimeIdentity={JSON.stringify(result)}
      messages={explorePersesMessages(t)}
      timeSeriesDisplay="bar"
      timeSeriesCompact
      variant="compact"
      onTimeWindowChange={range => {
        const selected = selectedBuckets(data.buckets, range);
        if (selected && enabled) onWindowChange?.(selected);
      }}
      timeWindowChangeEnabled={enabled && onWindowChange != null}
    />
  );
}

function HistogramTrend({
  data,
  result,
  enabled,
  onWindowChange
}: {
  data: TraceHistogram['data'] | undefined;
  result: TraceHistogram | undefined;
  enabled: boolean;
  onWindowChange: Props['onWindowChange'];
}) {
  const { t } = useTranslation();
  return (
    <details className={styles.trend}>
      <summary className={styles.header}>
        <h3>{t('exploreTrace.analytics.trend')}</h3>
        {data && <span>{t('exploreTrace.analytics.totals', { count: data.totalCount, errors: data.errorCount })}</span>}
      </summary>
      {data && data.totalCount > 0 && result && (
        <HistogramChart
          result={result}
          data={data}
          window={{ from: result.window.start, to: result.window.end }}
          enabled={enabled}
          onWindowChange={onWindowChange}
        />
      )}
    </details>
  );
}
