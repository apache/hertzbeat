/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Button, Tooltip } from 'antd';
import type { TFunction } from 'i18next';
import type { MetricSeries } from '../model/explore-signal-model';
import { formatMetricSampleValue, formatMetricSeriesLabels, summarizeMetricSeries } from '../model/metric-sample-model';
import styles from './metric-series-summary.module.css';
import { groupMetricSeriesSummary } from '../model/metric-series-summary-model';

export function MetricSeriesSummary({
  series,
  t,
  onOpenLogs
}: {
  series: MetricSeries[];
  t: TFunction;
  onOpenLogs?: (() => void) | undefined;
}) {
  return (
    <section className={styles.summary} aria-label={t('exploreMetric.summary.title')}>
      <div className={styles.heading}>
        <span>{t('exploreMetric.summary.title')}</span>
        {onOpenLogs && (
          <Button type="link" onClick={onOpenLogs}>
            {t('exploreInvestigation.actions.openLogs')}
          </Button>
        )}
      </div>
      <div className={styles.viewport} tabIndex={0}>
        <table aria-label={t('exploreMetric.summary.title')}>
          <thead>
            <tr>
              <th>{t('exploreMetric.series')}</th>
              {(['min', 'max', 'latest', 'count'] as const).map(key => (
                <th key={key}>{t(`exploreMetric.summary.${key}`)}</th>
              ))}
            </tr>
          </thead>
          {groupMetricSeriesSummary(series).map(({ identity, rows, common }) => {
            const first = rows[0]!.item;
            return (
              <tbody key={identity}>
                <tr className={styles.group}>
                  <th colSpan={5} scope="rowgroup">
                    <span>{first.name}</span>
                    {first.unit && <span> ({first.unit})</span>}
                    {Object.keys(common).length > 0 && (
                      <span className={styles.labels}>{formatMetricSeriesLabels(common)}</span>
                    )}
                  </th>
                </tr>
                {rows.map(({ item, number }) => (
                  <SummaryRow key={item.key} series={item} number={number} common={common} />
                ))}
              </tbody>
            );
          })}
        </table>
      </div>
    </section>
  );
}

function SummaryRow({
  series,
  number,
  common
}: {
  series: MetricSeries;
  number: number;
  common: Record<string, string>;
}) {
  const summary = summarizeMetricSeries(series);
  return (
    <tr>
      <th scope="row" aria-label={`#${number} ${series.name} ${formatMetricSeriesLabels(series.labels)}`.trim()}>
        <Tooltip
          trigger={['hover', 'focus']}
          title={`${series.name}${series.unit ? ` (${series.unit})` : ''} · ${formatMetricSeriesLabels(series.labels)}`}
        >
          <span tabIndex={0}>#{number}</span>
        </Tooltip>
        <span className={styles.labels}>
          {formatMetricSeriesLabels(
            Object.fromEntries(Object.entries(series.labels ?? {}).filter(([key]) => !Object.hasOwn(common, key)))
          )}
        </span>
      </th>
      {[summary.min, summary.max, summary.latest].map((value, index) => (
        <td key={index}>{value == null ? '—' : formatMetricSampleValue(value)}</td>
      ))}
      <td>{summary.count}</td>
    </tr>
  );
}
