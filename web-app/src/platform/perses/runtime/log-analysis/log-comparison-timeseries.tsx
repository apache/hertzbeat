/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { LogComparisonBucketDetails } from './log-comparison-bucket-details';
import controlStyles from './log-analysis.module.css';
import type { TFunction } from 'i18next';
import { HertzBeatMetricTimeSeriesResult } from '../hertzbeat-perses-primitives';
import { type LogComparisonResult } from '../../logs/log-comparison-result';
import { comparisonValues, type ComparisonSource } from '../../logs/log-comparison-values';
import type { ExactTimeWindow } from '@/shared/query-context';

import { comparisonGroupLabel } from './log-comparison-values-display';
import { createLogTrendPersesResult } from './log-chart-adapter';
import { explorePersesMessages } from './log-chart-messages';
import styles from './log-analysis-timeseries.module.css';
import { logAnalysisUnitKey } from '../../logs/log-analysis-unit';
function ComparisonChart({
  data,
  visible,
  timeZone,
  display,
  t,
  onTimeWindowChange
}: {
  data: LogComparisonResult;
  visible: ComparisonSource[];
  display?: 'line' | 'bar' | undefined;
  timeZone?: string | undefined;
  t: TFunction;
  onTimeWindowChange?: ((window: ExactTimeWindow) => void) | undefined;
}) {
  if ((data.groups[0]?.buckets.length ?? 0) <= 1)
    return (
      <>
        <p role="status">{t('explore.logAnalysis.singleBucket')}</p>
        {data.analysis.transform && data.groups[0]?.buckets[0] && (
          <LogComparisonBucketDetails
            data={data}
            timestamp={data.groups[0].buckets[0].start}
            t={t}
            timeZone={timeZone}
          />
        )}
      </>
    );
  const result = comparisonTimeseries(data, visible, t);
  return (
    <HertzBeatMetricTimeSeriesResult
      className={styles.chart}
      timeSeriesCompact={false}
      timeSeriesTimestamp={
        data.bTimeShiftMs !== undefined || data.analysis.transform
          ? timestamp => <LogComparisonBucketDetails data={data} timestamp={timestamp} t={t} timeZone={timeZone} />
          : undefined
      }
      title={t('explore.logComparison.label')}
      ariaLabel={t('explore.logComparison.label')}
      query={result.query}
      outcome={result.outcome}
      runtimeIdentity={result.runtimeIdentity}
      messages={explorePersesMessages(t)}
      onTimeWindowChange={onTimeWindowChange}
      timeWindowChangeEnabled={onTimeWindowChange !== undefined}
      timeSeriesDisplay={display ?? 'line'}
      variant="compact"
    />
  );
}

export function ExploreLogComparisonTimeseries({
  data,
  t,
  timeZone,
  display,
  hidden = [],
  onTimeWindowChange
}: {
  data: LogComparisonResult;
  display?: 'line' | 'bar' | undefined;
  hidden?: ComparisonSource[] | undefined;
  timeZone?: string | undefined;
  t: TFunction;
  onTimeWindowChange?: ((window: ExactTimeWindow) => void) | undefined;
}) {
  const sources: ComparisonSource[] = data.formula ? ['a', 'b', 'formula'] : ['a', 'b'];
  const visible = sources.filter(source => !hidden.includes(source));
  const alignedHint = onTimeWindowChange ? 'alignedTimeHint' : 'alignedTimeReadOnlyHint';
  return (
    <>
      {data.analysis.transform && (
        <p className={controlStyles.measureHint}>
          {t('explore.logAnalysis.throughput')} ·{' '}
          {t(
            data.analysis.measure ? 'explore.logAnalysis.throughputValueUnit' : 'explore.logAnalysis.throughputLogsUnit'
          )}{' '}
          · {t('explore.logAnalysis.throughputHint')}
        </p>
      )}
      {data.bTimeShiftMs !== undefined && (
        <p className={controlStyles.measureHint}>{t(`explore.logComparison.${alignedHint}`)}</p>
      )}
      <ComparisonChart
        data={data}
        visible={visible}
        timeZone={timeZone}
        display={display}
        t={t}
        onTimeWindowChange={onTimeWindowChange}
      />
    </>
  );
}

function comparisonTimeseries(data: LogComparisonResult, visible: ComparisonSource[], t: TFunction) {
  const value = comparisonValues(data, true);
  const window = { from: data.window.start, to: data.window.end };
  const result = createLogTrendPersesResult(
    { start: window.from, end: window.to, intervalMs: data.intervalMs!, buckets: [] },
    window,
    JSON.stringify(data)
  );
  if (data.analysis.measure)
    result.query.metric.name = `${t(`explore.logAnalysis.${data.analysis.measure.function}`)}(${data.analysis.measure.field})`;
  result.query.limit = data.groups.length * visible.length;
  result.outcome.truncated = data.truncated;
  const unit = logAnalysisUnitKey(data.analysis);
  result.outcome.data.series = data.groups.flatMap(group =>
    visible.map(source => ({
      key: JSON.stringify([group.keys, source]),
      name: `${source}${source === 'formula' || !unit ? '' : ` · ${t(unit)}`}: ${comparisonGroupLabel(group, t)}`,
      labels: {},
      points: group.buckets.map(bucket => ({ timestamp: bucket.start, value: value(bucket, source) }))
    }))
  );
  return result;
}
