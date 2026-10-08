/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import type { TFunction } from 'i18next';
import type { LogQuerySetResult } from '../../logs/log-query-set-result';
import type { LogQuerySet } from '../../logs/log-query-set';
import { logQuerySetValues } from '../../logs/log-query-set-values';
import { logAnalysisGroupLabel } from './log-grouping-display';
import { createLogTrendPersesResult } from './log-chart-adapter';
import { HertzBeatMetricTimeSeriesResult } from '../hertzbeat-perses-primitives';
import { explorePersesMessages } from './log-chart-messages';
import { logAnalysisUnitKey } from '../../logs/log-analysis-unit';
import { formatLogNumericValue } from './log-throughput-display';
import styles from './log-analysis.module.css';

function groupLabel(keys: LogQuerySetResult['sources'][number]['groups'][number]['keys'], t: TFunction) {
  return logAnalysisGroupLabel(keys.length ? { keys, kind: null, value: null } : { kind: 'all', value: null }, t);
}

export function LogQuerySetEvidence({
  data,
  t,
  display,
  formulaFunctions
}: {
  data: LogQuerySetResult;
  t: TFunction;
  display?: 'line' | 'bar' | undefined;
  formulaFunctions?: LogQuerySet['formulas'] | undefined;
}) {
  const values = logQuerySetValues(data, formulaFunctions);
  const labels = new Map([
    ...data.sources.map(source => {
      const unit = logAnalysisUnitKey(source.analysis);
      return [source.refId, `${source.alias}${unit ? ` · ${t(unit)}` : ''}`] as const;
    }),
    ...data.formulas.map(
      formula => [formula.refId, `${formula.alias} · ${t('explore.logAnalysis.formulaUnitUnknown')}`] as const
    )
  ]);
  const chart = querySetChart(data, values, labels, t, formulaFunctions);
  return (
    <>
      <div>
        {data.sources.map(source => (
          <span key={source.refId}>
            {t('explore.logComparison.matching', { source: source.alias, count: source.matchingTotal })}{' '}
          </span>
        ))}
      </div>
      {data.intervalMs !== null && <> · {t('explore.logAnalysis.interval', { seconds: data.intervalMs / 1000 })}</>}
      {chart.outcome.truncated && <p>{t('explore.logAnalysis.truncated')}</p>}
      {data.formulas.some(formula => values.visible.includes(formula.refId)) && (
        <p>{t('explore.logAnalysis.formulaUnitHint')}</p>
      )}
      {!values.groups.length ? (
        <p role="status">{t('explore.logAnalysis.noData')}</p>
      ) : !values.visible.length ? (
        <p role="status">{t('explore.logAdd.allHidden')}</p>
      ) : (
        <>
          {data.intervalMs !== null && values.groups[0]!.buckets.length > 1 ? (
            <HertzBeatMetricTimeSeriesResult
              title={t('explore.logAnalysis.label')}
              ariaLabel={t('explore.logAnalysis.label')}
              query={chart.query}
              outcome={chart.outcome}
              runtimeIdentity={chart.runtimeIdentity}
              messages={explorePersesMessages(t)}
              timeSeriesDisplay={display ?? 'line'}
              variant="compact"
            />
          ) : data.intervalMs !== null ? (
            <p role="status">{t('explore.logAnalysis.singleBucket')}</p>
          ) : null}
          <QuerySetTable values={values} labels={labels} t={t} />
        </>
      )}
    </>
  );
}

function querySetChart(
  data: LogQuerySetResult,
  values: ReturnType<typeof logQuerySetValues>,
  labels: Map<string, string>,
  t: TFunction,
  formulaFunctions: LogQuerySet['formulas'] | undefined
) {
  const chart = createLogTrendPersesResult(
    { start: data.window.start, end: data.window.end, intervalMs: data.intervalMs ?? 1, buckets: [] },
    { from: data.window.start, to: data.window.end },
    JSON.stringify({ window: data.window, executed: data.executed, formulaFunctions })
  );
  chart.query.limit = values.groups.reduce((sum, group) => sum + group.visible.length, 0);
  chart.outcome.truncated = data.sources.some(source => source.truncated);
  chart.outcome.data.series = values.groups.flatMap(group =>
    group.visible.map(refId => ({
      key: JSON.stringify([group.keys, refId]),
      name: `${labels.get(refId) ?? refId}: ${groupLabel(group.keys, t)}`,
      labels: {},
      points: group.buckets.map(bucket => ({ timestamp: bucket.start, value: bucket.values[refId] ?? null }))
    }))
  );
  return chart;
}

function QuerySetTable({
  values,
  labels,
  t
}: {
  values: ReturnType<typeof logQuerySetValues>;
  labels: Map<string, string>;
  t: TFunction;
}) {
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>{t('explore.logAnalysis.by')}</th>
          {values.visible.map(refId => (
            <th key={refId}>{labels.get(refId)}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {values.groups.map(group => (
          <tr key={JSON.stringify(group.keys)}>
            <th>{groupLabel(group.keys, t)}</th>
            {values.visible.map(refId => (
              <td key={refId}>
                {group.visible.includes(refId) ? (
                  group.values[refId] == null ? (
                    t('explore.logComparison.unavailable')
                  ) : (
                    <span title={String(group.values[refId])}>{formatLogNumericValue(group.values[refId])}</span>
                  )
                ) : (
                  '—'
                )}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
