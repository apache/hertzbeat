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

const METRICS_ROUTE_KEYS: Array<keyof OtlpMetricsQueryState> = [
  'entityId',
  'entityName',
  'returnTo',
  'traceId',
  'spanId',
  'query',
  'aggregation',
  'groupBy',
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
