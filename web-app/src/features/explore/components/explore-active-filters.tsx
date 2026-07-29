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

import { Tag } from 'antd';
import type { TFunction } from 'i18next';

import { QUERY_CONTEXT_FIELDS } from '@/shared/query-context';

import type { ExploreQuery, ExploreQueryPatch } from '../model/explore-model';
import styles from './explore-query-bar.module.css';

type Props = {
  query: ExploreQuery;
  t: TFunction;
  updateQuery: (changes: ExploreQueryPatch) => void;
  removeFilter: (key: keyof ExploreQueryPatch) => boolean;
};

type ActiveFilter = { key: keyof ExploreQueryPatch; label: string };

export function ExploreActiveFilters({ query, t, updateQuery, removeFilter }: Props) {
  const filters = [
    ...activeFilter(query.serviceName, 'serviceName', t('explore.serviceContext', { value: query.serviceName })),
    ...activeFilter(
      query.serviceNamespace,
      'serviceNamespace',
      t('explore.serviceNamespaceContext', { value: query.serviceNamespace })
    ),
    ...activeFilter(query.environment, 'environment', t('explore.environmentContext', { value: query.environment })),
    ...activeFilter(query.collectorId, 'collectorId', t('explore.collectorContext', { value: query.collectorId })),
    ...activeFilter(
      query.instance,
      QUERY_CONTEXT_FIELDS.instance,
      t('explore.instanceContext', { value: query.instance })
    ),
    ...activeFilter(
      query.endpoint,
      QUERY_CONTEXT_FIELDS.endpoint,
      t('explore.endpointContext', { value: query.endpoint })
    ),
    ...signalActiveFilters(query, t)
  ];
  if (!filters.length) return null;
  return (
    <div className={styles.activeFilters} aria-label={t('explore.activeFilters')}>
      {filters.map(filter => (
        <Tag
          key={filter.key}
          closable
          onClose={() => {
            if (!removeFilter(filter.key)) updateQuery({ [filter.key]: undefined });
          }}
        >
          {filter.label}
        </Tag>
      ))}
    </div>
  );
}

function activeFilter(value: unknown, key: keyof ExploreQueryPatch, label: string): ActiveFilter[] {
  return value ? [{ key, label }] : [];
}

function signalActiveFilters(query: ExploreQuery, t: TFunction): ActiveFilter[] {
  if (query.signal === 'metrics') {
    return [
      ...activeFilter(
        query.operationName,
        'operationName',
        t('explore.operationContext', { value: query.operationName })
      ),
      ...activeFilter(
        query.temporalAggregation,
        'temporalAggregation',
        t('exploreMetric.temporalAggregationContext', {
          value: t(`exploreMetric.temporalAggregationValues.${query.temporalAggregation}`)
        })
      )
    ];
  }
  const trace = activeFilter(query.traceId, 'traceId', t('explore.traceIdContext', { value: query.traceId }));
  if (query.signal === 'logs') {
    return [
      ...activeFilter(query.severityText, 'severityText', `${t('explore.severity')}: ${query.severityText}`),
      ...trace,
      ...activeFilter(query.spanId, 'spanId', t('explore.spanIdContext', { value: query.spanId })),
      ...activeFilter(query.hideInternal, 'hideInternal', t('exploreLog.hideInternal')),
      ...activeFilter(query.hideNoise, 'hideNoise', t('exploreLog.hideNoise'))
    ];
  }
  return [
    ...trace,
    ...activeFilter(query.errorOnly, 'errorOnly', t('exploreTrace.errorOnly')),
    ...activeFilter(
      query.spanScope,
      'spanScope',
      t('exploreTrace.spanScopeContext', {
        value: query.spanScope ? t(`exploreTrace.spanScopeValues.${query.spanScope}`) : undefined
      })
    ),
    ...activeFilter(query.hideInternal, 'hideInternal', t('exploreTrace.hideInternal'))
  ];
}
