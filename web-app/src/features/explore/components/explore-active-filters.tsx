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

import { CloseOutlined } from '@ant-design/icons';
import { Button, Tag } from 'antd';
import type { TFunction } from 'i18next';

import { readLogNumericRange } from '@/shared/log-numeric-range';
import { QUERY_CONTEXT_FIELDS } from '@/shared/query-context';

import { logGroupSelectionLabel } from '../model/explore-log-group-selection';
import type { ExploreQuery, ExploreQueryPatch } from '../model/explore-model';
import { readTraceView } from '../model/explore-trace-view';
import { default as filterStyles, default as styles } from './explore-active-filters.module.css';

type Props = {
  query: ExploreQuery;
  t: TFunction;
  updateQuery: (changes: ExploreQueryPatch) => void;
  removeFilter: (key: keyof ExploreQueryPatch) => boolean;
  removeFilters?: (keys: (keyof ExploreQueryPatch)[]) => void;
};

type ActiveFilter = { key: keyof ExploreQueryPatch; label: string; locked?: boolean };

export function ExploreActiveFilters({ query, t, updateQuery, removeFilter, removeFilters }: Props) {
  const { signalFilters, filters } = queryActiveFilters(query, t);
  const predicateKeys = signalFilters.filter(filter => !filter.locked).map(filter => filter.key);
  if (!filters.length) return null;
  return (
    <div className={styles.activeFilters} aria-label={t('explore.activeFilters')}>
      <span className={filterStyles.label}>{t('explore.appliedFilters')}</span>
      {filters.map(filter => (
        <Tag key={filter.key}>
          {filter.label}
          {!filter.locked && (
            <button
              type="button"
              data-log-group-selection-clear={filter.key === 'logGroupSelection' || undefined}
              className={filterStyles.remove}
              aria-label={t('explore.removeAppliedFilter', { filter: filter.label })}
              onClick={() => {
                if (!removeFilter(filter.key)) updateQuery({ [filter.key]: undefined });
              }}
            >
              <CloseOutlined aria-hidden="true" />
            </button>
          )}
        </Tag>
      ))}
      {removeFilters && predicateKeys.length > 0 && (
        <Button type="text" size="small" htmlType="button" onClick={() => removeFilters(predicateKeys)}>
          {t('explore.clearFilters')}
        </Button>
      )}
    </div>
  );
}

function activeFilter(value: unknown, key: keyof ExploreQueryPatch, label: string, locked = false): ActiveFilter[] {
  return value != null && value !== '' && value !== false ? [{ key, label, locked }] : [];
}

function signalActiveFilters(query: ExploreQuery, t: TFunction): ActiveFilter[] {
  if (query.signal === 'metrics') {
    if (query.metricPlan)
      return activeFilter(
        query.operationName,
        'operationName',
        t('explore.operationContext', { value: query.operationName })
      );
    return [
      ...activeFilter(
        query.operationName,
        'operationName',
        t('explore.operationContext', { value: query.operationName })
      ),
      ...contextFilter(query.metricFilter, 'metricFilter', t('exploreMetric.filter'), t),
      ...contextFilter(query.groupBy, 'groupBy', t('exploreMetric.groupBy'), t),
      ...contextFilter(query.aggregation, 'aggregation', t('exploreMetric.aggregation'), t),
      ...activeFilter(
        query.temporalAggregation,
        'temporalAggregation',
        t('exploreMetric.temporalAggregationContext', {
          value: t(`exploreMetric.temporalAggregationValues.${query.temporalAggregation}`)
        })
      ),
      ...contextFilter(query.step, 'step', t('exploreMetric.step'), t)
    ];
  }
  const trace = activeFilter(query.traceId, 'traceId', t('explore.traceIdContext', { value: query.traceId }), true);
  if (query.signal === 'logs') return logActiveFilters(query, t, trace);
  const spans = readTraceView(query.traceView)?.population === 'matched_spans';
  const errorLabel = t(spans ? 'exploreTrace.errorSpansOnly' : 'exploreTrace.errorTracesOnly');
  return [
    ...trace,
    ...contextFilter(query.resourceFilter, 'resourceFilter', t('exploreLog.resourceFilter'), t),
    ...contextFilter(query.attributeFilter, 'attributeFilter', t('exploreTrace.attributeFilter'), t),
    ...contextFilter(query.minDurationMs, 'minDurationMs', t('exploreTrace.minDuration'), t),
    ...contextFilter(query.maxDurationMs, 'maxDurationMs', t('exploreTrace.maxDuration'), t),
    ...activeFilter(query.errorOnly, 'errorOnly', errorLabel),
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

function contextFilter(value: unknown, key: keyof ExploreQueryPatch, label: string, t: TFunction) {
  return activeFilter(value, key, t('explore.filterContext', { label, value }));
}

function groupSelectionFilter(raw: string | undefined, t: TFunction): ActiveFilter[] {
  if (raw === undefined) return [];
  return [{ key: 'logGroupSelection', label: logGroupSelectionLabel(raw, t) }];
}

function numericRangeFilter(raw: string | undefined, t: TFunction): ActiveFilter[] {
  if (raw === undefined) return [];
  const range = readLogNumericRange(raw);
  const label = range
    ? `${t('explore.logNumericRange.title')}: ${range.field} [${range.min}, ${range.max}]`
    : t('explore.logNumericRange.invalid');
  return [{ key: 'logNumericRange', label }];
}

function logActiveFilters(query: Extract<ExploreQuery, { signal: 'logs' }>, t: TFunction, trace: ActiveFilter[]) {
  return [
    ...groupSelectionFilter(query.logGroupSelection, t),
    ...numericRangeFilter(query.logNumericRange, t),
    ...contextFilter(query.severityCategory, 'severityCategory', t('explore.severity'), t),
    ...contextFilter(query.severityText, 'severityText', t('explore.originalSeverity'), t),
    ...trace,
    ...activeFilter(query.spanId, 'spanId', t('explore.spanIdContext', { value: query.spanId }), true),
    ...contextFilter(query.resourceFilter, 'resourceFilter', t('exploreLog.resourceFilter'), t),
    ...contextFilter(query.attributeFilter, 'attributeFilter', t('exploreLog.attributeFilter'), t),
    ...activeFilter(query.hideInternal, 'hideInternal', t('exploreLog.hideInternal')),
    ...activeFilter(query.hideNoise, 'hideNoise', t('exploreLog.hideNoise'))
  ];
}

function queryActiveFilters(query: ExploreQuery, t: TFunction) {
  const signalFilters = signalActiveFilters(query, t);
  const filters = [
    ...activeFilter(
      query.serviceName,
      'serviceName',
      t('explore.serviceContext', { value: query.serviceName }),
      query.signal === 'logs'
    ),
    ...activeFilter(
      query.serviceNamespace,
      'serviceNamespace',
      t('explore.serviceNamespaceContext', { value: query.serviceNamespace }),
      query.signal === 'logs'
    ),
    ...activeFilter(
      query.environment,
      'environment',
      t('explore.environmentContext', { value: query.environment }),
      query.signal === 'logs'
    ),
    ...activeFilter(
      query.collectorId,
      'collectorId',
      t('explore.collectorContext', { value: query.collectorId }),
      query.signal === 'logs'
    ),
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
    ...signalFilters
  ];
  return { signalFilters, filters };
}
