/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { Checkbox, Input, InputNumber, Select } from 'antd';
import { useTranslation } from 'react-i18next';
import type { MetricPlan } from '@/platform/perses';
import type { MetricView } from '@/platform/perses';
import styles from './signal-dashboard.module.css';
export function DashboardMetricViewEditor({
  view,
  plan,
  onChange,
  disabled
}: {
  view: MetricView;
  plan: MetricPlan;
  onChange: (view: MetricView) => void;
  disabled: boolean;
}) {
  const { t } = useTranslation();
  const refs = [...plan.queries.map(row => row.refId), ...plan.formulas.map(row => row.id)];
  return (
    <div className={styles.fields}>
      <label>
        {t('explore.metricComposition.display')}
        <Select
          disabled={disabled}
          aria-label={t('explore.metricComposition.display')}
          value={view.mode}
          options={(['chart', 'table', 'split'] as const).map(value => ({
            value,
            label: t(`explore.metricComposition.views.${value}`)
          }))}
          onChange={mode => onChange({ ...view, mode })}
        />
      </label>
      {refs.map(ref => (
        <Checkbox
          key={ref}
          disabled={disabled}
          checked={!view.hidden.includes(ref)}
          onChange={event =>
            onChange({
              ...view,
              hidden: event.target.checked ? view.hidden.filter(item => item !== ref) : [...view.hidden, ref]
            })
          }
        >
          {ref}
        </Checkbox>
      ))}
      <SplitSettings view={view} refs={refs} onChange={onChange} disabled={disabled} />
    </div>
  );
}

type SplitProps = { view: MetricView; refs: string[]; onChange: (view: MetricView) => void; disabled: boolean };
function SplitSettings({ view, refs, onChange, disabled }: SplitProps) {
  const { t } = useTranslation();
  if (view.mode !== 'split') return null;
  return (
    <>
      <label>
        {t('explore.metricComposition.splitBy')}
        <Input
          disabled={disabled}
          maxLength={128}
          aria-label={t('explore.metricComposition.splitBy')}
          value={view.splitBy ?? ''}
          onChange={event => onChange({ ...view, splitBy: event.target.value })}
        />
      </label>
      <label>
        {t('explore.metricComposition.rankOutput')}
        <Select
          disabled={disabled}
          aria-label={t('explore.metricComposition.rankOutput')}
          value={view.splitRankBy ?? refs[0] ?? null}
          options={refs.map(value => ({ value, label: value }))}
          onChange={splitRankBy => onChange({ ...view, splitRankBy })}
        />
      </label>
      <label>
        {t('explore.metricComposition.splitLimit')}
        <InputNumber
          disabled={disabled}
          aria-label={t('explore.metricComposition.splitLimit')}
          min={1}
          max={12}
          value={view.splitLimit ?? 12}
          onChange={value => {
            if (value) onChange({ ...view, splitLimit: value });
          }}
        />
      </label>
      {(
        [
          { key: 'splitOrder', values: ['top', 'bottom'], fallback: 'top' },
          { key: 'splitScale', values: ['uniform', 'independent'], fallback: 'uniform' }
        ] as const
      ).map(({ key, values, fallback }) => (
        <label key={key}>
          {t(`explore.metricComposition.${key}`)}
          <Select
            disabled={disabled}
            aria-label={t(`explore.metricComposition.${key}`)}
            value={view[key] ?? fallback}
            options={values.map(value => ({ value, label: t(`explore.metricComposition.${value}`) }))}
            onChange={value => onChange({ ...view, [key]: value })}
          />
        </label>
      ))}
    </>
  );
}
