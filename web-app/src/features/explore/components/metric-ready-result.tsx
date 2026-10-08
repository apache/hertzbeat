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

import { MetricResultVisualization } from './metric-result-visualization';
import { useMemo } from 'react';
import { visibleMetricSeries, metricPoints, metricAxisDataExtent } from '@/platform/perses';
import { parseMetricView, type MetricView } from '@/platform/perses';
import { MetricViewSelector, MetricInvalidView } from './metric-composition-result';
import type { TFunction } from 'i18next';

import type { ExactTimeWindow } from '@/shared/query-context';

import { createExploreMetricPersesResult } from '../model/explore-perses-result-model';
import type { MetricExploreQuery } from '../model/explore-query';
import type { MetricConsole } from '../model/explore-signal-contract';
import type { MetricSeries } from '../model/explore-signal-model';
import { buildMetricSampleSnapshot } from '../model/metric-sample-model';
import { useMetricResultDisplay } from './metric-result-display';
import { MetricExecutedQuery, MetricResultToolbar } from './metric-result-toolbar';
import { MetricResultExport } from './metric-result-export';
import { MetricOutputCanvas, BucketBoundaryHelp } from './metric-output-status';
import { SignalResultFrame } from './signal-result-frame';
import styles from './metric-ready-result.module.css';

type Props = {
  onViewChange?: ((view: MetricView) => void) | undefined;
  data: MetricConsole;
  series: MetricSeries[];
  query: MetricExploreQuery;
  timeWindow: ExactTimeWindow;
  revision: number;
  t: TFunction;
  onOpenLogs?: (() => void) | undefined;
  onTimeWindowChange?: ((window: ExactTimeWindow) => void) | undefined;
};

export function MetricReadyResult({
  data,
  series: allSeries,
  query,
  timeWindow,
  revision,
  t,
  onTimeWindowChange,
  onOpenLogs,
  onViewChange
}: Props) {
  const [legacyDisplay, setDisplay] = useMetricResultDisplay();
  const view = readMetricView(query.metricView);
  const series = view ? visibleMetricSeries(allSeries, view) : allSeries;
  const display = onViewChange && view ? view.mode : legacyDisplay;
  const snapshot = useMemo(() => buildMetricSampleSnapshot(series), [series]);
  const result = useMemo(
    () => (series.length ? createExploreMetricPersesResult(query, data, timeWindow, revision, series) : undefined),
    [query, data, timeWindow, revision, series]
  );
  const resultContext = { data, query, timeWindow, revision };
  if (!view) return <MetricInvalidView onReset={() => onViewChange?.({ mode: 'chart', hidden: [] })} />;
  return (
    <div className={styles.result} data-metric-display={display}>
      <SignalResultFrame
        title={t('explore.signals.metrics')}
        count={series.length}
        unit={t('exploreMetric.series')}
        actions={
          <>
            {onViewChange ? (
              <MetricViewSelector view={view} onChange={onViewChange} dataExtent={metricSeriesExtent(series)} />
            ) : (
              <MetricResultToolbar
                received={snapshot.received}
                display={legacyDisplay}
                onDisplayChange={setDisplay}
                t={t}
              />
            )}
            <MetricResultExport
              key={`${revision}:${query.metricView ?? ''}`}
              series={series}
              received={snapshot.received}
              timeWindow={timeWindow}
              executedQuery={data.query}
              t={t}
            />
          </>
        }
      >
        <MetricUnitNotice series={series} t={t} />
        <MetricOutputCanvas {...{ data, series, view, onViewChange, query, t }} />
        <MetricResultVisualization
          {...resultContext}
          {...{ display, series, allSeries, view, t, result, snapshot }}
          {...{ onViewChange, onTimeWindowChange, onOpenLogs }}
        />
        <MetricResultDetails {...{ query, data, t }} hasSeries={series.length > 0} />
      </SignalResultFrame>
    </div>
  );
}

function readMetricView(value: string | undefined): MetricView | undefined {
  try {
    return parseMetricView(value);
  } catch {
    return undefined;
  }
}
function MetricUnitNotice({ series, t }: Pick<Props, 'series' | 't'>) {
  const units = [...new Set(series.flatMap(item => (item.unit ? [item.unit] : [])))];
  const unknown = series.some(item => !item.unit);
  if (units.length <= 1 && !unknown) return null;
  return (
    <details className={styles.unitNotice}>
      <summary>
        {units.length > 1 && t('explore.metricComposition.mixedUnitsShort', { units: units.join(', ') })}
        {units.length > 1 && unknown && ' · '}
        {unknown && t('explore.metricComposition.unknownUnitsShort')}
      </summary>
      {units.length > 1 && <p role="note">{t('explore.metricComposition.mixedUnits', { units: units.join(', ') })}</p>}
      {unknown && <p role="note">{t('explore.metricComposition.unknownUnits')}</p>}
    </details>
  );
}

function metricSeriesExtent(series: MetricSeries[]) {
  return metricAxisDataExtent(series.flatMap(item => metricPoints(item).map(point => point.value)));
}

function MetricResultDetails({
  query,
  data,
  t,
  hasSeries
}: Pick<Props, 'query' | 'data' | 't'> & { hasSeries: boolean }) {
  return (
    <>
      <BucketBoundaryHelp active={hasSeries} query={query} t={t} />
      <MetricExecutedQuery query={data.query} t={t} />
    </>
  );
}
