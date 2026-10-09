/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { Select } from 'antd';
import type { TFunction } from 'i18next';
import { HertzBeatMetricTimeSeriesResult } from '@/platform/perses';
import type { ExactTimeWindow } from '@/shared/query-context';
import type { MetricConsole } from '../model/explore-signal-contract';
import { metricPoints, type MetricSeries } from '../model/explore-signal-model';
import type { MetricExploreQuery } from '../model/explore-query';
import type { MetricView } from '@/platform/perses';
import { metricSplitDomain, splitMetricSeries } from '@/platform/perses';
import { createExploreMetricPersesResult } from '../model/explore-perses-result-model';
import { explorePersesMessages } from './explore-perses-messages';
import styles from './metric-split-result.module.css';
type Props = {
  data: MetricConsole;
  series: MetricSeries[];
  rankingSeries?: MetricSeries[] | undefined;
  query: MetricExploreQuery;
  timeWindow: ExactTimeWindow;
  revision: number;
  t: TFunction;
  view: MetricView;
  onViewChange: (view: MetricView) => void;
};
export function MetricSplitResult(props: Props) {
  const { view, t, series } = props;
  const split = splitMetricSeries(series, view, props.rankingSeries);
  const domain = view.splitScale === 'independent' ? undefined : metricSplitDomain(split.groups);
  return (
    <div>
      <MetricSplitControls {...props} rankBy={split.rankBy} labels={split.labels} />
      <p>{t('explore.metricComposition.splitBounds', { shown: split.groups.length, total: split.total })}</p>
      {!split.groups.length && <p role="status">{t('explore.metricComposition.chooseSplit')}</p>}
      <div className={styles.grid}>
        {split.groups.map((group, index) => (
          <MetricSplitChart
            domain={domain}
            key={JSON.stringify([group.value])}
            {...props}
            series={group.series}
            title={`${view.splitBy}: ${group.value ?? t('explore.metricComposition.missingLabel')}`}
            revision={props.revision + index}
          />
        ))}
      </div>
    </div>
  );
}
function MetricSplitChart({
  data,
  series,
  query,
  timeWindow,
  revision,
  t,
  title,
  domain
}: Props & { title: string; domain: { min: number; max: number } | undefined }) {
  const result = createExploreMetricPersesResult(query, data, timeWindow, revision, series);
  return (
    <section className={styles.group}>
      <h4>{title}</h4>
      <HertzBeatMetricTimeSeriesResult
        timeSeriesYDomain={domain}
        className={styles.chart ?? ''}
        title={title}
        ariaLabel={title}
        variant="fill"
        query={result.query}
        outcome={result.outcome}
        runtimeIdentity={result.runtimeIdentity}
        messages={explorePersesMessages(t)}
      />
    </section>
  );
}

function MetricSplitControls({
  view,
  onViewChange,
  t,
  series,
  rankingSeries,
  labels,
  rankBy
}: Props & { labels: string[]; rankBy: string | undefined }) {
  return (
    <div className={styles.controls}>
      <Select
        aria-label={t('explore.metricComposition.rankOutput')}
        value={rankBy ?? null}
        options={[
          ...new Set(
            (rankingSeries ?? series).flatMap(item => (item.refId && metricPoints(item).length ? [item.refId] : []))
          )
        ].map(value => ({
          value,
          label: t('explore.metricComposition.meanOf', { ref: value })
        }))}
        onChange={splitRankBy => onViewChange({ ...view, splitRankBy })}
      />
      <Select
        aria-label={t('explore.metricComposition.splitBy')}
        placeholder={t('explore.metricComposition.splitBy')}
        value={view.splitBy}
        options={labels.map(value => ({ value, label: value }))}
        onChange={splitBy => onViewChange({ ...view, splitBy })}
      />
      <Select
        aria-label={t('explore.metricComposition.splitOrder')}
        value={view.splitOrder ?? 'top'}
        options={(['top', 'bottom'] as const).map(value => ({
          value,
          label: t(`explore.metricComposition.${value}`)
        }))}
        onChange={splitOrder => onViewChange({ ...view, splitOrder })}
      />
      <Select
        aria-label={t('explore.metricComposition.splitLimit')}
        value={view.splitLimit ?? 12}
        options={[4, 8, 12].map(value => ({ value, label: String(value) }))}
        onChange={splitLimit => onViewChange({ ...view, splitLimit })}
      />
      <Select
        aria-label={t('explore.metricComposition.splitScale')}
        value={view.splitScale ?? 'uniform'}
        options={(['uniform', 'independent'] as const).map(value => ({
          value,
          label: t(`explore.metricComposition.${value}`)
        }))}
        onChange={splitScale => onViewChange({ ...view, splitScale })}
      />
    </div>
  );
}
