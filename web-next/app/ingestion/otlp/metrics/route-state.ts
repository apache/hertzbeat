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

import type { OtlpMetricsQueryState } from '../../../../lib/otlp-metrics/controller';
import { readEntityIdRouteParam, readEpochMillisRouteParam, stripReturnLabelFromHref, type SearchParamReader } from '../../../../lib/signal-route-context';
import { normalizeTimeContextValue } from '../../../../lib/time-context';

const METRICS_INVENTORY_PAGE_SIZE_OPTIONS = ['5', '10', '20', '50'] as const;

const METRICS_ROUTE_KEYS: Array<keyof OtlpMetricsQueryState> = [
  'entityId',
  'entityType',
  'entityName',
  'returnTo',
  'traceId',
  'spanId',
  'query',
  'series',
  'filter',
  'aggregation',
  'temporalAggregation',
  'groupBy',
  'legendFormat',
  'formula',
  'step',
  'limit',
  'inspector',
  'warningThreshold',
  'criticalThreshold',
  'expectedRange',
  'inventorySearch',
  'inventorySort',
  'inventoryPageSize',
  'inventoryPageIndex',
  'seriesAttributeSearch',
  'relatedMetricSource',
  'relatedMetricFamily',
  'relatedMetricReason',
  'relatedMetricMatchedLabels',
  'relatedMetricResourceMatch',
  'timeRange',
  'from',
  'to',
  'serviceName',
  'serviceNamespace',
  'environment',
  'source',
  'collector',
  'template',
  'start',
  'end',
  'refresh',
  'live',
  'tz',
  'timezone',
  'codeRepo',
  'codeProvider',
  'codePath',
  'codeSearch',
  'codeLabel'
];

function readPositiveIntegerRouteParam(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed || !/^\d+$/.test(trimmed)) return undefined;
  return Number(trimmed) > 0 ? trimmed : undefined;
}

function readMetricsInspectorRouteParam(value: string | undefined) {
  return value === 'table' ? 'table' : undefined;
}

function readMetricsInventoryPageSizeRouteParam(value: string | undefined) {
  const positiveInteger = readPositiveIntegerRouteParam(value);
  return METRICS_INVENTORY_PAGE_SIZE_OPTIONS.find(option => option === positiveInteger);
}

function readFiniteNumberRouteParam(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return Number.isFinite(Number(trimmed)) ? trimmed : undefined;
}

function readExpectedRangeRouteParam(value: string | undefined) {
  return value === 'on' ? 'on' : undefined;
}

function readInventorySortRouteParam(value: string | undefined) {
  return value === 'latest' || value === 'samples' || value === 'time-series' ? value : undefined;
}

function appendRouteValue(params: URLSearchParams, key: keyof OtlpMetricsQueryState, value: string | undefined) {
  if (!value || value.trim() === '') return;
  if (key === 'returnTo') {
    const returnTo = stripReturnLabelFromHref(value);
    if (returnTo) params.set(key, returnTo);
    return;
  }
  if (key === 'entityId') {
    const entityId = readEntityIdRouteParam(value);
    if (entityId) params.set(key, entityId);
    return;
  }
  if (key === 'timeRange' || key === 'from' || key === 'to' || key === 'start' || key === 'end' || key === 'refresh' || key === 'live' || key === 'tz' || key === 'timezone') {
    const timeValue = normalizeTimeContextValue(key, value);
    if (timeValue) params.set(key, timeValue);
    return;
  }
  if (key === 'step' || key === 'limit') {
    const positiveInteger = readPositiveIntegerRouteParam(value);
    if (positiveInteger) params.set(key, positiveInteger);
    return;
  }
  if (key === 'inventoryPageSize') {
    const pageSize = readMetricsInventoryPageSizeRouteParam(value);
    if (pageSize) params.set(key, pageSize);
    return;
  }
  if (key === 'inventoryPageIndex') {
    const positiveInteger = readPositiveIntegerRouteParam(value);
    if (positiveInteger && positiveInteger !== '0') params.set(key, positiveInteger);
    return;
  }
  if (key === 'inspector') {
    const inspector = readMetricsInspectorRouteParam(value);
    if (inspector) params.set(key, inspector);
    return;
  }
  if (key === 'warningThreshold' || key === 'criticalThreshold') {
    const threshold = readFiniteNumberRouteParam(value);
    if (threshold) params.set(key, threshold);
    return;
  }
  if (key === 'expectedRange') {
    const expectedRange = readExpectedRangeRouteParam(value);
    if (expectedRange) params.set(key, expectedRange);
    return;
  }
  if (key === 'inventorySort') {
    const inventorySort = readInventorySortRouteParam(value);
    if (inventorySort) params.set(key, inventorySort);
    return;
  }
  params.set(key, value);
}

export function hasMetricsDisplayReturnLabel(searchParams: SearchParamReader) {
  const returnTo = searchParams.get('returnTo') || '';
  return Boolean(searchParams.get('returnLabel') || returnTo.includes('returnLabel='));
}

export function hasMetricsUnsanitizedTimeBounds(searchParams: SearchParamReader) {
  const start = searchParams.get('start');
  const end = searchParams.get('end');
  return Boolean(
    (start && readEpochMillisRouteParam(start) !== start.trim()) ||
      (end && readEpochMillisRouteParam(end) !== end.trim())
  );
}

export function buildOtlpMetricsRoute(query: OtlpMetricsQueryState) {
  const params = new URLSearchParams();
  const expressionFrom = normalizeTimeContextValue('from', query.from);
  const expressionTo = normalizeTimeContextValue('to', query.to);
  const expressionOwnsRoute = Boolean(expressionFrom && expressionTo);
  METRICS_ROUTE_KEYS.forEach(key => {
    if (expressionOwnsRoute && (key === 'start' || key === 'end')) return;
    if (expressionOwnsRoute && key === 'tz') {
      if (!query.timezone) appendRouteValue(params, 'timezone', query.tz);
      return;
    }
    appendRouteValue(params, key, query[key]);
  });
  return params.toString() ? `/ingestion/otlp/metrics?${params.toString()}` : '/ingestion/otlp/metrics';
}
