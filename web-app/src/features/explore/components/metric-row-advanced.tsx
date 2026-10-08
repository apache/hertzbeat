/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { useId, useState } from 'react';
import { Button, Input, Select } from 'antd';
import { useTranslation } from 'react-i18next';
import { METRIC_ROLLUP_INTERVALS, METRIC_TIME_SHIFT_OPTIONS, type MetricQueryRow } from '@/platform/perses';
import { METRIC_TEMPORAL_AGGREGATIONS } from '../model/explore-parity-filter-model';
import { MetricRowHints } from './metric-row-query-help';
import { metricAdvancedSummary } from './metric-query-summary';
import styles from './explore-metric-plan-editor.module.css';
export function MetricRowAdvanced({
  row,
  update
}: {
  row: MetricQueryRow;
  update: (patch: Partial<MetricQueryRow>) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const id = useId();
  const summary = metricAdvancedSummary(row, t);
  return (
    <>
      <Button
        type="text"
        className={styles.advancedToggle ?? ''}
        aria-label={t('explore.metricComposition.options', { ref: row.refId })}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(value => !value)}
      >
        {t('explore.metricComposition.modify')}
      </Button>
      {summary && (
        <p className={styles.advancedSummary} data-metric-advanced-summary title={summary}>
          {summary}
        </p>
      )}
      <div className={styles.advanced} hidden={!open} id={id}>
        <MetricAdvancedFields row={row} update={update} />
        <MetricRowHints row={row} />
      </div>
    </>
  );
}

function MetricAdvancedFields({
  row,
  update
}: {
  row: MetricQueryRow;
  update: (patch: Partial<MetricQueryRow>) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className={styles.options}>
      <label>
        <span>{t('exploreMetric.temporalAggregation')}</span>
        <Select
          aria-label={`${row.refId} ${t('exploreMetric.temporalAggregation')}`}
          value={row.temporalAggregation ?? 'raw'}
          options={METRIC_TEMPORAL_AGGREGATIONS.map(value => ({
            value,
            label: t(`exploreMetric.temporalAggregationValues.${value}`)
          }))}
          onChange={temporalAggregation => update({ temporalAggregation })}
        />
      </label>
      <label>
        <span>{t('exploreMetric.step')}</span>
        <Input
          aria-label={`${row.refId} ${t('exploreMetric.step')}`}
          value={row.step ?? ''}
          onChange={event => update({ step: event.target.value })}
        />
      </label>
      <label>
        <span>{t('exploreMetric.timeShiftSeconds')}</span>
        <Select
          aria-label={`${row.refId} ${t('exploreMetric.timeShiftSeconds')}`}
          value={row.timeShiftSeconds ?? 0}
          options={[...METRIC_TIME_SHIFT_OPTIONS]}
          onChange={value => update({ timeShiftSeconds: value || undefined })}
        />
      </label>
      <MetricRollupFields row={row} update={update} />
    </div>
  );
}

function MetricRollupFields({
  row,
  update
}: {
  row: MetricQueryRow;
  update: (patch: Partial<MetricQueryRow>) => void;
}) {
  const { t } = useTranslation();
  const outerIntervals = METRIC_ROLLUP_INTERVALS.filter(value => value > (row.rollup?.intervalSeconds ?? 0));
  return (
    <>
      <label>
        <span>{t('exploreMetric.rollup')}</span>
        <Select<NonNullable<MetricQueryRow['rollup']>['aggregation'] | 'none'>
          aria-label={`${row.refId} ${t('exploreMetric.rollup')}`}
          value={row.rollup?.aggregation ?? 'none'}
          options={[
            { value: 'none', label: t('exploreMetric.rollupOff') },
            ...(['avg', 'sum', 'min', 'max', 'count'] as const).map(value => ({ value, label: value }))
          ]}
          onChange={value => {
            const rollup =
              value === 'none'
                ? undefined
                : { aggregation: value, intervalSeconds: row.rollup?.intervalSeconds ?? 300 };
            update({
              rollup,
              nestedRollup: rollup ? row.nestedRollup : undefined,
              ...(rollup ? { step: String(row.nestedRollup?.intervalSeconds ?? rollup.intervalSeconds) } : {})
            });
          }}
        />
      </label>
      {row.rollup && (
        <label>
          <span>{t('exploreMetric.rollupWindow')}</span>
          <Select
            aria-label={`${row.refId} ${t('exploreMetric.rollupWindow')}`}
            value={row.rollup.intervalSeconds}
            options={METRIC_ROLLUP_INTERVALS.map(value => ({ value, label: `${value} s` }))}
            onChange={intervalSeconds => {
              const nestedRollup =
                row.nestedRollup && row.nestedRollup.intervalSeconds > intervalSeconds ? row.nestedRollup : undefined;
              update({
                rollup: { ...row.rollup!, intervalSeconds },
                nestedRollup,
                step: String(nestedRollup?.intervalSeconds ?? intervalSeconds)
              });
            }}
          />
        </label>
      )}
      {row.rollup && <MetricNestedRollupFields row={row} update={update} outerIntervals={outerIntervals} />}
    </>
  );
}

function MetricNestedRollupFields({
  row,
  update,
  outerIntervals
}: {
  row: MetricQueryRow;
  update: (patch: Partial<MetricQueryRow>) => void;
  outerIntervals: number[];
}) {
  const { t } = useTranslation();
  return (
    <>
      <label>
        <span>{t('exploreMetric.nestedRollup')}</span>
        <Select<NonNullable<MetricQueryRow['nestedRollup']>['aggregation'] | 'none'>
          aria-label={`${row.refId} ${t('exploreMetric.nestedRollup')}`}
          disabled={!outerIntervals.length}
          value={row.nestedRollup?.aggregation ?? 'none'}
          options={[
            { value: 'none', label: t('exploreMetric.rollupOff') },
            ...(['avg', 'sum', 'min', 'max', 'count'] as const).map(value => ({ value, label: value }))
          ]}
          onChange={value => {
            const nestedRollup =
              value === 'none' || !outerIntervals[0]
                ? undefined
                : { aggregation: value, intervalSeconds: row.nestedRollup?.intervalSeconds ?? outerIntervals[0] };
            update({ nestedRollup, step: String(nestedRollup?.intervalSeconds ?? row.rollup!.intervalSeconds) });
          }}
        />
      </label>
      {row.nestedRollup && (
        <label>
          <span>{t('exploreMetric.nestedRollupWindow')}</span>
          <Select
            aria-label={`${row.refId} ${t('exploreMetric.nestedRollupWindow')}`}
            value={row.nestedRollup.intervalSeconds}
            options={outerIntervals.map(value => ({ value, label: `${value} s` }))}
            onChange={intervalSeconds =>
              update({ nestedRollup: { ...row.nestedRollup!, intervalSeconds }, step: String(intervalSeconds) })
            }
          />
        </label>
      )}
    </>
  );
}
