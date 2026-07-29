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

import { Input, Select } from 'antd';
import type { TFunction } from 'i18next';

import {
  EXPLORE_METRIC_AGGREGATIONS,
  type ExploreSubmissionViewModel,
  type MetricExploreSubmissionDraft
} from '../model/explore-submission-model';
import { METRIC_TEMPORAL_AGGREGATIONS } from '../model/explore-parity-filter-model';
import { ExploreFilterField } from './explore-filter-field';

type Props = Pick<ExploreSubmissionViewModel, 'errors' | 'updateField'> & {
  draft: MetricExploreSubmissionDraft;
  t: TFunction;
};

export function ExploreMetricFilters({ draft, errors, t, updateField }: Props) {
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
      <MetricAggregationFilters draft={draft} errors={errors} t={t} updateField={updateField} />
    </>
  );
}

function MetricAggregationFilters({ draft, errors, t, updateField }: Props) {
  return (
    <>
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
      <Select
        aria-label={t('exploreMetric.temporalAggregation')}
        allowClear
        value={draft.temporalAggregation || undefined}
        placeholder={t('exploreMetric.temporalAggregation')}
        options={METRIC_TEMPORAL_AGGREGATIONS.map(value => ({
          value,
          label: t(`exploreMetric.temporalAggregationValues.${value}`)
        }))}
        onChange={value => updateField({ field: 'temporalAggregation', value: value ?? '' })}
      />
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
