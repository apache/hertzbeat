/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { useTranslation } from 'react-i18next';
import { HertzBeatMetricTimeSeriesResult } from '@/platform/perses';
import type { HertzBeatMetricCompositionQuery, HertzBeatMetricQuery, HertzBeatQueryOutcome } from '@/platform/perses';
import { compositionSeries, type MetricComposition } from '@/platform/perses';
import { visibleMetricSeries, type MetricView } from '@/platform/perses';
import { metricSplitDomain, splitMetricSeries } from '@/platform/perses';
import { metricDisplayData } from '@/platform/perses';
import { buildMetricSampleSnapshot, formatMetricSampleValue } from '@/platform/perses';
import type { MetricSeries } from '@/platform/perses';
import type { DashboardPanelRuntimeProps } from '../model/dashboard-panel-runtime-model';
import styles from './dashboard-metric-composition.module.css';

type Props = {
  query: HertzBeatMetricCompositionQuery | HertzBeatMetricQuery;
  outcome: HertzBeatQueryOutcome<MetricComposition>;
  view: MetricView;
  title: string;
  messages: DashboardPanelRuntimeProps['messages'];
  runtimeIdentity: string;
  timeZone?: string | undefined;
  metricPanel?: { kind: 'StatChart' | 'GaugeChart' | 'Table'; max?: number } | undefined;
};
export function DashboardMetricComposition(props: Props) {
  const { t } = useTranslation();
  const { outcome, view } = props;
  if (outcome.state === 'error') return <p role="alert">{props.messages.failures[outcome.error.messageKey]}</p>;
  if (outcome.state !== 'ready') return <p role="status">{props.messages.empty}</p>;
  const all = compositionSeries(outcome.data);
  const visible = visibleMetricSeries(all, view);
  const split = splitMetricSeries(visible, view, all);
  const domain = view.splitScale === 'independent' ? undefined : metricSplitDomain(split.groups);
  return (
    <div className={styles.result} data-metric-panel={props.metricPanel?.kind}>
      <CompositionUnits series={visible} />
      <div className={styles.status}>
        {[
          ...outcome.data.sources.map(source => ({ id: source.refId, state: source.state, failure: source.failure })),
          ...outcome.data.formulas
        ].map(row => (
          <span key={row.id}>
            {row.id} ·{' '}
            {'failure' in row && row.failure
              ? props.messages.failures[row.failure.messageKey]
              : t(`explore.metricComposition.states.${row.state}`)}
            {'expression' in row ? ` · ${row.expression}` : ''}
            {'reason' in row && row.reason ? ` · ${t(`explore.metricComposition.reasons.${row.reason}`)}` : ''}
          </span>
        ))}
      </div>
      {!visible.length ? (
        <p role="status">
          {t(
            visibleMetricSeries(all, { ...view, hidden: [] }).length
              ? 'explore.metricComposition.allHidden'
              : 'explore.metricComposition.noOutputs'
          )}
        </p>
      ) : view.mode === 'table' ? (
        <CompositionSamples series={visible} timeZone={props.timeZone} />
      ) : view.mode === 'split' ? (
        <>
          <p>{t('explore.metricComposition.meanOf', { ref: split.rankBy })}</p>
          <p>{t('explore.metricComposition.splitBounds', { shown: split.groups.length, total: split.total })}</p>
          {!split.groups.length && <p role="status">{t('explore.metricComposition.chooseSplit')}</p>}
          {split.groups.map(group => (
            <section key={JSON.stringify([group.value])}>
              <h4>
                {view.splitBy}: {group.value ?? t('explore.metricComposition.missingLabel')}
              </h4>
              <CompositionChart {...props} series={group.series} domain={domain} />
            </section>
          ))}
        </>
      ) : (
        <CompositionChart {...props} series={visible} />
      )}
    </div>
  );
}
function CompositionChart(
  props: Props & { series: MetricSeries[]; domain?: { min: number; max: number } | undefined }
) {
  return (
    <div className={styles.chart}>
      <HertzBeatMetricTimeSeriesResult
        title={props.title}
        ariaLabel={props.title}
        query={props.query}
        outcome={{
          state: 'ready',
          data: metricDisplayData(props.series, props.query.timeWindow),
          truncated: 'unknown'
        }}
        messages={props.messages}
        runtimeIdentity={props.runtimeIdentity}
        variant="fill"
        timeSeriesYDomain={props.domain}
        metricPanel={props.metricPanel}
        timeWindowChangeEnabled={false}
      />
    </div>
  );
}
function CompositionSamples({ series, timeZone }: { series: MetricSeries[]; timeZone?: string | undefined }) {
  const { t } = useTranslation();
  const samples = buildMetricSampleSnapshot(series);
  return (
    <div className={styles.samples}>
      {samples.truncated && (
        <p>{t('exploreMetric.sampleLimit', { shown: samples.rows.length, received: samples.received })}</p>
      )}
      <table aria-label={t('explore.samples')}>
        <thead>
          <tr>
            <th>{t('explore.time')}</th>
            <th>{t('exploreMetric.seriesReference')}</th>
            <th>{t('exploreMetric.value')}</th>
          </tr>
        </thead>
        <tbody>
          {samples.rows.map(row => (
            <tr key={row.key}>
              <td>
                <time dateTime={new Date(row.timestamp).toISOString()}>
                  {new Date(row.timestamp).toLocaleTimeString(undefined, { timeZone })}
                </time>
              </td>
              <td title={JSON.stringify(series[row.seriesNumber - 1]?.labels)}>
                {series[row.seriesNumber - 1]?.refId ?? row.seriesNumber}
              </td>
              <td>
                {formatMetricSampleValue(row.value)} {row.unit}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CompositionUnits({ series }: { series: MetricSeries[] }) {
  const { t } = useTranslation();
  const units = [...new Set(series.flatMap(item => (item.unit ? [item.unit] : [])))];
  return (
    <>
      {units.length > 1 && <p role="note">{t('explore.metricComposition.mixedUnits', { units: units.join(', ') })}</p>}
      {series.some(item => !item.unit) && <p role="note">{t('explore.metricComposition.unknownUnits')}</p>}
    </>
  );
}
