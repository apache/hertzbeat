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

import { readTraceView } from '../model/explore-trace-view';
import { TRACE_SPAN_SCOPES } from '../model/explore-parity-filter-model';
import type { ExploreSubmissionViewModel, TraceExploreSubmissionDraft } from '../model/explore-submission-model';
import { ExploreFilterField } from './explore-filter-field';
import { ExploreQueryField } from './explore-query-field';

type Props = Pick<ExploreSubmissionViewModel, 'errors' | 'updateField'> & {
  draft: TraceExploreSubmissionDraft;
  appliedTraceView?: string | undefined;
  t: TFunction;
};

export function ExploreTraceEssentialFilters({ draft, errors, t, updateField, appliedTraceView }: Props) {
  const spans = readTraceView(appliedTraceView)?.population === 'matched_spans';
  return (
    <>
      <ExploreQueryField label={t('exploreTrace.minDuration')}>
        <ExploreFilterField id="explore-min-duration" error={errors.minDurationMs} t={t}>
          <Input
            aria-invalid={Boolean(errors.minDurationMs)}
            aria-describedby={errors.minDurationMs ? 'explore-min-duration-error' : undefined}
            status={errors.minDurationMs ? 'error' : ''}
            value={draft.minDurationMs}
            onChange={event => updateField({ field: 'minDurationMs', value: event.target.value })}
            placeholder={t('exploreTrace.minDuration')}
            aria-label={t('exploreTrace.minDuration')}
            inputMode="numeric"
          />
        </ExploreFilterField>
      </ExploreQueryField>
      <ExploreQueryField label={t('exploreTrace.maxDuration')}>
        <ExploreFilterField id="explore-max-duration" error={errors.maxDurationMs} t={t}>
          <Input
            aria-invalid={Boolean(errors.maxDurationMs)}
            aria-describedby={errors.maxDurationMs ? 'explore-max-duration-error' : undefined}
            status={errors.maxDurationMs ? 'error' : ''}
            value={draft.maxDurationMs}
            onChange={event => updateField({ field: 'maxDurationMs', value: event.target.value })}
            placeholder={t('exploreTrace.maxDuration')}
            aria-label={t('exploreTrace.maxDuration')}
            inputMode="numeric"
          />
        </ExploreFilterField>
      </ExploreQueryField>
      <ExploreQueryField label={t('exploreTrace.sort.label')}>
        <Select
          aria-label={t('exploreTrace.sort.label')}
          value={draft.sort}
          options={['newest', 'duration_desc'].map(value => ({
            value,
            label: t(`exploreTrace.sort.${value === 'duration_desc' && spans ? 'spanDuration' : value}`)
          }))}
          onChange={value => updateField({ field: 'sort', value })}
        />
      </ExploreQueryField>
      <Checkbox
        checked={draft.errorOnly}
        onChange={event => updateField({ field: 'errorOnly', value: event.target.checked })}
      >
        {t(spans ? 'exploreTrace.errorSpansOnly' : 'exploreTrace.errorTracesOnly')}
      </Checkbox>
    </>
  );
}

export function ExploreTraceFilters({ draft, errors, t, updateField }: Props) {
  return (
    <>
      <ExploreQueryField label={t('explore.traceId')}>
        <Input
          value={draft.traceId}
          aria-label={t('explore.traceId')}
          onChange={event => updateField({ field: 'traceId', value: event.target.value })}
          placeholder={t('explore.traceId')}
        />
      </ExploreQueryField>
      <ExploreQueryField label={t('exploreLog.resourceFilter')}>
        <Input
          value={draft.resourceFilter}
          onChange={event => updateField({ field: 'resourceFilter', value: event.target.value })}
          placeholder={t('exploreLog.resourceFilter')}
          aria-label={t('exploreLog.resourceFilter')}
        />
      </ExploreQueryField>
      <ExploreQueryField label={t('exploreTrace.attributeFilter')}>
        <Input
          value={draft.attributeFilter}
          onChange={event => updateField({ field: 'attributeFilter', value: event.target.value })}
          placeholder={t('exploreTrace.attributeFilter')}
          aria-label={t('exploreTrace.attributeFilter')}
        />
      </ExploreQueryField>
      <TraceScopeFilters draft={draft} errors={errors} t={t} updateField={updateField} />
    </>
  );
}

function TraceScopeFilters({ draft, t, updateField }: Props) {
  return (
    <>
      <ExploreQueryField label={t('exploreTrace.spanScope')}>
        <Select
          aria-label={t('exploreTrace.spanScope')}
          allowClear
          value={draft.spanScope || undefined}
          placeholder={t('exploreTrace.spanScope')}
          options={TRACE_SPAN_SCOPES.map(value => ({
            value,
            label: t(`exploreTrace.spanScopeValues.${value}`)
          }))}
          onChange={value => updateField({ field: 'spanScope', value: value ?? '' })}
        />
      </ExploreQueryField>
      <Checkbox
        checked={draft.hideInternal}
        disabled={draft.source === 'self'}
        onChange={event => updateField({ field: 'hideInternal', value: event.target.checked })}
      >
        {t('exploreTrace.hideInternal')}
      </Checkbox>
    </>
  );
}
