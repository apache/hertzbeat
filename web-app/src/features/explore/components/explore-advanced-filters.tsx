/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Checkbox, Input, Select } from 'antd';
import type { TFunction } from 'i18next';

import { QUERY_CONTEXT_FIELDS } from '@/shared/query-context';

import {
  EXPLORE_METRIC_AGGREGATIONS,
  type ExploreSubmissionViewModel,
  type LogExploreSubmissionDraft,
  type MetricExploreSubmissionDraft,
  type TraceExploreSubmissionDraft
} from '../model/explore-submission-model';
import { ExploreFilterField } from './explore-filter-field';
import styles from './explore-query-bar.module.css';

const LOG_SEVERITIES = ['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'];

type Props = Pick<ExploreSubmissionViewModel, 'draft' | 'errors' | 'updateField'> & { t: TFunction };

export function ExploreAdvancedFilters({ draft, errors, t, updateField }: Props) {
  return (
    <details className={styles.advanced} open={hasAdvancedFilter(draft) || undefined}>
      <summary>{t('explore.advancedFilters')}</summary>
      <div className={styles.advancedFields}>
        <Input
          value={draft.instance}
          onChange={event => updateField({ field: QUERY_CONTEXT_FIELDS.instance, value: event.target.value })}
          placeholder={t('explore.instanceId')}
        />
        <Input
          value={draft.endpoint}
          onChange={event => updateField({ field: QUERY_CONTEXT_FIELDS.endpoint, value: event.target.value })}
          placeholder={t('explore.httpRouteTemplate')}
        />
        {draft.signal === 'metrics' && <MetricFilters draft={draft} errors={errors} t={t} updateField={updateField} />}
        {draft.signal === 'logs' && <LogFilters draft={draft} t={t} updateField={updateField} />}
        {draft.signal === 'traces' && <TraceFilters draft={draft} errors={errors} t={t} updateField={updateField} />}
      </div>
    </details>
  );
}

function MetricFilters({ draft, errors, t, updateField }: ValidatedDraftFilterProps<MetricExploreSubmissionDraft>) {
  return (
    <>
      <Input
        value={draft.metricFilter}
        onChange={event => updateField({ field: 'metricFilter', value: event.target.value })}
        placeholder={t('exploreMetric.filter')}
      />
      <Input
        value={draft.groupBy}
        onChange={event => updateField({ field: 'groupBy', value: event.target.value })}
        placeholder={t('exploreMetric.groupBy')}
      />
      <ExploreFilterField id="explore-aggregation" error={errors.aggregation} t={t}>
        <Select
          aria-invalid={Boolean(errors.aggregation)}
          aria-describedby={errors.aggregation ? 'explore-aggregation-error' : undefined}
          aria-label={t('exploreMetric.aggregation')}
          allowClear
          status={errors.aggregation ? 'error' : ''}
          value={draft.aggregation || undefined}
          placeholder={t('exploreMetric.aggregation')}
          options={EXPLORE_METRIC_AGGREGATIONS.map(value => ({ value, label: value }))}
          onChange={aggregation => updateField({ field: 'aggregation', value: aggregation ?? '' })}
        />
      </ExploreFilterField>
      <ExploreFilterField id="explore-step" error={errors.stepSeconds} t={t}>
        <Input
          aria-invalid={Boolean(errors.stepSeconds)}
          aria-describedby={errors.stepSeconds ? 'explore-step-error' : undefined}
          status={errors.stepSeconds ? 'error' : ''}
          value={draft.stepSeconds}
          onChange={event => updateField({ field: 'stepSeconds', value: event.target.value })}
          placeholder={t('exploreMetric.step')}
        />
      </ExploreFilterField>
    </>
  );
}

function LogFilters({ draft, t, updateField }: DraftFilterProps<LogExploreSubmissionDraft>) {
  return (
    <>
      <Select
        aria-label={t('explore.severity')}
        allowClear
        value={draft.severityText || undefined}
        placeholder={t('explore.severity')}
        options={LOG_SEVERITIES.map(value => ({ value, label: value }))}
        onChange={severityText => updateField({ field: 'severityText', value: severityText ?? '' })}
      />
      <Input
        value={draft.traceId}
        onChange={event => updateField({ field: 'traceId', value: event.target.value })}
        placeholder={t('explore.traceId')}
      />
      <Input
        value={draft.spanId}
        onChange={event => updateField({ field: 'spanId', value: event.target.value })}
        placeholder={t('explore.spanId')}
      />
      <Input
        value={draft.resourceFilter}
        onChange={event => updateField({ field: 'resourceFilter', value: event.target.value })}
        placeholder={t('exploreLog.resourceFilter')}
      />
      <Input
        value={draft.attributeFilter}
        onChange={event => updateField({ field: 'attributeFilter', value: event.target.value })}
        placeholder={t('exploreLog.attributeFilter')}
      />
    </>
  );
}

function TraceFilters({ draft, errors, t, updateField }: ValidatedDraftFilterProps<TraceExploreSubmissionDraft>) {
  return (
    <>
      <Input
        value={draft.traceId}
        onChange={event => updateField({ field: 'traceId', value: event.target.value })}
        placeholder={t('explore.traceId')}
      />
      <ExploreFilterField id="explore-min-duration" error={errors.minDurationMs} t={t}>
        <Input
          aria-invalid={Boolean(errors.minDurationMs)}
          aria-describedby={errors.minDurationMs ? 'explore-min-duration-error' : undefined}
          status={errors.minDurationMs ? 'error' : ''}
          value={draft.minDurationMs}
          onChange={event => updateField({ field: 'minDurationMs', value: event.target.value })}
          placeholder={t('exploreTrace.minDuration')}
          inputMode="numeric"
        />
      </ExploreFilterField>
      <ExploreFilterField id="explore-max-duration" error={errors.maxDurationMs} t={t}>
        <Input
          aria-invalid={Boolean(errors.maxDurationMs)}
          aria-describedby={errors.maxDurationMs ? 'explore-max-duration-error' : undefined}
          status={errors.maxDurationMs ? 'error' : ''}
          value={draft.maxDurationMs}
          onChange={event => updateField({ field: 'maxDurationMs', value: event.target.value })}
          placeholder={t('exploreTrace.maxDuration')}
          inputMode="numeric"
        />
      </ExploreFilterField>
      <Input
        value={draft.resourceFilter}
        onChange={event => updateField({ field: 'resourceFilter', value: event.target.value })}
        placeholder={t('exploreLog.resourceFilter')}
      />
      <Checkbox
        checked={draft.errorOnly}
        onChange={event => updateField({ field: 'errorOnly', value: event.target.checked })}
      >
        {t('exploreTrace.errorOnly')}
      </Checkbox>
    </>
  );
}

type DraftFilterProps<T> = Pick<ExploreSubmissionViewModel, 'updateField'> & {
  draft: T;
  t: TFunction;
};

type ValidatedDraftFilterProps<T> = DraftFilterProps<T> & Pick<ExploreSubmissionViewModel, 'errors'>;

function hasAdvancedFilter(draft: ExploreSubmissionViewModel['draft']) {
  return [draft.instance, draft.endpoint, ...signalFilters(draft)].some(
    value => value != null && value !== false && value !== ''
  );
}

function signalFilters(draft: ExploreSubmissionViewModel['draft']) {
  switch (draft.signal) {
    case 'metrics':
      return [draft.metricFilter, draft.groupBy, draft.aggregation, draft.stepSeconds];
    case 'logs':
      return [draft.severityText, draft.traceId, draft.spanId, draft.resourceFilter, draft.attributeFilter];
    case 'traces':
      return [draft.traceId, draft.resourceFilter, draft.minDurationMs, draft.maxDurationMs, draft.errorOnly];
  }
}
