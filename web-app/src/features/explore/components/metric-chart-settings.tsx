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

import { Button, Checkbox, Grid, Input, Popover, Select } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { metricAxisBoundsValid, metricAxisScaleValid, type MetricAxisDomain, type MetricView } from '@/platform/perses';
import styles from './metric-chart-settings.module.css';
export function MetricChartSettings({
  view,
  onChange,
  dataExtent
}: {
  dataExtent?: MetricAxisDomain | undefined;
  view: MetricView;
  onChange?: ((view: MetricView) => void) | undefined;
}) {
  const { t } = useTranslation();
  const narrow = Grid.useBreakpoint().xs;
  if (!onChange || view.mode !== 'chart') return null;
  return (
    <Popover
      trigger="click"
      placement={narrow ? 'bottom' : 'bottomRight'}
      content={<ChartSettingsContent view={view} onChange={onChange} dataExtent={dataExtent} />}
    >
      <Button>{t('explore.metricChart.settings')}</Button>
    </Popover>
  );
}
function ChartSettingsContent({
  view,
  onChange,
  dataExtent
}: {
  view: MetricView;
  onChange: (view: MetricView) => void;
  dataExtent: MetricAxisDomain | undefined;
}) {
  const { t } = useTranslation();
  const change = (chart: MetricView['chart']) => onChange({ ...view, chart });
  return (
    <div className={styles.settings}>
      <label>
        <span>{t('explore.metricChart.style')}</span>
        <Select
          aria-label={t('explore.metricChart.style')}
          value={view.chart?.display ?? 'line'}
          options={(['line', 'bar'] as const).map(value => ({ value, label: t(`explore.metricChart.${value}`) }))}
          onChange={display => change({ ...view.chart, display })}
        />
      </label>
      <Checkbox
        checked={view.chart?.legend ?? true}
        onChange={event => change({ ...view.chart, legend: event.target.checked })}
      >
        {t('explore.metricChart.legend')}
      </Checkbox>
      <AxisSettings view={view} onChange={onChange} dataExtent={dataExtent} />
    </div>
  );
}
function AxisSettings({
  view,
  onChange,
  dataExtent
}: {
  view: MetricView;
  onChange: (view: MetricView) => void;
  dataExtent: MetricAxisDomain | undefined;
}) {
  const { t } = useTranslation();
  const owner = JSON.stringify([view.chart?.min, view.chart?.max]);
  const initial = () => ({ owner, min: String(view.chart?.min ?? ''), max: String(view.chart?.max ?? ''), error: '' });
  const [draft, setDraft] = useState(initial);
  if (draft.owner !== owner) setDraft(initial());
  const apply = () => {
    const range = parseAxis(draft.min, draft.max);
    if (typeof range === 'string') {
      setDraft({ ...draft, error: range });
      return;
    }
    if (!metricAxisScaleValid(range, dataExtent, view.chart?.display === 'bar')) {
      setDraft({ ...draft, error: 'unsafeRange' });
      return;
    }
    setDraft({ ...draft, error: '' });
    const chart = { ...view.chart };
    delete chart.min;
    delete chart.max;
    onChange({ ...view, chart: { ...chart, ...range } });
  };
  return (
    <>
      <p>{t('explore.metricChart.autoHint')}</p>
      {(['min', 'max'] as const).map(field => (
        <label key={field}>
          <span>{t(`explore.metricChart.${field}`)}</span>
          <Input
            aria-label={t(`explore.metricChart.${field}`)}
            placeholder={t('explore.metricChart.auto')}
            inputMode="decimal"
            value={draft[field]}
            onChange={event => setDraft({ ...draft, [field]: event.target.value, error: '' })}
            onKeyDown={event => {
              if (event.key === 'Enter') {
                event.preventDefault();
                if (!event.nativeEvent.isComposing && event.nativeEvent.keyCode !== 229) apply();
              }
            }}
          />
        </label>
      ))}
      {draft.error && <p role="alert">{t(`explore.metricChart.${draft.error}`)}</p>}
      <Button onClick={apply}>{t('explore.metricChart.apply')}</Button>
    </>
  );
}
function parseAxis(
  min: string,
  max: string
): { min?: number; max?: number } | 'invalidNumber' | 'invalidOrder' | 'unsafeRange' {
  const result: { min?: number; max?: number } = {};
  for (const [field, raw] of [
    ['min', min],
    ['max', max]
  ] as const) {
    const value = raw.trim();
    if (!value) continue;
    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/iu.test(value) || !Number.isFinite(Number(value)))
      return 'invalidNumber';
    result[field] = Number(value);
  }
  if (result.min !== undefined && result.max !== undefined && result.min >= result.max) return 'invalidOrder';
  return metricAxisBoundsValid(result) ? result : 'unsafeRange';
}
