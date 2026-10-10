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
import type { TFunction } from 'i18next';
import {
  formatMetricSampleValue,
  formatMetricSeriesLabels,
  type MetricSeries,
  type MetricView
} from '@/platform/perses';
import { reduceMetricNumber, type MetricNumberCalculation } from '../model/metric-number-model';
import styles from './metric-number-result.module.css';
const COPY = 'explore.metricNumber.';
export function MetricNumberSettings({ view, onChange }: { view: MetricView; onChange: (view: MetricView) => void }) {
  const { t } = useTranslation();
  if (view.mode !== 'number') return null;
  return (
    <Select
      aria-label={t(COPY + 'calculation')}
      value={view.numberCalculation ?? 'latest'}
      options={(['latest', 'min', 'max', 'avg', 'sum', 'count'] as const).map(value => ({
        value,
        label: t(COPY + value)
      }))}
      onChange={numberCalculation => onChange({ ...view, numberCalculation })}
    />
  );
}
export function MetricNumberResult({
  series,
  calculation,
  t
}: {
  series: MetricSeries[];
  calculation: MetricNumberCalculation;
  t: TFunction;
}) {
  return (
    <section aria-label={t(COPY + 'title')} className={styles.numbers}>
      <div className={styles.grid}>
        {series.map(item => (
          <MetricNumberCard key={item.key} series={item} calculation={calculation} t={t} />
        ))}
      </div>
      <details className={styles.help}>
        <summary>{t(COPY + 'scope')}</summary>
        <p>{t(COPY + 'sampleSemantics')}</p>
      </details>
    </section>
  );
}
function MetricNumberCard({
  series,
  calculation,
  t
}: {
  series: MetricSeries;
  calculation: MetricNumberCalculation;
  t: TFunction;
}) {
  const result = reduceMetricNumber(series, calculation);
  const labels = formatMetricSeriesLabels(series.labels);
  return (
    <article
      className={styles.number}
      data-metric-number={series.key}
      aria-label={[series.refId, series.name, labels].filter(Boolean).join(' · ')}
    >
      <h4 title={series.name}>
        {series.refId && <span>{series.refId} · </span>}
        {series.name}
      </h4>
      {labels && (
        <div className={styles.labels} title={labels}>
          {labels}
        </div>
      )}
      <div className={styles.value}>
        {result.kind === 'ready' ? (
          <strong title={String(result.value)} aria-label={String(result.value)}>
            {formatMetricSampleValue(result.value)}
          </strong>
        ) : (
          <span role="status">{t(COPY + (result.kind === 'empty' ? 'noData' : 'unavailable'))}</span>
        )}
        {result.kind === 'ready' &&
          (calculation === 'count' ? <span>{t(COPY + 'points')}</span> : result.unit && <span>{result.unit}</span>)}
      </div>
      <small>{t(COPY + 'sampleCount', { count: result.count })}</small>
    </article>
  );
}
