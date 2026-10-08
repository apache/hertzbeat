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

import type { TFunction } from 'i18next';

import { formatShortLocalTime } from '@/shared/time';

import type { MetricSeries } from '../model/explore-signal-model';
import {
  formatMetricSampleValue,
  formatMetricSeriesLabels,
  type buildMetricSampleSnapshot
} from '../model/metric-sample-model';
import styles from './metric-ready-result.module.css';

export function MetricSampleTable({
  series,
  snapshot,
  t
}: {
  series: MetricSeries[];
  snapshot: ReturnType<typeof buildMetricSampleSnapshot>;
  t: TFunction;
}) {
  return (
    <div>
      <MetricSeriesLabels series={series} t={t} />
      {snapshot.truncated && (
        <p className={styles.sampleNotice}>
          {t('exploreMetric.sampleLimit', { shown: snapshot.rows.length, received: snapshot.received })}
        </p>
      )}
      <div className={styles.tableViewport} tabIndex={0} role="region" aria-label={t('explore.samples')}>
        <table className={styles.table} aria-label={t('explore.samples')}>
          <thead>
            <tr>
              <th scope="col">{t('explore.time')}</th>
              <th scope="col">{t('exploreMetric.seriesReference')}</th>
              <th scope="col">{t('exploreMetric.value')}</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.rows.map(row => (
              <tr key={row.key}>
                <td>
                  <time
                    dateTime={new Date(row.timestamp).toISOString()}
                    title={new Date(row.timestamp).toISOString()}
                    aria-label={new Date(row.timestamp).toISOString()}
                  >
                    {formatShortLocalTime(row.timestamp, { milliseconds: true })}
                  </time>
                </td>
                <td>#{row.seriesNumber}</td>
                <td>
                  <span className={styles.numericValue} title={String(row.value)} aria-label={String(row.value)}>
                    {formatMetricSampleValue(row.value)}
                  </span>
                  {row.unit ? <span> {row.unit}</span> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MetricSeriesLabels({ series, t }: { series: MetricSeries[]; t: TFunction }) {
  return (
    <section className={styles.seriesLabels} tabIndex={0} aria-label={t('exploreMetric.seriesLabels')}>
      {series.map((item, index) => (
        <div key={item.key}>
          <strong>
            #{index + 1} {item.name}
          </strong>
          <span>{formatMetricSeriesLabels(item.labels)}</span>
        </div>
      ))}
    </section>
  );
}
