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

import { Select, Tooltip, type RefSelectProps } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';
import type { TFunction } from 'i18next';
import type { Ref } from 'react';
import type { LogFacetField } from '../model/explore-log-facets';
import { LOG_MEASURE_FUNCTIONS, isLogPercentile, sameLogMeasure, type LogMeasure } from '@/platform/perses';
import { logGroupingFieldLabel } from '../model/explore-log-grouping';
type Props = {
  measure: LogMeasure | undefined;
  fields: LogFacetField[];
  extraFields?: string[] | undefined;
  allowCount?: boolean;
  excludedMeasures?: LogMeasure[];
  onChange: (measure: LogMeasure | undefined) => void;
  fieldRef?: Ref<RefSelectProps> | undefined;
  t: TFunction;
};
export function LogMeasureSelector({
  measure,
  fields,
  extraFields = [],
  allowCount = false,
  excludedMeasures = [],
  onChange,
  fieldRef,
  t
}: Props) {
  const options = [...new Set([...fields.map(field => field.id), ...extraFields, ...(measure ? [measure.field] : [])])];
  const eligible = (fn: string) => eligibleMeasureFields(options, fn, measure, excludedMeasures);
  const functions = allowCount ? ['count', ...LOG_MEASURE_FUNCTIONS] : [...LOG_MEASURE_FUNCTIONS];
  return (
    <>
      <label>
        <MeasureLabel measure={measure} t={t} />
        <Select<string>
          aria-label={t('explore.logAnalysis.show')}
          value={measure?.function ?? 'count'}
          popupMatchSelectWidth={false}
          onChange={fn => {
            if (fn === 'count') return onChange(undefined);
            const field = eligible(fn).find(field => field === measure?.field) ?? eligible(fn)[0];
            if (field) onChange({ function: fn as LogMeasure['function'], field });
          }}
          options={functions.map(fn => ({
            value: fn,
            label: t(`explore.logAnalysis.${fn}`),
            disabled: fn !== 'count' && !eligible(fn).length
          }))}
        />
      </label>
      {measure && (
        <label>
          {t('explore.logAnalysis.measureField')}
          <Select<string>
            ref={fieldRef}
            aria-label={t('explore.logAnalysis.measureField')}
            data-log-analysis-focus="measure"
            value={measure.field}
            popupMatchSelectWidth={false}
            onChange={field => onChange({ ...measure, field })}
            options={eligible(measure.function).map(field => ({
              value: field,
              label: field.startsWith('calculated:') ? `#${field.slice(11)}` : logGroupingFieldLabel(field, t)
            }))}
          />
        </label>
      )}
    </>
  );
}
function MeasureLabel({ measure, t }: { measure: LogMeasure | undefined; t: TFunction }) {
  return (
    <span>
      {t('explore.logAnalysis.show')}
      {isLogPercentile(measure) && (
        <>
          {' '}
          <Tooltip title={t('explore.logAnalysis.percentileHint')}>
            <QuestionCircleOutlined tabIndex={0} aria-label={t('explore.logAnalysis.percentileHint')} />
          </Tooltip>
        </>
      )}
    </span>
  );
}

function eligibleMeasureFields(
  options: string[],
  fn: string,
  selected: LogMeasure | undefined,
  excluded: LogMeasure[]
) {
  return options.filter(
    field =>
      (fn === 'unique' || !field.startsWith('builtin:')) &&
      ((selected?.field === field && selected.function === fn) ||
        !excluded.some(other => sameLogMeasure(other, { function: fn as LogMeasure['function'], field })))
  );
}
