/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import type { TFunction } from 'i18next';
import type { LogAnalysisEvidence } from '../../logs/log-analysis-query';
import type { LogComparisonResult } from '../../logs/log-comparison-result';
import type { LogAnalysisResult } from '../../logs/log-analysis';
import type { LogAnalysisState } from '../../logs/log-analysis';
import { logMeasureHintKey } from '../../logs/log-measure';
import { logAnalysisGroupLabel } from './log-grouping-display';
import { AnalysisGroups } from './log-analysis-groups';
import { ExploreLogAnalysisTimeseries } from './log-analysis-timeseries';
import { ComparisonTable } from './log-comparison-table';
import { ExploreLogComparisonTimeseries } from './log-comparison-timeseries';
import { ExploreLogComparisonWindows } from './log-comparison-windows';
import { formulaOnlyValues } from '../../logs/log-formula-only';
import { formulaOnlySeries } from './log-formula-only-series';
import { groupIdentity } from '../../logs/log-grouping';
import { HertzBeatMetricTimeSeriesResult } from '../hertzbeat-perses-primitives';
import { explorePersesMessages } from './log-chart-messages';
import tableStyles from './log-analysis.module.css';
import { LogQuerySetEvidence } from './log-query-set-evidence';
import { logAnalysisUnitKey } from '../../logs/log-analysis-unit';
import { formatLogNumericValue } from './log-throughput-display';

type Props = {
  display?: 'line' | 'bar' | undefined;
  evidence: LogAnalysisEvidence;
  representation: LogAnalysisState['representation'];
  t: TFunction;
  timeZone?: string | undefined;
  comparison?: LogAnalysisState['comparison'];
};
export function LogAnalysisEvidenceView({ evidence, representation, t, timeZone, display, comparison }: Props) {
  if (evidence.kind === 'querySet') return <LogQuerySetEvidence data={evidence.data} t={t} display={display} />;
  const data = evidence.data;
  const analysis = evidence.kind === 'single' ? evidence.data : evidence.data.analysis;
  return (
    <>
      <div>
        {evidence.kind === 'single'
          ? t('explore.logAnalysis.matching', { count: evidence.data.matchingTotal })
          : (['a', 'b'] as const).map(source => (
              <span key={source}>
                {t('explore.logComparison.matching', {
                  source,
                  count: source === 'a' ? evidence.data.matchingA : evidence.data.matchingB
                })}{' '}
              </span>
            ))}
        {data.intervalMs !== null && <> · {t('explore.logAnalysis.interval', { seconds: data.intervalMs / 1000 })}</>}
      </div>
      {data.truncated && <p>{t('explore.logAnalysis.truncated')}</p>}
      <AnalysisHints analysis={analysis} t={t} />
      {evidence.kind === 'comparison' && <ExploreLogComparisonWindows data={evidence.data} t={t} timeZone={timeZone} />}
      <EvidenceBody {...{ evidence, representation, t, timeZone, display, comparison }} />
    </>
  );
}
function EvidenceBody({ evidence, representation, t, timeZone, display, comparison }: Props) {
  if (evidence.kind === 'querySet') return null;
  const data = evidence.data;
  return !data.groups.length ? (
    <p role="status">
      {t(evidence.kind === 'comparison' ? 'explore.logComparison.noDomain' : 'explore.logAnalysis.noData')}
    </p>
  ) : evidence.kind === 'comparison' ? (
    <ComparisonEvidence
      data={evidence.data}
      hidden={comparison?.hidden ?? []}
      t={t}
      timeZone={timeZone}
      display={display}
    />
  ) : comparison?.formula && comparison.search === undefined ? (
    <FormulaOnlyEvidence
      data={evidence.data}
      formula={comparison.formula}
      hidden={comparison.hidden ?? []}
      t={t}
      display={display}
    />
  ) : (
    <>
      {representation === 'timeseries' ? (
        <ExploreLogAnalysisTimeseries
          data={evidence.data}
          display={display}
          t={t}
          timeZone={timeZone}
          groupLabel={group => logAnalysisGroupLabel(group, t)}
        >
          <AnalysisGroups data={evidence.data} representation="table" t={t} />
        </ExploreLogAnalysisTimeseries>
      ) : (
        <AnalysisGroups data={evidence.data} representation={representation} t={t} />
      )}
    </>
  );
}
function FormulaOnlyEvidence({
  data,
  formula,
  hidden,
  t,
  display
}: {
  data: LogAnalysisResult;
  formula: string;
  hidden: readonly string[];
  t: TFunction;
  display?: 'line' | 'bar' | undefined;
}) {
  const values = formulaOnlyValues(data, formula);
  const chart = formulaOnlySeries(data, formula, hidden, group => logAnalysisGroupLabel(group, t));
  const unit = logAnalysisUnitKey(data);
  return (
    <>
      <p>{t('explore.logAdd.singleFormulaHint')}</p>
      {data.intervalMs && new Set(data.groups.flatMap(group => group.buckets.map(bucket => bucket.start))).size > 1 ? (
        <HertzBeatMetricTimeSeriesResult
          title={t('explore.logAdd.formula', { ref: 'f1' })}
          ariaLabel={t('explore.logAdd.formula', { ref: 'f1' })}
          query={chart.query}
          outcome={chart.outcome}
          runtimeIdentity={chart.runtimeIdentity}
          messages={explorePersesMessages(t)}
          timeSeriesDisplay={display ?? 'line'}
          variant="compact"
        />
      ) : (
        <p role="status">{t('explore.logAnalysis.singleBucket')}</p>
      )}
      <table className={tableStyles.table}>
        <thead>
          <tr>
            <th>{t('explore.logAnalysis.by')}</th>
            {!hidden.includes('a') && <th data-log-stat>{`a${unit ? ` · ${t(unit)}` : ''}`}</th>}
            {!hidden.includes('formula') && <th data-log-stat>{t('explore.logAdd.formula', { ref: 'f1' })}</th>}
          </tr>
        </thead>
        <tbody>
          {values.groups.map(({ group, a, value }) => (
            <tr key={groupIdentity(group)}>
              <th>{logAnalysisGroupLabel(group, t)}</th>
              {!hidden.includes('a') && (
                <td data-log-stat>
                  {a === null ? (
                    t('explore.logComparison.unavailable')
                  ) : (
                    <span title={String(a)}>{formatLogNumericValue(a)}</span>
                  )}
                </td>
              )}
              {!hidden.includes('formula') && (
                <td data-log-stat>
                  {value === null ? (
                    t('explore.logComparison.unavailable')
                  ) : (
                    <span title={String(value)}>{formatLogNumericValue(value)}</span>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
function ComparisonEvidence({
  data,
  hidden,
  t,
  display,
  timeZone
}: {
  display?: 'line' | 'bar' | undefined;
  data: Extract<LogAnalysisEvidence, { kind: 'comparison' }>['data'];
  hidden: readonly ('a' | 'b' | 'formula')[];
  t: TFunction;
  timeZone?: string | undefined;
}) {
  const sources: ('a' | 'b' | 'formula')[] = data.formula ? ['a', 'b', 'formula'] : ['a', 'b'];
  return (
    <>
      <p>{t('explore.logComparison.anchor')}</p>
      {data.formula && data.analysis.additionalMeasures && <p>{t('explore.logComparison.primaryFormula')}</p>}
      {data.analysis.view === 'timeseries' && (
        <ExploreLogComparisonTimeseries data={data} hidden={[...hidden]} t={t} timeZone={timeZone} display={display} />
      )}
      <ComparisonTable data={data} visible={sources.filter(source => !hidden.includes(source))} t={t} />
    </>
  );
}

function AnalysisHints({
  analysis,
  t
}: {
  analysis: LogAnalysisResult | LogComparisonResult['analysis'];
  t: TFunction;
}) {
  if (!analysis.transform && !analysis.grouping && !analysis.measure) return null;
  return (
    <details>
      <summary>{t('signalDashboard.analysisDetails')}</summary>
      {analysis.transform && <p>{t('explore.logAnalysis.rawSummary')}</p>}
      {analysis.grouping && <p>{t('explore.logAnalysis.scalarGrouping')}</p>}
      {analysis.measure && <p>{t(logMeasureHintKey(analysis.measure))}</p>}
    </details>
  );
}
