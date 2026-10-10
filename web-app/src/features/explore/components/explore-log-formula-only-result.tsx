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

import type { TFunction } from 'i18next';
import { Button } from 'antd';
import type { ExactTimeWindow } from '@/shared/query-context';
import {
  explorePersesMessages,
  formulaOnlySeries,
  groupIdentity,
  HertzBeatMetricTimeSeriesResult,
  formulaOnlyValues,
  formatLogNumericValue
} from '@/platform/perses';
import type { LogAnalysisLoad } from '../model/explore-log-analysis';
import { logAnalysisGroupLabel } from '../model/explore-log-grouping';
import { ExploreLogIntervalFailure } from './explore-log-interval-controls';
import styles from './explore-log-analysis.module.css';

export function ExploreLogFormulaOnlyResult({
  load,
  formula,
  hidden,
  t,
  onTimeWindowChange,
  onUseAuto
}: {
  load: LogAnalysisLoad;
  formula: string;
  hidden: ('a' | 'b' | 'formula')[];
  t: TFunction;
  onTimeWindowChange?: ((window: ExactTimeWindow) => void) | undefined;
  onUseAuto?: (() => void) | undefined;
}) {
  if (load.state !== 'ready' || !load.data) return <FormulaStatus load={load} t={t} onUseAuto={onUseAuto} />;
  const data = load.data;
  const values = formulaOnlyValues(data, formula);
  return (
    <section className={styles.result} aria-label={t('explore.logAdd.formula', { ref: 'f1' })}>
      <header>
        <span>{t('explore.logAnalysis.matching', { count: data.matchingTotal })}</span>
        {values.truncated && <span>{t('explore.logAnalysis.truncated')}</span>}
      </header>
      <p>{t('explore.logAdd.singleFormulaHint')}</p>
      {!hidden.includes('formula') && <p>{t('explore.logAnalysis.formulaUnitHint')}</p>}
      {values.groups.length === 0 ? (
        <p role="status">{t('explore.logAnalysis.noData')}</p>
      ) : (
        <>
          <FormulaChart {...{ data, formula, hidden, t, onTimeWindowChange }} />
          <table className={styles.formulaTable}>
            <thead>
              <tr>
                <th>{t('explore.logAnalysis.by')}</th>
                {!hidden.includes('a') && <th data-log-stat>a</th>}
                {!hidden.includes('formula') && (
                  <th data-log-stat>
                    {t('explore.logAdd.formula', { ref: 'f1' })} · {t('explore.logAnalysis.formulaUnitUnknown')}
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {values.groups.map(({ group, a, value }) => (
                <tr key={groupIdentity(group)}>
                  <th>{logAnalysisGroupLabel(group, t)}</th>
                  {!hidden.includes('a') && <td data-log-stat>{display(a, t)}</td>}
                  {!hidden.includes('formula') && <td data-log-stat>{display(value, t)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}

function FormulaStatus({
  load,
  t,
  onUseAuto
}: {
  load: LogAnalysisLoad;
  t: TFunction;
  onUseAuto?: (() => void) | undefined;
}) {
  if (load.state === 'interval_too_small') return <ExploreLogIntervalFailure t={t} onUseAuto={onUseAuto} />;
  if (load.state === 'idle') return null;
  return (
    <div className={styles.state} role="status">
      <p>
        {t(
          `explore.logAnalysis.${load.state === 'loading' ? 'loading' : load.state === 'permission' ? 'permission' : load.state === 'unavailable' ? 'unavailable' : 'error'}`
        )}
      </p>
      {load.state !== 'loading' && <Button onClick={load.retry}>{t('common.retry')}</Button>}
    </div>
  );
}

function FormulaChart({
  data,
  formula,
  hidden,
  t,
  onTimeWindowChange
}: {
  data: NonNullable<LogAnalysisLoad['data']>;
  formula: string;
  hidden: ('a' | 'b' | 'formula')[];
  t: TFunction;
  onTimeWindowChange?: ((window: ExactTimeWindow) => void) | undefined;
}) {
  if (!data.intervalMs || new Set(data.groups.flatMap(group => group.buckets.map(bucket => bucket.start))).size <= 1)
    return <p role="status">{t('explore.logAnalysis.singleBucket')}</p>;
  const result = formulaOnlySeries(data, formula, hidden, group => logAnalysisGroupLabel(group, t));
  return (
    <HertzBeatMetricTimeSeriesResult
      title={t('explore.logAdd.formula', { ref: 'f1' })}
      ariaLabel={t('explore.logAdd.formula', { ref: 'f1' })}
      query={result.query}
      outcome={result.outcome}
      runtimeIdentity={result.runtimeIdentity}
      messages={explorePersesMessages(t)}
      onTimeWindowChange={onTimeWindowChange}
      timeWindowChangeEnabled={onTimeWindowChange !== undefined}
      timeSeriesDisplay="line"
      variant="compact"
    />
  );
}

function display(value: number | null, t: TFunction) {
  return value === null ? (
    t('explore.logComparison.unavailable')
  ) : (
    <span title={String(value)}>{formatLogNumericValue(value)}</span>
  );
}
