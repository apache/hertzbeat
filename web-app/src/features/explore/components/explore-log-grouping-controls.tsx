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

import { ArrowUpOutlined, CloseOutlined } from '@ant-design/icons';
import { Select, type RefSelectProps } from 'antd';
import styles from './explore-log-analysis.module.css';
import type { TFunction } from 'i18next';
import type { Ref } from 'react';
import { type LogAnalysisState, groupingLimit, type LogGrouping } from '@/platform/perses';
import type { LogFacetField } from '../model/explore-log-facets';

type Dimensions = LogGrouping['dimensions'];
type Props = {
  value: LogAnalysisState;
  fields: LogFacetField[];
  extraFields?: string[];
  onChange: (value: LogAnalysisState) => void;
  fieldRef?: Ref<RefSelectProps> | undefined;
  t: TFunction;
};
export function ExploreLogGroupingControls({ value, fields, extraFields = [], onChange, fieldRef, t }: Props) {
  const dimensions = value.grouping?.dimensions ?? (value.field ? [{ field: value.field, limit: value.limit }] : []);
  const options = [
    ...new Set([...fields.map(field => field.id), ...extraFields, ...dimensions.map(item => item.field)])
  ];
  const apply = (next: Dimensions) => onChange(withDimensions(value, next));
  const unused = options.find(field => !dimensions.some(item => item.field === field));
  return (
    <>
      {!value.grouping ? (
        <label>
          {t('explore.logAnalysis.by')}
          <Select<string>
            ref={fieldRef}
            aria-label={t('explore.logAnalysis.by')}
            data-log-analysis-focus="group"
            value={value.field ?? ''}
            popupMatchSelectWidth={false}
            options={[{ value: '', label: t('explore.logAnalysis.everything') }, ...fieldOptions(options, t)]}
            onChange={field => onChange({ ...value, field: field || undefined })}
          />
        </label>
      ) : (
        dimensions.map((_, index) => (
          <GroupingDimension
            key={dimensions[index]!.field}
            dimensions={dimensions}
            index={index}
            options={options}
            apply={apply}
            t={t}
          />
        ))
      )}
      <button
        type="button"
        disabled={!unused || dimensions.length >= 4}
        title={t('explore.logAnalysis.groupingBudget')}
        onClick={() => {
          if (unused) apply([...dimensions, { field: unused, limit: dimensions.length ? 1 : value.limit }]);
        }}
      >
        {t('explore.logAnalysis.addGrouping')}
      </button>
    </>
  );
}
function GroupingDimension({
  dimensions,
  index,
  options,
  apply,
  t
}: {
  dimensions: Dimensions;
  index: number;
  options: string[];
  apply: (next: Dimensions) => void;
  t: TFunction;
}) {
  const dimension = dimensions[index]!;
  const update = (patch: Partial<Dimensions[number]>) =>
    apply(dimensions.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  const total = groupingLimit({ dimensions });
  return (
    <span className={styles.dimension}>
      <label>
        {t('explore.logAnalysis.dimension', { index: index + 1 })}
        <Select<string>
          aria-label={t('explore.logAnalysis.dimension', { index: index + 1 })}
          value={dimension.field}
          popupMatchSelectWidth={false}
          options={fieldOptions(
            options,
            t,
            dimensions.filter(item => item.field !== dimension.field).map(item => item.field)
          )}
          onChange={field => update({ field })}
        />
      </label>
      <label>
        {t('explore.logAnalysis.dimensionLimit', { index: index + 1 })}
        <Select<number>
          aria-label={t('explore.logAnalysis.dimensionLimit', { index: index + 1 })}
          value={dimension.limit}
          onChange={limit => update({ limit })}
          options={limitOptions(dimension.limit, total)}
        />
      </label>
      <button
        type="button"
        disabled={index === 0}
        aria-label={t('explore.logAnalysis.moveGrouping', { index: index + 1 })}
        onClick={() => apply(moveEarlier(dimensions, index))}
      >
        <ArrowUpOutlined />
      </button>
      <button
        type="button"
        aria-label={t('explore.logAnalysis.removeGrouping', { index: index + 1 })}
        onClick={() => apply(dimensions.filter((_, i) => i !== index))}
      >
        <CloseOutlined />
      </button>
    </span>
  );
}
function limitOptions(current: number, total: number) {
  return [...new Set([1, 2, 5, 10, 20, 50, 100, current])]
    .sort((a, b) => a - b)
    .map(limit => ({ value: limit, label: limit, disabled: (total / current) * limit > 100 }));
}
function moveEarlier(dimensions: Dimensions, index: number) {
  const next = [...dimensions];
  [next[index - 1], next[index]] = [next[index]!, next[index - 1]!];
  return next;
}
function fieldLabel(field: string, t: TFunction) {
  return field.startsWith('builtin:')
    ? t(`explore.logFacets.builtin.${field.slice(8)}`)
    : field.startsWith('calculated:')
      ? `#${field.slice(11)}`
      : field;
}

function withDimensions(value: LogAnalysisState, next: Dimensions): LogAnalysisState {
  const state = { ...value };
  delete state.field;
  delete state.grouping;
  return next.length <= 1
    ? { ...state, field: next[0]?.field, limit: next[0]?.limit ?? value.limit }
    : { ...state, grouping: { version: 1, dimensions: next }, limit: groupingLimit({ dimensions: next }) };
}
function fieldOptions(options: string[], t: TFunction, unavailable: string[] = []) {
  return options.map(field => ({ value: field, label: fieldLabel(field, t), disabled: unavailable.includes(field) }));
}
