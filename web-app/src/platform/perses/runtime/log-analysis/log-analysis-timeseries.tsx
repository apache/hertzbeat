/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { LogAnalysisBucketDetails } from './log-analysis-bucket-details';
import { normalizeLogBucketValue } from '../../logs/log-throughput';
import { groupIdentity } from '../../logs/log-grouping';
import { HertzBeatMetricTimeSeriesResult } from '../hertzbeat-perses-primitives';
import { type LogAnalysisGroup, type LogAnalysisResult } from '../../logs/log-analysis';

import type { ReactNode } from 'react';
import type { TFunction } from 'i18next';

import type { ExactTimeWindow } from '@/shared/query-context';

import { createLogTrendPersesResult } from './log-chart-adapter';
import { explorePersesMessages } from './log-chart-messages';
import styles from './log-analysis-timeseries.module.css';
import { logAnalysisUnitKey } from '../../logs/log-analysis-unit';
export function ExploreLogAnalysisTimeseries({
  data,
  t,
  onTimeWindowChange,
  timeZone,
  display,
  groupLabel,
  children
}: {
  display?: 'line' | 'bar' | undefined;
  children: ReactNode;
  timeZone?: string | undefined;
  data: LogAnalysisResult;
  t: TFunction;
  groupLabel: (group: LogAnalysisGroup) => string;
  onTimeWindowChange?: ((window: ExactTimeWindow) => void) | undefined;
}) {
  const detailsProps = { data, groupLabel, t, timeZone };
  const bucketStarts = new Set(data.groups.flatMap(group => group.buckets.map(bucket => bucket.start)));
  if (bucketStarts.size <= 1) return <SingleBucket {...detailsProps}>{children}</SingleBucket>;
  const result = analysisTimeseries(data, groupLabel, t);
  const unit = t(data.measure ? 'explore.logAnalysis.throughputValueUnit' : 'explore.logAnalysis.throughputLogsUnit');
  return (
    <>
      {data.transform && (
        <p>
          {t('explore.logAnalysis.throughput')} · {unit} · {t('explore.logAnalysis.throughputHint')}
        </p>
      )}
      <HertzBeatMetricTimeSeriesResult
        className={styles.chart}
        timeSeriesCompact={false}
        timeSeriesTimestamp={
          data.transform ? timestamp => <LogAnalysisBucketDetails {...detailsProps} timestamp={timestamp} /> : undefined
        }
        title={t('explore.logAnalysis.timeseries')}
        ariaLabel={t('explore.logAnalysis.timeseries')}
        query={result.query}
        outcome={result.outcome}
        runtimeIdentity={result.runtimeIdentity}
        messages={explorePersesMessages(t)}
        onTimeWindowChange={onTimeWindowChange}
        timeWindowChangeEnabled={onTimeWindowChange !== undefined}
        timeSeriesDisplay={display ?? (data.measure ? 'line' : 'bar')}
        variant="compact"
      />
      {(data.measure || data.grouping || data.transform) && children}
    </>
  );
}

function analysisTimeseries(data: LogAnalysisResult, groupLabel: (group: LogAnalysisGroup) => string, t: TFunction) {
  const window = { from: data.window.start, to: data.window.end };
  const result = createLogTrendPersesResult(
    { start: data.window.start, end: data.window.end, intervalMs: data.intervalMs!, buckets: [] },
    window,
    JSON.stringify(data)
  );
  if (data.measure)
    result.query.metric.name = `${t(`explore.logAnalysis.${data.measure.function}`)}(${data.measure.field})`;
  result.query.limit = data.groups.length;
  result.outcome.truncated = data.truncated;
  const unit = logAnalysisUnitKey(data);
  result.outcome.data.series = data.groups.map(group => ({
    key: groupIdentity(group),
    name: `${groupLabel(group)}${unit ? ` · ${t(unit)}` : ''}`,
    labels: {},
    points: group.buckets.map(bucket => ({
      timestamp: bucket.start,
      value: normalizeLogBucketValue(
        data.measure ? bucket.measurement!.value : bucket.count,
        data.intervalMs!,
        data.transform
      )
    }))
  }));
  return result;
}

function SingleBucket({
  data,
  t,
  children,
  ...details
}: Pick<Parameters<typeof ExploreLogAnalysisTimeseries>[0], 'data' | 't' | 'children' | 'timeZone' | 'groupLabel'>) {
  return (
    <>
      <p role="status">{t('explore.logAnalysis.singleBucket')}</p>
      {data.transform && data.groups[0]?.buckets[0] && (
        <LogAnalysisBucketDetails {...details} data={data} t={t} timestamp={data.groups[0].buckets[0].start} />
      )}
      {children}
    </>
  );
}
