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

import { ExploreLogThroughputControl } from './explore-log-throughput-control';
import { ExploreLogIntervalControls } from './explore-log-interval-controls';
import { ExploreLogGroupingControls } from './explore-log-grouping-controls';
import { ExploreLogMeasureControls } from './explore-log-measure-controls';
import { useEffect, useRef, type ReactNode } from 'react';
import { Button, Select, type RefSelectProps } from 'antd';
import { LineChartOutlined, UnorderedListOutlined } from '@ant-design/icons';
import type { LogInspectorAnalysisIntent } from '../model/explore-log-inspector-analysis';
import type { TFunction } from 'i18next';
import { DEFAULT_LOG_ANALYSIS, type LogAnalysisState } from '@/platform/perses';
import type { LogFacetField } from '../model/explore-log-facets';
import styles from './explore-log-analysis.module.css';
import representationStyles from './explore-log-representations.module.css';
type AnalysisControlsProps = {
  value: LogAnalysisState;
  fields: LogFacetField[];
  extraFields?: string[];
  onChange: (value: LogAnalysisState) => void;
  pending: boolean;
  invalid?: boolean;
  focusIntent?: LogInspectorAnalysisIntent | undefined;
  onFocused?: (() => void) | undefined;
  t: TFunction;
};
export function ExploreLogAnalysisControls({
  value,
  fields,
  extraFields = [],
  onChange,
  pending,
  invalid = false,
  focusIntent,
  onFocused,
  t
}: AnalysisControlsProps) {
  const groupingField = useRef<RefSelectProps>(null);
  const measureField = useRef<RefSelectProps>(null);
  useEffect(() => {
    if (!focusIntent) return;
    const field = focusIntent === 'group' ? groupingField.current : measureField.current;
    if (field) {
      field.focus();
      onFocused?.();
    }
  }, [focusIntent, onFocused]);
  return (
    <section className={styles.controls} aria-label={t('explore.logAnalysis.label')}>
      <ExploreLogMeasureControls
        value={value}
        fields={fields}
        extraFields={extraFields}
        onChange={onChange}
        fieldRef={measureField}
        t={t}
      />
      <ExploreLogGroupingControls
        value={value}
        fields={fields}
        extraFields={extraFields}
        onChange={onChange}
        fieldRef={groupingField}
        t={t}
      />
      <ExploreLogIntervalControls value={value} onChange={onChange} t={t} />
      <ExploreLogThroughputControl value={value} onChange={onChange} t={t} />
      <AnalysisRanking value={value} onChange={onChange} t={t} />
      {value.grouping && <p className={styles.measureHint}>{t('explore.logAnalysis.groupingBudget')}</p>}
      {invalid && (
        <p role="alert">
          {t('explore.logAnalysis.invalid')}{' '}
          <button type="button" onClick={() => onChange({ ...DEFAULT_LOG_ANALYSIS })}>
            {t('explore.logAnalysis.reset')}
          </button>
        </p>
      )}
      {pending && <p role="status">{t('explore.logAnalysis.pending')}</p>}
    </section>
  );
}
export function ExploreLogAnalysisRepresentations({
  value,
  onChange,
  disabled = false,
  comparison = false,
  transform,
  settingsAction,
  t
}: {
  value: LogAnalysisState['representation'];
  onChange: (value: LogAnalysisState['representation']) => void;
  disabled?: boolean;
  comparison?: boolean;
  transform?: LogAnalysisState['transform'];
  settingsAction?: ReactNode;
  t: TFunction;
}) {
  const icons = {
    logs: <UnorderedListOutlined aria-hidden />,
    timeseries: <LineChartOutlined aria-hidden />
  };
  return (
    <div
      className={representationStyles.representations}
      data-log-representations
      role="group"
      aria-label={t('explore.logAnalysis.representation')}
    >
      <span className={representationStyles.representationLabel} aria-hidden="true">
        {t('explore.logAnalysis.representation')}
      </span>
      <div className={representationStyles.segmented}>
        {(['logs', 'timeseries'] as const).map(kind => {
          const reason = representationReason(kind, comparison, transform);
          return (
            <Button
              key={kind}
              disabled={disabled || Boolean(reason)}
              title={reason ? t(reason) : undefined}
              aria-pressed={value === kind}
              onClick={() => onChange(kind)}
            >
              {icons[kind]}
              {t(`explore.logAnalysis.${kind}`)}
            </Button>
          );
        })}
      </div>
      {settingsAction && <div className={representationStyles.settingsAction}>{settingsAction}</div>}
    </div>
  );
}

function AnalysisRanking({
  value,
  onChange,
  t
}: {
  value: LogAnalysisState;
  onChange: (value: LogAnalysisState) => void;
  t: TFunction;
}) {
  return (
    <span className={styles.dimension}>
      <label>
        {t('explore.logAnalysis.order')}
        <Select<LogAnalysisState['order']>
          value={value.order}
          onChange={order => onChange({ ...value, order })}
          options={[
            { value: value.measure ? 'measure-desc' : 'count-desc', label: t('explore.logAnalysis.top') },
            { value: value.measure ? 'measure-asc' : 'count-asc', label: t('explore.logAnalysis.bottom') }
          ]}
        />
      </label>
      {!value.grouping && (
        <label>
          {t('explore.logAnalysis.limit')}
          <Select<number>
            value={value.limit}
            onChange={limit => onChange({ ...value, limit })}
            options={[...new Set([5, 10, 20, 50, 100, value.limit])]
              .sort((a, b) => a - b)
              .map(limit => ({ value: limit, label: limit }))}
          />
        </label>
      )}
      <label>
        {t('explore.logAnalysis.minCount')}
        <input
          type="number"
          min={1}
          max={1_000_000}
          value={value.minCount}
          onChange={event => {
            const count = Number(event.target.value);
            if (Number.isInteger(count) && count >= 1 && count <= 1_000_000) onChange({ ...value, minCount: count });
          }}
        />
      </label>
    </span>
  );
}

function representationReason(
  kind: LogAnalysisState['representation'],
  comparison: boolean,
  transform: LogAnalysisState['transform']
) {
  if (transform && kind !== 'timeseries') return 'explore.logAnalysis.throughputViews';
  if (comparison && kind === 'logs') return 'explore.logComparison.views';
  return undefined;
}
