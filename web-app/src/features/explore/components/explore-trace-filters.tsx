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

import { Checkbox, Input } from 'antd';
import type { TFunction } from 'i18next';

import type { ExploreSubmissionViewModel, TraceExploreSubmissionDraft } from '../model/explore-submission-model';
import { ExploreFilterField } from './explore-filter-field';

type Props = Pick<ExploreSubmissionViewModel, 'errors' | 'updateField'> & {
  draft: TraceExploreSubmissionDraft;
  t: TFunction;
};

export function ExploreTraceFilters({ draft, errors, t, updateField }: Props) {
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
      <Input
        value={draft.attributeFilter}
        onChange={event => updateField({ field: 'attributeFilter', value: event.target.value })}
        placeholder={t('exploreLog.attributeFilter')}
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
