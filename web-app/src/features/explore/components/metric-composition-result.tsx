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

import { MetricNumberSettings } from './metric-number-result';
import { MetricChartSettings } from './metric-chart-settings';
import { Button, Checkbox, Select } from 'antd';
import { useTranslation } from 'react-i18next';
import type { MetricView, MetricAxisDomain } from '@/platform/perses';
import type { MetricComposition } from '@/platform/perses';
import { explorePersesMessages } from './explore-perses-messages';
import styles from './explore-metric-plan-editor.module.css';
export function MetricCompositionControls({
  composition,
  view,
  onChange
}: {
  composition: MetricComposition;
  view: MetricView;
  onChange: (view: MetricView) => void;
}) {
  const { t } = useTranslation();
  const failures = explorePersesMessages(t).failures;
  return (
    <div className={styles.actions}>
      {composition.sources.map(source => (
        <Checkbox
          key={source.refId}
          checked={!view.hidden.includes(source.refId)}
          onChange={() => onChange(toggleOutput(view, source.refId))}
        >
          {source.refId} ·{' '}
          {source.failure ? failures[source.failure.messageKey] : t(`explore.metricComposition.states.${source.state}`)}
        </Checkbox>
      ))}
      {composition.formulas.map(formula => (
        <Checkbox
          key={formula.id}
          checked={!view.hidden.includes(formula.id)}
          onChange={() => onChange(toggleOutput(view, formula.id))}
        >
          {formula.id} · {formula.expression} · {t(`explore.metricComposition.states.${formula.state}`)}
          {formula.reason && ` (${t(`explore.metricComposition.reasons.${formula.reason}`)})`}
        </Checkbox>
      ))}
    </div>
  );
}
function toggleOutput(view: MetricView, ref: string): MetricView {
  return {
    ...view,
    hidden: view.hidden.includes(ref) ? view.hidden.filter(item => item !== ref) : [...view.hidden, ref]
  };
}
export function MetricViewSelector({
  view,
  onChange,
  dataExtent
}: {
  view: MetricView;
  onChange: (view: MetricView) => void;
  dataExtent?: MetricAxisDomain | undefined;
}) {
  const { t } = useTranslation();
  return (
    <>
      <Select
        aria-label={t('explore.metricComposition.display')}
        value={view.mode}
        options={(['chart', 'split', 'table', 'number'] as const).map(value => ({
          value,
          label: t(`explore.metricComposition.views.${value}`)
        }))}
        onChange={mode => onChange({ ...view, mode })}
      />
      <MetricNumberSettings view={view} onChange={onChange} />
      <MetricChartSettings view={view} onChange={onChange} dataExtent={dataExtent} />
    </>
  );
}
export function MetricInvalidView({ onReset }: { onReset: () => void }) {
  const { t } = useTranslation();
  return (
    <div role="alert">
      {t('explore.metricComposition.invalidView')}{' '}
      <Button onClick={onReset}>{t('explore.metricComposition.resetView')}</Button>
    </div>
  );
}
