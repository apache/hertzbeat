/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { Button } from 'antd';
import type { TFunction } from 'i18next';
import { HertzBeatMetricTimeSeriesResult, createNativeLogTrendResult, explorePersesMessages } from '@/platform/perses';
import type { ExactTimeWindow } from '@/shared/query-context';
import type { CalculatedAnalysisResponse } from '../model/explore-calculated-analysis-contract';
import styles from './explore-log-analysis.module.css';
import calculatedStyles from './explore-calculated-analysis-result.module.css';

type Load = {
  state:
    | 'idle'
    | 'loading'
    | 'ready'
    | 'permission'
    | 'transport_error'
    | 'calculated_budget_exceeded'
    | 'calculated_invalid_pattern'
    | 'invalid_filter'
    | 'invalid_query'
    | 'contract_error'
    | 'missing'
    | 'error';
  data: CalculatedAnalysisResponse | undefined;
  retry: () => void;
  invalidMessageKey?: string | undefined;
};
export function ExploreCalculatedAnalysisResult({
  load,
  t,
  onTimeWindowChange
}: {
  load: Load;
  t: TFunction;
  onTimeWindowChange?: ((window: ExactTimeWindow) => void) | undefined;
}) {
  if (load.state !== 'ready' || !load.data) return <AnalysisStatus load={load} t={t} />;
  return <AnalysisEvidence data={load.data} t={t} onTimeWindowChange={onTimeWindowChange} />;
}

function AnalysisStatus({ load, t }: { load: Load; t: TFunction }) {
  if (load.state === 'idle') return null;
  if (load.state === 'loading')
    return (
      <p className={styles.state} role="status">
        {t('explore.logAnalysis.loading')}
      </p>
    );
  return (
    <div className={styles.state} role="alert">
      <p>{t(errorKey(load.state, load.invalidMessageKey))}</p>
      <Button onClick={load.retry}>{t('common.retry')}</Button>
    </div>
  );
}

function AnalysisEvidence({
  data,
  t,
  onTimeWindowChange
}: {
  data: CalculatedAnalysisResponse;
  t: TFunction;
  onTimeWindowChange?: ((window: ExactTimeWindow) => void) | undefined;
}) {
  const result = data.result;
  const interval = result.intervalMs;
  const bucketCount = new Set(result.groups.flatMap(group => group.buckets.map(bucket => bucket.start))).size;
  const series = interval && bucketCount > 1 ? seriesForAnalysis(data, t) : undefined;
  return (
    <section className={styles.result} aria-label={t('explore.logAnalysis.label')}>
      <AnalysisHeader data={data} t={t} />
      {result.groups.length === 0 ? (
        <p className={styles.state}>{t('explore.logAnalysis.noData')}</p>
      ) : (
        <>
          {series && (
            <div className={calculatedStyles.groupedChart}>
              <HertzBeatMetricTimeSeriesResult
                title={t('explore.logAnalysis.timeseries')}
                ariaLabel={t('explore.logAnalysis.timeseries')}
                query={series.query}
                outcome={series.outcome}
                runtimeIdentity={series.runtimeIdentity}
                messages={explorePersesMessages(t)}
                timeSeriesDisplay={data.executed.operation.measure ? 'line' : 'bar'}
                variant="compact"
                timeSeriesCompact={false}
                onTimeWindowChange={onTimeWindowChange}
                timeWindowChangeEnabled={onTimeWindowChange !== undefined}
              />
            </div>
          )}
          {!series && <p role="status">{t('explore.logAnalysis.singleBucket')}</p>}
          <p className={styles.measureHint}>
            {t('explore.logCalculatedV2.groupValues', { count: result.groups.length })}
          </p>
          <ul className={calculatedStyles.groupTotals}>
            {result.groups.map(group => (
              <li key={JSON.stringify(group.keys)}>
                <span>
                  {group.keys.map(key => keyLabel(key, t)).join(' / ') || t('explore.logAnalysis.everything')}
                </span>
                <strong>{group.count.toLocaleString()}</strong>
                {data.executed.operation.measure && <span>{group.measurement?.value?.toLocaleString() ?? '—'}</span>}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function AnalysisHeader({ data, t }: { data: CalculatedAnalysisResponse; t: TFunction }) {
  return (
    <header>
      <span>{t('explore.logAnalysis.matching', { count: data.result.matchingTotal })}</span>
      <span>
        {data.executed.operation.grouping.map(item => fieldLabel(item.field)).join(' / ') ||
          t('explore.logAnalysis.everything')}
      </span>
      {data.result.truncated && <span>{t('explore.logAnalysis.truncated')}</span>}
    </header>
  );
}

function seriesForAnalysis(data: CalculatedAnalysisResponse, t: TFunction) {
  const { result, window, executed } = data;
  const interval = result.intervalMs!;
  const series = createNativeLogTrendResult(
    { start: window.start, end: window.end, intervalMs: interval, buckets: [] },
    { from: window.start, to: window.end },
    JSON.stringify([window, executed])
  );
  if (executed.operation.measure)
    series.query.metric.name = `${t(`explore.logAnalysis.${executed.operation.measure.function}`)}(${fieldLabel(executed.operation.measure.field)})`;
  series.query.limit = result.groups.length;
  series.outcome.truncated = result.truncated;
  series.outcome.data.series = result.groups.map(group => ({
    key: JSON.stringify(group.keys),
    name: group.keys.map(item => keyLabel(item, t)).join(' / ') || t('explore.logAnalysis.everything'),
    labels: {},
    points: group.buckets.map(bucket => ({
      timestamp: bucket.start,
      value: executed.operation.measure ? (bucket.measurement?.value ?? null) : bucket.count
    }))
  }));
  return series;
}

function keyLabel(
  key: CalculatedAnalysisResponse['result']['groups'][number]['keys'][number] | undefined,
  t: TFunction
) {
  if (!key || key.kind === 'all') return t('explore.logAnalysis.everything');
  if (key.kind === 'null') return t('explore.logAnalysis.null');
  return String(key.value);
}

function fieldLabel(field: string) {
  return field.startsWith('calculated:') ? `#${field.slice(11)}` : field;
}

function errorKey(state: Load['state'], invalidMessageKey?: string) {
  if (state === 'permission') return 'explore.logAnalysis.permission';
  if (state === 'transport_error') return 'explore.logAnalysis.unavailable';
  if (state === 'calculated_budget_exceeded') return 'explore.logCalculatedV2.queryBudgetExceeded';
  if (state === 'calculated_invalid_pattern') return 'explore.logCalculatedV2.queryInvalidPattern';
  if (state === 'invalid_filter' || state === 'invalid_query' || state === 'contract_error')
    return invalidMessageKey ?? 'explore.logCalculatedV2.analysisInvalid';
  return 'explore.logAnalysis.error';
}
