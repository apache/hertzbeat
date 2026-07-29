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

import { Input } from 'antd';
import type { TFunction } from 'i18next';

import { QUERY_CONTEXT_FIELDS } from '@/shared/query-context';

import type { ExploreSubmissionViewModel } from '../model/explore-submission-model';
import { ExploreLogFilters } from './explore-log-filters';
import { ExploreMetricFilters } from './explore-metric-filters';
import { ExploreTraceFilters } from './explore-trace-filters';
import styles from './explore-query-bar.module.css';

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
        {draft.signal === 'metrics' && (
          <ExploreMetricFilters draft={draft} errors={errors} t={t} updateField={updateField} />
        )}
        {draft.signal === 'logs' && <ExploreLogFilters draft={draft} t={t} updateField={updateField} />}
        {draft.signal === 'traces' && (
          <ExploreTraceFilters draft={draft} errors={errors} t={t} updateField={updateField} />
        )}
      </div>
    </details>
  );
}

function hasAdvancedFilter(draft: ExploreSubmissionViewModel['draft']) {
  return [draft.instance, draft.endpoint, ...signalFilters(draft)].some(
    value => value != null && value !== false && value !== ''
  );
}

function signalFilters(draft: ExploreSubmissionViewModel['draft']) {
  switch (draft.signal) {
    case 'metrics':
      return [draft.metricFilter, draft.groupBy, draft.aggregation, draft.temporalAggregation, draft.stepSeconds];
    case 'logs':
      return [
        draft.severityText,
        draft.traceId,
        draft.spanId,
        draft.resourceFilter,
        draft.attributeFilter,
        draft.hideInternal,
        draft.hideNoise
      ];
    case 'traces':
      return [
        draft.traceId,
        draft.resourceFilter,
        draft.attributeFilter,
        draft.minDurationMs,
        draft.maxDurationMs,
        draft.errorOnly,
        draft.spanScope,
        draft.hideInternal
      ];
  }
}
