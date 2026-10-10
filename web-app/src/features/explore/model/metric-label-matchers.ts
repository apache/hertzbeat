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

import type { MetricExploreQuery } from './explore-query';
import { parseLogFilterExpression, serializeLogFilterExpression } from './explore-log-filter-expression';

export type MetricLiteralMatcher = { field: string; operator: '=' | '!='; value: string };
const labelPattern = /^[A-Za-z_][A-Za-z0-9_]*$/u;

/** Only quoted literal conjunctions are editable; every other expression remains raw. */
export function readMetricMatchers(raw: string): MetricLiteralMatcher[] | undefined {
  const parsed = parseLogFilterExpression(raw);
  if (!parsed.valid || raw.length > 1024) return undefined;
  const result: MetricLiteralMatcher[] = [];
  for (const clause of parsed.clauses) {
    if (!labelPattern.test(clause.field) || (clause.operator !== '=' && clause.operator !== '!=')) return undefined;
    try {
      const value: unknown = JSON.parse(clause.value);
      if (typeof value !== 'string') return undefined;
      result.push({ field: clause.field, operator: clause.operator, value });
    } catch {
      return undefined;
    }
  }
  return result;
}

function serialize(matchers: MetricLiteralMatcher[]) {
  if (!matchers.every(item => labelPattern.test(item.field))) return undefined;
  const value =
    serializeLogFilterExpression(matchers.map(item => ({ ...item, value: JSON.stringify(item.value) }))) ?? '';
  return value.length <= 1024 && readMetricMatchers(value) ? value : undefined;
}

export function addMetricMatcher(raw: string, item: MetricLiteralMatcher, locked: readonly string[] = []) {
  const matchers = readMetricMatchers(raw);
  if (!matchers || matchers.some(existing => existing.field === item.field) || locked.includes(item.field))
    return undefined;
  return serialize([...matchers, item]);
}

export function updateMetricMatcher(
  raw: string,
  index: number,
  patch: Partial<Pick<MetricLiteralMatcher, 'operator' | 'value'>>,
  locked: readonly string[] = []
) {
  const matchers = readMetricMatchers(raw);
  const existing = matchers?.[index];
  if (!matchers || !existing || locked.includes(existing.field)) return undefined;
  return serialize(matchers.map((item, position) => (position === index ? { ...item, ...patch } : item)));
}

export function removeMetricMatcher(raw: string, index: number, locked: readonly string[] = []) {
  const matchers = readMetricMatchers(raw);
  if (!matchers?.[index] || locked.includes(matchers[index].field)) return undefined;
  return serialize(matchers.filter((_, position) => position !== index));
}

export function metricMatcherLocks(query?: MetricExploreQuery) {
  const fields = {
    service_name: query?.serviceName,
    service_namespace: query?.serviceNamespace,
    deployment_environment_name: query?.environment,
    hertzbeat_entity_id: query?.entityId,
    hertzbeat_entity_type: query?.entityId,
    hertzbeat_collector_id: query?.collectorId,
    service_instance_id: query?.instance,
    http_route: query?.endpoint
  };
  return [
    '__name__',
    'hertzbeat_workspace_id',
    ...Object.entries(fields)
      .filter(([, value]) => Boolean(value))
      .map(([key]) => key)
  ];
}
