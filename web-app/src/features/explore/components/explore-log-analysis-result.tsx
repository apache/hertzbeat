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

import { Button } from 'antd';
import { ExploreLogIntervalFailure, ExploreLogIntervalSummary } from './explore-log-interval-controls';
import { logMeasureHintKey, type LogAnalysisResult, type LogAnalysisState } from '@/platform/perses';
import { logAnalysisGroupLabel, logGroupingFieldLabel } from '../model/explore-log-grouping';
import { AnalysisGroups, type GroupActions } from './explore-log-analysis-groups';
import type { TFunction } from 'i18next';
import type { ExactTimeWindow } from '@/shared/query-context';

import type { LogAnalysisLoad } from '../model/explore-log-analysis';
import { ExploreLogAnalysisTimeseries } from './explore-log-analysis-timeseries';
import styles from './explore-log-analysis.module.css';
type TimeSelection = {
  timeZone?: string | undefined;
  onTimeWindowChange?: ((window: ExactTimeWindow) => void) | undefined;
};
export function ExploreLogAnalysisResult({
  load,
  representation,
  t,
  onTimeWindowChange,
  timeZone,
  onUseAuto,
  ...actions
}: GroupActions &
  TimeSelection & {
    onUseAuto?: (() => void) | undefined;
    load: LogAnalysisLoad;
    representation: LogAnalysisState['representation'];
    t: TFunction;
  }) {
  if (load.state === 'interval_too_small') return <ExploreLogIntervalFailure t={t} onUseAuto={onUseAuto} />;
  if (load.state === 'idle') return null;
  if (load.state !== 'ready' || !load.data) return <AnalysisStatus load={load} t={t} />;
  const data = load.data;
  return (
    <section className={styles.result} aria-label={t('explore.logAnalysis.label')}>
      <AnalysisSummary data={data} t={t} />
      {data.transform && <p className={styles.measureHint}>{t('explore.logAnalysis.rawSummary')}</p>}
      {data.grouping && <p className={styles.measureHint}>{t('explore.logAnalysis.scalarGrouping')}</p>}
      {data.measure && <p className={styles.measureHint}>{t(logMeasureHintKey(data.measure))}</p>}
      {data.groups.length === 0 ? (
        <p className={styles.state}>{t('explore.logAnalysis.noData')}</p>
      ) : representation === 'timeseries' ? (
        <ExploreLogAnalysisTimeseries
          data={data}
          timeZone={timeZone}
          t={t}
          onTimeWindowChange={onTimeWindowChange}
          groupLabel={group => logAnalysisGroupLabel(group, t)}
        >
          <AnalysisGroups data={data} representation="table" t={t} {...actions} />
        </ExploreLogAnalysisTimeseries>
      ) : (
        <AnalysisGroups data={data} representation={representation} t={t} {...actions} />
      )}
    </section>
  );
}

function AnalysisStatus({ load, t }: { load: LogAnalysisLoad; t: TFunction }) {
  if (load.state === 'loading')
    return (
      <p className={styles.state} role="status">
        {t('explore.logAnalysis.loading')}
      </p>
    );
  if (!load.data || load.state !== 'ready')
    return (
      <div className={styles.state} role="status">
        <p>
          {t(
            load.state === 'permission'
              ? 'explore.logAnalysis.permission'
              : load.state === 'unavailable'
                ? 'explore.logAnalysis.unavailable'
                : 'explore.logAnalysis.error'
          )}
        </p>
        <Button onClick={load.retry}>{t('common.retry')}</Button>
      </div>
    );
  return null;
}

function AnalysisSummary({ data, t }: { data: LogAnalysisResult; t: TFunction }) {
  return (
    <header>
      <span>{t('explore.logAnalysis.matching', { count: data.matchingTotal })}</span>
      <span title={data.grouping?.dimensions.map(item => item.field).join(' / ') ?? data.field?.id}>
        {data.grouping
          ? data.grouping.dimensions.map(item => logGroupingFieldLabel(item.field, t)).join(' / ')
          : data.field
            ? data.field.source === 'builtin'
              ? t(`explore.logFacets.builtin.${data.field.key}`)
              : data.field.id
            : t('explore.logAnalysis.everything')}
      </span>
      <ExploreLogIntervalSummary intervalMs={data.intervalMs} t={t} />
      {data.truncated && <span>{t('explore.logAnalysis.truncated')}</span>}
    </header>
  );
}
