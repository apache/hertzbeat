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
import { ExploreQueryField } from './explore-query-field';
import styles from './explore-query-bar.module.css';

type Props = Pick<ExploreSubmissionViewModel, 'errors' | 'updateField'> & {
  draft: MetricExploreSubmissionDraft;
  t: TFunction;
};

export function ExploreMetricFilters({ draft, errors, t, updateField }: Props) {
  return (
    <>
      <ExploreQueryField label={t('exploreMetric.filter')}>
        <Input
          aria-label={t('exploreMetric.filter')}
          value={draft.metricFilter}
          onChange={event => updateField({ field: 'metricFilter', value: event.target.value })}
          placeholder={t('exploreMetric.filter')}
        />
      </ExploreQueryField>
      <ExploreQueryField label={t('exploreMetric.step')}>
        <ExploreFilterField id="explore-step" error={errors.stepSeconds} t={t}>
          <Input
            aria-invalid={Boolean(errors.stepSeconds)}
            aria-describedby={errors.stepSeconds ? 'explore-step-error' : undefined}
            status={errors.stepSeconds ? 'error' : ''}
            value={draft.stepSeconds}
            aria-label={t('exploreMetric.step')}
            onChange={event => updateField({ field: 'stepSeconds', value: event.target.value })}
            placeholder={t('exploreMetric.stepExample')}
          />
        </ExploreFilterField>
      </ExploreQueryField>
    </>
  );
}

export function ExploreMetricEssentialFilters(props: Props) {
  const { draft, t, updateField } = props;
  return (
    <>
      <MetricAggregation {...props} />
      <ExploreQueryField label={t('exploreMetric.groupBy')}>
        <Input
          aria-label={t('exploreMetric.groupBy')}
          value={draft.groupBy}
          onChange={event => updateField({ field: 'groupBy', value: event.target.value })}
          placeholder={t('exploreMetric.groupBy')}
        />
      </ExploreQueryField>
      <ExploreQueryField label={t('exploreMetric.temporalAggregation')}>
        <Select
          aria-label={t('exploreMetric.temporalAggregation')}
          allowClear
          value={draft.temporalAggregation || undefined}
          placeholder={<span className={styles.metricDefault}>{t('exploreMetric.defaultRaw')}</span>}
          options={METRIC_TEMPORAL_AGGREGATIONS.map(value => ({
            value,
            label: t(`exploreMetric.temporalAggregationValues.${value}`)
          }))}
          onChange={value => updateField({ field: 'temporalAggregation', value: value ?? '' })}
        />
      </ExploreQueryField>
      <details className={styles.metricHelp}>
        <summary>{t('explore.metricComposition.queryHelp')}</summary>
        <span>{t('exploreMetric.identityGroupingHint')}</span>
        {draft.temporalAggregation && draft.temporalAggregation !== 'raw' && (
          <span>{t('exploreMetric.temporalWindowHint')}</span>
        )}
        {draft.aggregation === 'count' && <span>{t('exploreMetric.countSeriesHint')}</span>}
      </details>
    </>
  );
}

function MetricAggregation({ draft, errors, t, updateField }: Props) {
  return (
    <ExploreQueryField label={t('exploreMetric.aggregation')}>
      <ExploreFilterField id="explore-aggregation" error={errors.aggregation} t={t}>
        <Select
          aria-invalid={Boolean(errors.aggregation)}
          aria-describedby={errors.aggregation ? 'explore-aggregation-error' : undefined}
          aria-label={t('exploreMetric.aggregation')}
          allowClear
          status={errors.aggregation ? 'error' : ''}
          value={draft.aggregation || undefined}
          placeholder={<span className={styles.metricDefault}>{t('exploreMetric.defaultSum')}</span>}
          options={EXPLORE_METRIC_AGGREGATIONS.map(value => ({ value, label: value }))}
          onChange={aggregation => updateField({ field: 'aggregation', value: aggregation ?? '' })}
        />
      </ExploreFilterField>
    </ExploreQueryField>
  );
}
