/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import type { TFunction } from 'i18next';
import {
  metricAxisScaleValid,
  metricAxisDataExtent,
  metricPoints,
  HertzBeatMetricTimeSeriesResult,
  type MetricSeries,
  type MetricView
} from '@/platform/perses';
import type { ExactTimeWindow } from '@/shared/query-context';
import type { MetricExploreQuery } from '../model/explore-query';
import type { MetricConsole } from '../model/explore-signal-contract';
import { createExploreMetricPersesResult } from '../model/explore-perses-result-model';
import { buildMetricSampleSnapshot } from '../model/metric-sample-model';
import { MetricNumberResult } from './metric-number-result';
import { MetricSplitResult } from './metric-split-result';
import { MetricSeriesSummary } from './metric-series-summary';
import { MetricSampleTable } from './metric-sample-table';
import { explorePersesMessages } from './explore-perses-messages';
import styles from './metric-ready-result.module.css';
type Props = {
  series: MetricSeries[];
  data: MetricConsole;
  query: MetricExploreQuery;
  timeWindow: ExactTimeWindow;
  revision: number;
  t: TFunction;
  onViewChange?: ((view: MetricView) => void) | undefined;
  onOpenLogs?: (() => void) | undefined;
  onTimeWindowChange?: ((window: ExactTimeWindow) => void) | undefined;
};

export function MetricResultVisualization({
  display,
  series,
  allSeries,
  view,
  data,
  query,
  timeWindow,
  revision,
  t,
  onViewChange,
  onTimeWindowChange,
  onOpenLogs,
  result,
  snapshot
}: Props & {
  display: MetricView['mode'];
  allSeries: MetricSeries[];
  view: MetricView;
  result: ReturnType<typeof createExploreMetricPersesResult> | undefined;
  snapshot: ReturnType<typeof buildMetricSampleSnapshot>;
}) {
  return (
    <>
      {display === 'number' ? (
        <MetricNumberResult series={series} calculation={view.numberCalculation ?? 'latest'} t={t} />
      ) : (
        series.length > 0 &&
        (display === 'split' && onViewChange ? (
          <MetricSplitResult
            rankingSeries={allSeries}
            {...{ data, series, query, timeWindow, revision, t, view, onViewChange }}
          />
        ) : display === 'chart' ? (
          result && <MetricChart {...{ result, series, t, view, onTimeWindowChange, onOpenLogs }} />
        ) : (
          <MetricSampleTable series={series} snapshot={snapshot} t={t} />
        ))
      )}
    </>
  );
}

function MetricChart({
  result,
  series,
  t,
  onTimeWindowChange,
  onOpenLogs,
  view
}: {
  view: MetricView;
  result: ReturnType<typeof createExploreMetricPersesResult>;
  series: MetricSeries[];
  onOpenLogs: Props['onOpenLogs'];
  t: TFunction;
  onTimeWindowChange: Props['onTimeWindowChange'];
}) {
  return (
    <>
      {metricAxisScaleValid(
        view.chart ?? {},
        metricAxisDataExtent(series.flatMap(item => metricPoints(item).map(point => point.value))),
        view.chart?.display === 'bar'
      ) ? (
        <HertzBeatMetricTimeSeriesResult
          className={styles.chart}
          variant="fill"
          title={t('explore.signals.metrics')}
          ariaLabel={t('exploreMetric.trend')}
          query={result.query}
          outcome={result.outcome}
          runtimeIdentity={result.runtimeIdentity}
          timeSeriesDisplay={view.chart?.display}
          timeSeriesLegend={view.chart?.legend}
          timeSeriesYDomain={view.chart && { min: view.chart.min, max: view.chart.max }}
          messages={explorePersesMessages(t)}
          onTimeWindowChange={onTimeWindowChange}
        />
      ) : (
        <p role="alert">{t('explore.metricChart.unsafeRange')}</p>
      )}
      <MetricSeriesSummary series={series} t={t} onOpenLogs={onOpenLogs} />
    </>
  );
}
