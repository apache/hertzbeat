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

import type { ExploreSubmissionViewModel, LogExploreSubmissionDraft } from '../model/explore-submission-model';

const LOG_SEVERITIES = ['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'];

type Props = Pick<ExploreSubmissionViewModel, 'updateField'> & {
  draft: LogExploreSubmissionDraft;
  t: TFunction;
};

export function ExploreLogFilters({ draft, t, updateField }: Props) {
  return (
    <>
      <Select
        aria-label={t('explore.severity')}
        allowClear
        value={draft.severityText || undefined}
        placeholder={t('explore.severity')}
        options={LOG_SEVERITIES.map(value => ({ value, label: value }))}
        onChange={value => updateField({ field: 'severityText', value: value ?? '' })}
      />
      <LogIdentityFilters draft={draft} t={t} updateField={updateField} />
      <Checkbox
        checked={draft.hideInternal}
        onChange={event => updateField({ field: 'hideInternal', value: event.target.checked })}
      >
        {t('exploreLog.hideInternal')}
      </Checkbox>
      <Checkbox
        checked={draft.hideNoise}
        onChange={event => updateField({ field: 'hideNoise', value: event.target.checked })}
      >
        {t('exploreLog.hideNoise')}
      </Checkbox>
    </>
  );
}

function LogIdentityFilters({ draft, t, updateField }: Props) {
  return (
    <>
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
