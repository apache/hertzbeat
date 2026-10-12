/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { useState } from 'react';
import { Button, Input, Select } from 'antd';
import { useTranslation } from 'react-i18next';
import {
  encodeMetricPlan,
  nextMetricReference,
  validateMetricPlan,
  METRIC_TIME_SHIFT_OPTIONS,
  METRIC_ROLLUP_INTERVALS,
  type MetricPlan,
  type MetricQueryRow
} from '@/platform/perses';
import styles from './signal-dashboard.module.css';
import editorStyles from './signal-dashboard-composition-editor.module.css';
type Props = { plan: MetricPlan; onChange: (plan: MetricPlan) => void; disabled: boolean };
export function DashboardCompositionEditor(props: Props) {
  const [oversized, setOversized] = useState(false);
  const { t } = useTranslation();
  const change = (plan: MetricPlan) => {
    try {
      encodeMetricPlan(plan);
    } catch {
      setOversized(true);
      return;
    }
    setOversized(false);
    props.onChange(plan);
  };
  const nextRef = nextMetricReference(props.plan);
  return (
    <div className={styles.fields}>
      {props.plan.queries.map(row => (
        <Source key={row.refId} row={row} {...props} onChange={change} />
      ))}
      <FormulaRows {...props} onChange={change} />
      <Button
        disabled={props.disabled || props.plan.queries.length >= 4 || !nextRef}
        onClick={() => {
          if (nextRef) change({ ...props.plan, queries: [...props.plan.queries, { refId: nextRef, metric: '' }] });
        }}
      >
        {t('explore.metricComposition.addQuery')}
      </Button>
      <Button
        disabled={props.disabled || props.plan.formulas.length >= 4}
        onClick={() => {
          const id = ['f1', 'f2', 'f3', 'f4'].find(id => !props.plan.formulas.some(item => item.id === id));
          if (id) change({ ...props.plan, formulas: [...props.plan.formulas, { id, expression: '' }] });
        }}
      >
        {t('explore.metricComposition.addFormula')}
      </Button>
      {validateMetricPlan(props.plan).map((issue, index) => (
        <p role="alert" key={index}>
          {issue.row}: {t(`explore.metricComposition.errors.${issue.reason}`, { reference: issue.reference })}
        </p>
      ))}
      {oversized && <p role="alert">{t('explore.metricComposition.tooLarge')}</p>}
    </div>
  );
}
function Source({ row, plan, onChange, disabled }: Props & { row: MetricQueryRow }) {
  const { t } = useTranslation();
  const update = (field: string, value: string) =>
    onChange({
      ...plan,
      queries: plan.queries.map(item => (item.refId === row.refId ? { ...item, [field]: value } : item))
    });
  return (
    <fieldset className={editorStyles.source} disabled={disabled}>
      <legend>{t('explore.metricComposition.metric', { ref: row.refId })}</legend>
      <div className={styles.fields}>
        {(
          [
            { key: 'metric', label: 'signalDashboard.fields.name' },
            { key: 'metricFilter', label: 'exploreMetric.filter' },
            { key: 'groupBy', label: 'exploreMetric.groupBy' },
            { key: 'step', label: 'exploreMetric.step' }
          ] as const
        ).map(({ key, label }) => (
          <label key={key}>
            {t(label)}
            <Input
              disabled={disabled}
              aria-label={`${row.refId} ${t(label)}`}
              value={row[key] ?? ''}
              onChange={event => update(key, event.target.value)}
            />
          </label>
        ))}
        {(
          [
            { key: 'aggregation', values: ['sum', 'avg', 'min', 'max', 'count'], fallback: 'sum' },
            { key: 'temporalAggregation', values: ['raw', 'rate', 'increase', 'delta'], fallback: 'raw' }
          ] as const
        ).map(({ key, values, fallback }) => (
          <label key={key}>
            {t(`exploreMetric.${key}`)}
            <Select
              disabled={disabled}
              aria-label={`${row.refId} ${t(`exploreMetric.${key}`)}`}
              value={row[key] || fallback}
              options={values.map(value => ({ value, label: value }))}
              onChange={value => update(key, value)}
            />
          </label>
        ))}
        <label>
          {t('exploreMetric.timeShiftSeconds')}
          <Select
            disabled={disabled}
            aria-label={`${row.refId} ${t('exploreMetric.timeShiftSeconds')}`}
            value={row.timeShiftSeconds ?? 0}
            options={[...METRIC_TIME_SHIFT_OPTIONS]}
            onChange={value =>
              onChange({
                ...plan,
                queries: plan.queries.map(item =>
                  item.refId === row.refId ? { ...item, timeShiftSeconds: value || undefined } : item
                )
              })
            }
          />
        </label>
        <DashboardRollupFields row={row} plan={plan} onChange={onChange} disabled={disabled} />
        <Button
          disabled={disabled || plan.queries.length === 1}
          onClick={() => onChange({ ...plan, queries: plan.queries.filter(item => item.refId !== row.refId) })}
        >
          {t('explore.metricComposition.removeQuery', { ref: row.refId })}
        </Button>
      </div>
    </fieldset>
  );
}

function DashboardRollupFields({ row, plan, onChange, disabled }: Props & { row: MetricQueryRow }) {
  const { t } = useTranslation();
  const outerIntervals = METRIC_ROLLUP_INTERVALS.filter(value => value > (row.rollup?.intervalSeconds ?? 0));
  const commit = (rollup: MetricQueryRow['rollup'], nestedRollup = row.nestedRollup) =>
    onChange({
      ...plan,
      queries: plan.queries.map(item =>
        item.refId === row.refId
          ? {
              ...item,
              rollup,
              nestedRollup: rollup ? nestedRollup : undefined,
              ...(rollup ? { step: String(nestedRollup?.intervalSeconds ?? rollup.intervalSeconds) } : {})
            }
          : item
      )
    });
  return (
    <>
      <label>
        {t('exploreMetric.rollup')}
        <Select<NonNullable<MetricQueryRow['rollup']>['aggregation'] | 'none'>
          disabled={disabled}
          aria-label={`${row.refId} ${t('exploreMetric.rollup')}`}
          value={row.rollup?.aggregation ?? 'none'}
          options={[
            { value: 'none', label: t('exploreMetric.rollupOff') },
            ...(['avg', 'sum', 'min', 'max', 'count'] as const).map(value => ({ value, label: value }))
          ]}
          onChange={value =>
            commit(
              value === 'none' ? undefined : { aggregation: value, intervalSeconds: row.rollup?.intervalSeconds ?? 300 }
            )
          }
        />
      </label>
      {row.rollup && (
        <label>
          {t('exploreMetric.rollupWindow')}
          <Select
            disabled={disabled}
            aria-label={`${row.refId} ${t('exploreMetric.rollupWindow')}`}
            value={row.rollup.intervalSeconds}
            options={METRIC_ROLLUP_INTERVALS.map(value => ({ value, label: `${value} s` }))}
            onChange={intervalSeconds => {
              if (row.rollup)
                commit(
                  { ...row.rollup, intervalSeconds },
                  row.nestedRollup && row.nestedRollup.intervalSeconds > intervalSeconds ? row.nestedRollup : undefined
                );
            }}
          />
        </label>
      )}
      {row.rollup && (
        <label>
          {t('exploreMetric.nestedRollup')}
          <Select<NonNullable<MetricQueryRow['nestedRollup']>['aggregation'] | 'none'>
            disabled={disabled || !outerIntervals.length}
            aria-label={`${row.refId} ${t('exploreMetric.nestedRollup')}`}
            value={row.nestedRollup?.aggregation ?? 'none'}
            options={[
              { value: 'none', label: t('exploreMetric.rollupOff') },
              ...(['avg', 'sum', 'min', 'max', 'count'] as const).map(value => ({ value, label: value }))
            ]}
            onChange={value =>
              commit(
                row.rollup,
                value === 'none' || !outerIntervals[0]
                  ? undefined
                  : { aggregation: value, intervalSeconds: row.nestedRollup?.intervalSeconds ?? outerIntervals[0] }
              )
            }
          />
        </label>
      )}
      {row.nestedRollup && (
        <label>
          {t('exploreMetric.nestedRollupWindow')}
          <Select
            disabled={disabled}
            aria-label={`${row.refId} ${t('exploreMetric.nestedRollupWindow')}`}
            value={row.nestedRollup.intervalSeconds}
            options={outerIntervals.map(value => ({ value, label: `${value} s` }))}
            onChange={intervalSeconds => commit(row.rollup, { ...row.nestedRollup!, intervalSeconds })}
          />
        </label>
      )}
    </>
  );
}

function FormulaRows(props: Props) {
  const { t } = useTranslation();
  const change = props.onChange;
  return (
    <>
      {props.plan.formulas.map(formula => (
        <label key={formula.id}>
          {t('explore.metricComposition.formula', { ref: formula.id })}
          <Input
            disabled={props.disabled}
            aria-label={t('explore.metricComposition.formula', { ref: formula.id })}
            value={formula.expression}
            maxLength={256}
            onChange={event =>
              change({
                ...props.plan,
                formulas: props.plan.formulas.map(item =>
                  item.id === formula.id ? { ...item, expression: event.target.value } : item
                )
              })
            }
          />
          <Button
            disabled={props.disabled}
            onClick={() =>
              change({ ...props.plan, formulas: props.plan.formulas.filter(item => item.id !== formula.id) })
            }
          >
            {t('explore.metricComposition.removeFormula', { ref: formula.id })}
          </Button>
        </label>
      ))}
    </>
  );
}
