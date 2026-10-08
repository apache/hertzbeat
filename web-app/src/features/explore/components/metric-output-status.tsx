/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import type { ComponentProps } from 'react';
import type { TFunction } from 'i18next';
import type { MetricView } from '@/platform/perses';
import type { MetricConsole } from '../model/explore-signal-contract';
import type { MetricSeries } from '../model/explore-signal-model';
import type { MetricExploreQuery } from '../model/explore-query';
import { MetricCompositionControls } from './metric-composition-result';
import styles from './metric-output-status.module.css';
import ready from './metric-ready-result.module.css';
export function MetricOutputStatus({
  data,
  series,
  view,
  onViewChange,
  query,
  t
}: {
  data: MetricConsole;
  series: MetricSeries[];
  onViewChange?: ((view: MetricView) => void) | undefined;
  query: MetricExploreQuery;
  t: TFunction;
  view: MetricView;
}) {
  return (
    <>
      {data.composition && onViewChange && (
        <MetricCompositionControls composition={data.composition} view={view} onChange={onViewChange} />
      )}
      {!series.length && (
        <p role="status">
          {t(
            data.composition &&
              [
                ...data.composition.sources.map(source => source.refId),
                ...data.composition.formulas.map(formula => formula.id)
              ].every(ref => view.hidden.includes(ref))
              ? 'explore.metricComposition.allHidden'
              : 'explore.metricComposition.noOutputs'
          )}
        </p>
      )}
      <BucketBoundaryHelp active={!series.length} query={query} t={t} />
    </>
  );
}

export function MetricOutputCanvas(props: ComponentProps<typeof MetricOutputStatus>) {
  const ready = props.series.length > 0;
  return (
    <div
      className={ready ? styles.outputStatus : styles.emptyCanvas}
      data-metric-output-state={ready ? 'ready' : 'no-output'}
    >
      <MetricOutputStatus {...props} />
    </div>
  );
}
export function BucketBoundaryHelp({ active, query, t }: { active: boolean; query: MetricExploreQuery; t: TFunction }) {
  if (!active || !query.query?.trim().endsWith('_bucket')) return null;
  return (
    <details className={styles.resultHelp}>
      <summary>{t('exploreMetric.bucketHelp')}</summary>
      <p className={ready.sampleNotice}>{t('exploreMetric.bucketHint')}</p>
    </details>
  );
}
