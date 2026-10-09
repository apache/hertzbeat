/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { logFilterFailureDescription } from '../model/explore-log-filter-failure';
import { focusLogSyntaxDiagnostic } from './focus-log-syntax-diagnostic';
import { ExploreLogComparisonWindows } from './explore-log-comparison-windows';
import { ExploreLogIntervalFailure, ExploreLogIntervalSummary } from './explore-log-interval-controls';
import { logMeasureHintKey, type ComparisonSource } from '@/platform/perses';
import { useRef, useContext } from 'react';
import { Button } from 'antd';
import type { TFunction } from 'i18next';
import type { LogComparisonLoad } from '@/features/explore/model/explore-log-comparison-result';

import { ExploreLogComparisonTimeseries } from './explore-log-comparison-timeseries';
import { ComparisonTable, type ComparisonActions } from './explore-log-comparison-table';
import styles from './explore-log-analysis.module.css';
import representationStyles from './explore-log-representations.module.css';
import { ExploreLogsRecoveryContext } from './explore-logs-recovery-context';
export function ExploreLogComparisonResult({
  load,
  t,
  onUseAuto,
  timeZone,
  hidden = [],
  ...actions
}: ComparisonActions & {
  timeZone?: string | undefined;
  hidden?: ComparisonSource[] | undefined;
  load: LogComparisonLoad;
  t: TFunction;
  onUseAuto?: (() => void) | undefined;
}) {
  if (load.state === 'interval_too_small') return <ExploreLogIntervalFailure t={t} onUseAuto={onUseAuto} />;
  if (load.state === 'idle') return null;
  if (load.state !== 'ready' || !load.data) return <ComparisonStatus load={load} t={t} />;
  const data = load.data;
  const chartProps = { data, t, timeZone, onTimeWindowChange: actions.onTimeWindowChange };
  const sources: ComparisonSource[] = data.formula ? ['a', 'b', 'formula'] : ['a', 'b'];
  return (
    <section className={styles.result} aria-label={t('explore.logComparison.label')}>
      <ComparisonSummary data={data} t={t} />
      <ExploreLogComparisonWindows data={data} timeZone={timeZone} t={t} />
      <p className={styles.measureHint}>{t('explore.logComparison.anchor')}</p>
      <ComparisonFormulaHint formula={data.formula} additionalMeasures={data.analysis.additionalMeasures} t={t} />
      {data.analysis.measure && (
        <p className={styles.measureHint}>
          {`${t(`explore.logAnalysis.${data.analysis.measure.function}`)}(${data.analysis.measure.field})`} ·{' '}
          {t(logMeasureHintKey(data.analysis.measure))}
        </p>
      )}
      <ComparisonSources sources={sources} hidden={hidden} formula={data.formula} t={t} />
      {!data.groups.length ? (
        <p className={styles.state}>{t('explore.logComparison.noDomain')}</p>
      ) : (
        <>
          {data.analysis.view === 'timeseries' && <ExploreLogComparisonTimeseries {...chartProps} hidden={hidden} />}
          <ComparisonTable
            data={data}
            visible={sources.filter(source => !hidden.includes(source))}
            t={t}
            {...actions}
          />
        </>
      )}
    </section>
  );
}

function ComparisonFormulaHint({
  formula,
  additionalMeasures,
  t
}: {
  formula?: string | undefined;
  additionalMeasures?: unknown;
  t: TFunction;
}) {
  return formula && additionalMeasures ? (
    <p className={styles.measureHint}>{t('explore.logComparison.primaryFormula')}</p>
  ) : null;
}

function ComparisonStatus({ load, t }: { load: LogComparisonLoad; t: TFunction }) {
  const region = useRef<HTMLDivElement>(null);
  const recovery = useContext(ExploreLogsRecoveryContext);
  if (load.state === 'invalid_filter')
    return (
      <div ref={region} role="status" className={styles.state}>
        {load.invalidFilter?.source && (
          <p>{t('explore.logComparison.invalidSource', { source: load.invalidFilter.source })}</p>
        )}
        <p>{logFilterFailureDescription(t, load.invalidFilter?.reason, load.invalidFilter?.diagnostic)}</p>
        <Button
          onClick={() => {
            if (load.invalidFilter?.source === 'b' && recovery) {
              recovery.reviewSourceB(load.invalidFilter.diagnostic);
              return;
            }
            if (focusLogSyntaxDiagnostic(region.current, load.invalidFilter?.diagnostic, load.invalidFilter?.source))
              return;
            focusComparisonQuery(region.current, load.invalidFilter?.source);
          }}
        >
          {t('explore.logComparison.review')}
        </Button>
      </div>
    );
  return (
    <div role="status" className={styles.state}>
      <p>
        {t(
          `explore.logAnalysis.${load.state === 'loading' ? 'loading' : load.state === 'permission' ? 'permission' : load.state === 'unavailable' ? 'unavailable' : 'error'}`
        )}
      </p>
      {load.state !== 'loading' && <Button onClick={load.retry}>{t('common.retry')}</Button>}
    </div>
  );
}

function focusComparisonQuery(region: HTMLDivElement | null, source: 'a' | 'b' | undefined) {
  const workspace = region?.closest('[data-explore-query-layout]');
  const query = source
    ? workspace?.querySelector<HTMLInputElement>(
        `[data-log-comparison-source="${source}"] input[data-log-search-input]`
      )
    : undefined;
  if (query) {
    query.focus();
    return;
  }
  workspace?.querySelector<HTMLFormElement>('form')?.focus();
}

function ComparisonSources({
  sources,
  hidden,
  formula,
  t
}: {
  sources: ComparisonSource[];
  hidden: ComparisonSource[];
  formula?: string | undefined;
  t: TFunction;
}) {
  return (
    <div className={representationStyles.representations}>
      {sources
        .filter(source => !hidden.includes(source))
        .map(source => (
          <span key={source}>
            {source === 'formula' ? `${t('explore.logComparison.formula')}: ${formula}` : source}
          </span>
        ))}
    </div>
  );
}

function ComparisonSummary({ data, t }: { data: NonNullable<LogComparisonLoad['data']>; t: TFunction }) {
  return (
    <>
      <header>
        {(['a', 'b'] as const).map(source => (
          <span key={source}>
            {t('explore.logComparison.matching', { source, count: source === 'a' ? data.matchingA : data.matchingB })}
          </span>
        ))}
        <ExploreLogIntervalSummary intervalMs={data.intervalMs} t={t} />
        {data.truncated && <span>{t('explore.logAnalysis.truncated')}</span>}
      </header>
      {data.analysis.transform && <p className={styles.measureHint}>{t('explore.logAnalysis.rawSummary')}</p>}
    </>
  );
}
