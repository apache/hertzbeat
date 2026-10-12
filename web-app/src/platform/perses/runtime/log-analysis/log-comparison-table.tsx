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

import { AdditionalMeasureHeaders, AdditionalComparisonCells } from './log-additional-measure-cells';
import { isLogPercentile } from '../../logs/log-measure';
import { type LogComparisonGroup, type LogComparisonResult } from '../../logs/log-comparison-result';
import { comparisonValues, type ComparisonSource } from '../../logs/log-comparison-values';
import { Button } from 'antd';
import type { TFunction } from 'i18next';
import type { ExactTimeWindow } from '@/shared/query-context';

import { comparisonGroupLabel } from './log-comparison-values-display';
import { groupValueLabel, logGroupingFieldLabel } from './log-grouping-display';
import { LogMeasureValue } from './log-measure-value';
import { logAnalysisUnitKey } from '../../logs/log-analysis-unit';
import { formatLogNumericValue } from './log-throughput-display';
import styles from './log-analysis.module.css';
export type ComparisonActions = {
  canOpenGroup?: ((group: LogComparisonGroup, source: 'a' | 'b') => boolean) | undefined;
  onGroup?: ((group: LogComparisonGroup, source: 'a' | 'b') => void) | undefined;
  onTimeWindowChange?: ((window: ExactTimeWindow) => void) | undefined;
};
export function ComparisonTable({
  data,
  visible,
  t,
  ...actions
}: ComparisonActions & { data: LogComparisonResult; visible: ComparisonSource[]; t: TFunction }) {
  const value = comparisonValues(data);
  const additionalMeasures = visible.some(source => source !== 'formula')
    ? data.analysis.additionalMeasures
    : undefined;
  const fields = data.groups[0]?.keys.map(key => key.field) ?? [];
  return (
    <div className={styles.scroll}>
      <table
        className={styles.table}
        style={{
          minWidth:
            Math.max(1, fields.length) * 160 +
            visible.length * 110 +
            (actions.onGroup ? 180 : 0) +
            (additionalMeasures?.length ?? 0) * 170
        }}
      >
        <ComparisonHeaders fields={fields} visible={visible} data={data} t={t} interactive={Boolean(actions.onGroup)} />
        <tbody>
          {data.groups.map(group => (
            <tr key={JSON.stringify(group.keys)}>
              {group.keys.length ? (
                group.keys.map(key => (
                  <td key={key.field}>
                    <span className={styles.label} title={groupValueLabel(key, t)}>
                      {groupValueLabel(key, t)}
                    </span>
                  </td>
                ))
              ) : (
                <td>{comparisonGroupLabel(group, t)}</td>
              )}
              {visible.map(source => (
                <td data-log-stat key={source}>
                  <ComparisonCell group={group} source={source} data={data} value={value(group, source)} t={t} />
                </td>
              ))}
              <AdditionalComparisonCells measures={additionalMeasures} group={group} visible={visible} t={t} />
              {actions.onGroup && (
                <td>
                  <InspectActions group={group} actions={actions} t={t} />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ComparisonHeaders({
  fields,
  visible,
  data,
  t,
  interactive
}: {
  interactive: boolean;
  fields: string[];
  visible: ComparisonSource[];
  data: LogComparisonResult;
  t: TFunction;
}) {
  const unit = logAnalysisUnitKey(data.analysis);
  return (
    <thead>
      <tr>
        {fields.length ? (
          fields.map(field => (
            <th key={field}>
              <span className={styles.label} title={field}>
                {logGroupingFieldLabel(field, t)}
              </span>
            </th>
          ))
        ) : (
          <th>{t('explore.logAnalysis.value')}</th>
        )}
        {visible.map(source => (
          <th key={source} data-log-stat>
            {source === 'formula' ? data.formula : `${source}${unit ? ` · ${t(unit)}` : ''}`}
          </th>
        ))}
        <AdditionalMeasureHeaders
          paired
          measures={visible.some(source => source !== 'formula') ? data.analysis.additionalMeasures : undefined}
          t={t}
        />
        {interactive && <th>{t('explore.logComparison.inspect', { source: 'a / b' })}</th>}
      </tr>
    </thead>
  );
}
function ComparisonCell({
  group,
  source,
  data,
  value,
  t
}: {
  group: LogComparisonGroup;
  source: ComparisonSource;
  data: LogComparisonResult;
  value: number | null;
  t: TFunction;
}) {
  if (source !== 'formula' && data.analysis.measure)
    return (
      <span
        title={`${t('explore.logAnalysis.count')}: ${group[source].count}; ${t('explore.logAnalysis.samples')}: ${group[source].measurement!.sampleCount}`}
      >
        <LogMeasureValue
          measurement={group[source].measurement!}
          approximate={isLogPercentile(data.analysis.measure)}
          t={t}
        />
      </span>
    );
  return (
    <span title={value === null ? undefined : String(value)}>
      {value === null ? t('explore.logComparison.unavailable') : formatLogNumericValue(value)}
    </span>
  );
}

function InspectActions({
  group,
  actions,
  t
}: {
  group: LogComparisonGroup;
  actions: ComparisonActions;
  t: TFunction;
}) {
  return (['a', 'b'] as const).map(source => (
    <Button
      key={source}
      type="link"
      disabled={!actions.onGroup || !actions.canOpenGroup?.(group, source)}
      onClick={() => actions.onGroup?.(group, source)}
    >
      {t('explore.logComparison.inspect', { source })}
    </Button>
  ));
}
